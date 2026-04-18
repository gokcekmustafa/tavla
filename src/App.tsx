import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

type GameMode = "local" | "bot";
type Seat = "white" | "black";
type AuthMode = "login" | "register";
type ViewMode = "lobby" | "table";

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
  password: string;
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
  updatedAt: number;
};

type OnlineRow = {
  key: string;
  name: string;
  points: number;
  tableNo: number | null;
};

const GUEST_STORAGE_KEY = "tavla.guestName";
const MEMBER_USERS_KEY = "tavla.member.users.v1";
const MEMBER_SESSION_KEY = "tavla.member.session.v1";
const LOBBY_STATE_KEY = "tavla.lobby.state.v1";
const LOBBY_SYNC_CHANNEL = "tavla.lobby.sync.v1";
const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_LOBBY_NAME = "IZMIR";
const DEFAULT_TABLE_COUNT = 18;
const SEAT_STALE_MS = 25_000;
const HEARTBEAT_MS = 5_000;

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

function sanitizeGuestName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 24);
}

function sanitizeRoomName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 30);
}

function sanitizeLobbyName(value: string) {
  const out = value.replace(/\s+/g, " ").trim().slice(0, 22);
  return out || DEFAULT_LOBBY_NAME;
}

function sanitizeEmail(value: string) {
  return value.trim().toLowerCase().slice(0, 80);
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

function seatText(seat: Seat) {
  return seat === "white" ? "Beyaz" : "Siyah";
}

function createDefaultLobbyState(): LobbyState {
  const tables: LobbyTable[] = [];
  for (let i = 1; i <= DEFAULT_TABLE_COUNT; i += 1) {
    tables.push({
      id: i,
      roomCode: createRoomCode(),
      white: null,
      black: null,
    });
  }
  return {
    lobbyName: DEFAULT_LOBBY_NAME,
    tables,
    updatedAt: Date.now(),
  };
}

function normalizeLobbyTable(raw: unknown, index: number): LobbyTable {
  const fallbackId = index + 1;
  if (!raw || typeof raw !== "object") {
    return { id: fallbackId, roomCode: createRoomCode(), white: null, black: null };
  }
  const candidate = raw as Partial<LobbyTable>;
  const safeId = Number.isInteger(candidate.id) && (candidate.id ?? 0) > 0 ? candidate.id! : fallbackId;
  const safeCode = sanitizeRoomCode(candidate.roomCode ?? "") || createRoomCode();
  const white = normalizeSeat(candidate.white);
  const black = normalizeSeat(candidate.black);
  return {
    id: safeId,
    roomCode: safeCode,
    white,
    black,
  };
}

function normalizeSeat(raw: unknown): LobbySeatState | null {
  if (!raw || typeof raw !== "object") return null;
  const seat = raw as Partial<LobbySeatState>;
  const sessionId = typeof seat.sessionId === "string" ? seat.sessionId : "";
  if (!sessionId) return null;
  return {
    sessionId,
    userId: typeof seat.userId === "string" ? seat.userId : `guest-${sessionId}`,
    displayName: sanitizeGuestName(typeof seat.displayName === "string" ? seat.displayName : "Misafir") || "Misafir",
    points: Number.isFinite(seat.points) ? Number(seat.points) : 1500,
    touchedAt: Number.isFinite(seat.touchedAt) ? Number(seat.touchedAt) : Date.now(),
  };
}

function sortTables(tables: LobbyTable[]) {
  return [...tables].sort((a, b) => a.id - b.id);
}

function cleanupStaleSeats(tables: LobbyTable[]): { tables: LobbyTable[]; changed: boolean } {
  const now = Date.now();
  let changed = false;
  const next = tables.map((table) => {
    const whiteExpired = table.white ? now - table.white.touchedAt > SEAT_STALE_MS : false;
    const blackExpired = table.black ? now - table.black.touchedAt > SEAT_STALE_MS : false;
    if (!whiteExpired && !blackExpired) return table;
    changed = true;
    return {
      ...table,
      white: whiteExpired ? null : table.white,
      black: blackExpired ? null : table.black,
    };
  });
  return { tables: next, changed };
}

function normalizeLobbyState(raw: unknown): LobbyState {
  const fallback = createDefaultLobbyState();
  if (!raw || typeof raw !== "object") return fallback;
  const candidate = raw as Partial<LobbyState>;
  const lobbyName = sanitizeLobbyName(typeof candidate.lobbyName === "string" ? candidate.lobbyName : DEFAULT_LOBBY_NAME);
  const sourceTables = Array.isArray(candidate.tables) ? candidate.tables : fallback.tables;
  const normalized = sourceTables.map((table, index) => normalizeLobbyTable(table, index));
  const ensured = normalized.length >= DEFAULT_TABLE_COUNT
    ? normalized
    : normalized.concat(
        Array.from({ length: DEFAULT_TABLE_COUNT - normalized.length }, (_, i) =>
          normalizeLobbyTable(null, normalized.length + i),
        ),
      );
  const cleaned = cleanupStaleSeats(sortTables(ensured)).tables;
  return {
    lobbyName,
    tables: cleaned,
    updatedAt: Number.isFinite(candidate.updatedAt) ? Number(candidate.updatedAt) : Date.now(),
  };
}

function loadLobbyState() {
  return normalizeLobbyState(loadJson<unknown>(LOBBY_STATE_KEY, createDefaultLobbyState()));
}

function loadMemberUsers() {
  const raw = loadJson<unknown>(MEMBER_USERS_KEY, []);
  if (!Array.isArray(raw)) return [] as MemberUser[];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Partial<MemberUser>;
      if (!candidate.id || !candidate.email || !candidate.password) return null;
      return {
        id: String(candidate.id),
        displayName: sanitizeGuestName(String(candidate.displayName ?? "Uye")) || "Uye",
        email: sanitizeEmail(String(candidate.email)),
        password: String(candidate.password),
        points: Number.isFinite(candidate.points) ? Number(candidate.points) : 1500,
        createdAt: Number.isFinite(candidate.createdAt) ? Number(candidate.createdAt) : Date.now(),
      } as MemberUser;
    })
    .filter((item): item is MemberUser => Boolean(item));
}

