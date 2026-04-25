import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "Game/room session key sabitleri tanimli",
    test: () =>
      has('const ROOM_PICKER_SESSION_KEY = "tavla.room.picker.session.v1";')
      && has('const GAME_SELECTION_SESSION_KEY = "tavla.game.selection.session.v1";'),
  },
  {
    label: "Room picker session state load/save/clear fonksiyonlari mevcut",
    test: () =>
      has("function loadRoomPickerSessionState()")
      && has("function saveRoomPickerSessionState(identity: string, lobbyId: string)")
      && has("function clearRoomPickerSessionState()"),
  },
  {
    label: "Ilk acilista room picker karari identity bazli yapiliyor",
    test: () =>
      has("function shouldOpenRoomPickerInitially(initialRoom: RoomSession | null)")
      && has("const identity = getRoomPickerIdentity(memberSession?.userId ?? \"\", getOrCreateGuestId());")
      && has("return sessionState.identity !== identity;"),
  },
  {
    label: "Secilen oyun sessionStorage'a kaydediliyor",
    test: () =>
      has("function saveSelectedGameIdToSession(gameId: GameId)")
      && has("safeStorageSetItem(window.sessionStorage, GAME_SELECTION_SESSION_KEY, gameId);"),
  },
  {
    label: "Oda secimi remember + history push ile kalici hale getiriliyor",
    test: () =>
      has("function rememberRoomPickerSelection(lobbyId: string)")
      && has("saveRoomPickerSessionState(identity, safeLobbyId);")
      && has("function selectLobbyRoom(lobbyId: string)")
      && has("pushEntryScreenHistory(\"lobby\");"),
  },
  {
    label: "Masadayken anasayfa/oda degisimi engelleniyor",
    test: () =>
      has("function goToGameSelection()")
      && has("if (roomSession) {")
      && has("Anasayfaya donmek icin once masadan kalkmalisin.")
      && has("function openAllRoomsPicker()")
      && has("Tum odalari acmak icin once masadan kalkmalisin."),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Entry/room session smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Entry/room session smoke passed.");
