import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "Presence temizleme fonksiyonu session ve user bazli dedupe yapiyor",
    test: () =>
      has("function cleanupPresenceRows(rows: LobbyPresenceState[])")
      && has("const bySessionTouchedAt = new Map<string, number>();")
      && has("const byUser = new Map<string, LobbyPresenceState>();")
      && has("const key = sanitizeGuestId(row.userId) || `session:${row.sessionId}`;")
      && has("const presence = Array.from(byUser.values());"),
  },
  {
    label: "Presence touchedAt degeri heartbeat penceresi ile normalize ediliyor",
    test: () =>
      has("normalizeActivityTimestamp(row.touchedAt, now, HEARTBEAT_MS * 2, row.sessionId)"),
  },
  {
    label: "syncLobbyPresence heartbeat stale kontrolu ile yazim yogunlugunu sinirliyor",
    test: () =>
      has("function syncLobbyPresence(force = false)")
      && has("const staleHeartbeat = !existing || now - existing.touchedAt > HEARTBEAT_MS;")
      && has("if (!force && !cleanedPresence.changed && !changedProfile && !staleHeartbeat) {"),
  },
  {
    label: "syncLobbyPresence aktif lobi kimligini presence satirina yaziyor",
    test: () =>
      has("lobbyId: activeLobbyId,"),
  },
  {
    label: "Presence heartbeat etkisi ilk anda force sync ve periyodik sync calistiriyor",
    test: () =>
      has("syncLobbyPresence(true);")
      && has("const timer = window.setInterval(() => syncLobbyPresence(false), HEARTBEAT_MS);"),
  },
  {
    label: "Lobi degisiminde onceki lobi presence kaydi temizleniyor",
    test: () =>
      has("clearSessionPresenceFromLobby(previousLobbyId, appSessionId, \"lobby-change-presence-cleanup\")"),
  },
  {
    label: "clearSessionPresenceFromLobby hedef session presence satirini cikariyor",
    test: () =>
      has("async function clearSessionPresenceFromLobby(lobbyId: string, sessionId: string, reason = \"lobby-switch-cleanup\")")
      && has("const nextPresence = cleanedPresence.filter((entry) => entry.sessionId !== safeSessionId);"),
  },
  {
    label: "Beforeunload korumasi local snapshotta session presence temizligi yapiyor",
    test: () =>
      has("window.addEventListener(\"beforeunload\", onBeforeUnload);")
      && has("const nextPresence = cleanedPresence.filter((entry) => entry.sessionId !== appSessionId);"),
  },
  {
    label: "Periyodik stale temizleyici tables ile birlikte presence prune yapiyor",
    test: () =>
      has("const cleanedPresence = cleanupPresenceRows(latest.presence);")
      && has("if (hasChange) {")
      && has("persistLobbyState(normalized);"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Presence lifecycle smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Presence lifecycle smoke passed.");
