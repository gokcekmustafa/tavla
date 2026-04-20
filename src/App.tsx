import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

type GameMode = "local" | "bot";
type Seat = "white" | "black";
type RoomRole = "player" | "spectator";
type ViewMode = "lobby" | "table";
type AuthMode = "login" | "register";
type MatchOutcome = "win" | "loss" | "resign";
type MemberRole = "user" | "admin";
type MemberGender = "male" | "female" | "unknown";
type AdminRoleFilter = "all" | MemberRole;
type AdminSortKey = "name" | "points" | "games" | "wins" | "losses" | "resigns" | "createdAt";
type AvatarId =
  | "male_01"
  | "male_02"
  | "male_03"
  | "female_01"
  | "female_02"
  | "female_03"
  | "neutral_01";

type AvatarPreset = {
  id: AvatarId;
  label: string;
  gender: MemberGender;
};

type PlayerStats = {
  gamesPlayed: number;
  wins: number;
  losses: number;
  resigns: number;
};

type RoomSession = {
  code: string;
  seat: Seat;
  sessionId: string;
  roomName: string;
  tableNo: number;
  role: RoomRole;
  joinedAt: number;
};

type MemberUser = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  gender: MemberGender;
  avatarId: AvatarId;
  points: number;
  createdAt: number;
  stats: PlayerStats;
  role: MemberRole;
};

type GameRules = {
  winPoints: number;
  lossPoints: number;
  resignPenaltyPoints: number;
  updatedAt: number;
};

type GuestProfile = {
  userId: string;
  displayName: string;
  gender: MemberGender;
  avatarId: AvatarId;
  points: number;
  stats: PlayerStats;
};

type MemberSession = {
  userId: string;
};

type LobbySeatState = {
  sessionId: string;
  userId: string;
  username: string;
  displayName: string;
  gender: MemberGender;
  avatarId: AvatarId;
  points: number;
  stats: PlayerStats;
  touchedAt: number;
};

type LobbyPresenceState = {
  sessionId: string;
  userId: string;
  username: string;
  displayName: string;
  gender: MemberGender;
  avatarId: AvatarId;
  points: number;
  stats: PlayerStats;
  touchedAt: number;
};

type LobbyTable = {
  id: number;
  roomCode: string;
  white: LobbySeatState | null;
  black: LobbySeatState | null;
  allowSpectatorChat: boolean;
  ownerUserId: string;
  isPrivate: boolean;
  privateChangedAt: number;
  invitedUserId: string | null;
  invitedByUserId: string | null;
  inviteNoticeId: string | null;
  inviteNoticeForUserId: string | null;
  inviteNoticeText: string | null;
  whiteReadyAt: number | null;
  blackReadyAt: number | null;
  startedAt: number | null;
  setCount: number;
  setPlayed: number;
  setWhiteWins: number;
  setBlackWins: number;
  setResultTokens: string[];
  leavePermissionRequestByUserId: string | null;
  leavePermissionGrantedToUserId: string | null;
};

type LobbyState = {
  lobbyName: string;
  tables: LobbyTable[];
  presence: LobbyPresenceState[];
  lobbyChat: ChatMessage[];
  tableChats: Record<string, ChatMessage[]>;
  closedTableRooms: Record<string, number>;
  guestCounter: number;
  guestLabels: Record<string, number>;
  updatedAt: number;
};

type OnlineRow = {
  key: string;
  userId: string;
  sessionId: string;
  username: string;
  gender: MemberGender;
  avatarId: AvatarId;
  name: string;
  points: number;
  stats: PlayerStats;
  tableNo: number | null;
};

type ChatMessage = {
  id: string;
  at: number;
  userId: string;
  displayName: string;
  text: string;
};

type LegacyHostStateMessage = {
  source: "tavla-legacy";
  type: "state";
  matchToken: string;
  matchActive: boolean;
  winner: Seat | null;
  localColor: Seat | null;
  turn?: Seat | null;
  activityTick?: number;
};

type LegacyMatchFinishedMessage = {
  source: "tavla-legacy";
  type: "match-finished";
  matchToken: string;
  winner: Seat;
  loser: Seat | null;
  reason: "normal" | "resign";
  localColor: Seat | null;
};

type LegacyTableChatSendMessage = {
  source: "tavla-legacy";
  type: "table-chat-send";
  text: string;
};

type LegacyTableChatReadyMessage = {
  source: "tavla-legacy";
  type: "table-chat-ready";
};

type LegacyHostMessage =
  | LegacyHostStateMessage
  | LegacyMatchFinishedMessage
  | LegacyTableChatSendMessage
  | LegacyTableChatReadyMessage;

type PlayerProfileModalState = {
  open: boolean;
  loading: boolean;
  isMember: boolean;
  name: string;
  username?: string;
  gender: MemberGender;
  avatarId: AvatarId;
  points: number;
  stats: PlayerStats;
  email?: string;
  userId?: string;
  error?: string;
};

type CleanupResult = {
  tables: LobbyTable[];
  changed: boolean;
};

type UpsertSeatResult = {
  table: LobbyTable | null;
  reason: "occupied" | "already-seated" | "private" | "missing-owner" | null;
};

type RealtimeMessage = {
  kind: "hello" | "snapshot";
  channel: string;
  sender: string;
  counter: number;
  at: number;
  payload?: unknown;
  reason?: string;
};

const GUEST_STORAGE_KEY = "tavla.guestName";
const GUEST_ID_STORAGE_KEY = "tavla.guest.id.v1";
const GUEST_PROFILE_SESSION_KEY = "tavla.guest.profile.session.v1";
const MEMBER_SESSION_KEY = "tavla.member.session.v1";
const LOBBY_STATE_KEY = "tavla.lobby.state.v2";
const LOBBY_SYNC_CHANNEL = "tavla.lobby.sync.v2";
const REALTIME_LOBBY_CHANNEL = "tavla-global-lobby-v1";
const REALTIME_HTTP_SYNC_PATH = "/api/lobby-sync";
const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_LOBBY_NAME = "Lobi 1";
const SEAT_STALE_MS = 180_000;
const PRESENCE_STALE_MS = 35_000;
const HEARTBEAT_MS = 5_000;
const DEFAULT_WIN_POINTS = 100;
const DEFAULT_LOSS_POINTS = 0;
const DEFAULT_RESIGN_PENALTY_POINTS = 50;
const DEFAULT_TABLE_SET_COUNT = 1;
const MIN_TABLE_SET_COUNT = 1;
const MAX_TABLE_SET_COUNT = 5;
const TABLE_RESULT_TOKEN_LIMIT = 32;
const TABLE_CLOSE_TOMBSTONE_TTL_MS = 10 * 60 * 1000;
const CHAT_TEXT_MAX = 180;
const LOBBY_CHAT_LIMIT = 120;
const TABLE_CHAT_LIMIT = 80;
const LOBBY_CHAT_AUTO_SCROLL_THRESHOLD = 24;
const OPPONENT_MOVE_TIMEOUT_MS = 60_000;
const ROOM_MISSING_CHECK_DELAY_MS = 2_200;
const ROOM_MISSING_CLOSE_GRACE_MS = 9_000;
const AVATAR_PRESETS: readonly AvatarPreset[] = [
  { id: "male_01", label: "Erkek Klasik", gender: "male" },
  { id: "male_02", label: "Erkek Sakalli", gender: "male" },
  { id: "male_03", label: "Erkek Sapkali", gender: "male" },
  { id: "female_01", label: "Kadin Klasik", gender: "female" },
  { id: "female_02", label: "Kadin Kizil", gender: "female" },
  { id: "female_03", label: "Kadin Gozluklu", gender: "female" },
  { id: "neutral_01", label: "Notr Robot", gender: "unknown" },
] as const;
const AVATAR_PRESET_BY_ID: Record<AvatarId, AvatarPreset> = AVATAR_PRESETS.reduce((acc, preset) => {
  acc[preset.id] = preset;
  return acc;
}, {} as Record<AvatarId, AvatarPreset>);
const DEFAULT_AVATAR_BY_GENDER: Record<MemberGender, AvatarId> = {
  male: "male_01",
  female: "female_01",
  unknown: "neutral_01",
};

function getDefaultRealtimeWsBase() {
  if (typeof window === "undefined") return "ws://127.0.0.1:8787/realtime";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/realtime`;
}

function normalizeRealtimeWsBase(rawValue: string | undefined) {
  const fallback = getDefaultRealtimeWsBase();
  const trimmed = rawValue?.trim();
  if (!trimmed) return fallback;
  try {
    const url = new URL(trimmed, typeof window === "undefined" ? "http://localhost" : window.location.href);
    if (url.protocol === "http:") url.protocol = "ws:";
    if (url.protocol === "https:") url.protocol = "wss:";
    if (url.protocol !== "ws:" && url.protocol !== "wss:") return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
}

function buildRealtimeChannelUrl(base: string, channel: string, clientId: string) {
  const url = new URL(base);
  url.searchParams.set("channel", channel);
  url.searchParams.set("client", clientId);
  return url.toString();
}

function buildRealtimeHttpSyncUrl(channel: string, clientId: string) {
  const base = typeof window === "undefined" ? "http://localhost" : window.location.origin;
  const url = new URL(REALTIME_HTTP_SYNC_PATH, base);
  url.searchParams.set("channel", channel);
  url.searchParams.set("client", clientId);
  return url.toString();
}

function normalizeRealtimeMessage(raw: unknown): RealtimeMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<RealtimeMessage>;
  const kind = candidate.kind === "hello" || candidate.kind === "snapshot" ? candidate.kind : null;
  const channel = typeof candidate.channel === "string" ? candidate.channel : "";
  const sender = typeof candidate.sender === "string" ? candidate.sender : "";
  const counterRaw = Number(candidate.counter);
  if (!kind || !channel || !sender || !Number.isFinite(counterRaw)) return null;
  return {
    kind,
    channel,
    sender,
    counter: Math.max(0, Math.trunc(counterRaw)),
    at: Number.isFinite(candidate.at) ? Number(candidate.at) : Date.now(),
    payload: candidate.payload,
    reason: typeof candidate.reason === "string" ? candidate.reason.slice(0, 120) : undefined,
  };
}

const REALTIME_WS_BASE_URL = normalizeRealtimeWsBase(import.meta.env.VITE_REALTIME_WS_URL as string | undefined);

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

async function readApiError(response: Response, fallback: string) {
  const clone = response.clone();
  const data = (await response.json().catch(() => null)) as { error?: unknown } | null;
  if (typeof data?.error === "string" && data.error.trim()) {
    return data.error.trim();
  }
  const text = (await clone.text().catch(() => "")).trim();
  if (text) {
    return text.slice(0, 220);
  }
  if (response.status === 503) {
    return "Kimlik servisi gecici olarak kullanilamiyor. Lutfen biraz sonra tekrar deneyin.";
  }
  return fallback;
}

function sanitizeRoomCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function sanitizeGuestId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 36);
}

function sanitizeGuestName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 24);
}

function sanitizeLobbyName(value: string) {
  const out = value.replace(/\s+/g, " ").trim().slice(0, 24);
  return out || DEFAULT_LOBBY_NAME;
}

function sanitizeEmail(value: string) {
  return value.trim().toLowerCase().slice(0, 80);
}

function sanitizeMemberUsername(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
}

function fallbackUsernameFromName(name: string) {
  const base = sanitizeMemberUsername(name.replace(/\s+/g, "_"));
  if (base) return base;
  return "misafir";
}

function sanitizeMemberGender(raw: unknown): MemberGender {
  if (raw === "male" || raw === "female") return raw;
  return "unknown";
}

function genderLabel(gender: MemberGender) {
  if (gender === "male") return "Erkek";
  if (gender === "female") return "Kadin";
  return "Belirtilmedi";
}

function sanitizeAvatarId(raw: unknown, gender: MemberGender = "unknown"): AvatarId {
  if (typeof raw === "string") {
    const trimmed = raw.trim().toLowerCase();
    if (trimmed in AVATAR_PRESET_BY_ID) {
      return trimmed as AvatarId;
    }
  }
  return DEFAULT_AVATAR_BY_GENDER[sanitizeMemberGender(gender)];
}

function avatarAssetPath(avatarId: AvatarId) {
  return `/avatars/${sanitizeAvatarId(avatarId)}.svg`;
}

function avatarOptionsForGender(gender: MemberGender) {
  const normalized = sanitizeMemberGender(gender);
  const preferred = AVATAR_PRESETS.filter((preset) => preset.gender === normalized);
  const rest = AVATAR_PRESETS.filter((preset) => preset.gender !== normalized);
  return [...preferred, ...rest];
}

function sanitizeMemberRole(raw: unknown): MemberRole {
  if (raw === "admin") return "admin";
  return "user";
}

function normalizeRuleNumber(value: unknown, fallback: number, min: number, max: number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const next = Math.trunc(num);
  if (next < min) return min;
  if (next > max) return max;
  return next;
}

function createDefaultGameRules(): GameRules {
  return {
    winPoints: DEFAULT_WIN_POINTS,
    lossPoints: DEFAULT_LOSS_POINTS,
    resignPenaltyPoints: DEFAULT_RESIGN_PENALTY_POINTS,
    updatedAt: Date.now(),
  };
}

function normalizeGameRules(raw: unknown, fallback?: GameRules): GameRules {
  const base = fallback ?? createDefaultGameRules();
  if (!raw || typeof raw !== "object") return base;
  const candidate = raw as Partial<GameRules>;
  return {
    winPoints: normalizeRuleNumber(candidate.winPoints, base.winPoints, -10_000, 10_000),
    lossPoints: normalizeRuleNumber(candidate.lossPoints, base.lossPoints, -10_000, 10_000),
    resignPenaltyPoints: normalizeRuleNumber(candidate.resignPenaltyPoints, base.resignPenaltyPoints, 0, 10_000),
    updatedAt: Number.isFinite(candidate.updatedAt) ? Number(candidate.updatedAt) : base.updatedAt,
  };
}

function sanitizeChatId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
}

function sanitizeChatText(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, CHAT_TEXT_MAX);
}

function sanitizeTableChatKey(value: string) {
  const roomCode = sanitizeRoomCode(value);
  if (roomCode) return roomCode;
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24);
}

function tableChatKey(table: Pick<LobbyTable, "roomCode" | "id">) {
  const roomCode = sanitizeRoomCode(table.roomCode);
  if (roomCode) return roomCode;
  return `T${Math.max(1, table.id)}`;
}

function createChatMessageId(seed: string) {
  const safeSeed = sanitizeGuestId(seed).slice(-8) || "chat";
  return sanitizeChatId(`${Date.now().toString(36)}-${safeSeed}-${Math.random().toString(36).slice(2, 8)}`);
}

function formatChatTime(timestamp: number) {
  if (!Number.isFinite(timestamp)) return "--:--";
  try {
    return new Date(timestamp).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "--:--";
  }
}

function formatSince(timestamp: number, now = Date.now()) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "hic";
  const delta = Math.max(0, now - timestamp);
  if (delta < 1500) return "simdi";
  const sec = Math.floor(delta / 1000);
  if (sec < 60) return `${sec} sn once`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} dk once`;
  const hour = Math.floor(min / 60);
  return `${hour} sa once`;
}

function websocketStateText(readyState: number) {
  if (typeof WebSocket === "undefined") return "destek yok";
  if (readyState === WebSocket.OPEN) return "acik";
  if (readyState === WebSocket.CONNECTING) return "baglaniyor";
  if (readyState === WebSocket.CLOSING) return "kapanis";
  return "kapali";
}

function createEmptyStats(): PlayerStats {
  return {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    resigns: 0,
  };
}

function normalizeStats(raw: unknown): PlayerStats {
  if (!raw || typeof raw !== "object") return createEmptyStats();
  const candidate = raw as Partial<PlayerStats>;
  const gamesPlayed = Number.isFinite(candidate.gamesPlayed) ? Math.max(0, Math.trunc(Number(candidate.gamesPlayed))) : 0;
  const wins = Number.isFinite(candidate.wins) ? Math.max(0, Math.trunc(Number(candidate.wins))) : 0;
  const losses = Number.isFinite(candidate.losses) ? Math.max(0, Math.trunc(Number(candidate.losses))) : 0;
  const resigns = Number.isFinite(candidate.resigns) ? Math.max(0, Math.trunc(Number(candidate.resigns))) : 0;
  return {
    gamesPlayed: Math.max(gamesPlayed, wins + losses),
    wins,
    losses,
    resigns,
  };
}

function sameStats(a: PlayerStats, b: PlayerStats) {
  const left = normalizeStats(a);
  const right = normalizeStats(b);
  return (
    left.gamesPlayed === right.gamesPlayed
    && left.wins === right.wins
    && left.losses === right.losses
    && left.resigns === right.resigns
  );
}

function applyStatsOutcome(base: PlayerStats, outcome: MatchOutcome): PlayerStats {
  const next = normalizeStats(base);
  next.gamesPlayed += 1;
  if (outcome === "win") {
    next.wins += 1;
  } else if (outcome === "loss") {
    next.losses += 1;
  } else {
    next.losses += 1;
    next.resigns += 1;
  }
  return next;
}

function pointsDeltaForOutcome(outcome: MatchOutcome, rules: GameRules) {
  const activeRules = normalizeGameRules(rules, createDefaultGameRules());
  if (outcome === "win") return activeRules.winPoints;
  if (outcome === "resign") return -activeRules.resignPenaltyPoints;
  return activeRules.lossPoints;
}

function normalizeTableSetCount(value: unknown, fallback = DEFAULT_TABLE_SET_COUNT) {
  const safeFallback = Math.max(MIN_TABLE_SET_COUNT, Math.min(MAX_TABLE_SET_COUNT, Math.trunc(fallback)));
  const num = Number(value);
  if (!Number.isFinite(num)) return safeFallback;
  const next = Math.trunc(num);
  if (next < MIN_TABLE_SET_COUNT) return MIN_TABLE_SET_COUNT;
  if (next > MAX_TABLE_SET_COUNT) return MAX_TABLE_SET_COUNT;
  return next;
}

function sanitizeSeriesToken(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 120);
}

function normalizeSeriesTokenList(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  raw.forEach((item) => {
    const token = sanitizeSeriesToken(item);
    if (!token || seen.has(token)) return;
    seen.add(token);
    out.push(token);
  });
  if (out.length <= TABLE_RESULT_TOKEN_LIMIT) return out;
  return out.slice(out.length - TABLE_RESULT_TOKEN_LIMIT);
}

function normalizeClosedTableRooms(raw: unknown, now = Date.now()) {
  const result: Record<string, number> = {};
  if (!raw || typeof raw !== "object") return result;
  Object.entries(raw as Record<string, unknown>).forEach(([roomCodeRaw, closedAtRaw]) => {
    const roomCode = sanitizeRoomCode(roomCodeRaw);
    if (!roomCode) return;
    const closedAt = Number(closedAtRaw);
    if (!Number.isFinite(closedAt) || closedAt <= 0) return;
    if (now - closedAt > TABLE_CLOSE_TOMBSTONE_TTL_MS) return;
    result[roomCode] = Math.max(result[roomCode] ?? 0, Math.trunc(closedAt));
  });
  return result;
}

function mergeClosedTableRooms(base: Record<string, number>, incoming: Record<string, number>) {
  const now = Date.now();
  const merged = normalizeClosedTableRooms(base, now);
  Object.entries(normalizeClosedTableRooms(incoming, now)).forEach(([roomCode, closedAt]) => {
    merged[roomCode] = Math.max(merged[roomCode] ?? 0, closedAt);
  });
  return merged;
}

function markClosedTableRooms(base: Record<string, number>, roomCodes: string[], closedAt = Date.now()) {
  const merged = normalizeClosedTableRooms(base, closedAt);
  roomCodes.forEach((rawCode) => {
    const roomCode = sanitizeRoomCode(rawCode);
    if (!roomCode) return;
    merged[roomCode] = Math.max(merged[roomCode] ?? 0, closedAt);
  });
  return merged;
}

function tableLatestSeatTouch(table: LobbyTable) {
  return Math.max(table.white?.touchedAt ?? 0, table.black?.touchedAt ?? 0);
}

function isTableSuppressedByCloseTombstone(table: LobbyTable, closedTableRooms: Record<string, number>) {
  const roomCode = sanitizeRoomCode(table.roomCode);
  if (!roomCode) return false;
  const closedAt = closedTableRooms[roomCode];
  if (!closedAt) return false;
  return closedAt >= tableLatestSeatTouch(table);
}

function resetTableSeriesProgress(table: LobbyTable): LobbyTable {
  if (
    table.setPlayed === 0
    && table.setWhiteWins === 0
    && table.setBlackWins === 0
    && table.setResultTokens.length === 0
    && !table.leavePermissionRequestByUserId
    && !table.leavePermissionGrantedToUserId
  ) {
    return table;
  }
  return {
    ...table,
    setPlayed: 0,
    setWhiteWins: 0,
    setBlackWins: 0,
    setResultTokens: [],
    leavePermissionRequestByUserId: null,
    leavePermissionGrantedToUserId: null,
  };
}

function tableSeriesWinner(table: LobbyTable, tieBreakerWinner: Seat | null = null): Seat | null {
  if (table.setWhiteWins > table.setBlackWins) return "white";
  if (table.setBlackWins > table.setWhiteWins) return "black";
  return tieBreakerWinner;
}

function isTableSeriesComplete(table: LobbyTable) {
  return table.setPlayed >= table.setCount && table.setCount >= MIN_TABLE_SET_COUNT;
}

function normalizeNonNegativeInt(value: unknown, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.trunc(num));
}

function isMemberUserId(userId: string) {
  return /^m[a-zA-Z0-9_-]*/.test(userId);
}

function normalizeMemberUser(raw: unknown): MemberUser | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<MemberUser>;
  const id = typeof candidate.id === "string" ? candidate.id : "";
  const email = sanitizeEmail(typeof candidate.email === "string" ? candidate.email : "");
  const displayName = sanitizeGuestName(typeof candidate.displayName === "string" ? candidate.displayName : "Uye") || "Uye";
  const username =
    sanitizeMemberUsername(typeof candidate.username === "string" ? candidate.username : "")
    || fallbackUsernameFromName(displayName);
  if (!id || !email) return null;
  return {
    id,
    username,
    displayName,
    email,
    gender: sanitizeMemberGender(candidate.gender),
    avatarId: sanitizeAvatarId(candidate.avatarId, sanitizeMemberGender(candidate.gender)),
    points: normalizeNonNegativeInt(candidate.points, 1500),
    createdAt: Number.isFinite(candidate.createdAt) ? Number(candidate.createdAt) : Date.now(),
    stats: normalizeStats(candidate.stats),
    role: sanitizeMemberRole(candidate.role),
  };
}

function normalizeMemberUsers(raw: unknown): MemberUser[] {
  if (!Array.isArray(raw)) return [];
  const byId = new Map<string, MemberUser>();
  raw.forEach((item) => {
    const user = normalizeMemberUser(item);
    if (!user) return;
    byId.set(user.id, user);
  });
  return [...byId.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, "tr"));
}

function createSessionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function createRoomCode() {
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)];
  }
  return out;
}

function getOrCreateGuestId() {
  if (typeof window === "undefined") return `guest-${createSessionId()}`;
  const existing = sanitizeGuestId(window.localStorage.getItem(GUEST_ID_STORAGE_KEY) ?? "");
  if (existing) return existing;
  const next = sanitizeGuestId(`g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`) || "guest1";
  window.localStorage.setItem(GUEST_ID_STORAGE_KEY, next);
  return next;
}

function getGuestFallbackNo(guestId: string) {
  let hash = 0;
  for (let i = 0; i < guestId.length; i += 1) {
    hash = (hash * 31 + guestId.charCodeAt(i)) % 9000;
  }
  return hash + 1000;
}

function seatText(seat: Seat) {
  return seat === "white" ? "Beyaz" : "Siyah";
}

function roomRoleText(role: RoomRole) {
  return role === "spectator" ? "Izleyici" : "Oyuncu";
}

function sortTables(tables: LobbyTable[]) {
  return [...tables].sort((a, b) => a.id - b.id);
}

function getSeatUserIds(table: Pick<LobbyTable, "white" | "black">) {
  const whiteUser = sanitizeGuestId(table.white?.userId ?? "");
  const blackUser = sanitizeGuestId(table.black?.userId ?? "");
  return [whiteUser, blackUser].filter((userId): userId is string => Boolean(userId));
}

function isTableOwnerForUser(table: LobbyTable | null | undefined, userId: string) {
  if (!table) return false;
  const safeUserId = sanitizeGuestId(userId);
  if (!safeUserId) return false;
  return sanitizeGuestId(table.ownerUserId) === safeUserId;
}

function isTablePrivateBlockedForUser(table: LobbyTable, userId: string, sessionId: string) {
  if (!table.isPrivate) return false;
  if (table.white?.sessionId === sessionId || table.black?.sessionId === sessionId) return false;
  const safeUserId = sanitizeGuestId(userId);
  if (!safeUserId) return true;
  const ownerUserId = sanitizeGuestId(table.ownerUserId ?? "");
  if (ownerUserId && safeUserId === ownerUserId) return false;
  const invitedUserId = sanitizeGuestId(table.invitedUserId ?? "");
  if (invitedUserId && safeUserId === invitedUserId) return false;
  return true;
}

function getOpenSeat(table: LobbyTable): Seat | null {
  if (!table.white) return "white";
  if (!table.black) return "black";
  return null;
}

function normalizeTableAccess(table: LobbyTable): LobbyTable {
  const allowSpectatorChat = table.allowSpectatorChat !== false;
  const seatUsers = getSeatUserIds(table);
  const rawOwnerUserId = sanitizeGuestId(table.ownerUserId ?? "");
  let ownerUserId = rawOwnerUserId;
  if (!ownerUserId || !seatUsers.includes(ownerUserId)) {
    ownerUserId = seatUsers[0] ?? "";
  }

  const ownerChanged = ownerUserId !== rawOwnerUserId;
  let isPrivate = Boolean(table.isPrivate && ownerUserId);
  let privateChangedAt = normalizeNonNegativeInt(table.privateChangedAt, 0);
  let invitedUserId = sanitizeGuestId(table.invitedUserId ?? "");
  let invitedByUserId = sanitizeGuestId(table.invitedByUserId ?? "");
  let inviteNoticeId = sanitizeChatId(table.inviteNoticeId ?? "");
  let inviteNoticeForUserId = sanitizeGuestId(table.inviteNoticeForUserId ?? "");
  let inviteNoticeText = sanitizeChatText(table.inviteNoticeText ?? "");

  if (ownerChanged) {
    // Masa sahibi degisirse davet kaydini temizle ama ozel kilidi koru.
    invitedUserId = "";
    invitedByUserId = "";
    inviteNoticeId = "";
    inviteNoticeForUserId = "";
    inviteNoticeText = "";
  }

  if (invitedUserId && seatUsers.includes(invitedUserId)) {
    invitedUserId = "";
    invitedByUserId = "";
  }

  if (table.white && table.black && invitedUserId && !seatUsers.includes(invitedUserId)) {
    invitedUserId = "";
    invitedByUserId = "";
  }

  if (!ownerUserId) {
    isPrivate = false;
    invitedUserId = "";
    invitedByUserId = "";
    inviteNoticeId = "";
    inviteNoticeForUserId = "";
    inviteNoticeText = "";
  }

  if (invitedUserId) {
    invitedByUserId = ownerUserId || invitedByUserId;
  } else {
    invitedByUserId = "";
  }

  if (!inviteNoticeId || !inviteNoticeForUserId || !inviteNoticeText) {
    inviteNoticeId = "";
    inviteNoticeForUserId = "";
    inviteNoticeText = "";
  }

  const setCount = normalizeTableSetCount(table.setCount, DEFAULT_TABLE_SET_COUNT);
  let setPlayed = normalizeNonNegativeInt(table.setPlayed, 0);
  let setWhiteWins = normalizeNonNegativeInt(table.setWhiteWins, 0);
  let setBlackWins = normalizeNonNegativeInt(table.setBlackWins, 0);
  let setResultTokens = normalizeSeriesTokenList(table.setResultTokens);
  let leavePermissionRequestByUserId = sanitizeGuestId(table.leavePermissionRequestByUserId ?? "");
  let leavePermissionGrantedToUserId = sanitizeGuestId(table.leavePermissionGrantedToUserId ?? "");

  if (!table.white || !table.black) {
    setPlayed = 0;
    setWhiteWins = 0;
    setBlackWins = 0;
    setResultTokens = [];
    leavePermissionRequestByUserId = "";
    leavePermissionGrantedToUserId = "";
  }

  const minPlayedFromWins = setWhiteWins + setBlackWins;
  if (setPlayed < minPlayedFromWins) {
    setPlayed = minPlayedFromWins;
  }
  if (setPlayed > setCount) {
    setPlayed = setCount;
  }
  if (setWhiteWins > setPlayed) {
    setWhiteWins = setPlayed;
  }
  if (setBlackWins > setPlayed) {
    setBlackWins = setPlayed;
  }
  if (setPlayed === 0) {
    setResultTokens = [];
  }

  if (leavePermissionRequestByUserId && !seatUsers.includes(leavePermissionRequestByUserId)) {
    leavePermissionRequestByUserId = "";
  }
  if (leavePermissionGrantedToUserId && !seatUsers.includes(leavePermissionGrantedToUserId)) {
    leavePermissionGrantedToUserId = "";
  }
  if (!leavePermissionRequestByUserId) {
    leavePermissionGrantedToUserId = "";
  }
  if (leavePermissionGrantedToUserId && leavePermissionGrantedToUserId !== leavePermissionRequestByUserId) {
    leavePermissionGrantedToUserId = "";
  }

  const normalizedInvitedUserId = invitedUserId || null;
  const normalizedInvitedByUserId = invitedByUserId || null;
  const normalizedInviteNoticeId = inviteNoticeId || null;
  const normalizedInviteNoticeForUserId = inviteNoticeForUserId || null;
  const normalizedInviteNoticeText = inviteNoticeText || null;

  if (
    table.allowSpectatorChat === allowSpectatorChat
    &&
    table.ownerUserId === ownerUserId
    && table.isPrivate === isPrivate
    && table.privateChangedAt === privateChangedAt
    && table.invitedUserId === normalizedInvitedUserId
    && table.invitedByUserId === normalizedInvitedByUserId
    && table.inviteNoticeId === normalizedInviteNoticeId
    && table.inviteNoticeForUserId === normalizedInviteNoticeForUserId
    && table.inviteNoticeText === normalizedInviteNoticeText
    && table.setCount === setCount
    && table.setPlayed === setPlayed
    && table.setWhiteWins === setWhiteWins
    && table.setBlackWins === setBlackWins
    && JSON.stringify(table.setResultTokens) === JSON.stringify(setResultTokens)
    && (table.leavePermissionRequestByUserId ?? null) === (leavePermissionRequestByUserId || null)
    && (table.leavePermissionGrantedToUserId ?? null) === (leavePermissionGrantedToUserId || null)
  ) {
    return table;
  }

  return {
    ...table,
    allowSpectatorChat,
    ownerUserId,
    isPrivate,
    privateChangedAt,
    invitedUserId: normalizedInvitedUserId,
    invitedByUserId: normalizedInvitedByUserId,
    inviteNoticeId: normalizedInviteNoticeId,
    inviteNoticeForUserId: normalizedInviteNoticeForUserId,
    inviteNoticeText: normalizedInviteNoticeText,
    setCount,
    setPlayed,
    setWhiteWins,
    setBlackWins,
    setResultTokens,
    leavePermissionRequestByUserId: leavePermissionRequestByUserId || null,
    leavePermissionGrantedToUserId: leavePermissionGrantedToUserId || null,
  };
}

