import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "Game id URL okuma ve history push imzalari mevcut",
    test: () =>
      has("function readGameIdFromUrl(): GameId | null {")
      && has("function pushEntryScreenHistory(screen: EntryScreen, gameId?: GameId) {")
      && has("url.searchParams.set(\"game\", gameId);"),
  },
  {
    label: "Secilen oyun ilk acilista URL -> session sirasiyla yukleniyor",
    test: () =>
      has("const [selectedGameId, setSelectedGameId] = useState<GameId>(() => readGameIdFromUrl() ?? loadSelectedGameIdFromSession() ?? DEFAULT_GAME_ID);"),
  },
  {
    label: "URL replaceState akisi game parametresini her zaman yansitiyor",
    test: () =>
      has("url.searchParams.set(\"game\", selectedGameId);")
      && has("window.history.replaceState({}, \"\", `${url.pathname}${url.search}${url.hash}`);"),
  },
  {
    label: "Popstate sirasinda game parametresi state ve sessiona geri yaziliyor",
    test: () =>
      has("const gameFromUrl = readGameIdFromUrl() ?? DEFAULT_GAME_ID;")
      && has("setSelectedGameId(gameFromUrl);")
      && has("saveSelectedGameIdToSession(gameFromUrl);"),
  },
  {
    label: "Aktif lobi storage oyuna gore scope ediliyor",
    test: () =>
      has("function getActiveLobbyStorageKey(gameId: GameId) {")
      && has("safeStorageSetItem(window.localStorage, getActiveLobbyStorageKey(selectedGameId), safeLobbyId);"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Game URL sync smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Game URL sync smoke passed.");
