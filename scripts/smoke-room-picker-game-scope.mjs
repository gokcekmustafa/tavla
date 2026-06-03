import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "Room picker session key oyun-bazli uretiliyor",
    test: () =>
      has("function getRoomPickerSessionStorageKey(gameId: GameId) {")
      && has("return `${ROOM_PICKER_SESSION_KEY}.${gameId}`;"),
  },
  {
    label: "Load tarafinda scoped key + tavla legacy fallback korunuyor",
    test: () =>
      has("const scopedKey = getRoomPickerSessionStorageKey(gameId);")
      && has("let raw = safeStorageGetItem(window.sessionStorage, scopedKey);")
      && has("if (!raw && gameId === DEFAULT_GAME_ID) {")
      && has("raw = safeStorageGetItem(window.sessionStorage, ROOM_PICKER_SESSION_KEY);"),
  },
  {
    label: "Load tarafi payload gameId eslesmesini dogruluyor",
    test: () =>
      has("const storedGameId: GameId = parsed.gameId === \"okey101\" ? \"okey101\" : DEFAULT_GAME_ID;")
      && has("if (!identity || !lobbyId || storedGameId !== gameId) return null;"),
  },
  {
    label: "Save tarafi scoped key'e yazar ve tavla icin legacy key'i gunceller",
    test: () =>
      has("safeStorageSetItem(")
      && has("getRoomPickerSessionStorageKey(gameId),")
      && has("if (gameId === DEFAULT_GAME_ID) {")
      && has("safeStorageSetItem(window.sessionStorage, ROOM_PICKER_SESSION_KEY, payload);"),
  },
  {
    label: "Clear fonksiyonu hem scoped hem global temizligi destekliyor",
    test: () =>
      has("function clearRoomPickerSessionState(gameId?: GameId) {")
      && has("safeStorageRemoveItem(window.sessionStorage, getRoomPickerSessionStorageKey(gameId));")
      && has("safeStorageRemoveItem(window.sessionStorage, getRoomPickerSessionStorageKey(\"tavla\"));")
      && has("safeStorageRemoveItem(window.sessionStorage, getRoomPickerSessionStorageKey(\"okey101\"));"),
  },
  {
    label: "Kullanim noktalarinda oyun-bazli room picker scope aktif",
    test: () =>
      has("return shouldOpenRoomPickerInitially(initialRoom, selectedGame);")
      && has("saveRoomPickerSessionState(identity, safeLobbyId, selectedGameId);"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Room picker game scope smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Room picker game scope smoke passed.");