function createDefaultLobbyState(): LobbyState {
  return {
    lobbyName: DEFAULT_LOBBY_NAME,
    tables: [],
    presence: [],
    lobbyChat: [],
    tableChats: {},
    closedTableRooms: {},
    guestCounter: 0,
    guestLabels: {},
    updatedAt: Date.now(),
  };
}

function normalizeGuestLabels(rawLabels: Record<string, unknown>, preferredCounter: number) {
  const parsed: Array<{ key: string; value: number }> = [];
  Object.entries(rawLabels).forEach(([key, value]) => {
    const safeKey = sanitizeGuestId(key);
    const safeValue = Number(value);
    if (!safeKey || !Number.isInteger(safeValue) || safeValue <= 0) return;
    parsed.push({ key: safeKey, value: safeValue });
  });

  parsed.sort((a, b) => a.value - b.value || a.key.localeCompare(b.key));

  const guestLabels: Record<string, number> = {};
  const used = new Set<number>();
  let highest = 0;
  let nextCandidate = Math.max(1, Math.trunc(preferredCounter) + 1);

  parsed.forEach((entry) => {
    let assigned = entry.value;
    if (used.has(assigned)) {
      while (used.has(nextCandidate)) nextCandidate += 1;
      assigned = nextCandidate;
      nextCandidate += 1;
    } else if (assigned >= nextCandidate) {
      nextCandidate = assigned + 1;
    }

    used.add(assigned);
    guestLabels[entry.key] = assigned;
    highest = Math.max(highest, assigned);
  });

  return {
    guestLabels,
    guestCounter: Math.max(0, Math.trunc(preferredCounter), highest),
  };
}

function normalizeChatMessage(raw: unknown): ChatMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<ChatMessage>;
  const id = sanitizeChatId(typeof candidate.id === "string" ? candidate.id : "");
  const userId = sanitizeGuestId(typeof candidate.userId === "string" ? candidate.userId : "");
  const text = sanitizeChatText(typeof candidate.text === "string" ? candidate.text : "");
  if (!id || !userId || !text) return null;
  return {
    id,
    at: Number.isFinite(candidate.at) ? Number(candidate.at) : Date.now(),
    userId,
    displayName: sanitizeGuestName(typeof candidate.displayName === "string" ? candidate.displayName : "Oyuncu") || "Oyuncu",
    text,
  };
}

function normalizeChatLog(raw: unknown, limit: number) {
  const rows = Array.isArray(raw) ? raw : [];
  const byId = new Map<string, ChatMessage>();
  rows.forEach((row) => {
    const normalized = normalizeChatMessage(row);
    if (!normalized) return;
    const existing = byId.get(normalized.id);
    if (!existing || normalized.at >= existing.at) {
      byId.set(normalized.id, normalized);
    }
  });
  return Array.from(byId.values())
    .sort((a, b) => a.at - b.at || a.id.localeCompare(b.id))
    .slice(-limit);
}

function mergeChatLogs(base: ChatMessage[], incoming: ChatMessage[], limit: number) {
  return normalizeChatLog([...base, ...incoming], limit);
}

function appendChatMessage(log: ChatMessage[], message: ChatMessage, limit: number) {
  return normalizeChatLog([...log, message], limit);
}

function normalizeSeat(raw: unknown): LobbySeatState | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<LobbySeatState>;
  const sessionId = typeof candidate.sessionId === "string" ? candidate.sessionId : "";
  if (!sessionId) return null;
  const displayName = sanitizeGuestName(typeof candidate.displayName === "string" ? candidate.displayName : "Misafir") || "Misafir";
  const gender = sanitizeMemberGender(candidate.gender);
  return {
    sessionId,
    userId: typeof candidate.userId === "string" ? candidate.userId : `guest-${sessionId}`,
    username:
      sanitizeMemberUsername(typeof candidate.username === "string" ? candidate.username : "")
      || fallbackUsernameFromName(displayName),
    displayName,
    gender,
    avatarId: sanitizeAvatarId(candidate.avatarId, gender),
    points: normalizeNonNegativeInt(candidate.points, 1500),
    stats: normalizeStats(candidate.stats),
    touchedAt: Number.isFinite(candidate.touchedAt) ? Number(candidate.touchedAt) : Date.now(),
  };
}

function normalizePresence(raw: unknown): LobbyPresenceState | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<LobbyPresenceState>;
  const sessionId = typeof candidate.sessionId === "string" ? candidate.sessionId : "";
  if (!sessionId) return null;
  const displayName = sanitizeGuestName(typeof candidate.displayName === "string" ? candidate.displayName : "Misafir") || "Misafir";
  const gender = sanitizeMemberGender(candidate.gender);
  return {
    sessionId,
    userId: typeof candidate.userId === "string" ? candidate.userId : `guest-${sessionId}`,
    username:
      sanitizeMemberUsername(typeof candidate.username === "string" ? candidate.username : "")
      || fallbackUsernameFromName(displayName),
    displayName,
    gender,
    avatarId: sanitizeAvatarId(candidate.avatarId, gender),
    points: normalizeNonNegativeInt(candidate.points, 1500),
    stats: normalizeStats(candidate.stats),
    touchedAt: Number.isFinite(candidate.touchedAt) ? Number(candidate.touchedAt) : Date.now(),
  };
}

function presenceFromSeat(seat: LobbySeatState): LobbyPresenceState {
  return {
    sessionId: seat.sessionId,
    userId: seat.userId,
    username: seat.username,
    displayName: seat.displayName,
    gender: sanitizeMemberGender(seat.gender),
    avatarId: sanitizeAvatarId(seat.avatarId, seat.gender),
    points: seat.points,
    stats: normalizeStats(seat.stats),
    touchedAt: seat.touchedAt,
  };
}

function parseReadyStamp(value: unknown) {
  if (!Number.isFinite(value)) return null;
  const parsed = Number(value);
  return parsed > 0 ? parsed : null;
}

function resetTableStartGate(table: LobbyTable): LobbyTable {
  if (!table.whiteReadyAt && !table.blackReadyAt && !table.startedAt) return table;
  return {
    ...table,
    whiteReadyAt: null,
    blackReadyAt: null,
    startedAt: null,
  };
}

function normalizeTableStartGate(table: LobbyTable): LobbyTable {
  let whiteReadyAt = table.whiteReadyAt;
  let blackReadyAt = table.blackReadyAt;
  let startedAt = table.startedAt;

  if (!table.white || !table.black) {
    whiteReadyAt = null;
    blackReadyAt = null;
    startedAt = null;
  } else {
    if (startedAt) {
      startedAt = Math.max(startedAt, whiteReadyAt ?? 0, blackReadyAt ?? 0);
    } else if (whiteReadyAt && blackReadyAt) {
      startedAt = Math.max(startedAt ?? 0, whiteReadyAt, blackReadyAt);
    } else {
      startedAt = null;
    }
  }

  if (
    whiteReadyAt === table.whiteReadyAt
    && blackReadyAt === table.blackReadyAt
    && startedAt === table.startedAt
  ) {
    return table;
  }

  return {
    ...table,
    whiteReadyAt,
    blackReadyAt,
    startedAt,
  };
}

function normalizeTable(raw: unknown, index: number): LobbyTable | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<LobbyTable>;
  const id = Number.isInteger(candidate.id) && (candidate.id ?? 0) > 0 ? candidate.id! : index + 1;
  const roomCode = sanitizeRoomCode(candidate.roomCode ?? "") || createRoomCode();
  const white = normalizeSeat(candidate.white);
  const black = normalizeSeat(candidate.black);
  if (!white && !black) return null;
  const table: LobbyTable = {
    id,
    roomCode,
    white,
    black,
    allowSpectatorChat: candidate.allowSpectatorChat !== false,
    ownerUserId: sanitizeGuestId(candidate.ownerUserId ?? ""),
    isPrivate: Boolean(candidate.isPrivate),
    privateChangedAt: normalizeNonNegativeInt(candidate.privateChangedAt, 0),
    invitedUserId: sanitizeGuestId(candidate.invitedUserId ?? "") || null,
    invitedByUserId: sanitizeGuestId(candidate.invitedByUserId ?? "") || null,
    inviteNoticeId: sanitizeChatId(candidate.inviteNoticeId ?? "") || null,
    inviteNoticeForUserId: sanitizeGuestId(candidate.inviteNoticeForUserId ?? "") || null,
    inviteNoticeText: sanitizeChatText(candidate.inviteNoticeText ?? "") || null,
    whiteReadyAt: parseReadyStamp(candidate.whiteReadyAt),
    blackReadyAt: parseReadyStamp(candidate.blackReadyAt),
    startedAt: parseReadyStamp(candidate.startedAt),
    setCount: normalizeTableSetCount(candidate.setCount, DEFAULT_TABLE_SET_COUNT),
    setPlayed: normalizeNonNegativeInt(candidate.setPlayed, 0),
    setWhiteWins: normalizeNonNegativeInt(candidate.setWhiteWins, 0),
    setBlackWins: normalizeNonNegativeInt(candidate.setBlackWins, 0),
    setResultTokens: normalizeSeriesTokenList(candidate.setResultTokens),
    leavePermissionRequestByUserId: sanitizeGuestId(candidate.leavePermissionRequestByUserId ?? "") || null,
    leavePermissionGrantedToUserId: sanitizeGuestId(candidate.leavePermissionGrantedToUserId ?? "") || null,
  };
  return normalizeTableAccess(normalizeTableStartGate(table));
}

function cleanupStaleAndPrune(tables: LobbyTable[]): CleanupResult {
  const now = Date.now();
  let changed = false;
  const next: LobbyTable[] = [];

  sortTables(tables).forEach((table) => {
    const whiteExpired = table.white ? now - table.white.touchedAt > SEAT_STALE_MS : false;
    const blackExpired = table.black ? now - table.black.touchedAt > SEAT_STALE_MS : false;
    const white = whiteExpired ? null : table.white;
    const black = blackExpired ? null : table.black;
    if (whiteExpired || blackExpired) changed = true;
    if (!white && !black) {
      changed = true;
      return;
    }
    let nextTable: LobbyTable = { ...table, white, black };
    if (white !== table.white || black !== table.black) {
      changed = true;
      nextTable = resetTableSeriesProgress(resetTableStartGate(nextTable));
    }
    const normalizedGate = normalizeTableStartGate(nextTable);
    if (normalizedGate !== nextTable) changed = true;
    const normalizedAccess = normalizeTableAccess(normalizedGate);
    if (normalizedAccess !== normalizedGate) changed = true;
    next.push(normalizedAccess);
  });

  return { tables: sortTables(next), changed };
}

function autoStartTableWhenBothSeated(table: LobbyTable, now = Date.now()): LobbyTable {
  if (!table.white || !table.black) return table;
  if (table.startedAt) return table;
  return {
    ...table,
    whiteReadyAt: table.whiteReadyAt ?? now,
    blackReadyAt: table.blackReadyAt ?? now,
    startedAt: now,
  };
}

function cleanupPresenceRows(rows: LobbyPresenceState[]) {
  const now = Date.now();
  let changed = false;
  const bySession = new Map<string, LobbyPresenceState>();

  rows.forEach((row) => {
    if (now - row.touchedAt > PRESENCE_STALE_MS) {
      changed = true;
      return;
    }
    const existing = bySession.get(row.sessionId);
    if (!existing || row.touchedAt >= existing.touchedAt) {
      if (existing && existing !== row) changed = true;
      bySession.set(row.sessionId, row);
    }
  });

  const presence = Array.from(bySession.values());
  if (presence.length !== rows.length) {
    changed = true;
  }
  return { presence, changed };
}

function normalizeLobbyState(raw: unknown): LobbyState {
  const fallback = createDefaultLobbyState();
  if (!raw || typeof raw !== "object") return fallback;
  const candidate = raw as Partial<LobbyState>;
  const now = Date.now();
  const closedTableRooms = normalizeClosedTableRooms(candidate.closedTableRooms, now);
  const lobbyName = sanitizeLobbyName(typeof candidate.lobbyName === "string" ? candidate.lobbyName : DEFAULT_LOBBY_NAME);
  const tableRows = Array.isArray(candidate.tables) ? candidate.tables : [];
  const normalizedTables = tableRows
    .map((row, index) => normalizeTable(row, index))
    .filter((row): row is LobbyTable => Boolean(row));
  const cleaned = cleanupStaleAndPrune(normalizedTables).tables
    .filter((table) => !isTableSuppressedByCloseTombstone(table, closedTableRooms));
  const rawPresenceRows = Array.isArray(candidate.presence) ? candidate.presence : [];
  const normalizedPresenceRows = rawPresenceRows
    .map((row) => normalizePresence(row))
    .filter((row): row is LobbyPresenceState => Boolean(row));
  const seatPresenceRows = cleaned.flatMap((table) => {
    const rows: LobbyPresenceState[] = [];
    if (table.white) rows.push(presenceFromSeat(table.white));
    if (table.black) rows.push(presenceFromSeat(table.black));
    return rows;
  });
  const cleanedPresence = cleanupPresenceRows([...normalizedPresenceRows, ...seatPresenceRows]).presence;
  const lobbyChat = normalizeChatLog(candidate.lobbyChat, LOBBY_CHAT_LIMIT);
  const activeTableChatKeys = new Set(cleaned.map((table) => tableChatKey(table)));
  const rawTableChats = candidate.tableChats && typeof candidate.tableChats === "object"
    ? candidate.tableChats as Record<string, unknown>
    : {};
  const tableChats: Record<string, ChatMessage[]> = {};
  Object.entries(rawTableChats).forEach(([rawKey, value]) => {
    const safeKey = sanitizeTableChatKey(rawKey);
    if (!safeKey || !activeTableChatKeys.has(safeKey)) return;
    const log = normalizeChatLog(value, TABLE_CHAT_LIMIT);
    if (log.length > 0) {
      tableChats[safeKey] = log;
    }
  });
  const rawGuestCounter = Number.isInteger(candidate.guestCounter) && Number(candidate.guestCounter) >= 0
    ? Number(candidate.guestCounter)
    : 0;
  const rawLabels = candidate.guestLabels && typeof candidate.guestLabels === "object"
    ? candidate.guestLabels as Record<string, unknown>
    : {};
  const { guestLabels, guestCounter } = normalizeGuestLabels(rawLabels, rawGuestCounter);
  return {
    lobbyName,
    tables: cleaned,
    presence: cleanedPresence,
    lobbyChat,
    tableChats,
    closedTableRooms,
    guestCounter,
    guestLabels,
    updatedAt: Number.isFinite(candidate.updatedAt) ? Number(candidate.updatedAt) : Date.now(),
  };
}

function loadLobbyState() {
  return normalizeLobbyState(loadJson<unknown>(LOBBY_STATE_KEY, createDefaultLobbyState()));
}

function loadGuestProfile(guestId: string, fallbackName: string): GuestProfile {
  if (typeof window === "undefined") {
    return {
      userId: `guest-${guestId}`,
      displayName: sanitizeGuestName(fallbackName) || "Misafir",
      gender: "unknown",
      avatarId: DEFAULT_AVATAR_BY_GENDER.unknown,
      points: 1500,
      stats: createEmptyStats(),
    };
  }
  const raw = loadJson<unknown>(GUEST_PROFILE_SESSION_KEY, null);
  const candidate = raw && typeof raw === "object" ? raw as Partial<GuestProfile> : null;
  const storedGuestId = sanitizeGuestId(typeof candidate?.userId === "string" ? candidate.userId.replace(/^guest-/, "") : "");
  const userId = `guest-${guestId}`;
  if (!candidate || storedGuestId !== guestId) {
    return {
      userId,
      displayName: sanitizeGuestName(fallbackName) || "Misafir",
      gender: "unknown",
      avatarId: DEFAULT_AVATAR_BY_GENDER.unknown,
      points: 1500,
      stats: createEmptyStats(),
    };
  }
  const gender = sanitizeMemberGender(candidate.gender);
  return {
    userId,
    displayName: sanitizeGuestName(typeof candidate.displayName === "string" ? candidate.displayName : fallbackName) || "Misafir",
    gender,
    avatarId: sanitizeAvatarId(candidate.avatarId, gender),
    points: normalizeNonNegativeInt(candidate.points, 1500),
    stats: normalizeStats(candidate.stats),
  };
}

function saveGuestProfile(profile: GuestProfile) {
  if (typeof window === "undefined") return;
  saveJson(GUEST_PROFILE_SESSION_KEY, {
    userId: profile.userId,
    displayName: sanitizeGuestName(profile.displayName) || "Misafir",
    gender: sanitizeMemberGender(profile.gender),
    avatarId: sanitizeAvatarId(profile.avatarId, profile.gender),
    points: normalizeNonNegativeInt(profile.points, 1500),
    stats: normalizeStats(profile.stats),
  } satisfies GuestProfile);
}

function loadMemberSession() {
  const raw = loadJson<unknown>(MEMBER_SESSION_KEY, null);
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<MemberSession>;
  if (!candidate.userId) return null;
  return { userId: String(candidate.userId) } satisfies MemberSession;
}

function getInitialGuestName() {
  if (typeof window === "undefined") return "Misafir";
  const params = new URLSearchParams(window.location.search);
  const fromUrl = sanitizeGuestName(params.get("name") ?? params.get("guest") ?? "");
  if (fromUrl) return fromUrl;
  const fromStorage = sanitizeGuestName(window.localStorage.getItem(GUEST_STORAGE_KEY) ?? "");
  return fromStorage || "Misafir";
}

function getInitialRoomSession(): RoomSession | null {
  return null;
}

function clearSessionFromTables(
  tables: LobbyTable[],
  sessionId: string,
): { tables: LobbyTable[]; changed: boolean } {
  let changed = false;
  const next = tables.map((table) => {
    const whiteOwned = Boolean(table.white?.sessionId === sessionId);
    const blackOwned = Boolean(table.black?.sessionId === sessionId);
    if (!whiteOwned && !blackOwned) return table;
    changed = true;
    return normalizeTableAccess(
      resetTableSeriesProgress(resetTableStartGate({
        ...table,
        white: whiteOwned ? null : table.white,
        black: blackOwned ? null : table.black,
      })),
    );
  });
  return { tables: next, changed };
}

function findSessionSeat(tables: LobbyTable[], sessionId: string) {
  for (const table of tables) {
    if (table.white?.sessionId === sessionId) return { table, seat: "white" as const };
    if (table.black?.sessionId === sessionId) return { table, seat: "black" as const };
  }
  return null;
}

function tableStatus(table: LobbyTable) {
  const count = Number(Boolean(table.white)) + Number(Boolean(table.black));
  if (count === 2) return "full";
  if (count === 1) return "waiting";
  return "empty";
}

function getNextTableId(tables: LobbyTable[]) {
  if (tables.length === 0) return 1;
  return tables.reduce((max, table) => Math.max(max, table.id), 0) + 1;
}

function mergeSeatState(
  base: LobbySeatState | null,
  incoming: LobbySeatState | null,
  baseStateUpdatedAt: number,
  incomingStateUpdatedAt: number,
  preferBase: boolean,
) {
  if (base && !incoming) {
    if (incomingStateUpdatedAt - base.touchedAt > SEAT_STALE_MS) return null;
    return base;
  }
  if (!base && incoming) {
    if (baseStateUpdatedAt - incoming.touchedAt > SEAT_STALE_MS) return null;
    return incoming;
  }
  if (!base && !incoming) return null;
  if (!base || !incoming) return null;
  if (incoming.touchedAt === base.touchedAt) {
    return preferBase ? base : incoming;
  }
  return incoming.touchedAt > base.touchedAt ? incoming : base;
}

function mergeReadyStamp(base: number | null, incoming: number | null) {
  if (!base) return incoming;
  if (!incoming) return base;
  return incoming >= base ? incoming : base;
}

function mergeLobbyStates(local: LobbyState, remote: LobbyState): LobbyState {
  const preferRemote = remote.updatedAt >= local.updatedAt;
  const closedTableRooms = mergeClosedTableRooms(local.closedTableRooms, remote.closedTableRooms);
  const keyOf = (table: LobbyTable) => sanitizeRoomCode(table.roomCode) || `id-${table.id}`;
  const mergedTables = new Map<string, LobbyTable>();

  remote.tables.forEach((table) => {
    if (isTableSuppressedByCloseTombstone(table, closedTableRooms)) return;
    mergedTables.set(keyOf(table), table);
  });

  local.tables.forEach((table) => {
    const key = keyOf(table);
    const existing = mergedTables.get(key);
    if (!existing) {
      if (isTableSuppressedByCloseTombstone(table, closedTableRooms)) return;
      mergedTables.set(key, table);
      return;
    }
    const preferred = preferRemote ? existing : table;
    const fallback = preferRemote ? table : existing;
    const preferredPrivateChangedAt = normalizeNonNegativeInt(preferred.privateChangedAt, 0);
    const fallbackPrivateChangedAt = normalizeNonNegativeInt(fallback.privateChangedAt, 0);
    let mergedPrivateChangedAt = preferredPrivateChangedAt;
    let mergedIsPrivate = Boolean(preferred.isPrivate);
    if (fallbackPrivateChangedAt > preferredPrivateChangedAt) {
      mergedPrivateChangedAt = fallbackPrivateChangedAt;
      mergedIsPrivate = Boolean(fallback.isPrivate);
    } else if (fallbackPrivateChangedAt === preferredPrivateChangedAt && preferredPrivateChangedAt === 0) {
      mergedIsPrivate = Boolean(preferred.isPrivate || fallback.isPrivate);
    }

    const mergedTable: LobbyTable = {
      id: Math.min(existing.id, table.id),
      roomCode: sanitizeRoomCode(existing.roomCode) || sanitizeRoomCode(table.roomCode) || createRoomCode(),
      white: mergeSeatState(existing.white, table.white, remote.updatedAt, local.updatedAt, preferRemote),
      black: mergeSeatState(existing.black, table.black, remote.updatedAt, local.updatedAt, preferRemote),
      allowSpectatorChat: preferred.allowSpectatorChat !== false,
      ownerUserId: sanitizeGuestId(preferred.ownerUserId) || sanitizeGuestId(fallback.ownerUserId) || "",
      isPrivate: mergedIsPrivate,
      privateChangedAt: mergedPrivateChangedAt,
      invitedUserId: sanitizeGuestId(preferred.invitedUserId ?? "") || sanitizeGuestId(fallback.invitedUserId ?? "") || null,
      invitedByUserId: sanitizeGuestId(preferred.invitedByUserId ?? "") || sanitizeGuestId(fallback.invitedByUserId ?? "") || null,
      inviteNoticeId: sanitizeChatId(preferred.inviteNoticeId ?? "") || sanitizeChatId(fallback.inviteNoticeId ?? "") || null,
      inviteNoticeForUserId: sanitizeGuestId(preferred.inviteNoticeForUserId ?? "") || sanitizeGuestId(fallback.inviteNoticeForUserId ?? "") || null,
      inviteNoticeText: sanitizeChatText(preferred.inviteNoticeText ?? "") || sanitizeChatText(fallback.inviteNoticeText ?? "") || null,
      whiteReadyAt: mergeReadyStamp(existing.whiteReadyAt, table.whiteReadyAt),
      blackReadyAt: mergeReadyStamp(existing.blackReadyAt, table.blackReadyAt),
      startedAt: mergeReadyStamp(existing.startedAt, table.startedAt),
      setCount: normalizeTableSetCount(preferred.setCount ?? fallback.setCount, DEFAULT_TABLE_SET_COUNT),
      setPlayed: Math.max(normalizeNonNegativeInt(existing.setPlayed, 0), normalizeNonNegativeInt(table.setPlayed, 0)),
      setWhiteWins: Math.max(normalizeNonNegativeInt(existing.setWhiteWins, 0), normalizeNonNegativeInt(table.setWhiteWins, 0)),
      setBlackWins: Math.max(normalizeNonNegativeInt(existing.setBlackWins, 0), normalizeNonNegativeInt(table.setBlackWins, 0)),
      setResultTokens: normalizeSeriesTokenList([
        ...normalizeSeriesTokenList(existing.setResultTokens),
        ...normalizeSeriesTokenList(table.setResultTokens),
      ]),
      leavePermissionRequestByUserId:
        sanitizeGuestId(preferred.leavePermissionRequestByUserId ?? "")
        || sanitizeGuestId(fallback.leavePermissionRequestByUserId ?? "")
        || null,
      leavePermissionGrantedToUserId:
        sanitizeGuestId(preferred.leavePermissionGrantedToUserId ?? "")
        || sanitizeGuestId(fallback.leavePermissionGrantedToUserId ?? "")
        || null,
    };
    const normalizedMerged = normalizeTableAccess(normalizeTableStartGate(mergedTable));
    if (isTableSuppressedByCloseTombstone(normalizedMerged, closedTableRooms)) {
      mergedTables.delete(key);
      return;
    }
    mergedTables.set(key, normalizedMerged);
  });

  const guestLabels: Record<string, number> = { ...remote.guestLabels };
  Object.entries(local.guestLabels).forEach(([guestKey, guestNo]) => {
    const existing = guestLabels[guestKey];
    if (!existing || (Number.isInteger(guestNo) && guestNo > 0 && guestNo < existing)) {
      guestLabels[guestKey] = guestNo;
    }
  });
  const presenceBySession = new Map<string, LobbyPresenceState>();
  const upsertPresence = (row: LobbyPresenceState) => {
    const existing = presenceBySession.get(row.sessionId);
    if (!existing || row.touchedAt >= existing.touchedAt) {
      presenceBySession.set(row.sessionId, row);
    }
  };

  remote.presence.forEach((row) => upsertPresence(row));
  local.presence.forEach((row) => upsertPresence(row));
  Array.from(mergedTables.values()).forEach((table) => {
    if (table.white) upsertPresence(presenceFromSeat(table.white));
    if (table.black) upsertPresence(presenceFromSeat(table.black));
  });

  const mergedLobbyChat = mergeChatLogs(local.lobbyChat, remote.lobbyChat, LOBBY_CHAT_LIMIT);
  const mergedTableChats: Record<string, ChatMessage[]> = {};
  const tableChatKeys = new Set<string>();
  Object.keys(local.tableChats).forEach((key) => tableChatKeys.add(sanitizeTableChatKey(key)));
  Object.keys(remote.tableChats).forEach((key) => tableChatKeys.add(sanitizeTableChatKey(key)));
  Array.from(mergedTables.values()).forEach((table) => tableChatKeys.add(tableChatKey(table)));
  tableChatKeys.forEach((key) => {
    if (!key) return;
    const mergedLog = mergeChatLogs(local.tableChats[key] ?? [], remote.tableChats[key] ?? [], TABLE_CHAT_LIMIT);
    if (mergedLog.length > 0) {
      mergedTableChats[key] = mergedLog;
    }
  });

  return normalizeLobbyState({
    lobbyName: sanitizeLobbyName(remote.lobbyName || local.lobbyName),
    tables: Array.from(mergedTables.values()),
    presence: Array.from(presenceBySession.values()),
    lobbyChat: mergedLobbyChat,
    tableChats: mergedTableChats,
    closedTableRooms,
    guestCounter: Math.max(remote.guestCounter, local.guestCounter),
    guestLabels,
    updatedAt: Math.max(remote.updatedAt, local.updatedAt),
  });
}

