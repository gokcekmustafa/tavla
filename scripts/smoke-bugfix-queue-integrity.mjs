import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const queuePath = resolve("docs", "BUGFIX_QUEUE.md");
const source = readFileSync(queuePath, "utf8");

function has(text) {
  return source.includes(text);
}

const requiredStatusCodes = ["`new`", "`triaged`", "`in_progress`", "`verifying`", "`done`"];
const requiredPriorities = ["`P0`", "`P1`", "`P2`", "`P3`"];
const requiredTriageItems = [
  "1. Tek cumle bug tanimi",
  "2. Yeniden uretim adimlari (en fazla 5 adim)",
  "3. Beklenen / Gerceklesen davranis",
  "4. Etki alani (hangi modlar/ekranlar)",
  "5. Cozum stratejisi (tek dosya/tek akis odagi)",
];

const checks = [
  {
    label: "Durum kodlari eksiksiz tanimli",
    test: () => requiredStatusCodes.every((token) => has(token)),
  },
  {
    label: "Oncelik seviyeleri eksiksiz tanimli",
    test: () => requiredPriorities.every((token) => has(token)),
  },
  {
    label: "Aktif kuyruk tablosu basliklari mevcut",
    test: () =>
      has("| ID | Oncelik | Durum | Alan | Ozet | Sonraki Aksiyon |")
      && has("| --- | --- | --- | --- | --- | --- |"),
  },
  {
    label: "Triage notu zorunlu maddeleri mevcut",
    test: () => requiredTriageItems.every((token) => has(token)),
  },
];

const failed = checks.filter((check) => !check.test());
if (failed.length > 0) {
  console.error("Bugfix queue integrity smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

const statuses = Array.from(
  source.matchAll(/\|\s*BQ-[^|]+\|\s*P[0-3]\s*\|\s*([a-z_]+)\s*\|/g),
  (match) => match[1],
);
const activeCount = statuses.filter((status) => status === "in_progress" || status === "verifying").length;

if (activeCount > 1) {
  console.error("Bugfix queue integrity smoke FAILED:");
  console.error("- Birden fazla aktif bug var (in_progress/verifying > 1).");
  process.exit(1);
}

console.log("Bugfix queue integrity smoke passed.");
