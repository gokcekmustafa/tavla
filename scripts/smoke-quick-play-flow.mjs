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

const fnOnQuickPlay = extractAppFunctionSegment("onQuickPlay");

const checks = [
  {
    label: "Hemen Oyna tavla-only guard ile basliyor",
    test: () =>
      fnOnQuickPlay.includes("if (!guardTavlaOnlyAction()) return;"),
  },
  {
    label: "Oyuncu zaten bir masadaysa mevcut masaya yonlendirme yapiyor",
    test: () =>
      fnOnQuickPlay.includes("const existing = findSessionSeat(latest.tables, appSessionId);")
      && fnOnQuickPlay.includes("if (existing) {")
      && fnOnQuickPlay.includes("goToTable(existing.table, existing.seat);")
      && fnOnQuickPlay.includes("return;"),
  },
  {
    label: "Bekleyen masa taramasinda stale temizligi ve private guard kullaniliyor",
    test: () =>
      fnOnQuickPlay.includes("const cleanedTables = cleanupStaleAndPrune(latest.tables).tables;")
      && fnOnQuickPlay.includes("const waitingTable = sortTables(cleanedTables).find((table) => {")
      && fnOnQuickPlay.includes("if (whiteTaken === blackTaken) return false;")
      && fnOnQuickPlay.includes("if (isTablePrivateBlockedForUser(table, currentProfile.userId, appSessionId)) return false;"),
  },
  {
    label: "Bekleyen masa bulunursa bos koltuga katilip notice ile cikiyor",
    test: () =>
      fnOnQuickPlay.includes("const targetSeat: Seat = waitingTable.white ? \"black\" : \"white\";")
      && fnOnQuickPlay.includes("const joined = sitToTable(waitingTable.id, targetSeat, waitingTable.roomCode, true);")
      && fnOnQuickPlay.includes("if (joined) {")
      && fnOnQuickPlay.includes("setLobbyNotice(`Masa ${waitingTable.id} bulundu. Oyuna katildin.`);"),
  },
  {
    label: "Bekleyen masa yoksa yeni masa acip white koltuga oturtuyor",
    test: () =>
      fnOnQuickPlay.includes("const tableId = getNextTableId(cleanedTables);")
      && fnOnQuickPlay.includes("sitToTable(tableId, \"white\", createRoomCode(), true);"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Quick play flow smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Quick play flow smoke passed.");
