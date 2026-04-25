import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const queuePath = resolve("docs", "BUGFIX_QUEUE.md");
const ticketPath = resolve("docs", "bugs", "BQ-001.md");

if (!existsSync(queuePath) || !existsSync(ticketPath)) {
  console.error("BQ-001 encoding fix smoke FAILED:");
  if (!existsSync(queuePath)) console.error("- docs/BUGFIX_QUEUE.md bulunamadi.");
  if (!existsSync(ticketPath)) console.error("- docs/bugs/BQ-001.md bulunamadi.");
  process.exit(1);
}

const queue = readFileSync(queuePath, "utf8");
const ticket = readFileSync(ticketPath, "utf8");

const errors = [];

if (!queue.includes("| BQ-001 | P2 | in_progress | Tooling |")) {
  errors.push("Kuyrukta BQ-001 satiri in_progress/P2/Tooling olarak bekleniyor.");
}

if (!ticket.includes("Durum: `in_progress`")) {
  errors.push("BQ-001 dosyasinda durum in_progress olmali.");
}

const mojibakeTokens = ["Ã", "�"];
for (const token of mojibakeTokens) {
  if (ticket.includes(token)) {
    errors.push(`BQ-001 dosyasinda mojibake izi bulundu: '${token}'`);
  }
}

if (!ticket.includes("Henüz")) {
  errors.push("BQ-001 dosyasinda dogru Turkce ornek kelime ('Henüz') bulunmali.");
}

if (errors.length > 0) {
  console.error("BQ-001 encoding fix smoke FAILED:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("BQ-001 encoding fix smoke passed.");
