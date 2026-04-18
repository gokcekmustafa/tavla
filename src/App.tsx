import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

type GameMode = "local" | "bot";
type Seat = "white" | "black";
type ViewMode = "lobby" | "table";
type AuthMode = "login" | "register";

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
};

type MemberSession = {
  userId: string;
};

type LobbySeatState = {
  sessionId: string;
  userId: string;
  displayName: string;
  points: number;
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
  name: string;
  points: number;
  tableNo: number | null;
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
const MEMBER_SESSION_KEY = "tavla.member.session.v1";
const LOBBY_STATE_KEY = "tavla.lobby.state.v2";
const LOBBY_SYNC_CHANNEL = "tavla.lobby.sync.v2";
const REALTIME_LOBBY_CHANNEL = "tavla-global-lobby-v1";
const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_LOBBY_NAME = "Lobi 1";
const SEAT_STALE_MS = 25_000;
const HEARTBEAT_MS = 5_000;

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
    points: Number.isFinite(candidate.points) ? Number(candidate.points) : 1500,
    createdAt: Number.isFinite(candidate.createdAt) ? Number(candidate.createdAt) : Date.now(),
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
    points: Number.isFinite(candidate.points) ? Number(candidate.points) : 1500,
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

  const safeGuestName = useMemo(() => {
    const memberName = member ? sanitizeGuestName(member.displayName) : "";
    if (memberName) return memberName;
    return sanitizeGuestName(guestName) || "Misafir";
  }, [guestName, member]);

  const currentProfile = useMemo(() => {
    return {
      userId: member ? member.id : `guest-${appSessionId}`,
      displayName: safeGuestName,
      points: member?.points ?? 1500,
    };
  }, [member, safeGuestName, appSessionId]);

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
          name: seatInfo.displayName,
          points: seatInfo.points,
          tableNo: table.id,
        });
      });
    });
    if (!map.has(appSessionId)) {
      map.set(appSessionId, {
        key: appSessionId,
        name: safeGuestName,
        points: currentProfile.points,
        tableNo: mySeat?.table.id ?? null,
      });
    }
    return Array.from(map.values()).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  }, [openedTables, appSessionId, safeGuestName, currentProfile.points, mySeat]);

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

  function leaveRoomAndGoLobby() {
    releaseSeatOnly();
    setRoomSession(null);
    setCopied(false);
    setLobbyNotice("");
    setViewMode("lobby");
    refreshBoard();
  }

  function startBotGame() {
    if (roomSession) {
      releaseSeatOnly();
    }
    setRoomSession(null);
    setMode("bot");
    setCopied(false);
    setLobbyNotice("Bot modu aktif.");
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
        <span className="my-occupant-name">{occupant.displayName}</span>
      </div>
    );
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
  }, [roomSession, currentProfile.userId, currentProfile.displayName, currentProfile.points, appSessionId]);

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
                    <span className="name">{row.name}</span>
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
            <iframe title="Tavla Oyunu" src={iframeUrl} />
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
    </main>
  );
}

export default App;