function loadMemberSession() {
  const raw = loadJson<unknown>(MEMBER_SESSION_KEY, null);
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<MemberSession>;
  if (!candidate.userId) return null;
  return { userId: String(candidate.userId) } satisfies MemberSession;
}

function getInitialRoomSession(): RoomSession | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const room = sanitizeRoomCode(params.get("room") ?? "");
  const seatParam = params.get("seat");
  const seat: Seat | null = seatParam === "white" || seatParam === "black" ? seatParam : null;
  if (!room || !seat) return null;
  const roomName = sanitizeRoomName(
    params.get("room_name") ?? params.get("roomName") ?? params.get("oda") ?? DEFAULT_LOBBY_NAME,
  );
  const tableNo = sanitizeTableNo(params.get("table") ?? params.get("tableNo") ?? params.get("masa") ?? "1");
  const externalSession = sanitizeGuestName(params.get("session") ?? "");
  return {
    code: room,
    seat,
    sessionId: externalSession || createSessionId(),
    roomName: roomName || DEFAULT_LOBBY_NAME,
    tableNo,
  };
}

function getInitialGuestName() {
  if (typeof window === "undefined") return "Misafir";
  const params = new URLSearchParams(window.location.search);
  const fromUrl = sanitizeGuestName(params.get("name") ?? params.get("guest") ?? "");
  if (fromUrl) return fromUrl;
  const fromStorage = sanitizeGuestName(window.localStorage.getItem(GUEST_STORAGE_KEY) ?? "");
  return fromStorage || "Misafir";
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
  if (table.white && table.black) return "full";
  if (table.white || table.black) return "waiting";
  return "empty";
}

