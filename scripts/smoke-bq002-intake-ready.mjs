import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const queuePath = resolve("docs", "BUGFIX_QUEUE.md");
const ticketPath = resolve("docs", "bugs", "BQ-002.md");
const intakePath = resolve("docs", "BUG_REPORT_INTAKE_TEMPLATE.md");

const errors = [];

if (!existsSync(queuePath)) errors.push("docs/BUGFIX_QUEUE.md bulunamadi.");
if (!existsSync(ticketPath)) errors.push("docs/bugs/BQ-002.md bulunamadi.");
if (!existsSync(intakePath)) errors.push("docs/BUG_REPORT_INTAKE_TEMPLATE.md bulunamadi.");

if (errors.length > 0) {
  console.error("BQ-002 intake readiness smoke FAILED:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const queue = readFileSync(queuePath, "utf8");
const ticket = readFileSync(ticketPath, "utf8");
const intake = readFileSync(intakePath, "utf8");

if (!queue.includes("| BQ-002 | P1 | new | Runtime |")) {
  errors.push("Kuyrukta BQ-002 satiri new/P1/Runtime olarak bekleniyor.");
}

if (!ticket.includes("Durum: `new`")) {
  errors.push("BQ-002 dosyasinda durum new olmali.");
}

const intakeTokens = [
  "Tek cumle bug ozeti",
  "Yeniden uretim adimlari",
  "Beklenen davranis",
  "Gerceklesen davranis",
  "Etki alani",
  "Kanit",
];

for (const token of intakeTokens) {
  if (!intake.includes(token)) {
    errors.push(`Intake sablonunda zorunlu alan eksik: ${token}`);
  }
}

if (!ticket.includes("Bekleniyor")) {
  errors.push("BQ-002 kaydi ilk rapor gelene kadar placeholder ('Bekleniyor') icermeli.");
}

if (errors.length > 0) {
  console.error("BQ-002 intake readiness smoke FAILED:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("BQ-002 intake readiness smoke passed.");
