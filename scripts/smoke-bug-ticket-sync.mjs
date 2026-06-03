import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const queuePath = resolve("docs", "BUGFIX_QUEUE.md");

if (!existsSync(queuePath)) {
  console.error("Bug ticket sync smoke FAILED:");
  console.error("- docs/BUGFIX_QUEUE.md bulunamadi.");
  process.exit(1);
}

const queueSource = readFileSync(queuePath, "utf8");
const rowMatches = Array.from(
  queueSource.matchAll(/\|\s*(BQ-\d+)\s*\|\s*(P[0-3])\s*\|\s*([a-z_]+)\s*\|/g),
  (match) => ({
    id: match[1],
    priority: match[2],
    status: match[3],
  }),
);

if (rowMatches.length === 0) {
  console.error("Bug ticket sync smoke FAILED:");
  console.error("- Kuyrukta en az bir BQ satiri bekleniyor.");
  process.exit(1);
}

const allowedStatuses = new Set(["new", "triaged", "in_progress", "verifying", "done"]);
const errors = [];

for (const row of rowMatches) {
  if (!allowedStatuses.has(row.status)) {
    errors.push(`${row.id}: gecersiz durum '${row.status}'`);
    continue;
  }

  const ticketPath = resolve("docs", "bugs", `${row.id}.md`);
  if (!existsSync(ticketPath)) {
    errors.push(`${row.id}: docs/bugs/${row.id}.md bulunamadi`);
    continue;
  }

  const ticketSource = readFileSync(ticketPath, "utf8");
  const statusMatch = ticketSource.match(/Durum:\s*`([^`]+)`/);
  const priorityMatch = ticketSource.match(/Oncelik:\s*`([^`]+)`/);

  if (!statusMatch) {
    errors.push(`${row.id}: dosyada 'Durum: \`...\`' alani yok`);
  } else if (statusMatch[1] !== row.status) {
    errors.push(`${row.id}: kuyruk durumu '${row.status}' ama dosya durumu '${statusMatch[1]}'`);
  }

  if (!priorityMatch) {
    errors.push(`${row.id}: dosyada 'Oncelik: \`...\`' alani yok`);
  } else if (priorityMatch[1] !== row.priority) {
    errors.push(`${row.id}: kuyruk onceligi '${row.priority}' ama dosya onceligi '${priorityMatch[1]}'`);
  }
}

if (errors.length > 0) {
  console.error("Bug ticket sync smoke FAILED:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Bug ticket sync smoke passed.");
