import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "onSelectGame okey seciminde izole prototip akisina geciyor",
    test: () =>
      has("if (gameId !== \"tavla\") {")
      && has("setGamePickerOpen(false);")
      && has("setRoomPickerOpen(false);")
      && has("setViewMode(\"lobby\");")
      && has("setLobbyNotice(\"101 Okey prototip ekranina gecildi.\");")
      && has("pushEntryScreenHistory(\"lobby\", gameId);")
      && has("return;"),
  },
  {
    label: "Lobi ust tavla aksiyonlari sadece tavla seciminde gorunuyor",
    test: () =>
      has("!roomSession && !showGamePicker && !showRoomPicker && isTavlaSelectedGame"),
  },
  {
    label: "101 Okey prototip ekrani branchi mevcut",
    test: () =>
      has(") : !isTavlaSelectedGame ? (")
      && has("<h2>101 Okey</h2>")
      && has("Bu ekran izole prototip alanidir. Tavla sistemi etkilenmez.")
      && has("101 Okey gelistirmesi basladi."),
  },
  {
    label: "Oyun secimi kartlarinda okey ve tavlaya don aksiyonlari mevcut",
    test: () =>
      has("onClick={() => onSelectGame(\"okey101\")}")
      && has("Tavla Moduna Gec")
      && has("onClick={() => onSelectGame(\"tavla\")}"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Game prototype flow smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Game prototype flow smoke passed.");