function App() {
  const [initialRoom] = useState<RoomSession | null>(() => getInitialRoomSession());
  const [mode, setMode] = useState<GameMode>("local");
  const [iframeKey, setIframeKey] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>(initialRoom ? "table" : "lobby");
  const [guestName, setGuestName] = useState(getInitialGuestName);
  const [roomSession, setRoomSession] = useState<RoomSession | null>(initialRoom);
  const [roomCodeInput, setRoomCodeInput] = useState(() => initialRoom?.code ?? "");
  const [roomNameInput, setRoomNameInput] = useState(() => initialRoom?.roomName ?? DEFAULT_LOBBY_NAME);
  const [tableNoInput, setTableNoInput] = useState(() => String(initialRoom?.tableNo ?? 1));
  const [joinSeat, setJoinSeat] = useState<Seat>(() => initialRoom?.seat ?? "black");
  const [copied, setCopied] = useState(false);
  const [lobbyState, setLobbyState] = useState<LobbyState>(() => loadLobbyState());

  const [memberUsers, setMemberUsers] = useState<MemberUser[]>(() => loadMemberUsers());
  const [member, setMember] = useState<MemberUser | null>(() => {
    const users = loadMemberUsers();
    const session = loadMemberSession();
    if (!session) return null;
    return users.find((u) => u.id === session.userId) ?? null;
  });
  const [authMode, setAuthMode] = useState<AuthMode>("register");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [lobbyNotice, setLobbyNotice] = useState("");

  const lobbyChannelRef = useRef<BroadcastChannel | null>(null);
  const appSessionId = useMemo(() => createSessionId(), []);

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
    if (roomSession) {
      qp.set("room", roomSession.code);
      qp.set("seat", roomSession.seat);
      qp.set("session", roomSession.sessionId);
      qp.set("room_name", roomSession.roomName);
      qp.set("table", String(roomSession.tableNo));
    }
    return `/legacy/index.html?${qp.toString()}`;
  }, [mode, iframeKey, roomSession, safeGuestName, isRoomMode]);

  const sortedTables = useMemo(() => sortTables(lobbyState.tables), [lobbyState.tables]);
  const mySeat = useMemo(() => findSessionSeat(sortedTables, appSessionId), [sortedTables, appSessionId]);

  const onlineRows = useMemo<OnlineRow[]>(() => {
    const map = new Map<string, OnlineRow>();
    sortedTables.forEach((table) => {
      const seats = [table.white, table.black];
      seats.forEach((seatInfo) => {
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
  }, [sortedTables, safeGuestName, currentProfile.points, appSessionId, mySeat]);

  function broadcastLobbySync() {
    lobbyChannelRef.current?.postMessage({ type: "lobby-sync", at: Date.now() });
  }

  function persistLobbyState(nextState: LobbyState) {
    const normalized = normalizeLobbyState(nextState);
    saveJson(LOBBY_STATE_KEY, normalized);
    setLobbyState(normalized);
    broadcastLobbySync();
  }

  function refreshLobbyFromStorage() {
    const latest = loadLobbyState();
    setLobbyState(latest);
  }

  function writeLobby(mutator: (current: LobbyState) => LobbyState | null) {
    const current = loadLobbyState();
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

  function syncRoomSeatHeartbeat() {
    if (!roomSession) return;
    writeLobby((current) => {
      const cleaned = cleanupStaleSeats(sortTables(current.tables)).tables;
      const withoutMine = clearSessionFromTables(cleaned, appSessionId).tables;
      const tableId = Math.max(1, roomSession.tableNo);
      const ensured = withoutMine.some((t) => t.id === tableId)
        ? withoutMine
        : sortTables([
            ...withoutMine,
            { id: tableId, roomCode: roomSession.code, white: null, black: null },
          ]);

      const idx = ensured.findIndex((t) => t.id === tableId);
      const table = ensured[idx];
      const occupied = roomSession.seat === "white" ? table.white : table.black;
      if (occupied && occupied.sessionId !== appSessionId) {
        setLobbyNotice(`${seatText(roomSession.seat)} koltugu dolu gorunuyor.`);
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
          ? { ...table, roomCode: roomSession.code, white: seatState }
          : { ...table, roomCode: roomSession.code, black: seatState };
      const tables = [...ensured];
      tables[idx] = patched;
      return {
        ...current,
        lobbyName: sanitizeLobbyName(roomSession.roomName || current.lobbyName),
        tables,
        updatedAt: Date.now(),
      };
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
    setRoomCodeInput(table.roomCode);
    setTableNoInput(String(table.id));
    setRoomNameInput(lobbyState.lobbyName);
    setJoinSeat(seat === "white" ? "black" : "white");
    setMode("local");
    setCopied(false);
    setLobbyNotice("");
    setViewMode("table");
    refreshBoard();
  }

  function sitToTable(tableId: number, seat: Seat) {
    const tableNo = Math.max(1, tableId);
    const next = writeLobby((current) => {
      const cleaned = cleanupStaleSeats(sortTables(current.tables)).tables;
      const withoutMine = clearSessionFromTables(cleaned, appSessionId).tables;
      const ensured = withoutMine.some((t) => t.id === tableNo)
        ? withoutMine
        : sortTables([
            ...withoutMine,
            {
              id: tableNo,
              roomCode: createRoomCode(),
              white: null,
              black: null,
            },
          ]);
      const idx = ensured.findIndex((t) => t.id === tableNo);
      const table = ensured[idx];
      const occupied = seat === "white" ? table.white : table.black;
      if (occupied && occupied.sessionId !== appSessionId) return null;
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
      const tables = [...ensured];
      tables[idx] = patched;
      return { ...current, tables, updatedAt: Date.now() };
    });
    if (!next) {
      setLobbyNotice("Secilen koltuk dolu. Baska masa deneyin.");
      return;
    }
    const activeTable = next.tables.find((t) => t.id === tableNo);
    if (!activeTable) return;
    goToTable(activeTable, seat);
  }

  function onOpenTable() {
    const latest = loadLobbyState();
    const ownSeat = findSessionSeat(latest.tables, appSessionId);
    if (ownSeat) {
      goToTable(ownSeat.table, ownSeat.seat);
      return;
    }
    const empty = sortTables(latest.tables).find((t) => !t.white && !t.black);
    const lastTable = latest.tables.length > 0 ? sortTables(latest.tables)[latest.tables.length - 1] : null;
    const tableNo = empty ? empty.id : (lastTable?.id ?? 0) + 1;
    sitToTable(tableNo, "white");
  }

  function onQuickPlay() {
    const latest = loadLobbyState();
    const ownSeat = findSessionSeat(latest.tables, appSessionId);
    if (ownSeat) {
      goToTable(ownSeat.table, ownSeat.seat);
      return;
    }
    const waiting = sortTables(latest.tables).find((t) => (Boolean(t.white) ? 1 : 0) + (Boolean(t.black) ? 1 : 0) === 1);
    if (waiting) {
      sitToTable(waiting.id, waiting.white ? "black" : "white");
      return;
    }
    onOpenTable();
  }

  function onJoinByCode() {
    const safeCode = sanitizeRoomCode(roomCodeInput);
    if (!safeCode) {
      setLobbyNotice("Gecerli oda kodu girin.");
      return;
    }
    const latest = loadLobbyState();
    const table = latest.tables.find((t) => t.roomCode === safeCode);
    if (!table) {
      const tableNo = sanitizeTableNo(tableNoInput);
      const created = writeLobby((current) => {
        const cleaned = cleanupStaleSeats(sortTables(current.tables)).tables;
        if (cleaned.some((t) => t.id === tableNo)) return current;
        return {
          ...current,
          lobbyName: sanitizeLobbyName(roomNameInput || current.lobbyName),
          tables: sortTables([
            ...cleaned,
            { id: tableNo, roomCode: safeCode, white: null, black: null },
          ]),
          updatedAt: Date.now(),
        };
      });
      if (!created) {
        setLobbyNotice("Masa olusturulamadi.");
        return;
      }
      const joinTable = created.tables.find((t) => t.roomCode === safeCode);
      if (!joinTable) return;
      sitToTable(joinTable.id, joinSeat);
      return;
    }
    if (joinSeat === "white" && table.white && table.white.sessionId !== appSessionId) {
      if (!table.black || table.black.sessionId === appSessionId) {
        sitToTable(table.id, "black");
        return;
      }
      setLobbyNotice("Masa dolu.");
      return;
    }
    if (joinSeat === "black" && table.black && table.black.sessionId !== appSessionId) {
      if (!table.white || table.white.sessionId === appSessionId) {
        sitToTable(table.id, "white");
        return;
      }
      setLobbyNotice("Masa dolu.");
      return;
    }
    sitToTable(table.id, joinSeat);
  }

  function leaveSeatAndRoom() {
    writeLobby((current) => {
      const cleaned = cleanupStaleSeats(sortTables(current.tables)).tables;
      const cleared = clearSessionFromTables(cleaned, appSessionId);
      if (!cleared.changed) return current;
      return { ...current, tables: cleared.tables, updatedAt: Date.now() };
    });
    setRoomSession(null);
    setCopied(false);
    setLobbyNotice("");
    setViewMode("lobby");
    refreshBoard();
  }

  async function onCopyInvite() {
    if (!roomSession) return;
    const inviteSeat: Seat = roomSession.seat === "white" ? "black" : "white";
    const url = new URL(window.location.href);
    url.searchParams.set("room", roomSession.code);
    url.searchParams.set("seat", inviteSeat);
    url.searchParams.set("name", safeGuestName);
    url.searchParams.set("room_name", roomSession.roomName);
    url.searchParams.set("table", String(roomSession.tableNo));
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1300);
  }

  function onRegisterMember() {
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
    if (memberUsers.some((u) => u.email === email)) {
      setAuthError("Bu e-posta ile hesap zaten var.");
      return;
    }
    const user: MemberUser = {
      id: createSessionId(),
      displayName,
      email,
      password,
      points: 1500,
      createdAt: Date.now(),
    };
    const nextUsers = [user, ...memberUsers];
    setMemberUsers(nextUsers);
    saveJson(MEMBER_USERS_KEY, nextUsers);
    saveJson(MEMBER_SESSION_KEY, { userId: user.id } satisfies MemberSession);
    setMember(user);
    setGuestName(user.displayName);
    setAuthError("");
    setAuthPassword("");
    setAuthEmail("");
    setAuthDisplayName("");
  }

  function onLoginMember() {
    const email = sanitizeEmail(authEmail);
    const password = authPassword.trim().slice(0, 64);
    const found = memberUsers.find((u) => u.email === email && u.password === password);
    if (!found) {
      setAuthError("E-posta veya sifre yanlis.");
      return;
    }
    setMember(found);
    saveJson(MEMBER_SESSION_KEY, { userId: found.id } satisfies MemberSession);
    setGuestName(found.displayName);
    setAuthError("");
    setAuthPassword("");
  }

  function onLogoutMember() {
    window.localStorage.removeItem(MEMBER_SESSION_KEY);
    setMember(null);
    setAuthError("");
  }

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
      if (lobbyChannelRef.current === channel) lobbyChannelRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === LOBBY_STATE_KEY) {
        refreshLobbyFromStorage();
      }
      if (event.key === MEMBER_USERS_KEY) {
        const users = loadMemberUsers();
        setMemberUsers(users);
        const session = loadMemberSession();
        setMember(session ? users.find((u) => u.id === session.userId) ?? null : null);
      }
      if (event.key === MEMBER_SESSION_KEY) {
        const users = loadMemberUsers();
        const session = loadMemberSession();
        setMember(session ? users.find((u) => u.id === session.userId) ?? null : null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const latest = loadLobbyState();
      const cleaned = normalizeLobbyState(latest);
      if (JSON.stringify(cleaned) !== JSON.stringify(latest)) {
        saveJson(LOBBY_STATE_KEY, cleaned);
        setLobbyState(cleaned);
        broadcastLobbySync();
        return;
      }
      setLobbyState(cleaned);
    }, 9_000);
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
      const current = loadLobbyState();
      const cleaned = cleanupStaleSeats(sortTables(current.tables)).tables;
      const cleared = clearSessionFromTables(cleaned, appSessionId);
      if (!cleared.changed) return;
      const next = { ...current, tables: cleared.tables, updatedAt: Date.now() };
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
          {!member ? (
            <button className="my-top-btn my-btn-member" onClick={() => setAuthMode("register")}>
              Uye Ol
            </button>
          ) : (
            <button className="my-top-btn my-btn-member-alt" onClick={onLogoutMember}>
              {member.displayName}
            </button>
          )}
          <button className="my-top-btn my-btn-neutral" onClick={() => setViewMode("lobby")}>
            Lobiye Don
          </button>
        </div>
        <div className="my-topbar-right">
          <span className="my-chip">{lobbyState.lobbyName}</span>
          <span className="my-chip">Masa: {sortedTables.length}</span>
          <span className={`my-chip ${roomSession ? "active" : ""}`}>
            {roomSession ? `Aktif Masa ${roomSession.tableNo}` : "Masada Degilsin"}
          </span>
        </div>
      </header>

      {viewMode === "lobby" ? (
        <section className="my-lobby-layout">
          <div className="my-lobby-main">
            <div className="my-lobby-header">
              <div>
                <h2>{lobbyState.lobbyName}</h2>
                <p>Mynet tarzi masa gorunumu: bos, bekleyen, dolu.</p>
              </div>
              <div className="my-lobby-tools">
                <label className="my-field">
                  <span>Misafir / Uye</span>
                  <input
                    className="my-input"
                    value={guestName}
                    maxLength={24}
                    onChange={(e) => setGuestName(e.target.value)}
                    disabled={Boolean(member)}
                  />
                </label>
                <label className="my-field">
                  <span>Oda Adi</span>
                  <input
                    className="my-input"
                    value={roomNameInput}
                    maxLength={30}
                    onChange={(e) => setRoomNameInput(sanitizeRoomName(e.target.value))}
                  />
                </label>
                <label className="my-field">
                  <span>Oda Kodu</span>
                  <input
                    className="my-input"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(sanitizeRoomCode(e.target.value))}
                    placeholder="AB12CD"
                  />
                </label>
                <label className="my-field">
                  <span>Masa No</span>
                  <input
                    className="my-input"
                    value={tableNoInput}
                    inputMode="numeric"
                    onChange={(e) => setTableNoInput(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                    placeholder="1"
                  />
                </label>
                <div className="my-seat-toggle">
                  <button
                    className={`my-seat-btn ${joinSeat === "white" ? "active" : ""}`}
                    onClick={() => setJoinSeat("white")}
                  >
                    Beyaz
                  </button>
                  <button
                    className={`my-seat-btn ${joinSeat === "black" ? "active" : ""}`}
                    onClick={() => setJoinSeat("black")}
                  >
                    Siyah
                  </button>
                </div>
                <button className="my-action-btn" onClick={onJoinByCode}>
                  Koda Katil
                </button>
              </div>
            </div>

            {lobbyNotice ? <p className="my-notice">{lobbyNotice}</p> : null}

            <div className="my-table-grid">
              {sortedTables.map((table) => {
                const status = tableStatus(table);
                const iAmWhite = table.white?.sessionId === appSessionId;
                const iAmBlack = table.black?.sessionId === appSessionId;
                const mySeatHere: Seat | null = iAmWhite ? "white" : iAmBlack ? "black" : null;
                return (
                  <article key={table.id} className={`my-table-card ${status}`}>
                    <div className="my-table-card-head">
                      <strong>Masa {table.id}</strong>
                      <span>
                        {status === "empty" ? "Bos" : status === "waiting" ? "Bekliyor" : "Dolu"}
                      </span>
                    </div>

                    <div className="my-mini-board">
                      <div className="my-mini-seat white">
                        <div className="my-mini-name">{table.white?.displayName ?? "Beyaz Bos"}</div>
                      </div>
                      <div className="my-mini-table-code">{table.roomCode}</div>
                      <div className="my-mini-seat black">
                        <div className="my-mini-name">{table.black?.displayName ?? "Siyah Bos"}</div>
                      </div>
                    </div>

                    <div className="my-table-actions">
                      {mySeatHere ? (
                        <>
                          <button className="my-action-btn" onClick={() => goToTable(table, mySeatHere)}>
                            Masaya Git
                          </button>
                          <button className="my-action-btn soft" onClick={leaveSeatAndRoom}>
                            Masadan Kalk
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="my-action-btn"
                            disabled={Boolean(table.white)}
                            onClick={() => sitToTable(table.id, "white")}
                          >
                            Beyaz Otur
                          </button>
                          <button
                            className="my-action-btn"
                            disabled={Boolean(table.black)}
                            onClick={() => sitToTable(table.id, "black")}
                          >
                            Siyah Otur
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="my-lobby-side">
            <section className="my-side-card">
              <h3>Uyelik</h3>
              {member ? (
                <div className="my-member-card">
                  <p className="line">
                    <strong>{member.displayName}</strong>
                  </p>
                  <p className="line">E-posta: {member.email}</p>
                  <p className="line">Puan: {member.points}</p>
                  <button className="my-action-btn soft" onClick={onLogoutMember}>
                    Cikis Yap
                  </button>
                </div>
              ) : (
                <div className="my-auth-form">
                  <div className="my-auth-toggle">
                    <button
                      className={authMode === "register" ? "active" : ""}
                      onClick={() => setAuthMode("register")}
                    >
                      Uye Ol
                    </button>
                    <button
                      className={authMode === "login" ? "active" : ""}
                      onClick={() => setAuthMode("login")}
                    >
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
                      />
                      <input
                        className="my-input"
                        placeholder="E-posta"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                      />
                      <input
                        className="my-input"
                        type="password"
                        placeholder="Sifre"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                      />
                      <button className="my-action-btn" onClick={onRegisterMember}>
                        Uye Ol ve Basla
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        className="my-input"
                        placeholder="E-posta"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                      />
                      <input
                        className="my-input"
                        type="password"
                        placeholder="Sifre"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                      />
                      <button className="my-action-btn" onClick={onLoginMember}>
                        Giris Yap
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
            <div className="my-side-card">
              <h3>Oyun Secenekleri</h3>
              <label className="my-field">
                <span>Oyuncu Adi</span>
                <input
                  className="my-input"
                  value={guestName}
                  maxLength={24}
                  onChange={(e) => setGuestName(e.target.value)}
                  disabled={Boolean(member)}
                />
              </label>
              <div className="my-seat-toggle">
                <button
                  className={`my-seat-btn ${mode === "local" ? "active" : ""}`}
                  onClick={() => setMode("local")}
                  disabled={isRoomMode}
                >
                  Iki Oyuncu
                </button>
                <button
                  className={`my-seat-btn ${mode === "bot" ? "active" : ""}`}
                  onClick={() => setMode("bot")}
                  disabled={isRoomMode}
                >
                  Bot
                </button>
              </div>
              <button className="my-action-btn" onClick={refreshBoard}>
                Tahtayi Yenile
              </button>
              <button className="my-action-btn soft" onClick={() => setViewMode("lobby")}>
                Lobiye Don
              </button>
            </div>

            <div className="my-side-card">
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
                  <button className="my-action-btn danger" onClick={leaveSeatAndRoom}>
                    Masadan Kalk
                  </button>
                </>
              ) : (
                <>
                  <p className="line">Yerel veya bot modunda oynuyorsun.</p>
                  <button className="my-action-btn" onClick={() => setViewMode("lobby")}>
                    Masa Sec
                  </button>
                </>
              )}
            </div>
          </aside>
        </section>
      )}
    </main>
  );
}

export default App;
