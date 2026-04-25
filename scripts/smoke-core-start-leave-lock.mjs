import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "Auto-start fonksiyonu iki koltuk doldugunda startedAt uretiyor",
    test: () =>
      has("function autoStartTableWhenBothSeated(table: LobbyTable, now = Date.now()): LobbyTable {")
      && has("if (!table.white || !table.black) return table;")
      && has("if (table.startedAt) return table;")
      && has("startedAt: now,"),
  },
  {
    label: "Masaya oturma akisi auto-start fonksiyonunu tetikliyor",
    test: () =>
      has("function upsertMySeat(tableId: number, seat: Seat, explicitRoomCode?: string): UpsertSeatResult {")
      && has("const started = autoStartTableWhenBothSeated(patched, now);")
      && has("if (!patched.startedAt && Boolean(started.startedAt)) {"),
  },
  {
    label: "Heartbeat yedek akisi gec katilimda auto-start tetikliyor",
    test: () =>
      has("function syncRoomSeatHeartbeat() {")
      && has("const started = autoStartTableWhenBothSeated(patched, now);"),
  },
  {
    label: "Masadan cikis modal kilidi iki oyuncu + ilk zar kosuluna bagli",
    test: () =>
      has("function openLeaveActionModal() {")
      && has("const bothPlayersSeated = Boolean(activeTable?.white && activeTable?.black);")
      && has("const firstRollPlayed = Boolean(matchLiveState.matchActive || (activeTable?.setPlayed ?? 0) > 0);")
      && has("if (bothPlayersSeated && firstRollPlayed) {"),
  },
  {
    label: "Puansiz cikis teklifi request alanlarini dogru dolduruyor",
    test: () =>
      has("function requestLeaveWithoutPenalty() {")
      && has("leavePermissionRequestByUserId: requesterUserId,")
      && has("leavePermissionGrantedToUserId: null,"),
  },
  {
    label: "Puansiz cikis onayi granted alanini request sahibiyle esliyor",
    test: () =>
      has("function approveLeaveWithoutPenalty() {")
      && has("leavePermissionGrantedToUserId: requestUserId,"),
  },
  {
    label: "Reddetme akisinda reject prefix ve bildirim yazimi korunuyor",
    test: () =>
      has("function rejectLeaveWithoutPenalty() {")
      && has("LEAVE_NOTICE_REJECT_PREFIX")
      && has("inviteNoticeText: `${LEAVE_NOTICE_REJECT_PREFIX}"),
  },
  {
    label: "Onaylanan puansiz cikis taleplerinde auto leave calisiyor",
    test: () =>
      has("const shouldAutoLeave = Boolean(")
      && has("leavePermissionAutoLeavingRef.current")
      && has("void leaveRoomAndGoLobby(true);"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Core start/leave regression lock FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Core start/leave regression lock passed.");
