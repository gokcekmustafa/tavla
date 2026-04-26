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
      && hasApp("const [okeyPrototypeRoomFilter, setOkeyPrototypeRoomFilter] = useState<\"all\" | \"fast\" | \"busy\">(\"all\");")
      && hasApp("const [okeyPrototypeSelectedRoomId, setOkeyPrototypeSelectedRoomId] = useState<string>(OKEY_PROTOTYPE_ROOMS[0]?.id ?? \"\");")
      && hasApp("onClick={() => setOkeyPrototypeRoomSketchOpen((prev) => !prev)}")
      && hasApp("{okeyPrototypeRoomSketchOpen ? \"101 Oda Taslagini Kapat\" : \"101 Oda Taslagini Ac\"}"),
  },
  {
    label: "101 oda taslagi kartlari render ediliyor",
    test: () =>
      hasApp("const OKEY_PROTOTYPE_ROOMS = [")
      && hasApp("className=\"my-game-coming-room-shell\"")
      && hasApp("className=\"my-game-coming-room-filters\"")
      && hasApp("className={`my-game-coming-room-filter ${okeyPrototypeRoomFilter === \"all\" ? \"active\" : \"\"}`}")
      && hasApp("className=\"my-game-coming-room-selected\"")
      && hasApp("className=\"my-game-coming-room-grid\"")
      && hasApp("okeyPrototypeFilteredRooms.map((room) => (")
      && hasApp("className={`my-game-coming-room-card ${okeyPrototypeSelectedRoomId === room.id ? \"active\" : \"\"}`}")
      && hasApp("onClick={() => setOkeyPrototypeSelectedRoomId(room.id)}")
      && hasApp("Gorunen Oda: {okeyPrototypeFilteredRooms.length} | Toplam Oyuncu: {okeyPrototypeFilteredPlayers}")
      && hasApp("const okeyPrototypeTableSketchRows = useMemo(() => {")
      && hasApp("className=\"my-game-coming-table-sketch\"")
      && hasApp("className=\"my-game-coming-table-sketch-grid\"")
      && hasApp("okeyPrototypeTableSketchRows.map((row) => ("),
  },
  {
    label: "101 oda taslagi css siniflari mevcut",
    test: () =>
      hasCss(".my-game-coming-room-shell {")
      && hasCss(".my-game-coming-room-head {")
      && hasCss(".my-game-coming-room-filters {")
      && hasCss(".my-game-coming-room-filter.active {")
      && hasCss(".my-game-coming-room-selected {")
      && hasCss(".my-game-coming-room-grid {")
      && hasCss(".my-game-coming-room-card {")
      && hasCss(".my-game-coming-room-card.active {")
      && hasCss(".my-game-coming-table-sketch {")
      && hasCss(".my-game-coming-table-sketch-grid {")
      && hasCss(".my-game-coming-table-sketch-card.active {"),
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
