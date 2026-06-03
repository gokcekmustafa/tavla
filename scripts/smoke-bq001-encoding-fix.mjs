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

const queueRowMatch = queue.match(/\|\s*BQ-001\s*\|\s*P2\s*\|\s*([a-z_]+)\s*\|\s*Tooling\s*\|/);
if (!queueRowMatch) {
  errors.push("Kuyrukta BQ-001 satiri P2/Tooling formatinda bulunamadi.");
}

const queueStatus = queueRowMatch?.[1] ?? "";
const allowedStatuses = new Set(["in_progress", "verifying", "done"]);
if (!allowedStatuses.has(queueStatus)) {
  errors.push(`Kuyrukta BQ-001 durumu gecersiz: '${queueStatus || "(bos)"}'`);
}

const ticketStatusMatch = ticket.match(/Durum:\s*`([^`]+)`/);
if (!ticketStatusMatch) {
  errors.push("BQ-001 dosyasinda durum alani bulunamadi.");
} else if (queueStatus && ticketStatusMatch[1] !== queueStatus) {
  errors.push(`Kuyruk durumu '${queueStatus}' ama dosya durumu '${ticketStatusMatch[1]}'`);
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
