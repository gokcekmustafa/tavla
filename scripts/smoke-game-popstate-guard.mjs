import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "Popstate akisi game parametresini URL'den okuyor",
    test: () =>
      has("const gameFromUrl = readGameIdFromUrl() ?? DEFAULT_GAME_ID;")
      && has("setSelectedGameId(gameFromUrl);")
      && has("saveSelectedGameIdToSession(gameFromUrl);"),
  },
  {
    label: "Room entry popstate sadece tavla icin room picker aciyor",
    test: () =>
      has("if (entry === \"room\") {")
      && has("setRoomPickerOpen(gameFromUrl === \"tavla\");"),
  },
  {
    label: "Lobi/game popstate branchleri korunuyor",
    test: () =>
      has("if (entry === \"game\") {")
      && has("if (entry === \"lobby\") {")
      && has("setGamePickerOpen(false);"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Game popstate guard smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Game popstate guard smoke passed.");
