import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

function count(text) {
  if (!text) return 0;
  return source.split(text).length - 1;
}

const checks = [
  {
    label: "Tavla-ozel aksiyon guard fonksiyonu mevcut",
    test: () =>
      has("function guardTavlaOnlyAction()")
      && has("if (selectedGameId === \"tavla\") return true;")
      && has("setLobbyNotice(\"Bu ozellik su an sadece Tavla icin aktif.\");"),
  },
  {
    label: "Masa ac hizli oyna koda katil guard ile korunuyor",
    test: () =>
      has("function onOpenTable()")
      && has("function onQuickPlay()")
      && has("function onJoinByCode()")
      && count("if (!guardTavlaOnlyAction()) return;") >= 3,
  },
  {
    label: "Bot moduna gecis guard ile korunuyor",
    test: () =>
      has("async function startBotGame()")
      && count("if (!guardTavlaOnlyAction()) return;") >= 4,
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Game isolation guard smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Game isolation guard smoke passed.");
