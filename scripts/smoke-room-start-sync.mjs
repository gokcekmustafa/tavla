import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "Room start gate mesaji iframe'e active/bothSeated/started alanlariyla gonderiliyor",
    test: () =>
      has("function syncRoomStartGateToIframe(targetWindow?: Window | null)")
      && has("type: \"room-start-gate\"")
      && has("bothSeated: gateActive ? Boolean(roomStartState?.bothSeated) : true,")
      && has("started: gateActive ? Boolean(roomStartState?.started) : true,"),
  },
  {
    label: "Legacy table-chat-ready mesajinda room start gate yeniden senkronlaniyor",
    test: () =>
      has("if (payload.type === \"table-chat-ready\") {")
      && has("syncTableChatToIframe();")
      && has("syncRoomStartGateToIframe();"),
  },
  {
    label: "Room start gate degisiminde anlik effect ile iframe senkronu tetikleniyor",
    test: () =>
      has("useEffect(() => {")
      && has("syncRoomStartGateToIframe();")
      && has("}, [syncRoomStartGateToIframe, roomSession, roomStartState?.bothSeated, roomStartState?.started, mode, iframeKey]);"),
  },
  {
    label: "Oyuncu modunda periyodik start gate senkronu interval ile korunuyor",
    test: () =>
      has("if (!roomSession || roomSession.role !== \"player\") return;")
      && has("const timer = window.setInterval(() => {")
      && has("syncRoomStartGateToIframe();")
      && has("}, 1200);"),
  },
  {
    label: "Iframe onLoad sonrasinda gecikmeli start gate re-sync calisiyor",
    test: () =>
      has("onLoad={() => {")
      && has("syncRoomStartGateToIframe(frameWindow);")
      && has("window.setTimeout(() => {")
      && has("syncRoomStartGateToIframe(iframeRef.current?.contentWindow ?? null);")
      && has("}, ROOM_START_GATE_RESYNC_DELAY_MS);"),
  },
  {
    label: "Start overlay sadece iki oyuncu oturunca ve oyun baslamamisken gorunuyor",
    test: () =>
      has("&& roomStartState")
      && has("&& !roomStartState.started")
      && has("&& roomStartState.bothSeated ? ("),
  },
  {
    label: "Oyuna basla dugmesi onRoomStartReady ile legacy start akisina bagli",
    test: () =>
      has("onClick={onRoomStartReady}")
      && has("OYUNA BASLA"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Room start sync smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Room start sync smoke passed.");
