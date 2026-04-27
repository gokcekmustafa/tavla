import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const okeyAppPath = resolve("src", "apps", "okey101", "Okey101App.tsx");
const cssPath = resolve("src", "App.css");
const appSource = readFileSync(okeyAppPath, "utf8");
const cssSource = readFileSync(cssPath, "utf8");

function hasApp(text) {
  return appSource.includes(text);
}

function hasCss(text) {
  return cssSource.includes(text);
}

const checks = [
  {
    label: "101 prototip state ve masa yonetimi ayri app dosyasinda mevcut",
    test: () =>
      hasApp("function Okey101App()")
      && hasApp("const [okeyPrototypeRoomSketchOpen, setOkeyPrototypeRoomSketchOpen]")
      && hasApp("const [okeyPrototypeTablesByRoom, setOkeyPrototypeTablesByRoom]")
      && hasApp("function reserveOkeyPrototypeSeat(")
      && hasApp("function leaveOkeyPrototypeSeat(sourceLabel: string)")
      && hasApp("function adminCloseOkeyPrototypeTable(tableRow: OkeyPrototypeTableSketchRow)"),
  },
  {
    label: "101 oda taslagi kartlari ve masa listesi render ediliyor",
    test: () =>
      hasApp("className=\"my-game-coming-room-shell\"")
      && hasApp("className=\"my-game-coming-room-grid\"")
      && hasApp("okeyPrototypeFilteredRooms.map((room) => (")
      && hasApp("className=\"my-okey-lobby-grid\"")
      && hasApp("okeyPrototypeLobbyRows.map((row) => {")
      && hasApp("Masaya Otur (Prototip)")
      && hasApp("Masadan Ayril (Prototip)"),
  },
  {
    label: "101 taslak css siniflari mevcut",
    test: () =>
      hasCss(".my-game-coming-room-shell {")
      && hasCss(".my-game-coming-room-grid {")
      && hasCss(".my-game-coming-table-sketch {")
      && hasCss(".my-okey-lobby-grid {")
      && hasCss(".my-okey-lobby-card {")
      && hasCss(".my-okey-lobby-board {"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Game prototype room sketch smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Game prototype room sketch smoke passed.");
