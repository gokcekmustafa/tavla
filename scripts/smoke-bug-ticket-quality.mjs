import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const queuePath = resolve("docs", "BUGFIX_QUEUE.md");

if (!existsSync(queuePath)) {
  console.error("Bug ticket quality smoke FAILED:");
  console.error("- docs/BUGFIX_QUEUE.md bulunamadi.");
  process.exit(1);
}

const queueSource = readFileSync(queuePath, "utf8");
const queueRows = Array.from(
  queueSource.matchAll(/\|\s*(BQ-\d+)\s*\|\s*(P[0-3])\s*\|\s*([a-z_]+)\s*\|/g),
  (match) => ({
    id: match[1],
    priority: match[2],
    status: match[3],
  }),
);

if (queueRows.length === 0) {
  console.error("Bug ticket quality smoke FAILED:");
  console.error("- Kuyrukta en az bir BQ satiri bekleniyor.");
  process.exit(1);
}

const requiredHeaders = [
  "## 1) Tek Cumle Bug Tanimi",
  "## 2) Yeniden Uretim Adimlari",
  "## 3) Beklenen / Gerceklesen Davranis",
  "## 4) Etki Alani",
  "## 5) Cozum Stratejisi",
  "## 6) Dogrulama Plani",
  "## 7) Kapanis Notu",
];

const errors = [];

for (const row of queueRows) {
  const ticketPath = resolve("docs", "bugs", `${row.id}.md`);
  if (!existsSync(ticketPath)) {
    errors.push(`${row.id}: docs/bugs/${row.id}.md bulunamadi.`);
    continue;
  }

  const ticketSource = readFileSync(ticketPath, "utf8");

  const missingHeaders = requiredHeaders.filter((header) => !ticketSource.includes(header));
  if (missingHeaders.length > 0) {
    errors.push(`${row.id}: zorunlu basliklar eksik (${missingHeaders.join(", ")}).`);
  }

  const hasPlaceholder = ticketSource.includes("Bekleniyor");
  if (row.status === "new" && !hasPlaceholder) {
    errors.push(`${row.id}: durum 'new' iken en az bir 'Bekleniyor' placeholder bekleniyor.`);
  }

  if (row.status !== "new" && hasPlaceholder) {
    errors.push(`${row.id}: durum '${row.status}' iken 'Bekleniyor' placeholder kalmamali.`);
  }
}

if (errors.length > 0) {
  console.error("Bug ticket quality smoke FAILED:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Bug ticket quality smoke passed.");
