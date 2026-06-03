import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

const checks = [
  {
    label: "PRESENCE_STALE_MS tanimli",
    test: () => /const\s+PRESENCE_STALE_MS\s*=\s*\d+_?\d*;/.test(source),
  },
  {
    label: "cleanupPresenceRows session bazli normalize kullaniyor",
    test: () =>
      source.includes("normalizeActivityTimestamp(row.touchedAt, now, HEARTBEAT_MS * 2, row.sessionId)"),
  },
  {
    label: "presence bySession map mevcut",
    test: () => source.includes("const bySession = new Map<string, LobbyPresenceState>();"),
  },
  {
    label: "presence user dedupe anahtari mevcut",
    test: () => source.includes("sanitizeGuestId(row.userId) || `session:${row.sessionId}`"),
  },
  {
    label: "onlineRows local kullaniciyi upsert ediyor",
    test: () => source.includes("upsertPresence({") && source.includes("sessionId: appSessionId"),
  },
  {
    label: "beforeunload local session presence temizliyor",
    test: () => source.includes("nextPresence = cleanedPresence.filter((entry) => entry.sessionId !== appSessionId)"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  // Keep output compact and actionable.
  console.error("Lobby sync guard FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Lobby sync guard passed.");
