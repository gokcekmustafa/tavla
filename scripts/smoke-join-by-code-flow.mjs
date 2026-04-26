import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function extractAppFunctionSegment(name) {
  const markers = [`\n  function ${name}`, `\n  async function ${name}`];
  let marker = markers.find((item) => source.includes(item)) ?? "";
  let start = marker ? source.indexOf(marker) : -1;
  if (start < 0) {
    if (source.startsWith(`function ${name}`) || source.startsWith(`async function ${name}`)) {
      start = 0;
      marker = "";
    } else {
      return "";
    }
  }
  const searchFrom = start + Math.max(marker.length, 1);
  const nextFunction = source.indexOf("\n  function ", searchFrom);
  const nextAsyncFunction = source.indexOf("\n  async function ", searchFrom);
  const nextCandidates = [nextFunction, nextAsyncFunction].filter((value) => value >= 0);
  const next = nextCandidates.length > 0 ? Math.min(...nextCandidates) : -1;
  return source.slice(start, next < 0 ? source.length : next);
}

const fnOnJoinByCode = extractAppFunctionSegment("onJoinByCode");

const checks = [
  {
    label: "Koda katil akisi tavla-only guard ile basliyor",
    test: () =>
      fnOnJoinByCode.includes("if (!guardTavlaOnlyAction()) return;"),
  },
  {
    label: "Kod girdisi sanitize edilip bos kod erken donusle engelleniyor",
    test: () =>
      fnOnJoinByCode.includes("const code = sanitizeRoomCode(joinCodeInput);")
      && fnOnJoinByCode.includes("if (!code) {")
      && fnOnJoinByCode.includes("return;"),
  },
  {
    label: "Kodla masa bulma latest lobby state uzerinden roomCode eslesmesiyle yapiliyor",
    test: () =>
      fnOnJoinByCode.includes("const latest = getCurrentLobbyState();")
      && fnOnJoinByCode.includes("const table = latest.tables.find((row) => row.roomCode === code);")
      && fnOnJoinByCode.includes("if (!table) {"),
  },
  {
    label: "Ozel masa erisimi koda katil akisinda da private guard ile kapatiliyor",
    test: () =>
      fnOnJoinByCode.includes("if (isTablePrivateBlockedForUser(table, currentProfile.userId, appSessionId)) {"),
  },
  {
    label: "Secili koltuk doluysa alternatif koltuk denemesi yapiliyor, iki koltuk da doluysa akisi durduruyor",
    test: () =>
      fnOnJoinByCode.includes("let targetSeat = joinSeat;")
      && fnOnJoinByCode.includes("const preferredOccupied = targetSeat === \"white\" ? table.white : table.black;")
      && fnOnJoinByCode.includes("const altSeat: Seat = targetSeat === \"white\" ? \"black\" : \"white\";")
      && fnOnJoinByCode.includes("if (altOccupied && altOccupied.sessionId !== appSessionId) {")
      && fnOnJoinByCode.includes("targetSeat = altSeat;"),
  },
  {
    label: "Koda katil akisinin finalinde sitToTable cagrisi roomCode ile yapiliyor",
    test: () =>
      fnOnJoinByCode.includes("sitToTable(table.id, targetSeat, table.roomCode);"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Join-by-code flow smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Join-by-code flow smoke passed.");
