import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "onlineRows hesaplamasi useMemo ve table seat index'leri ile kuruluyor",
    test: () =>
      has("const onlineRows = useMemo<OnlineRow[]>(() => {")
      && has("const tableBySession = new Map<string, number>();")
      && has("const tableByUser = new Map<string, number>();")
      && has("tableBySession.set(seatInfo.sessionId, table.id);"),
  },
  {
    label: "Presence satirlari user/session key ile dedupe edilip yeni touchedAt ile guncelleniyor",
    test: () =>
      has("const map = new Map<string, LobbyPresenceState>();")
      && has("const key = sanitizeGuestId(row.userId) || `session:${row.sessionId}`;")
      && has("if (!existing || row.touchedAt >= existing.touchedAt) {")
      && has("map.set(key, row);"),
  },
  {
    label: "Hem lobby presence hem acik masa seat presence kaynaklari onlineRows'a akiyor",
    test: () =>
      has("lobbyState.presence.forEach((presence) => {")
      && has("upsertPresence(presence);")
      && has("openedTables.forEach((table) => {")
      && has("upsertPresence(presenceFromSeat(seatInfo, activeLobbyId));"),
  },
  {
    label: "Kendi oyuncu kaydi aktif lobi kimligi ile zorunlu olarak upsert ediliyor",
    test: () =>
      has("upsertPresence({")
      && has("sessionId: appSessionId,")
      && has("userId: currentProfile.userId,")
      && has("lobbyId: activeLobbyId,"),
  },
  {
    label: "Online liste filtrelemesi aktif lobi disi presence kayitlarini disliyor",
    test: () =>
      has("const seatedInActiveLobby = tableByUser.has(row.userId) || tableBySession.has(row.sessionId);")
      && has("const presenceLobbyId = sanitizeLobbyId(row.lobbyId ?? \"\");")
      && has("if (!presenceLobbyId) return row.sessionId === appSessionId;")
      && has("return presenceLobbyId === activeLobbyId;"),
  },
  {
    label: "Online satirlar tablo numarasi ve TR locale siralama ile finalize ediliyor",
    test: () =>
      has("tableNo: tableByUser.get(row.userId) ?? tableBySession.get(row.sessionId) ?? null,")
      && has(".sort((a, b) => a.name.localeCompare(b.name, \"tr\", { sensitivity: \"base\" }));"),
  },
  {
    label: "onlineRows useMemo dependency listesinde aktif lobi ve presence baglantilari var",
    test: () =>
      has("}, [openedTables, lobbyState.presence, appSessionId, activeLobbyId, safeGuestName, currentProfile.userId, currentProfile.username, currentProfile.gender, currentProfile.avatarId, currentProfile.points, currentProfile.stats]);"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Online rows lobby scope smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Online rows lobby scope smoke passed.");
