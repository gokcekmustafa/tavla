import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const wranglerPath = resolve("wrangler.toml");
const workerPath = resolve("worker", "index.ts");

const wrangler = readFileSync(wranglerPath, "utf8");
const worker = readFileSync(workerPath, "utf8");

function hasInWrangler(text) {
  return wrangler.includes(text);
}

function hasInWorker(text) {
  return worker.includes(text);
}

const checks = [
  {
    label: "Wrangler main worker entry tanimli",
    test: () => hasInWrangler('main = "worker/index.ts"'),
  },
  {
    label: "Wrangler assets directory dist olarak tanimli",
    test: () =>
      hasInWrangler("[assets]")
      && hasInWrangler('directory = "./dist"')
      && hasInWrangler('binding = "ASSETS"'),
  },
  {
    label: "Wrangler durable object bindingleri ROOMS ve AUTH tanimli",
    test: () =>
      hasInWrangler("[durable_objects]")
      && hasInWrangler('{ name = "ROOMS", class_name = "RealtimeRoom" }')
      && hasInWrangler('{ name = "AUTH", class_name = "AuthStore" }'),
  },
  {
    label: "Worker default fetch realtime ve lobby-sync routelarini servis ediyor",
    test: () =>
      hasInWorker("if (url.pathname === \"/realtime\")")
      && hasInWorker("if (url.pathname === \"/api/lobby-sync\")")
      && hasInWorker("return await room.fetch(request);"),
  },
  {
    label: "Worker durable object classlari export ediliyor",
    test: () =>
      hasInWorker("export class RealtimeRoom")
      && hasInWorker("export class AuthStore"),
  },
  {
    label: "Worker DurableObject globaline extends ile bagli degil (10021 korumasi)",
    test: () => !hasInWorker("extends DurableObject"),
  },
  {
    label: "Worker Env arayuzunde ASSETS/ROOMS/AUTH bindingleri tanimli",
    test: () =>
      hasInWorker("export interface Env")
      && hasInWorker("ASSETS: Fetcher;")
      && hasInWorker("ROOMS: DurableObjectNamespace;")
      && hasInWorker("AUTH: DurableObjectNamespace;"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Worker deploy/config smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Worker deploy/config smoke passed.");
