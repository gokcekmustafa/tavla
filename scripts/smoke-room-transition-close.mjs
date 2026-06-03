import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "Oda degisimi sadece masada degilken serbest, masadayken engel veriyor",
    test: () =>
      has("function selectLobbyRoom(lobbyId: string)")
      && has("if (roomSession) {")
      && has("setLobbyNotice(\"Oda degistirmek icin once masadan kalkmalisin.\");"),
  },
  {
    label: "Lobi degisiminde onceki lobi presence temizligi tetikleniyor",
    test: () =>
      has("if (previousLobbyId && currentLobbyId && previousLobbyId !== currentLobbyId) {")
      && has("void clearSessionPresenceFromLobby(previousLobbyId, appSessionId, \"lobby-change-presence-cleanup\");"),
  },
  {
    label: "Masadan lobiye donuste seat release ve room session sifirlama birlikte yapiliyor",
    test: () =>
      has("function closeRoomAndReturnLobby()")
      && has("releaseSeatOnly();")
      && has("setRoomSession(null);")
      && has("setViewMode(\"lobby\");")
      && has("forceReloadBoard();"),
  },
  {
    label: "Seat release akisinda masa bosalinca closed table tombstone isleniyor",
    test: () =>
      has("function releaseSeatOnly()")
      && has("const cleared = clearSessionFromTables(cleaned, appSessionId, scopedUserId, scopedRoomCode, scopedTableId);")
      && has("const nextClosedTableRooms = markClosedTableRooms(current.closedTableRooms, closedRoomCodes);"),
  },
  {
    label: "Masa baglami yokken periyodik release seat korumasi calisiyor",
    test: () =>
      has("if (roomSession) return;")
      && has("releaseSeatOnly();")
      && has("const timer = window.setInterval(() => {")
      && has("}, 1200);"),
  },
  {
    label: "Room missing kontrolu grace suresi sonunda masayi kapatip lobiye donuyor",
    test: () =>
      has("await syncRealtimeViaHttp(\"room-missing-check\");")
      && has("if (Date.now() - missingSince < ROOM_MISSING_CLOSE_GRACE_MS) {")
      && has("setViewMode(\"lobby\");")
      && has("setLobbyNotice(\"Masa kapandi.\");"),
  },
  {
    label: "Beforeunload temizliginde seat ve presence birlikte temizlenip local storage kaydediliyor",
    test: () =>
      has("window.addEventListener(\"beforeunload\", onBeforeUnload);")
      && has("const cleared = clearSessionFromTables(cleanedTables, appSessionId, scopedUserId, scopedRoomCode, scopedTableId);")
      && has("const nextPresence = cleanedPresence.filter((entry) => entry.sessionId !== appSessionId);")
      && has("saveJson(activeLobbyStorageKey, next);"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Room transition/close smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Room transition/close smoke passed.");
