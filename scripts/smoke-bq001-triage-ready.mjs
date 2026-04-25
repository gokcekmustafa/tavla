import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const queuePath = resolve("docs", "BUGFIX_QUEUE.md");
const ticketPath = resolve("docs", "bugs", "BQ-001.md");

function mustInclude(source, token) {
  return source.includes(token);
}

if (!existsSync(queuePath)) {
  console.error("BQ-001 triage ready smoke FAILED:");
  console.error("- docs/BUGFIX_QUEUE.md bulunamadi.");
  process.exit(1);
}

if (!existsSync(ticketPath)) {
  console.error("BQ-001 triage ready smoke FAILED:");
  console.error("- docs/bugs/BQ-001.md bulunamadi.");
  process.exit(1);
}

const queueSource = readFileSync(queuePath, "utf8");
const ticketSource = readFileSync(ticketPath, "utf8");

const checks = [
  {
    label: "Kuyrukta BQ-001 satiri mevcut",
    test: () => mustInclude(queueSource, "| BQ-001 |"),
  },
  {
    label: "Kuyruk BQ-001 icin detay kayit yolunu iceriyor",
    test: () => mustInclude(queueSource, "docs/bugs/BQ-001.md"),
  },
  {
    label: "BQ-001 kaydinda zorunlu triage basliklari mevcut",
    test: () =>
      mustInclude(ticketSource, "## 1) Tek Cumle Bug Tanimi")
      && mustInclude(ticketSource, "## 2) Yeniden Uretim Adimlari")
      && mustInclude(ticketSource, "## 3) Beklenen / Gerceklesen Davranis")
      && mustInclude(ticketSource, "## 4) Etki Alani")
      && mustInclude(ticketSource, "## 5) Cozum Stratejisi")
      && mustInclude(ticketSource, "## 6) Dogrulama Plani")
      && mustInclude(ticketSource, "## 7) Kapanis Notu"),
  },
];

const failed = checks.filter((check) => !check.test());
if (failed.length > 0) {
  console.error("BQ-001 triage ready smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("BQ-001 triage ready smoke passed.");
