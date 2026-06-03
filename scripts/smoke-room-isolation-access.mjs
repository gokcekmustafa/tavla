import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "Oda kapsam filtre fonksiyonlari mevcut",
    test: () =>
      has("function isTableScopedToLobby(")
      && has("function filterTablesByLobbyScope(")
      && has("function summarizeLobbyCounts("),
  },
  {
    label: "Oda ozetinde oyuncu sayisi presence uzerinden hesaplaniyor",
    test: () =>
      has("const cleanedPresence = cleanupPresenceRows(snapshot.presence).presence;")
      && has("const uniquePlayers = new Set<string>();")
      && has("const seatedPlayers = uniquePlayers.size;"),
  },
  {
    label: "Ozel masa erisim engeli fonksiyonu mevcut",
    test: () =>
      has("function isTablePrivateBlockedForUser(")
      && has("if (!table.isPrivate) return false;")
      && has("if (invitedUserId && safeUserId === invitedUserId) return false;"),
  },
  {
    label: "Lobi kartinda ozel masa icin izleyici butonu gizleniyor",
    test: () =>
      has("const canWatchTable = !table.isPrivate")
      && has("const showWatchEye = !table.isPrivate")
      && has("style={showWatchEye ? undefined : { display: \"none\" }}"),
  },
  {
    label: "Oturma akisinda private engeli kontrol ediliyor",
    test: () =>
      has("if (isTablePrivateBlockedForUser(table, currentProfile.userId, appSessionId)) {")
      && has("blockReason = \"private\";"),
  },
  {
    label: "Izleyici modunda private masa girisi engelleniyor",
    test: () =>
      has("function watchTableAsSpectator(")
      && has("if (table.isPrivate) {")
      && has("Sadece davetli oyuncu kat"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Room isolation/access smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Room isolation/access smoke passed.");
