import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "Aktif lobi storage key oyun bazli uretiliyor",
    test: () =>
      has("function getActiveLobbyStorageKey(gameId: GameId) {")
      && has("return `${ACTIVE_LOBBY_ID_KEY}.${gameId}`;"),
  },
  {
    label: "Ilk lobi id okuma scoped key sonra legacy key fallback kullaniyor",
    test: () =>
      has("function getInitialLobbyId(gameId: GameId = DEFAULT_GAME_ID) {")
      && has("safeStorageGetItem(window.localStorage, getActiveLobbyStorageKey(gameId)) ?? \"\",")
      && has("safeStorageGetItem(window.localStorage, ACTIVE_LOBBY_ID_KEY) ?? \"\""),
  },
  {
    label: "Baslangic state secilen oyuna gore lobi id seciyor",
    test: () =>
      has("const initialGameId = readGameIdFromUrl() ?? loadSelectedGameIdFromSession() ?? DEFAULT_GAME_ID;")
      && has("return sanitizeLobbyId(getInitialLobbyId(initialGameId)) || DEFAULT_LOBBY_ID;")
      && has("sanitizeLobbyId(getInitialLobbyId(selectedGameId))"),
  },
  {
    label: "Runtime persist scoped key'e yazar ve tavla icin legacy key'i gunceller",
    test: () =>
      has("safeStorageSetItem(window.localStorage, getActiveLobbyStorageKey(selectedGameId), safeLobbyId);")
      && has("if (selectedGameId === DEFAULT_GAME_ID) {")
      && has("safeStorageSetItem(window.localStorage, ACTIVE_LOBBY_ID_KEY, safeLobbyId);"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Active lobby storage scope smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Active lobby storage scope smoke passed.");
