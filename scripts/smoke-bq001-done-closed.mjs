import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const queuePath = resolve("docs", "BUGFIX_QUEUE.md");
const ticketPath = resolve("docs", "bugs", "BQ-001.md");

if (!existsSync(queuePath) || !existsSync(ticketPath)) {
  console.error("BQ-001 done smoke FAILED:");
  if (!existsSync(queuePath)) console.error("- docs/BUGFIX_QUEUE.md bulunamadi.");
  if (!existsSync(ticketPath)) console.error("- docs/bugs/BQ-001.md bulunamadi.");
  process.exit(1);
}

const queue = readFileSync(queuePath, "utf8");
const ticket = readFileSync(ticketPath, "utf8");

const errors = [];

if (!queue.includes("| BQ-001 | P2 | done | Tooling |")) {
  errors.push("Kuyrukta BQ-001 satiri done/P2/Tooling olarak bekleniyor.");
}

if (!ticket.includes("Durum: `done`")) {
  errors.push("BQ-001 dosyasinda durum done olmali.");
}

if (ticket.includes("Kapatista doldurulacak") || ticket.includes("Bekleniyor")) {
  errors.push("BQ-001 done kaydinda placeholder metin kalmamali.");
}

if (!ticket.includes("Duzeltme ozeti:") || !ticket.includes("Regress riski:")) {
  errors.push("BQ-001 done kaydinda kapanis notu alanlari dolu olmali.");
}

if (errors.length > 0) {
  console.error("BQ-001 done smoke FAILED:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("BQ-001 done smoke passed.");
