import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "Leave permission alanlari tablo modelinde tanimli",
    test: () =>
      has("leavePermissionRequestByUserId: string | null;")
      && has("leavePermissionGrantedToUserId: string | null;"),
  },
  {
    label: "Leave aksiyon modal acilma kosulu iki oyuncu + ilk zar sonrasina bagli",
    test: () =>
      has("const bothPlayersSeated = Boolean(activeTable?.white && activeTable?.black);")
      && has("const firstRollPlayed = Boolean(matchLiveState.matchActive || (activeTable?.setPlayed ?? 0) > 0);")
      && has("if (bothPlayersSeated && firstRollPlayed) {"),
  },
  {
    label: "Puansiz ayrilma talebi request fonksiyonunda tabloya yaziliyor",
    test: () =>
      has("function requestLeaveWithoutPenalty()")
      && has("leavePermissionRequestByUserId: requesterUserId")
      && has("leavePermissionGrantedToUserId: null"),
  },
  {
    label: "Puansiz ayrilma onayi approve fonksiyonunda granted alanini set ediyor",
    test: () =>
      has("function approveLeaveWithoutPenalty()")
      && has("leavePermissionGrantedToUserId: requestUserId"),
  },
  {
    label: "Reddetme akisinda reject notice prefix kullaniliyor",
    test: () =>
      has("LEAVE_NOTICE_REJECT_PREFIX")
      && has("inviteNoticeText: `${LEAVE_NOTICE_REJECT_PREFIX}"),
  },
  {
    label: "Incoming leave prompt effecti request/grant durumunu izliyor",
    test: () =>
      has("const requestUserId = sanitizeGuestId(currentRoomTable.leavePermissionRequestByUserId ?? \"\");")
      && has("const grantedUserId = sanitizeGuestId(currentRoomTable.leavePermissionGrantedToUserId ?? \"\");")
      && has("setLeaveIncomingModal({"),
  },
  {
    label: "Onaylanan taleplerde auto leave akisi var",
    test: () =>
      has("const shouldAutoLeave = Boolean(")
      && has("leavePermissionAutoLeavingRef.current")
      && has("void leaveRoomAndGoLobby(true);"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Leave permission flow smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Leave permission flow smoke passed.");
