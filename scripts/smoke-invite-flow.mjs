import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "Davet listesi sadece masa sahibine aciliyor ve bos koltuk kosulu araniyor",
    test: () =>
      has("function openInvitePicker(table: LobbyTable) {")
      && has("if (!isTableOwnerForUser(table, currentProfile.userId)) {")
      && has("if (!getOpenSeat(table)) {")
      && has("setInvitePickerTableId(table.id);"),
  },
  {
    label: "Masa ozel modu sadece masa sahibi tarafindan degistiriliyor",
    test: () =>
      has("function setTablePrivateMode(tableId: number, isPrivate: boolean) {")
      && has("if (!isTableOwnerForUser(table, currentProfile.userId)) {")
      && has("const patched = normalizeTableAccess({")
      && has("isPrivate,")
      && has("privateChangedAt: Date.now(),"),
  },
  {
    label: "Davet gonderiminde hedef oyuncu uygunluk kontrolleri var",
    test: () =>
      has("const alreadySeatedElsewhere = cleaned.some((row) => {")
      && has("if (table.white?.userId === safeTargetUserId || table.black?.userId === safeTargetUserId) {")
      && has("if (table.white && table.black) {"),
  },
  {
    label: "Davet gonderiminde tabloya invited alanlari yaziliyor",
    test: () =>
      has("const patched = normalizeTableAccess({")
      && has("invitedUserId: safeTargetUserId,")
      && has("invitedByUserId: sanitizeGuestId(currentProfile.userId) || table.ownerUserId || null,")
      && has("inviteNoticeId: null,")
      && has("inviteNoticeForUserId: null,")
      && has("inviteNoticeText: null,"),
  },
  {
    label: "Davet kabulunde oturma ve invited alanlarini temizleme birlikte calisiyor",
    test: () =>
      has("function acceptTableInvite(tableId: number) {")
      && has("const joined = sitToTable(table.id, targetSeat, table.roomCode, true);")
      && has("invitedUserId: null,")
      && has("invitedByUserId: null,")
      && has("setLobbyNotice(`Masa ${table.id} daveti kabul edildi.`);"),
  },
  {
    label: "Davet reddinde inviter notice yazilip invited alanlari temizleniyor",
    test: () =>
      has("function rejectTableInvite(tableId: number) {")
      && has("inviteNoticeId: inviterUserId ? createChatMessageId(`invite-reject-${tableId}-${inviterUserId}`) : null,")
      && has("inviteNoticeForUserId: inviterUserId || null,")
      && has("inviteNoticeText: inviterUserId")
      && has("setInvitePickerTableId(null);")
      && has("setLobbyNotice(`Masa ${tableId} daveti reddedildi.`);"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Invite flow smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Invite flow smoke passed.");
