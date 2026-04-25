import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "summarizeLobbyCounts aktif masa ve oyuncu sayisini ayri hesapliyor",
    test: () =>
      has("function summarizeLobbyCounts(snapshot: LobbyState, lobbyId = \"\"): LobbyRoomCounts {")
      && has("const activeTables = scopedTables.filter((table) => Boolean(table.white || table.black)).length;")
      && has("const cleanedPresence = cleanupPresenceRows(snapshot.presence).presence;")
      && has("const seatedPlayers = uniquePlayers.size;"),
  },
  {
    label: "Room picker satirlari cached deger yoksa fallback summarize ile doluyor",
    test: () =>
      has("const roomPickerRows = useMemo(() => {")
      && has("const cached = roomPickerLiveCounts[roomId];")
      && has("const fallback = summarizeLobbyCounts(loadLobbyState(makeLobbyStateStorageKey(room.id), roomName), roomId);")
      && has("const activeTables = cached?.activeTables ?? fallback.activeTables;")
      && has("const seatedPlayers = cached?.seatedPlayers ?? fallback.seatedPlayers;"),
  },
  {
    label: "Aktif lobi degisince roomPickerLiveCounts ozeti local state ile hizalaniyor",
    test: () =>
      has("const counts = summarizeLobbyCounts(lobbyState, safeActiveLobbyId);")
      && has("setRoomPickerLiveCounts((prev) => {")
      && has("current.activeTables === counts.activeTables")
      && has("current.seatedPlayers === counts.seatedPlayers"),
  },
  {
    label: "Room picker remote refresh in-flight kilidi ve timeout korumasi kullaniyor",
    test: () =>
      has("if (roomPickerRefreshInFlightRef.current) return;")
      && has("roomPickerRefreshInFlightRef.current = true;")
      && has("window.setTimeout(() => controller.abort(), ROOM_PICKER_REMOTE_FETCH_TIMEOUT_MS);")
      && has("fetch(buildRealtimeHttpSyncUrl(channel, `${appSessionId}-rooms`), {"),
  },
  {
    label: "Remote hata durumunda exponential backoff sabitleriyle sonraki deneme erteleniyor",
    test: () =>
      has("ROOM_PICKER_REMOTE_ERROR_BACKOFF_MIN_MS")
      && has("ROOM_PICKER_REMOTE_ERROR_BACKOFF_MAX_MS")
      && has("roomPickerRemoteNextAllowedAtRef.current = now + waitMs;")
      && has("roomPickerRemoteNextAllowedAtRef.current = now + ROOM_PICKER_REMOTE_REFRESH_MIN_MS;"),
  },
  {
    label: "Room picker count merge asamasinda degisen odalar guncellenip gecersiz id'ler temizleniyor",
    test: () =>
      has("const validIds = new Set(lobbyRooms.map((room) => sanitizeLobbyId(room.id)).filter(Boolean) as string[]);")
      && has("if (!validIds.has(roomId)) {")
      && has("delete merged[roomId];")
      && has("current.activeTables !== summary.activeTables")
      && has("current.seatedPlayers !== summary.seatedPlayers"),
  },
  {
    label: "Room picker UI odalarda masa ve oyuncu sayisini birlikte gosteriyor",
    test: () =>
      has("<p>Masa: {room.activeTables}</p>")
      && has("<p>Oyuncu: {room.seatedPlayers}</p>"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Room summary refresh smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Room summary refresh smoke passed.");
