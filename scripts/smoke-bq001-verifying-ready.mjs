import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const queuePath = resolve("docs", "BUGFIX_QUEUE.md");
const ticketPath = resolve("docs", "bugs", "BQ-001.md");

if (!existsSync(queuePath) || !existsSync(ticketPath)) {
  console.error("BQ-001 verifying smoke FAILED:");
  if (!existsSync(queuePath)) console.error("- docs/BUGFIX_QUEUE.md bulunamadi.");
  if (!existsSync(ticketPath)) console.error("- docs/bugs/BQ-001.md bulunamadi.");
  process.exit(1);
}

const queue = readFileSync(queuePath, "utf8");
const ticket = readFileSync(ticketPath, "utf8");

const errors = [];

const queueRow = queue.match(/\|\s*BQ-001\s*\|\s*P2\s*\|\s*([a-z_]+)\s*\|\s*Tooling\s*\|/);
const queueStatus = queueRow?.[1] ?? "";
if (!queueRow) {
  errors.push("Kuyrukta BQ-001 satiri P2/Tooling formatinda bulunamadi.");
} else if (!["verifying", "done"].includes(queueStatus)) {
  errors.push(`Kuyrukta BQ-001 durumu verifying/done olmali. Bulunan: '${queueStatus}'`);
}

const ticketStatus = ticket.match(/Durum:\s*`([^`]+)`/)?.[1] ?? "";
if (!["verifying", "done"].includes(ticketStatus)) {
  errors.push(`BQ-001 dosyasinda durum verifying/done olmali. Bulunan: '${ticketStatus || "(bos)"}'`);
}

if (queueStatus && ticketStatus && queueStatus !== ticketStatus) {
  errors.push(`Kuyruk durumu '${queueStatus}' ile dosya durumu '${ticketStatus}' ayni olmali.`);
}

if (ticket.includes("Kapatista doldurulacak")) {
  errors.push("BQ-001 kapanis notu placeholder metin icermemeli.");
}

if (!ticket.includes("Duzeltme ozeti:") || !ticket.includes("Regress riski:")) {
  errors.push("BQ-001 kapanis notunda duzeltme ozeti ve regress riski alanlari dolu olmali.");
}

console.log(errors.length > 0 ? "" : "BQ-001 verifying smoke passed.");

if (errors.length > 0) {
  console.error("BQ-001 verifying smoke FAILED:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}
