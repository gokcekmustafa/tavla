import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "WS gecici disable esigi ve sure sabitleri tanimli",
    test: () =>
      has("WS_PREOPEN_FAIL_DISABLE_THRESHOLD")
      && has("WS_DISABLE_DURATION_MS"),
  },
  {
    label: "HTTP sync timeout AbortController ile korunuyor",
    test: () =>
      has("const controller = new AbortController();")
      && has("controller.abort()")
      && has("HTTP_SYNC_TIMEOUT_MS"),
  },
  {
    label: "HTTP sync hata backoff sabitleri kullaniyor",
    test: () =>
      has("HTTP_SYNC_ERROR_BACKOFF_MIN_MS")
      && has("HTTP_SYNC_ERROR_BACKOFF_MAX_MS")
      && has("registerHttpSyncFailure("),
  },
  {
    label: "HTTP fallback dongusu tek tick setTimeout zinciri ile calisiyor",
    test: () =>
      has("const scheduleNext = () => {")
      && has("window.setTimeout(() => {")
      && has("void tick();")
      && has("HTTP_SYNC_BACKGROUND_RUN_INTERVAL_MS"),
  },
  {
    label: "Room start gate iframe onLoad ve table-chat-ready uzerinden tekrar senkronlanıyor",
    test: () =>
      has("if (payload.type === \"table-chat-ready\") {")
      && has("syncRoomStartGateToIframe();")
      && has("ROOM_START_GATE_RESYNC_DELAY_MS"),
  },
  {
    label: "Diagnostik mod toggle ve sayaçlar mevcut",
    test: () =>
      has("readDiagnosticsEnabled()")
      && has("wsOpenCount")
      && has("httpPushCount")
      && has("httpPullCount"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Realtime resilience smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Realtime resilience smoke passed.");
