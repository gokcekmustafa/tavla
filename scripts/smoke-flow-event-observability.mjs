import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "Flow event log state/ref altyapisi tanimli",
    test: () =>
      has("const [flowEvents, setFlowEvents] = useState<FlowEvent[]>([]);")
      && has("const flowEventSeqRef = useRef(0);")
      && has("const flowEventLastSeenRef = useRef<Map<string, number>>(new Map());"),
  },
  {
    label: "appendFlowEvent dedupe ve log limit akisini iceriyor",
    test: () =>
      has("function appendFlowEvent(")
      && has("const dedupeKey = payload?.dedupeKey ? `${kind}:${payload.dedupeKey}` : \"\";")
      && has("flowEventLastSeenRef.current.set(dedupeKey, now);")
      && has("return next.length > FLOW_EVENT_LOG_LIMIT ? next.slice(next.length - FLOW_EVENT_LOG_LIMIT) : next;"),
  },
  {
    label: "Kritik masa/oyuncu gecis olaylari appendFlowEvent ile bagli",
    test: () =>
      has("\"seat.joined\"")
      && has("\"seat.blocked\"")
      && has("\"table.autostart\"")
      && has("\"seat.release\"")
      && has("\"table.leave\"")
      && has("\"view.lobby\"")
      && has("\"seat.heartbeat-blocked\""),
  },
  {
    label: "Masa gorunum acilisi table.enter olayi ile loglaniyor",
    test: () =>
      has("appendFlowEvent(\"table.enter\", \"Masa gorunumu acildi.\""),
  },
  {
    label: "Diagnostik panelde akis olaylari listesi render ediliyor",
    test: () =>
      has("{diagnosticsEnabled ? (")
      && has("<p className=\"line\">Akis Olaylari ({flowEvents.length})</p>")
      && has("flowEvents.slice(-8).reverse().map((entry) => ("),
  },
  {
    label: "Flow debug log bayragi mevcut",
    test: () =>
      has("if (ENABLE_FLOW_DEBUG_LOGS) {")
      && has("console.debug(\"[FLOW]\", entry.kind, entry.detail, {"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Flow event observability smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Flow event observability smoke passed.");
