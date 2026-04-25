import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "Lobi sohbeti oturum giris zamanina gore filtreleniyor",
    test: () =>
      has("const [lobbyChatJoinedAt] = useState(() => Date.now());")
      && has("normalizeChatLog(lobbyState.lobbyChat, LOBBY_CHAT_LIMIT).filter((row) => row.at >= lobbyChatJoinedAt)"),
  },
  {
    label: "Masa sohbeti masaya katilim zamanina gore filtreleniyor",
    test: () =>
      has("const tableChatRows = useMemo(() => {")
      && has("return rows.filter((row) => row.at >= roomSession.joinedAt);"),
  },
  {
    label: "Masa sohbet gorunurlugu koltuk/session sahipligine bagli",
    test: () =>
      has("const canViewTableChat = useMemo(() => {")
      && has("return Boolean(mySeat && mySeat.sessionId === appSessionId);"),
  },
  {
    label: "Lobi sohbet yazma izni uyelik + permission kontrolu ile sinirli",
    test: () =>
      has("const canWriteLobbyChat = Boolean(member && !member.isBlocked && member.permissions.lobbyChat);")
      && has("function sendLobbyChat(rawText: string) {")
      && has("if (!member) {")
      && has("member.permissions.lobbyChat"),
  },
  {
    label: "Masa sohbet yazma izni rol + permission + spectator kurallariyla kontrol ediliyor",
    test: () =>
      has("const canWriteTableChat = useMemo(() => {")
      && has("member.permissions.tableChat")
      && has("member.permissions.spectatorChat")
      && has("currentRoomTable?.allowSpectatorChat !== false"),
  },
  {
    label: "Masa sohbet gonderiminde aktif masada oturan oyuncu/session kontrolu var",
    test: () =>
      has("function sendTableChat(rawText: string) {")
      && has("if (!mySeat || mySeat.sessionId !== appSessionId) {")
      && has("blocked = true;"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Chat scope smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Chat scope smoke passed.");
