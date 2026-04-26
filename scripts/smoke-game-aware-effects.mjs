import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "URL senkron effect'i game parametresini yazar",
    test: () =>
      has("url.searchParams.set(\"game\", selectedGameId);")
      && has("window.history.replaceState({}, \"\", `${url.pathname}${url.search}${url.hash}`);"),
  },
  {
    label: "URL senkron effect dependency listesinde selectedGameId var",
    test: () =>
      has("}, [roomSession, safeGuestName, activeLobbyId, selectedGameId, viewMode, showGamePicker, showRoomPicker]);"),
  },
  {
    label: "Aktif lobi persist effect'i scoped storage key'e yazar",
    test: () =>
      has("safeStorageSetItem(window.localStorage, getActiveLobbyStorageKey(selectedGameId), safeLobbyId);")
      && has("if (selectedGameId === DEFAULT_GAME_ID) {")
      && has("safeStorageSetItem(window.localStorage, ACTIVE_LOBBY_ID_KEY, safeLobbyId);"),
  },
  {
    label: "Aktif lobi persist effect dependency listesinde selectedGameId var",
    test: () =>
      has("}, [activeLobbyId, activeLobbyName, selectedGameId]);"),
  },
  {
    label: "Baslangic lobi secimi oyuna gore ilk degeri kullaniyor",
    test: () =>
      has("const initialGameId = readGameIdFromUrl() ?? loadSelectedGameIdFromSession() ?? DEFAULT_GAME_ID;")
      && has("return sanitizeLobbyId(getInitialLobbyId(initialGameId)) || DEFAULT_LOBBY_ID;")
      && has("sanitizeLobbyId(getInitialLobbyId(selectedGameId))"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Game-aware effects smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Game-aware effects smoke passed.");