function sameLobbySnapshot(a: LobbyState | null | undefined, b: LobbyState | null | undefined) {
  if (!a || !b) return false;
  if (a === b) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

function alignActivityTimestamp(value: number, serverAt: number, windowMs: number) {
  const safeServerAt = Number.isFinite(serverAt) ? Number(serverAt) : Date.now();
  if (!Number.isFinite(value)) return safeServerAt;
  const raw = Number(value);
  const min = safeServerAt - windowMs;
  const max = safeServerAt + HEARTBEAT_MS;
  if (raw < min) return safeServerAt;
  if (raw > max) return max;
  return raw;
}

function alignSnapshotActivityToServerTime(snapshot: LobbyState, serverAt: number): LobbyState {
  const tables = snapshot.tables.map((table) => {
    const white = table.white
      ? { ...table.white, touchedAt: alignActivityTimestamp(table.white.touchedAt, serverAt, SEAT_STALE_MS) }
      : null;
    const black = table.black
      ? { ...table.black, touchedAt: alignActivityTimestamp(table.black.touchedAt, serverAt, SEAT_STALE_MS) }
      : null;
    if (white === table.white && black === table.black) return table;
    return { ...table, white, black };
  });
  const presence = snapshot.presence.map((row) => ({
    ...row,
    touchedAt: alignActivityTimestamp(row.touchedAt, serverAt, PRESENCE_STALE_MS),
  }));
  return {
    ...snapshot,
    tables,
    presence,
    updatedAt: Math.max(snapshot.updatedAt, serverAt),
  };
}

function AvatarBadge(props: {
  avatarId: AvatarId;
  gender: MemberGender;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const size = props.size ?? "md";
  const avatarId = sanitizeAvatarId(props.avatarId, props.gender);
  const className = props.className ? ` ${props.className}` : "";
  return (
    <span className={`my-avatar my-avatar-${size}${className}`} aria-hidden="true">
      <img className="my-avatar-img" src={avatarAssetPath(avatarId)} alt="" loading="lazy" />
    </span>
  );
}

function App() {
  const [initialRoom] = useState<RoomSession | null>(() => getInitialRoomSession());
  const [mode, setMode] = useState<GameMode>("local");
  const [iframeKey, setIframeKey] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>(initialRoom ? "table" : "lobby");
  const [guestName, setGuestName] = useState(getInitialGuestName);
  const [guestProfile, setGuestProfile] = useState<GuestProfile>(() => {
    const guestId = getOrCreateGuestId();
    return loadGuestProfile(guestId, getInitialGuestName());
  });
  const [roomSession, setRoomSession] = useState<RoomSession | null>(initialRoom);
  const [joinCodeInput, setJoinCodeInput] = useState(() => initialRoom?.code ?? "");
  const [joinSeat, setJoinSeat] = useState<Seat>(() => initialRoom?.seat ?? "black");
  const [copied, setCopied] = useState(false);
  const [lobbyNotice, setLobbyNotice] = useState("");
  const [invitePickerTableId, setInvitePickerTableId] = useState<number | null>(null);
  const [lobbyState, setLobbyState] = useState<LobbyState>(() => {
    const loaded = loadLobbyState();
    const roomName = sanitizeLobbyName(initialRoom?.roomName ?? DEFAULT_LOBBY_NAME);
    if (loaded.lobbyName === roomName) return loaded;
    const merged = { ...loaded, lobbyName: roomName, updatedAt: Date.now() };
    saveJson(LOBBY_STATE_KEY, merged);
    return merged;
  });

  const [member, setMember] = useState<MemberUser | null>(null);
  const [gameRules, setGameRules] = useState<GameRules>(() => createDefaultGameRules());
  const [adminUsers, setAdminUsers] = useState<MemberUser[]>([]);
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminNotice, setAdminNotice] = useState("");
  const [ruleDraft, setRuleDraft] = useState<GameRules>(() => createDefaultGameRules());
  const [authMode, setAuthMode] = useState<AuthMode>("register");
  const [authUsername, setAuthUsername] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authGender, setAuthGender] = useState<MemberGender>("unknown");
  const [authAvatarId, setAuthAvatarId] = useState<AvatarId>(DEFAULT_AVATAR_BY_GENDER.unknown);
  const [authPassword, setAuthPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [memberPasswordCurrent, setMemberPasswordCurrent] = useState("");
  const [memberPasswordNext, setMemberPasswordNext] = useState("");
  const [memberAvatarDraft, setMemberAvatarDraft] = useState<AvatarId>(DEFAULT_AVATAR_BY_GENDER.unknown);
  const [memberActionBusy, setMemberActionBusy] = useState(false);
  const [memberNotice, setMemberNotice] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [showAdminPanelInLobby, setShowAdminPanelInLobby] = useState(false);
  const [profileModal, setProfileModal] = useState<PlayerProfileModalState>({
    open: false,
    loading: false,
    isMember: false,
    name: "",
    gender: "unknown",
    avatarId: DEFAULT_AVATAR_BY_GENDER.unknown,
    points: 0,
    stats: createEmptyStats(),
  });
  const [matchLiveState, setMatchLiveState] = useState({
    matchToken: "",
    matchActive: false,
    winner: null as Seat | null,
    localColor: null as Seat | null,
  });
  const [lobbyChatInput, setLobbyChatInput] = useState("");
  const [lobbyChatAutoScroll, setLobbyChatAutoScroll] = useState(true);
  const [lobbyChatUnread, setLobbyChatUnread] = useState(0);
  const [lobbyChatJoinedAt] = useState(() => Date.now());
  const [roomChatTab, setRoomChatTab] = useState<"table" | "lobby">("table");
  const [roomTableChatInput, setRoomTableChatInput] = useState("");
  const [roomLobbyChatInput, setRoomLobbyChatInput] = useState("");
  const [roomChatAutoScroll, setRoomChatAutoScroll] = useState(true);
  const [roomChatUnread, setRoomChatUnread] = useState(0);
  const [adminQuery, setAdminQuery] = useState("");
  const [adminRoleFilter, setAdminRoleFilter] = useState<AdminRoleFilter>("all");
  const [adminSort, setAdminSort] = useState<AdminSortKey>("points");
  const [adminPointDrafts, setAdminPointDrafts] = useState<Record<string, string>>({});
  const [adminDeltaDrafts, setAdminDeltaDrafts] = useState<Record<string, string>>({});
  const [syncHealthNow, setSyncHealthNow] = useState(() => Date.now());
  const [realtimeSocketReadyState, setRealtimeSocketReadyState] = useState<number>(
    typeof WebSocket === "undefined" ? 3 : WebSocket.CLOSED,
  );
  const [syncHealth, setSyncHealth] = useState({
    lastIncomingAt: 0,
    lastIncomingServerAt: 0,
    lastIncomingSender: "",
    lastIncomingCounter: 0,
    lastHttpPushAt: 0,
    lastHttpPushReason: "",
    lastHttpPullAt: 0,
    lastHttpPullReason: "",
    lastWsOpenAt: 0,
    lastWsMessageAt: 0,
    lastWsSendAt: 0,
    lastWsSendReason: "",
    lastError: "",
  });

  const lobbyChannelRef = useRef<BroadcastChannel | null>(null);
  const realtimeSocketRef = useRef<WebSocket | null>(null);
  const realtimeReconnectTimerRef = useRef<number | null>(null);
  const realtimeSenderCountersRef = useRef<Map<string, number>>(new Map());
  const realtimeSyncCounterRef = useRef(0);
  const realtimeRemoteStateRef = useRef<LobbyState | null>(null);
  const realtimeReceivedSnapshotRef = useRef(false);
  const realtimePendingSnapshotRef = useRef<LobbyState | null>(null);
  const realtimeHttpSyncInFlightRef = useRef(false);
  const realtimeHttpPullInFlightRef = useRef(false);
  const realtimeLastPullAtRef = useRef(0);
  const realtimeLastPushAtRef = useRef(0);
  const appSessionId = useMemo(() => createSessionId(), []);
  const guestId = useMemo(() => getOrCreateGuestId(), []);
  const [realtimeStatus, setRealtimeStatus] = useState<"offline" | "connecting" | "online">("offline");
  const processedMatchTokensRef = useRef<Set<string>>(new Set());
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lobbyChatListRef = useRef<HTMLDivElement | null>(null);
  const lobbyPrevChatCountRef = useRef(0);
  const roomChatListRef = useRef<HTMLDivElement | null>(null);
  const roomPrevChatCountRef = useRef(0);
  const opponentIdleWatchRef = useRef<{
    matchToken: string;
    activityTick: number;
    turn: Seat;
    deadlineAt: number;
  } | null>(null);
  const opponentIdlePromptRef = useRef(false);
  const leavePermissionPromptKeyRef = useRef("");
  const leavePermissionAutoLeavingRef = useRef(false);
  const roomMissingSinceRef = useRef<number | null>(null);
  const latestLegacyStateRef = useRef<{
    matchToken: string;
    matchActive: boolean;
    winner: Seat | null;
    localColor: Seat | null;
    turn: Seat | null;
    activityTick: number;
  }>({
    matchToken: "",
    matchActive: false,
    winner: null,
    localColor: null,
    turn: null,
    activityTick: 0,
  });
  const timeoutWinWaiverRef = useRef<{
    tableCode: string;
    matchToken: string;
    userId: string;
  } | null>(null);

  const safeGuestName = useMemo(() => {
    const memberName = member ? sanitizeGuestName(member.displayName) : "";
    if (memberName) return memberName;
    return sanitizeGuestName(guestName) || "Misafir";
  }, [guestName, member]);

  const currentProfile = useMemo(() => {
    const fallbackUsername = fallbackUsernameFromName(safeGuestName);
    const gender = member?.gender ?? guestProfile.gender;
    return {
      userId: member ? member.id : guestProfile.userId,
      username: member?.username ?? fallbackUsername,
      displayName: safeGuestName,
      gender,
      avatarId: sanitizeAvatarId(member?.avatarId ?? guestProfile.avatarId, gender),
      points: member?.points ?? guestProfile.points,
      stats: member?.stats ?? guestProfile.stats,
      isMember: Boolean(member),
    };
  }, [member, safeGuestName, guestProfile.userId, guestProfile.gender, guestProfile.avatarId, guestProfile.points, guestProfile.stats]);

  const isRoomMode = Boolean(roomSession);

  const iframeUrl = useMemo(() => {
    const qp = new URLSearchParams();
    qp.set("mode", isRoomMode ? "local" : mode);
    qp.set("t", String(iframeKey));
    qp.set("guest", safeGuestName);
    qp.set("sync_ws", REALTIME_WS_BASE_URL);
    qp.set("member", member ? "1" : "0");
    if (roomSession) {
      qp.set("room", roomSession.code);
      qp.set("seat", roomSession.seat);
      qp.set("session", roomSession.sessionId);
      qp.set("room_name", roomSession.roomName);
      qp.set("table", String(roomSession.tableNo));
      qp.set("observer", roomSession.role === "spectator" ? "1" : "0");
    }
    return `/legacy/index.html?${qp.toString()}`;
  }, [mode, iframeKey, roomSession, safeGuestName, isRoomMode, member]);

  const openedTables = useMemo(() => {
    return sortTables(lobbyState.tables).filter((table) => Boolean(table.white || table.black));
  }, [lobbyState.tables]);

  const myCurrentSeat = useMemo(() => findSessionSeat(lobbyState.tables, appSessionId), [lobbyState.tables, appSessionId]);

  const onlineRows = useMemo<OnlineRow[]>(() => {
    const tableBySession = new Map<string, number>();
    const tableByUser = new Map<string, number>();
    openedTables.forEach((table) => {
      [table.white, table.black].forEach((seatInfo) => {
        if (!seatInfo) return;
        tableBySession.set(seatInfo.sessionId, table.id);
        if (seatInfo.userId) {
          tableByUser.set(seatInfo.userId, table.id);
        }
      });
    });

    const map = new Map<string, LobbyPresenceState>();
    const upsertPresence = (row: LobbyPresenceState) => {
      const key = row.userId || `session:${row.sessionId}`;
      const existing = map.get(key);
      if (!existing || row.touchedAt >= existing.touchedAt) {
        map.set(key, row);
      }
    };

    lobbyState.presence.forEach((presence) => {
      upsertPresence(presence);
    });
    openedTables.forEach((table) => {
      [table.white, table.black].forEach((seatInfo) => {
        if (!seatInfo) return;
        upsertPresence(presenceFromSeat(seatInfo));
      });
    });

    map.set(`session:${appSessionId}`, {
      sessionId: appSessionId,
      userId: currentProfile.userId,
      username: currentProfile.username,
      displayName: safeGuestName,
      gender: currentProfile.gender,
      avatarId: currentProfile.avatarId,
      points: currentProfile.points,
      stats: normalizeStats(currentProfile.stats),
      touchedAt: Date.now(),
    });

    return Array.from(map.values())
      .map((row) => ({
        key: row.userId || row.sessionId,
        userId: row.userId,
        sessionId: row.sessionId,
        username: row.username,
        gender: row.gender,
        avatarId: sanitizeAvatarId(row.avatarId, row.gender),
        name: row.displayName,
        points: row.points,
        stats: normalizeStats(row.stats),
        tableNo: tableByUser.get(row.userId) ?? tableBySession.get(row.sessionId) ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "tr", { sensitivity: "base" }));
  }, [openedTables, lobbyState.presence, appSessionId, safeGuestName, currentProfile.userId, currentProfile.username, currentProfile.gender, currentProfile.avatarId, currentProfile.points, currentProfile.stats]);

  const currentRoomTable = useMemo(() => {
    if (!roomSession) return null;
    return lobbyState.tables.find((table) => table.id === roomSession.tableNo || table.roomCode === roomSession.code) ?? null;
  }, [lobbyState.tables, roomSession]);

  const roomStartState = useMemo(() => {
    if (!roomSession || !currentRoomTable) return null;
    if (roomSession.role !== "player") return null;
    const mine = roomSession.seat === "white" ? currentRoomTable.white : currentRoomTable.black;
    const opponent = roomSession.seat === "white" ? currentRoomTable.black : currentRoomTable.white;
    const mineReady = roomSession.seat === "white" ? Boolean(currentRoomTable.whiteReadyAt) : Boolean(currentRoomTable.blackReadyAt);
    const opponentReady = roomSession.seat === "white" ? Boolean(currentRoomTable.blackReadyAt) : Boolean(currentRoomTable.whiteReadyAt);
    const bothSeated = Boolean(currentRoomTable.white && currentRoomTable.black);
    const started = Boolean(bothSeated && (currentRoomTable.startedAt || (currentRoomTable.whiteReadyAt && currentRoomTable.blackReadyAt)));

    return {
      mine,
      opponent,
      mineReady,
      opponentReady,
      bothSeated,
      started,
      readyCount: Number(Boolean(currentRoomTable.whiteReadyAt)) + Number(Boolean(currentRoomTable.blackReadyAt)),
    };
  }, [roomSession, currentRoomTable]);

  const currentRoomIsOwner = useMemo(
    () => isTableOwnerForUser(currentRoomTable, currentProfile.userId),
    [currentRoomTable, currentProfile.userId],
  );

  const invitePickerTable = useMemo(() => {
    if (!invitePickerTableId) return null;
    return lobbyState.tables.find((table) => table.id === invitePickerTableId) ?? null;
  }, [lobbyState.tables, invitePickerTableId]);

  const inviteCandidates = useMemo(() => {
    if (!invitePickerTable) return [];
    const seatedUserIds = new Set<string>();
    if (invitePickerTable.white?.userId) seatedUserIds.add(invitePickerTable.white.userId);
    if (invitePickerTable.black?.userId) seatedUserIds.add(invitePickerTable.black.userId);
    return onlineRows.filter((row) => {
      if (row.tableNo !== null) return false;
      if (row.userId === currentProfile.userId) return false;
      if (seatedUserIds.has(row.userId)) return false;
      return true;
    });
  }, [invitePickerTable, onlineRows, currentProfile.userId]);

  const incomingInviteTable = useMemo(() => {
    if (!currentProfile.userId) return null;
    if (myCurrentSeat) return null;
    return sortTables(lobbyState.tables).find((table) => table.invitedUserId === currentProfile.userId) ?? null;
  }, [lobbyState.tables, currentProfile.userId, myCurrentSeat]);

  const canCopyInviteLink = useMemo(() => {
    if (!roomSession || !currentRoomTable || !currentRoomIsOwner) return false;
    if (roomSession.role !== "player") return false;
    if (roomStartState?.started) return false;
    if (matchLiveState.matchActive) return false;
    return true;
  }, [roomSession, currentRoomTable, currentRoomIsOwner, roomStartState?.started, matchLiveState.matchActive]);

  const canEditCurrentRoomSetCount = useMemo(() => {
    if (!roomSession || roomSession.role !== "player") return false;
    if (!currentRoomTable || !currentRoomIsOwner) return false;
    if (matchLiveState.matchActive) return false;
    return !currentRoomTable.startedAt && currentRoomTable.setPlayed === 0;
  }, [roomSession, currentRoomTable, currentRoomIsOwner, matchLiveState.matchActive]);

  const leavePermissionState = useMemo(() => {
    if (!roomSession || roomSession.role !== "player" || !currentRoomTable) {
      return {
        flowActive: false,
        hasOpponent: false,
        myRequestPending: false,
        opponentRequestPending: false,
        grantedToMe: false,
        grantedToOpponent: false,
        canRequest: false,
        canApprove: false,
      };
    }
    const mySeat = roomSession.seat === "white" ? currentRoomTable.white : currentRoomTable.black;
    const opponentSeat = roomSession.seat === "white" ? currentRoomTable.black : currentRoomTable.white;
    const myUserId = sanitizeGuestId(currentProfile.userId);
    const opponentUserId = sanitizeGuestId(opponentSeat?.userId ?? "");
    const requestByUserId = sanitizeGuestId(currentRoomTable.leavePermissionRequestByUserId ?? "");
    const grantedToUserId = sanitizeGuestId(currentRoomTable.leavePermissionGrantedToUserId ?? "");

    const hasOpponent = Boolean(opponentSeat && opponentUserId);
    const seriesStarted = Boolean(currentRoomTable.startedAt || currentRoomTable.setPlayed > 0 || matchLiveState.matchActive);
    const seriesComplete = isTableSeriesComplete(currentRoomTable);
    const flowActive = Boolean(mySeat && hasOpponent && seriesStarted && !seriesComplete);

    const myRequestPending = Boolean(flowActive && myUserId && requestByUserId === myUserId && grantedToUserId !== myUserId);
    const opponentRequestPending = Boolean(
      flowActive && opponentUserId && requestByUserId === opponentUserId && grantedToUserId !== opponentUserId,
    );
    const grantedToMe = Boolean(flowActive && myUserId && grantedToUserId === myUserId);
    const grantedToOpponent = Boolean(flowActive && opponentUserId && grantedToUserId === opponentUserId);
    const canRequest = Boolean(flowActive && !myRequestPending && !opponentRequestPending && !grantedToMe);
    const canApprove = Boolean(flowActive && opponentRequestPending && !grantedToOpponent);

    return {
      flowActive,
      hasOpponent,
      myRequestPending,
      opponentRequestPending,
      grantedToMe,
      grantedToOpponent,
      canRequest,
      canApprove,
    };
  }, [roomSession, currentRoomTable, currentProfile.userId, matchLiveState.matchActive]);

  const currentRoomHasOpenSeat = useMemo(() => Boolean(currentRoomTable && getOpenSeat(currentRoomTable)), [currentRoomTable]);

  const lobbyChatRows = useMemo(() => {
    return normalizeChatLog(lobbyState.lobbyChat, LOBBY_CHAT_LIMIT).filter((row) => row.at >= lobbyChatJoinedAt);
  }, [lobbyState.lobbyChat, lobbyChatJoinedAt]);

  const tableChatRows = useMemo(() => {
    if (!currentRoomTable) return [];
    const key = tableChatKey(currentRoomTable);
    const rows = normalizeChatLog(lobbyState.tableChats[key] ?? [], TABLE_CHAT_LIMIT);
    if (!roomSession || roomSession.role !== "spectator") return rows;
    return rows.filter((row) => row.at >= roomSession.joinedAt);
  }, [currentRoomTable, lobbyState.tableChats, roomSession]);

  const canViewTableChat = useMemo(() => {
    if (!roomSession || !currentRoomTable) return false;
    if (roomSession.role === "spectator") return true;
    const mySeat = roomSession.seat === "white" ? currentRoomTable.white : currentRoomTable.black;
    return Boolean(mySeat && mySeat.sessionId === appSessionId);
  }, [roomSession, currentRoomTable, appSessionId]);

  const canWriteLobbyChat = Boolean(member);
  const canWriteTableChat = useMemo(() => {
    if (!roomSession || !canViewTableChat || mode !== "local") return false;
    if (roomSession.role === "spectator") {
      return currentRoomTable?.allowSpectatorChat !== false;
    }
    return Boolean(member);
  }, [roomSession, canViewTableChat, mode, currentRoomTable, member]);
  const roomChatRows = useMemo(() => (roomChatTab === "table" ? tableChatRows : lobbyChatRows), [roomChatTab, tableChatRows, lobbyChatRows]);
  const canWriteRoomChat = roomChatTab === "table" ? canWriteTableChat : canWriteLobbyChat;
  const roomChatInput = roomChatTab === "table" ? roomTableChatInput : roomLobbyChatInput;
  const roomChatDraft = sanitizeChatText(roomChatInput);
  const roomScoreRows = useMemo(() => {
    if (!currentRoomTable) return [];
    return ([
      { seat: "white" as Seat, seatLabel: "Beyaz", info: currentRoomTable.white },
      { seat: "black" as Seat, seatLabel: "Siyah", info: currentRoomTable.black },
    ])
      .filter((row): row is { seat: Seat; seatLabel: string; info: LobbySeatState } => Boolean(row.info))
      .map((row) => ({
        seat: row.seat,
        seatLabel: row.seatLabel,
        userId: row.info.userId,
        username: row.info.username,
        name: row.info.displayName,
        points: row.info.points,
        stats: row.info.stats,
        gender: row.info.gender,
        avatarId: row.info.avatarId,
        mine: roomSession?.role === "player" && roomSession.seat === row.seat,
      }));
  }, [currentRoomTable, roomSession]);
  const roomStartHint = useMemo(() => {
    if (!roomStartState) return "";
    if (roomStartState.started) return "Oyun basladi.";
    if (!roomStartState.bothSeated) return "Ikinci oyuncu bekleniyor.";
    if (roomStartState.mineReady && roomStartState.opponentReady) return "Iki oyuncu da hazir. Oyunu baslatabilirsin.";
    if (roomStartState.mineReady) return "Rakibin Oyuna Basla butonuna basmasi bekleniyor.";
    if (roomStartState.opponentReady) return "Rakip hazir. Oyuna Basla butonuna bas.";
    return "Oyuncularin 'Baslat' dugmesine basmalari bekleniyor...";
  }, [roomStartState]);
  const roomWhiteSeat = currentRoomTable?.white ?? null;
  const roomBlackSeat = currentRoomTable?.black ?? null;
  const isAdmin = member?.role === "admin";
  const lobbyDraft = sanitizeChatText(lobbyChatInput);
  const adminSummary = useMemo(() => {
    const users = adminUsers;
    const totalUsers = users.length;
    const adminCount = users.filter((user) => user.role === "admin").length;
    const totalGames = users.reduce((sum, user) => sum + normalizeStats(user.stats).gamesPlayed, 0);
    const totalPoints = users.reduce((sum, user) => sum + Math.max(0, user.points), 0);
    const averagePoints = totalUsers > 0 ? Math.round(totalPoints / totalUsers) : 0;
    return { totalUsers, adminCount, totalGames, averagePoints };
  }, [adminUsers]);
  const visibleAdminUsers = useMemo(() => {
    const query = adminQuery.trim().toLocaleLowerCase("tr");
    const filtered = adminUsers.filter((user) => {
      if (adminRoleFilter !== "all" && user.role !== adminRoleFilter) return false;
      if (!query) return true;
      const haystack = `${user.displayName} ${user.email} ${user.id}`.toLocaleLowerCase("tr");
      return haystack.includes(query);
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (adminSort === "name") {
        return a.displayName.localeCompare(b.displayName, "tr", { sensitivity: "base" });
      }
      if (adminSort === "points") return b.points - a.points;
      if (adminSort === "games") return b.stats.gamesPlayed - a.stats.gamesPlayed;
      if (adminSort === "wins") return b.stats.wins - a.stats.wins;
      if (adminSort === "losses") return b.stats.losses - a.stats.losses;
      if (adminSort === "resigns") return b.stats.resigns - a.stats.resigns;
      return b.createdAt - a.createdAt;
    });
    return sorted;
  }, [adminUsers, adminQuery, adminRoleFilter, adminSort]);

  function clearOpponentIdleWatch() {
    opponentIdleWatchRef.current = null;
    opponentIdlePromptRef.current = false;
  }

  function broadcastLobbySync() {
    lobbyChannelRef.current?.postMessage({ type: "lobby-sync", at: Date.now() });
  }

  function readRealtimeLobbyState() {
    return realtimeRemoteStateRef.current;
  }

  function applyIncomingRealtimeSnapshot(message: RealtimeMessage) {
    if (message.kind !== "snapshot") return false;
    if (message.channel !== REALTIME_LOBBY_CHANNEL) return false;
    if (!message.sender || !Number.isFinite(message.counter)) return false;
    const counter = Number(message.counter);
    const previousCounter = realtimeSenderCountersRef.current.get(message.sender) ?? 0;
    if (counter <= previousCounter) return false;
    realtimeSenderCountersRef.current.set(message.sender, counter);

    const incoming = alignSnapshotActivityToServerTime(
      normalizeLobbyState(message.payload),
      Number.isFinite(message.at) ? Number(message.at) : Date.now(),
    );
    const now = Date.now();
    realtimeRemoteStateRef.current = incoming;
    realtimeReceivedSnapshotRef.current = true;
    saveJson(LOBBY_STATE_KEY, incoming);
    setLobbyState(incoming);
    setSyncHealth((prev) => ({
      ...prev,
      lastIncomingAt: now,
      lastIncomingServerAt: Number.isFinite(message.at) ? Number(message.at) : 0,
      lastIncomingSender: message.sender,
      lastIncomingCounter: counter,
      lastError: "",
    }));
    return true;
  }

  function sendRealtimeSnapshot(payload: LobbyState, reason: string) {
    const socket = realtimeSocketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    realtimeSyncCounterRef.current += 1;
    const message: RealtimeMessage = {
      kind: "snapshot",
      channel: REALTIME_LOBBY_CHANNEL,
      sender: appSessionId,
      counter: realtimeSyncCounterRef.current,
      at: Date.now(),
      payload,
      reason,
    };
    try {
      socket.send(JSON.stringify(message));
      const now = Date.now();
      setSyncHealth((prev) => ({
        ...prev,
        lastWsSendAt: now,
        lastWsSendReason: reason,
      }));
      return true;
    } catch {
      setSyncHealth((prev) => ({
        ...prev,
        lastError: "ws gönderimi basarisiz",
      }));
      return false;
    }
  }

  async function syncRealtimeViaHttp(reason: string) {
    if (realtimeHttpSyncInFlightRef.current) return;
    realtimeHttpSyncInFlightRef.current = true;
    let shouldDrainQueue = false;
    try {
      const pendingAtStart = realtimePendingSnapshotRef.current;
      const payload = pendingAtStart ?? getCurrentLobbyState();
      realtimeSyncCounterRef.current += 1;
      const outgoing: RealtimeMessage = {
        kind: "snapshot",
        channel: REALTIME_LOBBY_CHANNEL,
        sender: appSessionId,
        counter: realtimeSyncCounterRef.current,
        at: Date.now(),
        payload,
        reason,
      };
      const response = await fetch(buildRealtimeHttpSyncUrl(REALTIME_LOBBY_CHANNEL, appSessionId), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(outgoing),
      });
      if (!response.ok) {
        setSyncHealth((prev) => ({ ...prev, lastError: `http push hata (${response.status})` }));
        setRealtimeStatus("offline");
        return;
      }
      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      if (!contentType.includes("application/json")) {
        setSyncHealth((prev) => ({ ...prev, lastError: "http push json degil" }));
        setRealtimeStatus("offline");
        return;
      }
      const data = (await response.json().catch(() => null)) as { snapshot?: unknown } | null;
      const incoming = normalizeRealtimeMessage(data?.snapshot);
      if (!incoming || incoming.kind !== "snapshot" || incoming.channel !== REALTIME_LOBBY_CHANNEL) {
        setSyncHealth((prev) => ({ ...prev, lastError: "http push snapshot gecersiz" }));
        setRealtimeStatus("offline");
        return;
      }
      const now = Date.now();
      realtimeLastPushAtRef.current = now;
      setSyncHealth((prev) => ({
        ...prev,
        lastHttpPushAt: now,
        lastHttpPushReason: reason,
        lastError: "",
      }));
      const latestPending = realtimePendingSnapshotRef.current;
      if (!latestPending || sameLobbySnapshot(latestPending, payload)) {
        realtimePendingSnapshotRef.current = null;
      } else {
        shouldDrainQueue = true;
      }
      applyIncomingRealtimeSnapshot(incoming);
      setRealtimeStatus("online");
    } catch {
      setRealtimeStatus("offline");
    } finally {
      realtimeHttpSyncInFlightRef.current = false;
      if (shouldDrainQueue && realtimePendingSnapshotRef.current) {
        window.setTimeout(() => {
          void syncRealtimeViaHttp("lobby-update-drain");
        }, 0);
      }
    }
  }

  async function pullRealtimeViaHttp(reason: string) {
    void reason;
    if (realtimeHttpPullInFlightRef.current) return;
    realtimeHttpPullInFlightRef.current = true;
    try {
      const response = await fetch(buildRealtimeHttpSyncUrl(REALTIME_LOBBY_CHANNEL, appSessionId), {
        method: "GET",
        headers: { "cache-control": "no-store" },
      });
      if (!response.ok) {
        setSyncHealth((prev) => ({ ...prev, lastError: `http pull hata (${response.status})` }));
        setRealtimeStatus("offline");
        return;
      }
      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      if (!contentType.includes("application/json")) {
        setSyncHealth((prev) => ({ ...prev, lastError: "http pull json degil" }));
        setRealtimeStatus("offline");
        return;
      }
      const data = (await response.json().catch(() => null)) as { snapshot?: unknown } | null;
      const incoming = normalizeRealtimeMessage(data?.snapshot);
      if (incoming && incoming.kind === "snapshot" && incoming.channel === REALTIME_LOBBY_CHANNEL) {
        applyIncomingRealtimeSnapshot(incoming);
      }
      const now = Date.now();
      realtimeLastPullAtRef.current = now;
      setSyncHealth((prev) => ({
        ...prev,
        lastHttpPullAt: now,
        lastHttpPullReason: reason,
        lastError: "",
      }));
      if (realtimeStatus !== "online") {
        setRealtimeStatus("online");
      }
    } catch {
      setRealtimeStatus("offline");
    } finally {
      realtimeHttpPullInFlightRef.current = false;
    }
  }

  function getCurrentLobbyState() {
    return readRealtimeLobbyState() ?? loadLobbyState();
  }

  function persistLobbyState(next: LobbyState) {
    const normalized = normalizeLobbyState(next);
    realtimeRemoteStateRef.current = normalized;
    realtimeReceivedSnapshotRef.current = true;
    realtimePendingSnapshotRef.current = normalized;
    saveJson(LOBBY_STATE_KEY, normalized);
    setLobbyState(normalized);
    const sent = sendRealtimeSnapshot(normalized, "lobby-update");
    void syncRealtimeViaHttp(sent ? "lobby-update-mirror" : "lobby-update-fallback");
    broadcastLobbySync();
  }

  function refreshLobbyFromStorage() {
    setLobbyState(getCurrentLobbyState());
  }

  function writeLobby(mutator: (current: LobbyState) => LobbyState | null) {
    const current = getCurrentLobbyState();
    const next = mutator(current);
    if (!next) {
      setLobbyState(current);
      return null;
    }
    const normalized = normalizeLobbyState(next);
    if (JSON.stringify(normalized) === JSON.stringify(current)) {
      setLobbyState(current);
      return current;
    }
    persistLobbyState(normalized);
    return normalized;
  }

  function createOutgoingChatMessage(text: string): ChatMessage | null {
    const clean = sanitizeChatText(text);
    if (!clean) return null;
    const userId = sanitizeGuestId(currentProfile.userId);
    if (!userId) return null;
    return {
      id: createChatMessageId(`${userId}-${appSessionId}`),
      at: Date.now(),
      userId,
      displayName: sanitizeGuestName(currentProfile.displayName) || "Oyuncu",
      text: clean,
    };
  }

  function sendLobbyChat(rawText: string) {
    if (!member) {
      setLobbyNotice("Lobi sohbetine yazmak icin uye girisi yapmalisin.");
      return;
    }
    const message = createOutgoingChatMessage(rawText);
    if (!message) return;
    writeLobby((current) => ({
      ...current,
      lobbyChat: appendChatMessage(current.lobbyChat, message, LOBBY_CHAT_LIMIT),
      updatedAt: Date.now(),
    }));
    setLobbyChatInput("");
  }

  function sendTableChat(rawText: string) {
    if (!roomSession) return;
    if (roomSession.role === "player" && !member) {
      setLobbyNotice("Masa sohbeti sadece uye oyuncular icin acik.");
      return;
    }
    const message = createOutgoingChatMessage(rawText);
    if (!message) return;

    let blocked = false;
    let spectatorChatBlocked = false;
    let tableMissing = false;
    writeLobby((current) => {
      const cleanedTables = cleanupStaleAndPrune(current.tables).tables;
      const index = cleanedTables.findIndex((table) => table.id === roomSession.tableNo || table.roomCode === roomSession.code);
      if (index < 0) {
        tableMissing = true;
        return current;
      }
      const table = cleanedTables[index];
      if (roomSession.role === "player") {
        const mySeat = roomSession.seat === "white" ? table.white : table.black;
        if (!mySeat || mySeat.sessionId !== appSessionId) {
          blocked = true;
          return current;
        }
      } else if (table.allowSpectatorChat === false) {
        spectatorChatBlocked = true;
        return current;
      }
      const key = tableChatKey(table);
      const nextTableChats = {
        ...current.tableChats,
        [key]: appendChatMessage(current.tableChats[key] ?? [], message, TABLE_CHAT_LIMIT),
      };
      return {
        ...current,
        tableChats: nextTableChats,
        updatedAt: Date.now(),
      };
    });

    if (tableMissing) {
      setLobbyNotice("Masa bulunamadi, sohbet gonderilemedi.");
      return;
    }
    if (blocked) {
      setLobbyNotice("Masa sohbetini sadece masadaki oyuncular gonderebilir.");
      return;
    }
    if (spectatorChatBlocked) {
      setLobbyNotice("Masa sahibi izleyici sohbetini kapatmis.");
      return;
    }
  }

  function forceReloadBoard() {
    setIframeKey((v) => v + 1);
  }

  function syncLobbyPresence(force = false) {
    writeLobby((current) => {
      const now = Date.now();
      const cleanedPresence = cleanupPresenceRows(current.presence);
      const myPresence: LobbyPresenceState = {
        sessionId: appSessionId,
        userId: currentProfile.userId,
        username: currentProfile.username,
        displayName: currentProfile.displayName,
        gender: currentProfile.gender,
        avatarId: currentProfile.avatarId,
        points: currentProfile.points,
        stats: normalizeStats(currentProfile.stats),
        touchedAt: now,
      };

      const existing = cleanedPresence.presence.find((entry) => entry.sessionId === appSessionId) ?? null;
      const changedProfile = !existing
        || existing.username !== myPresence.username
        || existing.displayName !== myPresence.displayName
        || existing.gender !== myPresence.gender
        || existing.avatarId !== myPresence.avatarId
        || existing.points !== myPresence.points
        || !sameStats(existing.stats, myPresence.stats);

      const staleHeartbeat = !existing || now - existing.touchedAt > HEARTBEAT_MS;
      if (!force && !cleanedPresence.changed && !changedProfile && !staleHeartbeat) {
        return current;
      }

      const withoutMine = cleanedPresence.presence.filter((entry) => entry.sessionId !== appSessionId);
      return {
        ...current,
        presence: [...withoutMine, myPresence],
        updatedAt: now,
      };
    });
  }

  function releaseSeatOnly() {
    writeLobby((current) => {
      const cleaned = cleanupStaleAndPrune(current.tables).tables;
      const cleared = clearSessionFromTables(cleaned, appSessionId);
      const pruned = cleanupStaleAndPrune(cleared.tables).tables;
      const closedRoomCodes = cleared.tables
        .filter((table) => !table.white && !table.black)
        .map((table) => table.roomCode);
      const nextClosedTableRooms = markClosedTableRooms(current.closedTableRooms, closedRoomCodes);
      const tablesSame = JSON.stringify(pruned) === JSON.stringify(cleaned);
      const closedSame = JSON.stringify(nextClosedTableRooms) === JSON.stringify(current.closedTableRooms);
      if (!cleared.changed && tablesSame && closedSame) return current;
      return {
        ...current,
        tables: pruned,
        closedTableRooms: nextClosedTableRooms,
        updatedAt: Date.now(),
      };
    });
  }

  function goToTable(table: LobbyTable, seat: Seat) {
    clearOpponentIdleWatch();
    timeoutWinWaiverRef.current = null;
    leavePermissionPromptKeyRef.current = "";
    leavePermissionAutoLeavingRef.current = false;
    setMatchLiveState({
      matchToken: "",
      matchActive: false,
      winner: null,
      localColor: null,
    });
    setRoomSession({
      code: table.roomCode,
      seat,
      sessionId: appSessionId,
      roomName: lobbyState.lobbyName,
      tableNo: table.id,
      role: "player",
      joinedAt: Date.now(),
    });
    setJoinCodeInput(table.roomCode);
    setJoinSeat(seat === "white" ? "black" : "white");
    setMode("local");
    setViewMode("table");
    setCopied(false);
    setInvitePickerTableId(null);
    setLobbyNotice("");
    forceReloadBoard();
  }

  function watchTableAsSpectator(table: LobbyTable) {
    if (!table.white && !table.black) {
      setLobbyNotice("Bos masa izlenemez.");
      return;
    }
    if (table.isPrivate) {
      setLobbyNotice("Ozel masaya izleyici giremez. Sadece davetli oyuncu katilabilir.");
      return;
    }
    if (myCurrentSeat) {
      setLobbyNotice("Masada otururken izleyici moduna gecemezsin.");
      return;
    }
    clearOpponentIdleWatch();
    timeoutWinWaiverRef.current = null;
    leavePermissionPromptKeyRef.current = "";
    leavePermissionAutoLeavingRef.current = false;
    setMatchLiveState({
      matchToken: "",
      matchActive: false,
      winner: null,
      localColor: null,
    });
    setRoomSession({
      code: table.roomCode,
      seat: "white",
      sessionId: appSessionId,
      roomName: lobbyState.lobbyName,
      tableNo: table.id,
      role: "spectator",
      joinedAt: Date.now(),
    });
    setJoinCodeInput(table.roomCode);
    setMode("local");
    setViewMode("table");
    setCopied(false);
    setInvitePickerTableId(null);
    setLobbyNotice(`Masa ${table.id} izleyici modunda acildi.`);
    forceReloadBoard();
  }

  function upsertMySeat(tableId: number, seat: Seat, explicitRoomCode?: string): UpsertSeatResult {
    let seatBlocked = false;
    let blockReason: UpsertSeatResult["reason"] = null;
    let resolvedTable: LobbyTable | null = null;

    const next = writeLobby((current) => {
      const cleaned = cleanupStaleAndPrune(current.tables).tables;
      const code = sanitizeRoomCode(explicitRoomCode ?? "");
      const tables = [...cleaned];
      let index = tables.findIndex((table) => table.id === tableId || (code && table.roomCode === code));
      let table: LobbyTable;

      if (index >= 0) {
        table = tables[index];
      } else {
        table = {
          id: tableId,
          roomCode: code || createRoomCode(),
          white: null,
          black: null,
          allowSpectatorChat: true,
          ownerUserId: sanitizeGuestId(currentProfile.userId),
          isPrivate: false,
          privateChangedAt: 0,
          invitedUserId: null,
          invitedByUserId: null,
          inviteNoticeId: null,
          inviteNoticeForUserId: null,
          inviteNoticeText: null,
          whiteReadyAt: null,
          blackReadyAt: null,
          startedAt: null,
          setCount: DEFAULT_TABLE_SET_COUNT,
          setPlayed: 0,
          setWhiteWins: 0,
          setBlackWins: 0,
          setResultTokens: [],
          leavePermissionRequestByUserId: null,
          leavePermissionGrantedToUserId: null,
        };
        tables.push(table);
        index = tables.length - 1;
      }

      if (code) {
        table = { ...table, roomCode: code };
      }

      const existingSeat = findSessionSeat(cleaned, appSessionId);
      const isSameTable = existingSeat
        ? existingSeat.table.id === table.id || (code && existingSeat.table.roomCode === code)
        : false;
      if (existingSeat && !isSameTable) {
        seatBlocked = true;
        blockReason = "already-seated";
        return current;
      }

      let gateShouldReset = false;

      if (existingSeat && isSameTable && existingSeat.seat !== seat) {
        table = existingSeat.seat === "white"
          ? { ...table, white: null }
          : { ...table, black: null };
        gateShouldReset = true;
      }

      if (isTablePrivateBlockedForUser(table, currentProfile.userId, appSessionId)) {
        seatBlocked = true;
        blockReason = "private";
        return current;
      }
      if (table.isPrivate && !sanitizeGuestId(table.ownerUserId)) {
        seatBlocked = true;
        blockReason = "missing-owner";
        return current;
      }

      const occupied = seat === "white" ? table.white : table.black;
      const occupiedByDifferentSession = Boolean(occupied && occupied.sessionId !== appSessionId);
      if (occupiedByDifferentSession) {
        seatBlocked = true;
        blockReason = "occupied";
        return current;
      }

      if (gateShouldReset) {
        table = resetTableStartGate(table);
      }

      const now = Date.now();
      const seatState: LobbySeatState = {
        sessionId: appSessionId,
        userId: currentProfile.userId,
        username: currentProfile.username,
        displayName: currentProfile.displayName,
        gender: currentProfile.gender,
        avatarId: currentProfile.avatarId,
        points: currentProfile.points,
        stats: normalizeStats(currentProfile.stats),
        touchedAt: now,
      };

      const patched =
        seat === "white"
          ? { ...table, white: seatState, ownerUserId: table.ownerUserId || sanitizeGuestId(currentProfile.userId) }
          : { ...table, black: seatState, ownerUserId: table.ownerUserId || sanitizeGuestId(currentProfile.userId) };

      const started = autoStartTableWhenBothSeated(patched, now);
      tables[index] = normalizeTableAccess(normalizeTableStartGate(started));
      const nextTables = sortTables(tables);
      resolvedTable = nextTables.find((row) => row.id === patched.id) ?? normalizeTableAccess(normalizeTableStartGate(started));

      return {
        ...current,
        tables: nextTables,
        updatedAt: now,
      };
    });

    if (!next || seatBlocked) {
      return { table: null, reason: blockReason };
    }
    if (resolvedTable) return { table: resolvedTable, reason: null };
    return {
      table: next.tables.find((table) => table.id === tableId || table.roomCode === explicitRoomCode) ?? null,
      reason: null,
    };
  }

  function sitToTable(tableId: number, seat: Seat, explicitRoomCode?: string, openGameView = true) {
    const latest = getCurrentLobbyState();
    const existing = findSessionSeat(latest.tables, appSessionId);
    const roomCode = sanitizeRoomCode(explicitRoomCode ?? "");
    const sameTable = existing
      ? existing.table.id === tableId || (roomCode && existing.table.roomCode === roomCode)
      : false;

    if (existing && !sameTable) {
      setLobbyNotice(`Ayni anda sadece tek masada oturabilirsin. Once Masa ${existing.table.id} icin masadan kalkmalisin.`);
      setViewMode("lobby");
      return null;
    }

    const upserted = upsertMySeat(tableId, seat, explicitRoomCode);
    const table = upserted.table;
    if (!table) {
      if (upserted.reason === "already-seated") {
        setLobbyNotice(`Ayni anda sadece tek masada oturabilirsin. Once Masa ${existing?.table.id} icin masadan kalkmalisin.`);
      } else if (upserted.reason === "private") {
        setLobbyNotice("Bu masa ozeldir. Sadece masa sahibi veya davet edilen oyuncu oturabilir.");
      } else if (upserted.reason === "missing-owner") {
        setLobbyNotice("Masa sahibi bilgisi gecersiz. Lutfen masa yenilenene kadar bekleyin.");
      } else {
        setLobbyNotice("Secilen koltuk dolu. Lutfen baska bir koltuk secin.");
      }
      return null;
    }
    if (openGameView) {
      goToTable(table, seat);
    } else {
      setMatchLiveState({
        matchToken: "",
        matchActive: false,
        winner: null,
        localColor: null,
      });
      setRoomSession({
        code: table.roomCode,
        seat,
        sessionId: appSessionId,
        roomName: lobbyState.lobbyName,
        tableNo: table.id,
        role: "player",
        joinedAt: Date.now(),
      });
      setJoinCodeInput(table.roomCode);
      setJoinSeat(seat === "white" ? "black" : "white");
      setMode("local");
      setViewMode("lobby");
      setCopied(false);
      setLobbyNotice(`Masa ${table.id} acildi. Diger oyuncu bekleniyor.`);
    }
    return table;
  }

  function onRoomStartReady() {
    if (!roomSession) return;
    if (roomSession.role !== "player") {
      setLobbyNotice("Izleyiciler oyunu baslatamaz.");
      return;
    }
    let seatMissing = false;
    let alreadyStarted = false;
    let alreadyReady = false;
    let startNow = false;

    writeLobby((current) => {
      const cleaned = cleanupStaleAndPrune(current.tables).tables;
      const tables = [...cleaned];
      const index = tables.findIndex((table) => table.id === roomSession.tableNo || table.roomCode === roomSession.code);
      if (index < 0) {
        seatMissing = true;
        return current;
      }

      let table = tables[index];
      const mySeat = roomSession.seat === "white" ? table.white : table.black;
      const seatOwnedByMe = Boolean(mySeat && (mySeat.sessionId === appSessionId || mySeat.userId === currentProfile.userId));
      if (!seatOwnedByMe || !mySeat) {
        seatMissing = true;
        return current;
      }

      const now = Date.now();
      if (mySeat.sessionId !== appSessionId) {
        const refreshedSeat: LobbySeatState = {
          ...mySeat,
          sessionId: appSessionId,
          userId: currentProfile.userId,
          username: currentProfile.username,
          displayName: currentProfile.displayName,
          gender: currentProfile.gender,
          avatarId: currentProfile.avatarId,
          points: currentProfile.points,
          stats: normalizeStats(currentProfile.stats),
          touchedAt: now,
        };
        table = roomSession.seat === "white"
          ? { ...table, white: refreshedSeat }
          : { ...table, black: refreshedSeat };
      }

      if (!table.startedAt) {
        table = resetTableSeriesProgress(table);
      }

      const mineReadyAt = roomSession.seat === "white" ? table.whiteReadyAt : table.blackReadyAt;
      const opponentReadyAt = roomSession.seat === "white" ? table.blackReadyAt : table.whiteReadyAt;

      if (table.startedAt) {
        alreadyStarted = true;
        return current;
      }

      if (mineReadyAt && opponentReadyAt) {
        table = {
          ...table,
          startedAt: Math.max(now, table.startedAt ?? 0, table.whiteReadyAt ?? 0, table.blackReadyAt ?? 0),
        };
      } else if (mineReadyAt) {
        table = roomSession.seat === "white"
          ? { ...table, whiteReadyAt: now }
          : { ...table, blackReadyAt: now };
        alreadyReady = true;
      } else {
        table = roomSession.seat === "white"
          ? { ...table, whiteReadyAt: now }
          : { ...table, blackReadyAt: now };
      }

      const nextTable = normalizeTableStartGate(table);
      startNow = Boolean(nextTable.startedAt);
      tables[index] = nextTable;
      return {
        ...current,
        tables: sortTables(tables),
        updatedAt: now,
      };
    });

    syncRoomStartGateToIframe();

    if (seatMissing) {
      setLobbyNotice("Masadaki koltugun bulunamadi. Lutfen tekrar masaya otur.");
      return;
    }
    if (alreadyStarted) {
      setLobbyNotice("Oyun zaten basladi.");
      return;
    }
    if (alreadyReady) {
      setLobbyNotice("Hazir durumdasin. Rakibin Oyuna Basla butonuna basmasi bekleniyor.");
      return;
    }
    if (startNow) {
      setLobbyNotice("Iki oyuncu da hazirlandi. Oyun basladi.");
      return;
    }
    setLobbyNotice("Hazir oldun. Rakibin de Oyuna Basla butonuna basmasi bekleniyor.");
  }

  function onOpenTable() {
    const latest = getCurrentLobbyState();
    const existing = findSessionSeat(latest.tables, appSessionId);
    if (existing) {
      goToTable(existing.table, existing.seat);
      setLobbyNotice(`Masa ${existing.table.id} zaten acik. Masaya yonlendirildin.`);
      return;
    }
    const tableId = getNextTableId(latest.tables);
    const opened = sitToTable(tableId, "white", createRoomCode(), true);
    if (opened) {
      setLobbyNotice(`Masa ${opened.id} acildi. Diger oyuncu bekleniyor.`);
    }
  }

  function onQuickPlay() {
    const latest = getCurrentLobbyState();
    const existing = findSessionSeat(latest.tables, appSessionId);
    if (existing) {
      goToTable(existing.table, existing.seat);
      return;
    }
    const cleanedTables = cleanupStaleAndPrune(latest.tables).tables;
    const waitingTable = sortTables(cleanedTables).find((table) => {
      const whiteTaken = Boolean(table.white);
      const blackTaken = Boolean(table.black);
      if (whiteTaken === blackTaken) return false;
      if (isTablePrivateBlockedForUser(table, currentProfile.userId, appSessionId)) return false;
      return true;
    });

    if (waitingTable) {
      const targetSeat: Seat = waitingTable.white ? "black" : "white";
      const joined = sitToTable(waitingTable.id, targetSeat, waitingTable.roomCode, true);
      if (joined) {
        setLobbyNotice(`Masa ${waitingTable.id} bulundu. Oyuna katildin.`);
        return;
      }
    }

    const tableId = getNextTableId(cleanedTables);
    sitToTable(tableId, "white", createRoomCode(), true);
  }

  function onJoinByCode() {
    const code = sanitizeRoomCode(joinCodeInput);
    if (!code) {
      setLobbyNotice("Lutfen gecerli bir oda kodu yazin.");
      return;
    }

    const latest = getCurrentLobbyState();
    const table = latest.tables.find((row) => row.roomCode === code);
    if (!table) {
      setLobbyNotice("Bu kodda acik masa yok.");
      return;
    }
    if (isTablePrivateBlockedForUser(table, currentProfile.userId, appSessionId)) {
      setLobbyNotice("Bu masa ozel. Sadece masa sahibi veya davet edilen oyuncu katilabilir.");
      return;
    }

    let targetSeat = joinSeat;
    const preferredOccupied = targetSeat === "white" ? table.white : table.black;
    if (preferredOccupied && preferredOccupied.sessionId !== appSessionId) {
      const altSeat: Seat = targetSeat === "white" ? "black" : "white";
      const altOccupied = altSeat === "white" ? table.white : table.black;
      if (altOccupied && altOccupied.sessionId !== appSessionId) {
        setLobbyNotice("Masa dolu.");
        return;
      }
      targetSeat = altSeat;
      setLobbyNotice("Secili koltuk dolu oldugu icin bos koltuga gectin.");
    }

    sitToTable(table.id, targetSeat, table.roomCode);
  }

  async function leaveRoomAndGoLobby() {
    let penalized = false;
    let leftWithPermission = false;
    let penaltyWaivedBecauseOpponentLeft = false;
    if (roomSession && roomSession.role === "player") {
      const activeTable = getActiveRoomTable();
      const leaveContext = resolveLeavePenaltyContext(activeTable);
      if (leaveContext.shouldPenalize && leaveContext.opponentSeat) {
        const confirmed = window.confirm(
          `Set serisi tamamlanmadan masadan kalkarsan ${gameRules.resignPenaltyPoints} puan kaybedersin. Rakibin galip sayilip ${gameRules.winPoints} puan kazanir. Devam etmek istiyor musun?`,
        );
        if (!confirmed) return;
        const token = matchLiveState.matchToken || `resign-${Date.now().toString(36)}`;
        processedMatchTokensRef.current.add(`${token}:${currentProfile.userId}`);
        sendResignCommandToIframe(token);
        void awardResignResult(token);
        penalized = true;
      } else if (leaveContext.permissionGranted) {
        leftWithPermission = true;
      } else {
        penaltyWaivedBecauseOpponentLeft = Boolean(leaveContext.opponentSeat === null);
      }
    }

    closeRoomAndReturnLobby();
    if (penalized) {
      setLobbyNotice(`Masadan ayrildin: -${gameRules.resignPenaltyPoints} puan. Rakibin +${gameRules.winPoints} puan kazandi.`);
      return;
    }
    if (leftWithPermission) {
      setLobbyNotice("Rakibin izin verdigi icin puan kaybetmeden masadan ayrildin.");
      return;
    }
    if (penaltyWaivedBecauseOpponentLeft) {
      setLobbyNotice("Rakip masadan ayrildigi icin ceza uygulanmadi.");
      return;
    }
    setLobbyNotice("Masadan ayrildin.");
  }

  async function startBotGame() {
    let penalized = false;
    let leftWithPermission = false;
    let penaltyWaivedBecauseOpponentLeft = false;
    if (roomSession) {
      if (roomSession.role === "player") {
        const activeTable = getActiveRoomTable();
        const leaveContext = resolveLeavePenaltyContext(activeTable);
        if (leaveContext.shouldPenalize && leaveContext.opponentSeat) {
          const confirmed = window.confirm(
            `Set serisi tamamlanmadan masadan ayrilirsan ${gameRules.resignPenaltyPoints} puan kaybedersin. Bot moduna gecmek istiyor musun?`,
          );
          if (!confirmed) return;
          const token = matchLiveState.matchToken || `resign-${Date.now().toString(36)}`;
          processedMatchTokensRef.current.add(`${token}:${currentProfile.userId}`);
          sendResignCommandToIframe(token);
          void awardResignResult(token);
          penalized = true;
        } else if (leaveContext.permissionGranted) {
          leftWithPermission = true;
        } else {
          penaltyWaivedBecauseOpponentLeft = Boolean(leaveContext.opponentSeat === null);
        }
      }
      releaseSeatOnly();
    }
    setRoomSession(null);
    clearOpponentIdleWatch();
    timeoutWinWaiverRef.current = null;
    leavePermissionPromptKeyRef.current = "";
    leavePermissionAutoLeavingRef.current = false;
    setMode("bot");
    setCopied(false);
    setInvitePickerTableId(null);
    if (penalized) {
      setLobbyNotice(`Bot modu aktif. Masadan ayrildigin icin -${gameRules.resignPenaltyPoints} puan uygulandi.`);
    } else if (leftWithPermission) {
      setLobbyNotice("Bot modu aktif. Rakip izin verdigi icin puan kesilmedi.");
    } else if (penaltyWaivedBecauseOpponentLeft) {
      setLobbyNotice("Bot modu aktif. Rakip masadan ayrildigi icin ceza uygulanmadi.");
    } else {
      setLobbyNotice("Bot modu aktif.");
    }
    setMatchLiveState({
      matchToken: "",
      matchActive: false,
      winner: null,
      localColor: null,
    });
    setViewMode("table");
    forceReloadBoard();
  }

  function onSelectMode(nextMode: GameMode) {
    if (roomSession) {
      setLobbyNotice("Online masada oyun modu degistirilemez.");
      return;
    }
    if (nextMode === "bot") {
      startBotGame();
      return;
    }
    setMode("local");
    setViewMode("table");
    if (!roomSession) forceReloadBoard();
  }

  async function refreshGameRules() {
    try {
      const response = await fetch("/api/auth/rules", { method: "GET" });
      const data = (await response.json().catch(() => null)) as { rules?: unknown } | null;
      if (!response.ok) return;
      const nextRules = normalizeGameRules(data?.rules, gameRules);
      setGameRules(nextRules);
      setRuleDraft(nextRules);
    } catch {
      // keep local defaults if service is unavailable
    }
  }

  async function loadAdminState(adminUserId?: string) {
    const userId = sanitizeGuestId(adminUserId ?? member?.id ?? "");
    if (!userId) return;
    setAdminBusy(true);
    setAdminError("");
    try {
      const url = new URL("/api/auth/admin/state", window.location.origin);
      url.searchParams.set("userId", userId);
      const response = await fetch(url.toString(), { method: "GET" });
      const data = (await response.json().catch(() => null)) as { users?: unknown; rules?: unknown; error?: unknown } | null;
      if (!response.ok) {
        const errorText = typeof data?.error === "string" ? data.error : "Admin verisi alinamadi.";
        setAdminError(errorText);
        return;
      }
      const users = normalizeMemberUsers(data?.users);
      setAdminUsers(users);
      const nextRules = normalizeGameRules(data?.rules, gameRules);
      setGameRules(nextRules);
      setRuleDraft(nextRules);
    } catch {
      setAdminError("Admin servisine baglanilamadi.");
    } finally {
      setAdminBusy(false);
    }
  }

  async function runAdminUserAction(
    targetUserId: string,
    action: "addPoints" | "setPoints" | "setRole" | "resetStats" | "deleteUser",
    payload: Record<string, unknown> = {},
  ) {
    if (!member || member.role !== "admin") return;
    const safeTargetUserId = sanitizeGuestId(targetUserId);
    if (!safeTargetUserId) return;
    setAdminBusy(true);
    setAdminError("");
    setAdminNotice("");
    try {
      const response = await fetch("/api/auth/admin/user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          adminUserId: member.id,
          targetUserId: safeTargetUserId,
          action,
          ...payload,
        }),
      });
      const data = (await response.json().catch(() => null)) as { user?: unknown; deleted?: unknown; error?: unknown } | null;
      if (!response.ok) {
        const errorText = typeof data?.error === "string" ? data.error : "Admin islemi basarisiz.";
        setAdminError(errorText);
        return;
      }

      const updated = normalizeMemberUser(data?.user);
      if (updated) {
        setAdminUsers((prev) => {
          const map = new Map(prev.map((item) => [item.id, item] as const));
          map.set(updated.id, updated);
          return [...map.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, "tr"));
        });
        setAdminPointDrafts((prev) => ({ ...prev, [updated.id]: String(updated.points) }));
        setAdminDeltaDrafts((prev) => ({ ...prev, [updated.id]: "" }));
        patchSeatByUserId(updated.id, updated.points, updated.stats, updated.displayName, updated.username, updated.gender, updated.avatarId);
        if (member.id === updated.id) {
          setMember(updated);
          setMemberAvatarDraft(updated.avatarId);
          setGuestName(updated.displayName);
        }
      } else if (data?.deleted) {
        setAdminUsers((prev) => prev.filter((item) => item.id !== safeTargetUserId));
        setAdminPointDrafts((prev) => {
          const next = { ...prev };
          delete next[safeTargetUserId];
          return next;
        });
        setAdminDeltaDrafts((prev) => {
          const next = { ...prev };
          delete next[safeTargetUserId];
          return next;
        });
      }

      setAdminNotice("Admin islemi tamamlandi.");
    } catch {
      setAdminError("Admin servisine baglanilamadi.");
    } finally {
      setAdminBusy(false);
    }
  }

  function updateAdminPointDraft(userId: string, value: string) {
    const safeUserId = sanitizeGuestId(userId);
    if (!safeUserId) return;
    setAdminPointDrafts((prev) => ({ ...prev, [safeUserId]: value.slice(0, 8) }));
  }

  function updateAdminDeltaDraft(userId: string, value: string) {
    const safeUserId = sanitizeGuestId(userId);
    if (!safeUserId) return;
    const normalized = value.replace(/[^\d+-]/g, "").slice(0, 7);
    setAdminDeltaDrafts((prev) => ({ ...prev, [safeUserId]: normalized }));
  }

  function applyAdminPointSet(user: MemberUser) {
    const draft = adminPointDrafts[user.id] ?? String(user.points);
    const next = Math.max(0, normalizeNonNegativeInt(draft, user.points));
    void runAdminUserAction(user.id, "setPoints", { points: next });
  }

  function applyAdminPointDelta(user: MemberUser) {
    const draft = (adminDeltaDrafts[user.id] ?? "").trim();
    const delta = normalizeRuleNumber(draft, 0, -10_000, 10_000);
    if (!delta) return;
    void runAdminUserAction(user.id, "addPoints", { delta });
    setAdminDeltaDrafts((prev) => ({ ...prev, [user.id]: "" }));
  }

  function scrollLobbyChatToBottom() {
    const list = lobbyChatListRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }

  function onLobbyChatScroll() {
    const list = lobbyChatListRef.current;
    if (!list) return;
    const distance = list.scrollHeight - list.scrollTop - list.clientHeight;
    const atBottom = distance <= LOBBY_CHAT_AUTO_SCROLL_THRESHOLD;
    setLobbyChatAutoScroll(atBottom);
    if (atBottom) {
      setLobbyChatUnread(0);
    }
  }

  function scrollRoomChatToBottom() {
    const list = roomChatListRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }

  function onRoomChatScroll() {
    const list = roomChatListRef.current;
    if (!list) return;
    const distance = list.scrollHeight - list.scrollTop - list.clientHeight;
    const atBottom = distance <= LOBBY_CHAT_AUTO_SCROLL_THRESHOLD;
    setRoomChatAutoScroll(atBottom);
    if (atBottom) {
      setRoomChatUnread(0);
    }
  }

  function sendActiveRoomChat() {
    if (roomChatTab === "table") {
      const draft = sanitizeChatText(roomTableChatInput);
      if (!draft) return;
      sendTableChat(draft);
      setRoomTableChatInput("");
      return;
    }
    const draft = sanitizeChatText(roomLobbyChatInput);
    if (!draft) return;
    sendLobbyChat(draft);
    setRoomLobbyChatInput("");
  }

  async function saveAdminRules() {
    if (!member || member.role !== "admin") return;
    setAdminBusy(true);
    setAdminError("");
    setAdminNotice("");
    try {
      const normalizedDraft = normalizeGameRules(ruleDraft, gameRules);
      const response = await fetch("/api/auth/admin/rules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          adminUserId: member.id,
          rules: normalizedDraft,
        }),
      });
      const data = (await response.json().catch(() => null)) as { rules?: unknown; error?: unknown } | null;
      if (!response.ok) {
        const errorText = typeof data?.error === "string" ? data.error : "Kural kaydi basarisiz.";
        setAdminError(errorText);
        return;
      }
      const nextRules = normalizeGameRules(data?.rules, normalizedDraft);
      setGameRules(nextRules);
      setRuleDraft(nextRules);
      setAdminNotice("Oyun kurallari kaydedildi.");
    } catch {
      setAdminError("Kural servisine baglanilamadi.");
    } finally {
      setAdminBusy(false);
    }
  }

  function openAccountMenu(mode: AuthMode) {
    setViewMode("lobby");
    setAuthMode(mode);
    setAuthError("");
    setMemberNotice("");
    if (mode === "register") {
      setAuthAvatarId(DEFAULT_AVATAR_BY_GENDER[sanitizeMemberGender(authGender)]);
    }
    setAccountMenuOpen(true);
  }

  function closeInvitePicker() {
    setInvitePickerTableId(null);
  }

  function openInvitePicker(table: LobbyTable) {
    if (!isTableOwnerForUser(table, currentProfile.userId)) {
      setLobbyNotice("Davet listesini sadece masa sahibi acabilir.");
      return;
    }
    if (!getOpenSeat(table)) {
      setLobbyNotice("Masada iki oyuncu oldugu icin davet gonderilemez.");
      return;
    }
    setInvitePickerTableId(table.id);
    setLobbyNotice("");
  }

  function setTablePrivateMode(tableId: number, isPrivate: boolean) {
    let tableMissing = false;
    let notOwner = false;
    let updated = false;
    let nowPrivate = false;

    writeLobby((current) => {
      const cleaned = cleanupStaleAndPrune(current.tables).tables;
      const tables = [...cleaned];
      const index = tables.findIndex((table) => table.id === tableId);
      if (index < 0) {
        tableMissing = true;
        return current;
      }
      const table = tables[index];
      if (!isTableOwnerForUser(table, currentProfile.userId)) {
        notOwner = true;
        return current;
      }
      if (table.isPrivate === isPrivate) {
        nowPrivate = table.isPrivate;
        return current;
      }
      const patched = normalizeTableAccess({
        ...table,
        isPrivate,
        privateChangedAt: Date.now(),
      });
      tables[index] = patched;
      updated = true;
      nowPrivate = patched.isPrivate;
      return {
        ...current,
        tables: sortTables(tables),
        updatedAt: Date.now(),
      };
    });

    if (tableMissing) {
      setLobbyNotice("Masa bulunamadi.");
      return;
    }
    if (notOwner) {
      setLobbyNotice("Masa gizlilik ayarini sadece masa sahibi degistirebilir.");
      return;
    }
    if (updated) {
      setLobbyNotice(nowPrivate ? "Masa ozel yapildi. Sadece davetliler oturabilir." : "Masa tekrar herkese acildi.");
      return;
    }
    setLobbyNotice(nowPrivate ? "Masa zaten ozel." : "Masa zaten herkese acik.");
  }

  function setSpectatorChatEnabled(tableId: number, enabled: boolean) {
    let tableMissing = false;
    let notOwner = false;
    let updated = false;

    writeLobby((current) => {
      const cleaned = cleanupStaleAndPrune(current.tables).tables;
      const tables = [...cleaned];
      const index = tables.findIndex((table) => table.id === tableId);
      if (index < 0) {
        tableMissing = true;
        return current;
      }
      const table = tables[index];
      if (!isTableOwnerForUser(table, currentProfile.userId)) {
        notOwner = true;
        return current;
      }
      if ((table.allowSpectatorChat !== false) === enabled) {
        return current;
      }
      tables[index] = normalizeTableAccess({
        ...table,
        allowSpectatorChat: enabled,
      });
      updated = true;
      return {
        ...current,
        tables: sortTables(tables),
        updatedAt: Date.now(),
      };
    });

    if (tableMissing) {
      setLobbyNotice("Masa bulunamadi.");
      return;
    }
    if (notOwner) {
      setLobbyNotice("Izleyici sohbetini sadece masa sahibi ayarlayabilir.");
      return;
    }
    if (updated) {
      setLobbyNotice(enabled ? "Izleyici sohbeti acildi." : "Izleyici sohbeti kapatildi.");
    }
  }

  function invitePlayerToTable(tableId: number, targetUserId: string) {
    const safeTargetUserId = sanitizeGuestId(targetUserId);
    if (!safeTargetUserId) return;

    let tableMissing = false;
    let notOwner = false;
    let targetBusy = false;
    let tableFull = false;
    let invited = false;
    let targetName = "";

    writeLobby((current) => {
      const cleaned = cleanupStaleAndPrune(current.tables).tables;
      const tables = [...cleaned];
      const tableIndex = tables.findIndex((table) => table.id === tableId);
      if (tableIndex < 0) {
        tableMissing = true;
        return current;
      }
      const table = tables[tableIndex];
      if (!isTableOwnerForUser(table, currentProfile.userId)) {
        notOwner = true;
        return current;
      }

      const alreadySeatedElsewhere = cleaned.some((row) => {
        if (row.id === table.id) return false;
        return row.white?.userId === safeTargetUserId || row.black?.userId === safeTargetUserId;
      });
      if (alreadySeatedElsewhere) {
        targetBusy = true;
        return current;
      }

      if (table.white?.userId === safeTargetUserId || table.black?.userId === safeTargetUserId) {
        targetBusy = true;
        return current;
      }

      if (table.white && table.black) {
        tableFull = true;
        return current;
      }

      const patched = normalizeTableAccess({
        ...table,
        invitedUserId: safeTargetUserId,
        invitedByUserId: sanitizeGuestId(currentProfile.userId) || table.ownerUserId || null,
        inviteNoticeId: null,
        inviteNoticeForUserId: null,
        inviteNoticeText: null,
      });
      tables[tableIndex] = patched;
      invited = true;
      targetName = onlineRows.find((row) => row.userId === safeTargetUserId)?.name ?? safeTargetUserId;

      return {
        ...current,
        tables: sortTables(tables),
        updatedAt: Date.now(),
      };
    });

    if (tableMissing) {
      setLobbyNotice("Masa bulunamadi.");
      return;
    }
    if (notOwner) {
      setLobbyNotice("Bu masaya davet gonderebilmek icin masa sahibi olmalisin.");
      return;
    }
    if (targetBusy) {
      setLobbyNotice("Secilen oyuncu su an baska bir masada.");
      return;
    }
    if (tableFull) {
      setLobbyNotice("Masa dolu oldugu icin davet gonderilemedi.");
      return;
    }
    if (invited) {
      closeInvitePicker();
      setLobbyNotice(`${targetName} oyuncusuna masa daveti gonderildi.`);
    }
  }

  function acceptTableInvite(tableId: number) {
    const latest = getCurrentLobbyState();
    const table = latest.tables.find((row) => row.id === tableId);
    if (!table || table.invitedUserId !== currentProfile.userId) {
      setLobbyNotice("Davet artik gecerli degil.");
      return;
    }
    const targetSeat = getOpenSeat(table);
    if (!targetSeat) {
      setLobbyNotice("Masa doldugu icin davet gecersiz oldu.");
      writeLobby((current) => {
        const tables = current.tables.map((row) => {
          if (row.id !== tableId) return row;
          if (row.invitedUserId !== currentProfile.userId) return row;
          return normalizeTableAccess({
            ...row,
            invitedUserId: null,
            invitedByUserId: null,
            inviteNoticeId: null,
            inviteNoticeForUserId: null,
            inviteNoticeText: null,
          });
        });
        return { ...current, tables, updatedAt: Date.now() };
      });
      return;
    }

    const joined = sitToTable(table.id, targetSeat, table.roomCode, true);
    if (!joined) return;
    writeLobby((current) => {
      const tables = current.tables.map((row) => {
        if (row.id !== table.id) return row;
        if (row.invitedUserId !== currentProfile.userId) return row;
        return normalizeTableAccess({
          ...row,
          invitedUserId: null,
          invitedByUserId: null,
          inviteNoticeId: null,
          inviteNoticeForUserId: null,
          inviteNoticeText: null,
        });
      });
      return { ...current, tables, updatedAt: Date.now() };
    });
    setLobbyNotice(`Masa ${table.id} daveti kabul edildi.`);
  }

  function rejectTableInvite(tableId: number) {
    const latest = getCurrentLobbyState();
    const table = latest.tables.find((row) => row.id === tableId);
    if (!table || table.invitedUserId !== currentProfile.userId) {
      setLobbyNotice("Davet artik gecerli degil.");
      return;
    }
    const inviterUserId = sanitizeGuestId(table.invitedByUserId ?? table.ownerUserId ?? "");
    const rejecterName = sanitizeGuestName(currentProfile.displayName) || "Oyuncu";
    let rejected = false;
    writeLobby((current) => {
      const tables = current.tables.map((row) => {
        if (row.id !== tableId) return row;
        if (row.invitedUserId !== currentProfile.userId) return row;
        rejected = true;
        return normalizeTableAccess({
          ...row,
          invitedUserId: null,
          invitedByUserId: null,
          inviteNoticeId: inviterUserId ? createChatMessageId(`invite-reject-${tableId}-${inviterUserId}`) : null,
          inviteNoticeForUserId: inviterUserId || null,
          inviteNoticeText: inviterUserId
            ? `${rejecterName} oyuncusu Masa ${tableId} davetinizi reddetti.`
            : null,
        });
      });
      return { ...current, tables, updatedAt: Date.now() };
    });
    if (!rejected) {
      setLobbyNotice("Davet artik gecerli degil.");
      return;
    }
    setInvitePickerTableId(null);
    setLobbyNotice(`Masa ${tableId} daveti reddedildi.`);
  }

  async function copyInviteFromTable(table: LobbyTable, seat: Seat) {
    const inviteSeat: Seat = seat === "white" ? "black" : "white";
    const url = new URL(window.location.href);
    url.searchParams.set("room", table.roomCode);
    url.searchParams.set("seat", inviteSeat);
    url.searchParams.set("name", safeGuestName);
    url.searchParams.set("room_name", lobbyState.lobbyName);
    url.searchParams.set("table", String(table.id));
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1300);
  }

  async function onCopyInvite() {
    if (!roomSession || !currentRoomTable) return;
    if (roomSession.role !== "player") {
      setLobbyNotice("Izleyici modunda davet linki kopyalanamaz.");
      return;
    }
    if (!currentRoomIsOwner) {
      setLobbyNotice("Davet linkini sadece masa sahibi kopyalayabilir.");
      return;
    }
    if (!canCopyInviteLink) {
      setLobbyNotice("Oyun basladiktan sonra davet linki kilitlenir.");
      return;
    }
    await copyInviteFromTable(currentRoomTable, roomSession.seat);
  }

  async function loadMemberFromSession(session: MemberSession | null) {
    if (!session?.userId) return null;
    try {
      const url = new URL("/api/auth/me", window.location.origin);
      url.searchParams.set("userId", session.userId);
      const response = await fetch(url.toString(), { method: "GET" });
      if (!response.ok) return null;
      const data = (await response.json().catch(() => null)) as { user?: unknown } | null;
      return normalizeMemberUser(data?.user);
    } catch {
      return null;
    }
  }

  async function onRegisterMember() {
    if (authBusy) return;
    const username = sanitizeMemberUsername(authUsername);
    const displayName = sanitizeGuestName(authDisplayName);
    const email = sanitizeEmail(authEmail);
    const password = authPassword.trim().slice(0, 64);
    const gender = sanitizeMemberGender(authGender);
    const avatarId = sanitizeAvatarId(authAvatarId, gender);

    if (!username || username.length < 3) {
      setAuthError("Kullanici adi en az 3 karakter olmali (harf, rakam, alt cizgi).");
      return;
    }

    if (!displayName || displayName.length < 3) {
      setAuthError("Uye adi en az 3 karakter olmali.");
      return;
    }
    if (!email.includes("@")) {
      setAuthError("Gecerli e-posta girin.");
      return;
    }
    if (password.length < 4) {
      setAuthError("Sifre en az 4 karakter olmali.");
      return;
    }

    setAuthBusy(true);
    setAuthError("");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, displayName, email, gender, avatarId, password }),
      });
      if (!response.ok) {
        setAuthError(await readApiError(response, "Uyelik acilamadi."));
        return;
      }
      const data = (await response.json().catch(() => null)) as { user?: unknown } | null;
      const user = normalizeMemberUser(data?.user);
      if (!user) {
        setAuthError("Sunucu uyelik yaniti gecersiz.");
        return;
      }

      saveJson(MEMBER_SESSION_KEY, { userId: user.id } satisfies MemberSession);
      setMember(user);
      setMemberAvatarDraft(user.avatarId);
      setGuestName(user.displayName);
      setAuthUsername("");
      setAuthDisplayName("");
      setAuthEmail("");
      setAuthGender("unknown");
      setAuthAvatarId(DEFAULT_AVATAR_BY_GENDER.unknown);
      setAuthPassword("");
      setAuthError("");
      setMemberNotice("");
      setLobbyNotice("Uyelik acildi.");
      patchSeatByUserId(user.id, user.points, user.stats, user.displayName, user.username, user.gender, user.avatarId);
    } catch {
      setAuthError("Sunucuya baglanilamadi. Tekrar deneyin.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function onLoginMember() {
    if (authBusy) return;
    const identifier = authEmail.trim().slice(0, 80);
    const password = authPassword.trim().slice(0, 64);
    if (!identifier) {
      setAuthError("E-posta veya kullanici adi girin.");
      return;
    }
    if (!password) {
      setAuthError("Sifre girin.");
      return;
    }

    setAuthBusy(true);
    setAuthError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      if (!response.ok) {
        setAuthError(await readApiError(response, "Kullanici adi/e-posta veya sifre yanlis."));
        return;
      }
      const data = (await response.json().catch(() => null)) as { user?: unknown } | null;
      const user = normalizeMemberUser(data?.user);
      if (!user) {
        setAuthError("Sunucu giris yaniti gecersiz.");
        return;
      }

      setMember(user);
      setMemberAvatarDraft(user.avatarId);
      saveJson(MEMBER_SESSION_KEY, { userId: user.id } satisfies MemberSession);
      setGuestName(user.displayName);
      setAuthPassword("");
      setAuthError("");
      setMemberNotice("");
      setLobbyNotice("Giris yapildi.");
      patchSeatByUserId(user.id, user.points, user.stats, user.displayName, user.username, user.gender, user.avatarId);
    } catch {
      setAuthError("Sunucuya baglanilamadi. Tekrar deneyin.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function onForgotPassword() {
    if (forgotBusy) return;
    const email = sanitizeEmail(forgotEmail);
    const newPassword = forgotNewPassword.trim().slice(0, 64);
    if (!email.includes("@")) {
      setAuthError("Sifre sifirlama icin gecerli e-posta girin.");
      return;
    }
    if (newPassword.length < 4) {
      setAuthError("Yeni sifre en az 4 karakter olmali.");
      return;
    }

    setForgotBusy(true);
    setAuthError("");
    try {
      const response = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, newPassword }),
      });
      if (!response.ok) {
        setAuthError(await readApiError(response, "Sifre sifirlanamadi."));
        return;
      }
      setForgotNewPassword("");
      setMemberNotice("Sifre sifirlandi. Yeni sifre ile giris yapabilirsin.");
    } catch {
      setAuthError("Sifre sifirlama servisine baglanilamadi.");
    } finally {
      setForgotBusy(false);
    }
  }

  async function onChangeMyPassword() {
    if (!member || memberActionBusy) return;
    const currentPassword = memberPasswordCurrent.trim().slice(0, 64);
    const newPassword = memberPasswordNext.trim().slice(0, 64);
    if (!currentPassword) {
      setMemberNotice("Mevcut sifreyi gir.");
      return;
    }
    if (newPassword.length < 4) {
      setMemberNotice("Yeni sifre en az 4 karakter olmali.");
      return;
    }

    setMemberActionBusy(true);
    setMemberNotice("");
    try {
      const response = await fetch("/api/auth/password/change", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: member.id,
          currentPassword,
          newPassword,
        }),
      });
      if (!response.ok) {
        setMemberNotice(await readApiError(response, "Sifre degistirilemedi."));
        return;
      }
      const data = (await response.json().catch(() => null)) as { user?: unknown } | null;
      const user = normalizeMemberUser(data?.user);
      if (user) {
        setMember(user);
        setMemberAvatarDraft(user.avatarId);
        setGuestName(user.displayName);
      }
      setMemberPasswordCurrent("");
      setMemberPasswordNext("");
      setMemberNotice("Sifre basariyla degisti.");
    } catch {
      setMemberNotice("Sifre degistirme servisinde baglanti hatasi.");
    } finally {
      setMemberActionBusy(false);
    }
  }

  async function onChangeMyAvatar() {
    if (!member || memberActionBusy) return;
    const nextAvatarId = sanitizeAvatarId(memberAvatarDraft, member.gender);
    if (nextAvatarId === member.avatarId) {
      setMemberNotice("Avatar zaten secili.");
      return;
    }

    setMemberActionBusy(true);
    setMemberNotice("");
    try {
      const response = await fetch("/api/auth/profile/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: member.id,
          avatarId: nextAvatarId,
        }),
      });
      if (!response.ok) {
        setMemberNotice(await readApiError(response, "Avatar guncellenemedi."));
        return;
      }
      const data = (await response.json().catch(() => null)) as { user?: unknown } | null;
      const user = normalizeMemberUser(data?.user);
      if (!user) {
        setMemberNotice("Sunucu avatar yaniti gecersiz.");
        return;
      }
      setMember(user);
      setMemberAvatarDraft(user.avatarId);
      patchSeatByUserId(user.id, user.points, user.stats, user.displayName, user.username, user.gender, user.avatarId);
      setMemberNotice("Avatar basariyla guncellendi.");
      setLobbyNotice("Profil avatarin guncellendi.");
    } catch {
      setMemberNotice("Avatar guncelleme servisinde baglanti hatasi.");
    } finally {
      setMemberActionBusy(false);
    }
  }

  function onLogoutMember() {
    window.localStorage.removeItem(MEMBER_SESSION_KEY);
    setMember(null);
    setShowAdminPanelInLobby(false);
    setMemberAvatarDraft(DEFAULT_AVATAR_BY_GENDER.unknown);
    setMemberPasswordCurrent("");
    setMemberPasswordNext("");
    setMemberNotice("");
    setForgotEmail("");
    setForgotNewPassword("");
    setAuthPassword("");
    setAuthAvatarId(DEFAULT_AVATAR_BY_GENDER.unknown);
    setAuthError("");
    setAccountMenuOpen(false);
    setLobbyNotice("Uyelik oturumu kapatildi.");
  }

  function patchSeatByUserId(
    userId: string,
    points: number,
    stats: PlayerStats,
    displayName?: string,
    username?: string,
    gender?: MemberGender,
    avatarId?: AvatarId,
  ) {
    writeLobby((current) => {
      let anyChanged = false;
      const now = Date.now();
      const tables = current.tables.map((table) => {
        let changed = false;
        const patchSeat = (seat: LobbySeatState | null) => {
          if (!seat || seat.userId !== userId) return seat;
          changed = true;
          const nextName = displayName ? sanitizeGuestName(displayName) || seat.displayName : seat.displayName;
          const nextUsername = username ? sanitizeMemberUsername(username) || seat.username : seat.username;
          const nextGender = gender ? sanitizeMemberGender(gender) : seat.gender;
          const nextAvatar = avatarId ? sanitizeAvatarId(avatarId, nextGender) : sanitizeAvatarId(seat.avatarId, nextGender);
          return {
            ...seat,
            points: normalizeNonNegativeInt(points, seat.points),
            stats: normalizeStats(stats),
            displayName: nextName,
            username: nextUsername,
            gender: nextGender,
            avatarId: nextAvatar,
            touchedAt: now,
          };
        };
        const white = patchSeat(table.white);
        const black = patchSeat(table.black);
        if (!changed) return table;
        anyChanged = true;
        return { ...table, white, black };
      });

      let presenceChanged = false;
      const presence = current.presence.map((entry) => {
        if (entry.userId !== userId) return entry;
        const nextName = displayName ? sanitizeGuestName(displayName) || entry.displayName : entry.displayName;
        const nextUsername = username ? sanitizeMemberUsername(username) || entry.username : entry.username;
        const nextGender = gender ? sanitizeMemberGender(gender) : entry.gender;
        const nextAvatar = avatarId ? sanitizeAvatarId(avatarId, nextGender) : sanitizeAvatarId(entry.avatarId, nextGender);
        const nextPoints = normalizeNonNegativeInt(points, entry.points);
        const nextStats = normalizeStats(stats);
        if (
          entry.displayName === nextName
          && entry.username === nextUsername
          && entry.gender === nextGender
          && entry.avatarId === nextAvatar
          && entry.points === nextPoints
          && sameStats(entry.stats, nextStats)
        ) {
          return entry;
        }
        presenceChanged = true;
        return {
          ...entry,
          displayName: nextName,
          username: nextUsername,
          gender: nextGender,
          avatarId: nextAvatar,
          points: nextPoints,
          stats: nextStats,
          touchedAt: now,
        };
      });

      if (!anyChanged && !presenceChanged) return current;
      return { ...current, tables, presence, updatedAt: now };
    });
  }

  async function submitMemberMatchOutcome(userId: string, outcome: MatchOutcome, matchToken = "") {
    try {
      const response = await fetch("/api/auth/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId,
          outcome,
          pointsDelta: pointsDeltaForOutcome(outcome, gameRules),
          matchToken,
        }),
      });
      const data = (await response.json().catch(() => null)) as { user?: unknown; error?: unknown } | null;
      if (!response.ok) {
        const message = typeof data?.error === "string" ? data.error : "Puan guncellemesi yapilamadi.";
        setLobbyNotice(message);
        return null;
      }
      return normalizeMemberUser(data?.user);
    } catch {
      setLobbyNotice("Puan servisine baglanilamadi.");
      return null;
    }
  }

  function applyGuestOutcome(outcome: MatchOutcome) {
    setGuestProfile((prev) => {
      const nextStats = applyStatsOutcome(prev.stats, outcome);
      const next: GuestProfile = {
        ...prev,
        displayName: safeGuestName,
        points: Math.max(0, prev.points + pointsDeltaForOutcome(outcome, gameRules)),
        stats: nextStats,
      };
      saveGuestProfile(next);
      patchSeatByUserId(next.userId, next.points, next.stats, next.displayName, fallbackUsernameFromName(next.displayName), next.gender, next.avatarId);
      return next;
    });
  }

  async function applyOutcomeForUserId(userId: string, outcome: MatchOutcome, fallbackName?: string, matchToken = "") {
    if (isMemberUserId(userId)) {
      const updatedMember = await submitMemberMatchOutcome(userId, outcome, matchToken);
      if (!updatedMember) return null;
      patchSeatByUserId(
        updatedMember.id,
        updatedMember.points,
        updatedMember.stats,
        updatedMember.displayName,
        updatedMember.username,
        updatedMember.gender,
        updatedMember.avatarId,
      );
      if (member?.id === updatedMember.id) {
        setMember(updatedMember);
        setMemberAvatarDraft(updatedMember.avatarId);
        setGuestName(updatedMember.displayName);
      }
      return updatedMember;
    }

    if (userId === guestProfile.userId) {
      applyGuestOutcome(outcome);
      return {
        ...guestProfile,
        displayName: safeGuestName,
        points: Math.max(0, guestProfile.points + pointsDeltaForOutcome(outcome, gameRules)),
        stats: applyStatsOutcome(guestProfile.stats, outcome),
      } satisfies GuestProfile;
    }

    const syntheticStats = applyStatsOutcome(createEmptyStats(), outcome);
    const syntheticPoints = Math.max(0, 1500 + pointsDeltaForOutcome(outcome, gameRules));
    patchSeatByUserId(userId, syntheticPoints, syntheticStats, fallbackName, undefined, "unknown", DEFAULT_AVATAR_BY_GENDER.unknown);
    return {
      userId,
      displayName: sanitizeGuestName(fallbackName ?? "Misafir") || "Misafir",
      gender: "unknown",
      avatarId: DEFAULT_AVATAR_BY_GENDER.unknown,
      points: syntheticPoints,
      stats: syntheticStats,
    } satisfies GuestProfile;
  }

  function getActiveRoomTable() {
    if (!roomSession) return null;
    const current = getCurrentLobbyState();
    return current.tables.find((table) => table.id === roomSession.tableNo || table.roomCode === roomSession.code) ?? null;
  }

  function setTableSetCount(tableId: number, nextSetCount: number) {
    const safeSetCount = normalizeTableSetCount(nextSetCount, DEFAULT_TABLE_SET_COUNT);
    let tableMissing = false;
    let notOwner = false;
    let locked = false;
    let updated = false;

    writeLobby((current) => {
      const cleaned = cleanupStaleAndPrune(current.tables).tables;
      const tables = [...cleaned];
      const index = tables.findIndex((table) => table.id === tableId);
      if (index < 0) {
        tableMissing = true;
        return current;
      }
      let table = tables[index];
      if (!isTableOwnerForUser(table, currentProfile.userId)) {
        notOwner = true;
        return current;
      }
      if (table.startedAt || table.setPlayed > 0 || table.setWhiteWins > 0 || table.setBlackWins > 0) {
        locked = true;
        return current;
      }
      if (table.setCount === safeSetCount) {
        return current;
      }
      table = normalizeTableAccess({
        ...table,
        setCount: safeSetCount,
      });
      tables[index] = table;
      updated = true;
      return {
        ...current,
        tables: sortTables(tables),
        updatedAt: Date.now(),
      };
    });

    if (tableMissing) {
      setLobbyNotice("Masa bulunamadi.");
      return;
    }
    if (notOwner) {
      setLobbyNotice("Set sayisini sadece masa sahibi belirleyebilir.");
      return;
    }
    if (locked) {
      setLobbyNotice("Set sayisi sadece seri baslamadan degistirilebilir.");
      return;
    }
    if (updated) {
      setLobbyNotice(`Masa set sayisi ${safeSetCount} olarak ayarlandi.`);
    }
  }

  function requestLeaveWithoutPenalty() {
    if (!roomSession || roomSession.role !== "player") return;
    if (!currentRoomTable) return;
    const requesterUserId = sanitizeGuestId(currentProfile.userId);
    if (!requesterUserId) return;
    let tableMissing = false;
    let notSeated = false;
    let noOpponent = false;
    let alreadyRequested = false;
    let alreadyGranted = false;
    let updated = false;

    writeLobby((current) => {
      const cleaned = cleanupStaleAndPrune(current.tables).tables;
      const tables = [...cleaned];
      const index = tables.findIndex((table) => table.id === roomSession.tableNo || table.roomCode === roomSession.code);
      if (index < 0) {
        tableMissing = true;
        return current;
      }
      const table = tables[index];
      const mySeat = roomSession.seat === "white" ? table.white : table.black;
      const opponentSeat = roomSession.seat === "white" ? table.black : table.white;
      if (!mySeat || sanitizeGuestId(mySeat.userId) !== requesterUserId) {
        notSeated = true;
        return current;
      }
      if (!opponentSeat) {
        noOpponent = true;
        return current;
      }
      if (table.leavePermissionGrantedToUserId === requesterUserId) {
        alreadyGranted = true;
        return current;
      }
      if (table.leavePermissionRequestByUserId === requesterUserId) {
        alreadyRequested = true;
        return current;
      }
      tables[index] = normalizeTableAccess({
        ...table,
        leavePermissionRequestByUserId: requesterUserId,
        leavePermissionGrantedToUserId: null,
      });
      updated = true;
      return {
        ...current,
        tables: sortTables(tables),
        updatedAt: Date.now(),
      };
    });

    if (tableMissing) {
      setLobbyNotice("Masa bulunamadi.");
      return;
    }
    if (notSeated) {
      setLobbyNotice("Bu istegi gonderebilmek icin masada oturuyor olmalisin.");
      return;
    }
    if (noOpponent) {
      setLobbyNotice("Rakip olmadigi icin izin istemene gerek yok.");
      return;
    }
    if (alreadyGranted) {
      setLobbyNotice("Rakibin zaten puansiz ayrilma izni verdi.");
      return;
    }
    if (alreadyRequested) {
      setLobbyNotice("Izin talebin rakibe gonderildi, cevap bekleniyor.");
      return;
    }
    if (updated) {
      setLobbyNotice("Rakibe puansiz ayrilma izni talebi gonderildi.");
    }
  }

  function approveLeaveWithoutPenalty() {
    if (!roomSession || roomSession.role !== "player") return;
    const approverUserId = sanitizeGuestId(currentProfile.userId);
    if (!approverUserId) return;
    let tableMissing = false;
    let noRequest = false;
    let cannotApproveOwnRequest = false;
    let notOpponent = false;
    let updated = false;
    let requesterName = "Rakip";

    writeLobby((current) => {
      const cleaned = cleanupStaleAndPrune(current.tables).tables;
      const tables = [...cleaned];
      const index = tables.findIndex((table) => table.id === roomSession.tableNo || table.roomCode === roomSession.code);
      if (index < 0) {
        tableMissing = true;
        return current;
      }
      const table = tables[index];
      const mySeat = roomSession.seat === "white" ? table.white : table.black;
      const opponentSeat = roomSession.seat === "white" ? table.black : table.white;
      if (!mySeat || sanitizeGuestId(mySeat.userId) !== approverUserId) {
        notOpponent = true;
        return current;
      }
      const requestUserId = sanitizeGuestId(table.leavePermissionRequestByUserId ?? "");
      if (!requestUserId) {
        noRequest = true;
        return current;
      }
      if (requestUserId === approverUserId) {
        cannotApproveOwnRequest = true;
        return current;
      }
      if (!opponentSeat || sanitizeGuestId(opponentSeat.userId) !== requestUserId) {
        notOpponent = true;
        return current;
      }
      requesterName = opponentSeat.displayName || "Rakip";
      tables[index] = normalizeTableAccess({
        ...table,
        leavePermissionGrantedToUserId: requestUserId,
      });
      updated = true;
      return {
        ...current,
        tables: sortTables(tables),
        updatedAt: Date.now(),
      };
    });

    if (tableMissing) {
      setLobbyNotice("Masa bulunamadi.");
      return;
    }
    if (noRequest) {
      setLobbyNotice("Bekleyen izin talebi yok.");
      return;
    }
    if (cannotApproveOwnRequest) {
      setLobbyNotice("Kendi izin talebini onaylayamazsin.");
      return;
    }
    if (notOpponent) {
      setLobbyNotice("Sadece rakip oyuncunun talebini onaylayabilirsin.");
      return;
    }
    if (updated) {
      setLobbyNotice(`${requesterName} oyuncusuna puansiz ayrilma izni verildi.`);
    }
  }

  function adminCloseTable(tableId: number) {
    if (!member || member.role !== "admin") {
      setLobbyNotice("Masayi kapatmak icin admin olmalisin.");
      return;
    }

    let tableFound = false;
    let removedTable: LobbyTable | null = null;
    writeLobby((current) => {
      const cleaned = cleanupStaleAndPrune(current.tables).tables;
      const index = cleaned.findIndex((table) => table.id === tableId);
      if (index < 0) {
        return current;
      }
      tableFound = true;
      removedTable = cleaned[index];

      const tables = cleaned.filter((table) => table.id !== tableId);
      const tableChats = { ...current.tableChats };
      const chatKey = removedTable ? tableChatKey(removedTable) : "";
      if (chatKey && chatKey in tableChats) {
        delete tableChats[chatKey];
      }

      return {
        ...current,
        tables: sortTables(tables),
        tableChats,
        closedTableRooms: markClosedTableRooms(current.closedTableRooms, removedTable ? [removedTable.roomCode] : []),
        updatedAt: Date.now(),
      };
    });

    if (!tableFound) {
      setLobbyNotice("Kapatilacak masa bulunamadi.");
      return;
    }

    if (invitePickerTableId === tableId) {
      setInvitePickerTableId(null);
    }
    setLobbyNotice(`Masa ${tableId} admin tarafindan kapatildi.`);
  }

  function resolveLeavePenaltyContext(activeTable: LobbyTable | null) {
    if (!roomSession || roomSession.role !== "player" || !activeTable) {
      return {
        opponentSeat: null as LobbySeatState | null,
        permissionGranted: false,
        shouldPenalize: false,
      };
    }
    const mySeat = roomSession.seat === "white" ? activeTable.white : activeTable.black;
    const opponentSeat = roomSession.seat === "white" ? activeTable.black : activeTable.white;
    const myUserId = sanitizeGuestId(currentProfile.userId);
    const permissionGranted = Boolean(myUserId && activeTable.leavePermissionGrantedToUserId === myUserId);
    const timeoutWaiver = Boolean(
      myUserId
      && timeoutWinWaiverRef.current
      && timeoutWinWaiverRef.current.userId === myUserId
      && timeoutWinWaiverRef.current.tableCode === activeTable.roomCode,
    );
    const opponentPresenceActive = Boolean(
      opponentSeat
      && lobbyState.presence.some((entry) => (
        (entry.sessionId === opponentSeat.sessionId || entry.userId === opponentSeat.userId)
        && Date.now() - entry.touchedAt <= HEARTBEAT_MS * 2
      )),
    );
    const effectiveOpponentSeat = opponentPresenceActive ? opponentSeat : null;
    const opponentLooksDisconnected = Boolean(
      effectiveOpponentSeat && Date.now() - effectiveOpponentSeat.touchedAt > HEARTBEAT_MS * 2,
    );
    const localWonCurrentGame = Boolean(matchLiveState.winner && matchLiveState.winner === roomSession.seat);
    const setComplete = isTableSeriesComplete(activeTable);
    const seriesStarted = Boolean(activeTable.startedAt || activeTable.setPlayed > 0 || matchLiveState.matchActive);
    const shouldPenalize = Boolean(
      mySeat
      && effectiveOpponentSeat
      && seriesStarted
      && !setComplete
      && !permissionGranted
      && !timeoutWaiver
      && !opponentLooksDisconnected
      && !localWonCurrentGame
    );
    return {
      opponentSeat: effectiveOpponentSeat,
      permissionGranted,
      shouldPenalize,
    };
  }

  async function recordSeriesGameResult(token: string, winner: Seat) {
    if (!roomSession || roomSession.role !== "player") {
      return null;
    }
    const safeToken = sanitizeSeriesToken(token);
    if (!safeToken) return null;

    let tableMissing = false;
    let duplicate = false;
    let seriesCompleted = false;
    let seriesWinnerSeat: Seat | null = null;
    let nextPlayed = 0;
    let nextWhiteWins = 0;
    let nextBlackWins = 0;
    let nextSetCount = DEFAULT_TABLE_SET_COUNT;
    let settleToken = "";

    writeLobby((current) => {
      const cleaned = cleanupStaleAndPrune(current.tables).tables;
      const tables = [...cleaned];
      const index = tables.findIndex((table) => table.id === roomSession.tableNo || table.roomCode === roomSession.code);
      if (index < 0) {
        tableMissing = true;
        return current;
      }
      let table = tables[index];
      if (!table.white || !table.black) {
        tableMissing = true;
        return current;
      }
      if (table.setResultTokens.includes(safeToken)) {
        duplicate = true;
        nextPlayed = table.setPlayed;
        nextWhiteWins = table.setWhiteWins;
        nextBlackWins = table.setBlackWins;
        nextSetCount = table.setCount;
        seriesCompleted = isTableSeriesComplete(table);
        seriesWinnerSeat = tableSeriesWinner(table, winner);
        settleToken = `series-${table.roomCode}-${table.setCount}-${table.setPlayed}-${table.setWhiteWins}-${table.setBlackWins}-${safeToken}`;
        return current;
      }

      const setCount = normalizeTableSetCount(table.setCount, DEFAULT_TABLE_SET_COUNT);
      const setPlayed = Math.min(setCount, normalizeNonNegativeInt(table.setPlayed, 0) + 1);
      const setWhiteWins = Math.min(setPlayed, normalizeNonNegativeInt(table.setWhiteWins, 0) + (winner === "white" ? 1 : 0));
      const setBlackWins = Math.min(setPlayed, normalizeNonNegativeInt(table.setBlackWins, 0) + (winner === "black" ? 1 : 0));
      const setResultTokens = normalizeSeriesTokenList([...table.setResultTokens, safeToken]);
      const completed = setPlayed >= setCount;
      const winnerSeat = tableSeriesWinner(
        {
          ...table,
          setCount,
          setPlayed,
          setWhiteWins,
          setBlackWins,
          setResultTokens,
        },
        winner,
      );

      table = {
        ...table,
        setCount,
        setPlayed,
        setWhiteWins,
        setBlackWins,
        setResultTokens,
      };

      if (completed) {
        table = resetTableStartGate({
          ...table,
          leavePermissionRequestByUserId: null,
          leavePermissionGrantedToUserId: null,
        });
      }

      table = normalizeTableAccess(table);
      tables[index] = table;
      nextPlayed = table.setPlayed;
      nextWhiteWins = table.setWhiteWins;
      nextBlackWins = table.setBlackWins;
      nextSetCount = table.setCount;
      seriesCompleted = completed;
      seriesWinnerSeat = winnerSeat;
      settleToken = `series-${table.roomCode}-${table.setCount}-${table.setPlayed}-${table.setWhiteWins}-${table.setBlackWins}-${safeToken}`;
      return {
        ...current,
        tables: sortTables(tables),
        updatedAt: Date.now(),
      };
    });

    if (tableMissing) return null;
    return {
      duplicate,
      completed: seriesCompleted,
      winnerSeat: seriesWinnerSeat,
      setCount: nextSetCount,
      setPlayed: nextPlayed,
      whiteWins: nextWhiteWins,
      blackWins: nextBlackWins,
      settleToken,
    };
  }

  async function awardResignResult(matchToken: string) {
    if (!roomSession) return;
    const table = getActiveRoomTable();
    if (!table) return;
    const mySeat = roomSession.seat === "white" ? table.white : table.black;
    const opponentSeat = roomSession.seat === "white" ? table.black : table.white;
    if (mySeat) {
      await applyOutcomeForUserId(mySeat.userId, "resign", mySeat.displayName, matchToken);
    } else {
      await applyOutcomeForUserId(currentProfile.userId, "resign", currentProfile.displayName, matchToken);
    }
    if (opponentSeat?.userId) {
      await applyOutcomeForUserId(opponentSeat.userId, "win", opponentSeat.displayName, matchToken);
    }
  }

  function closeRoomAndReturnLobby() {
    releaseSeatOnly();
    setRoomSession(null);
    setCopied(false);
    setInvitePickerTableId(null);
    setViewMode("lobby");
    clearOpponentIdleWatch();
    timeoutWinWaiverRef.current = null;
    leavePermissionPromptKeyRef.current = "";
    leavePermissionAutoLeavingRef.current = false;
    setMatchLiveState({
      matchToken: "",
      matchActive: false,
      winner: null,
      localColor: null,
    });
    forceReloadBoard();
  }

  function sendResignCommandToIframe(matchToken: string) {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      {
        source: "tavla-host",
        type: "request-resign",
        matchToken,
      },
      window.location.origin,
    );
  }

  function sendTimeoutWinCommandToIframe(matchToken: string) {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      {
        source: "tavla-host",
        type: "request-timeout-win",
        matchToken,
      },
      window.location.origin,
    );
  }

  function claimTimeoutWinByInactivity(matchToken: string) {
    if (!roomSession || roomSession.role !== "player") return;
    if (!currentRoomTable) return;
    const safeToken = sanitizeSeriesToken(matchToken) || `timeout-${Date.now().toString(36)}`;
    sendTimeoutWinCommandToIframe(safeToken);
    timeoutWinWaiverRef.current = {
      tableCode: currentRoomTable.roomCode,
      matchToken: safeToken,
      userId: currentProfile.userId,
    };
    setLobbyNotice("Rakibin 1 dakika hamle yapmadigi icin galip sayildin.");
  }

  function syncTableChatToIframe(targetWindow?: Window | null) {
    const frameWindow = targetWindow ?? iframeRef.current?.contentWindow;
    if (!frameWindow) return;
    const tableChatVisible = Boolean(roomSession && mode === "local" && canViewTableChat);
    frameWindow.postMessage(
      {
        source: "tavla-host",
        type: "table-chat-sync",
        rows: tableChatVisible ? tableChatRows : [],
        canView: tableChatVisible,
        canWrite: tableChatVisible && canWriteTableChat,
      },
      window.location.origin,
    );
  }

  function syncRoomStartGateToIframe(targetWindow?: Window | null) {
    const frameWindow = targetWindow ?? iframeRef.current?.contentWindow;
    if (!frameWindow) return;
    const gateActive = Boolean(roomSession && roomSession.role === "player" && mode === "local");
    frameWindow.postMessage(
      {
        source: "tavla-host",
        type: "room-start-gate",
        active: gateActive,
        bothSeated: gateActive ? Boolean(roomStartState?.bothSeated) : true,
        started: gateActive ? Boolean(roomStartState?.started) : true,
      },
      window.location.origin,
    );
  }

  function closeProfileModal() {
    setProfileModal((prev) => ({ ...prev, open: false, loading: false }));
  }

  async function openPlayerProfile(
    userId: string,
    displayName: string,
    points: number,
    stats: PlayerStats,
    username?: string,
    gender?: MemberGender,
    avatarId?: AvatarId,
  ) {
    const baseState: PlayerProfileModalState = {
      open: true,
      loading: false,
      isMember: isMemberUserId(userId),
      name: sanitizeGuestName(displayName) || "Oyuncu",
      username: sanitizeMemberUsername(username ?? "") || fallbackUsernameFromName(displayName),
      gender: sanitizeMemberGender(gender),
      avatarId: sanitizeAvatarId(avatarId, sanitizeMemberGender(gender)),
      points: normalizeNonNegativeInt(points, 0),
      stats: normalizeStats(stats),
      userId,
    };

    if (!isMemberUserId(userId)) {
      setProfileModal(baseState);
      return;
    }

    setProfileModal({ ...baseState, loading: true });
    try {
      const url = new URL("/api/auth/profile", window.location.origin);
      url.searchParams.set("userId", userId);
      const response = await fetch(url.toString(), { method: "GET" });
      const data = (await response.json().catch(() => null)) as { user?: unknown; error?: unknown } | null;
      if (!response.ok) {
        setProfileModal({
          ...baseState,
          loading: false,
          error: typeof data?.error === "string" ? data.error : "Profil bilgisi yuklenemedi.",
        });
        return;
      }
      const user = normalizeMemberUser(data?.user);
      if (!user) {
        setProfileModal({ ...baseState, loading: false, error: "Profil verisi gecersiz." });
        return;
      }
      setProfileModal({
        open: true,
        loading: false,
        isMember: true,
        name: user.displayName,
        username: user.username,
        gender: user.gender,
        avatarId: user.avatarId,
        points: user.points,
        stats: normalizeStats(user.stats),
        email: user.email,
        userId: user.id,
      });
    } catch {
      setProfileModal({ ...baseState, loading: false, error: "Profil servisine baglanilamadi." });
    }
  }

  function syncRoomSeatHeartbeat() {
    if (!roomSession) return;
    if (roomSession.role !== "player") return;
    let blocked = false;
    let blockedReason: "occupied" | "private" | "already-seated" | null = null;

    writeLobby((current) => {
      const cleaned = cleanupStaleAndPrune(current.tables).tables;
      const tables = [...cleaned];
      const idx = tables.findIndex((table) => table.id === roomSession.tableNo || table.roomCode === roomSession.code);
      const roomCode = sanitizeRoomCode(roomSession.code) || createRoomCode();
      const now = Date.now();

      let index = idx;
      let table: LobbyTable;
      if (index >= 0) {
        table = tables[index];
      } else {
        table = {
          id: Math.max(1, roomSession.tableNo),
          roomCode,
          white: null,
          black: null,
          allowSpectatorChat: true,
          ownerUserId: sanitizeGuestId(currentProfile.userId),
          isPrivate: false,
          privateChangedAt: 0,
          invitedUserId: null,
          invitedByUserId: null,
          inviteNoticeId: null,
          inviteNoticeForUserId: null,
          inviteNoticeText: null,
          whiteReadyAt: null,
          blackReadyAt: null,
          startedAt: null,
          setCount: DEFAULT_TABLE_SET_COUNT,
          setPlayed: 0,
          setWhiteWins: 0,
          setBlackWins: 0,
          setResultTokens: [],
          leavePermissionRequestByUserId: null,
          leavePermissionGrantedToUserId: null,
        };
        tables.push(table);
        index = tables.length - 1;
      }

      table = { ...table, roomCode };
      const existingSeat = findSessionSeat(cleaned, appSessionId);
      const isSameTable = existingSeat
        ? existingSeat.table.id === table.id || existingSeat.table.roomCode === roomCode
        : false;
      if (existingSeat && !isSameTable) {
        blocked = true;
        blockedReason = "already-seated";
        return current;
      }

      let gateShouldReset = false;
      if (existingSeat && isSameTable && existingSeat.seat !== roomSession.seat) {
        table = existingSeat.seat === "white"
          ? { ...table, white: null }
          : { ...table, black: null };
        gateShouldReset = true;
      }

      if (isTablePrivateBlockedForUser(table, currentProfile.userId, appSessionId)) {
        blocked = true;
        blockedReason = "private";
        return current;
      }

      const occupied = roomSession.seat === "white" ? table.white : table.black;
      const occupiedByDifferentSession = Boolean(occupied && occupied.sessionId !== appSessionId);
      if (occupiedByDifferentSession) {
        blocked = true;
        blockedReason = "occupied";
        return current;
      }
      if (gateShouldReset) {
        table = resetTableStartGate(table);
      }

      const seatState: LobbySeatState = {
        sessionId: appSessionId,
        userId: currentProfile.userId,
        username: currentProfile.username,
        displayName: currentProfile.displayName,
        gender: currentProfile.gender,
        avatarId: currentProfile.avatarId,
        points: currentProfile.points,
        stats: normalizeStats(currentProfile.stats),
        touchedAt: now,
      };

      const patched =
        roomSession.seat === "white"
          ? { ...table, white: seatState, ownerUserId: table.ownerUserId || sanitizeGuestId(currentProfile.userId) }
          : { ...table, black: seatState, ownerUserId: table.ownerUserId || sanitizeGuestId(currentProfile.userId) };

      const started = autoStartTableWhenBothSeated(patched, now);
      tables[index] = normalizeTableAccess(normalizeTableStartGate(started));
      return {
        ...current,
        lobbyName: sanitizeLobbyName(roomSession.roomName || current.lobbyName),
        tables: sortTables(tables),
        updatedAt: now,
      };
    });

    if (blocked) {
      if (blockedReason === "private") {
        setLobbyNotice("Bu masa ozel oldugu icin koltuk korunuyor.");
      } else if (blockedReason === "already-seated") {
        setLobbyNotice("Ayni anda sadece tek masada oturabilirsin.");
      } else {
        setLobbyNotice(`${seatText(roomSession.seat)} koltugu dolu gorunuyor.`);
      }
    }
  }

  function seatCell(table: LobbyTable, seat: Seat) {
    const occupant = seat === "white" ? table.white : table.black;
    const mine = occupant?.sessionId === appSessionId;
    if (!occupant) {
      const seatLocked = Boolean(myCurrentSeat && myCurrentSeat.table.id !== table.id);
      const privateBlocked = isTablePrivateBlockedForUser(table, currentProfile.userId, appSessionId);
      return (
        <button
          className="my-otur-btn"
          onClick={() => sitToTable(table.id, seat, table.roomCode)}
          disabled={seatLocked || privateBlocked}
          title={
            seatLocked
              ? `Once Masa ${myCurrentSeat?.table.id} icin masadan kalk`
              : privateBlocked
                ? "Bu masa ozel. Sadece masa sahibi veya davetliler oturabilir."
              : `${seatText(seat)} koltuguna otur`
          }
        >
          {seatLocked ? "MESGUL" : privateBlocked ? "OZEL" : "OTUR"}
        </button>
      );
    }
    return (
      <div className={`my-seat-occupant ${mine ? "mine" : ""}`}>
        <AvatarBadge avatarId={occupant.avatarId} gender={occupant.gender} />
        <div className="my-occupant-lines">
          <button
            type="button"
            className="my-name-link my-occupant-name"
            onClick={() => openPlayerProfile(
              occupant.userId,
              occupant.displayName,
              occupant.points,
              occupant.stats,
              occupant.username,
              occupant.gender,
              occupant.avatarId,
            )}
            title={`${occupant.displayName} profilini goster`}
          >
            {occupant.displayName}
          </button>
          <span className="my-occupant-user">@{occupant.username || fallbackUsernameFromName(occupant.displayName)}</span>
        </div>
      </div>
    );
  }

  async function handleLegacyMatchFinished(message: LegacyMatchFinishedMessage) {
    const token = typeof message.matchToken === "string" ? message.matchToken.slice(0, 96) : "";
    const localColor = message.localColor === "white" || message.localColor === "black" ? message.localColor : null;
    const winner = message.winner === "white" || message.winner === "black" ? message.winner : null;
    const loser = message.loser === "white" || message.loser === "black" ? message.loser : null;
    if (!token || !localColor || !winner) return;

    const dedupeKey = `${token}:${currentProfile.userId}`;
    if (processedMatchTokensRef.current.has(dedupeKey)) return;
    processedMatchTokensRef.current.add(dedupeKey);
    if (processedMatchTokensRef.current.size > 400) {
      processedMatchTokensRef.current.clear();
      processedMatchTokensRef.current.add(dedupeKey);
    }

    if (!roomSession || roomSession.role !== "player") {
      const localOutcome: MatchOutcome =
        message.reason === "resign" && loser === localColor
          ? "resign"
          : winner === localColor
            ? "win"
            : "loss";
      await applyOutcomeForUserId(currentProfile.userId, localOutcome, currentProfile.displayName, token);
      if (localOutcome === "win") {
        setLobbyNotice(`Oyunu kazandin. +${gameRules.winPoints} puan eklendi.`);
      } else if (localOutcome === "resign") {
        setLobbyNotice(`Masadan kalktin. ${gameRules.resignPenaltyPoints} puan dusuldu.`);
      } else {
        setLobbyNotice(
          `Oyunu kaybettin. ${gameRules.lossPoints >= 0 ? `+${gameRules.lossPoints}` : gameRules.lossPoints} puan uygulandi.`,
        );
      }
      return;
    }

    if (message.reason === "resign") {
      return;
    }

    const seriesResult = await recordSeriesGameResult(token, winner);
    if (!seriesResult || seriesResult.duplicate) {
      return;
    }

    if (!seriesResult.completed) {
      setLobbyNotice(
        `Set sonucu kaydedildi. Seri: ${seriesResult.whiteWins}-${seriesResult.blackWins} (${seriesResult.setPlayed}/${seriesResult.setCount}).`,
      );
      return;
    }

    const winnerSeat = seriesResult.winnerSeat ?? winner;
    const localOutcome: MatchOutcome = winnerSeat === localColor ? "win" : "loss";
    await applyOutcomeForUserId(currentProfile.userId, localOutcome, currentProfile.displayName, seriesResult.settleToken || token);
    if (localOutcome === "win") {
      setLobbyNotice(
        `Set serisini kazandin (${seriesResult.whiteWins}-${seriesResult.blackWins}). +${gameRules.winPoints} puan eklendi.`,
      );
    } else {
      setLobbyNotice(
        `Set serisini kaybettin (${seriesResult.whiteWins}-${seriesResult.blackWins}). ${gameRules.lossPoints >= 0 ? `+${gameRules.lossPoints}` : gameRules.lossPoints} puan uygulandi.`,
      );
    }
  }

  useEffect(() => {
    let cancelled = false;
    let reconnectDelay = 1_000;

    const clearReconnectTimer = () => {
      if (realtimeReconnectTimerRef.current === null) return;
      window.clearTimeout(realtimeReconnectTimerRef.current);
      realtimeReconnectTimerRef.current = null;
    };

    const scheduleReconnect = () => {
      if (cancelled || realtimeReconnectTimerRef.current !== null) return;
      const waitMs = reconnectDelay;
      reconnectDelay = Math.min(reconnectDelay * 2, 10_000);
      realtimeReconnectTimerRef.current = window.setTimeout(() => {
        realtimeReconnectTimerRef.current = null;
        connectSocket();
      }, waitMs);
    };

    const closeSocket = () => {
      const socket = realtimeSocketRef.current;
      if (!socket) return;
      realtimeSocketRef.current = null;
      setRealtimeSocketReadyState(typeof WebSocket === "undefined" ? 3 : WebSocket.CLOSED);
      try {
        socket.close(1000, "cleanup");
      } catch {
        // no-op
      }
    };

    const connectSocket = () => {
      if (cancelled) return;
      closeSocket();
      setRealtimeStatus("connecting");
      let socket: WebSocket;
      try {
        socket = new WebSocket(buildRealtimeChannelUrl(REALTIME_WS_BASE_URL, REALTIME_LOBBY_CHANNEL, appSessionId));
      } catch {
        setRealtimeSocketReadyState(typeof WebSocket === "undefined" ? 3 : WebSocket.CLOSED);
        setRealtimeStatus("offline");
        scheduleReconnect();
        return;
      }

      realtimeSocketRef.current = socket;
      setRealtimeSocketReadyState(socket.readyState);
      realtimeReceivedSnapshotRef.current = false;

      const seedTimer = window.setTimeout(() => {
        if (cancelled) return;
        if (realtimeSocketRef.current !== socket) return;
        if (socket.readyState !== WebSocket.OPEN) return;
        if (realtimeReceivedSnapshotRef.current) return;
        const localSnapshot = loadLobbyState();
        realtimeRemoteStateRef.current = localSnapshot;
        realtimeReceivedSnapshotRef.current = true;
        saveJson(LOBBY_STATE_KEY, localSnapshot);
        setLobbyState(localSnapshot);
        sendRealtimeSnapshot(localSnapshot, "seed");
      }, 1_200);

      socket.addEventListener("open", () => {
        if (cancelled || realtimeSocketRef.current !== socket) return;
        reconnectDelay = 1_000;
        setRealtimeSocketReadyState(socket.readyState);
        setSyncHealth((prev) => ({ ...prev, lastWsOpenAt: Date.now(), lastError: "" }));
        setRealtimeStatus("online");
        const helloMessage: RealtimeMessage = {
          kind: "hello",
          channel: REALTIME_LOBBY_CHANNEL,
          sender: appSessionId,
          counter: realtimeSyncCounterRef.current,
          at: Date.now(),
        };
        socket.send(JSON.stringify(helloMessage));
        if (realtimePendingSnapshotRef.current) {
          sendRealtimeSnapshot(realtimePendingSnapshotRef.current, "flush-online");
        }
      });

      socket.addEventListener("message", (event) => {
        if (cancelled || realtimeSocketRef.current !== socket) return;
        if (typeof event.data !== "string") return;
        setSyncHealth((prev) => ({ ...prev, lastWsMessageAt: Date.now() }));

        let message: RealtimeMessage | null = null;
        try {
          message = normalizeRealtimeMessage(JSON.parse(event.data) as unknown);
        } catch {
          return;
        }
        if (!message) return;
        if (applyIncomingRealtimeSnapshot(message)) {
          setRealtimeStatus("online");
        }
      });

      socket.addEventListener("error", () => {
        if (cancelled || realtimeSocketRef.current !== socket) return;
        setSyncHealth((prev) => ({ ...prev, lastError: "ws baglanti hatasi" }));
        setRealtimeStatus("offline");
      });

      socket.addEventListener("close", () => {
        window.clearTimeout(seedTimer);
        if (cancelled || realtimeSocketRef.current !== socket) return;
        realtimeSocketRef.current = null;
        setRealtimeSocketReadyState(typeof WebSocket === "undefined" ? 3 : WebSocket.CLOSED);
        setRealtimeStatus("offline");
        scheduleReconnect();
      });
    };

    connectSocket();

    return () => {
      cancelled = true;
      clearReconnectTimer();
      closeSocket();
      setRealtimeStatus("offline");
    };
  }, [appSessionId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSyncHealthNow(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function runRealtimeHealthProbe() {
    await syncRealtimeViaHttp("manual-health-push");
    await pullRealtimeViaHttp("manual-health-pull");
    setLobbyNotice("Canli senkron testi guncellendi.");
  }

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      const socket = realtimeSocketRef.current;
      const pending = realtimePendingSnapshotRef.current;
      if (socket && socket.readyState === WebSocket.OPEN && !pending) {
        const now = Date.now();
        if (now - realtimeLastPushAtRef.current >= 6000) {
          await syncRealtimeViaHttp("http-write-heartbeat");
          return;
        }
        if (now - realtimeLastPullAtRef.current >= 4000) {
          await pullRealtimeViaHttp("http-read-backup");
        }
        return;
      }
      await syncRealtimeViaHttp("http-fallback");
    };

    void run();
    const timer = window.setInterval(() => {
      void run();
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [appSessionId]);

  useEffect(() => {
    const onMessage = (event: MessageEvent<LegacyHostMessage>) => {
      if (event.origin !== window.location.origin) return;
      const payload = event.data;
      if (!payload || typeof payload !== "object") return;
      if ((payload as { source?: unknown }).source !== "tavla-legacy") return;

      if (payload.type === "table-chat-ready") {
        syncTableChatToIframe();
        return;
      }

      if (payload.type === "table-chat-send") {
        if (typeof payload.text === "string") {
          sendTableChat(payload.text);
        }
        return;
      }

      if (payload.type === "state") {
        const winner = payload.winner === "white" || payload.winner === "black" ? payload.winner : null;
        const localColor = payload.localColor === "white" || payload.localColor === "black" ? payload.localColor : null;
        const matchToken = typeof payload.matchToken === "string" ? payload.matchToken : "";
        const turn = payload.turn === "white" || payload.turn === "black" ? payload.turn : null;
        const activityTick = Number.isFinite(payload.activityTick) ? Math.max(0, Math.trunc(Number(payload.activityTick))) : 0;

        latestLegacyStateRef.current = {
          matchToken,
          matchActive: Boolean(payload.matchActive),
          winner,
          localColor,
          turn,
          activityTick,
        };

        const waitingForOpponent = Boolean(
          roomSession
          && roomSession.role === "player"
          && mode === "local"
          && matchToken
          && localColor
          && turn
          && turn !== localColor
          && !winner
          && payload.matchActive,
        );
        if (!waitingForOpponent || !turn) {
          clearOpponentIdleWatch();
        } else {
          const previous = opponentIdleWatchRef.current;
          if (
            !previous
            || previous.matchToken !== matchToken
            || previous.activityTick !== activityTick
            || previous.turn !== turn
          ) {
            opponentIdleWatchRef.current = {
              matchToken,
              activityTick,
              turn,
              deadlineAt: Date.now() + OPPONENT_MOVE_TIMEOUT_MS,
            };
            opponentIdlePromptRef.current = false;
          }
        }

        const timeoutWaiver = timeoutWinWaiverRef.current;
        if (timeoutWaiver && (!roomSession || roomSession.code !== timeoutWaiver.tableCode || matchToken !== timeoutWaiver.matchToken)) {
          timeoutWinWaiverRef.current = null;
        }

        setMatchLiveState({
          matchToken,
          matchActive: Boolean(payload.matchActive),
          winner,
          localColor,
        });
        if (winner && localColor && matchToken) {
          const synthetic: LegacyMatchFinishedMessage = {
            source: "tavla-legacy",
            type: "match-finished",
            matchToken,
            winner,
            loser: winner === "white" ? "black" : "white",
            reason: "normal",
            localColor,
          };
          void handleLegacyMatchFinished(synthetic);
        }
        return;
      }

      if (payload.type === "match-finished") {
        void handleLegacyMatchFinished(payload);
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [currentProfile.userId, currentProfile.displayName, handleLegacyMatchFinished, sendTableChat, syncTableChatToIframe, roomSession, mode]);

  useEffect(() => {
    if (!roomSession || roomSession.role !== "player" || mode !== "local") {
      clearOpponentIdleWatch();
      return;
    }
    const timer = window.setInterval(() => {
      const tracker = opponentIdleWatchRef.current;
      if (!tracker) return;
      if (opponentIdlePromptRef.current) return;

      const latest = latestLegacyStateRef.current;
      const waitingForOpponent = Boolean(
        latest.matchActive
        && !latest.winner
        && latest.localColor
        && latest.turn
        && latest.turn !== latest.localColor,
      );
      if (!waitingForOpponent) {
        clearOpponentIdleWatch();
        return;
      }
      if (Date.now() < tracker.deadlineAt) return;

      opponentIdlePromptRef.current = true;
      const accepted = window.confirm(
        "Rakibiniz 1 dakikadir hamle yapmiyor. Oyunu kazanmak istiyor musunuz?\nTamam: Kazan\nIptal: Beklemek istiyorum",
      );
      opponentIdlePromptRef.current = false;

      const activeTracker = opponentIdleWatchRef.current;
      const stillWaiting = latestLegacyStateRef.current.matchActive
        && !latestLegacyStateRef.current.winner
        && latestLegacyStateRef.current.localColor
        && latestLegacyStateRef.current.turn
        && latestLegacyStateRef.current.turn !== latestLegacyStateRef.current.localColor;
      if (!activeTracker || !stillWaiting) {
        clearOpponentIdleWatch();
        return;
      }

      if (accepted) {
        claimTimeoutWinByInactivity(activeTracker.matchToken || latestLegacyStateRef.current.matchToken);
        clearOpponentIdleWatch();
      } else {
        opponentIdleWatchRef.current = {
          ...activeTracker,
          deadlineAt: Date.now() + OPPONENT_MOVE_TIMEOUT_MS,
        };
        setLobbyNotice("Bekleme istegin kaydedildi. Rakibe 1 dakika daha sure verildi.");
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [roomSession, mode, currentRoomTable?.roomCode, currentProfile.userId]);

  useEffect(() => {
    void refreshGameRules();
  }, []);

  useEffect(() => {
    if (!member || member.role !== "admin") {
      setAdminUsers([]);
      setAdminError("");
      setAdminNotice("");
      setAdminPointDrafts({});
      setAdminDeltaDrafts({});
      return;
    }
    void loadAdminState(member.id);
  }, [member?.id, member?.role]);

  useEffect(() => {
    if (!isAdmin) return;
    setAdminPointDrafts((prev) => {
      const next: Record<string, string> = {};
      adminUsers.forEach((user) => {
        next[user.id] = prev[user.id] ?? String(user.points);
      });
      return next;
    });
    setAdminDeltaDrafts((prev) => {
      const next: Record<string, string> = {};
      adminUsers.forEach((user) => {
        next[user.id] = prev[user.id] ?? "";
      });
      return next;
    });
  }, [adminUsers, isAdmin]);

  useEffect(() => {
    let cancelled = false;
    const syncMemberFromSession = async () => {
      const session = loadMemberSession();
      if (!session) {
        if (!cancelled) {
          setMember(null);
          setMemberAvatarDraft(DEFAULT_AVATAR_BY_GENDER.unknown);
        }
        return;
      }
      const user = await loadMemberFromSession(session);
      if (cancelled) return;
      if (!user) {
        window.localStorage.removeItem(MEMBER_SESSION_KEY);
        setMember(null);
        setMemberAvatarDraft(DEFAULT_AVATAR_BY_GENDER.unknown);
        return;
      }
      setMember(user);
      setMemberAvatarDraft(user.avatarId);
      setGuestName(user.displayName);
    };
    void syncMemberFromSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (member) return;
    if (realtimeStatus !== "online") {
      const fallbackName = `Misafir ${getGuestFallbackNo(guestId)}`;
      if (guestName !== fallbackName) {
        setGuestName(fallbackName);
      }
      return;
    }
    const existingNo = lobbyState.guestLabels[guestId];
    if (Number.isInteger(existingNo) && existingNo > 0) {
      const desiredName = `Misafir ${existingNo}`;
      if (guestName !== desiredName) {
        setGuestName(desiredName);
      }
      return;
    }

    let resolvedGuestNo = 0;

    const next = writeLobby((current) => {
      const guestLabels = { ...current.guestLabels };
      let guestCounter = Number.isInteger(current.guestCounter) && current.guestCounter >= 0 ? current.guestCounter : 0;
      let myNo = guestLabels[guestId];
      let changed = false;

      if (!myNo) {
        const usedNos = new Set<number>(Object.values(guestLabels).filter((value) => Number.isInteger(value) && value > 0));
        let nextNo = Math.max(
          guestCounter + 1,
          (usedNos.size ? Math.max(...Array.from(usedNos)) + 1 : 1),
        );
        while (usedNos.has(nextNo)) nextNo += 1;
        myNo = nextNo;
        guestCounter = Math.max(guestCounter, nextNo);
        guestLabels[guestId] = myNo;
        changed = true;
      }

      resolvedGuestNo = myNo;
      if (!changed) return current;
      return {
        ...current,
        guestCounter,
        guestLabels,
        updatedAt: Date.now(),
      };
    });

    const source = next ?? getCurrentLobbyState();
    const finalGuestNo = source.guestLabels[guestId] ?? resolvedGuestNo ?? getGuestFallbackNo(guestId);
    const desiredName = `Misafir ${finalGuestNo}`;
    if (guestName !== desiredName) {
      setGuestName(desiredName);
    }
  }, [member, guestId, guestName, realtimeStatus, lobbyState.guestCounter, lobbyState.guestLabels]);

  useEffect(() => {
    window.localStorage.setItem(GUEST_STORAGE_KEY, safeGuestName);
  }, [safeGuestName]);

  useEffect(() => {
    if (member) return;
    const normalizedName = sanitizeGuestName(safeGuestName) || "Misafir";
    setGuestProfile((prev) => {
      const desiredUserId = `guest-${guestId}`;
      const sameUser = prev.userId === desiredUserId;
      const sameName = prev.displayName === normalizedName;
      if (sameUser && sameName) return prev;
      const next = {
        ...prev,
        userId: desiredUserId,
        displayName: normalizedName,
      } satisfies GuestProfile;
      saveGuestProfile(next);
      return next;
    });
  }, [member, safeGuestName, guestId]);

  useEffect(() => {
    if (member) return;
    saveGuestProfile(guestProfile);
  }, [guestProfile, member]);

  useEffect(() => {
    if (!isRoomMode || mode === "local") return;
    setMode("local");
  }, [isRoomMode, mode]);

  useEffect(() => {
    const prev = lobbyPrevChatCountRef.current;
    const next = lobbyChatRows.length;
    const added = Math.max(0, next - prev);
    lobbyPrevChatCountRef.current = next;

    if (lobbyChatAutoScroll) {
      scrollLobbyChatToBottom();
      setLobbyChatUnread(0);
      return;
    }

    if (added > 0) {
      setLobbyChatUnread((count) => count + added);
    }
  }, [lobbyChatRows, lobbyChatAutoScroll]);

  useEffect(() => {
    const prev = roomPrevChatCountRef.current;
    const next = roomChatRows.length;
    const added = Math.max(0, next - prev);
    roomPrevChatCountRef.current = next;

    if (roomChatAutoScroll) {
      scrollRoomChatToBottom();
      setRoomChatUnread(0);
      return;
    }

    if (added > 0) {
      setRoomChatUnread((count) => count + added);
    }
  }, [roomChatRows, roomChatAutoScroll]);

  useEffect(() => {
    roomPrevChatCountRef.current = roomChatRows.length;
    setRoomChatAutoScroll(true);
    setRoomChatUnread(0);
    window.requestAnimationFrame(() => {
      scrollRoomChatToBottom();
    });
  }, [roomChatTab, roomChatRows.length]);

  useEffect(() => {
    syncTableChatToIframe();
  }, [syncTableChatToIframe, tableChatRows, canViewTableChat, canWriteTableChat, roomSession, mode, iframeKey]);

  useEffect(() => {
    syncRoomStartGateToIframe();
  }, [syncRoomStartGateToIframe, roomSession, roomStartState?.bothSeated, roomStartState?.started, mode, iframeKey]);

  useEffect(() => {
    if (!roomSession || roomSession.role !== "player") return;
    const timer = window.setInterval(() => {
      syncRoomStartGateToIframe();
    }, 1200);
    return () => window.clearInterval(timer);
  }, [syncRoomStartGateToIframe, roomSession, roomStartState?.bothSeated, roomStartState?.started, mode, iframeKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (roomSession) {
      url.searchParams.set("room", roomSession.code);
      url.searchParams.set("seat", roomSession.seat);
      url.searchParams.set("name", safeGuestName);
      url.searchParams.set("room_name", roomSession.roomName);
      url.searchParams.set("table", String(roomSession.tableNo));
      if (roomSession.role === "spectator") {
        url.searchParams.set("observer", "1");
      } else {
        url.searchParams.delete("observer");
      }
    } else {
      url.searchParams.delete("room");
      url.searchParams.delete("seat");
      url.searchParams.delete("name");
      url.searchParams.delete("room_name");
      url.searchParams.delete("table");
      url.searchParams.delete("observer");
    }
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [roomSession, safeGuestName]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(LOBBY_SYNC_CHANNEL);
    lobbyChannelRef.current = channel;
    const onMessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type !== "lobby-sync") return;
      refreshLobbyFromStorage();
    };
    channel.addEventListener("message", onMessage);
    return () => {
      channel.removeEventListener("message", onMessage);
      channel.close();
      if (lobbyChannelRef.current === channel) {
        lobbyChannelRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === LOBBY_STATE_KEY) {
        refreshLobbyFromStorage();
      }
      if (event.key === MEMBER_SESSION_KEY) {
        const syncMemberFromSession = async () => {
          const session = loadMemberSession();
          if (!session) {
            setMember(null);
            setMemberAvatarDraft(DEFAULT_AVATAR_BY_GENDER.unknown);
            return;
          }
          const user = await loadMemberFromSession(session);
          if (!user) {
            window.localStorage.removeItem(MEMBER_SESSION_KEY);
            setMember(null);
            setMemberAvatarDraft(DEFAULT_AVATAR_BY_GENDER.unknown);
            return;
          }
          setMember(user);
          setMemberAvatarDraft(user.avatarId);
          setGuestName(user.displayName);
        };
        void syncMemberFromSession();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const latest = getCurrentLobbyState();
      const cleanedTables = cleanupStaleAndPrune(latest.tables);
      const cleanedPresence = cleanupPresenceRows(latest.presence);
      const removedRoomCodes = latest.tables
        .filter((table) => !cleanedTables.tables.some((nextTable) => nextTable.id === table.id || nextTable.roomCode === table.roomCode))
        .map((table) => table.roomCode);
      const nextClosedTableRooms = markClosedTableRooms(latest.closedTableRooms, removedRoomCodes);
      const hasChange = cleanedTables.changed || cleanedPresence.changed;
      const normalized = {
        ...latest,
        tables: cleanedTables.tables,
        presence: cleanedPresence.presence,
        closedTableRooms: nextClosedTableRooms,
        updatedAt: hasChange ? Date.now() : latest.updatedAt,
      };
      if (hasChange) {
        persistLobbyState(normalized);
        return;
      }
      if (JSON.stringify(nextClosedTableRooms) !== JSON.stringify(latest.closedTableRooms)) {
        persistLobbyState({ ...normalized, updatedAt: Date.now() });
        return;
      }
      setLobbyState(normalized);
    }, 8_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!roomSession || roomSession.role !== "player") return;
    syncRoomSeatHeartbeat();
    const timer = window.setInterval(() => syncRoomSeatHeartbeat(), HEARTBEAT_MS);
    return () => window.clearInterval(timer);
  }, [
    roomSession,
    currentProfile.userId,
    currentProfile.username,
    currentProfile.displayName,
    currentProfile.gender,
    currentProfile.avatarId,
    currentProfile.points,
    currentProfile.stats,
    appSessionId,
  ]);

  useEffect(() => {
    if (roomSession) return;
    releaseSeatOnly();
    const timer = window.setInterval(() => {
      releaseSeatOnly();
    }, 1200);
    return () => window.clearInterval(timer);
  }, [roomSession, appSessionId, currentProfile.userId]);

  useEffect(() => {
    if (!roomSession || roomSession.role !== "player" || !currentRoomTable) {
      leavePermissionPromptKeyRef.current = "";
      return;
    }
    const myUserId = sanitizeGuestId(currentProfile.userId);
    if (!myUserId) {
      leavePermissionPromptKeyRef.current = "";
      return;
    }
    const mySeat = roomSession.seat === "white" ? currentRoomTable.white : currentRoomTable.black;
    const opponentSeat = roomSession.seat === "white" ? currentRoomTable.black : currentRoomTable.white;
    const requestUserId = sanitizeGuestId(currentRoomTable.leavePermissionRequestByUserId ?? "");
    const grantedUserId = sanitizeGuestId(currentRoomTable.leavePermissionGrantedToUserId ?? "");
    const opponentUserId = sanitizeGuestId(opponentSeat?.userId ?? "");

    if (
      !mySeat
      || !opponentSeat
      || !requestUserId
      || requestUserId !== opponentUserId
      || grantedUserId === requestUserId
    ) {
      leavePermissionPromptKeyRef.current = "";
      return;
    }

    const promptKey = `${currentRoomTable.roomCode}:${requestUserId}:${currentRoomTable.setPlayed}:${currentRoomTable.setResultTokens.length}`;
    if (leavePermissionPromptKeyRef.current === promptKey) return;
    leavePermissionPromptKeyRef.current = promptKey;

    const requesterName = opponentSeat.displayName || "Rakip";
    const accepted = window.confirm(
      `${requesterName} puan kaybetmeden masadan ayrilmak icin izin istiyor. Izin veriyor musun?`,
    );
    if (accepted) {
      approveLeaveWithoutPenalty();
    } else {
      setLobbyNotice(`${requesterName} icin ayrilma iznini su an reddettin.`);
    }
  }, [roomSession, currentRoomTable, currentProfile.userId, approveLeaveWithoutPenalty]);

  useEffect(() => {
    if (!roomSession || roomSession.role !== "player" || !currentRoomTable) {
      leavePermissionAutoLeavingRef.current = false;
      return;
    }
    const myUserId = sanitizeGuestId(currentProfile.userId);
    const requestUserId = sanitizeGuestId(currentRoomTable.leavePermissionRequestByUserId ?? "");
    const grantedUserId = sanitizeGuestId(currentRoomTable.leavePermissionGrantedToUserId ?? "");
    const shouldAutoLeave = Boolean(
      myUserId
      && requestUserId
      && grantedUserId
      && requestUserId === myUserId
      && grantedUserId === myUserId,
    );
    if (!shouldAutoLeave) {
      leavePermissionAutoLeavingRef.current = false;
      return;
    }
    if (leavePermissionAutoLeavingRef.current) return;
    leavePermissionAutoLeavingRef.current = true;
    void leaveRoomAndGoLobby();
  }, [roomSession, currentRoomTable, currentProfile.userId, leaveRoomAndGoLobby]);

  useEffect(() => {
    const safeUserId = sanitizeGuestId(currentProfile.userId);
    if (!safeUserId) return;
    const notices = sortTables(lobbyState.tables).filter(
      (table) => table.inviteNoticeForUserId === safeUserId && table.inviteNoticeText && table.inviteNoticeId,
    );
    if (notices.length === 0) return;
    const latest = notices[notices.length - 1];
    if (latest.inviteNoticeText) {
      setLobbyNotice(latest.inviteNoticeText);
    }
    writeLobby((current) => {
      let changed = false;
      const tables = current.tables.map((table) => {
        if (table.inviteNoticeForUserId !== safeUserId || !table.inviteNoticeId) return table;
        changed = true;
        return normalizeTableAccess({
          ...table,
          inviteNoticeId: null,
          inviteNoticeForUserId: null,
          inviteNoticeText: null,
        });
      });
      if (!changed) return current;
      return {
        ...current,
        tables,
        updatedAt: Date.now(),
      };
    });
  }, [lobbyState.tables, currentProfile.userId]);

  useEffect(() => {
    if (!roomSession || roomSession.role !== "spectator" || !currentRoomTable?.isPrivate) return;
    setRoomSession(null);
    setViewMode("lobby");
    setLobbyNotice("Ozel masalara izleyici girisi kapali.");
  }, [roomSession, currentRoomTable]);

  useEffect(() => {
    syncLobbyPresence(true);
    const timer = window.setInterval(() => syncLobbyPresence(false), HEARTBEAT_MS);
    return () => window.clearInterval(timer);
  }, [
    appSessionId,
    currentProfile.userId,
    currentProfile.username,
    currentProfile.displayName,
    currentProfile.gender,
    currentProfile.avatarId,
    currentProfile.points,
    currentProfile.stats,
    member,
    realtimeStatus,
    lobbyState.guestLabels,
    guestId,
  ]);

  useEffect(() => {
    if (!roomSession) {
      roomMissingSinceRef.current = null;
      return;
    }
    if (currentRoomTable) {
      roomMissingSinceRef.current = null;
      return;
    }
    if (!roomMissingSinceRef.current) {
      roomMissingSinceRef.current = Date.now();
    }
    const roomCode = roomSession.code;
    const roomTableNo = roomSession.tableNo;
    const timer = window.setTimeout(() => {
      void (async () => {
        await syncRealtimeViaHttp("room-missing-check");
        const localSnapshot = loadLobbyState();
        const remoteSnapshot = readRealtimeLobbyState();
        const latest = remoteSnapshot ? mergeLobbyStates(localSnapshot, remoteSnapshot) : localSnapshot;
        const stillExists = latest.tables.some((table) => table.id === roomTableNo || table.roomCode === roomCode);
        if (stillExists) {
          roomMissingSinceRef.current = null;
          setLobbyState(latest);
          return;
        }
        const missingSince = roomMissingSinceRef.current ?? Date.now();
        if (Date.now() - missingSince < ROOM_MISSING_CLOSE_GRACE_MS) {
          return;
        }
        roomMissingSinceRef.current = null;
        setRoomSession((current) => {
          if (!current) return current;
          if (current.code !== roomCode || current.tableNo !== roomTableNo) return current;
          return null;
        });
        clearOpponentIdleWatch();
        timeoutWinWaiverRef.current = null;
        leavePermissionPromptKeyRef.current = "";
        leavePermissionAutoLeavingRef.current = false;
        setViewMode("lobby");
        setMatchLiveState({
          matchToken: "",
          matchActive: false,
          winner: null,
          localColor: null,
        });
        setLobbyNotice("Masa kapandi.");
      })();
    }, ROOM_MISSING_CHECK_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [roomSession, currentRoomTable, realtimeStatus]);

  useEffect(() => {
    if (viewMode === "lobby") return;
    setAccountMenuOpen(false);
  }, [viewMode]);

  useEffect(() => {
    const onBeforeUnload = () => {
      const latest = getCurrentLobbyState();
      const cleanedTables = cleanupStaleAndPrune(latest.tables).tables;
      const cleared = clearSessionFromTables(cleanedTables, appSessionId);
      const prunedTables = cleanupStaleAndPrune(cleared.tables).tables;
      const closedRoomCodes = cleared.tables
        .filter((table) => !table.white && !table.black)
        .map((table) => table.roomCode);
      const nextClosedTableRooms = markClosedTableRooms(latest.closedTableRooms, closedRoomCodes);
      const cleanedPresence = cleanupPresenceRows(latest.presence).presence;
      const nextPresence = cleanedPresence.filter((entry) => entry.sessionId !== appSessionId);
      const tableChanged = cleared.changed || JSON.stringify(cleanedTables) !== JSON.stringify(prunedTables);
      const closedChanged = JSON.stringify(nextClosedTableRooms) !== JSON.stringify(latest.closedTableRooms);
      const presenceChanged = nextPresence.length !== latest.presence.length || cleanedPresence.length !== latest.presence.length;
      if (!tableChanged && !presenceChanged && !closedChanged) return;
      const next = {
        ...latest,
        tables: prunedTables,
        presence: nextPresence,
        closedTableRooms: nextClosedTableRooms,
        updatedAt: Date.now(),
      };
      saveJson(LOBBY_STATE_KEY, next);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [appSessionId, currentProfile.userId]);

  return (
    <main className="my-shell">
      {viewMode === "lobby" ? (
        <header className="my-topbar">
          <div className="my-topbar-left">
            {!roomSession ? (
              <>
                <button className="my-top-btn my-btn-open" onClick={onOpenTable}>
                  Masa Ac
                </button>
                <button className="my-top-btn my-btn-play" onClick={onQuickPlay}>
                  Hemen Oyna
                </button>
                <button className="my-top-btn my-btn-bot" onClick={startBotGame}>
                  Bota Karsi
                </button>
              </>
            ) : null}
            {roomSession ? (
              <button className="my-top-btn my-btn-danger" onClick={leaveRoomAndGoLobby}>
                Masadan Kalk
              </button>
            ) : null}
          </div>

          <div className="my-topbar-right my-topbar-account-wrap">
            <button
              className="my-account-trigger"
              onClick={() => setAccountMenuOpen((current) => !current)}
              title={member ? "Profil ve ayarlar" : "Uyelik ve giris"}
            >
              <AvatarBadge avatarId={currentProfile.avatarId} gender={currentProfile.gender} size="sm" />
              <span>{member ? member.displayName : "Misafir"}</span>
            </button>
            {!member ? (
              <>
                <button className="my-top-btn my-btn-member" onClick={() => openAccountMenu("register")}>
                  Uye Ol
                </button>
                <button className="my-top-btn my-btn-member-alt" onClick={() => openAccountMenu("login")}>
                  Giris
                </button>
              </>
            ) : (
              <button className="my-top-btn my-btn-member-alt" onClick={() => setAccountMenuOpen((current) => !current)}>
                Ayarlar
              </button>
            )}
            {accountMenuOpen ? (
              <section className="my-account-menu">
                {member ? (
                  <div className="my-account-member">
                    <div className="my-member-avatar-row">
                      <AvatarBadge avatarId={member.avatarId} gender={member.gender} size="lg" />
                      <div className="my-member-avatar-meta">
                        <p className="line">
                          <strong>{member.displayName}</strong>
                        </p>
                        <p className="line">Kullanici: @{member.username}</p>
                      </div>
                    </div>
                    <p className="line">Puan: {member.points}</p>
                    <p className="line">Oyun: {member.stats.gamesPlayed} / K: {member.stats.wins} / M: {member.stats.losses}</p>
                    <div className="my-avatar-picker">
                      {avatarOptionsForGender(member.gender).map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          className={`my-avatar-option ${memberAvatarDraft === preset.id ? "active" : ""}`}
                          onClick={() => setMemberAvatarDraft(preset.id)}
                          disabled={memberActionBusy}
                          title={preset.label}
                        >
                          <AvatarBadge avatarId={preset.id} gender={preset.gender} size="sm" />
                        </button>
                      ))}
                    </div>
                    <button
                      className="my-action-btn soft"
                      onClick={onChangeMyAvatar}
                      disabled={memberActionBusy || memberAvatarDraft === member.avatarId}
                    >
                      {memberActionBusy ? "Isleniyor..." : "Avatari Degistir"}
                    </button>
                    <div className="my-auth-form">
                      <input
                        className="my-input"
                        type="password"
                        placeholder="Mevcut sifre"
                        value={memberPasswordCurrent}
                        onChange={(e) => setMemberPasswordCurrent(e.target.value)}
                        disabled={memberActionBusy}
                      />
                      <input
                        className="my-input"
                        type="password"
                        placeholder="Yeni sifre"
                        value={memberPasswordNext}
                        onChange={(e) => setMemberPasswordNext(e.target.value)}
                        disabled={memberActionBusy}
                      />
                      <button className="my-action-btn" onClick={onChangeMyPassword} disabled={memberActionBusy}>
                        {memberActionBusy ? "Isleniyor..." : "Sifre Degistir"}
                      </button>
                    </div>
                    {memberNotice ? <p className="my-notice my-notice-soft">{memberNotice}</p> : null}
                    <div className="my-inline-actions">
                      <button className="my-action-btn soft" onClick={onLogoutMember}>
                        Cikis
                      </button>
                      {isAdmin ? (
                        <button
                          className={`my-action-btn ${showAdminPanelInLobby ? "" : "soft"}`}
                          onClick={() => setShowAdminPanelInLobby((current) => !current)}
                        >
                          {showAdminPanelInLobby ? "Admini Gizle" : "Admini Goster"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="my-auth-form my-account-auth">
                    <div className="my-auth-toggle">
                      <button
                        className={authMode === "register" ? "active" : ""}
                        onClick={() => {
                          setAuthMode("register");
                          setAuthAvatarId(DEFAULT_AVATAR_BY_GENDER[sanitizeMemberGender(authGender)]);
                        }}
                        disabled={authBusy}
                      >
                        Uye Ol
                      </button>
                      <button className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")} disabled={authBusy}>
                        Giris
                      </button>
                    </div>
                    {authMode === "register" ? (
                      <>
                        <input
                          className="my-input"
                          placeholder="Kullanici adi (or: gokcek34)"
                          value={authUsername}
                          onChange={(e) => setAuthUsername(e.target.value)}
                          disabled={authBusy}
                        />
                        <input
                          className="my-input"
                          placeholder="Gorunen ad"
                          value={authDisplayName}
                          onChange={(e) => setAuthDisplayName(e.target.value)}
                          disabled={authBusy}
                        />
                        <select
                          className="my-input"
                          value={authGender}
                          onChange={(e) => {
                            const nextGender = sanitizeMemberGender(e.target.value);
                            setAuthGender(nextGender);
                            setAuthAvatarId(DEFAULT_AVATAR_BY_GENDER[nextGender]);
                          }}
                          disabled={authBusy}
                        >
                          <option value="unknown">Cinsiyet secin</option>
                          <option value="female">Kadin</option>
                          <option value="male">Erkek</option>
                        </select>
                        <div className="my-avatar-picker">
                          {avatarOptionsForGender(authGender).map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              className={`my-avatar-option ${authAvatarId === preset.id ? "active" : ""}`}
                              onClick={() => setAuthAvatarId(preset.id)}
                              disabled={authBusy}
                              title={preset.label}
                            >
                              <AvatarBadge avatarId={preset.id} gender={preset.gender} size="sm" />
                            </button>
                          ))}
                        </div>
                        <input
                          className="my-input"
                          placeholder="E-posta"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          disabled={authBusy}
                        />
                        <input
                          className="my-input"
                          type="password"
                          placeholder="Sifre"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          disabled={authBusy}
                        />
                        <button className="my-action-btn" onClick={onRegisterMember} disabled={authBusy}>
                          {authBusy ? "Isleniyor..." : "Uye Ol ve Basla"}
                        </button>
                      </>
                    ) : (
                      <>
                        <input
                          className="my-input"
                          placeholder="Kullanici adi veya E-posta"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          disabled={authBusy}
                        />
                        <input
                          className="my-input"
                          type="password"
                          placeholder="Sifre"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          disabled={authBusy}
                        />
                        <button className="my-action-btn" onClick={onLoginMember} disabled={authBusy}>
                          {authBusy ? "Isleniyor..." : "Giris Yap"}
                        </button>
                        <p className="line">Sifremi unuttum</p>
                        <input
                          className="my-input"
                          placeholder="Kayitli e-posta"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          disabled={forgotBusy}
                        />
                        <input
                          className="my-input"
                          type="password"
                          placeholder="Yeni sifre"
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          disabled={forgotBusy}
                        />
                        <button className="my-action-btn soft" onClick={onForgotPassword} disabled={forgotBusy}>
                          {forgotBusy ? "Isleniyor..." : "E-posta ile Sifre Sifirla"}
                        </button>
                      </>
                    )}
                    {memberNotice ? <p className="my-notice my-notice-soft">{memberNotice}</p> : null}
                    {authError ? <p className="my-error">{authError}</p> : null}
                  </div>
                )}
              </section>
            ) : null}
          </div>
        </header>
      ) : null}

      {viewMode === "lobby" ? (
        <section className="my-lobby-layout">
          <div className="my-lobby-main">
            <div className="my-lobby-header">
              <h2>{lobbyState.lobbyName}</h2>
              <p>Acik masalar</p>
            </div>

            <div className="my-lobby-controls">
              <label className="my-field">
                <span>Oyuncu</span>
                <input
                  className="my-input"
                  value={guestName}
                  maxLength={24}
                  onChange={(e) => setGuestName(e.target.value)}
                  disabled
                />
              </label>
              <label className="my-field">
                <span>Oda Kodu</span>
                <input
                  className="my-input"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(sanitizeRoomCode(e.target.value))}
                  placeholder="AB12CD"
                />
              </label>
              <div className="my-seat-toggle">
                <button className={`my-seat-btn ${joinSeat === "white" ? "active" : ""}`} onClick={() => setJoinSeat("white")}>
                  Beyaz
                </button>
                <button className={`my-seat-btn ${joinSeat === "black" ? "active" : ""}`} onClick={() => setJoinSeat("black")}>
                  Siyah
                </button>
              </div>
              <div className="my-inline-actions">
                <button className="my-action-btn" onClick={onJoinByCode}>
                  Koda Katil
                </button>
                <button className="my-action-btn soft" onClick={onOpenTable}>
                  Yeni Masa
                </button>
              </div>
            </div>

            {lobbyNotice ? <p className="my-notice">{lobbyNotice}</p> : null}
            {incomingInviteTable ? (
              <div className="my-invite-banner">
                <p>
                  Masa {incomingInviteTable.id} icin davet aldin.
                  {incomingInviteTable.isPrivate ? " (Ozel masa)" : ""}
                </p>
                <div className="my-invite-banner-actions">
                  <button className="my-action-btn" onClick={() => acceptTableInvite(incomingInviteTable.id)}>
                    Kabul Et
                  </button>
                  <button className="my-action-btn soft" onClick={() => rejectTableInvite(incomingInviteTable.id)}>
                    Reddet
                  </button>
                </div>
              </div>
            ) : null}

            <div className="my-lobby-table-zone">
              {openedTables.length === 0 ? (
                <div className="my-empty-state">
                  Henuz acik masa yok. <strong>Masa Ac</strong> ile ilk masayi acabilirsin.
                </div>
              ) : (
                <div className="my-table-grid">
                  {openedTables.map((table) => {
                    const status = tableStatus(table);
                    const tableHasOpenSeat = Boolean(getOpenSeat(table));
                    const tableOwnerName =
                      (table.white?.userId === table.ownerUserId ? table.white.displayName : null)
                      ?? (table.black?.userId === table.ownerUserId ? table.black.displayName : null)
                      ?? "Masa Sahibi";
                    const isOwnerHere = isTableOwnerForUser(table, currentProfile.userId);
                    const mySeatHere: Seat | null =
                      table.white?.sessionId === appSessionId
                        ? "white"
                        : table.black?.sessionId === appSessionId
                          ? "black"
                          : null;
                    const canWatchTable = !table.isPrivate && !mySeatHere && !myCurrentSeat && Boolean(table.white || table.black);
                    const showWatchEye = !table.isPrivate;
                    const canAdminClose = isAdmin;

                    return (
                      <article key={table.id} className={`my-table-card ${status}`}>
                        <button
                          className="my-watch-eye-btn"
                          onClick={() => watchTableAsSpectator(table)}
                          disabled={!canWatchTable}
                          title={canWatchTable ? "Masayi izleyici olarak ac" : table.isPrivate ? "Ozel masalar izleyiciye kapali" : "Izlemek icin masada oturmamalisin"}
                          style={showWatchEye ? undefined : { display: "none" }}
                          aria-label="Masayi izle"
                        >
                          👁
                        </button>
                        <div className="my-table-card-head">
                          <strong>Masa {table.id}</strong>
                          <span className="my-table-status">
                            {status === "full" ? "Dolu" : status === "waiting" ? "Bekliyor" : "Bos"}
                          </span>
                        </div>
                        <div className="my-table-meta-row">
                          <span>Sahip: {tableOwnerName}</span>
                          {table.isPrivate ? <span className="my-private-badge">Ozel</span> : null}
                        </div>

                        <div className="my-table-board">
                          <div className="my-seat-slot white">{seatCell(table, "white")}</div>
                          <div className="my-board-mid">{table.id}</div>
                          <div className="my-seat-slot black">{seatCell(table, "black")}</div>
                        </div>
                        <div className="my-table-seat-names">
                          <span>Beyaz: {table.white?.displayName ?? "-"}</span>
                          <span>Siyah: {table.black?.displayName ?? "-"}</span>
                        </div>

                        <div className="my-table-footer">
                          <span className="my-table-code">Kod: {table.roomCode}</span>
                          {mySeatHere || canAdminClose ? (
                            <div className="my-mini-actions">
                              {mySeatHere ? (
                                <button className="my-action-btn" onClick={() => goToTable(table, mySeatHere)}>
                                  Masaya Git
                                </button>
                              ) : null}
                              {mySeatHere && isOwnerHere ? (
                                <button
                                  className="my-action-btn soft"
                                  onClick={() => openInvitePicker(table)}
                                  disabled={!tableHasOpenSeat}
                                  title={tableHasOpenSeat ? "Oyuncu davet et" : "Masa dolu oldugu icin davet kapali"}
                                >
                                  Davet Et
                                </button>
                              ) : null}
                              {mySeatHere && isOwnerHere ? (
                                <button
                                  className={`my-action-btn ${table.isPrivate ? "" : "soft"}`}
                                  onClick={() => setTablePrivateMode(table.id, !table.isPrivate)}
                                >
                                  {table.isPrivate ? "Ozeli Kapat" : "Ozel Yap"}
                                </button>
                              ) : null}
                              {canAdminClose ? (
                                <button className="my-action-btn danger" onClick={() => adminCloseTable(table.id)}>
                                  Masayi Kapat
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <section className="my-chat-card my-chat-card-lobby">
              <div className="my-chat-compose my-chat-compose-lobby">
                <input
                  className="my-input"
                  placeholder={canWriteLobbyChat ? "Lobiye mesaj yaz..." : "Yazmak icin uye girisi yap"}
                  value={lobbyChatInput}
                  maxLength={CHAT_TEXT_MAX}
                  onChange={(e) => setLobbyChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    sendLobbyChat(lobbyChatInput);
                  }}
                  disabled={!canWriteLobbyChat}
                />
                <button
                  className="my-action-btn"
                  onClick={() => sendLobbyChat(lobbyChatInput)}
                  disabled={!canWriteLobbyChat || !lobbyDraft}
                >
                  Gonder
                </button>
              </div>

              <div className="my-chat-head my-chat-head-no-title">
                <div className="my-chat-head-actions">
                  <span>{lobbyChatRows.length} mesaj</span>
                  {!lobbyChatAutoScroll || lobbyChatUnread > 0 ? (
                    <button
                      className="my-action-btn soft my-chat-jump-btn"
                      onClick={() => {
                        setLobbyChatAutoScroll(true);
                        setLobbyChatUnread(0);
                        scrollLobbyChatToBottom();
                      }}
                    >
                      {lobbyChatUnread > 0 ? `Sona Git (${lobbyChatUnread})` : "Sona Git"}
                    </button>
                  ) : null}
                </div>
              </div>

              <div ref={lobbyChatListRef} className="my-chat-list my-chat-list-lobby" onScroll={onLobbyChatScroll}>
                {lobbyChatRows.length === 0 ? (
                  <p className="my-chat-empty">Bu oturumda henuz lobi mesaji yok.</p>
                ) : (
                  lobbyChatRows.map((message) => (
                    <article key={message.id} className="my-chat-row">
                      <div className="my-chat-meta">
                        <strong>{message.displayName}</strong>
                        <time>{formatChatTime(message.at)}</time>
                      </div>
                      <p>{message.text}</p>
                    </article>
                  ))
                )}
              </div>
              {!canWriteLobbyChat ? <p className="my-chat-hint">Lobiye sadece uye oyuncular yazabilir.</p> : null}
            </section>
          </div>

          <aside className="my-lobby-side">
            <section className="my-side-card my-side-card-online">
              <h3>Oyuncu Listesi</h3>
              <div className="my-online-head">
                <span>ISIM</span>
                <span>PUAN</span>
                <span>MASA</span>
                <span className="my-online-sr-only">Durum</span>
              </div>
              <div className="my-online-list">
                {onlineRows.map((row) => (
                  <div key={row.key} className="my-online-row">
                    <AvatarBadge avatarId={row.avatarId} gender={row.gender} size="sm" className="my-online-avatar" />
                    <button
                      type="button"
                      className="my-name-link name"
                      onClick={() => openPlayerProfile(row.userId, row.name, row.points, row.stats, row.username, row.gender, row.avatarId)}
                      title={`${row.name} profilini goster`}
                    >
                      {row.name}
                    </button>
                    <span className="points">{row.points}</span>
                    <span className="table">{row.tableNo ? String(row.tableNo) : "-"}</span>
                    <span className={`my-online-wave ${row.tableNo ? "active" : ""}`} aria-hidden="true" />
                  </div>
                ))}
              </div>
            </section>

            <section className="my-side-card my-side-card-sync">
              <h3>Canli Senkron</h3>
              <div className="my-sync-grid">
                <div className="my-sync-row">
                  <span>Durum</span>
                  <strong className={`my-sync-status ${realtimeStatus}`}>{realtimeStatus}</strong>
                </div>
                <div className="my-sync-row">
                  <span>WebSocket</span>
                  <strong>{websocketStateText(realtimeSocketReadyState)}</strong>
                </div>
                <div className="my-sync-row">
                  <span>Session</span>
                  <strong>{appSessionId.slice(0, 12)}</strong>
                </div>
                <div className="my-sync-row">
                  <span>Son Snapshot</span>
                  <strong>{formatSince(syncHealth.lastIncomingAt, syncHealthNow)}</strong>
                </div>
                <div className="my-sync-row">
                  <span>Snapshot Gonderen</span>
                  <strong>{syncHealth.lastIncomingSender || "-"}</strong>
                </div>
                <div className="my-sync-row">
                  <span>Counter</span>
                  <strong>{syncHealth.lastIncomingCounter || 0}</strong>
                </div>
                <div className="my-sync-row">
                  <span>WS Mesaj</span>
                  <strong>{formatSince(syncHealth.lastWsMessageAt, syncHealthNow)}</strong>
                </div>
                <div className="my-sync-row">
                  <span>HTTP Push</span>
                  <strong>{formatSince(syncHealth.lastHttpPushAt, syncHealthNow)}</strong>
                </div>
                <div className="my-sync-row">
                  <span>Push Sebebi</span>
                  <strong>{syncHealth.lastHttpPushReason || "-"}</strong>
                </div>
                <div className="my-sync-row">
                  <span>HTTP Pull</span>
                  <strong>{formatSince(syncHealth.lastHttpPullAt, syncHealthNow)}</strong>
                </div>
                <div className="my-sync-row">
                  <span>Pull Sebebi</span>
                  <strong>{syncHealth.lastHttpPullReason || "-"}</strong>
                </div>
              </div>
              <button className="my-action-btn soft" onClick={() => void runRealtimeHealthProbe()}>
                Simdi Test Et
              </button>
              {syncHealth.lastError ? <p className="my-error my-sync-error">{syncHealth.lastError}</p> : null}
            </section>

            {isAdmin && showAdminPanelInLobby ? (
              <section className="my-side-card">
                <h3>Admin Paneli</h3>
                <div className="my-admin-summary-grid">
                  <article className="my-admin-summary-card">
                    <span>Toplam Uye</span>
                    <strong>{adminSummary.totalUsers}</strong>
                  </article>
                  <article className="my-admin-summary-card">
                    <span>Admin Sayisi</span>
                    <strong>{adminSummary.adminCount}</strong>
                  </article>
                  <article className="my-admin-summary-card">
                    <span>Toplam Oyun</span>
                    <strong>{adminSummary.totalGames}</strong>
                  </article>
                  <article className="my-admin-summary-card">
                    <span>Ort. Puan</span>
                    <strong>{adminSummary.averagePoints}</strong>
                  </article>
                </div>

                <p className="line">Oyun Kurallari</p>
                <div className="my-admin-rules-grid">
                  <label className="my-field">
                    <span>Kazanma Puani</span>
                    <input
                      className="my-input"
                      type="number"
                      value={ruleDraft.winPoints}
                      onChange={(e) => {
                        const next = normalizeRuleNumber(e.target.value, ruleDraft.winPoints, -10_000, 10_000);
                        setRuleDraft((prev) => ({ ...prev, winPoints: next }));
                      }}
                      disabled={adminBusy}
                    />
                  </label>
                  <label className="my-field">
                    <span>Kaybetme Puani</span>
                    <input
                      className="my-input"
                      type="number"
                      value={ruleDraft.lossPoints}
                      onChange={(e) => {
                        const next = normalizeRuleNumber(e.target.value, ruleDraft.lossPoints, -10_000, 10_000);
                        setRuleDraft((prev) => ({ ...prev, lossPoints: next }));
                      }}
                      disabled={adminBusy}
                    />
                  </label>
                  <label className="my-field">
                    <span>Masadan Kalkma Cezasi</span>
                    <input
                      className="my-input"
                      type="number"
                      min={0}
                      value={ruleDraft.resignPenaltyPoints}
                      onChange={(e) => {
                        const next = normalizeRuleNumber(e.target.value, ruleDraft.resignPenaltyPoints, 0, 10_000);
                        setRuleDraft((prev) => ({ ...prev, resignPenaltyPoints: next }));
                      }}
                      disabled={adminBusy}
                    />
                  </label>
                </div>

                <div className="my-inline-actions">
                  <button className="my-action-btn" onClick={saveAdminRules} disabled={adminBusy}>
                    Kurallari Kaydet
                  </button>
                  <button className="my-action-btn soft" onClick={() => loadAdminState(member?.id)} disabled={adminBusy}>
                    Listeyi Yenile
                  </button>
                </div>

                <div className="my-admin-toolbar">
                  <input
                    className="my-input"
                    placeholder="Kullanici ara (ad, e-posta, id)"
                    value={adminQuery}
                    onChange={(e) => setAdminQuery(e.target.value)}
                    disabled={adminBusy}
                  />
                  <select
                    className="my-input"
                    value={adminRoleFilter}
                    onChange={(e) => setAdminRoleFilter((e.target.value as AdminRoleFilter) || "all")}
                    disabled={adminBusy}
                  >
                    <option value="all">Tum Roller</option>
                    <option value="admin">Sadece Admin</option>
                    <option value="user">Sadece Uye</option>
                  </select>
                  <select
                    className="my-input"
                    value={adminSort}
                    onChange={(e) => setAdminSort((e.target.value as AdminSortKey) || "points")}
                    disabled={adminBusy}
                  >
                    <option value="points">Puana Gore</option>
                    <option value="games">Oyuna Gore</option>
                    <option value="wins">Kazanmaya Gore</option>
                    <option value="losses">Kaybetmeye Gore</option>
                    <option value="resigns">Kacisa Gore</option>
                    <option value="createdAt">Yeni Uyeler</option>
                    <option value="name">Ada Gore</option>
                  </select>
                </div>

                {adminError ? <p className="my-error">{adminError}</p> : null}
                {adminNotice ? <p className="my-notice my-notice-soft">{adminNotice}</p> : null}

                <div className="my-admin-user-list">
                  {visibleAdminUsers.map((user) => (
                    <article key={user.id} className="my-admin-user-row">
                      <p className="line">
                        <strong>{user.displayName}</strong> / {user.role === "admin" ? "Admin" : "Uye"}
                      </p>
                      <p className="line">
                        {user.email} / Puan: {user.points} / Kayit: {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                      </p>
                      <p className="line">
                        Oyun: {user.stats.gamesPlayed} / K: {user.stats.wins} / M: {user.stats.losses} / Kacis: {user.stats.resigns}
                      </p>

                      <div className="my-admin-points-row">
                        <label className="my-field">
                          <span>Kesin Puan</span>
                          <input
                            className="my-input"
                            type="number"
                            value={adminPointDrafts[user.id] ?? String(user.points)}
                            onChange={(e) => updateAdminPointDraft(user.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key !== "Enter") return;
                              e.preventDefault();
                              applyAdminPointSet(user);
                            }}
                            disabled={adminBusy}
                          />
                        </label>
                        <button className="my-action-btn soft" onClick={() => applyAdminPointSet(user)} disabled={adminBusy}>
                          Puan Kaydet
                        </button>
                      </div>

                      <div className="my-admin-points-row">
                        <label className="my-field">
                          <span>Ozel Delta (+/-)</span>
                          <input
                            className="my-input"
                            type="text"
                            placeholder="+250 / -125"
                            value={adminDeltaDrafts[user.id] ?? ""}
                            onChange={(e) => updateAdminDeltaDraft(user.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key !== "Enter") return;
                              e.preventDefault();
                              applyAdminPointDelta(user);
                            }}
                            disabled={adminBusy}
                          />
                        </label>
                        <button className="my-action-btn soft" onClick={() => applyAdminPointDelta(user)} disabled={adminBusy}>
                          Delta Uygula
                        </button>
                      </div>

                      <div className="my-admin-actions">
                        <button
                          className="my-action-btn soft"
                          onClick={() => runAdminUserAction(user.id, "addPoints", { delta: 100 })}
                          disabled={adminBusy}
                        >
                          +100
                        </button>
                        <button
                          className="my-action-btn soft"
                          onClick={() => runAdminUserAction(user.id, "addPoints", { delta: -100 })}
                          disabled={adminBusy}
                        >
                          -100
                        </button>
                        <button
                          className="my-action-btn"
                          onClick={() => runAdminUserAction(user.id, "setRole", { role: user.role === "admin" ? "user" : "admin" })}
                          disabled={adminBusy}
                        >
                          {user.role === "admin" ? "Uye Yap" : "Admin Yap"}
                        </button>
                        <button
                          className="my-action-btn"
                          onClick={() => runAdminUserAction(user.id, "resetStats")}
                          disabled={adminBusy}
                        >
                          Istatistik Sifirla
                        </button>
                        <button
                          className="my-action-btn danger"
                          onClick={() => runAdminUserAction(user.id, "deleteUser")}
                          disabled={adminBusy || user.id === member?.id}
                        >
                          Sil
                        </button>
                      </div>
                    </article>
                  ))}
                  {visibleAdminUsers.length === 0 ? <p className="my-chat-empty">Filtreye uyan kullanici bulunamadi.</p> : null}
                </div>
              </section>
            ) : null}

          </aside>
        </section>
      ) : (
        <section className={`my-room-view my-room-view-topless ${roomSession ? "in-room" : "local-mode"}`}>
          <header className="my-room-header-strip">
            {roomSession ? (
              <>
                <strong>{roomSession.roomName}</strong>
                <span>/ Masa {roomSession.tableNo}</span>
                {roomStartState?.started ? <span className="my-room-start-indicator">Oyun basladi</span> : null}
              </>
            ) : (
              <strong>{mode === "bot" ? "Bot Modu" : "Yerel Oyun"}</strong>
            )}
          </header>

          <section className="my-room-main-layout">
            <aside className="my-game-controls my-room-left-controls">
              <section className="my-side-card my-room-card my-room-menu-card">
                <h3>Masa Menusu</h3>
                {roomSession ? (
                  <button className="my-action-btn danger my-room-main-leave" onClick={leaveRoomAndGoLobby}>
                    Masadan Kalk
                  </button>
                ) : null}
                <label className="my-field">
                  <span>Oyuncu</span>
                  <input
                    className="my-input"
                    value={guestName}
                    maxLength={24}
                    onChange={(e) => setGuestName(e.target.value)}
                    disabled
                  />
                </label>
                {roomSession ? (
                  <p className="line">
                    Oyun Modu: <code>Online Iki Oyuncu</code>
                  </p>
                ) : (
                  <div className="my-seat-toggle">
                    <button className={`my-seat-btn ${mode === "local" ? "active" : ""}`} onClick={() => onSelectMode("local")}>
                      Iki Oyuncu
                    </button>
                    <button className={`my-seat-btn ${mode === "bot" ? "active" : ""}`} onClick={() => onSelectMode("bot")}>
                      Bot
                    </button>
                  </div>
                )}
                {roomSession ? (
                  <section className="my-room-session-summary">
                    <p className="line">
                      <strong>Masa Oturumu</strong>
                    </p>
                    <p className="line">
                      Oda: <code>{roomSession.roomName}</code> ({roomSession.code})
                    </p>
                    <p className="line">
                      Masa: <code>{roomSession.tableNo}</code> / Sen:{" "}
                      <code>{roomSession.role === "spectator" ? roomRoleText(roomSession.role) : seatText(roomSession.seat)}</code>
                    </p>
                  </section>
                ) : null}
                {currentRoomTable && currentRoomIsOwner ? (
                  <div className="my-room-owner-inline">
                    <label className="my-room-inline-set-control">
                      <span>Masa Set Secimi</span>
                      <select
                        className="my-input my-room-set-select"
                        value={String(currentRoomTable.setCount)}
                        onChange={(e) => setTableSetCount(currentRoomTable.id, Number.parseInt(e.target.value, 10) || 1)}
                        disabled={!canEditCurrentRoomSetCount}
                      >
                        {[1, 2, 3, 4, 5].map((setNo) => (
                          <option key={setNo} value={setNo}>{setNo}</option>
                        ))}
                      </select>
                    </label>
                    {!canEditCurrentRoomSetCount ? (
                      <p className="line">Set sayisi seri baslamadan once ayarlanabilir.</p>
                    ) : null}
                    <button
                      className="my-action-btn soft"
                      onClick={() => openInvitePicker(currentRoomTable)}
                      disabled={!currentRoomHasOpenSeat}
                    >
                      Davet Et
                    </button>
                    <button
                      className={`my-action-btn ${currentRoomTable.isPrivate ? "" : "soft"}`}
                      onClick={() => setTablePrivateMode(currentRoomTable.id, !currentRoomTable.isPrivate)}
                    >
                      {currentRoomTable.isPrivate ? "Ozeli Kapat" : "Masa Ozel Yap"}
                    </button>
                    <button
                      className={`my-action-btn ${currentRoomTable.allowSpectatorChat === false ? "" : "soft"}`}
                      onClick={() => setSpectatorChatEnabled(currentRoomTable.id, currentRoomTable.allowSpectatorChat === false)}
                    >
                      {currentRoomTable.allowSpectatorChat === false ? "Izleyici Yazisini Ac" : "Izleyici Yazisini Kapat"}
                    </button>
                    <button className="my-action-btn" onClick={onCopyInvite} disabled={!canCopyInviteLink}>
                      {copied ? "Kopyalandi" : "Davet Linki Kopyala"}
                    </button>
                  </div>
                ) : null}
                {roomSession?.role === "player" && leavePermissionState.flowActive ? (
                  <div className="my-room-owner-inline">
                    <button
                      className="my-action-btn soft"
                      onClick={requestLeaveWithoutPenalty}
                      disabled={!leavePermissionState.canRequest}
                    >
                      {leavePermissionState.grantedToMe
                        ? "Izin Verildi"
                        : leavePermissionState.myRequestPending
                          ? "Izin Talebin Gonderildi"
                          : "Puansiz Ayrilma Izin Iste"}
                    </button>
                    {leavePermissionState.canApprove ? (
                      <button className="my-action-btn soft" onClick={approveLeaveWithoutPenalty}>
                        Izin Veriyorum
                      </button>
                    ) : null}
                    {leavePermissionState.grantedToMe ? (
                      <p className="line">Rakibin puansiz ayrilmana izin verdi.</p>
                    ) : null}
                    {leavePermissionState.grantedToOpponent ? (
                      <p className="line">Rakibine puansiz ayrilma izni verdin.</p>
                    ) : null}
                  </div>
                ) : null}
                <button className="my-action-btn soft" onClick={() => setViewMode("lobby")}>
                  Lobiye Don
                </button>
                {lobbyNotice ? <p className="my-notice my-notice-soft">{lobbyNotice}</p> : null}
              </section>
            </aside>

            <section className="my-room-center-stack">
              <div className="my-game-frame my-room-board-frame">
                <iframe
                  ref={iframeRef}
                  title="Tavla Oyunu"
                  src={iframeUrl}
                  onLoad={() => {
                    const frameWindow = iframeRef.current?.contentWindow ?? null;
                    syncTableChatToIframe(frameWindow);
                    syncRoomStartGateToIframe(frameWindow);
                  }}
                />
                {roomSession
                  && roomSession.role === "player"
                  && mode === "local"
                  && roomStartState
                  && !roomStartState.started
                  && roomStartState.bothSeated ? (
                  <section className="my-start-overlay my-room-start-overlay">
                    <article className="my-start-card my-room-start-card">
                      <button
                        className="my-room-start-main-btn"
                        onClick={onRoomStartReady}
                        disabled={!roomStartState.mine}
                      >
                        OYUNA BASLA
                      </button>
                      <p className="my-room-start-subtext">{roomStartHint}</p>
                    </article>
                  </section>
                ) : null}
              </div>

              <section className="my-chat-card my-room-chat-card">
                <div className="my-room-chat-tabs">
                  <button
                    className={`my-room-chat-tab ${roomChatTab === "table" ? "active" : ""}`}
                    onClick={() => setRoomChatTab("table")}
                  >
                    Masa Chat
                  </button>
                  <button
                    className={`my-room-chat-tab ${roomChatTab === "lobby" ? "active" : ""}`}
                    onClick={() => setRoomChatTab("lobby")}
                  >
                    Lobi Chat
                  </button>
                </div>

                <div className="my-chat-compose my-room-chat-compose">
                  <input
                    className="my-input"
                    placeholder={
                      roomChatTab === "table"
                        ? canWriteRoomChat ? "Masa sohbetine mesaj yaz..." : "Masa sohbeti icin uye girisi gerekli"
                        : canWriteRoomChat ? "Lobiye mesaj yaz..." : "Lobiye yazmak icin uye girisi yap"
                    }
                    value={roomChatTab === "table" ? roomTableChatInput : roomLobbyChatInput}
                    maxLength={CHAT_TEXT_MAX}
                    onChange={(e) => {
                      if (roomChatTab === "table") {
                        setRoomTableChatInput(e.target.value);
                      } else {
                        setRoomLobbyChatInput(e.target.value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      sendActiveRoomChat();
                    }}
                    disabled={!canWriteRoomChat}
                  />
                  <button
                    className="my-action-btn"
                    onClick={sendActiveRoomChat}
                    disabled={!canWriteRoomChat || !roomChatDraft}
                  >
                    Gonder
                  </button>
                </div>

                <div
                  ref={roomChatListRef}
                  className="my-chat-list my-room-chat-list"
                  onScroll={onRoomChatScroll}
                  data-unread={roomChatUnread}
                >
                  {roomChatRows.length === 0 ? (
                    <p className="my-chat-empty">
                      {roomChatTab === "table" ? "Bu masada henuz sohbet mesaji yok." : "Lobide henuz mesaj yok."}
                    </p>
                  ) : (
                    roomChatRows.map((message) => (
                      <article key={message.id} className="my-chat-row">
                        <div className="my-chat-meta">
                          <strong>{message.displayName}</strong>
                          <time>{formatChatTime(message.at)}</time>
                        </div>
                        <p>{message.text}</p>
                      </article>
                    ))
                  )}
                </div>
                {!canWriteRoomChat ? (
                  <p className="my-chat-hint">
                    {roomChatTab === "table" ? "Masa sohbetine sadece uye oyuncular yazabilir." : "Lobiye sadece uye oyuncular yazabilir."}
                  </p>
                ) : null}
              </section>
            </section>

            <aside className="my-game-controls my-room-right-controls">
              <section className="my-side-card my-room-card my-room-player-card">
                <h3>Oyuncular</h3>
                <div className={`my-room-player-row ${roomSession?.role === "player" && roomSession.seat === "white" ? "mine" : ""}`}>
                  <AvatarBadge avatarId={roomWhiteSeat?.avatarId ?? DEFAULT_AVATAR_BY_GENDER.unknown} gender={roomWhiteSeat?.gender ?? "unknown"} size="md" />
                  <span className="seat">Beyaz</span>
                  {roomWhiteSeat ? (
                    <button
                      type="button"
                      className="my-name-link"
                      onClick={() => openPlayerProfile(
                        roomWhiteSeat.userId,
                        roomWhiteSeat.displayName,
                        roomWhiteSeat.points,
                        roomWhiteSeat.stats,
                        roomWhiteSeat.username,
                        roomWhiteSeat.gender,
                        roomWhiteSeat.avatarId,
                      )}
                      title={`${roomWhiteSeat.displayName} profilini goster`}
                    >
                      {roomWhiteSeat.displayName}
                    </button>
                  ) : (
                    <strong>Bekleniyor</strong>
                  )}
                  <span className="my-room-player-points">{roomWhiteSeat?.points ?? 0}</span>
                </div>
                <div className={`my-room-player-row ${roomSession?.role === "player" && roomSession.seat === "black" ? "mine" : ""}`}>
                  <AvatarBadge avatarId={roomBlackSeat?.avatarId ?? DEFAULT_AVATAR_BY_GENDER.unknown} gender={roomBlackSeat?.gender ?? "unknown"} size="md" />
                  <span className="seat">Siyah</span>
                  {roomBlackSeat ? (
                    <button
                      type="button"
                      className="my-name-link"
                      onClick={() => openPlayerProfile(
                        roomBlackSeat.userId,
                        roomBlackSeat.displayName,
                        roomBlackSeat.points,
                        roomBlackSeat.stats,
                        roomBlackSeat.username,
                        roomBlackSeat.gender,
                        roomBlackSeat.avatarId,
                      )}
                      title={`${roomBlackSeat.displayName} profilini goster`}
                    >
                      {roomBlackSeat.displayName}
                    </button>
                  ) : (
                    <strong>Bekleniyor</strong>
                  )}
                  <span className="my-room-player-points">{roomBlackSeat?.points ?? 0}</span>
                </div>
              </section>

              <section className="my-side-card my-room-card my-room-score-card">
                <h3>Puan Durumu</h3>
                {roomScoreRows.length === 0 ? (
                  <p className="my-chat-empty">Masadaki oyuncular bekleniyor.</p>
                ) : (
                  <div className="my-room-score-list">
                    {roomScoreRows.map((row) => (
                      <article key={row.seat} className={`my-room-score-row ${row.mine ? "mine" : ""}`}>
                        <span className={`my-online-dot ${row.seat === "black" ? "my-room-dot-black" : ""}`} />
                        <button
                          type="button"
                          className="my-name-link"
                          onClick={() => openPlayerProfile(
                            row.userId,
                            row.name,
                            row.points,
                            row.stats,
                            row.username,
                            row.gender,
                            row.avatarId,
                          )}
                          title={`${row.name} profilini goster`}
                        >
                          {row.name}
                        </button>
                        <strong>{row.points}</strong>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </aside>
          </section>
        </section>
      )}

      {invitePickerTable ? (
        <section className="my-modal-backdrop" role="presentation" onClick={closeInvitePicker}>
          <article className="my-modal-card my-invite-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>Masa {invitePickerTable.id} Davet Listesi</h3>
            <p className="line">Sadece odadaki bos oyuncular listelenir.</p>
            {inviteCandidates.length === 0 ? (
              <p className="my-chat-empty">Davet edilecek bos oyuncu yok.</p>
            ) : (
              <div className="my-invite-candidate-list">
                {inviteCandidates.map((candidate) => (
                  <button
                    key={candidate.key}
                    className="my-action-btn soft"
                    onClick={() => invitePlayerToTable(invitePickerTable.id, candidate.userId)}
                  >
                    {candidate.name} ({candidate.points})
                  </button>
                ))}
              </div>
            )}
            <button className="my-action-btn" type="button" onClick={closeInvitePicker}>
              Kapat
            </button>
          </article>
        </section>
      ) : null}

      {profileModal.open ? (
        <section className="my-modal-backdrop" role="presentation" onClick={closeProfileModal}>
          <article className="my-modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="my-profile-modal-head">
              <AvatarBadge avatarId={profileModal.avatarId} gender={profileModal.gender} size="lg" />
              <h3>{profileModal.name}</h3>
            </div>
            {profileModal.loading ? (
              <p className="line">Profil yukleniyor...</p>
            ) : (
              <>
                <p className="line">{profileModal.isMember ? "Uye Oyuncu" : "Misafir Oyuncu"}</p>
                {profileModal.username ? <p className="line">Kullanici: @{profileModal.username}</p> : null}
                <p className="line">Cinsiyet: {genderLabel(profileModal.gender)}</p>
                {profileModal.email ? <p className="line">{profileModal.email}</p> : null}
                <p className="line">Puan: {profileModal.points}</p>
                <p className="line">Toplam Oyun: {profileModal.stats.gamesPlayed}</p>
                <p className="line">Kazandigi: {profileModal.stats.wins}</p>
                <p className="line">Kaybettigi: {profileModal.stats.losses}</p>
                <p className="line">Masadan Kacis: {profileModal.stats.resigns}</p>
                {profileModal.error ? <p className="my-error">{profileModal.error}</p> : null}
              </>
            )}
            <button className="my-action-btn" type="button" onClick={closeProfileModal}>
              Kapat
            </button>
          </article>
        </section>
      ) : null}
    </main>
  );
}

export default App;


