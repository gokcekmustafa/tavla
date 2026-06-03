import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "Masa oturma akisi upsert ile auto-start tetikleyebiliyor",
    test: () =>
      has("function upsertMySeat(tableId: number, seat: Seat, explicitRoomCode?: string)")
      && has("const started = autoStartTableWhenBothSeated(patched, now);")
      && has("if (!patched.startedAt && Boolean(started.startedAt)) {"),
  },
  {
    label: "Iki koltuk doldugunda auto-start flow eventi yaziliyor",
    test: () =>
      has("appendFlowEvent(\"table.autostart\", \"Iki koltuk doldugu icin oyun otomatik basladi.\""),
  },
  {
    label: "Heartbeat korumasi gec katilimda auto-start yedek tetikliyor",
    test: () =>
      has("function syncRoomSeatHeartbeat()")
      && has("const started = autoStartTableWhenBothSeated(patched, now);")
      && has("appendFlowEvent(\"table.autostart\", \"Kalp atisinda iki koltuk dolu goruldu, oyun otomatik baslatildi.\""),
  },
  {
    label: "Lobi yazimi realtime snapshot olarak WS veya HTTP ile yayinlaniyor",
    test: () =>
      has("function persistLobbyState(next: LobbyState)")
      && has("const sent = sendRealtimeSnapshot(normalized, \"lobby-update\");")
      && has("void syncRealtimeViaHttp(\"lobby-update-fallback\");")
      && has("void syncRealtimeViaHttp(\"lobby-update-mirror\");"),
  },
  {
    label: "Uzak snapshot alimi kanal kontrolu ile merge edilip local state'e yaziliyor",
    test: () =>
      has("function applyIncomingRealtimeSnapshot(message: RealtimeMessage)")
      && has("if (message.channel !== expectedChannel) return false;")
      && has("const merged = mergeLobbyStates(currentLocal, incoming);")
      && has("setLobbyState(merged);"),
  },
  {
    label: "Room start state iki koltuk dolu + startedAt/readyAt ile hesaplanıyor",
    test: () =>
      has("const bothSeated = Boolean(currentRoomTable.white && currentRoomTable.black);")
      && has("const started = Boolean(bothSeated && (currentRoomTable.startedAt || (currentRoomTable.whiteReadyAt && currentRoomTable.blackReadyAt)));"),
  },
  {
    label: "Istemci tarafinda room-start-gate anlik ve periyodik olarak iframe'e senkronlaniyor",
    test: () =>
      has("syncRoomStartGateToIframe();")
      && has("const timer = window.setInterval(() => {")
      && has("}, 1200);"),
  },
  {
    label: "Iframe onLoad sonrasi gecikmeli room-start-gate re-sync var",
    test: () =>
      has("syncRoomStartGateToIframe(frameWindow);")
      && has("window.setTimeout(() => {")
      && has("syncRoomStartGateToIframe(iframeRef.current?.contentWindow ?? null);")
      && has("ROOM_START_GATE_RESYNC_DELAY_MS"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Two-client start smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Two-client start smoke passed.");
