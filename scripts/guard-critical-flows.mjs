import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

const checks = [
  {
    label: "Masa otomatik baslatma fonksiyonu mevcut",
    test: () => source.includes("function autoStartTableWhenBothSeated("),
  },
  {
    label: "Masa otomatik baslatma en az iki yerde kullaniliyor",
    test: () => (source.match(/autoStartTableWhenBothSeated\(/g) ?? []).length >= 3,
  },
  {
    label: "Oda baslama kilidi iframe senkron fonksiyonu mevcut",
    test: () => source.includes("function syncRoomStartGateToIframe("),
  },
  {
    label: "Iframe onLoad icinde room-start-gate senkronu var",
    test: () => source.includes("syncRoomStartGateToIframe(frameWindow);"),
  },
  {
    label: "Iframe onLoad sonrasinda gecikmeli room-start-gate tekrar senkronu var",
    test: () =>
      source.includes("ROOM_START_GATE_RESYNC_DELAY_MS")
      && source.includes("window.setTimeout(() => {")
      && source.includes("syncRoomStartGateToIframe(iframeRef.current?.contentWindow ?? null);"),
  },
  {
    label: "Legacy table-chat-ready mesajinda room-start-gate de tekrar senkron ediliyor",
    test: () => {
      const readyBlock = source.match(
        /if \(payload\.type === "table-chat-ready"\)\s*{([\s\S]*?)\n\s*return;\n\s*}/,
      );
      if (!readyBlock) return false;
      return readyBlock[1].includes("syncTableChatToIframe();") && readyBlock[1].includes("syncRoomStartGateToIframe();");
    },
  },
  {
    label: "HTTP senkron dongusu gorunmeyen sekmede yavaslatiliyor",
    test: () =>
      source.includes("HTTP_SYNC_BACKGROUND_RUN_INTERVAL_MS")
      && source.includes("document.hidden ? HTTP_SYNC_BACKGROUND_RUN_INTERVAL_MS : HTTP_SYNC_RUN_INTERVAL_MS"),
  },
  {
    label: "Puansiz cikma izin alanlari tablo modelinde mevcut",
    test: () =>
      source.includes("leavePermissionRequestByUserId: string | null;")
      && source.includes("leavePermissionGrantedToUserId: string | null;"),
  },
  {
    label: "Akis log fonksiyonu mevcut",
    test: () => source.includes("function appendFlowEvent("),
  },
  {
    label: "Masaya oturma akis loglari mevcut",
    test: () =>
      source.includes("appendFlowEvent(\"seat.joined\"")
      && source.includes("appendFlowEvent(\"seat.blocked\""),
  },
  {
    label: "Masadan ayrilma akis loglari mevcut",
    test: () =>
      source.includes("\"seat.release\"")
      && source.includes("appendFlowEvent(\"table.leave\""),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Critical flow guard FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Critical flow guard passed.");
