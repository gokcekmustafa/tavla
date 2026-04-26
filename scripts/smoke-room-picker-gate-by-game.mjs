import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "Room picker ilk hesapta secili oyunu URL/session'dan aliyor",
    test: () =>
      has("const [roomPickerOpen, setRoomPickerOpen] = useState<boolean>(() => {")
      && has("const selectedGame = readGameIdFromUrl() ?? loadSelectedGameIdFromSession() ?? DEFAULT_GAME_ID;"),
  },
  {
    label: "Tavla disi oyunlarda room picker baslangicta kapali zorlanıyor",
    test: () =>
      has("if (selectedGame !== \"tavla\") return false;"),
  },
  {
    label: "Tavla seciminde room picker kimlik bazli kararla aciliyor",
    test: () =>
      has("return shouldOpenRoomPickerInitially(initialRoom, selectedGame);"),
  },
  {
    label: "Oyun secimi aksiyonu tavlada room picker aciyor",
    test: () =>
      has("if (gameId !== \"tavla\") {")
      && has("setRoomPickerOpen(false);")
      && has("setRoomPickerOpen(true);"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Room picker gate-by-game smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Room picker gate-by-game smoke passed.");
