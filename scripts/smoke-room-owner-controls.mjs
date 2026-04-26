import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "Masa sahibi hesaplamasi currentRoomTable + userId uzerinden yapiliyor",
    test: () =>
      has("const currentRoomIsOwner = useMemo(")
      && has("() => isTableOwnerForUser(currentRoomTable, currentProfile.userId),")
      && has("[currentRoomTable, currentProfile.userId],"),
  },
  {
    label: "Set sayisi duzenleme yetkisi oyuncu rolu + sahiplik + seri baslamama kosuluna bagli",
    test: () =>
      has("const canEditCurrentRoomSetCount = useMemo(() => {")
      && has("if (!roomSession || roomSession.role !== \"player\") return false;")
      && has("if (!currentRoomTable || !currentRoomIsOwner) return false;")
      && has("if (matchLiveState.matchActive) return false;")
      && has("return !currentRoomTable.startedAt && currentRoomTable.setPlayed === 0;"),
  },
  {
    label: "Masa sahibi paneli sadece currentRoomTable && currentRoomIsOwner iken gorunuyor",
    test: () =>
      has("{currentRoomTable && currentRoomIsOwner ? ("),
  },
  {
    label: "Masa sahibi panelinde set secimi canEditCurrentRoomSetCount ile kilitleniyor",
    test: () =>
      has("onChange={(e) => setTableSetCount(currentRoomTable.id, Number.parseInt(e.target.value, 10) || 1)}")
      && has("disabled={!canEditCurrentRoomSetCount}")
      && has("Set sayisi seri baslamadan once ayarlanabilir."),
  },
  {
    label: "Davet/ozel/izleyici aksiyonlari masa sahibi panelindeki handlerlara bagli",
    test: () =>
      has("onClick={() => openInvitePicker(currentRoomTable)}")
      && has("onClick={() => setTablePrivateMode(currentRoomTable.id, !currentRoomTable.isPrivate)}")
      && has("onClick={() => setSpectatorChatEnabled(currentRoomTable.id, currentRoomTable.allowSpectatorChat === false)}"),
  },
  {
    label: "setTableSetCount fonksiyonu owner kontrolu ve seri kilidi ile guvence altinda",
    test: () =>
      has("function setTableSetCount(tableId: number, nextSetCount: number) {")
      && has("if (!isTableOwnerForUser(table, currentProfile.userId)) {")
      && has("if (table.startedAt || table.setPlayed > 0 || table.setWhiteWins > 0 || table.setBlackWins > 0) {")
      && has("if (notOwner) {")
      && has("if (locked) {")
      && has("setLobbyNotice(`Masa set sayisi ${safeSetCount} olarak ayarlandi.`);"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Room owner controls smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Room owner controls smoke passed.");
