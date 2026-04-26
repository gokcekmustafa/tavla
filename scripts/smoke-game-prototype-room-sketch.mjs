import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const cssPath = resolve("src", "App.css");
const appSource = readFileSync(appPath, "utf8");
const cssSource = readFileSync(cssPath, "utf8");

function hasApp(text) {
  return appSource.includes(text);
}

function hasCss(text) {
  return cssSource.includes(text);
}

const checks = [
  {
    label: "101 oda taslagi local state ile ac/kapatiliyor",
    test: () =>
      hasApp("const [okeyPrototypeRoomSketchOpen, setOkeyPrototypeRoomSketchOpen] = useState(false);")
      && hasApp("onClick={() => setOkeyPrototypeRoomSketchOpen((prev) => !prev)}")
      && hasApp("{okeyPrototypeRoomSketchOpen ? \"101 Oda Taslagini Kapat\" : \"101 Oda Taslagini Ac\"}"),
  },
  {
    label: "101 oda taslagi kartlari render ediliyor",
    test: () =>
      hasApp("const OKEY_PROTOTYPE_ROOMS = [")
      && hasApp("className=\"my-game-coming-room-shell\"")
      && hasApp("className=\"my-game-coming-room-grid\"")
      && hasApp("OKEY_PROTOTYPE_ROOMS.map((room) => ("),
  },
  {
    label: "101 oda taslagi css siniflari mevcut",
    test: () =>
      hasCss(".my-game-coming-room-shell {")
      && hasCss(".my-game-coming-room-head {")
      && hasCss(".my-game-coming-room-grid {")
      && hasCss(".my-game-coming-room-card {"),
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
