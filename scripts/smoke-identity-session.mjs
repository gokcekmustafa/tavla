import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "Member session key ve revalidate interval sabitleri tanimli",
    test: () =>
      has("MEMBER_SESSION_KEY")
      && has("MEMBER_SESSION_REVALIDATE_INTERVAL_MS"),
  },
  {
    label: "Ayni kullanicinin farkli session ile ikinci kez oturmasi engelleniyor (upsert)",
    test: () =>
      has("const existingUserSeat = findUserSeat(cleaned, currentProfile.userId);")
      && has("blockReason = \"duplicate-user\";"),
  },
  {
    label: "Ayni kullanicinin farkli session ile ikinci kez oturmasi heartbeat akisinda da engelleniyor",
    test: () =>
      has("function syncRoomSeatHeartbeat()")
      && has("blockedReason = \"duplicate-user\";"),
  },
  {
    label: "Duplicate-user durumunda kullaniciya bilgilendirme yapiliyor",
    test: () =>
      has("Bu hesap baska bir tarayicida aktif. Diger oturumu kapatip tekrar deneyin."),
  },
  {
    label: "Lobi degisiminde eski lobi presence temizligi yapiliyor",
    test: () =>
      has("clearSessionPresenceFromLobby(previousLobbyId, appSessionId, \"lobby-change-presence-cleanup\")"),
  },
  {
    label: "Cikis ve session degisiminde MEMBER_SESSION temizleniyor",
    test: () => has("safeStorageRemoveItem(window.localStorage, MEMBER_SESSION_KEY);"),
  },
  {
    label: "Storage event ile uzaktaki session degisimleri dinleniyor",
    test: () => has("if (event.key === MEMBER_SESSION_KEY) {"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Identity/session smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Identity/session smoke passed.");
