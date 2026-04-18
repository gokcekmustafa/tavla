import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

type GameMode = "local" | "bot";
type Seat = "white" | "black";
type ViewMode = "lobby" | "table";
type AuthMode = "login" | "register";
type MatchOutcome = "win" | "loss" | "resign";

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
};

type MemberUser = {
  id: string;
  displayName: string;
  email: string;
  points: number;
  createdAt: number;
  stats: PlayerStats;
};

type GuestProfile = {
  userId: string;
  displayName: string;
  points: number;
  stats: PlayerStats;
};

type MemberSession = {
  userId: string;
};

type LobbySeatState = {
  sessionId: string;
  userId: string;
  displayName: string;
  points: number;
  stats: PlayerStats;
  touchedAt: number;
};

type LobbyTable = {
  id: number;
  roomCode: string;
  white: LobbySeatState | null;
  black: LobbySeatState | null;
};

type LobbyState = {
  lobbyName: string;
  tables: LobbyTable[];
  guestCounter: number;
  guestLabels: Record<string, number>;
  updatedAt: number;
};

type OnlineRow = {
  key: string;
  userId: string;
  sessionId: string;
  name: string;
  points: number;
  stats: PlayerStats;
  tableNo: number | null;
};

type LegacyHostStateMessage = {
  source: "tavla-legacy";
  type: "state";
  matchToken: string;
  matchActive: boolean;
  winner: Seat | null;
  localColor: Seat | null;
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

type LegacyHostMessage = LegacyHostStateMessage | LegacyMatchFinishedMessage;

type PlayerProfileModalState = {
  open: boolean;
  loading: boolean;
  isMember: boolean;
  name: string;
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
const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_LOBBY_NAME = "Lobi 1";
const SEAT_STALE_MS = 25_000;
const HEARTBEAT_MS = 5_000;
const WIN_POINTS = 100;
const RESIGN_PENALTY_POINTS = 50;

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

function pointsDeltaForOutcome(outcome: MatchOutcome) {
  if (outcome === "win") return WIN_POINTS;
  if (outcome === "resign") return -RESIGN_PENALTY_POINTS;
  return 0;
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
  if (!id || !email) return null;
  return {
    id,
    displayName: sanitizeGuestName(typeof candidate.displayName === "string" ? candidate.displayName : "Uye") || "Uye",
    email,
    points: normalizeNonNegativeInt(candidate.points, 1500),
    createdAt: Number.isFinite(candidate.createdAt) ? Number(candidate.createdAt) : Date.now(),
    stats: normalizeStats(candidate.stats),
  };
}

function sanitizeTableNo(value: string) {
  const digits = value.replace(/[^0-9]/g, "").slice(0, 3);
  const parsed = Number.parseInt(digits || "1", 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return 1;
  return Math.min(parsed, 999);
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

function initialsOf(name: string) {
  const clean = sanitizeGuestName(name);
  if (!clean) return "M";
  const parts = clean.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function sortTables(tables: LobbyTable[]) {
  return [...tables].sort((a, b) => a.id - b.id);
}

function createDefaultLobbyState(): LobbyState {
  return {
    lobbyName: DEFAULT_LOBBY_NAME,
    tables: [],
    guestCounter: 0,
    guestLabels: {},
    updatedAt: Date.now(),
  };
}

function normalizeSeat(raw: unknown): LobbySeatState | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<LobbySeatState>;
  const sessionId = typeof candidate.sessionId === "string" ? candidate.sessionId : "";
  if (!sessionId) return null;
  return {
    sessionId,
    userId: typeof candidate.userId === "string" ? candidate.userId : `guest-${sessionId}`,
    displayName: sanitizeGuestName(typeof candidate.displayName === "string" ? candidate.displayName : "Misafir") || "Misafir",
    points: normalizeNonNegativeInt(candidate.points, 1500),
    stats: normalizeStats(candidate.stats),
    touchedAt: Number.isFinite(candidate.touchedAt) ? Number(candidate.touchedAt) : Date.now(),
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
  return { id, roomCode, white, black };
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
    if (white !== table.white || black !== table.black) changed = true;
    next.push({ ...table, white, black });
  });

  return { tables: sortTables(next), changed };
}

function normalizeLobbyState(raw: unknown): LobbyState {
  const fallback = createDefaultLobbyState();
  if (!raw || typeof raw !== "object") return fallback;
  const candidate = raw as Partial<LobbyState>;
  const lobbyName = sanitizeLobbyName(typeof candidate.lobbyName === "string" ? candidate.lobbyName : DEFAULT_LOBBY_NAME);
  const rows = Array.isArray(candidate.tables) ? candidate.tables : [];
  const normalizedTables = rows
    .map((row, index) => normalizeTable(row, index))
    .filter((row): row is LobbyTable => Boolean(row));
  const cleaned = cleanupStaleAndPrune(normalizedTables).tables;
  const guestCounter = Number.isInteger(candidate.guestCounter) && Number(candidate.guestCounter) >= 0
    ? Number(candidate.guestCounter)
    : 0;
  const rawLabels = candidate.guestLabels && typeof candidate.guestLabels === "object"
    ? candidate.guestLabels as Record<string, unknown>
    : {};
  const guestLabels: Record<string, number> = {};
  Object.entries(rawLabels).forEach(([key, value]) => {
    const safeKey = sanitizeGuestId(key);
    const safeValue = Number(value);
    if (!safeKey || !Number.isInteger(safeValue) || safeValue <= 0) return;
    guestLabels[safeKey] = safeValue;
  });
  return {
    lobbyName,
    tables: cleaned,
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
      points: 1500,
      stats: createEmptyStats(),
    };
  }
  return {
    userId,
    displayName: sanitizeGuestName(typeof candidate.displayName === "string" ? candidate.displayName : fallbackName) || "Misafir",
    points: normalizeNonNegativeInt(candidate.points, 1500),
    stats: normalizeStats(candidate.stats),
  };
}

function saveGuestProfile(profile: GuestProfile) {
  if (typeof window === "undefined") return;
  saveJson(GUEST_PROFILE_SESSION_KEY, {
    userId: profile.userId,
    displayName: sanitizeGuestName(profile.displayName) || "Misafir",
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
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const room = sanitizeRoomCode(params.get("room") ?? "");
  const seatParam = params.get("seat");
  const seat: Seat | null = seatParam === "white" || seatParam === "black" ? seatParam : null;
  if (!room || !seat) return null;
  const roomName = DEFAULT_LOBBY_NAME;
  const tableNo = sanitizeTableNo(params.get("table") ?? params.get("tableNo") ?? params.get("masa") ?? "1");
  const externalSession = sanitizeGuestName(params.get("session") ?? "");
  return {
    code: room,
    seat,
    sessionId: externalSession || createSessionId(),
    roomName,
    tableNo,
  };
}

function clearSessionFromTables(tables: LobbyTable[], sessionId: string): { tables: LobbyTable[]; changed: boolean } {
  let changed = false;
  const next = tables.map((table) => {
    const whiteOwned = table.white?.sessionId === sessionId;
    const blackOwned = table.black?.sessionId === sessionId;
    if (!whiteOwned && !blackOwned) return table;
    changed = true;
    return {
      ...table,
      white: whiteOwned ? null : table.white,
      black: blackOwned ? null : table.black,
    };
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

function mergeSeatState(base: LobbySeatState | null, incoming: LobbySeatState | null) {
  if (!base) return incoming;
  if (!incoming) return base;
  return incoming.touchedAt >= base.touchedAt ? incoming : base;
}

function mergeLobbyStates(local: LobbyState, remote: LobbyState): LobbyState {
  const keyOf = (table: LobbyTable) => sanitizeRoomCode(table.roomCode) || `id-${table.id}`;
  const mergedTables = new Map<string, LobbyTable>();

  remote.tables.forEach((table) => {
    mergedTables.set(keyOf(table), table);
  });

  local.tables.forEach((table) => {
    const key = keyOf(table);
    const existing = mergedTables.get(key);
    if (!existing) {
      mergedTables.set(key, table);
      return;
    }
    mergedTables.set(key, {
      id: Math.min(existing.id, table.id),
      roomCode: sanitizeRoomCode(existing.roomCode) || sanitizeRoomCode(table.roomCode) || createRoomCode(),
      white: mergeSeatState(existing.white, table.white),
      black: mergeSeatState(existing.black, table.black),
    });
  });

  const guestLabels: Record<string, number> = { ...remote.guestLabels };
  Object.entries(local.guestLabels).forEach(([guestKey, guestNo]) => {
    if (!guestLabels[guestKey]) {
      guestLabels[guestKey] = guestNo;
    }
  });

  const highestGuestNo = Object.values(guestLabels).reduce((max, value) => Math.max(max, value), 0);

  return normalizeLobbyState({
    lobbyName: sanitizeLobbyName(remote.lobbyName || local.lobbyName),
    tables: Array.from(mergedTables.values()),
    guestCounter: Math.max(remote.guestCounter, local.guestCounter, highestGuestNo),
    guestLabels,
    updatedAt: Math.max(remote.updatedAt, local.updatedAt),
  });
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
  const [lobbyState, setLobbyState] = useState<LobbyState>(() => {
    const loaded = loadLobbyState();
    const roomName = sanitizeLobbyName(initialRoom?.roomName ?? DEFAULT_LOBBY_NAME);
    if (loaded.lobbyName === roomName) return loaded;
    const merged = { ...loaded, lobbyName: roomName, updatedAt: Date.now() };
    saveJson(LOBBY_STATE_KEY, merged);
    return merged;
  });

  const [member, setMember] = useState<MemberUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("register");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [profileModal, setProfileModal] = useState<PlayerProfileModalState>({
    open: false,
    loading: false,
    isMember: false,
    name: "",
    points: 0,
    stats: createEmptyStats(),
  });
  const [matchLiveState, setMatchLiveState] = useState({
    matchToken: "",
    matchActive: false,
    winner: null as Seat | null,
    localColor: null as Seat | null,
  });

  const lobbyChannelRef = useRef<BroadcastChannel | null>(null);
  const realtimeSocketRef = useRef<WebSocket | null>(null);
  const realtimeReconnectTimerRef = useRef<number | null>(null);
  const realtimeSenderCountersRef = useRef<Map<string, number>>(new Map());
  const realtimeSyncCounterRef = useRef(0);
  const realtimeRemoteStateRef = useRef<LobbyState | null>(null);
  const realtimeReceivedSnapshotRef = useRef(false);
  const appSessionId = useMemo(() => createSessionId(), []);
  const guestId = useMemo(() => getOrCreateGuestId(), []);
  const [realtimeStatus, setRealtimeStatus] = useState<"offline" | "connecting" | "online">("offline");
  const processedMatchTokensRef = useRef<Set<string>>(new Set());
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const safeGuestName = useMemo(() => {
    const memberName = member ? sanitizeGuestName(member.displayName) : "";
    if (memberName) return memberName;
    return sanitizeGuestName(guestName) || "Misafir";
  }, [guestName, member]);

  const currentProfile = useMemo(() => {
    return {
      userId: member ? member.id : guestProfile.userId,
      displayName: safeGuestName,
      points: member?.points ?? guestProfile.points,
      stats: member?.stats ?? guestProfile.stats,
      isMember: Boolean(member),
    };
  }, [member, safeGuestName, guestProfile.userId, guestProfile.points, guestProfile.stats]);

  const isRoomMode = Boolean(roomSession);

  const iframeUrl = useMemo(() => {
    const qp = new URLSearchParams();
    qp.set("mode", isRoomMode ? "local" : mode);
    qp.set("t", String(iframeKey));
    qp.set("guest", safeGuestName);
    qp.set("sync_ws", REALTIME_WS_BASE_URL);
    if (roomSession) {
      qp.set("room", roomSession.code);
      qp.set("seat", roomSession.seat);
      qp.set("session", roomSession.sessionId);
      qp.set("room_name", roomSession.roomName);
      qp.set("table", String(roomSession.tableNo));
    }
    return `/legacy/index.html?${qp.toString()}`;
  }, [mode, iframeKey, roomSession, safeGuestName, isRoomMode]);

  const openedTables = useMemo(() => {
    return sortTables(lobbyState.tables).filter((table) => Boolean(table.white || table.black));
  }, [lobbyState.tables]);

  const mySeat = useMemo(() => findSessionSeat(openedTables, appSessionId), [openedTables, appSessionId]);

  const onlineRows = useMemo<OnlineRow[]>(() => {
    const map = new Map<string, OnlineRow>();
    openedTables.forEach((table) => {
      [table.white, table.black].forEach((seatInfo) => {
        if (!seatInfo) return;
        map.set(seatInfo.sessionId, {
          key: seatInfo.sessionId,
          userId: seatInfo.userId,
          sessionId: seatInfo.sessionId,
          name: seatInfo.displayName,
          points: seatInfo.points,
          stats: normalizeStats(seatInfo.stats),
          tableNo: table.id,
        });
      });
    });
    if (!map.has(appSessionId)) {
      map.set(appSessionId, {
        key: appSessionId,
        userId: currentProfile.userId,
        sessionId: appSessionId,
        name: safeGuestName,
        points: currentProfile.points,
        stats: normalizeStats(currentProfile.stats),
        tableNo: mySeat?.table.id ?? null,
      });
    }
    return Array.from(map.values()).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  }, [openedTables, appSessionId, safeGuestName, currentProfile.userId, currentProfile.points, currentProfile.stats, mySeat]);

  function broadcastLobbySync() {
    lobbyChannelRef.current?.postMessage({ type: "lobby-sync", at: Date.now() });
  }

  function readRealtimeLobbyState() {
    return realtimeRemoteStateRef.current;
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
    socket.send(JSON.stringify(message));
    return true;
  }

  function getCurrentLobbyState() {
    return readRealtimeLobbyState() ?? loadLobbyState();
  }

  function persistLobbyState(next: LobbyState) {
    const normalized = normalizeLobbyState(next);
    realtimeRemoteStateRef.current = normalized;
    realtimeReceivedSnapshotRef.current = true;
    saveJson(LOBBY_STATE_KEY, normalized);
    setLobbyState(normalized);
    sendRealtimeSnapshot(normalized, "lobby-update");
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

  function refreshBoard() {
    setIframeKey((v) => v + 1);
  }

  function releaseSeatOnly() {
    writeLobby((current) => {
      const cleaned = cleanupStaleAndPrune(current.tables).tables;
      const cleared = clearSessionFromTables(cleaned, appSessionId);
      const pruned = cleanupStaleAndPrune(cleared.tables).tables;
      if (!cleared.changed && JSON.stringify(pruned) === JSON.stringify(cleaned)) return current;
      return { ...current, tables: pruned, updatedAt: Date.now() };
    });
  }

  function goToTable(table: LobbyTable, seat: Seat) {
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
    });
    setJoinCodeInput(table.roomCode);
    setJoinSeat(seat === "white" ? "black" : "white");
    setMode("local");
    setViewMode("table");
    setCopied(false);
    setLobbyNotice("");
    refreshBoard();
  }

  function upsertMySeat(tableId: number, seat: Seat, explicitRoomCode?: string) {
    let seatBlocked = false;
    let resolvedTable: LobbyTable | null = null;

    const next = writeLobby((current) => {
      const cleaned = cleanupStaleAndPrune(current.tables).tables;
      const withoutMine = clearSessionFromTables(cleaned, appSessionId).tables;
      const code = sanitizeRoomCode(explicitRoomCode ?? "");
      const tables = [...withoutMine];
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
        };
        tables.push(table);
        index = tables.length - 1;
      }

      if (code) {
        table = { ...table, roomCode: code };
      }

      const occupied = seat === "white" ? table.white : table.black;
      if (occupied && occupied.sessionId !== appSessionId) {
        seatBlocked = true;
        return current;
      }

      const seatState: LobbySeatState = {
        sessionId: appSessionId,
        userId: currentProfile.userId,
        displayName: currentProfile.displayName,
        points: currentProfile.points,
        stats: normalizeStats(currentProfile.stats),
        touchedAt: Date.now(),
      };

      const patched =
        seat === "white"
          ? { ...table, white: seatState }
          : { ...table, black: seatState };

      tables[index] = patched;
      const nextTables = sortTables(tables);
      resolvedTable = nextTables.find((row) => row.id === patched.id) ?? patched;

      return {
        ...current,
        tables: nextTables,
        updatedAt: Date.now(),
      };
    });

    if (!next || seatBlocked) return null;
    if (resolvedTable) return resolvedTable;
    return next.tables.find((table) => table.id === tableId || table.roomCode === explicitRoomCode) ?? null;
  }

  function sitToTable(tableId: number, seat: Seat, explicitRoomCode?: string, openGameView = true) {
    const table = upsertMySeat(tableId, seat, explicitRoomCode);
    if (!table) {
      setLobbyNotice("Secilen koltuk dolu. Lutfen baska bir koltuk secin.");
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

  function onOpenTable() {
    const latest = getCurrentLobbyState();
    const existing = findSessionSeat(latest.tables, appSessionId);
    if (existing) {
      setViewMode("lobby");
      setLobbyNotice(`Masa ${existing.table.id} zaten acik. Diger oyuncu bekleniyor.`);
      return;
    }
    const tableId = getNextTableId(latest.tables);
    sitToTable(tableId, "white", createRoomCode(), false);
  }

  function onQuickPlay() {
    const latest = getCurrentLobbyState();
    const existing = findSessionSeat(latest.tables, appSessionId);
    if (existing) {
      goToTable(existing.table, existing.seat);
      return;
    }
    const tableId = getNextTableId(latest.tables);
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
    if (roomSession && matchLiveState.matchActive && !matchLiveState.winner) {
      const confirmed = window.confirm(
        "Oyun basladi. Masadan kalkarsan 50 puan kaybedersin. Rakibin galip sayilip 100 puan kazanir. Devam etmek istiyor musun?",
      );
      if (!confirmed) return;
      const token = matchLiveState.matchToken || `resign-${Date.now().toString(36)}`;
      processedMatchTokensRef.current.add(`${token}:${currentProfile.userId}`);
      await awardResignResult(token);
      sendResignCommandToIframe(token);
      penalized = true;
    }

    closeRoomAndReturnLobby();
    setLobbyNotice(penalized ? "Masadan ayrildin: -50 puan. Rakibin +100 puan kazandi." : "Masadan ayrildin.");
  }

  async function startBotGame() {
    if (roomSession) {
      if (matchLiveState.matchActive && !matchLiveState.winner) {
        const confirmed = window.confirm(
          "Devam eden masadan ayrilirsan 50 puan kaybedersin. Bot moduna gecmek istiyor musun?",
        );
        if (!confirmed) return;
        const token = matchLiveState.matchToken || `resign-${Date.now().toString(36)}`;
        processedMatchTokensRef.current.add(`${token}:${currentProfile.userId}`);
        await awardResignResult(token);
        sendResignCommandToIframe(token);
      }
      releaseSeatOnly();
    }
    setRoomSession(null);
    setMode("bot");
    setCopied(false);
    setLobbyNotice("Bot modu aktif.");
    setMatchLiveState({
      matchToken: "",
      matchActive: false,
      winner: null,
      localColor: null,
    });
    setViewMode("table");
    refreshBoard();
  }

  function onSelectMode(nextMode: GameMode) {
    if (nextMode === "bot") {
      startBotGame();
      return;
    }
    setMode("local");
    setViewMode("table");
    if (!roomSession) refreshBoard();
  }

  function onOpenMemberPanel() {
    setViewMode("lobby");
    setAuthMode("register");
    setLobbyNotice("Uyelik paneli sag tarafta.");
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
    if (!roomSession) return;
    await copyInviteFromTable(
      {
        id: roomSession.tableNo,
        roomCode: roomSession.code,
        white: null,
        black: null,
      },
      roomSession.seat,
    );
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
    const displayName = sanitizeGuestName(authDisplayName);
    const email = sanitizeEmail(authEmail);
    const password = authPassword.trim().slice(0, 64);

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
        body: JSON.stringify({ displayName, email, password }),
      });
      const data = (await response.json().catch(() => null)) as { user?: unknown; error?: unknown } | null;
      if (!response.ok) {
        const serverError = typeof data?.error === "string" ? data.error : "Uyelik acilamadi.";
        setAuthError(serverError);
        return;
      }
      const user = normalizeMemberUser(data?.user);
      if (!user) {
        setAuthError("Sunucu uyelik yaniti gecersiz.");
        return;
      }

      saveJson(MEMBER_SESSION_KEY, { userId: user.id } satisfies MemberSession);
      setMember(user);
      setGuestName(user.displayName);
      setAuthDisplayName("");
      setAuthEmail("");
      setAuthPassword("");
      setAuthError("");
      setLobbyNotice("Uyelik acildi.");
    } catch {
      setAuthError("Sunucuya baglanilamadi. Tekrar deneyin.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function onLoginMember() {
    if (authBusy) return;
    const email = sanitizeEmail(authEmail);
    const password = authPassword.trim().slice(0, 64);
    if (!email.includes("@")) {
      setAuthError("Gecerli e-posta girin.");
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
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json().catch(() => null)) as { user?: unknown; error?: unknown } | null;
      if (!response.ok) {
        const serverError = typeof data?.error === "string" ? data.error : "E-posta veya sifre yanlis.";
        setAuthError(serverError);
        return;
      }
      const user = normalizeMemberUser(data?.user);
      if (!user) {
        setAuthError("Sunucu giris yaniti gecersiz.");
        return;
      }

      setMember(user);
      saveJson(MEMBER_SESSION_KEY, { userId: user.id } satisfies MemberSession);
      setGuestName(user.displayName);
      setAuthPassword("");
      setAuthError("");
      setLobbyNotice("Giris yapildi.");
    } catch {
      setAuthError("Sunucuya baglanilamadi. Tekrar deneyin.");
    } finally {
      setAuthBusy(false);
    }
  }

  function onLogoutMember() {
    window.localStorage.removeItem(MEMBER_SESSION_KEY);
    setMember(null);
    setAuthPassword("");
    setAuthError("");
    setLobbyNotice("Uyelik oturumu kapatildi.");
  }

  function patchSeatByUserId(userId: string, points: number, stats: PlayerStats, displayName?: string) {
    writeLobby((current) => {
      let anyChanged = false;
      const tables = current.tables.map((table) => {
        let changed = false;
        const patchSeat = (seat: LobbySeatState | null) => {
          if (!seat || seat.userId !== userId) return seat;
          changed = true;
          return {
            ...seat,
            points: normalizeNonNegativeInt(points, seat.points),
            stats: normalizeStats(stats),
            displayName: displayName ? sanitizeGuestName(displayName) || seat.displayName : seat.displayName,
            touchedAt: Date.now(),
          };
        };
        const white = patchSeat(table.white);
        const black = patchSeat(table.black);
        if (!changed) return table;
        anyChanged = true;
        return { ...table, white, black };
      });
      if (!anyChanged) return current;
      return { ...current, tables, updatedAt: Date.now() };
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
          pointsDelta: pointsDeltaForOutcome(outcome),
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
        points: Math.max(0, prev.points + pointsDeltaForOutcome(outcome)),
        stats: nextStats,
      };
      saveGuestProfile(next);
      patchSeatByUserId(next.userId, next.points, next.stats, next.displayName);
      return next;
    });
  }

  async function applyOutcomeForUserId(userId: string, outcome: MatchOutcome, fallbackName?: string, matchToken = "") {
    if (isMemberUserId(userId)) {
      const updatedMember = await submitMemberMatchOutcome(userId, outcome, matchToken);
      if (!updatedMember) return null;
      patchSeatByUserId(updatedMember.id, updatedMember.points, updatedMember.stats, updatedMember.displayName);
      if (member?.id === updatedMember.id) {
        setMember(updatedMember);
        setGuestName(updatedMember.displayName);
      }
      return updatedMember;
    }

    if (userId === guestProfile.userId) {
      applyGuestOutcome(outcome);
      return {
        ...guestProfile,
        displayName: safeGuestName,
        points: Math.max(0, guestProfile.points + pointsDeltaForOutcome(outcome)),
        stats: applyStatsOutcome(guestProfile.stats, outcome),
      } satisfies GuestProfile;
    }

    const syntheticStats = applyStatsOutcome(createEmptyStats(), outcome);
    const syntheticPoints = Math.max(0, 1500 + pointsDeltaForOutcome(outcome));
    patchSeatByUserId(userId, syntheticPoints, syntheticStats, fallbackName);
    return {
      userId,
      displayName: sanitizeGuestName(fallbackName ?? "Misafir") || "Misafir",
      points: syntheticPoints,
      stats: syntheticStats,
    } satisfies GuestProfile;
  }

  function getActiveRoomTable() {
    if (!roomSession) return null;
    const current = getCurrentLobbyState();
    return current.tables.find((table) => table.id === roomSession.tableNo || table.roomCode === roomSession.code) ?? null;
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
    setViewMode("lobby");
    setMatchLiveState({
      matchToken: "",
      matchActive: false,
      winner: null,
      localColor: null,
    });
    refreshBoard();
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

  function closeProfileModal() {
    setProfileModal((prev) => ({ ...prev, open: false, loading: false }));
  }

  async function openPlayerProfile(userId: string, displayName: string, points: number, stats: PlayerStats) {
    const baseState: PlayerProfileModalState = {
      open: true,
      loading: false,
      isMember: isMemberUserId(userId),
      name: sanitizeGuestName(displayName) || "Oyuncu",
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
    let blocked = false;

    writeLobby((current) => {
      const cleaned = cleanupStaleAndPrune(current.tables).tables;
      const withoutMine = clearSessionFromTables(cleaned, appSessionId).tables;
      const tables = [...withoutMine];
      const idx = tables.findIndex((table) => table.id === roomSession.tableNo || table.roomCode === roomSession.code);
      const roomCode = sanitizeRoomCode(roomSession.code) || createRoomCode();

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
        };
        tables.push(table);
        index = tables.length - 1;
      }

      table = { ...table, roomCode };
      const occupied = roomSession.seat === "white" ? table.white : table.black;
      if (occupied && occupied.sessionId !== appSessionId) {
        blocked = true;
        return current;
      }

      const seatState: LobbySeatState = {
        sessionId: appSessionId,
        userId: currentProfile.userId,
        displayName: currentProfile.displayName,
        points: currentProfile.points,
        stats: normalizeStats(currentProfile.stats),
        touchedAt: Date.now(),
      };

      const patched =
        roomSession.seat === "white"
          ? { ...table, white: seatState }
          : { ...table, black: seatState };

      tables[index] = patched;
      return {
        ...current,
        lobbyName: sanitizeLobbyName(roomSession.roomName || current.lobbyName),
        tables: sortTables(tables),
        updatedAt: Date.now(),
      };
    });

    if (blocked) {
      setLobbyNotice(`${seatText(roomSession.seat)} koltugu dolu gorunuyor.`);
    }
  }

  function seatCell(table: LobbyTable, seat: Seat) {
    const occupant = seat === "white" ? table.white : table.black;
    const mine = occupant?.sessionId === appSessionId;
    if (!occupant) {
      return (
        <button
          className="my-otur-btn"
          onClick={() => sitToTable(table.id, seat, table.roomCode)}
          title={`${seatText(seat)} koltuguna otur`}
        >
          OTUR
        </button>
      );
    }
    return (
      <div className={`my-seat-occupant ${mine ? "mine" : ""}`}>
        <span className="my-avatar">{initialsOf(occupant.displayName)}</span>
        <button
          type="button"
          className="my-name-link my-occupant-name"
          onClick={() => openPlayerProfile(occupant.userId, occupant.displayName, occupant.points, occupant.stats)}
          title={`${occupant.displayName} profilini goster`}
        >
          {occupant.displayName}
        </button>
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

    const localOutcome: MatchOutcome =
      message.reason === "resign" && loser === localColor
        ? "resign"
        : winner === localColor
          ? "win"
          : "loss";

    await applyOutcomeForUserId(currentProfile.userId, localOutcome, currentProfile.displayName, token);
    if (localOutcome === "win") {
      setLobbyNotice("Oyunu kazandin. +100 puan eklendi.");
    } else if (localOutcome === "resign") {
      setLobbyNotice("Masadan kalktin. 50 puan dusuldu.");
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
        setRealtimeStatus("offline");
        scheduleReconnect();
        return;
      }

      realtimeSocketRef.current = socket;
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
        setRealtimeStatus("online");
        const helloMessage: RealtimeMessage = {
          kind: "hello",
          channel: REALTIME_LOBBY_CHANNEL,
          sender: appSessionId,
          counter: realtimeSyncCounterRef.current,
          at: Date.now(),
        };
        socket.send(JSON.stringify(helloMessage));
      });

      socket.addEventListener("message", (event) => {
        if (cancelled || realtimeSocketRef.current !== socket) return;
        if (typeof event.data !== "string") return;

        let message: RealtimeMessage | null = null;
        try {
          message = JSON.parse(event.data) as RealtimeMessage;
        } catch {
          return;
        }
        if (!message || message.channel !== REALTIME_LOBBY_CHANNEL) return;
        if (message.kind !== "snapshot") return;
        if (typeof message.sender !== "string" || !message.sender) return;
        if (!Number.isFinite(message.counter)) return;

        const counter = Number(message.counter);
        const previousCounter = realtimeSenderCountersRef.current.get(message.sender) ?? 0;
        if (counter <= previousCounter) return;
        realtimeSenderCountersRef.current.set(message.sender, counter);

        const incoming = normalizeLobbyState(message.payload);
        const merged = mergeLobbyStates(loadLobbyState(), incoming);
        realtimeRemoteStateRef.current = merged;
        realtimeReceivedSnapshotRef.current = true;
        saveJson(LOBBY_STATE_KEY, merged);
        setLobbyState(merged);
        setRealtimeStatus("online");
      });

      socket.addEventListener("error", () => {
        if (cancelled || realtimeSocketRef.current !== socket) return;
        setRealtimeStatus("offline");
      });

      socket.addEventListener("close", () => {
        window.clearTimeout(seedTimer);
        if (cancelled || realtimeSocketRef.current !== socket) return;
        realtimeSocketRef.current = null;
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
    const onMessage = (event: MessageEvent<LegacyHostMessage>) => {
      if (event.origin !== window.location.origin) return;
      const payload = event.data;
      if (!payload || typeof payload !== "object") return;
      if ((payload as { source?: unknown }).source !== "tavla-legacy") return;

      if (payload.type === "state") {
        const winner = payload.winner === "white" || payload.winner === "black" ? payload.winner : null;
        const localColor = payload.localColor === "white" || payload.localColor === "black" ? payload.localColor : null;
        const matchToken = typeof payload.matchToken === "string" ? payload.matchToken : "";
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
  }, [currentProfile.userId, currentProfile.displayName, handleLegacyMatchFinished]);

  useEffect(() => {
    let cancelled = false;
    const syncMemberFromSession = async () => {
      const session = loadMemberSession();
      if (!session) {
        if (!cancelled) setMember(null);
        return;
      }
      const user = await loadMemberFromSession(session);
      if (cancelled) return;
      if (!user) {
        window.localStorage.removeItem(MEMBER_SESSION_KEY);
        setMember(null);
        return;
      }
      setMember(user);
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
    let resolvedGuestNo = 0;

    const next = writeLobby((current) => {
      const guestLabels = { ...current.guestLabels };
      let guestCounter = Number.isInteger(current.guestCounter) && current.guestCounter >= 0 ? current.guestCounter : 0;
      let myNo = guestLabels[guestId];
      let changed = false;

      if (!myNo) {
        guestCounter += 1;
        myNo = guestCounter;
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
  }, [member, guestId, guestName, realtimeStatus]);

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
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (roomSession) {
      url.searchParams.set("room", roomSession.code);
      url.searchParams.set("seat", roomSession.seat);
      url.searchParams.set("name", safeGuestName);
      url.searchParams.set("room_name", roomSession.roomName);
      url.searchParams.set("table", String(roomSession.tableNo));
    } else {
      url.searchParams.delete("room");
      url.searchParams.delete("seat");
      url.searchParams.delete("name");
      url.searchParams.delete("room_name");
      url.searchParams.delete("table");
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
            return;
          }
          const user = await loadMemberFromSession(session);
          if (!user) {
            window.localStorage.removeItem(MEMBER_SESSION_KEY);
            setMember(null);
            return;
          }
          setMember(user);
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
      const cleaned = cleanupStaleAndPrune(latest.tables);
      const normalized = {
        ...latest,
        tables: cleaned.tables,
        updatedAt: cleaned.changed ? Date.now() : latest.updatedAt,
      };
      if (cleaned.changed) {
        persistLobbyState(normalized);
        return;
      }
      setLobbyState(normalized);
    }, 8_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!roomSession) return;
    syncRoomSeatHeartbeat();
    const timer = window.setInterval(() => syncRoomSeatHeartbeat(), HEARTBEAT_MS);
    return () => window.clearInterval(timer);
  }, [roomSession, currentProfile.userId, currentProfile.displayName, currentProfile.points, currentProfile.stats, appSessionId]);

  useEffect(() => {
    const onBeforeUnload = () => {
      const latest = getCurrentLobbyState();
      const cleaned = cleanupStaleAndPrune(latest.tables).tables;
      const cleared = clearSessionFromTables(cleaned, appSessionId);
      const pruned = cleanupStaleAndPrune(cleared.tables).tables;
      if (!cleared.changed && JSON.stringify(cleaned) === JSON.stringify(pruned)) return;
      const next = {
        ...latest,
        tables: pruned,
        updatedAt: Date.now(),
      };
      saveJson(LOBBY_STATE_KEY, next);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [appSessionId]);

  return (
    <main className="my-shell">
      <header className="my-topbar">
        <div className="my-topbar-left">
          <button className="my-top-btn my-btn-open" onClick={onOpenTable}>
            Masa Ac
          </button>
          <button className="my-top-btn my-btn-play" onClick={onQuickPlay}>
            Hemen Oyna
          </button>
          <button className="my-top-btn my-btn-bot" onClick={startBotGame}>
            Bota Karsi
          </button>
          {!member ? (
            <button className="my-top-btn my-btn-member" onClick={onOpenMemberPanel}>
              Uye Ol
            </button>
          ) : (
            <button className="my-top-btn my-btn-member-alt" onClick={onLogoutMember}>
              Cikis
            </button>
          )}
          <button className="my-top-btn my-btn-neutral" onClick={() => setViewMode("lobby")}>
            Lobiye Don
          </button>
          {roomSession ? (
            <button className="my-top-btn my-btn-danger" onClick={leaveRoomAndGoLobby}>
              Masadan Kalk
            </button>
          ) : null}
        </div>

        <div className="my-topbar-right">
          <span className="my-chip">{lobbyState.lobbyName}</span>
          <span className="my-chip">Acik Masa: {openedTables.length}</span>
          <span className={`my-chip ${realtimeStatus === "online" ? "active" : ""}`}>
            {realtimeStatus === "online"
              ? "Canli Senkron Acik"
              : realtimeStatus === "connecting"
                ? "Canli Senkron Baglaniyor"
                : "Canli Senkron Kapali"}
          </span>
          <span className={`my-chip ${roomSession ? "active" : ""}`}>
            {roomSession ? `Masa ${roomSession.tableNo}` : mode === "bot" ? "Bot Modu" : "Yerel"}
          </span>
        </div>
      </header>

      {viewMode === "lobby" ? (
        <section className="my-lobby-layout">
          <div className="my-lobby-main">
            <div className="my-lobby-header">
              <h2>{lobbyState.lobbyName}</h2>
              <p>Mynet benzeri masa listesi: sadece acik masalar gorunur.</p>
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

            {openedTables.length === 0 ? (
              <div className="my-empty-state">
                Henuz acik masa yok. <strong>Masa Ac</strong> ile ilk masayi acabilirsin.
              </div>
            ) : (
              <div className="my-table-grid">
                {openedTables.map((table) => {
                  const status = tableStatus(table);
                  const mySeatHere: Seat | null =
                    table.white?.sessionId === appSessionId
                      ? "white"
                      : table.black?.sessionId === appSessionId
                        ? "black"
                        : null;

                  return (
                    <article key={table.id} className={`my-table-card ${status}`}>
                      <div className="my-table-card-head">
                        <strong>Masa {table.id}</strong>
                        <span className="my-table-status">
                          {status === "full" ? "Dolu" : status === "waiting" ? "Bekliyor" : "Bos"}
                        </span>
                      </div>

                      <div className="my-table-board">
                        <div className="my-seat-slot white">{seatCell(table, "white")}</div>
                        <div className="my-board-mid">{table.id}</div>
                        <div className="my-seat-slot black">{seatCell(table, "black")}</div>
                      </div>

                      <div className="my-table-footer">
                        <span className="my-table-code">Kod: {table.roomCode}</span>
                        {mySeatHere ? (
                          <div className="my-mini-actions">
                            <button className="my-action-btn" onClick={() => goToTable(table, mySeatHere)}>
                              Masaya Git
                            </button>
                            <button className="my-action-btn soft" onClick={() => copyInviteFromTable(table, mySeatHere)}>
                              {copied ? "Kopyalandi" : "Davet"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="my-lobby-side">
            <section className="my-side-card">
              <h3>Uyelik</h3>
              {member ? (
                <div className="my-member-card">
                  <p className="line">
                    <strong>{member.displayName}</strong>
                  </p>
                  <p className="line">{member.email}</p>
                  <p className="line">Puan: {member.points}</p>
                  <p className="line">Oyun: {member.stats.gamesPlayed} / K: {member.stats.wins} / M: {member.stats.losses}</p>
                  <p className="line">Masadan Kacis: {member.stats.resigns}</p>
                  <button className="my-action-btn soft" onClick={onLogoutMember}>
                    Cikis
                  </button>
                </div>
              ) : (
                <div className="my-auth-form">
                  <div className="my-auth-toggle">
                    <button
                      className={authMode === "register" ? "active" : ""}
                      onClick={() => setAuthMode("register")}
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
                        placeholder="Gorunen ad"
                        value={authDisplayName}
                        onChange={(e) => setAuthDisplayName(e.target.value)}
                        disabled={authBusy}
                      />
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
                      <button className="my-action-btn" onClick={onLoginMember} disabled={authBusy}>
                        {authBusy ? "Isleniyor..." : "Giris Yap"}
                      </button>
                    </>
                  )}
                  {authError ? <p className="my-error">{authError}</p> : null}
                </div>
              )}
            </section>

            <section className="my-side-card">
              <h3>Odadakiler</h3>
              <div className="my-online-list">
                {onlineRows.map((row) => (
                  <div key={row.key} className="my-online-row">
                    <button
                      type="button"
                      className="my-name-link name"
                      onClick={() => openPlayerProfile(row.userId, row.name, row.points, row.stats)}
                      title={`${row.name} profilini goster`}
                    >
                      {row.name}
                    </button>
                    <span className="points">{row.points}</span>
                    <span className="table">{row.tableNo ? `M${row.tableNo}` : "-"}</span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>
      ) : (
        <section className="my-game-layout">
          <div className="my-game-frame">
            <iframe ref={iframeRef} title="Tavla Oyunu" src={iframeUrl} />
          </div>

          <aside className="my-game-controls">
            <section className="my-side-card">
              <h3>Oyun Secenekleri</h3>
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

              <div className="my-seat-toggle">
                <button className={`my-seat-btn ${mode === "local" ? "active" : ""}`} onClick={() => onSelectMode("local")}>
                  Iki Oyuncu
                </button>
                <button className={`my-seat-btn ${mode === "bot" ? "active" : ""}`} onClick={() => onSelectMode("bot")}>
                  Bot
                </button>
              </div>

              <button className="my-action-btn" onClick={refreshBoard}>
                Tahtayi Yenile
              </button>
              <button className="my-action-btn soft" onClick={() => setViewMode("lobby")}>
                Lobiye Don
              </button>
            </section>

            <section className="my-side-card">
              <h3>Masa Bilgisi</h3>
              {roomSession ? (
                <>
                  <p className="line">
                    Oda: <code>{roomSession.roomName}</code>
                  </p>
                  <p className="line">
                    Kod: <code>{roomSession.code}</code>
                  </p>
                  <p className="line">
                    Masa: <code>{roomSession.tableNo}</code> / Sen: <code>{seatText(roomSession.seat)}</code>
                  </p>
                  <button className="my-action-btn" onClick={onCopyInvite}>
                    {copied ? "Kopyalandi" : "Davet Linki Kopyala"}
                  </button>
                  <button className="my-action-btn danger" onClick={leaveRoomAndGoLobby}>
                    Masadan Kalk
                  </button>
                </>
              ) : (
                <>
                  <p className="line">Masa baglantisi yok. Yerel veya bot oyunu aktif.</p>
                  <button className="my-action-btn" onClick={() => setViewMode("lobby")}>
                    Masa Sec
                  </button>
                </>
              )}
            </section>
          </aside>
        </section>
      )}

      {profileModal.open ? (
        <section className="my-modal-backdrop" role="presentation" onClick={closeProfileModal}>
          <article className="my-modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>{profileModal.name}</h3>
            {profileModal.loading ? (
              <p className="line">Profil yukleniyor...</p>
            ) : (
              <>
                <p className="line">{profileModal.isMember ? "Uye Oyuncu" : "Misafir Oyuncu"}</p>
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
