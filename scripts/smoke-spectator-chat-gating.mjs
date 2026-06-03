import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "Tablo normalize adiminda allowSpectatorChat varsayilani korunuyor",
    test: () =>
      has("function normalizeTableAccess(table: LobbyTable): LobbyTable {")
      && has("const allowSpectatorChat = table.allowSpectatorChat !== false;")
      && has("table.allowSpectatorChat === allowSpectatorChat"),
  },
  {
    label: "canWriteTableChat izleyici dalinda masa izin kilidi ve spectator permission birlikte kontrol ediliyor",
    test: () =>
      has("const canWriteTableChat = useMemo(() => {")
      && has("if (roomSession.role === \"spectator\") {")
      && has("member.permissions.spectatorChat")
      && has("return currentRoomTable?.allowSpectatorChat !== false && memberAllowed;"),
  },
  {
    label: "setSpectatorChatEnabled sadece masa sahibine acik ve allowSpectatorChat alanini yaziyor",
    test: () =>
      has("function setSpectatorChatEnabled(tableId: number, enabled: boolean) {")
      && has("if (!isTableOwnerForUser(table, currentProfile.userId)) {")
      && has("allowSpectatorChat: enabled,"),
  },
  {
    label: "sendTableChat izleyici modunda table.allowSpectatorChat false ise mesaji engelliyor",
    test: () =>
      has("let spectatorChatBlocked = false;")
      && has("} else if (table.allowSpectatorChat === false) {")
      && has("spectatorChatBlocked = true;")
      && has("if (spectatorChatBlocked) {"),
  },
  {
    label: "UI'da izleyici sohbet toggle butonu room owner paneline bagli",
    test: () =>
      has("onClick={() => setSpectatorChatEnabled(currentRoomTable.id, currentRoomTable.allowSpectatorChat === false)}")
      && has("{currentRoomTable.allowSpectatorChat === false ? \"İzleyici Yazısını Aç\" : \"İzleyici Yazısını Kapat\"}"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Spectator chat gating smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Spectator chat gating smoke passed.");
