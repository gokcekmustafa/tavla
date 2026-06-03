import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const tavlaAppPath = resolve("src", "apps", "tavla", "TavlaApp.tsx");
const okeyAppPath = resolve("src", "apps", "okey101", "Okey101App.tsx");
const shellSource = readFileSync(appPath, "utf8");
const tavlaSource = readFileSync(tavlaAppPath, "utf8");
const okeySource = readFileSync(okeyAppPath, "utf8");

function hasIn(text, source) {
  return source.includes(text);
}

function countIn(text, source) {
  if (!text) return 0;
  return source.split(text).length - 1;
}

const checks = [
  {
    label: "Tavla uygulamasinda tavla-ozel guard fonksiyonu mevcut",
    test: () =>
      hasIn("function guardTavlaOnlyAction()", tavlaSource)
      && hasIn("if (selectedGameId === \"tavla\") return true;", tavlaSource)
      && hasIn("setLobbyNotice(\"Bu ozellik su an sadece Tavla icin aktif.\");", tavlaSource),
  },
  {
    label: "Tavla masa aksiyonlari guard ile korunuyor",
    test: () =>
      hasIn("function onOpenTable()", tavlaSource)
      && hasIn("function onQuickPlay()", tavlaSource)
      && hasIn("function onJoinByCode()", tavlaSource)
      && countIn("if (!guardTavlaOnlyAction()) return;", tavlaSource) >= 3,
  },
  {
    label: "Tavla bot moduna gecis guard ile korunuyor",
    test: () =>
      hasIn("async function startBotGame()", tavlaSource)
      && countIn("if (!guardTavlaOnlyAction()) return;", tavlaSource) >= 4,
  },
  {
    label: "Shell app tavla ve 101 uygulamalarini ayri secimle aciyor",
    test: () =>
      hasIn("import TavlaApp from \"./apps/tavla/TavlaApp\";", shellSource)
      && hasIn("import Okey101App from \"./apps/okey101/Okey101App\";", shellSource)
      && (
        (
          hasIn("if (path.startsWith(\"/tavla\")) return <TavlaApp />;", shellSource)
          && hasIn("if (path.startsWith(\"/okey101\") || path.startsWith(\"/okey\")) return <Okey101App />;", shellSource)
        )
        || (
          hasIn("const [rootChoice, setRootChoice] = useState<RootGameChoice>(initialChoice);", shellSource)
          && hasIn("if (rootChoice === \"tavla\") return <TavlaApp />;", shellSource)
          && hasIn("if (rootChoice === \"okey101\") return <Okey101App />;", shellSource)
        )
      ),
  },
  {
    label: "101 uygulamasi ayri dosyada mevcut",
    test: () => hasIn("function Okey101App()", okeySource) && hasIn("const effectiveSelectedGameId: GameId = selectedGameId;", okeySource),
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
