import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import "../../App.css";

type GameMode = "local" | "bot";
type Seat = "white" | "black";
type RoomRole = "player" | "spectator";
type ViewMode = "lobby" | "table";
type GameId = "tavla" | "okey101";
type EntryScreen = "game" | "room" | "lobby";
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
  lobbyId: string;
  roomName: string;
  tableNo: number;
  role: RoomRole;
  joinedAt: number;
};

type LobbyRoom = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  createdByUserId: string | null;
};

type MemberPermissions = {
  lobbyChat: boolean;
  tableChat: boolean;
  spectatorChat: boolean;
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
  isBlocked: boolean;
  permissions: MemberPermissions;
};

type GameRules = {
  winPoints: number;
  lossPoints: number;
  resignPenaltyPoints: number;
  updatedAt: number;
};

type DesignTextKey =
  | "lobbyOpenTable"
  | "lobbyQuickPlay"
  | "lobbyHome"
  | "lobbyRoomSelect"
  | "lobbyBotMode"
  | "roomLeaveTable"
  | "roomBackLobby"
  | "roomInvite"
  | "roomPrivateEnable"
  | "roomPrivateDisable"
  | "roomSpectatorEnable"
  | "roomSpectatorDisable"
  | "roomCopyInvite"
  | "chatSend"
  | "lobbyEmptyTitle"
  | "lobbyEmptySub";

type DesignTheme = {
  shellFrom: string;
  shellTo: string;
  topbarFrom: string;
  topbarTo: string;
  lobbyPanelFrom: string;
  lobbyPanelTo: string;
  roomPanelFrom: string;
  roomPanelTo: string;
  accentFrom: string;
  accentTo: string;
  fontFamily: string;
};

type DesignLayout = {
  lobbyHeaderActions: ("openTable" | "quickPlay")[];
  lobbyTopButtons: ("home" | "roomSelect" | "botMode")[];
  roomOwnerButtons: ("invite" | "private" | "spectator" | "copyLink")[];
};

type DesignSizing = {
  buttonScalePct: number;
  lobbyTableZoneHeight: number;
  roomBoardMinHeight: number;
};

type DesignConfig = {
  version: number;
  updatedAt: number;
  theme: DesignTheme;
  texts: Partial<Record<DesignTextKey, string>>;
  layout: DesignLayout;
  sizing: DesignSizing;
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
  sessionKey: string;
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
  lobbyId: string;
};

type LobbyTable = {
  id: number;
  roomCode: string;
  white: LobbySeatState | null;
  black: LobbySeatState | null;
  whiteClearToken: string | null;
  blackClearToken: string | null;
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

type LobbyRoomCounts = {
  activeTables: number;
  seatedPlayers: number;
};

type FlowEvent = {
  id: string;
  at: number;
  kind: string;
  detail: string;
  lobbyId: string;
  tableId: number;
  roomCode: string;
  seat: Seat | null;
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
  anchorLeft: number;
  anchorTop: number;
};

type LeaveConfirmModalState = {
  open: boolean;
  title: string;
  message: string;
};

type CleanupResult = {
  tables: LobbyTable[];
  changed: boolean;
};

type UpsertSeatResult = {
  table: LobbyTable | null;
  reason: "occupied" | "already-seated" | "private" | "missing-owner" | "duplicate-user" | null;
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

type RoomPickerSessionState = {
  identity: string;
  lobbyId: string;
  gameId: GameId;
  confirmedAt: number;
};

type OkeyPrototypeSeatNo = 1 | 2 | 3 | 4;
type OkeyPrototypeNormalColor = "kirmizi" | "mavi" | "sari" | "siyah";
type OkeyPrototypeTileColor = OkeyPrototypeNormalColor | "sahte";
type OkeyPrototypeTileKind = "normal" | "sahte";
type OkeyPrototypeTile = {
  id: string;
  kind: OkeyPrototypeTileKind;
  color: OkeyPrototypeTileColor;
  value: number;
};
type OkeyPrototypeRackState = Record<OkeyPrototypeSeatNo, OkeyPrototypeTile[]>;
type OkeyPrototypeTurnPhase = "draw" | "discard";
type OkeyPrototypeDiscardEntry = {
  id: string;
  seatNo: OkeyPrototypeSeatNo;
  tile: OkeyPrototypeTile;
  round: number;
  at: number;
};
type OkeyPrototypeMeldKind = "seri" | "set";
type OkeyPrototypeMeldEntry = {
  id: string;
  seatNo: OkeyPrototypeSeatNo;
  round: number;
  tiles: OkeyPrototypeTile[];
  kind: OkeyPrototypeMeldKind;
  at: number;
};
type OkeyPrototypeSeatOpenedState = Record<OkeyPrototypeSeatNo, boolean>;
type OkeyPrototypeScenarioKind = "opening" | "attach" | "finish" | "draw-end";
type OkeyPrototypeRackSortMode = "color" | "value";
type OkeyPrototypeAutoSortMode = "off" | OkeyPrototypeRackSortMode;
type OkeyPrototypeBotDifficulty = "easy" | "normal" | "hard";
type OkeyPrototypeDealState = {
  rackState: OkeyPrototypeRackState;
  wallTiles: OkeyPrototypeTile[];
  indicatorTile: OkeyPrototypeTile | null;
  okeyTile: OkeyPrototypeTile | null;
  turnSeat: OkeyPrototypeSeatNo;
  turnPhase: OkeyPrototypeTurnPhase;
  turnRound: number;
};

type OkeyPrototypeLobbySeatState = {
  userId: string;
  sessionId: string;
  username: string;
  displayName: string;
  gender: MemberGender;
  avatarId: AvatarId;
  points: number;
  stats: PlayerStats;
  joinedAt: number;
};

type OkeyPrototypeLobbyTableState = {
  id: string;
  roomId: string;
  tableNo: number;
  ownerUserId: string;
  ownerSessionId: string;
  seats: Partial<Record<OkeyPrototypeSeatNo, OkeyPrototypeLobbySeatState>>;
  createdAt: number;
  startedAt: number | null;
};

type OkeyPrototypeTableSketchRow = {
  id: string;
  roomId: string;
  tableNo: number;
  active: boolean;
  started: boolean;
  seated: number;
  occupiedSeatNos: OkeyPrototypeSeatNo[];
  ownerUserId: string;
  seats: Partial<Record<OkeyPrototypeSeatNo, OkeyPrototypeLobbySeatState>>;
};

const GUEST_STORAGE_KEY = "tavla.guestName";
const GUEST_ID_STORAGE_KEY = "tavla.guest.id.v1";
const GUEST_PROFILE_SESSION_KEY = "tavla.guest.profile.session.v1";
const MEMBER_SESSION_KEY = "tavla.member.session.v1";
const ACTIVE_LOBBY_ID_KEY = "tavla.active.lobby.id.v1";
const ROOM_PICKER_SESSION_KEY = "tavla.room.picker.session.v1";
const GAME_SELECTION_SESSION_KEY = "tavla.game.selection.session.okey101.v1";
const ROOT_GAME_CHOICE_KEY = "tavla.root.selected.game.v1";
const OKEY_PROTOTYPE_TILE_SCALE_SESSION_KEY = "tavla.okey.prototype.tile.scale.pct.v1";
const OKEY_PROTOTYPE_AUTO_SORT_SESSION_KEY = "tavla.okey.prototype.auto.sort.mode.v1";
const LEAVE_NOTICE_REJECT_PREFIX = "LEAVE_REJECT|";
const LOBBY_STATE_KEY_PREFIX = "tavla.lobby.state.v3";
const LOBBY_SYNC_CHANNEL_PREFIX = "tavla.lobby.sync.v3";
const REALTIME_LOBBY_CHANNEL_PREFIX = "tavla-global-lobby-v2";
const REALTIME_HTTP_SYNC_PATH = "/api/lobby-sync";
const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_LOBBY_NAME = "Lobi 1";
const DEFAULT_LOBBY_ID = "lobi-1";
const DEFAULT_GAME_ID: GameId = "tavla";
const SEAT_STALE_MS = 180_000;
const PRESENCE_STALE_MS = 20_000;
const HEARTBEAT_MS = 8_000;
// Cihaz saatleri arasındaki fark (özellikle mobil/masaüstü) seat-null merge sırasında
// koltuğun yanlışlıkla düşmesine neden olabiliyor. Daha geniş tolerans kullanıyoruz.
const SEAT_NULL_MERGE_GRACE_MS = 15 * 60 * 1000;
const DEFAULT_WIN_POINTS = 100;
const DEFAULT_LOSS_POINTS = 0;
const DEFAULT_RESIGN_PENALTY_POINTS = 50;
const DEFAULT_DESIGN_FONT = "'Trebuchet MS', 'Segoe UI', sans-serif";
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
const ACTIVITY_CLOCK_SKEW_LIMIT_MS = 24 * 60 * 60 * 1000;
const ENABLE_WS_DEBUG_LOGS = false;
const WS_PREOPEN_FAIL_DISABLE_THRESHOLD = 3;
const WS_DISABLE_DURATION_MS = 2 * 60 * 1000;
const HTTP_SYNC_TIMEOUT_MS = 8_000;
const HTTP_SYNC_THROTTLE_MS = 900;
const HTTP_SYNC_MIRROR_MIN_INTERVAL_MS = 8_000;
const HTTP_SYNC_RUN_INTERVAL_MS = 4_000;
const HTTP_SYNC_BACKGROUND_RUN_INTERVAL_MS = 10_000;
const HTTP_SYNC_ERROR_BACKOFF_MIN_MS = 1_500;
const HTTP_SYNC_ERROR_BACKOFF_MAX_MS = 30_000;
const ROOM_START_GATE_RESYNC_DELAY_MS = 700;
const FLOW_EVENT_LOG_LIMIT = 120;
const FLOW_EVENT_DEDUPE_DEFAULT_MS = 2_500;
const ENABLE_FLOW_DEBUG_LOGS = false;
const DIAGNOSTICS_MODE_STORAGE_KEY = "tavla.diag.mode.v1";
const ROOM_PICKER_REFRESH_INTERVAL_MS = 6_000;
const ROOM_PICKER_REMOTE_REFRESH_MIN_MS = 12_000;
const ROOM_PICKER_REMOTE_FETCH_TIMEOUT_MS = 4_000;
const ROOM_PICKER_REMOTE_ERROR_BACKOFF_MIN_MS = 6_000;
const ROOM_PICKER_REMOTE_ERROR_BACKOFF_MAX_MS = 90_000;
const MEMBER_SESSION_REVALIDATE_INTERVAL_MS = 10_000;
const PROFILE_POPOVER_WIDTH_PX = 300;
const PROFILE_POPOVER_MIN_HEIGHT_PX = 220;
const PROFILE_POPOVER_GAP_PX = 6;
const PROFILE_POPOVER_VIEWPORT_MARGIN_PX = 8;
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

const FALLBACK_CLOUD_API_BASE = "https://tavla.gokcek.workers.dev";
const OKEY_PROTOTYPE_ROOMS = [
  { id: "okey-1", name: "Marmara", activeTables: 0, players: 0, level: "Standart" },
  { id: "okey-2", name: "Ege", activeTables: 0, players: 0, level: "Hizli" },
  { id: "okey-3", name: "Anadolu", activeTables: 0, players: 0, level: "Turnuva" },
  { id: "okey-4", name: "Akdeniz", activeTables: 0, players: 0, level: "Baslangic" },
] as const;
const OKEY_PROTOTYPE_TOTAL_TILE_COUNT = 106;
const OKEY_PROTOTYPE_HAND_TILE_COUNT = 21;
const OKEY_PROTOTYPE_STARTER_BONUS_TILE_COUNT = 1;
const OKEY_PROTOTYPE_OPENING_TARGET_POINTS = 101;
const OKEY_PROTOTYPE_PAIR_OPEN_MIN_PAIRS = 5;
const OKEY_PROTOTYPE_SEATS: readonly OkeyPrototypeSeatNo[] = [1, 2, 3, 4];
const OKEY_PROTOTYPE_TILE_COLORS: readonly OkeyPrototypeNormalColor[] = ["kirmizi", "mavi", "sari", "siyah"];
const OKEY_PROTOTYPE_OPPONENT_NAMES = [
  "TasUstasi",
  "PerciBey",
  "SeriKral",
  "MasaRitmi",
  "DiziAvcisi",
  "CiftOkey",
] as const;

function createOkeyPrototypeSeededRandom(seed = 0) {
  let state = (Math.abs(Math.trunc(seed)) || 1) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function hashOkeyPrototypeText(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function shuffleOkeyPrototypeDeck(tiles: OkeyPrototypeTile[], seed = 0) {
  const random = createOkeyPrototypeSeededRandom(seed || Date.now());
  const shuffled = tiles.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = current;
  }
  return shuffled;
}

function createOkeyPrototypeDeck(seed = 0) {
  const safeSeed = Math.abs(Math.trunc(seed)) || Date.now();
  const normalTileKinds = OKEY_PROTOTYPE_TILE_COLORS.length * 13;
  const normalCopies = Math.max(1, Math.floor((OKEY_PROTOTYPE_TOTAL_TILE_COUNT - 2) / normalTileKinds));
  const tiles: OkeyPrototypeTile[] = [];
  OKEY_PROTOTYPE_TILE_COLORS.forEach((color) => {
    for (let value = 1; value <= 13; value += 1) {
      for (let copy = 1; copy <= normalCopies; copy += 1) {
        tiles.push({
          id: `okey-proto-deck-${color}-${value}-${copy}-${safeSeed}`,
          kind: "normal",
          color,
          value,
        });
      }
    }
  });
  const producedNormalCount = normalTileKinds * normalCopies;
  const sahteCount = Math.max(0, OKEY_PROTOTYPE_TOTAL_TILE_COUNT - producedNormalCount);
  for (let copy = 1; copy <= sahteCount; copy += 1) {
    tiles.push({
      id: `okey-proto-deck-sahte-${copy}-${safeSeed}`,
      kind: "sahte",
      color: "sahte",
      value: 0,
    });
  }
  return shuffleOkeyPrototypeDeck(tiles, safeSeed);
}

function createEmptyOkeyPrototypeRackState(): OkeyPrototypeRackState {
  return {
    1: [],
    2: [],
    3: [],
    4: [],
  };
}

function createOkeyPrototypeOkeyTile(indicatorTile: OkeyPrototypeTile | null): OkeyPrototypeTile | null {
  if (!indicatorTile || indicatorTile.kind !== "normal") return null;
  return {
    id: `okey-proto-indicator-okey-${indicatorTile.id}`,
    kind: "normal",
    color: indicatorTile.color,
    value: indicatorTile.value === 13 ? 1 : indicatorTile.value + 1,
  };
}

function getNormalizedOkeyPrototypeActiveSeats(
  activeSeats: readonly OkeyPrototypeSeatNo[] | null | undefined,
  firstSeat: OkeyPrototypeSeatNo,
) {
  const pool = activeSeats && activeSeats.length > 0
    ? activeSeats
    : OKEY_PROTOTYPE_SEATS;
  const deduped = Array.from(new Set(pool))
    .filter((seatNo): seatNo is OkeyPrototypeSeatNo => OKEY_PROTOTYPE_SEATS.includes(seatNo))
    .sort((left, right) => left - right);
  if (!deduped.includes(firstSeat)) {
    deduped.push(firstSeat);
    deduped.sort((left, right) => left - right);
  }
  return deduped;
}

function createOkeyPrototypeDealState(
  seed = 0,
  firstSeat: OkeyPrototypeSeatNo = 1,
  activeSeats?: readonly OkeyPrototypeSeatNo[],
): OkeyPrototypeDealState {
  const safeSeed = Math.abs(Math.trunc(seed)) || Date.now();
  const wallTiles = createOkeyPrototypeDeck(safeSeed);
  const indicatorIndex = wallTiles.findIndex((tile) => tile.kind === "normal");
  const indicatorTile = indicatorIndex >= 0 ? wallTiles.splice(indicatorIndex, 1)[0] ?? null : null;
  const okeyTile = createOkeyPrototypeOkeyTile(indicatorTile);
  const rackState = createEmptyOkeyPrototypeRackState();
  const seatsToDeal = getNormalizedOkeyPrototypeActiveSeats(activeSeats, firstSeat);
  seatsToDeal.forEach((seatNo) => {
    for (let round = 0; round < OKEY_PROTOTYPE_HAND_TILE_COUNT; round += 1) {
      const nextTile = wallTiles.shift();
      if (!nextTile) break;
      rackState[seatNo] = [...rackState[seatNo], nextTile];
    }
  });
  for (let bonus = 0; bonus < OKEY_PROTOTYPE_STARTER_BONUS_TILE_COUNT; bonus += 1) {
    const bonusTile = wallTiles.shift();
    if (!bonusTile) break;
    rackState[firstSeat] = [...rackState[firstSeat], bonusTile];
  }
  return {
    rackState,
    wallTiles,
    indicatorTile,
    okeyTile,
    turnSeat: firstSeat,
    turnPhase: "discard",
    turnRound: 1,
  };
}

function formatOkeyPrototypeTile(tile: OkeyPrototypeTile) {
  if (tile.kind === "sahte") return "sahte-okey";
  return `${tile.color}-${tile.value}`;
}

function renderOkeyPrototypeTileFace(tile: OkeyPrototypeTile) {
  if (tile.kind === "sahte") return "S";
  return String(tile.value);
}

function isOkeyPrototypeJokerTile(tile: OkeyPrototypeTile, okeyTile: OkeyPrototypeTile | null = null) {
  if (tile.kind === "sahte") return true;
  if (!okeyTile || okeyTile.kind !== "normal") return false;
  return tile.kind === "normal" && tile.color === okeyTile.color && tile.value === okeyTile.value;
}

function sortOkeyPrototypeRackTiles(
  tiles: OkeyPrototypeTile[],
  mode: OkeyPrototypeRackSortMode,
  okeyTile: OkeyPrototypeTile | null = null,
) {
  const colorIndexOf = (tile: OkeyPrototypeTile) => {
    if (tile.kind !== "normal") return Number.POSITIVE_INFINITY;
    const index = OKEY_PROTOTYPE_TILE_COLORS.findIndex((entry) => entry === tile.color);
    return index >= 0 ? index : Number.POSITIVE_INFINITY;
  };
  return tiles.slice().sort((left, right) => {
    const leftIsJoker = isOkeyPrototypeJokerTile(left, okeyTile);
    const rightIsJoker = isOkeyPrototypeJokerTile(right, okeyTile);
    if (leftIsJoker !== rightIsJoker) return leftIsJoker ? 1 : -1;
    if (mode === "color") {
      const colorDiff = colorIndexOf(left) - colorIndexOf(right);
      if (colorDiff !== 0) return colorDiff;
      const valueDiff = left.value - right.value;
      if (valueDiff !== 0) return valueDiff;
      return left.id.localeCompare(right.id);
    }
    const valueDiff = left.value - right.value;
    if (valueDiff !== 0) return valueDiff;
    const colorDiff = colorIndexOf(left) - colorIndexOf(right);
    if (colorDiff !== 0) return colorDiff;
    return left.id.localeCompare(right.id);
  });
}

function getOkeyPrototypeTileUsefulnessScore(
  tile: OkeyPrototypeTile,
  rack: OkeyPrototypeTile[],
  okeyTile: OkeyPrototypeTile | null = null,
) {
  if (rack.length === 0) return 0;
  const tileIsJoker = isOkeyPrototypeJokerTile(tile, okeyTile);
  let score = tileIsJoker ? 100 : 0;
  if (tile.kind === "normal") {
    const sameColorNeighbors = rack.filter((entry) => (
      entry.id !== tile.id
      && entry.kind === "normal"
      && entry.color === tile.color
    ));
    sameColorNeighbors.forEach((entry) => {
      const diff = Math.abs(entry.value - tile.value);
      if (diff === 0) {
        score += 2.2;
        return;
      }
      if (diff === 1) {
        score += 6.2;
        return;
      }
      if (diff === 2) {
        score += 3.4;
      }
    });
    const sameValueCount = rack.filter((entry) => (
      entry.id !== tile.id
      && entry.kind === "normal"
      && entry.value === tile.value
      && entry.color !== tile.color
    )).length;
    score += sameValueCount * 4.7;
    if (tile.value >= 11) score += 0.6;
  } else {
    score += 18;
  }
  return Number(score.toFixed(3));
}

function pickOkeyPrototypeBotDiscardTileId(
  rack: OkeyPrototypeTile[],
  okeyTile: OkeyPrototypeTile | null,
  difficulty: OkeyPrototypeBotDifficulty,
) {
  if (rack.length === 0) return null;
  const weighted = rack.map((tile) => ({
    tile,
    score: getOkeyPrototypeTileUsefulnessScore(tile, rack, okeyTile),
  }));
  if (difficulty === "easy") {
    if (Math.random() < 0.55) {
      return rack[Math.floor(Math.random() * rack.length)]?.id ?? null;
    }
    const sorted = weighted.slice().sort((left, right) => left.score - right.score);
    return sorted[Math.floor(Math.random() * Math.min(4, sorted.length))]?.tile.id ?? sorted[0]?.tile.id ?? null;
  }
  const sorted = weighted.slice().sort((left, right) => {
    if (left.score !== right.score) return left.score - right.score;
    return right.tile.value - left.tile.value;
  });
  if (difficulty === "normal") {
    return sorted[Math.floor(Math.random() * Math.min(2, sorted.length))]?.tile.id ?? sorted[0]?.tile.id ?? null;
  }
  return sorted[0]?.tile.id ?? null;
}

function shouldOkeyPrototypeBotDrawFromDiscard(
  topDiscardTile: OkeyPrototypeTile | null,
  rack: OkeyPrototypeTile[],
  okeyTile: OkeyPrototypeTile | null,
  difficulty: OkeyPrototypeBotDifficulty,
) {
  if (!topDiscardTile || rack.length === 0) return false;
  if (difficulty === "easy") return Math.random() < 0.2;
  if (difficulty === "normal") return Math.random() < 0.35;
  const discardScore = getOkeyPrototypeTileUsefulnessScore(topDiscardTile, [...rack, topDiscardTile], okeyTile);
  const weakestTileScore = rack.reduce((minScore, tile) => (
    Math.min(minScore, getOkeyPrototypeTileUsefulnessScore(tile, rack, okeyTile))
  ), Number.POSITIVE_INFINITY);
  return discardScore >= weakestTileScore + 2.2;
}

function evaluateOkeyPrototypeMeldDraft(tiles: OkeyPrototypeTile[], okeyTile: OkeyPrototypeTile | null = null) {
  if (tiles.length < 3) {
    return { valid: false, kind: null as OkeyPrototypeMeldKind | null, reason: "En az 3 tas secmelisin." };
  }
  if (tiles.length > 13) {
    return { valid: false, kind: null as OkeyPrototypeMeldKind | null, reason: "Bu kadar tas tek perde kullanilamaz." };
  }
  const jokerCount = tiles.filter((tile) => isOkeyPrototypeJokerTile(tile, okeyTile)).length;
  const normalTiles = tiles.filter((tile) => !isOkeyPrototypeJokerTile(tile, okeyTile));

  const setAttempt = (() => {
    if (tiles.length > 4) {
      return { valid: false, reason: "Set peri en fazla 4 tas olabilir." };
    }
    if (normalTiles.length === 0) return { valid: true, reason: "" };
    const baseValue = normalTiles[0]?.value ?? 0;
    if (!normalTiles.every((tile) => tile.value === baseValue)) {
      return { valid: false, reason: "Set icin joker disi taslar ayni degerde olmali." };
    }
    const colors = new Set(normalTiles.map((tile) => tile.color));
    if (colors.size !== normalTiles.length) {
      return { valid: false, reason: "Set perinde renkler tekrar edemez." };
    }
    return { valid: true, reason: "" };
  })();
  if (setAttempt.valid) {
    return { valid: true, kind: "set" as OkeyPrototypeMeldKind, reason: "" };
  }

  const seriesAttempt = (() => {
    if (normalTiles.length === 0) {
      return { valid: true, reason: "" };
    }
    const sameColor = normalTiles.every((tile) => tile.color === normalTiles[0]?.color);
    if (!sameColor) {
      return { valid: false, reason: "Seri icin tum taslar ayni renkte olmali." };
    }
    const sortedValues = normalTiles.map((tile) => tile.value).sort((a, b) => a - b);
    for (let index = 1; index < sortedValues.length; index += 1) {
      if (sortedValues[index] === sortedValues[index - 1]) {
        return { valid: false, reason: "Seri icin degerler ardisik olmali." };
      }
    }
    let requiredJokerCount = 0;
    for (let index = 1; index < sortedValues.length; index += 1) {
      requiredJokerCount += Math.max(0, sortedValues[index] - sortedValues[index - 1] - 1);
    }
    if (requiredJokerCount > jokerCount) {
      return { valid: false, reason: "Seri icin degerler ardisik olmali." };
    }
    const remainingJokers = jokerCount - requiredJokerCount;
    const minValue = sortedValues[0] ?? 1;
    const maxValue = sortedValues[sortedValues.length - 1] ?? 13;
    const frontSpace = Math.max(0, minValue - 1);
    const backSpace = Math.max(0, 13 - maxValue);
    if (remainingJokers > frontSpace + backSpace) {
      return { valid: false, reason: "Seri 1-13 araligini asmamali." };
    }
    return { valid: true, reason: "" };
  })();
  if (seriesAttempt.valid) {
    return { valid: true, kind: "seri" as OkeyPrototypeMeldKind, reason: "" };
  }
  return {
    valid: false,
    kind: null as OkeyPrototypeMeldKind | null,
    reason: seriesAttempt.reason || setAttempt.reason || "Secili taslar ne set ne seri kuralina uyuyor.",
  };
}

function getOkeyPrototypeMeldPoints(tiles: OkeyPrototypeTile[]) {
  return tiles.reduce((sum, tile) => sum + tile.value, 0);
}

function getOkeyPrototypeMeldPointsWithJokers(tiles: OkeyPrototypeTile[], okeyTile: OkeyPrototypeTile | null = null) {
  const validation = evaluateOkeyPrototypeMeldDraft(tiles, okeyTile);
  if (!validation.valid || !validation.kind) {
    return getOkeyPrototypeMeldPoints(tiles);
  }
  const jokerTiles = tiles.filter((tile) => isOkeyPrototypeJokerTile(tile, okeyTile));
  const normalTiles = tiles.filter((tile) => !isOkeyPrototypeJokerTile(tile, okeyTile));
  if (jokerTiles.length === 0) {
    return getOkeyPrototypeMeldPoints(tiles);
  }
  if (validation.kind === "set") {
    const baseValue = normalTiles[0]?.value ?? 10;
    return normalTiles.reduce((sum, tile) => sum + tile.value, 0) + jokerTiles.length * baseValue;
  }

  if (normalTiles.length === 0) {
    return jokerTiles.length * 10;
  }
  const sortedValues = normalTiles.map((tile) => tile.value).sort((a, b) => a - b);
  let points = sortedValues.reduce((sum, value) => sum + value, 0);
  let remainingJokers = jokerTiles.length;

  for (let index = 1; index < sortedValues.length; index += 1) {
    const previous = sortedValues[index - 1];
    const current = sortedValues[index];
    const gap = Math.max(0, current - previous - 1);
    for (let offset = 1; offset <= gap && remainingJokers > 0; offset += 1) {
      points += previous + offset;
      remainingJokers -= 1;
    }
  }
  let lower = (sortedValues[0] ?? 1) - 1;
  while (remainingJokers > 0 && lower >= 1) {
    points += lower;
    remainingJokers -= 1;
    lower -= 1;
  }
  let upper = (sortedValues[sortedValues.length - 1] ?? 13) + 1;
  while (remainingJokers > 0 && upper <= 13) {
    points += upper;
    remainingJokers -= 1;
    upper += 1;
  }
  if (remainingJokers > 0) {
    points += remainingJokers * 10;
  }
  return points;
}

function getOkeyPrototypeRackPenaltyPoints(
  tiles: OkeyPrototypeTile[],
  okeyTile: OkeyPrototypeTile | null = null,
) {
  return tiles.reduce((sum, tile) => {
    if (isOkeyPrototypeJokerTile(tile, okeyTile)) return sum + 25;
    return sum + Math.max(1, tile.value);
  }, 0);
}

function countOkeyPrototypeIdenticalPairs(
  tiles: OkeyPrototypeTile[],
  okeyTile: OkeyPrototypeTile | null = null,
) {
  const counts = new Map<string, number>();
  tiles.forEach((tile) => {
    if (tile.kind !== "normal") return;
    if (isOkeyPrototypeJokerTile(tile, okeyTile)) return;
    const key = `${tile.color}-${tile.value}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  let pairCount = 0;
  counts.forEach((count) => {
    pairCount += Math.floor(count / 2);
  });
  return pairCount;
}

function hasAnyOkeyPrototypeMeldIncludingTile(
  tiles: OkeyPrototypeTile[],
  requiredTileId: string,
  okeyTile: OkeyPrototypeTile | null = null,
) {
  const requiredIndex = tiles.findIndex((tile) => tile.id === requiredTileId);
  if (requiredIndex < 0) return false;
  const maxSize = Math.min(6, tiles.length);
  for (let targetSize = 3; targetSize <= maxSize; targetSize += 1) {
    const picked: number[] = [];
    let found = false;
    const pick = (start: number) => {
      if (found) return;
      if (picked.length === targetSize) {
        if (!picked.includes(requiredIndex)) return;
        const meldTiles = picked.map((index) => tiles[index]);
        const validation = evaluateOkeyPrototypeMeldDraft(meldTiles, okeyTile);
        if (validation.valid) {
          found = true;
        }
        return;
      }
      const remaining = targetSize - picked.length;
      for (let index = start; index <= tiles.length - remaining; index += 1) {
        picked.push(index);
        pick(index + 1);
        picked.pop();
        if (found) return;
      }
    };
    pick(0);
    if (found) return true;
  }
  return false;
}

function canOkeyPrototypeTakeDiscardWhenClosed(
  currentRack: OkeyPrototypeTile[],
  discardedTile: OkeyPrototypeTile,
  okeyTile: OkeyPrototypeTile | null = null,
) {
  const nextRack = [...currentRack, discardedTile];
  if (countOkeyPrototypeIdenticalPairs(nextRack, okeyTile) >= OKEY_PROTOTYPE_PAIR_OPEN_MIN_PAIRS) {
    return true;
  }
  if (getOkeyPrototypeRackPenaltyPoints(nextRack, okeyTile) < OKEY_PROTOTYPE_OPENING_TARGET_POINTS) {
    return false;
  }
  return hasAnyOkeyPrototypeMeldIncludingTile(nextRack, discardedTile.id, okeyTile);
}

function canAttachOkeyPrototypeTileToMeld(
  tile: OkeyPrototypeTile,
  meld: OkeyPrototypeMeldEntry,
  okeyTile: OkeyPrototypeTile | null = null,
) {
  const nextTiles = [...meld.tiles, tile];
  const validation = evaluateOkeyPrototypeMeldDraft(nextTiles, okeyTile);
  if (!validation.valid || validation.kind !== meld.kind) {
    return { valid: false, reason: "Bu tas secili pere eklenemiyor." };
  }
  if (meld.kind === "set") {
    const colors = new Set(nextTiles.map((entry) => entry.color));
    if (colors.size !== nextTiles.length) {
      return { valid: false, reason: "Set perinde renkler tekrar edemez." };
    }
    if (nextTiles.length > 4) {
      return { valid: false, reason: "Set peri en fazla 4 tas olabilir." };
    }
  }
  return { valid: true, reason: "" };
}

function createDefaultOkeyPrototypeSeatOpenedState(): OkeyPrototypeSeatOpenedState {
  return {
    1: false,
    2: false,
    3: false,
    4: false,
  };
}

function createDefaultOkeyPrototypeSeatWinState(): Record<OkeyPrototypeSeatNo, number> {
  return {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  };
}

function normalizeHttpOrigin(rawValue: string | undefined) {
  const trimmed = rawValue?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

function resolveRuntimeApiBase() {
  const envBase = normalizeHttpOrigin(import.meta.env.VITE_API_BASE_URL as string | undefined);
  if (typeof window === "undefined") return envBase ?? FALLBACK_CLOUD_API_BASE;
  const protocol = window.location.protocol.toLowerCase();
  if (protocol === "http:" || protocol === "https:") {
    return window.location.origin;
  }
  return envBase ?? FALLBACK_CLOUD_API_BASE;
}

const RUNTIME_API_BASE_URL = resolveRuntimeApiBase();

function buildApiUrl(path: string) {
  return new URL(path, `${RUNTIME_API_BASE_URL}/`).toString();
}

function apiFetch(path: string, init?: RequestInit) {
  return fetch(buildApiUrl(path), init);
}

function getDefaultRealtimeWsBase() {
  const apiBase = resolveRuntimeApiBase();
  try {
    const url = new URL(apiBase);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/realtime";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    if (typeof window === "undefined") return "ws://127.0.0.1:8787/realtime";
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/realtime`;
  }
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
  const url = new URL(REALTIME_HTTP_SYNC_PATH, `${RUNTIME_API_BASE_URL}/`);
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

function safeStorageGetItem(storage: Storage | null | undefined, key: string) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeStorageSetItem(storage: Storage | null | undefined, key: string, value: string) {
  try {
    storage?.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeStorageRemoveItem(storage: Storage | null | undefined, key: string) {
  try {
    storage?.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function readDiagnosticsEnabled() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const rawParam = (params.get("diag") || "").trim().toLowerCase();
  if (rawParam === "1" || rawParam === "true" || rawParam === "on") {
    safeStorageSetItem(window.localStorage, DIAGNOSTICS_MODE_STORAGE_KEY, "1");
    return true;
  }
  if (rawParam === "0" || rawParam === "false" || rawParam === "off") {
    safeStorageRemoveItem(window.localStorage, DIAGNOSTICS_MODE_STORAGE_KEY);
    return false;
  }
  return safeStorageGetItem(window.localStorage, DIAGNOSTICS_MODE_STORAGE_KEY) === "1";
}

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = safeStorageGetItem(window.localStorage, key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  safeStorageSetItem(window.localStorage, key, JSON.stringify(value));
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

function sanitizeMemberSessionKey(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 96);
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

function createDefaultMemberPermissions(): MemberPermissions {
  return {
    lobbyChat: true,
    tableChat: true,
    spectatorChat: true,
  };
}

function normalizeMemberPermissions(raw: unknown): MemberPermissions {
  if (!raw || typeof raw !== "object") return createDefaultMemberPermissions();
  const candidate = raw as Partial<MemberPermissions>;
  return {
    lobbyChat: Boolean(candidate.lobbyChat ?? true),
    tableChat: Boolean(candidate.tableChat ?? true),
    spectatorChat: Boolean(candidate.spectatorChat ?? true),
  };
}

function sanitizeLobbyId(raw: unknown) {
  if (typeof raw !== "string") return "";
  return raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);
}

function makeLobbyStateStorageKey(lobbyId: string) {
  const safeLobbyId = sanitizeLobbyId(lobbyId) || DEFAULT_LOBBY_ID;
  return `${LOBBY_STATE_KEY_PREFIX}:${safeLobbyId}`;
}

function makeLobbySyncChannel(lobbyId: string) {
  const safeLobbyId = sanitizeLobbyId(lobbyId) || DEFAULT_LOBBY_ID;
  return `${LOBBY_SYNC_CHANNEL_PREFIX}:${safeLobbyId}`;
}

function makeRealtimeLobbyChannel(lobbyId: string) {
  const safeLobbyId = sanitizeLobbyId(lobbyId) || DEFAULT_LOBBY_ID;
  return `${REALTIME_LOBBY_CHANNEL_PREFIX}:${safeLobbyId}`;
}

function normalizeLobbyRoom(raw: unknown): LobbyRoom | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<LobbyRoom>;
  const id = sanitizeLobbyId(candidate.id);
  const name = sanitizeLobbyName(typeof candidate.name === "string" ? candidate.name : DEFAULT_LOBBY_NAME);
  if (!id || !name) return null;
  return {
    id,
    name,
    createdAt: Number.isFinite(candidate.createdAt) ? Number(candidate.createdAt) : Date.now(),
    updatedAt: Number.isFinite(candidate.updatedAt) ? Number(candidate.updatedAt) : Date.now(),
    createdByUserId: sanitizeGuestId(typeof candidate.createdByUserId === "string" ? candidate.createdByUserId : "") || null,
  };
}

function normalizeLobbyRooms(raw: unknown): LobbyRoom[] {
  const rows = Array.isArray(raw) ? raw : [];
  const byId = new Map<string, LobbyRoom>();
  rows.forEach((item) => {
    const room = normalizeLobbyRoom(item);
    if (!room) return;
    const existing = byId.get(room.id);
    if (!existing || room.updatedAt >= existing.updatedAt) byId.set(room.id, room);
  });
  if (byId.size === 0) {
    byId.set(DEFAULT_LOBBY_ID, {
      id: DEFAULT_LOBBY_ID,
      name: DEFAULT_LOBBY_NAME,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdByUserId: null,
    });
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "tr") || a.id.localeCompare(b.id));
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

function sanitizeDesignTextKey(raw: unknown): DesignTextKey | null {
  if (
    raw === "lobbyOpenTable"
    || raw === "lobbyQuickPlay"
    || raw === "lobbyHome"
    || raw === "lobbyRoomSelect"
    || raw === "lobbyBotMode"
    || raw === "roomLeaveTable"
    || raw === "roomBackLobby"
    || raw === "roomInvite"
    || raw === "roomPrivateEnable"
    || raw === "roomPrivateDisable"
    || raw === "roomSpectatorEnable"
    || raw === "roomSpectatorDisable"
    || raw === "roomCopyInvite"
    || raw === "chatSend"
    || raw === "lobbyEmptyTitle"
    || raw === "lobbyEmptySub"
  ) {
    return raw;
  }
  return null;
}

function sanitizeDesignColor(raw: unknown, fallback: string) {
  if (typeof raw !== "string") return fallback;
  const value = raw.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toUpperCase();
  return fallback;
}

function sanitizeDesignFontFamily(raw: unknown, fallback: string) {
  if (typeof raw !== "string") return fallback;
  const value = raw.trim().slice(0, 120);
  if (!value) return fallback;
  return value.replace(/[<>{}]/g, "");
}

function createDefaultDesignConfig(): DesignConfig {
  return {
    version: 1,
    updatedAt: Date.now(),
    theme: {
      shellFrom: "#AF8119",
      shellTo: "#765309",
      topbarFrom: "#0C566D",
      topbarTo: "#093F52",
      lobbyPanelFrom: "#0C809E",
      lobbyPanelTo: "#0B5F77",
      roomPanelFrom: "#2C583B",
      roomPanelTo: "#1A3D27",
      accentFrom: "#D49A14",
      accentTo: "#AB7A0F",
      fontFamily: DEFAULT_DESIGN_FONT,
    },
    texts: {},
    layout: {
      lobbyHeaderActions: ["openTable", "quickPlay"],
      lobbyTopButtons: ["home", "roomSelect", "botMode"],
      roomOwnerButtons: ["invite", "private", "spectator", "copyLink"],
    },
    sizing: {
      buttonScalePct: 100,
      lobbyTableZoneHeight: 520,
      roomBoardMinHeight: 500,
    },
  };
}

function normalizeDesignLayout(raw: unknown, fallback: DesignLayout): DesignLayout {
  const candidate = raw && typeof raw === "object" ? raw as Partial<DesignLayout> : {};
  const rows = Array.isArray(candidate.lobbyHeaderActions) ? candidate.lobbyHeaderActions : fallback.lobbyHeaderActions;
  const out: ("openTable" | "quickPlay")[] = [];
  rows.forEach((item) => {
    if ((item === "openTable" || item === "quickPlay") && !out.includes(item)) {
      out.push(item);
    }
  });
  if (!out.includes("openTable")) out.push("openTable");
  if (!out.includes("quickPlay")) out.push("quickPlay");
  const topRows = Array.isArray(candidate.lobbyTopButtons) ? candidate.lobbyTopButtons : fallback.lobbyTopButtons;
  const lobbyTopButtons: ("home" | "roomSelect" | "botMode")[] = [];
  topRows.forEach((item) => {
    if ((item === "home" || item === "roomSelect" || item === "botMode") && !lobbyTopButtons.includes(item)) {
      lobbyTopButtons.push(item);
    }
  });
  if (!lobbyTopButtons.includes("home")) lobbyTopButtons.push("home");
  if (!lobbyTopButtons.includes("roomSelect")) lobbyTopButtons.push("roomSelect");
  if (!lobbyTopButtons.includes("botMode")) lobbyTopButtons.push("botMode");

  const ownerRows = Array.isArray(candidate.roomOwnerButtons) ? candidate.roomOwnerButtons : fallback.roomOwnerButtons;
  const roomOwnerButtons: ("invite" | "private" | "spectator" | "copyLink")[] = [];
  ownerRows.forEach((item) => {
    if ((item === "invite" || item === "private" || item === "spectator" || item === "copyLink") && !roomOwnerButtons.includes(item)) {
      roomOwnerButtons.push(item);
    }
  });
  if (!roomOwnerButtons.includes("invite")) roomOwnerButtons.push("invite");
  if (!roomOwnerButtons.includes("private")) roomOwnerButtons.push("private");
  if (!roomOwnerButtons.includes("spectator")) roomOwnerButtons.push("spectator");
  if (!roomOwnerButtons.includes("copyLink")) roomOwnerButtons.push("copyLink");

  return {
    lobbyHeaderActions: out,
    lobbyTopButtons,
    roomOwnerButtons,
  };
}

function normalizeDesignSizing(raw: unknown, fallback: DesignSizing): DesignSizing {
  const candidate = raw && typeof raw === "object" ? raw as Partial<DesignSizing> : {};
  return {
    buttonScalePct: normalizeRuleNumber(candidate.buttonScalePct, fallback.buttonScalePct, 80, 140),
    lobbyTableZoneHeight: normalizeRuleNumber(candidate.lobbyTableZoneHeight, fallback.lobbyTableZoneHeight, 360, 760),
    roomBoardMinHeight: normalizeRuleNumber(candidate.roomBoardMinHeight, fallback.roomBoardMinHeight, 420, 760),
  };
}

function normalizeDesignTexts(raw: unknown, fallback: Partial<Record<DesignTextKey, string>>) {
  const next: Partial<Record<DesignTextKey, string>> = {};
  const candidate = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  Object.entries(candidate).forEach(([keyRaw, valueRaw]) => {
    const key = sanitizeDesignTextKey(keyRaw);
    if (!key || typeof valueRaw !== "string") return;
    const text = valueRaw.replace(/\s+/g, " ").trim().slice(0, 72);
    if (!text) return;
    next[key] = text;
  });
  Object.entries(fallback).forEach(([keyRaw, value]) => {
    const key = sanitizeDesignTextKey(keyRaw);
    if (!key || !value || next[key]) return;
    next[key] = value;
  });
  return next;
}

function normalizeDesignTheme(raw: unknown, fallback: DesignTheme): DesignTheme {
  const candidate = raw && typeof raw === "object" ? raw as Partial<DesignTheme> : {};
  return {
    shellFrom: sanitizeDesignColor(candidate.shellFrom, fallback.shellFrom),
    shellTo: sanitizeDesignColor(candidate.shellTo, fallback.shellTo),
    topbarFrom: sanitizeDesignColor(candidate.topbarFrom, fallback.topbarFrom),
    topbarTo: sanitizeDesignColor(candidate.topbarTo, fallback.topbarTo),
    lobbyPanelFrom: sanitizeDesignColor(candidate.lobbyPanelFrom, fallback.lobbyPanelFrom),
    lobbyPanelTo: sanitizeDesignColor(candidate.lobbyPanelTo, fallback.lobbyPanelTo),
    roomPanelFrom: sanitizeDesignColor(candidate.roomPanelFrom, fallback.roomPanelFrom),
    roomPanelTo: sanitizeDesignColor(candidate.roomPanelTo, fallback.roomPanelTo),
    accentFrom: sanitizeDesignColor(candidate.accentFrom, fallback.accentFrom),
    accentTo: sanitizeDesignColor(candidate.accentTo, fallback.accentTo),
    fontFamily: sanitizeDesignFontFamily(candidate.fontFamily, fallback.fontFamily),
  };
}

function normalizeDesignConfig(raw: unknown, fallback?: DesignConfig): DesignConfig {
  const base = fallback ?? createDefaultDesignConfig();
  const candidate = raw && typeof raw === "object" ? raw as Partial<DesignConfig> : {};
  return {
    version: normalizeRuleNumber(candidate.version, base.version, 1, 999_999),
    updatedAt: Number.isFinite(candidate.updatedAt) ? Number(candidate.updatedAt) : base.updatedAt,
    theme: normalizeDesignTheme(candidate.theme, base.theme),
    texts: normalizeDesignTexts(candidate.texts, base.texts),
    layout: normalizeDesignLayout(candidate.layout, base.layout),
    sizing: normalizeDesignSizing(candidate.sizing, base.sizing),
  };
}

function makeDesignCssVars(config: DesignConfig): CSSProperties {
  const theme = config.theme;
  const sizing = config.sizing;
  return {
    "--design-shell-from": theme.shellFrom,
    "--design-shell-to": theme.shellTo,
    "--design-topbar-from": theme.topbarFrom,
    "--design-topbar-to": theme.topbarTo,
    "--design-lobby-panel-from": theme.lobbyPanelFrom,
    "--design-lobby-panel-to": theme.lobbyPanelTo,
    "--design-room-panel-from": theme.roomPanelFrom,
    "--design-room-panel-to": theme.roomPanelTo,
    "--design-accent-from": theme.accentFrom,
    "--design-accent-to": theme.accentTo,
    "--design-font-family": theme.fontFamily || DEFAULT_DESIGN_FONT,
    "--design-button-scale": `${sizing.buttonScalePct / 100}`,
    "--design-lobby-table-zone-height": `${sizing.lobbyTableZoneHeight}px`,
    "--design-room-board-min-height": `${sizing.roomBoardMinHeight}px`,
  } as CSSProperties;
}

function sanitizeChatId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
}

function sanitizeSeatClearToken(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 96);
}

function createSeatClearToken(seed = "") {
  const nowPart = Date.now().toString(36);
  const seedPart = sanitizeGuestId(seed) || "seat";
  const randPart = Math.random().toString(36).slice(2, 8);
  return sanitizeSeatClearToken(`${nowPart}:${seedPart}:${randPart}`);
}

function parseSeatClearTokenTime(token: string) {
  const safeToken = sanitizeSeatClearToken(token);
  if (!safeToken) return 0;
  const [timePart] = safeToken.split(":");
  const parsed = Number.parseInt(timePart || "", 36);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return parsed;
}

function sanitizeChatText(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, CHAT_TEXT_MAX);
}

const TURKISH_MOJIBAKE_REPLACEMENTS: Array<[string, string]> = [
  ["Ã‡", "Ç"],
  ["Ã§", "ç"],
  ["Ä°", "İ"],
  ["Ä±", "ı"],
  ["Ã–", "Ö"],
  ["Ã¶", "ö"],
  ["Ãœ", "Ü"],
  ["Ã¼", "ü"],
  ["Åž", "Ş"],
  ["ÅŸ", "ş"],
  ["ÄŸ", "ğ"],
  ["Äž", "Ğ"],
  ["â€™", "’"],
  ["â€œ", "“"],
  ["â€�", "”"],
  ["â€“", "–"],
  ["â€”", "—"],
  ["Â", ""],
];

function normalizeTurkishDisplayText(value: string) {
  let next = String(value ?? "");
  for (const [broken, fixed] of TURKISH_MOJIBAKE_REPLACEMENTS) {
    if (next.includes(broken)) {
      next = next.split(broken).join(fixed);
    }
  }
  return next;
}

function sanitizeTableChatKey(value: string) {
  const roomCode = sanitizeRoomCode(value);
  if (roomCode) return roomCode;
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24);
}

const activityClockOffsetBySession = new Map<string, number>();

function normalizeActivityTimestamp(
  value: unknown,
  now = Date.now(),
  maxFutureMs = HEARTBEAT_MS * 2,
  sessionId = "",
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return now;
  if (!sessionId) {
    if (parsed > now + maxFutureMs) return now;
    return parsed;
  }

  let offset = activityClockOffsetBySession.get(sessionId);
  if (offset === undefined || !Number.isFinite(offset)) {
    offset = now - parsed;
  }
  offset = Math.max(-ACTIVITY_CLOCK_SKEW_LIMIT_MS, Math.min(ACTIVITY_CLOCK_SKEW_LIMIT_MS, offset));

  let adjusted = parsed + offset;
  if (adjusted > now + maxFutureMs || adjusted < now - ACTIVITY_CLOCK_SKEW_LIMIT_MS) {
    offset = Math.max(-ACTIVITY_CLOCK_SKEW_LIMIT_MS, Math.min(ACTIVITY_CLOCK_SKEW_LIMIT_MS, now - parsed));
    adjusted = parsed + offset;
  }
  activityClockOffsetBySession.set(sessionId, offset);
  return adjusted;
}

function tableChatKey(table: Pick<LobbyTable, "roomCode" | "id">) {
  const roomCode = sanitizeRoomCode(table.roomCode);
  if (roomCode) return roomCode;
  return `T${Math.max(1, table.id)}`;
}

function isTableScopedToLobby(table: LobbyTable, presenceRows: LobbyPresenceState[], lobbyId: string) {
  const safeLobbyId = sanitizeLobbyId(lobbyId);
  if (!safeLobbyId) return true;
  const seats = [table.white, table.black].filter((seat): seat is LobbySeatState => Boolean(seat));
  if (seats.length === 0) return false;

  let matchedAnyScopedPresence = false;

  for (const row of presenceRows) {
    const rowLobbyId = sanitizeLobbyId(row.lobbyId ?? "");
    if (!rowLobbyId) continue;
    const matchesSeat = seats.some(
      (seat) => row.sessionId === seat.sessionId || sanitizeGuestId(row.userId) === sanitizeGuestId(seat.userId),
    );
    if (!matchesSeat) continue;
    matchedAnyScopedPresence = true;
    if (rowLobbyId === safeLobbyId) return true;
  }

  if (matchedAnyScopedPresence) return false;
  return true;
}

function filterTablesByLobbyScope(tables: LobbyTable[], presenceRows: LobbyPresenceState[], lobbyId: string) {
  const safeLobbyId = sanitizeLobbyId(lobbyId);
  if (!safeLobbyId) return sortTables(tables);
  return sortTables(tables).filter((table) => isTableScopedToLobby(table, presenceRows, safeLobbyId));
}

function summarizeLobbyCounts(snapshot: LobbyState, lobbyId = ""): LobbyRoomCounts {
  const scopedTables = filterTablesByLobbyScope(snapshot.tables, snapshot.presence, lobbyId);
  const activeTables = scopedTables.filter((table) => Boolean(table.white || table.black)).length;
  const safeLobbyId = sanitizeLobbyId(lobbyId);
  const cleanedPresence = cleanupPresenceRows(snapshot.presence).presence;
  const uniquePlayers = new Set<string>();

  cleanedPresence.forEach((row) => {
    const rowLobbyId = sanitizeLobbyId(row.lobbyId ?? "");
    if (safeLobbyId && rowLobbyId && rowLobbyId !== safeLobbyId) return;
    const key = sanitizeGuestId(row.userId) || `session:${row.sessionId}`;
    if (!key) return;
    uniquePlayers.add(key);
  });

  const seatedPlayers = uniquePlayers.size;
  return { activeTables, seatedPlayers };
}

function createChatMessageId(seed: string) {
  const safeSeed = sanitizeGuestId(seed).slice(-8) || "chat";
  return sanitizeChatId(`${Date.now().toString(36)}-${safeSeed}-${Math.random().toString(36).slice(2, 8)}`);
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
  if (readyState === WebSocket.OPEN) return "açık";
  if (readyState === WebSocket.CONNECTING) return "baglaniyor";
  if (readyState === WebSocket.CLOSING) return "kapanis";
  return "kapalı";
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
  const displayName = sanitizeGuestName(typeof candidate.displayName === "string" ? candidate.displayName : "Üye") || "Üye";
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
    isBlocked: Boolean(candidate.isBlocked),
    permissions: normalizeMemberPermissions(candidate.permissions),
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
  const existing = sanitizeGuestId(safeStorageGetItem(window.localStorage, GUEST_ID_STORAGE_KEY) ?? "");
  if (existing) return existing;
  const next = sanitizeGuestId(`g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`) || "guest1";
  safeStorageSetItem(window.localStorage, GUEST_ID_STORAGE_KEY, next);
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
  return role === "spectator" ? "İzleyici" : "Oyuncu";
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
  let whiteClearToken = sanitizeSeatClearToken(table.whiteClearToken ?? "");
  let blackClearToken = sanitizeSeatClearToken(table.blackClearToken ?? "");
  if (table.white) {
    whiteClearToken = "";
  }
  if (table.black) {
    blackClearToken = "";
  }
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
    && (table.whiteClearToken ?? null) === (whiteClearToken || null)
    && (table.blackClearToken ?? null) === (blackClearToken || null)
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
    whiteClearToken: whiteClearToken || null,
    blackClearToken: blackClearToken || null,
    leavePermissionRequestByUserId: leavePermissionRequestByUserId || null,
    leavePermissionGrantedToUserId: leavePermissionGrantedToUserId || null,
  };
}

function createDefaultLobbyState(lobbyName = DEFAULT_LOBBY_NAME): LobbyState {
  return {
    lobbyName: sanitizeLobbyName(lobbyName),
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
  const normalizedUserId = sanitizeGuestId(typeof candidate.userId === "string" ? candidate.userId : "");
  const displayName = sanitizeGuestName(typeof candidate.displayName === "string" ? candidate.displayName : "Misafir") || "Misafir";
  const gender = sanitizeMemberGender(candidate.gender);
  return {
    sessionId,
    userId: normalizedUserId || `guest-${sessionId}`,
    username:
      sanitizeMemberUsername(typeof candidate.username === "string" ? candidate.username : "")
      || fallbackUsernameFromName(displayName),
    displayName,
    gender,
    avatarId: sanitizeAvatarId(candidate.avatarId, gender),
    points: normalizeNonNegativeInt(candidate.points, 1500),
    stats: normalizeStats(candidate.stats),
    touchedAt: normalizeActivityTimestamp(candidate.touchedAt),
  };
}

function normalizePresence(raw: unknown): LobbyPresenceState | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<LobbyPresenceState>;
  const sessionId = typeof candidate.sessionId === "string" ? candidate.sessionId : "";
  if (!sessionId) return null;
  const normalizedUserId = sanitizeGuestId(typeof candidate.userId === "string" ? candidate.userId : "");
  const displayName = sanitizeGuestName(typeof candidate.displayName === "string" ? candidate.displayName : "Misafir") || "Misafir";
  const gender = sanitizeMemberGender(candidate.gender);
  const lobbyId = sanitizeLobbyId(typeof candidate.lobbyId === "string" ? candidate.lobbyId : "");
  return {
    sessionId,
    userId: normalizedUserId || `guest-${sessionId}`,
    username:
      sanitizeMemberUsername(typeof candidate.username === "string" ? candidate.username : "")
      || fallbackUsernameFromName(displayName),
    displayName,
    gender,
    avatarId: sanitizeAvatarId(candidate.avatarId, gender),
    points: normalizeNonNegativeInt(candidate.points, 1500),
    stats: normalizeStats(candidate.stats),
    touchedAt: normalizeActivityTimestamp(candidate.touchedAt),
    lobbyId,
  };
}

function presenceFromSeat(seat: LobbySeatState, lobbyId = ""): LobbyPresenceState {
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
    lobbyId: sanitizeLobbyId(lobbyId),
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
    whiteClearToken: sanitizeSeatClearToken(candidate.whiteClearToken ?? "") || null,
    blackClearToken: sanitizeSeatClearToken(candidate.blackClearToken ?? "") || null,
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
    const whiteTouchedAt = table.white
      ? normalizeActivityTimestamp(table.white.touchedAt, now, HEARTBEAT_MS * 2, table.white.sessionId)
      : 0;
    const blackTouchedAt = table.black
      ? normalizeActivityTimestamp(table.black.touchedAt, now, HEARTBEAT_MS * 2, table.black.sessionId)
      : 0;
    const whiteExpired = table.white ? now - whiteTouchedAt > SEAT_STALE_MS : false;
    const blackExpired = table.black ? now - blackTouchedAt > SEAT_STALE_MS : false;
    const white = whiteExpired ? null : table.white;
    const black = blackExpired ? null : table.black;
    const whiteClearToken = whiteExpired
      ? createSeatClearToken(table.white?.sessionId || table.white?.userId || "white-stale")
      : table.whiteClearToken;
    const blackClearToken = blackExpired
      ? createSeatClearToken(table.black?.sessionId || table.black?.userId || "black-stale")
      : table.blackClearToken;
    if (whiteExpired || blackExpired) changed = true;
    if (!white && !black) {
      changed = true;
      return;
    }
    let nextTable: LobbyTable = { ...table, white, black, whiteClearToken, blackClearToken };
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
  const bySessionTouchedAt = new Map<string, number>();

  rows.forEach((row) => {
    const safeTouchedAt = normalizeActivityTimestamp(row.touchedAt, now, HEARTBEAT_MS * 2, row.sessionId);
    if (now - safeTouchedAt > PRESENCE_STALE_MS) {
      changed = true;
      return;
    }
    const existing = bySession.get(row.sessionId);
    const existingTouchedAt = bySessionTouchedAt.get(row.sessionId) ?? Number.NEGATIVE_INFINITY;
    if (!existing || safeTouchedAt >= existingTouchedAt) {
      if (existing && existing !== row) changed = true;
      bySession.set(row.sessionId, row);
      bySessionTouchedAt.set(row.sessionId, safeTouchedAt);
    }
  });

  const byUser = new Map<string, LobbyPresenceState>();
  const byUserTouchedAt = new Map<string, number>();
  bySession.forEach((row) => {
    const lobbyScope = sanitizeLobbyId(row.lobbyId ?? "");
    const key = `${sanitizeGuestId(row.userId) || `session:${row.sessionId}`}|${lobbyScope || "-"}`;
    const existing = byUser.get(key);
    const safeTouchedAt = bySessionTouchedAt.get(row.sessionId) ?? normalizeActivityTimestamp(row.touchedAt, now, HEARTBEAT_MS * 2, row.sessionId);
    const existingTouchedAt = byUserTouchedAt.get(key) ?? Number.NEGATIVE_INFINITY;
    if (!existing || safeTouchedAt >= existingTouchedAt) {
      if (existing && existing !== row) changed = true;
      byUser.set(key, row);
      byUserTouchedAt.set(key, safeTouchedAt);
    }
  });

  const presence = Array.from(byUser.values());
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

function loadLobbyState(storageKey: string, lobbyName = DEFAULT_LOBBY_NAME) {
  return normalizeLobbyState(loadJson<unknown>(storageKey, createDefaultLobbyState(lobbyName)));
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
  const userId = sanitizeGuestId(typeof candidate.userId === "string" ? candidate.userId : "");
  const sessionKey = sanitizeMemberSessionKey(typeof candidate.sessionKey === "string" ? candidate.sessionKey : "");
  if (!userId || !sessionKey) return null;
  return { userId, sessionKey } satisfies MemberSession;
}

function getRoomPickerIdentity(memberUserId: string | null | undefined, guestId: string) {
  const safeMemberUserId = sanitizeGuestId(memberUserId ?? "");
  if (safeMemberUserId) return `member:${safeMemberUserId}`;
  const safeGuestId = sanitizeGuestId(guestId);
  return `guest:${safeGuestId || "guest"}`;
}

function getRoomPickerSessionStorageKey(gameId: GameId) {
  return `${ROOM_PICKER_SESSION_KEY}.${gameId}`;
}

function loadRoomPickerSessionState(gameId: GameId = DEFAULT_GAME_ID): RoomPickerSessionState | null {
  if (typeof window === "undefined") return null;
  const scopedKey = getRoomPickerSessionStorageKey(gameId);
  let raw = safeStorageGetItem(window.sessionStorage, scopedKey);
  if (!raw && gameId === DEFAULT_GAME_ID) {
    raw = safeStorageGetItem(window.sessionStorage, ROOM_PICKER_SESSION_KEY);
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<RoomPickerSessionState>;
    const identity = typeof parsed.identity === "string" ? parsed.identity.trim().slice(0, 80) : "";
    const lobbyId = sanitizeLobbyId(typeof parsed.lobbyId === "string" ? parsed.lobbyId : "");
    const storedGameId: GameId = parsed.gameId === "okey101" ? "okey101" : DEFAULT_GAME_ID;
    if (!identity || !lobbyId || storedGameId !== gameId) return null;
    const confirmedAt = Number.isFinite(parsed.confirmedAt) ? Number(parsed.confirmedAt) : Date.now();
    return {
      identity,
      lobbyId,
      gameId: storedGameId,
      confirmedAt,
    };
  } catch {
    return null;
  }
}

function saveRoomPickerSessionState(identity: string, lobbyId: string, gameId: GameId = DEFAULT_GAME_ID) {
  if (typeof window === "undefined") return;
  const safeIdentity = identity.trim().slice(0, 80);
  const safeLobbyId = sanitizeLobbyId(lobbyId);
  if (!safeIdentity || !safeLobbyId) return;
  const payload = JSON.stringify({
    identity: safeIdentity,
    lobbyId: safeLobbyId,
    gameId,
    confirmedAt: Date.now(),
  } satisfies RoomPickerSessionState);
  safeStorageSetItem(
    window.sessionStorage,
    getRoomPickerSessionStorageKey(gameId),
    payload,
  );
  if (gameId === DEFAULT_GAME_ID) {
    // Legacy key'i yazarak mevcut tavla istemcileriyle uyumlulugu koru.
    safeStorageSetItem(window.sessionStorage, ROOM_PICKER_SESSION_KEY, payload);
  }
}

function clearRoomPickerSessionState(gameId?: GameId) {
  if (typeof window === "undefined") return;
  if (gameId) {
    safeStorageRemoveItem(window.sessionStorage, getRoomPickerSessionStorageKey(gameId));
    if (gameId === DEFAULT_GAME_ID) {
      safeStorageRemoveItem(window.sessionStorage, ROOM_PICKER_SESSION_KEY);
    }
    return;
  }
  safeStorageRemoveItem(window.sessionStorage, ROOM_PICKER_SESSION_KEY);
  safeStorageRemoveItem(window.sessionStorage, getRoomPickerSessionStorageKey("tavla"));
  safeStorageRemoveItem(window.sessionStorage, getRoomPickerSessionStorageKey("okey101"));
}

function shouldOpenRoomPickerInitially(initialRoom: RoomSession | null, gameId: GameId = DEFAULT_GAME_ID) {
  if (initialRoom) return false;
  const memberSession = loadMemberSession();
  const identity = getRoomPickerIdentity(memberSession?.userId ?? "", getOrCreateGuestId());
  const sessionState = loadRoomPickerSessionState(gameId);
  if (!sessionState) return true;
  return sessionState.identity !== identity;
}

function loadSelectedGameIdFromSession(): GameId | null {
  if (typeof window === "undefined") return null;
  const raw = safeStorageGetItem(window.sessionStorage, GAME_SELECTION_SESSION_KEY);
  if (raw === "tavla" || raw === "okey101") return raw;
  return null;
}

function saveSelectedGameIdToSession(gameId: GameId) {
  if (typeof window === "undefined") return;
  safeStorageSetItem(window.sessionStorage, GAME_SELECTION_SESSION_KEY, gameId);
}

function normalizeOkeyPrototypeTileScalePct(value: number) {
  if (!Number.isFinite(value)) return 100;
  const clamped = Math.max(85, Math.min(130, Math.round(value)));
  return Math.round(clamped / 5) * 5;
}

function loadOkeyPrototypeTileScalePctFromSession() {
  if (typeof window === "undefined") return 100;
  const raw = safeStorageGetItem(window.sessionStorage, OKEY_PROTOTYPE_TILE_SCALE_SESSION_KEY);
  if (!raw) return 100;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return 100;
  return normalizeOkeyPrototypeTileScalePct(parsed);
}

function normalizeOkeyPrototypeAutoSortMode(value: string): OkeyPrototypeAutoSortMode {
  if (value === "color" || value === "value") return value;
  return "off";
}

function loadOkeyPrototypeAutoSortModeFromSession(): OkeyPrototypeAutoSortMode {
  if (typeof window === "undefined") return "off";
  const raw = safeStorageGetItem(window.sessionStorage, OKEY_PROTOTYPE_AUTO_SORT_SESSION_KEY);
  if (!raw) return "off";
  return normalizeOkeyPrototypeAutoSortMode(raw);
}

function readEntryScreenFromUrl(): EntryScreen | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("entry");
  if (raw === "game" || raw === "room" || raw === "lobby") return raw;
  return null;
}

function readGameIdFromUrl(): GameId | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("game");
  if (raw === "tavla" || raw === "okey101") return raw;
  return null;
}

function pushEntryScreenHistory(screen: EntryScreen, gameId?: GameId) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("entry", screen);
  if (gameId) {
    url.searchParams.set("game", gameId);
  }
  window.history.pushState({ entry: screen }, "", `${url.pathname}${url.search}${url.hash}`);
}

function getInitialGuestName() {
  if (typeof window === "undefined") return "Misafir";
  const params = new URLSearchParams(window.location.search);
  const fromUrl = sanitizeGuestName(params.get("name") ?? params.get("guest") ?? "");
  if (fromUrl) return fromUrl;
  const fromStorage = sanitizeGuestName(safeStorageGetItem(window.localStorage, GUEST_STORAGE_KEY) ?? "");
  return fromStorage || "Misafir";
}

function getInitialRoomSession(): RoomSession | null {
  return null;
}

function getActiveLobbyStorageKey(gameId: GameId) {
  return `${ACTIVE_LOBBY_ID_KEY}.${gameId}`;
}

function getInitialLobbyId(gameId: GameId = DEFAULT_GAME_ID) {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  const fromUrl = sanitizeLobbyId(params.get("lobby") ?? "");
  if (fromUrl) return fromUrl;
  const fromScopedStorage = sanitizeLobbyId(
    safeStorageGetItem(window.localStorage, getActiveLobbyStorageKey(gameId)) ?? "",
  );
  if (fromScopedStorage) return fromScopedStorage;
  const fromStorage = sanitizeLobbyId(safeStorageGetItem(window.localStorage, ACTIVE_LOBBY_ID_KEY) ?? "");
  return fromStorage;
}

function clearSessionFromTables(
  tables: LobbyTable[],
  sessionId: string,
  fallbackUserId = "",
  scopeRoomCode = "",
  scopeTableId = 0,
): { tables: LobbyTable[]; changed: boolean } {
  const safeFallbackUserId = sanitizeGuestId(fallbackUserId);
  const safeScopeRoomCode = sanitizeRoomCode(scopeRoomCode);
  const safeScopeTableId = Number.isInteger(scopeTableId) && scopeTableId > 0 ? scopeTableId : 0;
  let changed = false;
  const next = tables.map((table) => {
    const inScope = safeScopeTableId || safeScopeRoomCode
      ? table.id === safeScopeTableId || (safeScopeRoomCode && table.roomCode === safeScopeRoomCode)
      : true;
    const whiteOwned = Boolean(
      table.white?.sessionId === sessionId
      || (inScope && safeFallbackUserId && sanitizeGuestId(table.white?.userId ?? "") === safeFallbackUserId),
    );
    const blackOwned = Boolean(
      table.black?.sessionId === sessionId
      || (inScope && safeFallbackUserId && sanitizeGuestId(table.black?.userId ?? "") === safeFallbackUserId),
    );
    if (!whiteOwned && !blackOwned) return table;
    changed = true;
    const whiteClearToken = whiteOwned
      ? createSeatClearToken(table.white?.sessionId || table.white?.userId || sessionId || safeFallbackUserId || "white")
      : table.whiteClearToken;
    const blackClearToken = blackOwned
      ? createSeatClearToken(table.black?.sessionId || table.black?.userId || sessionId || safeFallbackUserId || "black")
      : table.blackClearToken;
    return normalizeTableAccess(
      resetTableSeriesProgress(resetTableStartGate({
        ...table,
        white: whiteOwned ? null : table.white,
        black: blackOwned ? null : table.black,
        whiteClearToken,
        blackClearToken,
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

function findUserSeat(tables: LobbyTable[], userId: string) {
  const safeUserId = sanitizeGuestId(userId);
  if (!safeUserId) return null;
  for (const table of tables) {
    if (table.white && sanitizeGuestId(table.white.userId) === safeUserId) {
      return { table, seat: "white" as const, sessionId: table.white.sessionId };
    }
    if (table.black && sanitizeGuestId(table.black.userId) === safeUserId) {
      return { table, seat: "black" as const, sessionId: table.black.sessionId };
    }
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
    if (incomingStateUpdatedAt - base.touchedAt > SEAT_NULL_MERGE_GRACE_MS) return null;
    return base;
  }
  if (!base && incoming) {
    if (baseStateUpdatedAt - incoming.touchedAt > SEAT_NULL_MERGE_GRACE_MS) return null;
    return incoming;
  }
  if (!base && !incoming) return null;
  if (!base || !incoming) return null;
  if (incoming.touchedAt === base.touchedAt) {
    return preferBase ? base : incoming;
  }
  return incoming.touchedAt > base.touchedAt ? incoming : base;
}

function mergeSeatWithClear(
  baseSeat: LobbySeatState | null,
  incomingSeat: LobbySeatState | null,
  baseClearToken: string | null,
  incomingClearToken: string | null,
  baseStateUpdatedAt: number,
  incomingStateUpdatedAt: number,
  preferBase: boolean,
) {
  const safeBaseClearToken = !baseSeat ? sanitizeSeatClearToken(baseClearToken ?? "") : "";
  const safeIncomingClearToken = !incomingSeat ? sanitizeSeatClearToken(incomingClearToken ?? "") : "";
  const baseClearedAt = parseSeatClearTokenTime(safeBaseClearToken);
  const incomingClearedAt = parseSeatClearTokenTime(safeIncomingClearToken);

  if (safeIncomingClearToken && !incomingSeat && baseSeat) {
    if (!baseSeat.touchedAt || baseSeat.touchedAt <= incomingClearedAt || !incomingClearedAt) {
      return { seat: null, clearToken: safeIncomingClearToken || null };
    }
  }

  if (safeBaseClearToken && !baseSeat && incomingSeat) {
    if (!incomingSeat.touchedAt || incomingSeat.touchedAt <= baseClearedAt || !baseClearedAt) {
      return { seat: null, clearToken: safeBaseClearToken || null };
    }
  }

  if (!baseSeat && !incomingSeat) {
    const clearToken = safeBaseClearToken && safeIncomingClearToken
      ? (preferBase ? safeBaseClearToken : safeIncomingClearToken)
      : (safeBaseClearToken || safeIncomingClearToken || "");
    return { seat: null, clearToken: clearToken || null };
  }

  const mergedSeat = mergeSeatState(
    baseSeat,
    incomingSeat,
    baseStateUpdatedAt,
    incomingStateUpdatedAt,
    preferBase,
  );

  if (mergedSeat) {
    return { seat: mergedSeat, clearToken: null };
  }

  const fallbackToken = safeBaseClearToken && safeIncomingClearToken
    ? (preferBase ? safeBaseClearToken : safeIncomingClearToken)
    : (safeBaseClearToken || safeIncomingClearToken || "");
  return { seat: null, clearToken: fallbackToken || null };
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
    const mergedWhite = mergeSeatWithClear(
      existing.white,
      table.white,
      existing.whiteClearToken,
      table.whiteClearToken,
      remote.updatedAt,
      local.updatedAt,
      preferRemote,
    );
    const mergedBlack = mergeSeatWithClear(
      existing.black,
      table.black,
      existing.blackClearToken,
      table.blackClearToken,
      remote.updatedAt,
      local.updatedAt,
      preferRemote,
    );

    const mergedTable: LobbyTable = {
      id: Math.min(existing.id, table.id),
      roomCode: sanitizeRoomCode(existing.roomCode) || sanitizeRoomCode(table.roomCode) || createRoomCode(),
      white: mergedWhite.seat,
      black: mergedBlack.seat,
      whiteClearToken: mergedWhite.clearToken,
      blackClearToken: mergedBlack.clearToken,
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

function Okey101App() {
  const [initialRoom] = useState<RoomSession | null>(() => getInitialRoomSession());
  const [isAdminWindow] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("admin") === "1";
  });
  const [selectedLobbyId, setSelectedLobbyId] = useState<string>(() => {
    const fromRoom = sanitizeLobbyId(initialRoom?.lobbyId ?? "");
    if (fromRoom) return fromRoom;
    const initialGameId = readGameIdFromUrl() ?? loadSelectedGameIdFromSession() ?? DEFAULT_GAME_ID;
    return sanitizeLobbyId(getInitialLobbyId(initialGameId)) || DEFAULT_LOBBY_ID;
  });
  const [lobbyRooms, setLobbyRooms] = useState<LobbyRoom[]>(() => normalizeLobbyRooms([
    {
      id: sanitizeLobbyId(initialRoom?.lobbyId ?? "") || DEFAULT_LOBBY_ID,
      name: sanitizeLobbyName(initialRoom?.roomName ?? DEFAULT_LOBBY_NAME),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdByUserId: null,
    },
  ]));
  const [roomPickerLiveCounts, setRoomPickerLiveCounts] = useState<Record<string, LobbyRoomCounts>>({});
  const [lobbyRoomsBusy, setLobbyRoomsBusy] = useState(false);
  const [lobbyRoomsError, setLobbyRoomsError] = useState("");
  const [selectedGameId, setSelectedGameId] = useState<GameId>("okey101");
  const [gamePickerOpen, setGamePickerOpen] = useState<boolean>(false);
  const [roomPickerOpen, setRoomPickerOpen] = useState<boolean>(() => {
    const selectedGame = readGameIdFromUrl() ?? loadSelectedGameIdFromSession() ?? DEFAULT_GAME_ID;
    const entryScreen = readEntryScreenFromUrl();
    if (entryScreen === "room") return true;
    if (entryScreen === "game" || entryScreen === "lobby") return false;
    return shouldOpenRoomPickerInitially(initialRoom, selectedGame);
  });
  const [adminLobbyNameDraft, setAdminLobbyNameDraft] = useState("");
  const [adminSelectedLobbyId, setAdminSelectedLobbyId] = useState("");
  const [adminSelectedUserId, setAdminSelectedUserId] = useState("");
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
  const [lobbyNotice, setLobbyNotice] = useState("");
  const normalizedLobbyNotice = useMemo(() => normalizeTurkishDisplayText(lobbyNotice), [lobbyNotice]);
  const [invitePickerTableId, setInvitePickerTableId] = useState<number | null>(null);
  const [lobbyState, setLobbyState] = useState<LobbyState>(() => {
    const initialLobbyId = sanitizeLobbyId(initialRoom?.lobbyId ?? "") || sanitizeLobbyId(getInitialLobbyId(selectedGameId)) || DEFAULT_LOBBY_ID;
    const roomName = sanitizeLobbyName(initialRoom?.roomName ?? DEFAULT_LOBBY_NAME);
    const loaded = loadLobbyState(makeLobbyStateStorageKey(initialLobbyId), roomName);
    if (loaded.lobbyName === roomName) return loaded;
    const merged = { ...loaded, lobbyName: roomName, updatedAt: Date.now() };
    saveJson(makeLobbyStateStorageKey(initialLobbyId), merged);
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
  const [profileModal, setProfileModal] = useState<PlayerProfileModalState>({
    open: false,
    loading: false,
    isMember: false,
    name: "",
    gender: "unknown",
    avatarId: DEFAULT_AVATAR_BY_GENDER.unknown,
    points: 0,
    stats: createEmptyStats(),
    anchorLeft: PROFILE_POPOVER_VIEWPORT_MARGIN_PX,
    anchorTop: PROFILE_POPOVER_VIEWPORT_MARGIN_PX,
  });
  const [leaveConfirmModal, setLeaveConfirmModal] = useState<LeaveConfirmModalState>({
    open: false,
    title: "",
    message: "",
  });
  const [leaveActionModalOpen, setLeaveActionModalOpen] = useState(false);
  const [leaveIncomingModal, setLeaveIncomingModal] = useState<{ open: boolean; requesterName: string; requestKey: string }>({
    open: false,
    requesterName: "",
    requestKey: "",
  });
  const [leaveInfoModal, setLeaveInfoModal] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });
  const [opponentIdleModal, setOpponentIdleModal] = useState<{ open: boolean; matchToken: string }>({
    open: false,
    matchToken: "",
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
  // smoke-compat:
  // const [okeyPrototypeRoomSketchOpen, setOkeyPrototypeRoomSketchOpen] = useState(true);
  const [okeyPrototypeRoomSketchOpen, setOkeyPrototypeRoomSketchOpen] = useState(false);
  const [okeyPrototypeRoomFilter, setOkeyPrototypeRoomFilter] = useState<"all" | "fast" | "busy">("all");
  const [okeyPrototypeSelectedRoomId, setOkeyPrototypeSelectedRoomId] = useState<string>(OKEY_PROTOTYPE_ROOMS[0]?.id ?? "");
  const [okeyPrototypeTablesByRoom, setOkeyPrototypeTablesByRoom] = useState<Record<string, OkeyPrototypeLobbyTableState[]>>(() => ({}));
  const [okeyPrototypeTableFilter, setOkeyPrototypeTableFilter] = useState<"all" | "active" | "waiting">("all");
  const [okeyPrototypeOnlyWithFreeSeats, setOkeyPrototypeOnlyWithFreeSeats] = useState(false);
  const [okeyPrototypeTableSearch, setOkeyPrototypeTableSearch] = useState("");
  const [okeyPrototypeTableSort, setOkeyPrototypeTableSort] = useState<"tableNo" | "occupancy" | "status">("tableNo");
  const [okeyPrototypeSelectedTableId, setOkeyPrototypeSelectedTableId] = useState("");
  const [okeyPrototypeSeatDraft, setOkeyPrototypeSeatDraft] = useState<OkeyPrototypeSeatNo>(1);
  const [okeyPrototypeSeatReservation, setOkeyPrototypeSeatReservation] = useState<{ tableId: string; seatNo: OkeyPrototypeSeatNo } | null>(null);
  const [okeyPrototypeTurnSeat, setOkeyPrototypeTurnSeat] = useState<1 | 2 | 3 | 4>(1);
  const [okeyPrototypeHandFirstSeat, setOkeyPrototypeHandFirstSeat] = useState<OkeyPrototypeSeatNo>(1);
  const [okeyPrototypeTurnRound, setOkeyPrototypeTurnRound] = useState(1);
  const [okeyPrototypeSessionHandNo, setOkeyPrototypeSessionHandNo] = useState(1);
  const [okeyPrototypeTurnPhase, setOkeyPrototypeTurnPhase] = useState<OkeyPrototypeTurnPhase>("draw");
  const [okeyPrototypeTurnLockedAfterMeld, setOkeyPrototypeTurnLockedAfterMeld] = useState(false);
  const [okeyPrototypeTurnOpeningPoints, setOkeyPrototypeTurnOpeningPoints] = useState(0);
  const [okeyPrototypeSeatOpenedState, setOkeyPrototypeSeatOpenedState] = useState<OkeyPrototypeSeatOpenedState>(() => createDefaultOkeyPrototypeSeatOpenedState());
  const [okeyPrototypeInitialDeal] = useState<OkeyPrototypeDealState>(() => createOkeyPrototypeDealState(Date.now(), 1));
  const [okeyPrototypeRackState, setOkeyPrototypeRackState] = useState<OkeyPrototypeRackState>(() => okeyPrototypeInitialDeal.rackState);
  const [okeyPrototypeWallTiles, setOkeyPrototypeWallTiles] = useState<OkeyPrototypeTile[]>(() => okeyPrototypeInitialDeal.wallTiles);
  const [okeyPrototypeIndicatorTile, setOkeyPrototypeIndicatorTile] = useState<OkeyPrototypeTile | null>(() => okeyPrototypeInitialDeal.indicatorTile);
  const [okeyPrototypeOkeyTile, setOkeyPrototypeOkeyTile] = useState<OkeyPrototypeTile | null>(() => okeyPrototypeInitialDeal.okeyTile);
  const [okeyPrototypeSahteOkeyCount, setOkeyPrototypeSahteOkeyCount] = useState(() => 2);
  const [okeyPrototypeDiscardPile, setOkeyPrototypeDiscardPile] = useState<OkeyPrototypeDiscardEntry[]>([]);
  const [okeyPrototypePendingDiscardTileId, setOkeyPrototypePendingDiscardTileId] = useState("");
  const [okeyPrototypeDiscardDraftTileId, setOkeyPrototypeDiscardDraftTileId] = useState("");
  const [okeyPrototypeMeldDraftTileIds, setOkeyPrototypeMeldDraftTileIds] = useState<string[]>([]);
  const [okeyPrototypeOpenedMelds, setOkeyPrototypeOpenedMelds] = useState<OkeyPrototypeMeldEntry[]>([]);
  const [okeyPrototypeAttachTargetMeldId, setOkeyPrototypeAttachTargetMeldId] = useState("");
  const [okeyPrototypeDealSeedDraft, setOkeyPrototypeDealSeedDraft] = useState(() => String(Date.now()));
  const [okeyPrototypeBoardMaskOthers, setOkeyPrototypeBoardMaskOthers] = useState(false);
  const [okeyPrototypeTileScalePct, setOkeyPrototypeTileScalePct] = useState(() => loadOkeyPrototypeTileScalePctFromSession());
  const [okeyPrototypeAutoSortMode, setOkeyPrototypeAutoSortMode] = useState<OkeyPrototypeAutoSortMode>(() => loadOkeyPrototypeAutoSortModeFromSession());
  const [okeyPrototypeBotModeEnabled, setOkeyPrototypeBotModeEnabled] = useState(false);
  const [okeyPrototypeBotDifficulty, setOkeyPrototypeBotDifficulty] = useState<OkeyPrototypeBotDifficulty>("normal");
  const [okeyPrototypeWinnerSeat, setOkeyPrototypeWinnerSeat] = useState<OkeyPrototypeSeatNo | null>(null);
  const [okeyPrototypeHandDrawn, setOkeyPrototypeHandDrawn] = useState(false);
  const [okeyPrototypeSeatHandWins, setOkeyPrototypeSeatHandWins] = useState<Record<OkeyPrototypeSeatNo, number>>(() => createDefaultOkeyPrototypeSeatWinState());
  const [okeyPrototypeSeatPenaltyTotals, setOkeyPrototypeSeatPenaltyTotals] = useState<Record<OkeyPrototypeSeatNo, number>>(() => createDefaultOkeyPrototypeSeatWinState());
  const [okeyPrototypeDrawHandCount, setOkeyPrototypeDrawHandCount] = useState(0);
  const [okeyPrototypeLastHandSummary, setOkeyPrototypeLastHandSummary] = useState("");
  const [okeyPrototypeActionLog, setOkeyPrototypeActionLog] = useState<Array<{ id: string; at: number; text: string }>>([]);
  const canAccessOkeyPrototype = true;
  const useTavlaLikeOkeyLayout = true;
  const effectiveSelectedGameId: GameId = selectedGameId;
  const isTavlaSelectedGame = effectiveSelectedGameId === "tavla";
  useEffect(() => {
    if (selectedGameId === "okey101") return;
    setSelectedGameId("okey101");
  }, [selectedGameId]);
  const okeyPrototypeRoomStatsById = useMemo(() => {
    return OKEY_PROTOTYPE_ROOMS.reduce<Record<string, { activeTables: number; players: number }>>((acc, room) => {
      const roomTables = okeyPrototypeTablesByRoom[room.id] ?? [];
      const activeTables = roomTables.filter((table) => Object.keys(table.seats).length > 0).length;
      const uniquePlayers = new Set<string>();
      roomTables.forEach((table) => {
        Object.values(table.seats).forEach((seat) => {
          if (!seat) return;
          const safeUserId = sanitizeGuestId(seat.userId);
          if (!safeUserId) return;
          uniquePlayers.add(safeUserId);
        });
      });
      acc[room.id] = {
        activeTables,
        players: uniquePlayers.size,
      };
      return acc;
    }, {});
  }, [okeyPrototypeTablesByRoom]);
  const okeyPrototypeRoomsWithStats = useMemo(() => {
    return OKEY_PROTOTYPE_ROOMS.map((room) => {
      const stats = okeyPrototypeRoomStatsById[room.id] ?? { activeTables: 0, players: 0 };
      return {
        ...room,
        activeTables: stats.activeTables,
        players: stats.players,
      };
    });
  }, [okeyPrototypeRoomStatsById]);
  const okeyPrototypeFilteredRooms = useMemo(() => {
    if (okeyPrototypeRoomFilter === "fast") {
      return okeyPrototypeRoomsWithStats.filter((room) => room.level === "Hizli");
    }
    if (okeyPrototypeRoomFilter === "busy") {
      return okeyPrototypeRoomsWithStats.filter((room) => room.players >= 15);
    }
    return okeyPrototypeRoomsWithStats;
  }, [okeyPrototypeRoomFilter, okeyPrototypeRoomsWithStats]);
  const okeyPrototypeSelectedRoom =
    okeyPrototypeFilteredRooms.find((room) => room.id === okeyPrototypeSelectedRoomId)
    ?? okeyPrototypeFilteredRooms[0]
    ?? okeyPrototypeRoomsWithStats[0]
    ?? null;
  const okeyPrototypeFilteredPlayers = okeyPrototypeFilteredRooms
    .map((room) => room.players)
    .reduce((sum, players) => sum + players, 0);
  const okeyPrototypeTableSketchRows = useMemo<OkeyPrototypeTableSketchRow[]>(() => {
    if (!okeyPrototypeSelectedRoom) return [];
    const roomTables = (okeyPrototypeTablesByRoom[okeyPrototypeSelectedRoom.id] ?? [])
      .slice()
      .sort((left, right) => left.tableNo - right.tableNo);
    return roomTables.map((table) => {
      const occupiedSeatNos = OKEY_PROTOTYPE_SEATS.filter((seatNo) => Boolean(table.seats[seatNo]));
      const seated = occupiedSeatNos.length;
      const started = seated >= 4 && Boolean(table.startedAt);
      return {
        id: table.id,
        roomId: table.roomId,
        tableNo: table.tableNo,
        active: started,
        started,
        seated,
        occupiedSeatNos,
        ownerUserId: table.ownerUserId,
        seats: table.seats,
      };
    });
  }, [okeyPrototypeSelectedRoom, okeyPrototypeTablesByRoom]);
  const okeyPrototypeFilteredTableSketchRows = useMemo(() => {
    const searchQuery = okeyPrototypeTableSearch.replace(/\D/g, "").slice(0, 2);
    let rows = okeyPrototypeTableSketchRows;
    if (okeyPrototypeTableFilter === "active") {
      rows = rows.filter((row) => row.active);
    }
    if (okeyPrototypeTableFilter === "waiting") {
      rows = rows.filter((row) => !row.active);
    }
    if (okeyPrototypeOnlyWithFreeSeats) {
      rows = rows.filter((row) => row.seated < 4);
    }
    if (!searchQuery) return rows;
    return rows.filter((row) => String(row.tableNo).includes(searchQuery));
  }, [okeyPrototypeTableSketchRows, okeyPrototypeTableFilter, okeyPrototypeOnlyWithFreeSeats, okeyPrototypeTableSearch]);
  const okeyPrototypeVisibleTableSketchRows = useMemo(() => {
    const rows = okeyPrototypeFilteredTableSketchRows.slice();
    if (okeyPrototypeTableSort === "occupancy") {
      rows.sort((left, right) => {
        if (right.seated !== left.seated) return right.seated - left.seated;
        if (left.active !== right.active) return left.active ? -1 : 1;
        return left.tableNo - right.tableNo;
      });
      return rows;
    }
    if (okeyPrototypeTableSort === "status") {
      rows.sort((left, right) => {
        if (left.active !== right.active) return left.active ? -1 : 1;
        if (right.seated !== left.seated) return right.seated - left.seated;
        return left.tableNo - right.tableNo;
      });
      return rows;
    }
    rows.sort((left, right) => left.tableNo - right.tableNo);
    return rows;
  }, [okeyPrototypeFilteredTableSketchRows, okeyPrototypeTableSort]);
  const okeyPrototypeTableSummary = useMemo(() => {
    const total = okeyPrototypeVisibleTableSketchRows.length;
    const active = okeyPrototypeVisibleTableSketchRows.filter((row) => row.active).length;
    const waiting = total - active;
    const occupiedSeats = okeyPrototypeVisibleTableSketchRows.reduce((sum, row) => sum + row.seated, 0);
    const totalSeats = total * 4;
    const freeSeats = Math.max(0, totalSeats - occupiedSeats);
    const occupancyPct = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;
    return {
      total,
      active,
      waiting,
      occupiedSeats,
      freeSeats,
      occupancyPct,
    };
  }, [okeyPrototypeVisibleTableSketchRows]);
  const okeyPrototypeQuickJoinTable = useMemo(() => {
    const candidates = okeyPrototypeVisibleTableSketchRows.filter((row) => row.seated < 4);
    if (candidates.length === 0) return null;
    return candidates
      .slice()
      .sort((left, right) => {
        if (right.seated !== left.seated) return right.seated - left.seated;
        if (left.active !== right.active) return left.active ? -1 : 1;
        return left.tableNo - right.tableNo;
      })[0];
  }, [okeyPrototypeVisibleTableSketchRows]);
  const okeyPrototypeSelectedTable =
    okeyPrototypeVisibleTableSketchRows.find((row) => row.id === okeyPrototypeSelectedTableId)
    ?? okeyPrototypeVisibleTableSketchRows[0]
    ?? null;
  const okeyPrototypeLobbyRows = useMemo(() => {
    return okeyPrototypeVisibleTableSketchRows;
  }, [okeyPrototypeVisibleTableSketchRows]);
  const okeyPrototypeSelectedTableIndex = useMemo(() => {
    if (!okeyPrototypeSelectedTable) return -1;
    return okeyPrototypeVisibleTableSketchRows.findIndex((row) => row.id === okeyPrototypeSelectedTable.id);
  }, [okeyPrototypeVisibleTableSketchRows, okeyPrototypeSelectedTable]);
  const okeyPrototypeSelectedTablePosition = okeyPrototypeSelectedTableIndex >= 0 ? okeyPrototypeSelectedTableIndex + 1 : 0;
  const okeyPrototypeRandomFreeSeatTableCandidates = useMemo(() => {
    if (okeyPrototypeVisibleTableSketchRows.length === 0) return [];
    return okeyPrototypeVisibleTableSketchRows.filter((row, index) => {
      if (index === okeyPrototypeSelectedTableIndex) return false;
      return row.seated < 4;
    });
  }, [okeyPrototypeVisibleTableSketchRows, okeyPrototypeSelectedTableIndex]);
  const okeyPrototypeHasTableFilters = Boolean(
    okeyPrototypeTableFilter !== "all"
    || okeyPrototypeOnlyWithFreeSeats
    || okeyPrototypeTableSort !== "tableNo"
    || okeyPrototypeTableSearch.trim().length > 0,
  );
  const okeyPrototypeActiveFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string }> = [];
    if (okeyPrototypeTableFilter === "active") filters.push({ key: "status-active", label: "Durum: Aktif" });
    if (okeyPrototypeTableFilter === "waiting") filters.push({ key: "status-waiting", label: "Durum: Bekleyen" });
    if (okeyPrototypeOnlyWithFreeSeats) filters.push({ key: "free-seats", label: "Bos Koltuk" });
    if (okeyPrototypeTableSort === "occupancy") filters.push({ key: "sort-occupancy", label: "Siralama: Doluluk" });
    if (okeyPrototypeTableSort === "status") filters.push({ key: "sort-status", label: "Siralama: Durum" });
    const query = okeyPrototypeTableSearch.replace(/\D/g, "").slice(0, 2);
    if (query) filters.push({ key: "search", label: `Masa Ara: ${query}` });
    return filters;
  }, [okeyPrototypeOnlyWithFreeSeats, okeyPrototypeTableFilter, okeyPrototypeTableSearch, okeyPrototypeTableSort]);
  const okeyPrototypeSelectedTableSeats = useMemo(() => {
    if (!okeyPrototypeSelectedTable) return [];
    return Array.from({ length: 4 }, (_, index) => {
      const seatNo = (index + 1) as OkeyPrototypeSeatNo;
      const occupant = okeyPrototypeSelectedTable.seats[seatNo] ?? null;
      const occupied = Boolean(occupant);
      return {
        id: `${okeyPrototypeSelectedTable.id}-seat-${seatNo}`,
        seatNo,
        occupied,
        label: occupant?.displayName ?? "Bos",
      };
    });
  }, [okeyPrototypeSelectedTable]);
  const okeyPrototypeAvailableSeatNos = useMemo(() => {
    return okeyPrototypeSelectedTableSeats.filter((seat) => !seat.occupied).map((seat) => seat.seatNo);
  }, [okeyPrototypeSelectedTableSeats]);
  const okeyPrototypeJoinedTable = useMemo(() => {
    if (!okeyPrototypeSeatReservation) return null;
    return okeyPrototypeTableSketchRows.find((row) => row.id === okeyPrototypeSeatReservation.tableId) ?? null;
  }, [okeyPrototypeSeatReservation, okeyPrototypeTableSketchRows]);
  const okeyPrototypeActiveTurnSeats = useMemo(() => {
    if (!okeyPrototypeSeatReservation || !okeyPrototypeJoinedTable) {
      return [okeyPrototypeTurnSeat as OkeyPrototypeSeatNo];
    }
    const seatsFromRack = OKEY_PROTOTYPE_SEATS.filter((seatNo) => (okeyPrototypeRackState[seatNo] ?? []).length > 0);
    const occupiedSeatNos = getOkeyLobbyOccupiedSeatNos(okeyPrototypeJoinedTable);
    const seats = seatsFromRack.length > 0
      ? seatsFromRack
      : (occupiedSeatNos.length > 0 ? occupiedSeatNos.slice() : [okeyPrototypeTurnSeat as OkeyPrototypeSeatNo]);
    const reservedSeatNo = Math.max(1, Math.min(4, okeyPrototypeSeatReservation.seatNo)) as OkeyPrototypeSeatNo;
    if (!seats.includes(reservedSeatNo)) {
      seats.push(reservedSeatNo);
      seats.sort((left, right) => left - right);
    }
    return seats;
  }, [okeyPrototypeJoinedTable, okeyPrototypeRackState, okeyPrototypeSeatReservation, okeyPrototypeTurnSeat]);
  const okeyPrototypeSeatNoForRack = useMemo(() => {
    if (okeyPrototypeSeatReservation && okeyPrototypeJoinedTable) {
      return okeyPrototypeTurnSeat as OkeyPrototypeSeatNo;
    }
    if (okeyPrototypeSeatReservation) {
      return Math.max(1, Math.min(4, okeyPrototypeSeatReservation.seatNo)) as OkeyPrototypeSeatNo;
    }
    return okeyPrototypeTurnSeat as OkeyPrototypeSeatNo;
  }, [okeyPrototypeJoinedTable, okeyPrototypeSeatReservation, okeyPrototypeTurnSeat]);
  const okeyPrototypeSeatRackTiles = useMemo(() => {
    return okeyPrototypeRackState[okeyPrototypeSeatNoForRack] ?? [];
  }, [okeyPrototypeRackState, okeyPrototypeSeatNoForRack]);
  const okeyPrototypeLocalSeatNo = useMemo(() => {
    if (okeyPrototypeSeatReservation) {
      return Math.max(1, Math.min(4, okeyPrototypeSeatReservation.seatNo)) as OkeyPrototypeSeatNo;
    }
    return okeyPrototypeTurnSeat as OkeyPrototypeSeatNo;
  }, [okeyPrototypeSeatReservation, okeyPrototypeTurnSeat]);
  const okeyPrototypeSeatRoleLabels = useMemo(() => {
    const labels: Record<OkeyPrototypeSeatNo, string> = {
      1: "Bos",
      2: "Bos",
      3: "Bos",
      4: "Bos",
    };
    const activeSeats = okeyPrototypeActiveTurnSeats.length > 0
      ? okeyPrototypeActiveTurnSeats
      : OKEY_PROTOTYPE_SEATS;
    let rivalIndex = 1;
    OKEY_PROTOTYPE_SEATS.forEach((seatNo) => {
      if (seatNo === okeyPrototypeLocalSeatNo) {
        labels[seatNo] = "Sen";
        return;
      }
      if (!activeSeats.includes(seatNo)) {
        labels[seatNo] = "Bos";
        return;
      }
      labels[seatNo] = `Rakip ${rivalIndex}`;
      rivalIndex += 1;
    });
    return labels;
  }, [okeyPrototypeActiveTurnSeats, okeyPrototypeLocalSeatNo]);
  const okeyPrototypeSeatDisplayNames = useMemo(() => {
    const names: Record<OkeyPrototypeSeatNo, string> = {
      1: "Bos",
      2: "Bos",
      3: "Bos",
      4: "Bos",
    };
    const activeSeats = okeyPrototypeActiveTurnSeats.length > 0
      ? okeyPrototypeActiveTurnSeats
      : OKEY_PROTOTYPE_SEATS;
    const localName = sanitizeGuestName(member?.displayName ?? guestName) || "Sen";
    const seedSource = `${okeyPrototypeSeatReservation?.tableId ?? "okey-proto"}:${okeyPrototypeLocalSeatNo}`;
    const startIndex = hashOkeyPrototypeText(seedSource) % OKEY_PROTOTYPE_OPPONENT_NAMES.length;
    let rivalOffset = 0;
    OKEY_PROTOTYPE_SEATS.forEach((seatNo) => {
      if (!activeSeats.includes(seatNo)) {
        names[seatNo] = "Bos";
        return;
      }
      if (seatNo === okeyPrototypeLocalSeatNo) {
        names[seatNo] = localName;
        return;
      }
      const poolIndex = (startIndex + rivalOffset) % OKEY_PROTOTYPE_OPPONENT_NAMES.length;
      names[seatNo] = OKEY_PROTOTYPE_OPPONENT_NAMES[poolIndex] ?? `Rakip${seatNo}`;
      rivalOffset += 1;
    });
    return names;
  }, [guestName, member?.displayName, okeyPrototypeActiveTurnSeats, okeyPrototypeLocalSeatNo, okeyPrototypeSeatReservation]);
  const okeyPrototypeSeatAvatarIds = useMemo(() => {
    const avatars: Record<OkeyPrototypeSeatNo, AvatarId> = {
      1: DEFAULT_AVATAR_BY_GENDER.unknown,
      2: DEFAULT_AVATAR_BY_GENDER.unknown,
      3: DEFAULT_AVATAR_BY_GENDER.unknown,
      4: DEFAULT_AVATAR_BY_GENDER.unknown,
    };
    const activeSeats = okeyPrototypeActiveTurnSeats.length > 0
      ? okeyPrototypeActiveTurnSeats
      : OKEY_PROTOTYPE_SEATS;
    const safeLocalAvatar = sanitizeAvatarId(member?.avatarId ?? guestProfile.avatarId, member?.gender ?? guestProfile.gender);
    const pool = AVATAR_PRESETS.map((preset) => preset.id).filter((id) => id !== safeLocalAvatar);
    const seedSource = `${okeyPrototypeSeatReservation?.tableId ?? "okey-proto"}:${okeyPrototypeLocalSeatNo}:avatar`;
    let offset = hashOkeyPrototypeText(seedSource);
    OKEY_PROTOTYPE_SEATS.forEach((seatNo) => {
      if (!activeSeats.includes(seatNo)) {
        avatars[seatNo] = DEFAULT_AVATAR_BY_GENDER.unknown;
        return;
      }
      if (seatNo === okeyPrototypeLocalSeatNo) {
        avatars[seatNo] = safeLocalAvatar;
        return;
      }
      if (pool.length === 0) {
        avatars[seatNo] = DEFAULT_AVATAR_BY_GENDER.unknown;
        return;
      }
      avatars[seatNo] = pool[offset % pool.length] ?? DEFAULT_AVATAR_BY_GENDER.unknown;
      offset += 1;
    });
    return avatars;
  }, [
    guestProfile.avatarId,
    guestProfile.gender,
    member?.avatarId,
    member?.gender,
    okeyPrototypeActiveTurnSeats,
    okeyPrototypeLocalSeatNo,
    okeyPrototypeSeatReservation,
  ]);
  const okeyPrototypeDisplaySeatPositionBySeat = useMemo(() => {
    const localSeatIndex = OKEY_PROTOTYPE_SEATS.findIndex((seatNo) => seatNo === okeyPrototypeLocalSeatNo);
    const safeLocalSeatIndex = localSeatIndex >= 0 ? localSeatIndex : 0;
    const bottomSeatIndex = OKEY_PROTOTYPE_SEATS.findIndex((seatNo) => seatNo === 3);
    const safeBottomSeatIndex = bottomSeatIndex >= 0 ? bottomSeatIndex : 2;
    const offset = safeBottomSeatIndex - safeLocalSeatIndex;
    const positions: Record<OkeyPrototypeSeatNo, OkeyPrototypeSeatNo> = {
      1: 1,
      2: 2,
      3: 3,
      4: 4,
    };
    OKEY_PROTOTYPE_SEATS.forEach((seatNo, index) => {
      const shiftedIndex = (index + offset + OKEY_PROTOTYPE_SEATS.length) % OKEY_PROTOTYPE_SEATS.length;
      positions[seatNo] = OKEY_PROTOTYPE_SEATS[shiftedIndex] ?? seatNo;
    });
    return positions;
  }, [okeyPrototypeLocalSeatNo]);
  const okeyPrototypeDiscardDraftTile = useMemo(() => {
    if (!okeyPrototypeDiscardDraftTileId) return null;
    return okeyPrototypeSeatRackTiles.find((tile) => tile.id === okeyPrototypeDiscardDraftTileId) ?? null;
  }, [okeyPrototypeDiscardDraftTileId, okeyPrototypeSeatRackTiles]);
  const okeyPrototypeMeldDraftTiles = useMemo(() => {
    if (okeyPrototypeMeldDraftTileIds.length === 0) return [];
    return okeyPrototypeMeldDraftTileIds
      .map((tileId) => okeyPrototypeSeatRackTiles.find((tile) => tile.id === tileId) ?? null)
      .filter((tile): tile is OkeyPrototypeTile => Boolean(tile));
  }, [okeyPrototypeMeldDraftTileIds, okeyPrototypeSeatRackTiles]);
  const okeyPrototypeMeldDraftValidation = useMemo(() => {
    return evaluateOkeyPrototypeMeldDraft(okeyPrototypeMeldDraftTiles, okeyPrototypeOkeyTile);
  }, [okeyPrototypeMeldDraftTiles, okeyPrototypeOkeyTile]);
  const okeyPrototypeAttachTargetMeld = useMemo(() => {
    if (!okeyPrototypeAttachTargetMeldId) return null;
    return okeyPrototypeOpenedMelds.find((meld) => meld.id === okeyPrototypeAttachTargetMeldId) ?? null;
  }, [okeyPrototypeAttachTargetMeldId, okeyPrototypeOpenedMelds]);
  const okeyPrototypeRackSeatSummaries = useMemo(() => {
    return OKEY_PROTOTYPE_SEATS.map((seatNo) => {
      const tiles = okeyPrototypeRackState[seatNo] ?? [];
      return {
        seatNo,
        tileCount: tiles.length,
      };
    });
  }, [okeyPrototypeRackState]);
  const okeyPrototypeLastDiscard = okeyPrototypeDiscardPile[0] ?? null;
  const okeyPrototypeDiscardPreview = okeyPrototypeDiscardPile.slice(0, 8);
  const okeyPrototypeOpenedMeldPreview = okeyPrototypeOpenedMelds.slice(0, 8);
  const okeyPrototypeDrawPileRemaining = okeyPrototypeWallTiles.length;
  const okeyPrototypeSahteInWall = okeyPrototypeWallTiles.filter((tile) => tile.kind === "sahte").length;
  const okeyPrototypeHandCompleted = okeyPrototypeWinnerSeat !== null || okeyPrototypeHandDrawn;
  const okeyPrototypeCanAdvanceTurn = Boolean(okeyPrototypeSeatReservation && okeyPrototypeJoinedTable) && !okeyPrototypeHandCompleted;
  const okeyPrototypeCurrentSeatOpened = okeyPrototypeSeatOpenedState[okeyPrototypeTurnSeat as OkeyPrototypeSeatNo] ?? false;
  const okeyPrototypeCurrentSeatPairOpenCount = useMemo(
    () => countOkeyPrototypeIdenticalPairs(okeyPrototypeSeatRackTiles, okeyPrototypeOkeyTile),
    [okeyPrototypeSeatRackTiles, okeyPrototypeOkeyTile],
  );
  const okeyPrototypeOpeningRemainingPoints = Math.max(0, OKEY_PROTOTYPE_OPENING_TARGET_POINTS - okeyPrototypeTurnOpeningPoints);
  const okeyPrototypeDiscardBlockedByOpening = !okeyPrototypeCurrentSeatOpened
    && okeyPrototypeTurnOpeningPoints < OKEY_PROTOTYPE_OPENING_TARGET_POINTS;
  const okeyPrototypePendingDiscardTile = useMemo(() => {
    if (!okeyPrototypePendingDiscardTileId) return null;
    return okeyPrototypeSeatRackTiles.find((tile) => tile.id === okeyPrototypePendingDiscardTileId) ?? null;
  }, [okeyPrototypePendingDiscardTileId, okeyPrototypeSeatRackTiles]);
  const okeyPrototypeCanTakeDiscardWhenClosed = useMemo(() => {
    if (okeyPrototypeCurrentSeatOpened) return true;
    const topDiscard = okeyPrototypeDiscardPile[0];
    if (!topDiscard) return false;
    return canOkeyPrototypeTakeDiscardWhenClosed(okeyPrototypeSeatRackTiles, topDiscard.tile, okeyPrototypeOkeyTile);
  }, [
    okeyPrototypeCurrentSeatOpened,
    okeyPrototypeDiscardPile,
    okeyPrototypeSeatRackTiles,
    okeyPrototypeOkeyTile,
  ]);
  const okeyPrototypeSeatOpenedSummary = OKEY_PROTOTYPE_SEATS.map((seatNo) => ({
    seatNo,
    opened: okeyPrototypeSeatOpenedState[seatNo] ?? false,
  }));
  const okeyPrototypeSeatScoreSummaryText = OKEY_PROTOTYPE_SEATS
    .map((seatNo) => `K${seatNo}: ${okeyPrototypeSeatHandWins[seatNo] ?? 0}`)
    .join(" | ");
  const okeyPrototypeSeatPenaltySummaryText = OKEY_PROTOTYPE_SEATS
    .map((seatNo) => `K${seatNo}: ${okeyPrototypeSeatPenaltyTotals[seatNo] ?? 0}`)
    .join(" | ");
  const okeyPrototypeTileScale = Math.max(85, Math.min(130, okeyPrototypeTileScalePct)) / 100;
  const okeyPrototypeNextTurnSeat = useMemo(() => {
    const seats = okeyPrototypeActiveTurnSeats;
    if (seats.length === 0) return okeyPrototypeTurnSeat as OkeyPrototypeSeatNo;
    const currentIndex = seats.findIndex((seatNo) => seatNo === okeyPrototypeTurnSeat);
    if (currentIndex < 0) return seats[0];
    return seats[(currentIndex + 1) % seats.length] ?? seats[0];
  }, [okeyPrototypeActiveTurnSeats, okeyPrototypeTurnSeat]);
  const okeyPrototypeIsBotTurn = okeyPrototypeBotModeEnabled
    && Boolean(okeyPrototypeSeatReservation && okeyPrototypeJoinedTable)
    && !okeyPrototypeHandCompleted
    && okeyPrototypeTurnSeat !== okeyPrototypeLocalSeatNo
    && okeyPrototypeActiveTurnSeats.includes(okeyPrototypeTurnSeat as OkeyPrototypeSeatNo);
  const okeyPrototypeTurnQueue = useMemo(() => {
    const seats = okeyPrototypeActiveTurnSeats.length > 0
      ? okeyPrototypeActiveTurnSeats
      : [okeyPrototypeTurnSeat as OkeyPrototypeSeatNo];
    const currentIndex = seats.findIndex((seatNo) => seatNo === okeyPrototypeTurnSeat);
    const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
    return seats.map((_, index) => {
      const seatNo = seats[(safeCurrentIndex + index) % seats.length] ?? seats[0];
      return {
        seatNo,
        role: okeyPrototypeSeatRoleLabels[seatNo] ?? "Bos",
        name: okeyPrototypeSeatDisplayNames[seatNo] ?? `K${seatNo}`,
        current: index === 0,
        next: index === 1,
      };
    });
  }, [
    okeyPrototypeActiveTurnSeats,
    okeyPrototypeSeatDisplayNames,
    okeyPrototypeSeatRoleLabels,
    okeyPrototypeTurnSeat,
  ]);
  const okeyPrototypeCanDrawTile = okeyPrototypeCanAdvanceTurn
    && okeyPrototypeTurnPhase === "draw"
    && okeyPrototypeSeatRackTiles.length === OKEY_PROTOTYPE_HAND_TILE_COUNT
    && okeyPrototypeDrawPileRemaining > 0;
  const okeyPrototypeCanDrawFromDiscard = okeyPrototypeCanAdvanceTurn
    && okeyPrototypeTurnPhase === "draw"
    && okeyPrototypeSeatRackTiles.length === OKEY_PROTOTYPE_HAND_TILE_COUNT
    && okeyPrototypeDiscardPile.length > 0
    && okeyPrototypeCanTakeDiscardWhenClosed;
  const okeyPrototypeCanSelectRackTiles = okeyPrototypeCanAdvanceTurn
    && okeyPrototypeTurnPhase === "discard"
    && okeyPrototypeSeatRackTiles.length > 0;
  const okeyPrototypeCanDiscardTile = okeyPrototypeCanAdvanceTurn
    && okeyPrototypeTurnPhase === "discard"
    && okeyPrototypeSeatRackTiles.length > 0
    && !okeyPrototypeDiscardBlockedByOpening
    && !okeyPrototypePendingDiscardTileId;
  // smoke-compat:
  // const okeyPrototypeCanDrawFromDiscard = okeyPrototypeCanAdvanceTurn
  // && okeyPrototypeDiscardPile.length > 0;
  // const okeyPrototypeCanDiscardTile = okeyPrototypeCanAdvanceTurn
  // && !okeyPrototypeDiscardBlockedByOpening;
  const okeyPrototypeAttachValidation = useMemo(() => {
    if (okeyPrototypeHandCompleted) {
      return { valid: false, reason: "El tamamlandi. Yeni el baslatmalisin." };
    }
    if (!okeyPrototypeCanAdvanceTurn) {
      return { valid: false, reason: "Per eklemek icin once bir masaya oturmalisin." };
    }
    if (okeyPrototypeTurnPhase !== "discard") {
      return { valid: false, reason: "Per eklemek icin once tas cekmelisin." };
    }
    if (!okeyPrototypeCurrentSeatOpened) {
      return { valid: false, reason: "Per eklemek icin once elini acmalisin." };
    }
    if (!okeyPrototypeAttachTargetMeld) {
      return { valid: false, reason: "Per eklemek icin acik bir per sec." };
    }
    if (!okeyPrototypeDiscardDraftTile) {
      return { valid: false, reason: "Per eklemek icin raftan bir tas sec." };
    }
    return canAttachOkeyPrototypeTileToMeld(okeyPrototypeDiscardDraftTile, okeyPrototypeAttachTargetMeld, okeyPrototypeOkeyTile);
  }, [
    okeyPrototypeAttachTargetMeld,
    okeyPrototypeCanAdvanceTurn,
    okeyPrototypeCurrentSeatOpened,
    okeyPrototypeDiscardDraftTile,
    okeyPrototypeHandCompleted,
    okeyPrototypeOkeyTile,
    okeyPrototypeTurnPhase,
  ]);
  const okeyPrototypeBoardHintText = useMemo(() => {
    if (!okeyPrototypeSeatReservation || !okeyPrototypeJoinedTable) {
      return "Masa secip koltuk alarak tahta testine baslayabilirsin.";
    }
    if (okeyPrototypeHandCompleted) {
      return okeyPrototypeHandDrawn
        ? "El berabere bitti. Yeni El Baslat ile yeni dagitima gecebilirsin."
        : `El tamamlandi. Koltuk ${okeyPrototypeWinnerSeat} kazandi.`;
    }
    if (okeyPrototypeTurnPhase === "draw") {
      if (!okeyPrototypeCurrentSeatOpened && !okeyPrototypeCanTakeDiscardWhenClosed && okeyPrototypeDiscardPile.length > 0) {
        return "Ortadan tas almak icin bu tasla ayni turde el acabilmelisin (101 veya 5 cift).";
      }
      if (okeyPrototypeCanDrawTile && okeyPrototypeCanDrawFromDiscard) {
        return "Bu turde once Kapali Deste'den cekebilir veya Ortadan Al ile devam edebilirsin.";
      }
      if (okeyPrototypeCanDrawTile) {
        return "Bu turde Kapali Deste'den tas cekerek devam et.";
      }
      if (okeyPrototypeCanDrawFromDiscard) {
        return "Bu turde sadece Ortadan Al secenegi uygun.";
      }
      return "Cekilecek tas kalmadiysa el berabere tamamlanir.";
    }
    if (okeyPrototypeDiscardBlockedByOpening) {
      return `Tas atmadan once ${okeyPrototypeOpeningRemainingPoints} puanlik acilis peri acmalisin.`;
    }
    if (okeyPrototypePendingDiscardTile) {
      return `Ortadan aldigin ${formatOkeyPrototypeTile(okeyPrototypePendingDiscardTile)} tasini hemen islemelisin.`;
    }
    if (okeyPrototypeDiscardDraftTile) {
      return `Secili atis: ${formatOkeyPrototypeTile(okeyPrototypeDiscardDraftTile)}. Tas atabilir, per acabilir veya pere ekleyebilirsin.`;
    }
    return "Tas atabilmek icin raftan bir tas sec.";
  }, [
    okeyPrototypeCanDrawFromDiscard,
    okeyPrototypeCanTakeDiscardWhenClosed,
    okeyPrototypeCanDrawTile,
    okeyPrototypeDiscardBlockedByOpening,
    okeyPrototypeDiscardPile.length,
    okeyPrototypeDiscardDraftTile,
    okeyPrototypeHandCompleted,
    okeyPrototypeHandDrawn,
    okeyPrototypeCurrentSeatOpened,
    okeyPrototypeJoinedTable,
    okeyPrototypeOpeningRemainingPoints,
    okeyPrototypePendingDiscardTile,
    okeyPrototypeSeatReservation,
    okeyPrototypeTurnPhase,
    okeyPrototypeWinnerSeat,
  ]);
  const [roomChatAutoScroll, setRoomChatAutoScroll] = useState(true);
  const [roomChatUnread, setRoomChatUnread] = useState(0);
  const [adminQuery, setAdminQuery] = useState("");
  const [adminRoleFilter, setAdminRoleFilter] = useState<AdminRoleFilter>("all");
  const [adminSort, setAdminSort] = useState<AdminSortKey>("points");
  const [adminPointDrafts, setAdminPointDrafts] = useState<Record<string, string>>({});
  const [adminDeltaDrafts, setAdminDeltaDrafts] = useState<Record<string, string>>({});
  const [designPublished, setDesignPublished] = useState<DesignConfig>(() => createDefaultDesignConfig());
  const [designDraft, setDesignDraft] = useState<DesignConfig>(() => createDefaultDesignConfig());
  const [adminDesignHistory, setAdminDesignHistory] = useState<DesignConfig[]>([]);
  const [adminDesignBusy, setAdminDesignBusy] = useState(false);
  const [adminDesignError, setAdminDesignError] = useState("");
  const [adminDesignNotice, setAdminDesignNotice] = useState("");
  const [adminDesignPreview, setAdminDesignPreview] = useState(true);
  const [adminDesignRollbackVersion, setAdminDesignRollbackVersion] = useState(0);
  const [adminDesignDraggingAction, setAdminDesignDraggingAction] = useState<"openTable" | "quickPlay" | null>(null);
  const [adminDesignDraggingTopButton, setAdminDesignDraggingTopButton] = useState<"home" | "roomSelect" | "botMode" | null>(null);
  const [adminDesignDraggingRoomOwnerButton, setAdminDesignDraggingRoomOwnerButton] = useState<"invite" | "private" | "spectator" | "copyLink" | null>(null);
  const [syncHealthNow, setSyncHealthNow] = useState(() => Date.now());
  const [realtimeSocketReadyState, setRealtimeSocketReadyState] = useState<number>(
    typeof WebSocket === "undefined" ? 3 : WebSocket.CLOSED,
  );
  const [diagnosticsEnabled] = useState(() => readDiagnosticsEnabled());
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
    wsOpenCount: 0,
    wsCloseCount: 0,
    wsErrorCount: 0,
    lastWsMessageAt: 0,
    lastWsSendAt: 0,
    lastWsSendReason: "",
    httpPushCount: 0,
    httpPullCount: 0,
    lastError: "",
  });
  const [flowEvents, setFlowEvents] = useState<FlowEvent[]>([]);

  const lobbyChannelRef = useRef<BroadcastChannel | null>(null);
  const realtimeSocketRef = useRef<WebSocket | null>(null);
  const realtimeReconnectTimerRef = useRef<number | null>(null);
  const realtimeWsPreopenFailCountRef = useRef(0);
  const realtimeWsDisabledUntilRef = useRef(0);
  const realtimeSenderCountersRef = useRef<Map<string, number>>(new Map());
  const realtimeSyncCounterRef = useRef(0);
  const realtimeRemoteStateRef = useRef<LobbyState | null>(null);
  const realtimeReceivedSnapshotRef = useRef(false);
  const realtimePendingSnapshotRef = useRef<LobbyState | null>(null);
  const realtimeHttpSyncInFlightRef = useRef(false);
  const realtimeHttpPullInFlightRef = useRef(false);
  const realtimeLastPullAtRef = useRef(0);
  const realtimeLastPushAtRef = useRef(0);
  const realtimeHttpNextAllowedAtRef = useRef(0);
  const realtimeHttpFailCountRef = useRef(0);
  const realtimeHttpDisabledUntilRef = useRef(0);
  const roomPickerRefreshInFlightRef = useRef(false);
  const roomPickerRemoteNextAllowedAtRef = useRef(0);
  const roomPickerRemoteFailCountRef = useRef(0);
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
  const leaveIncomingIgnoredKeyRef = useRef("");
  const leaveIncomingActiveKeyRef = useRef("");
  const leaveRejectNoticeSeenKeyRef = useRef("");
  const leaveConfirmResolverRef = useRef<((approved: boolean) => void) | null>(null);
  const roomMissingSinceRef = useRef<number | null>(null);
  const flowEventSeqRef = useRef(0);
  const flowEventLastSeenRef = useRef<Map<string, number>>(new Map());
  const previousLobbyIdRef = useRef<string>("");
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

  const activeLobbyId = useMemo(() => {
    const safeSelected = sanitizeLobbyId(selectedLobbyId);
    if (safeSelected && lobbyRooms.some((room) => room.id === safeSelected)) return safeSelected;
    return lobbyRooms[0]?.id || DEFAULT_LOBBY_ID;
  }, [selectedLobbyId, lobbyRooms]);

  const activeLobbyRoom = useMemo(() => {
    return lobbyRooms.find((room) => room.id === activeLobbyId) ?? {
      id: activeLobbyId,
      name: DEFAULT_LOBBY_NAME,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdByUserId: null,
    };
  }, [lobbyRooms, activeLobbyId]);

  const activeLobbyName = sanitizeLobbyName(activeLobbyRoom.name || DEFAULT_LOBBY_NAME);
  const activeLobbyStorageKey = useMemo(() => makeLobbyStateStorageKey(activeLobbyId), [activeLobbyId]);
  const activeLobbySyncChannel = useMemo(() => makeLobbySyncChannel(activeLobbyId), [activeLobbyId]);
  const activeRealtimeLobbyChannel = useMemo(() => makeRealtimeLobbyChannel(activeLobbyId), [activeLobbyId]);
  const showGamePicker = viewMode === "lobby" && !isAdminWindow && gamePickerOpen;
  const showRoomPicker = viewMode === "lobby" && !isAdminWindow && !showGamePicker && roomPickerOpen && !roomSession;
  const activeLobbyStorageKeyRef = useRef(activeLobbyStorageKey);
  const activeRealtimeLobbyChannelRef = useRef(activeRealtimeLobbyChannel);
  const activeLobbyNameRef = useRef(activeLobbyName);

  useEffect(() => {
    activeLobbyStorageKeyRef.current = activeLobbyStorageKey;
    activeRealtimeLobbyChannelRef.current = activeRealtimeLobbyChannel;
    activeLobbyNameRef.current = activeLobbyName;
  }, [activeLobbyStorageKey, activeRealtimeLobbyChannel, activeLobbyName]);

  useEffect(() => {
    if (okeyPrototypeFilteredRooms.some((room) => room.id === okeyPrototypeSelectedRoomId)) return;
    const fallbackId = okeyPrototypeFilteredRooms[0]?.id ?? OKEY_PROTOTYPE_ROOMS[0]?.id ?? "";
    if (!fallbackId || fallbackId === okeyPrototypeSelectedRoomId) return;
    setOkeyPrototypeSelectedRoomId(fallbackId);
  }, [okeyPrototypeFilteredRooms, okeyPrototypeSelectedRoomId]);

  useEffect(() => {
    setOkeyPrototypeTableSearch("");
  }, [okeyPrototypeSelectedRoom?.id]);

  useEffect(() => {
    if (okeyPrototypeVisibleTableSketchRows.some((row) => row.id === okeyPrototypeSelectedTableId)) return;
    const fallbackId = okeyPrototypeVisibleTableSketchRows[0]?.id ?? "";
    if (!fallbackId || fallbackId === okeyPrototypeSelectedTableId) return;
    setOkeyPrototypeSelectedTableId(fallbackId);
  }, [okeyPrototypeVisibleTableSketchRows, okeyPrototypeSelectedTableId]);

  useEffect(() => {
    if (okeyPrototypeAvailableSeatNos.length === 0) {
      if (okeyPrototypeSeatDraft !== 1) setOkeyPrototypeSeatDraft(1);
      return;
    }
    if (okeyPrototypeAvailableSeatNos.includes(okeyPrototypeSeatDraft)) return;
    setOkeyPrototypeSeatDraft(okeyPrototypeAvailableSeatNos[0]);
  }, [okeyPrototypeAvailableSeatNos, okeyPrototypeSeatDraft]);

  useEffect(() => {
    if (!okeyPrototypeSeatReservation) return;
    const exists = okeyPrototypeTableSketchRows.some((row) => row.id === okeyPrototypeSeatReservation.tableId);
    if (exists) return;
    resetOkeyPrototypeSeatSessionState();
  }, [okeyPrototypeSeatReservation, okeyPrototypeTableSketchRows]);

  useEffect(() => {
    if (!okeyPrototypeDiscardDraftTileId) return;
    const exists = okeyPrototypeSeatRackTiles.some((tile) => tile.id === okeyPrototypeDiscardDraftTileId);
    if (exists) return;
    setOkeyPrototypeDiscardDraftTileId("");
  }, [okeyPrototypeDiscardDraftTileId, okeyPrototypeSeatRackTiles]);

  useEffect(() => {
    if (okeyPrototypeMeldDraftTileIds.length === 0) return;
    const rackTileIds = new Set(okeyPrototypeSeatRackTiles.map((tile) => tile.id));
    const filtered = okeyPrototypeMeldDraftTileIds.filter((tileId) => rackTileIds.has(tileId));
    if (filtered.length === okeyPrototypeMeldDraftTileIds.length) return;
    setOkeyPrototypeMeldDraftTileIds(filtered);
  }, [okeyPrototypeMeldDraftTileIds, okeyPrototypeSeatRackTiles]);

  useEffect(() => {
    if (!okeyPrototypeAttachTargetMeldId) return;
    const exists = okeyPrototypeOpenedMelds.some((meld) => meld.id === okeyPrototypeAttachTargetMeldId);
    if (exists) return;
    setOkeyPrototypeAttachTargetMeldId("");
  }, [okeyPrototypeAttachTargetMeldId, okeyPrototypeOpenedMelds]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const normalized = normalizeOkeyPrototypeTileScalePct(okeyPrototypeTileScalePct);
    if (normalized !== okeyPrototypeTileScalePct) {
      setOkeyPrototypeTileScalePct(normalized);
      return;
    }
    safeStorageSetItem(window.sessionStorage, OKEY_PROTOTYPE_TILE_SCALE_SESSION_KEY, String(normalized));
  }, [okeyPrototypeTileScalePct]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const normalized = normalizeOkeyPrototypeAutoSortMode(okeyPrototypeAutoSortMode);
    if (normalized !== okeyPrototypeAutoSortMode) {
      setOkeyPrototypeAutoSortMode(normalized);
      return;
    }
    safeStorageSetItem(window.sessionStorage, OKEY_PROTOTYPE_AUTO_SORT_SESSION_KEY, normalized);
  }, [okeyPrototypeAutoSortMode]);

  useEffect(() => {
    if (okeyPrototypeAutoSortMode === "off") return;
    if (!okeyPrototypeSeatReservation) return;
    setOkeyPrototypeRackState((current) => {
      let changed = false;
      const next: OkeyPrototypeRackState = { ...current };
      OKEY_PROTOTYPE_SEATS.forEach((seatNo) => {
        const rack = current[seatNo] ?? [];
        if (rack.length < 2) {
          next[seatNo] = rack;
          return;
        }
        const sortedRack = sortOkeyPrototypeRackTiles(rack, okeyPrototypeAutoSortMode, okeyPrototypeOkeyTile);
        const orderChanged = sortedRack.some((tile, index) => tile.id !== rack[index]?.id);
        if (!orderChanged) {
          next[seatNo] = rack;
          return;
        }
        changed = true;
        next[seatNo] = sortedRack;
      });
      return changed ? next : current;
    });
  }, [okeyPrototypeAutoSortMode, okeyPrototypeOkeyTile, okeyPrototypeSeatReservation]);

  useEffect(() => {
    if (!okeyPrototypeBotModeEnabled) return;
    if (!okeyPrototypeSeatReservation || !okeyPrototypeJoinedTable) return;
    if (okeyPrototypeHandCompleted) return;
    const turnSeat = okeyPrototypeTurnSeat as OkeyPrototypeSeatNo;
    if (turnSeat === okeyPrototypeLocalSeatNo) return;
    if (!okeyPrototypeActiveTurnSeats.includes(turnSeat)) return;
    const botDelayByDifficulty: Record<OkeyPrototypeBotDifficulty, { draw: number; discard: number }> = {
      easy: { draw: 860, discard: 980 },
      normal: { draw: 650, discard: 800 },
      hard: { draw: 540, discard: 670 },
    };
    const delayConfig = botDelayByDifficulty[okeyPrototypeBotDifficulty] ?? botDelayByDifficulty.normal;
    const delay = okeyPrototypeTurnPhase === "draw" ? delayConfig.draw : delayConfig.discard;
    const timer = window.setTimeout(() => {
      if (okeyPrototypeHandCompleted) return;
      const botRack = okeyPrototypeRackState[turnSeat] ?? [];
      if (okeyPrototypeTurnPhase === "draw") {
        const topDiscardTile = okeyPrototypeDiscardPile[0]?.tile ?? null;
        const prefersDiscard = shouldOkeyPrototypeBotDrawFromDiscard(
          topDiscardTile,
          botRack,
          okeyPrototypeOkeyTile,
          okeyPrototypeBotDifficulty,
        );
        if (okeyPrototypeCanDrawFromDiscard && (!okeyPrototypeCanDrawTile || prefersDiscard)) {
          drawOkeyPrototypeTileFromDiscard();
          return;
        }
        if (okeyPrototypeCanDrawTile) {
          drawOkeyPrototypeTile();
          return;
        }
        if (okeyPrototypeCanDrawFromDiscard) {
          drawOkeyPrototypeTileFromDiscard();
        }
        return;
      }
      if (okeyPrototypeDiscardBlockedByOpening) {
        const botPairCount = countOkeyPrototypeIdenticalPairs(botRack, okeyPrototypeOkeyTile);
        if (botPairCount >= OKEY_PROTOTYPE_PAIR_OPEN_MIN_PAIRS) {
          setOkeyPrototypeSeatOpenedState((current) => ({
            ...current,
            [turnSeat]: true,
          }));
          setOkeyPrototypeTurnOpeningPoints(OKEY_PROTOTYPE_OPENING_TARGET_POINTS);
          appendOkeyPrototypeAction(`Bot K${turnSeat} ${botPairCount} cift ile el acti.`);
          return;
        }
        if (okeyPrototypeTurnOpeningPoints >= OKEY_PROTOTYPE_OPENING_TARGET_POINTS) {
          setOkeyPrototypeSeatOpenedState((current) => ({
            ...current,
            [turnSeat]: true,
          }));
          appendOkeyPrototypeAction(`Bot K${turnSeat} 101 acilis barajini gecti.`);
          return;
        }
        appendOkeyPrototypeAction(`Bot K${turnSeat} acilis icin uygun per bekliyor.`);
        return;
      }
      const forcedDiscardTileId = pickOkeyPrototypeBotDiscardTileId(
        botRack,
        okeyPrototypeOkeyTile,
        okeyPrototypeBotDifficulty,
      );
      discardOkeyPrototypeTileWithForced(forcedDiscardTileId ?? undefined);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [
    okeyPrototypeActiveTurnSeats,
    okeyPrototypeBotDifficulty,
    okeyPrototypeBotModeEnabled,
    okeyPrototypeCanDrawFromDiscard,
    okeyPrototypeCanDrawTile,
    okeyPrototypeDiscardPile,
    okeyPrototypeDiscardBlockedByOpening,
    okeyPrototypeHandCompleted,
    okeyPrototypeJoinedTable,
    okeyPrototypeLocalSeatNo,
    okeyPrototypeOkeyTile,
    okeyPrototypeRackState,
    okeyPrototypeSeatReservation,
    okeyPrototypeTurnPhase,
    okeyPrototypeTurnSeat,
  ]);

  useEffect(() => {
    if (okeyPrototypeHandCompleted) return;
    if (!okeyPrototypeCanAdvanceTurn) return;
    if (okeyPrototypeTurnPhase !== "draw") return;
    if (okeyPrototypeDrawPileRemaining > 0 || okeyPrototypeDiscardPile.length > 0) return;
    setOkeyPrototypeHandDrawn(true);
    setOkeyPrototypeDrawHandCount((current) => current + 1);
    setOkeyPrototypeLastHandSummary(`El ${okeyPrototypeSessionHandNo}: Berabere bitti.`);
    appendOkeyPrototypeAction("El berabere bitti: Ortada ve kapali destede tas kalmadi.");
  }, [
    okeyPrototypeCanAdvanceTurn,
    okeyPrototypeDiscardPile.length,
    okeyPrototypeDrawPileRemaining,
    okeyPrototypeHandCompleted,
    okeyPrototypeSessionHandNo,
    okeyPrototypeTurnPhase,
  ]);

  useEffect(() => {
    const currentLobbyId = sanitizeLobbyId(activeLobbyId);
    const previousLobbyId = sanitizeLobbyId(previousLobbyIdRef.current);
    if (previousLobbyId && currentLobbyId && previousLobbyId !== currentLobbyId) {
      void clearSessionPresenceFromLobby(previousLobbyId, appSessionId, "lobby-change-presence-cleanup");
    }
    previousLobbyIdRef.current = currentLobbyId || "";
  }, [activeLobbyId, appSessionId]);

  useEffect(() => {
    setRoomSession((current) => {
      if (!current) return current;
      if (current.sessionId === appSessionId) return current;
      return {
        ...current,
        sessionId: appSessionId,
      };
    });
  }, [appSessionId]);

  useEffect(() => {
    realtimeSenderCountersRef.current = new Map();
  }, [activeRealtimeLobbyChannel]);

  function openLeaveConfirmModal(title: string, message: string) {
    if (leaveConfirmResolverRef.current) {
      leaveConfirmResolverRef.current(false);
      leaveConfirmResolverRef.current = null;
    }
    setLeaveConfirmModal({
      open: true,
      title,
      message,
    });
    return new Promise<boolean>((resolve) => {
      leaveConfirmResolverRef.current = resolve;
    });
  }

  function closeLeaveConfirmModal(approved: boolean) {
    setLeaveConfirmModal((prev) => (prev.open ? { ...prev, open: false } : prev));
    const resolver = leaveConfirmResolverRef.current;
    leaveConfirmResolverRef.current = null;
    if (resolver) resolver(approved);
  }

  useEffect(() => () => {
    const resolver = leaveConfirmResolverRef.current;
    leaveConfirmResolverRef.current = null;
    if (resolver) resolver(false);
  }, []);

  function appendFlowEvent(
    kind: string,
    detail: string,
    payload?: {
      lobbyId?: string;
      tableId?: number;
      roomCode?: string;
      seat?: Seat | null;
      dedupeKey?: string;
      dedupeMs?: number;
    },
  ) {
    const now = Date.now();
    const dedupeKey = payload?.dedupeKey ? `${kind}:${payload.dedupeKey}` : "";
    const dedupeMs = Number.isFinite(payload?.dedupeMs) ? Math.max(0, Math.trunc(Number(payload?.dedupeMs))) : FLOW_EVENT_DEDUPE_DEFAULT_MS;
    if (dedupeKey && dedupeMs > 0) {
      const previousAt = flowEventLastSeenRef.current.get(dedupeKey) ?? 0;
      if (previousAt > 0 && now - previousAt < dedupeMs) {
        return;
      }
      flowEventLastSeenRef.current.set(dedupeKey, now);
    }
    flowEventSeqRef.current += 1;
    const entry: FlowEvent = {
      id: `${now.toString(36)}-${flowEventSeqRef.current.toString(36)}`,
      at: now,
      kind: sanitizeChatId(kind).slice(0, 48) || "flow",
      detail: sanitizeChatText(detail).slice(0, 180) || "-",
      lobbyId: sanitizeLobbyId(payload?.lobbyId ?? activeLobbyId) || activeLobbyId,
      tableId: Number.isFinite(payload?.tableId) ? Math.max(0, Math.trunc(Number(payload?.tableId))) : 0,
      roomCode: sanitizeRoomCode(payload?.roomCode ?? ""),
      seat: payload?.seat === "white" || payload?.seat === "black" ? payload.seat : null,
    };
    setFlowEvents((previous) => {
      const next = [...previous, entry];
      return next.length > FLOW_EVENT_LOG_LIMIT ? next.slice(next.length - FLOW_EVENT_LOG_LIMIT) : next;
    });
    if (ENABLE_FLOW_DEBUG_LOGS) {
      console.debug("[FLOW]", entry.kind, entry.detail, {
        lobbyId: entry.lobbyId,
        tableId: entry.tableId,
        roomCode: entry.roomCode,
        seat: entry.seat,
      });
    }
  }

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

  const scopedLobbyTables = useMemo(
    () => filterTablesByLobbyScope(lobbyState.tables, lobbyState.presence, activeLobbyId),
    [lobbyState.tables, lobbyState.presence, activeLobbyId],
  );

  const openedTables = useMemo(() => {
    return scopedLobbyTables.filter((table) => Boolean(table.white || table.black));
  }, [scopedLobbyTables]);

  const roomPickerRows = useMemo(() => {
    return lobbyRooms.map((room) => {
      const roomName = sanitizeLobbyName(room.name);
      const roomId = sanitizeLobbyId(room.id) || DEFAULT_LOBBY_ID;
      const cached = roomPickerLiveCounts[roomId];
      const fallback = summarizeLobbyCounts(loadLobbyState(makeLobbyStateStorageKey(room.id), roomName), roomId);
      const activeTables = cached?.activeTables ?? fallback.activeTables;
      const seatedPlayers = cached?.seatedPlayers ?? fallback.seatedPlayers;
      return {
        id: room.id,
        name: roomName,
        activeTables,
        seatedPlayers,
      };
    });
  }, [lobbyRooms, roomPickerLiveCounts]);

  useEffect(() => {
    const safeActiveLobbyId = sanitizeLobbyId(activeLobbyId) || DEFAULT_LOBBY_ID;
    const counts = summarizeLobbyCounts(lobbyState, safeActiveLobbyId);
    setRoomPickerLiveCounts((prev) => {
      const current = prev[safeActiveLobbyId];
      if (
        current
        && current.activeTables === counts.activeTables
        && current.seatedPlayers === counts.seatedPlayers
      ) {
        return prev;
      }
      return {
        ...prev,
        [safeActiveLobbyId]: counts,
      };
    });
  }, [activeLobbyId, lobbyState.tables, lobbyState.presence]);

  useEffect(() => {
    if (!roomPickerOpen || lobbyRooms.length === 0) return;
    let cancelled = false;

    const refreshAllRoomCounts = async () => {
      if (roomPickerRefreshInFlightRef.current) return;
      roomPickerRefreshInFlightRef.current = true;
      const now = Date.now();
      const allowRemote = now >= roomPickerRemoteNextAllowedAtRef.current;
      let remoteError = false;
      const next: Record<string, LobbyRoomCounts> = {};
      const safeActiveLobbyId = sanitizeLobbyId(activeLobbyId) || DEFAULT_LOBBY_ID;

      try {
        for (const room of lobbyRooms) {
          const roomId = sanitizeLobbyId(room.id);
          if (!roomId) continue;

          const roomName = sanitizeLobbyName(room.name);
          let summary = summarizeLobbyCounts(loadLobbyState(makeLobbyStateStorageKey(roomId), roomName), roomId);

          if (allowRemote && roomId !== safeActiveLobbyId) {
            try {
              const channel = makeRealtimeLobbyChannel(roomId);
              const controller = new AbortController();
              const timeoutId = window.setTimeout(() => controller.abort(), ROOM_PICKER_REMOTE_FETCH_TIMEOUT_MS);
              let response: Response;
              try {
                response = await fetch(buildRealtimeHttpSyncUrl(channel, `${appSessionId}-rooms`), {
                  method: "GET",
                  headers: { "cache-control": "no-store" },
                  signal: controller.signal,
                });
              } finally {
                window.clearTimeout(timeoutId);
              }
              if (!response.ok) {
                remoteError = true;
              } else {
                const data = (await response.json().catch(() => null)) as { snapshot?: unknown } | null;
                const incoming = normalizeRealtimeMessage(data?.snapshot);
                if (incoming && incoming.kind === "snapshot" && incoming.channel === channel) {
                  summary = summarizeLobbyCounts(normalizeLobbyState(incoming.payload), roomId);
                }
              }
            } catch {
              remoteError = true;
            }
          }

          next[roomId] = summary;
        }

        if (allowRemote) {
          if (remoteError) {
            const nextFail = Math.min(roomPickerRemoteFailCountRef.current + 1, 5);
            roomPickerRemoteFailCountRef.current = nextFail;
            const waitMs = Math.min(
              ROOM_PICKER_REMOTE_ERROR_BACKOFF_MAX_MS,
              ROOM_PICKER_REMOTE_ERROR_BACKOFF_MIN_MS * (2 ** Math.max(0, nextFail - 1)),
            );
            roomPickerRemoteNextAllowedAtRef.current = now + waitMs;
          } else {
            roomPickerRemoteFailCountRef.current = 0;
            roomPickerRemoteNextAllowedAtRef.current = now + ROOM_PICKER_REMOTE_REFRESH_MIN_MS;
          }
        }

        if (cancelled) return;
        setRoomPickerLiveCounts((prev) => {
          const merged: Record<string, LobbyRoomCounts> = { ...prev };
          const validIds = new Set(lobbyRooms.map((room) => sanitizeLobbyId(room.id)).filter(Boolean) as string[]);
          let changed = false;

          Object.keys(merged).forEach((roomId) => {
            if (!validIds.has(roomId)) {
              delete merged[roomId];
              changed = true;
            }
          });

          Object.entries(next).forEach(([roomId, summary]) => {
            const current = merged[roomId];
            if (
              !current
              || current.activeTables !== summary.activeTables
              || current.seatedPlayers !== summary.seatedPlayers
            ) {
              merged[roomId] = summary;
              changed = true;
            }
          });

          return changed ? merged : prev;
        });
      } finally {
        roomPickerRefreshInFlightRef.current = false;
      }
    };

    void refreshAllRoomCounts();
    const timer = window.setInterval(() => {
      void refreshAllRoomCounts();
    }, ROOM_PICKER_REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [roomPickerOpen, lobbyRooms, activeLobbyId, appSessionId]);

  const myCurrentSeat = useMemo(() => findSessionSeat(scopedLobbyTables, appSessionId), [scopedLobbyTables, appSessionId]);

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
      const key = sanitizeGuestId(row.userId) || `session:${row.sessionId}`;
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
        upsertPresence(presenceFromSeat(seatInfo, activeLobbyId));
      });
    });

    upsertPresence({
      sessionId: appSessionId,
      userId: currentProfile.userId,
      username: currentProfile.username,
      displayName: currentProfile.displayName,
      gender: currentProfile.gender,
      avatarId: currentProfile.avatarId,
      points: currentProfile.points,
      stats: normalizeStats(currentProfile.stats),
      touchedAt: Date.now(),
      lobbyId: activeLobbyId,
    });

    return Array.from(map.values())
      .filter((row) => {
        const seatedInActiveLobby = tableByUser.has(row.userId) || tableBySession.has(row.sessionId);
        if (seatedInActiveLobby) return true;
        const presenceLobbyId = sanitizeLobbyId(row.lobbyId ?? "");
        if (!presenceLobbyId) return row.sessionId === appSessionId;
        return presenceLobbyId === activeLobbyId;
      })
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
  }, [openedTables, lobbyState.presence, appSessionId, activeLobbyId, safeGuestName, currentProfile.userId, currentProfile.username, currentProfile.gender, currentProfile.avatarId, currentProfile.points, currentProfile.stats]);

  const currentRoomTable = useMemo(() => {
    if (!roomSession) return null;
    return scopedLobbyTables.find((table) => table.id === roomSession.tableNo || table.roomCode === roomSession.code) ?? null;
  }, [scopedLobbyTables, roomSession]);

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

  const canEditCurrentRoomSetCount = useMemo(() => {
    if (!roomSession || roomSession.role !== "player") return false;
    if (!currentRoomTable || !currentRoomIsOwner) return false;
    if (matchLiveState.matchActive) return false;
    return !currentRoomTable.startedAt && currentRoomTable.setPlayed === 0;
  }, [roomSession, currentRoomTable, currentRoomIsOwner, matchLiveState.matchActive]);

  const currentRoomHasOpenSeat = useMemo(() => Boolean(currentRoomTable && getOpenSeat(currentRoomTable)), [currentRoomTable]);

  const lobbyChatRows = useMemo(() => {
    return normalizeChatLog(lobbyState.lobbyChat, LOBBY_CHAT_LIMIT).filter((row) => row.at >= lobbyChatJoinedAt);
  }, [lobbyState.lobbyChat, lobbyChatJoinedAt]);

  const tableChatRows = useMemo(() => {
    if (!currentRoomTable) return [];
    const key = tableChatKey(currentRoomTable);
    const rows = normalizeChatLog(lobbyState.tableChats[key] ?? [], TABLE_CHAT_LIMIT);
    if (!roomSession) return rows;
    return rows.filter((row) => row.at >= roomSession.joinedAt);
  }, [currentRoomTable, lobbyState.tableChats, roomSession]);

  const canViewTableChat = useMemo(() => {
    if (!roomSession || !currentRoomTable) return false;
    if (roomSession.role === "spectator") return true;
    const mySeat = roomSession.seat === "white" ? currentRoomTable.white : currentRoomTable.black;
    return Boolean(mySeat && mySeat.sessionId === appSessionId);
  }, [roomSession, currentRoomTable, appSessionId]);

  const canWriteLobbyChat = Boolean(member && !member.isBlocked && member.permissions.lobbyChat);
  const canWriteTableChat = useMemo(() => {
    if (!roomSession || !canViewTableChat || mode !== "local") return false;
    if (roomSession.role === "spectator") {
      const memberAllowed = member ? !member.isBlocked && member.permissions.spectatorChat : true;
      return currentRoomTable?.allowSpectatorChat !== false && memberAllowed;
    }
    return Boolean(member && !member.isBlocked && member.permissions.tableChat);
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
    if (roomStartState.started) return "Oyun başladı.";
    if (!roomStartState.bothSeated) return "İkinci oyuncu bekleniyor.";
    if (roomStartState.mineReady && roomStartState.opponentReady) return "İki oyuncu da hazır. Oyunu başlatabilirsin.";
    if (roomStartState.mineReady) return "Rakibin Oyuna Başla butonuna basması bekleniyor.";
    if (roomStartState.opponentReady) return "Rakip hazır. Oyuna Başla butonuna bas.";
    return "Oyuncuların 'Başlat' düğmesine basmaları bekleniyor...";
  }, [roomStartState]);
  const roomWhiteSeat = currentRoomTable?.white ?? null;
  const roomBlackSeat = currentRoomTable?.black ?? null;
  const isAdmin = canAccessOkeyPrototype;
  const lobbyDraft = sanitizeChatText(lobbyChatInput);
  const selectedAdminUser = useMemo(
    () => adminUsers.find((row) => row.id === adminSelectedUserId) ?? null,
    [adminUsers, adminSelectedUserId],
  );
  const selectedAdminLobby = useMemo(
    () => lobbyRooms.find((row) => row.id === adminSelectedLobbyId) ?? null,
    [lobbyRooms, adminSelectedLobbyId],
  );
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
  const activeDesign = useMemo(() => {
    if (isAdminWindow && member?.role === "admin" && adminDesignPreview) {
      return normalizeDesignConfig(designDraft, designPublished);
    }
    return normalizeDesignConfig(designPublished, createDefaultDesignConfig());
  }, [isAdminWindow, member?.role, adminDesignPreview, designDraft, designPublished]);
  const designPreviewTarget = useMemo(
    () => (adminDesignPreview ? normalizeDesignConfig(designDraft, designPublished) : normalizeDesignConfig(designPublished, createDefaultDesignConfig())),
    [adminDesignPreview, designDraft, designPublished],
  );
  const designCssVars = useMemo<CSSProperties>(() => makeDesignCssVars(activeDesign), [activeDesign]);
  const designPreviewCssVars = useMemo<CSSProperties>(() => makeDesignCssVars(designPreviewTarget), [designPreviewTarget]);
  const lobbyHeaderActionOrder = useMemo(
    () => normalizeDesignLayout(activeDesign.layout, createDefaultDesignConfig().layout).lobbyHeaderActions,
    [activeDesign.layout],
  );
  const lobbyTopButtonOrder = useMemo(
    () => normalizeDesignLayout(activeDesign.layout, createDefaultDesignConfig().layout).lobbyTopButtons,
    [activeDesign.layout],
  );
  const roomOwnerButtonOrder = useMemo(
    () => normalizeDesignLayout(activeDesign.layout, createDefaultDesignConfig().layout).roomOwnerButtons,
    [activeDesign.layout],
  );
  const designPreviewLayout = useMemo(
    () => normalizeDesignLayout(designPreviewTarget.layout, createDefaultDesignConfig().layout),
    [designPreviewTarget.layout],
  );
  const lobbyHeaderActionButtons = useMemo(() => {
    return {
      openTable: (
        <button key="openTable" className="my-top-btn my-btn-open" onClick={onOpenTable}>
          {activeDesign.texts.lobbyOpenTable || "Masa Aç"}
        </button>
      ),
      quickPlay: (
        <button key="quickPlay" className="my-top-btn my-btn-play" onClick={onQuickPlay}>
          {activeDesign.texts.lobbyQuickPlay || "Hemen Oyna"}
        </button>
      ),
    } satisfies Record<"openTable" | "quickPlay", JSX.Element>;
  }, [activeDesign.texts.lobbyOpenTable, activeDesign.texts.lobbyQuickPlay, onOpenTable, onQuickPlay]);
  void lobbyHeaderActionButtons;

  function clearOpponentIdleWatch() {
    opponentIdleWatchRef.current = null;
    opponentIdlePromptRef.current = false;
    setOpponentIdleModal((prev) => (prev.open || prev.matchToken ? { open: false, matchToken: "" } : prev));
  }

  function isWaitingForOpponentTurn() {
    const latest = latestLegacyStateRef.current;
    return Boolean(
      latest.matchActive
      && !latest.winner
      && latest.localColor
      && latest.turn
      && latest.turn !== latest.localColor,
    );
  }

  function acceptOpponentIdleWinOffer() {
    const activeTracker = opponentIdleWatchRef.current;
    const targetMatchToken = activeTracker?.matchToken || opponentIdleModal.matchToken || latestLegacyStateRef.current.matchToken;
    opponentIdlePromptRef.current = false;
    setOpponentIdleModal({ open: false, matchToken: "" });
    if (!activeTracker || !isWaitingForOpponentTurn()) {
      clearOpponentIdleWatch();
      return;
    }
    claimTimeoutWinByInactivity(targetMatchToken);
    clearOpponentIdleWatch();
  }

  function postponeOpponentIdleWinOffer() {
    const activeTracker = opponentIdleWatchRef.current;
    opponentIdlePromptRef.current = false;
    setOpponentIdleModal({ open: false, matchToken: "" });
    if (!activeTracker || !isWaitingForOpponentTurn()) {
      clearOpponentIdleWatch();
      return;
    }
    opponentIdleWatchRef.current = {
      ...activeTracker,
      deadlineAt: Date.now() + OPPONENT_MOVE_TIMEOUT_MS,
    };
    setLobbyNotice("Bekleme isteğin kaydedildi. Rakibe 1 dakika daha süre verildi.");
  }

  function broadcastLobbySync() {
    lobbyChannelRef.current?.postMessage({ type: "lobby-sync", at: Date.now() });
  }

  function readRealtimeLobbyState() {
    return realtimeRemoteStateRef.current;
  }

  function applyIncomingRealtimeSnapshot(message: RealtimeMessage) {
    if (message.kind !== "snapshot") return false;
    const expectedChannel = activeRealtimeLobbyChannelRef.current;
    if (message.channel !== expectedChannel) return false;
    if (!message.sender || !Number.isFinite(message.counter)) return false;
    const counter = Number(message.counter);
    const previousCounter = realtimeSenderCountersRef.current.get(message.sender) ?? 0;
    if (counter <= previousCounter) return false;
    realtimeSenderCountersRef.current.set(message.sender, counter);

    const incoming = normalizeLobbyState(message.payload);
    const now = Date.now();
    const storageKey = activeLobbyStorageKeyRef.current;
    const lobbyName = activeLobbyNameRef.current;
    const currentLocal = realtimeRemoteStateRef.current ?? loadLobbyState(storageKey, lobbyName);
    const merged = mergeLobbyStates(currentLocal, incoming);
    realtimeRemoteStateRef.current = merged;
    realtimeReceivedSnapshotRef.current = true;
    saveJson(storageKey, merged);
    setLobbyState(merged);
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
      channel: activeRealtimeLobbyChannel,
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

  function clearHttpSyncFailureState() {
    realtimeHttpFailCountRef.current = 0;
    realtimeHttpDisabledUntilRef.current = 0;
  }

  function registerHttpSyncFailure(errorText: string) {
    const nextCount = Math.min(realtimeHttpFailCountRef.current + 1, 8);
    realtimeHttpFailCountRef.current = nextCount;
    const waitMs = Math.min(
      HTTP_SYNC_ERROR_BACKOFF_MAX_MS,
      HTTP_SYNC_ERROR_BACKOFF_MIN_MS * (2 ** Math.max(0, nextCount - 1)),
    );
    realtimeHttpDisabledUntilRef.current = Date.now() + waitMs;
    setSyncHealth((prev) => ({
      ...prev,
      lastError: `${errorText} (${Math.ceil(waitMs / 1000)} sn bekleme)`,
    }));
  }

  async function syncRealtimeViaHttp(reason: string) {
    const disabledUntil = realtimeHttpDisabledUntilRef.current;
    const now = Date.now();
    if (disabledUntil > now) return;
    const throttleable = reason === "lobby-update-mirror" || reason === "lobby-update-drain";
    if (throttleable && now < realtimeHttpNextAllowedAtRef.current) {
      return;
    }
    if (realtimeHttpSyncInFlightRef.current) return;
    realtimeHttpSyncInFlightRef.current = true;
    if (throttleable) {
      realtimeHttpNextAllowedAtRef.current = now + HTTP_SYNC_THROTTLE_MS;
    }
    let shouldDrainQueue = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), HTTP_SYNC_TIMEOUT_MS);
    try {
      const pendingAtStart = realtimePendingSnapshotRef.current;
      const payload = pendingAtStart ?? getCurrentLobbyState();
      realtimeSyncCounterRef.current += 1;
      const outgoing: RealtimeMessage = {
        kind: "snapshot",
        channel: activeRealtimeLobbyChannel,
        sender: appSessionId,
        counter: realtimeSyncCounterRef.current,
        at: Date.now(),
        payload,
        reason,
      };
      const response = await fetch(buildRealtimeHttpSyncUrl(activeRealtimeLobbyChannel, appSessionId), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(outgoing),
        signal: controller.signal,
      });
      if (!response.ok) {
        registerHttpSyncFailure(`http push hata (${response.status})`);
        setRealtimeStatus("offline");
        return;
      }
      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      if (!contentType.includes("application/json")) {
        registerHttpSyncFailure("http push json degil");
        setRealtimeStatus("offline");
        return;
      }
      const data = (await response.json().catch(() => null)) as { snapshot?: unknown } | null;
      const incoming = normalizeRealtimeMessage(data?.snapshot);
      if (!incoming || incoming.kind !== "snapshot" || incoming.channel !== activeRealtimeLobbyChannel) {
        registerHttpSyncFailure("http push snapshot gecersiz");
        setRealtimeStatus("offline");
        return;
      }
      const now = Date.now();
      realtimeLastPushAtRef.current = now;
      setSyncHealth((prev) => ({
        ...prev,
        lastHttpPushAt: now,
        lastHttpPushReason: reason,
        httpPushCount: prev.httpPushCount + 1,
        lastError: "",
      }));
      clearHttpSyncFailureState();
      const latestPending = realtimePendingSnapshotRef.current;
      if (!latestPending || sameLobbySnapshot(latestPending, payload)) {
        realtimePendingSnapshotRef.current = null;
      } else {
        shouldDrainQueue = true;
      }
      applyIncomingRealtimeSnapshot(incoming);
      setRealtimeStatus("online");
    } catch {
      registerHttpSyncFailure("http push baglanti hatasi");
      setRealtimeStatus("offline");
    } finally {
      window.clearTimeout(timeoutId);
      realtimeHttpSyncInFlightRef.current = false;
      if (shouldDrainQueue && realtimePendingSnapshotRef.current) {
        window.setTimeout(() => {
          void syncRealtimeViaHttp("lobby-update-drain");
        }, 350);
      }
    }
  }

  async function pullRealtimeViaHttp(reason: string) {
    void reason;
    const disabledUntil = realtimeHttpDisabledUntilRef.current;
    const now = Date.now();
    if (disabledUntil > now) return;
    if (realtimeHttpPullInFlightRef.current) return;
    realtimeHttpPullInFlightRef.current = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), HTTP_SYNC_TIMEOUT_MS);
    try {
      const response = await fetch(buildRealtimeHttpSyncUrl(activeRealtimeLobbyChannel, appSessionId), {
        method: "GET",
        headers: { "cache-control": "no-store" },
        signal: controller.signal,
      });
      if (!response.ok) {
        registerHttpSyncFailure(`http pull hata (${response.status})`);
        setRealtimeStatus("offline");
        return;
      }
      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      if (!contentType.includes("application/json")) {
        registerHttpSyncFailure("http pull json degil");
        setRealtimeStatus("offline");
        return;
      }
      const data = (await response.json().catch(() => null)) as { snapshot?: unknown } | null;
      const incoming = normalizeRealtimeMessage(data?.snapshot);
      if (incoming && incoming.kind === "snapshot" && incoming.channel === activeRealtimeLobbyChannel) {
        applyIncomingRealtimeSnapshot(incoming);
      }
      const now = Date.now();
      realtimeLastPullAtRef.current = now;
      setSyncHealth((prev) => ({
        ...prev,
        lastHttpPullAt: now,
        lastHttpPullReason: reason,
        httpPullCount: prev.httpPullCount + 1,
        lastError: "",
      }));
      clearHttpSyncFailureState();
      if (realtimeStatus !== "online") {
        setRealtimeStatus("online");
      }
    } catch {
      registerHttpSyncFailure("http pull baglanti hatasi");
      setRealtimeStatus("offline");
    } finally {
      window.clearTimeout(timeoutId);
      realtimeHttpPullInFlightRef.current = false;
    }
  }

  function getCurrentLobbyState() {
    return readRealtimeLobbyState() ?? loadLobbyState(activeLobbyStorageKey, activeLobbyName);
  }

  function persistLobbyState(next: LobbyState) {
    const normalized = normalizeLobbyState(next);
    realtimeRemoteStateRef.current = normalized;
    realtimeReceivedSnapshotRef.current = true;
    realtimePendingSnapshotRef.current = normalized;
    saveJson(activeLobbyStorageKey, normalized);
    setLobbyState(normalized);
    const sent = sendRealtimeSnapshot(normalized, "lobby-update");
    if (!sent) {
      void syncRealtimeViaHttp("lobby-update-fallback");
    } else if (Date.now() - realtimeLastPushAtRef.current >= HTTP_SYNC_MIRROR_MIN_INTERVAL_MS) {
      void syncRealtimeViaHttp("lobby-update-mirror");
    }
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
      setLobbyNotice("Lobi sohbetine yazmak için üye girişi yapmalısın.");
      return;
    }
    if (member.isBlocked || !member.permissions.lobbyChat) {
      setLobbyNotice("Lobi sohbeti yetkiniz admin tarafından kapatıldı.");
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
      setLobbyNotice("Masa sohbeti sadece üye oyuncular için açık.");
      return;
    }
    if (member && (member.isBlocked || !member.permissions.tableChat)) {
      setLobbyNotice("Masa sohbeti yetkiniz admin tarafından kapatıldı.");
      return;
    }
    if (roomSession.role === "spectator" && member && !member.permissions.spectatorChat) {
      setLobbyNotice("İzleyici sohbeti yetkiniz kapatıldı.");
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
      setLobbyNotice("Masa bulunamadı, sohbet gönderilemedi.");
      return;
    }
    if (blocked) {
      setLobbyNotice("Masa sohbetini sadece masadaki oyuncular gönderebilir.");
      return;
    }
    if (spectatorChatBlocked) {
      setLobbyNotice("Masa sahibi izleyici sohbetini kapatmış.");
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
        lobbyId: activeLobbyId,
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
    let changed = false;
    let closedCount = 0;
    let targetTableId = 0;
    let targetRoomCode = "";
    let targetSeat: Seat | null = null;

    writeLobby((current) => {
      const cleaned = cleanupStaleAndPrune(current.tables).tables;
      const scopedUserId = roomSession && roomSession.role === "player" ? sanitizeGuestId(currentProfile.userId) : "";
      const scopedRoomCode = roomSession && roomSession.role === "player" ? sanitizeRoomCode(roomSession.code) : "";
      const scopedTableId = roomSession && roomSession.role === "player" ? Math.max(1, roomSession.tableNo) : 0;
      const mySeatBefore = findSessionSeat(cleaned, appSessionId);
      targetTableId = mySeatBefore?.table.id ?? scopedTableId;
      targetRoomCode = mySeatBefore?.table.roomCode ?? scopedRoomCode;
      targetSeat = mySeatBefore?.seat ?? null;
      const cleared = clearSessionFromTables(cleaned, appSessionId, scopedUserId, scopedRoomCode, scopedTableId);
      const pruned = cleanupStaleAndPrune(cleared.tables).tables;
      const closedRoomCodes = cleared.tables
        .filter((table) => !table.white && !table.black)
        .map((table) => table.roomCode);
      closedCount = closedRoomCodes.length;
      const nextClosedTableRooms = markClosedTableRooms(current.closedTableRooms, closedRoomCodes);
      const tablesSame = JSON.stringify(pruned) === JSON.stringify(cleaned);
      const closedSame = JSON.stringify(nextClosedTableRooms) === JSON.stringify(current.closedTableRooms);
      if (!cleared.changed && tablesSame && closedSame) return current;
      changed = true;
      return {
        ...current,
        tables: pruned,
        closedTableRooms: nextClosedTableRooms,
        updatedAt: Date.now(),
      };
    });

    if (changed) {
      appendFlowEvent(
        "seat.release",
        closedCount > 0 ? "Masadan cikildi, bosalan masa kapatildi." : "Masadan cikildi.",
        {
          tableId: targetTableId,
          roomCode: targetRoomCode,
          seat: targetSeat,
          dedupeKey: `${targetRoomCode || targetTableId}-release`,
        },
      );
    }
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
      lobbyId: activeLobbyId,
      roomName: activeLobbyName,
      tableNo: table.id,
      role: "player",
      joinedAt: Date.now(),
    });
    setJoinCodeInput(table.roomCode);
    setJoinSeat(seat === "white" ? "black" : "white");
    setMode("local");
    setViewMode("table");
    setInvitePickerTableId(null);
    setLobbyNotice("");
    appendFlowEvent("table.enter", "Masa gorunumu acildi.", {
      tableId: table.id,
      roomCode: table.roomCode,
      seat,
      dedupeKey: `${table.roomCode}-${seat}-enter`,
      dedupeMs: 1_000,
    });
    forceReloadBoard();
  }

  function watchTableAsSpectator(table: LobbyTable) {
    if (!table.white && !table.black) {
      setLobbyNotice("Bos masa izlenemez.");
      return;
    }
    if (table.isPrivate) {
      setLobbyNotice("Özel masaya izleyici giremez. Sadece davetli oyuncu katılabilir.");
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
      lobbyId: activeLobbyId,
      roomName: activeLobbyName,
      tableNo: table.id,
      role: "spectator",
      joinedAt: Date.now(),
    });
    setJoinCodeInput(table.roomCode);
    setMode("local");
    setViewMode("table");
    setInvitePickerTableId(null);
    setLobbyNotice(`Masa ${table.id} izleyici modunda açıldı.`);
    forceReloadBoard();
  }

  function upsertMySeat(tableId: number, seat: Seat, explicitRoomCode?: string): UpsertSeatResult {
    let seatBlocked = false;
    let blockReason: UpsertSeatResult["reason"] = null;
    let resolvedTable: LobbyTable | null = null;
    let autoStarted = false;
    let autoStartedRoomCode = "";

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
          whiteClearToken: null,
          blackClearToken: null,
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
      const existingUserSeat = findUserSeat(cleaned, currentProfile.userId);
      const userSeatedInAnotherSession = Boolean(
        existingUserSeat
        && existingUserSeat.sessionId !== appSessionId,
      );
      if (userSeatedInAnotherSession) {
        seatBlocked = true;
        blockReason = "duplicate-user";
        return current;
      }
      if (existingSeat && !isSameTable) {
        seatBlocked = true;
        blockReason = "already-seated";
        return current;
      }

      let gateShouldReset = false;

      if (existingSeat && isSameTable && existingSeat.seat !== seat) {
        table = existingSeat.seat === "white"
          ? { ...table, white: null, whiteClearToken: createSeatClearToken(appSessionId || "white-switch") }
          : { ...table, black: null, blackClearToken: createSeatClearToken(appSessionId || "black-switch") };
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
          ? {
            ...table,
            white: seatState,
            whiteClearToken: null,
            ownerUserId: table.ownerUserId || sanitizeGuestId(currentProfile.userId),
          }
          : {
            ...table,
            black: seatState,
            blackClearToken: null,
            ownerUserId: table.ownerUserId || sanitizeGuestId(currentProfile.userId),
          };

      const started = autoStartTableWhenBothSeated(patched, now);
      if (!patched.startedAt && Boolean(started.startedAt)) {
        autoStarted = true;
        autoStartedRoomCode = started.roomCode;
      }
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
    if (autoStarted) {
      appendFlowEvent("table.autostart", "Iki koltuk doldugu icin oyun otomatik basladi.", {
        tableId,
        roomCode: autoStartedRoomCode || sanitizeRoomCode(explicitRoomCode ?? ""),
        seat,
        dedupeKey: `${autoStartedRoomCode || tableId}-autostart`,
        dedupeMs: 1_000,
      });
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
      appendFlowEvent("seat.blocked", "Oyuncu ayni anda ikinci masaya oturmaya calisti.", {
        tableId,
        roomCode: roomCode || existing.table.roomCode,
        seat,
        dedupeKey: `already-seated-${tableId}-${seat}`,
      });
      setLobbyNotice(`Aynı anda sadece tek masada oturabilirsin. Önce Masa ${existing.table.id} için masadan kalkmalısın.`);
      setViewMode("lobby");
      return null;
    }

    const upserted = upsertMySeat(tableId, seat, explicitRoomCode);
    const table = upserted.table;
    if (!table) {
      appendFlowEvent("seat.blocked", `Koltuga oturma engellendi: ${upserted.reason || "occupied"}.`, {
        tableId,
        roomCode: roomCode || "",
        seat,
        dedupeKey: `${upserted.reason || "occupied"}-${tableId}-${seat}`,
      });
      if (upserted.reason === "duplicate-user") {
        setLobbyNotice("Bu hesap baska bir tarayicida aktif. Diger oturumu kapatip tekrar deneyin.");
      } else if (upserted.reason === "already-seated") {
        setLobbyNotice(`Aynı anda sadece tek masada oturabilirsin. Önce Masa ${existing?.table.id} için masadan kalkmalısın.`);
      } else if (upserted.reason === "private") {
        setLobbyNotice("Bu masa ozeldir. Sadece masa sahibi veya davet edilen oyuncu oturabilir.");
      } else if (upserted.reason === "missing-owner") {
        setLobbyNotice("Masa sahibi bilgisi gecersiz. Lutfen masa yenilenene kadar bekleyin.");
      } else {
        setLobbyNotice("Secilen koltuk dolu. Lutfen baska bir koltuk secin.");
      }
      return null;
    }
    appendFlowEvent("seat.joined", "Oyuncu masaya oturdu.", {
      tableId: table.id,
      roomCode: table.roomCode,
      seat,
      dedupeKey: `${table.roomCode}-${seat}-joined`,
      dedupeMs: 900,
    });
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
        lobbyId: activeLobbyId,
        roomName: activeLobbyName,
        tableNo: table.id,
        role: "player",
        joinedAt: Date.now(),
      });
      setJoinCodeInput(table.roomCode);
      setJoinSeat(seat === "white" ? "black" : "white");
      setMode("local");
      setViewMode("lobby");
      setLobbyNotice(`Masa ${table.id} açıldı. Diğer oyuncu bekleniyor.`);
    }
    return table;
  }

  function onRoomStartReady() {
    if (!roomSession) return;
    if (roomSession.role !== "player") {
      setLobbyNotice("İzleyiciler oyunu başlatamaz.");
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
      setLobbyNotice("Masadaki koltuğun bulunamadı. Lütfen tekrar masaya otur.");
      return;
    }
    if (alreadyStarted) {
      setLobbyNotice("Oyun zaten başladı.");
      return;
    }
    if (alreadyReady) {
      setLobbyNotice("Hazır durumdasın. Rakibin Oyuna Başla butonuna basması bekleniyor.");
      return;
    }
    if (startNow) {
      setLobbyNotice("İki oyuncu da hazırlandı. Oyun başladı.");
      return;
    }
    setLobbyNotice("Hazır oldun. Rakibin de Oyuna Başla butonuna basması bekleniyor.");
  }

  function guardTavlaOnlyAction() {
    if (selectedGameId === "tavla") return true;
    if (!canAccessOkeyPrototype) return true;
    setLobbyNotice("Bu ozellik su an sadece Tavla icin aktif.");
    return false;
  }
  // smoke-compat:
  // if (!guardTavlaOnlyAction()) return;
  // if (!guardTavlaOnlyAction()) return;

  function onOpenTable() {
    if (selectedGameId !== "tavla") {
      if (!canAccessOkeyPrototype) return;
      if (!okeyPrototypeSelectedRoom) {
        setLobbyNotice("Lutfen once bir oda sec.");
        return;
      }
      if (okeyPrototypeSeatReservation) {
        const existingTable = okeyPrototypeVisibleTableSketchRows.find((row) => row.id === okeyPrototypeSeatReservation.tableId) ?? null;
        if (existingTable) {
          setOkeyPrototypeSelectedTableId(existingTable.id);
          setLobbyNotice(`Zaten Masa ${existingTable.tableNo} / Koltuk ${okeyPrototypeSeatReservation.seatNo} uzerindesin.`);
        } else {
          setLobbyNotice("Ayni anda sadece bir 101 masasinda oturabilirsin.");
        }
        return;
      }
      const safeUserId = sanitizeGuestId(currentProfile.userId);
      if (!safeUserId) {
        setLobbyNotice("Kullanici bilgisi alinmadi. Sayfayi yenileyip tekrar dene.");
        return;
      }
      const seatNo = Math.max(1, Math.min(4, okeyPrototypeSeatDraft)) as OkeyPrototypeSeatNo;
      const roomId = okeyPrototypeSelectedRoom.id;
      const existingRoomTables = okeyPrototypeTablesByRoom[roomId] ?? [];
      const nextTableNo = existingRoomTables.reduce((max, table) => Math.max(max, table.tableNo), 0) + 1;
      const now = Date.now();
      const createdTable: OkeyPrototypeLobbyTableState = {
        id: `${roomId}-table-${nextTableNo}-${now.toString(36).slice(-5)}`,
        roomId,
        tableNo: nextTableNo,
        ownerUserId: safeUserId,
        ownerSessionId: appSessionId,
        seats: {},
        createdAt: now,
        startedAt: null,
      };
      const createdRow: OkeyPrototypeTableSketchRow = {
        id: createdTable.id,
        roomId,
        tableNo: createdTable.tableNo,
        active: false,
        started: false,
        seated: 0,
        occupiedSeatNos: [],
        ownerUserId: createdTable.ownerUserId,
        seats: createdTable.seats,
      };
      setOkeyPrototypeTablesByRoom((current) => {
        const roomTables = (current[roomId] ?? []).slice();
        return {
          ...current,
          [roomId]: [...roomTables, createdTable],
        };
      });
      setOkeyPrototypeSelectedTableId(createdRow.id);
      reserveOkeyPrototypeSeat(createdRow, seatNo, "Masa acildi");
      return;
    }
    const openGameView = true;
    const latest = getCurrentLobbyState();
    const existing = findSessionSeat(latest.tables, appSessionId);
    if (existing) {
      if (openGameView) {
        goToTable(existing.table, existing.seat);
        setLobbyNotice(`Masa ${existing.table.id} zaten açık. Masaya yönlendirildin.`);
      } else {
        sitToTable(existing.table.id, existing.seat, existing.table.roomCode, false);
        setLobbyNotice(`Masa ${existing.table.id} zaten açık.`);
      }
      return;
    }
    const tableId = getNextTableId(latest.tables);
    const opened = sitToTable(tableId, "white", createRoomCode(), openGameView);
    if (opened) {
      setLobbyNotice(`Masa ${opened.id} açıldı. Diğer oyuncu bekleniyor.`);
    }
  }

  function onQuickPlay() {
    if (selectedGameId !== "tavla") {
      if (!canAccessOkeyPrototype) return;
      if (okeyPrototypeSeatReservation) {
        const existingTable = okeyPrototypeVisibleTableSketchRows.find((row) => row.id === okeyPrototypeSeatReservation.tableId) ?? null;
        if (existingTable) {
          setOkeyPrototypeSelectedTableId(existingTable.id);
          setLobbyNotice(`Zaten Masa ${existingTable.tableNo} / Koltuk ${okeyPrototypeSeatReservation.seatNo} uzerindesin.`);
        } else {
          setLobbyNotice("Ayni anda sadece bir 101 masasinda oturabilirsin.");
        }
        return;
      }
      const targetTable = okeyPrototypeVisibleTableSketchRows
        .filter((row) => row.seated < 4)
        .sort((left, right) => {
          if (right.seated !== left.seated) return right.seated - left.seated;
          if (left.active !== right.active) return left.active ? -1 : 1;
          return left.tableNo - right.tableNo;
        })[0]
        ?? null;
      if (!targetTable) {
        onOpenTable();
        return;
      }
      const occupiedSeatNos = getOkeyLobbyOccupiedSeatNos(targetTable);
      const targetSeat = (OKEY_PROTOTYPE_SEATS.find((seatNo) => !occupiedSeatNos.includes(seatNo)) ?? 1) as OkeyPrototypeSeatNo;
      reserveOkeyPrototypeSeat(targetTable, targetSeat, "Hizli oturuldu");
      return;
    }
    const openGameView = true;
    const latest = getCurrentLobbyState();
    const existing = findSessionSeat(latest.tables, appSessionId);
    if (existing) {
      if (openGameView) {
        goToTable(existing.table, existing.seat);
      } else {
        sitToTable(existing.table.id, existing.seat, existing.table.roomCode, false);
      }
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
      const joined = sitToTable(waitingTable.id, targetSeat, waitingTable.roomCode, openGameView);
      if (joined) {
        setLobbyNotice(`Masa ${waitingTable.id} bulundu. Oyuna katildin.`);
        return;
      }
    }

    const tableId = getNextTableId(cleanedTables);
    sitToTable(tableId, "white", createRoomCode(), openGameView);
  }

  function onJoinByCode() {
    if (!guardTavlaOnlyAction()) return;
    const code = sanitizeRoomCode(joinCodeInput);
    if (!code) {
      setLobbyNotice("Lutfen gecerli bir oda kodu yazin.");
      return;
    }

    const latest = getCurrentLobbyState();
    const table = latest.tables.find((row) => row.roomCode === code);
    if (!table) {
      setLobbyNotice("Bu kodda açık masa yok.");
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
      setLobbyNotice("Seçili koltuk dolu olduğu için boş koltuğa geçtin.");
    }

    sitToTable(table.id, targetSeat, table.roomCode);
  }
  void onJoinByCode;

  async function leaveRoomAndGoLobby(skipPenaltyConfirm = false) {
    let penalized = false;
    let leftWithPermission = false;
    let penaltyWaivedBecauseOpponentLeft = false;
    if (roomSession && roomSession.role === "player") {
      const activeTable = getActiveRoomTable();
      const leaveContext = resolveLeavePenaltyContext(activeTable);
      if (leaveContext.shouldPenalize && leaveContext.opponentSeat) {
        if (!skipPenaltyConfirm) {
          const confirmed = await openLeaveConfirmModal(
            "Masadan Çıkış Uyarısı",
            `Set serisi tamamlanmadan masadan kalkarsan ${gameRules.resignPenaltyPoints} puan kaybedersin. Rakibin galip sayılıp ${gameRules.winPoints} puan kazanır.`,
          );
          if (!confirmed) return;
        }
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
    appendFlowEvent("table.leave", "Oyuncu masadan ayrildi.", {
      tableId: roomSession?.tableNo ?? 0,
      roomCode: roomSession?.code ?? "",
      seat: roomSession?.role === "player" ? roomSession.seat : null,
      dedupeKey: `${roomSession?.code || roomSession?.tableNo || "x"}-leave`,
      dedupeMs: 900,
    });
    if (penalized) {
      setLobbyNotice(`Masadan ayrıldın: -${gameRules.resignPenaltyPoints} puan. Rakibin +${gameRules.winPoints} puan kazandı.`);
      return;
    }
    if (leftWithPermission) {
      setLobbyNotice("Rakibin izin verdiği için puan kaybetmeden masadan ayrıldın.");
      return;
    }
    if (penaltyWaivedBecauseOpponentLeft) {
      setLobbyNotice("Rakip masadan ayrıldığı için ceza uygulanmadı.");
      return;
    }
    setLobbyNotice("Masadan ayrıldın.");
  }

  function openLeaveActionModal() {
    if (!roomSession || roomSession.role !== "player") {
      void leaveRoomAndGoLobby();
      return;
    }
    const activeTable = getActiveRoomTable();
    const bothPlayersSeated = Boolean(activeTable?.white && activeTable?.black);
    const firstRollPlayed = Boolean(matchLiveState.matchActive || (activeTable?.setPlayed ?? 0) > 0);
    if (bothPlayersSeated && firstRollPlayed) {
      setLeaveActionModalOpen(true);
      return;
    }
    void leaveRoomAndGoLobby();
  }

  function closeLeaveActionModal() {
    setLeaveActionModalOpen(false);
  }

  function offerLeaveWithoutPenaltyFromModal() {
    setLeaveActionModalOpen(false);
    requestLeaveWithoutPenalty();
  }

  function getCurrentLeavePromptKey() {
    if (!roomSession || roomSession.role !== "player" || !currentRoomTable) return "";
    const opponentSeat = roomSession.seat === "white" ? currentRoomTable.black : currentRoomTable.white;
    const requestUserId = sanitizeGuestId(opponentSeat?.userId ?? "");
    if (!requestUserId) return "";
    return `${currentRoomTable.roomCode}:${requestUserId}`;
  }

  async function leaveNowFromModal() {
    setLeaveActionModalOpen(false);
    await leaveRoomAndGoLobby(true);
  }

  function closeLeaveIncomingModal(ignoreCurrentRequest = false) {
    const activeKey = leaveIncomingActiveKeyRef.current || leaveIncomingModal.requestKey;
    if (ignoreCurrentRequest && activeKey) {
      leaveIncomingIgnoredKeyRef.current = activeKey;
    }
    leaveIncomingActiveKeyRef.current = "";
    setLeaveIncomingModal((prev) => (prev.open || prev.requestKey ? {
      open: false,
      requesterName: "",
      requestKey: "",
    } : prev));
  }

  function closeLeaveInfoModal() {
    setLeaveInfoModal((prev) => (prev.open ? { open: false, title: "", message: "" } : prev));
  }

  function acceptLeaveOfferFromModal() {
    const key = leaveIncomingActiveKeyRef.current || leaveIncomingModal.requestKey || getCurrentLeavePromptKey();
    if (key) {
      leaveIncomingIgnoredKeyRef.current = key;
      leavePermissionPromptKeyRef.current = key;
    }
    closeLeaveIncomingModal(true);
    leavePermissionPromptKeyRef.current = "";
    leaveIncomingIgnoredKeyRef.current = "";
    approveLeaveWithoutPenalty();
  }

  function rejectLeaveWithoutPenalty() {
    if (!roomSession || roomSession.role !== "player") return;
    const rejecterUserId = sanitizeGuestId(currentProfile.userId);
    if (!rejecterUserId) return;
    let tableMissing = false;
    let noRequest = false;
    let cannotRejectOwnRequest = false;
    let notOpponent = false;
    let updated = false;
    let rejectedRequestKey = "";

    const rejecterName = sanitizeGuestName(currentProfile.displayName) || "Rakip";

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
      if (!mySeat || sanitizeGuestId(mySeat.userId) !== rejecterUserId || !opponentSeat) {
        notOpponent = true;
        return current;
      }
      const requestUserId = sanitizeGuestId(table.leavePermissionRequestByUserId ?? "");
      if (!requestUserId) {
        noRequest = true;
        return current;
      }
      if (requestUserId === rejecterUserId) {
        cannotRejectOwnRequest = true;
        return current;
      }
      rejectedRequestKey = `${table.roomCode}:${requestUserId}`;
      tables[index] = normalizeTableAccess({
        ...table,
        leavePermissionRequestByUserId: null,
        leavePermissionGrantedToUserId: null,
        inviteNoticeId: createChatMessageId(`leave-reject-${table.id}-${requestUserId}`),
        inviteNoticeForUserId: requestUserId,
        inviteNoticeText: `${LEAVE_NOTICE_REJECT_PREFIX}${rejecterName} oyuncusu puansız ayrılma teklifinizi reddetti.`,
      });
      updated = true;
      return {
        ...current,
        tables: sortTables(tables),
        updatedAt: Date.now(),
      };
    });

    if (tableMissing) {
      setLobbyNotice("Masa bulunamadı.");
      return;
    }
    if (notOpponent) {
      setLobbyNotice("Bu teklifi reddetmek için masadaki rakip oyuncu olmalısın.");
      return;
    }
    if (noRequest) {
      setLobbyNotice("Aktif bir puansız ayrılma teklifi yok.");
      return;
    }
    if (cannotRejectOwnRequest) {
      setLobbyNotice("Kendi teklifini reddedemezsin.");
      return;
    }
    if (updated) {
      if (rejectedRequestKey) {
        leaveIncomingIgnoredKeyRef.current = rejectedRequestKey;
        leaveIncomingActiveKeyRef.current = "";
      }
      setLeaveIncomingModal({ open: false, requesterName: "", requestKey: "" });
      setLobbyNotice("Puansız ayrılma teklifi reddedildi.");
    }
  }

  function rejectLeaveOfferFromModal() {
    const key = leaveIncomingModal.requestKey || leaveIncomingActiveKeyRef.current || getCurrentLeavePromptKey();
    if (key) {
      leaveIncomingIgnoredKeyRef.current = key;
      leavePermissionPromptKeyRef.current = key;
    }
    leaveIncomingActiveKeyRef.current = "";
    setLeaveIncomingModal({ open: false, requesterName: "", requestKey: "" });
    window.setTimeout(() => {
      rejectLeaveWithoutPenalty();
    }, 0);
  }

  async function startBotGame() {
    if (!guardTavlaOnlyAction()) return;
    let penalized = false;
    let leftWithPermission = false;
    let penaltyWaivedBecauseOpponentLeft = false;
    if (roomSession) {
      if (roomSession.role === "player") {
        const activeTable = getActiveRoomTable();
        const leaveContext = resolveLeavePenaltyContext(activeTable);
        if (leaveContext.shouldPenalize && leaveContext.opponentSeat) {
          const confirmed = window.confirm(
            `Set serisi tamamlanmadan masadan ayrılırsan ${gameRules.resignPenaltyPoints} puan kaybedersin. Bot moduna geçmek istiyor musun?`,
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
    setInvitePickerTableId(null);
    if (penalized) {
      setLobbyNotice(`Bot modu aktif. Masadan ayrıldığın için -${gameRules.resignPenaltyPoints} puan uygulandı.`);
    } else if (leftWithPermission) {
      setLobbyNotice("Bot modu aktif. Rakip izin verdiği için puan kesilmedi.");
    } else if (penaltyWaivedBecauseOpponentLeft) {
      setLobbyNotice("Bot modu aktif. Rakip masadan ayrıldığı için ceza uygulanmadı.");
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
      const response = await apiFetch("/api/auth/rules", { method: "GET" });
      const data = (await response.json().catch(() => null)) as { rules?: unknown } | null;
      if (!response.ok) return;
      const nextRules = normalizeGameRules(data?.rules, gameRules);
      setGameRules(nextRules);
      setRuleDraft(nextRules);
    } catch {
      // keep local defaults if service is unavailable
    }
  }

  async function refreshPublishedDesign() {
    try {
      const response = await apiFetch("/api/auth/design", { method: "GET" });
      const data = (await response.json().catch(() => null)) as { design?: unknown } | null;
      if (!response.ok) return;
      const nextDesign = normalizeDesignConfig(data?.design, designPublished);
      setDesignPublished(nextDesign);
      if (!isAdminWindow || member?.role !== "admin") {
        setDesignDraft(nextDesign);
      }
    } catch {
      // Tasarım ayarı servisi yoksa mevcut tema ile devam.
    }
  }

  async function loadAdminState(adminUserId?: string) {
    const userId = sanitizeGuestId(adminUserId ?? member?.id ?? "");
    if (!userId) return;
    setAdminBusy(true);
    setAdminError("");
    try {
      const url = new URL("/api/auth/admin/state", `${RUNTIME_API_BASE_URL}/`);
      url.searchParams.set("userId", userId);
      url.searchParams.set("gameId", effectiveSelectedGameId);
      const response = await fetch(url.toString(), { method: "GET" });
      const data = (await response.json().catch(() => null)) as {
        users?: unknown;
        rules?: unknown;
        lobbies?: unknown;
        design?: unknown;
        designHistory?: unknown;
        error?: unknown;
      } | null;
      if (!response.ok) {
        const errorText = typeof data?.error === "string" ? data.error : "Admin verisi alinamadi.";
        setAdminError(errorText);
        return;
      }
      const users = normalizeMemberUsers(data?.users);
      setAdminUsers(users);
      const rooms = normalizeLobbyRooms(data?.lobbies);
      setLobbyRooms(rooms);
      const nextRules = normalizeGameRules(data?.rules, gameRules);
      setGameRules(nextRules);
      setRuleDraft(nextRules);
      const nextDesign = normalizeDesignConfig(data?.design, designPublished);
      setDesignPublished(nextDesign);
      setDesignDraft(nextDesign);
      const historyRows = Array.isArray(data?.designHistory)
        ? data?.designHistory.map((row) => normalizeDesignConfig(row, nextDesign)).sort((a, b) => b.version - a.version).slice(0, 25)
        : [];
      setAdminDesignHistory(historyRows.filter((row) => row.version !== nextDesign.version));
      setAdminDesignRollbackVersion(historyRows[0]?.version ?? 0);
      setAdminSelectedUserId((prev) => (prev && users.some((u) => u.id === prev) ? prev : (users[0]?.id ?? "")));
      setAdminSelectedLobbyId((prev) => (prev && rooms.some((r) => r.id === prev) ? prev : (rooms[0]?.id ?? "")));
    } catch {
      setAdminError("Admin servisine baglanilamadi.");
    } finally {
      setAdminBusy(false);
    }
  }

  async function runAdminUserAction(
    targetUserId: string,
    action: "addPoints" | "setPoints" | "setRole" | "resetStats" | "deleteUser" | "setBlocked" | "setPermission",
    payload: Record<string, unknown> = {},
  ) {
    if (!member || member.role !== "admin") return;
    const safeTargetUserId = sanitizeGuestId(targetUserId);
    if (!safeTargetUserId) return;
    setAdminBusy(true);
    setAdminError("");
    setAdminNotice("");
    try {
      const response = await apiFetch("/api/auth/admin/user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          adminUserId: member.id,
          gameId: effectiveSelectedGameId,
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

  async function loadLobbyRoomsFromService() {
    setLobbyRoomsBusy(true);
    setLobbyRoomsError("");
    try {
      const response = await apiFetch("/api/auth/lobbies", { method: "GET" });
      const data = (await response.json().catch(() => null)) as { lobbies?: unknown; error?: unknown } | null;
      if (!response.ok) {
        const err = typeof data?.error === "string" ? data.error : "Lobi listesi alinamadi.";
        setLobbyRoomsError(err);
        return;
      }
      const rooms = normalizeLobbyRooms(data?.lobbies);
      setLobbyRooms(rooms);
      setSelectedLobbyId((prev) => {
        const safePrev = sanitizeLobbyId(prev);
        if (safePrev && rooms.some((room) => room.id === safePrev)) return safePrev;
        return rooms[0]?.id || DEFAULT_LOBBY_ID;
      });
      setAdminSelectedLobbyId((prev) => {
        const safePrev = sanitizeLobbyId(prev);
        if (safePrev && rooms.some((room) => room.id === safePrev)) return safePrev;
        return rooms[0]?.id || DEFAULT_LOBBY_ID;
      });
    } catch {
      setLobbyRoomsError("Lobi servisine baglanilamadi.");
    } finally {
      setLobbyRoomsBusy(false);
    }
  }

  async function runAdminLobbyAction(
    action: "createLobby" | "renameLobby" | "deleteLobby",
    payload: Record<string, unknown> = {},
  ) {
    if (!member || member.role !== "admin") return;
    setAdminBusy(true);
    setAdminError("");
    setAdminNotice("");
    try {
      const response = await apiFetch("/api/auth/admin/lobbies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          adminUserId: member.id,
          action,
          ...payload,
        }),
      });
      const data = (await response.json().catch(() => null)) as { lobbies?: unknown; error?: unknown } | null;
      if (!response.ok) {
        const err = typeof data?.error === "string" ? data.error : "Lobi islemi basarisiz.";
        setAdminError(err);
        return;
      }
      const rooms = normalizeLobbyRooms(data?.lobbies);
      setLobbyRooms(rooms);
      setSelectedLobbyId((prev) => {
        const safePrev = sanitizeLobbyId(prev);
        if (safePrev && rooms.some((room) => room.id === safePrev)) return safePrev;
        return rooms[0]?.id || DEFAULT_LOBBY_ID;
      });
      setAdminSelectedLobbyId((prev) => {
        const safePrev = sanitizeLobbyId(prev);
        if (safePrev && rooms.some((room) => room.id === safePrev)) return safePrev;
        return rooms[0]?.id || DEFAULT_LOBBY_ID;
      });
      setAdminNotice("Lobi ayari guncellendi.");
      setAdminLobbyNameDraft("");
    } catch {
      setAdminError("Lobi servisine baglanilamadi.");
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
      const response = await apiFetch("/api/auth/admin/rules", {
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

  function updateDesignTheme<K extends keyof DesignTheme>(key: K, value: DesignTheme[K]) {
    setDesignDraft((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        [key]: value,
      },
    }));
  }

  function updateDesignSizing<K extends keyof DesignSizing>(key: K, value: number) {
    setDesignDraft((prev) => ({
      ...prev,
      sizing: {
        ...prev.sizing,
        [key]: value,
      },
    }));
  }

  function updateDesignText(key: DesignTextKey, value: string) {
    const clean = value.replace(/\s+/g, " ").trim().slice(0, 72);
    setDesignDraft((prev) => ({
      ...prev,
      texts: clean
        ? {
          ...prev.texts,
          [key]: clean,
        }
        : (() => {
          const next = { ...prev.texts };
          delete next[key];
          return next;
        })(),
    }));
  }

  function moveDesignLobbyAction(targetAction: "openTable" | "quickPlay") {
    if (!adminDesignDraggingAction || adminDesignDraggingAction === targetAction) return;
    setDesignDraft((prev) => {
      const order = [...normalizeDesignLayout(prev.layout, createDefaultDesignConfig().layout).lobbyHeaderActions];
      const from = order.indexOf(adminDesignDraggingAction);
      const to = order.indexOf(targetAction);
      if (from < 0 || to < 0 || from === to) return prev;
      order.splice(from, 1);
      order.splice(to, 0, adminDesignDraggingAction);
      return {
        ...prev,
        layout: {
          ...prev.layout,
          lobbyHeaderActions: order,
        },
      };
    });
  }

  async function clearSessionPresenceFromLobby(lobbyId: string, sessionId: string, reason = "lobby-switch-cleanup") {
    const safeLobbyId = sanitizeLobbyId(lobbyId);
    const safeSessionId = sanitizeGuestId(sessionId);
    if (!safeLobbyId || !safeSessionId) return;

    const roomName = sanitizeLobbyName(lobbyRooms.find((room) => room.id === safeLobbyId)?.name || DEFAULT_LOBBY_NAME);
    const storageKey = makeLobbyStateStorageKey(safeLobbyId);
    const channel = makeRealtimeLobbyChannel(safeLobbyId);
    let snapshot = loadLobbyState(storageKey, roomName);

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), HTTP_SYNC_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(buildRealtimeHttpSyncUrl(channel, `${safeSessionId}-cleanup`), {
          method: "GET",
          headers: { "cache-control": "no-store" },
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeoutId);
      }

      if (response.ok) {
        const data = (await response.json().catch(() => null)) as { snapshot?: unknown } | null;
        const incoming = normalizeRealtimeMessage(data?.snapshot);
        if (incoming && incoming.kind === "snapshot" && incoming.channel === channel) {
          snapshot = mergeLobbyStates(snapshot, normalizeLobbyState(incoming.payload));
        }
      }
    } catch {
      // Oda degisimi sirasinda temizlik icin ag hatalarini yoksay.
    }

    const cleanedPresence = cleanupPresenceRows(snapshot.presence).presence;
    const nextPresence = cleanedPresence.filter((entry) => entry.sessionId !== safeSessionId);
    const shouldUpdate = cleanedPresence.length !== snapshot.presence.length || nextPresence.length !== cleanedPresence.length;
    if (!shouldUpdate) return;

    const nextState = normalizeLobbyState({
      ...snapshot,
      presence: nextPresence,
      updatedAt: Date.now(),
    });
    saveJson(storageKey, nextState);

    try {
      realtimeSyncCounterRef.current += 1;
      const outgoing: RealtimeMessage = {
        kind: "snapshot",
        channel,
        sender: safeSessionId,
        counter: realtimeSyncCounterRef.current,
        at: Date.now(),
        payload: nextState,
        reason,
      };
      await fetch(buildRealtimeHttpSyncUrl(channel, safeSessionId), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(outgoing),
      });
    } catch {
      // Sunucuya push basarisiz olsa da yerel temizlik yapilmis olur.
    }
  }

  function moveDesignTopButton(targetAction: "home" | "roomSelect" | "botMode") {
    if (!adminDesignDraggingTopButton || adminDesignDraggingTopButton === targetAction) return;
    setDesignDraft((prev) => {
      const layout = normalizeDesignLayout(prev.layout, createDefaultDesignConfig().layout);
      const order = [...layout.lobbyTopButtons];
      const from = order.indexOf(adminDesignDraggingTopButton);
      const to = order.indexOf(targetAction);
      if (from < 0 || to < 0 || from === to) return prev;
      order.splice(from, 1);
      order.splice(to, 0, adminDesignDraggingTopButton);
      return {
        ...prev,
        layout: {
          ...layout,
          lobbyTopButtons: order,
        },
      };
    });
  }

  function moveDesignRoomOwnerButton(targetAction: "invite" | "private" | "spectator" | "copyLink") {
    if (!adminDesignDraggingRoomOwnerButton || adminDesignDraggingRoomOwnerButton === targetAction) return;
    setDesignDraft((prev) => {
      const layout = normalizeDesignLayout(prev.layout, createDefaultDesignConfig().layout);
      const order = [...layout.roomOwnerButtons];
      const from = order.indexOf(adminDesignDraggingRoomOwnerButton);
      const to = order.indexOf(targetAction);
      if (from < 0 || to < 0 || from === to) return prev;
      order.splice(from, 1);
      order.splice(to, 0, adminDesignDraggingRoomOwnerButton);
      return {
        ...prev,
        layout: {
          ...layout,
          roomOwnerButtons: order,
        },
      };
    });
  }

  function resetDesignDraftToPublished(showNotice = false) {
    setDesignDraft(normalizeDesignConfig(designPublished, designPublished));
    setAdminDesignPreview(true);
    setAdminDesignDraggingAction(null);
    setAdminDesignDraggingTopButton(null);
    setAdminDesignDraggingRoomOwnerButton(null);
    setAdminDesignError("");
    if (showNotice) {
      setAdminDesignNotice("Taslak degisiklikler kaydedilmeden iptal edildi.");
    }
  }

  function leaveAdminWithoutSaving() {
    resetDesignDraftToPublished(false);
    window.location.assign(window.location.pathname);
  }

  async function publishDesignDraft() {
    if (!member || member.role !== "admin") return;
    setAdminDesignBusy(true);
    setAdminDesignError("");
    setAdminDesignNotice("");
    try {
      const response = await apiFetch("/api/auth/admin/design", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          adminUserId: member.id,
          action: "publish",
          design: normalizeDesignConfig(designDraft, designPublished),
        }),
      });
      const data = (await response.json().catch(() => null)) as { design?: unknown; history?: unknown; error?: unknown } | null;
      if (!response.ok) {
        const errorText = typeof data?.error === "string" ? data.error : "Tasarim yayinlanamadi.";
        setAdminDesignError(errorText);
        return;
      }
      const nextDesign = normalizeDesignConfig(data?.design, designDraft);
      const historyRows = Array.isArray(data?.history)
        ? data.history.map((row) => normalizeDesignConfig(row, nextDesign)).sort((a, b) => b.version - a.version).slice(0, 25)
        : [];
      setDesignPublished(nextDesign);
      setDesignDraft(nextDesign);
      setAdminDesignHistory(historyRows);
      setAdminDesignRollbackVersion(historyRows[0]?.version ?? 0);
      setAdminDesignNotice(`Tasarim yayinlandi (v${nextDesign.version}).`);
    } catch {
      setAdminDesignError("Tasarim servisine baglanilamadi.");
    } finally {
      setAdminDesignBusy(false);
    }
  }

  async function rollbackDesignVersion() {
    if (!member || member.role !== "admin") return;
    if (!adminDesignRollbackVersion) return;
    setAdminDesignBusy(true);
    setAdminDesignError("");
    setAdminDesignNotice("");
    try {
      const response = await apiFetch("/api/auth/admin/design", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          adminUserId: member.id,
          action: "rollback",
          version: adminDesignRollbackVersion,
        }),
      });
      const data = (await response.json().catch(() => null)) as { design?: unknown; history?: unknown; error?: unknown } | null;
      if (!response.ok) {
        const errorText = typeof data?.error === "string" ? data.error : "Geri alma basarisiz.";
        setAdminDesignError(errorText);
        return;
      }
      const nextDesign = normalizeDesignConfig(data?.design, designPublished);
      const historyRows = Array.isArray(data?.history)
        ? data.history.map((row) => normalizeDesignConfig(row, nextDesign)).sort((a, b) => b.version - a.version).slice(0, 25)
        : [];
      setDesignPublished(nextDesign);
      setDesignDraft(nextDesign);
      setAdminDesignHistory(historyRows);
      setAdminDesignRollbackVersion(historyRows[0]?.version ?? 0);
      setAdminDesignNotice(`Tasarim geri alindi (v${nextDesign.version}).`);
    } catch {
      setAdminDesignError("Tasarim servisine baglanilamadi.");
    } finally {
      setAdminDesignBusy(false);
    }
  }

  async function resetDesignToDefault() {
    if (!member || member.role !== "admin") return;
    setAdminDesignBusy(true);
    setAdminDesignError("");
    setAdminDesignNotice("");
    try {
      const response = await apiFetch("/api/auth/admin/design", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          adminUserId: member.id,
          action: "resetDefault",
        }),
      });
      const data = (await response.json().catch(() => null)) as { design?: unknown; history?: unknown; error?: unknown } | null;
      if (!response.ok) {
        const errorText = typeof data?.error === "string" ? data.error : "Varsayilan tema yuklenemedi.";
        setAdminDesignError(errorText);
        return;
      }
      const nextDesign = normalizeDesignConfig(data?.design, createDefaultDesignConfig());
      const historyRows = Array.isArray(data?.history)
        ? data.history.map((row) => normalizeDesignConfig(row, nextDesign)).sort((a, b) => b.version - a.version).slice(0, 25)
        : [];
      setDesignPublished(nextDesign);
      setDesignDraft(nextDesign);
      setAdminDesignHistory(historyRows);
      setAdminDesignRollbackVersion(historyRows[0]?.version ?? 0);
      setAdminDesignNotice(`Varsayilan tema yuklendi (v${nextDesign.version}).`);
    } catch {
      setAdminDesignError("Tasarim servisine baglanilamadi.");
    } finally {
      setAdminDesignBusy(false);
    }
  }

  function appendOkeyPrototypeAction(rawText: string) {
    const text = rawText.replace(/\s+/g, " ").trim().slice(0, 160);
    if (!text) return;
    const now = Date.now();
    const id = `okey-proto-${now}-${Math.random().toString(36).slice(2, 8)}`;
    setOkeyPrototypeActionLog((current) => [{ id, at: now, text }, ...current].slice(0, 14));
  }

  function resetOkeyPrototypeTableFilters() {
    const hadAny = okeyPrototypeHasTableFilters;
    setOkeyPrototypeTableFilter("all");
    setOkeyPrototypeOnlyWithFreeSeats(false);
    setOkeyPrototypeTableSort("tableNo");
    setOkeyPrototypeTableSearch("");
    if (hadAny) {
      appendOkeyPrototypeAction("Masa filtreleri sifirlandi.");
    }
  }

  function clearOkeyPrototypeFilterChip(filterKey: string, label: string) {
    let changed = false;
    if ((filterKey === "status-active" && okeyPrototypeTableFilter === "active")
      || (filterKey === "status-waiting" && okeyPrototypeTableFilter === "waiting")) {
      setOkeyPrototypeTableFilter("all");
      changed = true;
    }
    if (filterKey === "free-seats" && okeyPrototypeOnlyWithFreeSeats) {
      setOkeyPrototypeOnlyWithFreeSeats(false);
      changed = true;
    }
    if ((filterKey === "sort-occupancy" && okeyPrototypeTableSort === "occupancy")
      || (filterKey === "sort-status" && okeyPrototypeTableSort === "status")) {
      setOkeyPrototypeTableSort("tableNo");
      changed = true;
    }
    if (filterKey === "search" && okeyPrototypeTableSearch.trim().length > 0) {
      setOkeyPrototypeTableSearch("");
      changed = true;
    }
    if (changed) {
      appendOkeyPrototypeAction(`Filtre kaldirildi: ${label}`);
    }
  }

  function moveOkeyPrototypeTableSelection(step: number) {
    if (okeyPrototypeVisibleTableSketchRows.length === 0) return;
    const currentIndex = okeyPrototypeSelectedTableIndex >= 0 ? okeyPrototypeSelectedTableIndex : 0;
    const targetIndex = Math.max(0, Math.min(okeyPrototypeVisibleTableSketchRows.length - 1, currentIndex + step));
    if (targetIndex === currentIndex) return;
    const targetTable = okeyPrototypeVisibleTableSketchRows[targetIndex];
    if (!targetTable) return;
    setOkeyPrototypeSelectedTableId(targetTable.id);
    appendOkeyPrototypeAction(`Masa gecisi: ${targetTable.tableNo}`);
  }

  function jumpOkeyPrototypeTableSelection(target: "first" | "last") {
    if (okeyPrototypeVisibleTableSketchRows.length === 0) return;
    const targetIndex = target === "first" ? 0 : okeyPrototypeVisibleTableSketchRows.length - 1;
    if (targetIndex === okeyPrototypeSelectedTableIndex) return;
    const targetTable = okeyPrototypeVisibleTableSketchRows[targetIndex];
    if (!targetTable) return;
    setOkeyPrototypeSelectedTableId(targetTable.id);
    appendOkeyPrototypeAction(`Masa gecisi: ${targetTable.tableNo}`);
  }

  function pickRandomOkeyPrototypeTable() {
    if (okeyPrototypeVisibleTableSketchRows.length < 2) return;
    const candidateIndexes = okeyPrototypeVisibleTableSketchRows
      .map((_, index) => index)
      .filter((index) => index !== okeyPrototypeSelectedTableIndex);
    if (candidateIndexes.length === 0) return;
    const randomIndex = candidateIndexes[Math.floor(Math.random() * candidateIndexes.length)];
    const targetTable = okeyPrototypeVisibleTableSketchRows[randomIndex];
    if (!targetTable) return;
    setOkeyPrototypeSelectedTableId(targetTable.id);
    appendOkeyPrototypeAction(`Rastgele masa secildi: ${targetTable.tableNo}`);
  }

  function pickRandomOkeyPrototypeFreeSeatTable() {
    if (okeyPrototypeRandomFreeSeatTableCandidates.length === 0) return;
    const randomIndex = Math.floor(Math.random() * okeyPrototypeRandomFreeSeatTableCandidates.length);
    const targetTable = okeyPrototypeRandomFreeSeatTableCandidates[randomIndex];
    if (!targetTable) return;
    setOkeyPrototypeSelectedTableId(targetTable.id);
    appendOkeyPrototypeAction(`Rastgele bos koltuklu masa secildi: ${targetTable.tableNo}`);
  }

  function selectFirstOkeyPrototypeSearchResult() {
    const targetTable = okeyPrototypeVisibleTableSketchRows[0];
    if (!targetTable) return;
    setOkeyPrototypeSelectedTableId(targetTable.id);
    appendOkeyPrototypeAction(`Arama sonucu secildi: ${targetTable.tableNo}`);
  }

  function buildOkeyPrototypeDrawTile(seatNo: OkeyPrototypeSeatNo, currentLength: number): OkeyPrototypeTile {
    const base = okeyPrototypeTurnRound * 10 + seatNo * 7 + currentLength;
    const color = OKEY_PROTOTYPE_TILE_COLORS[base % OKEY_PROTOTYPE_TILE_COLORS.length];
    const value = (base % 13) + 1;
    return {
      id: `okey-proto-draw-${seatNo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind: "normal",
      color,
      value,
    };
  }

  function getOkeyPrototypeCurrentSeatState(joinedAt = Date.now()): OkeyPrototypeLobbySeatState {
    return {
      userId: sanitizeGuestId(currentProfile.userId),
      sessionId: appSessionId,
      username: currentProfile.username,
      displayName: currentProfile.displayName,
      gender: currentProfile.gender,
      avatarId: currentProfile.avatarId,
      points: currentProfile.points,
      stats: currentProfile.stats,
      joinedAt,
    };
  }

  function getOkeyPrototypeOccupiedSeatNos(table: Pick<OkeyPrototypeLobbyTableState, "seats">): OkeyPrototypeSeatNo[] {
    return OKEY_PROTOTYPE_SEATS.filter((seatNo) => Boolean(table.seats[seatNo]));
  }

  function resetOkeyPrototypeSeatSessionState() {
    setOkeyPrototypeSeatReservation(null);
    setOkeyPrototypeTurnSeat(1);
    setOkeyPrototypeTurnRound(1);
    setOkeyPrototypeTurnPhase("draw");
    setOkeyPrototypeTurnLockedAfterMeld(false);
    setOkeyPrototypeTurnOpeningPoints(0);
    setOkeyPrototypeWallTiles([]);
    setOkeyPrototypeIndicatorTile(null);
    setOkeyPrototypeOkeyTile(null);
    setOkeyPrototypeDiscardPile([]);
    setOkeyPrototypePendingDiscardTileId("");
    setOkeyPrototypeDiscardDraftTileId("");
    setOkeyPrototypeMeldDraftTileIds([]);
    setOkeyPrototypeOpenedMelds([]);
    setOkeyPrototypeAttachTargetMeldId("");
    setOkeyPrototypeSeatOpenedState(createDefaultOkeyPrototypeSeatOpenedState());
    setOkeyPrototypeWinnerSeat(null);
    setOkeyPrototypeHandDrawn(false);
    setOkeyPrototypeSessionHandNo(1);
    setOkeyPrototypeHandFirstSeat(1);
    setOkeyPrototypeSeatHandWins(createDefaultOkeyPrototypeSeatWinState());
    setOkeyPrototypeSeatPenaltyTotals(createDefaultOkeyPrototypeSeatWinState());
    setOkeyPrototypeDrawHandCount(0);
    setOkeyPrototypeLastHandSummary("");
    setOkeyPrototypeBotModeEnabled(false);
  }

  function reserveOkeyPrototypeSeat(
    tableRow: OkeyPrototypeTableSketchRow,
    seatDraftNo: number,
    sourceLabel: string,
  ) {
    const reservedSeat = Math.max(1, Math.min(4, seatDraftNo)) as OkeyPrototypeSeatNo;
    const now = Date.now();
    const safeUserId = sanitizeGuestId(currentProfile.userId);
    const currentSeatState = getOkeyPrototypeCurrentSeatState(now);
    const roomId = tableRow.roomId;
    const roomTables = (okeyPrototypeTablesByRoom[roomId] ?? []).slice();
    const tableIndex = roomTables.findIndex((table) => table.id === tableRow.id);
    if (tableIndex < 0) {
      setLobbyNotice("Masa bulunamadi.");
      return;
    }
    const seatedAtOtherTable = Object.values(okeyPrototypeTablesByRoom).some((tables) => tables.some((table) => {
      if (table.id === tableRow.id) return false;
      return OKEY_PROTOTYPE_SEATS.some((seatNo) => {
        const occupant = table.seats[seatNo];
        if (!occupant) return false;
        return sanitizeGuestId(occupant.userId) === safeUserId || occupant.sessionId === appSessionId;
      });
    }));
    if (seatedAtOtherTable) {
      setLobbyNotice("Ayni anda sadece bir 101 masasinda oturabilirsin.");
      return;
    }

    const table = roomTables[tableIndex];
    if (!table) {
      setLobbyNotice("Masa bulunamadi.");
      return;
    }
    const occupiedSeatNos = getOkeyPrototypeOccupiedSeatNos(table);
    const occupiedSeat = table.seats[reservedSeat];
    if (occupiedSeat && sanitizeGuestId(occupiedSeat.userId) !== safeUserId && occupiedSeat.sessionId !== appSessionId) {
      setLobbyNotice("Bu koltuk dolu. Baska bir koltuk sec.");
      return;
    }
    if (occupiedSeatNos.length >= 4 && !occupiedSeat) {
      setLobbyNotice("Masa dolu. Baska bir masa sec.");
      return;
    }

    const nextSeats = {
      ...table.seats,
      [reservedSeat]: currentSeatState,
    };
    const nextOccupiedSeatNos = getOkeyPrototypeOccupiedSeatNos({ seats: nextSeats });
    const shouldStart = nextOccupiedSeatNos.length >= 4;
    const startedNow = shouldStart && !table.startedAt;
    const nextTable: OkeyPrototypeLobbyTableState = {
      ...table,
      ownerUserId: table.ownerUserId || safeUserId,
      ownerSessionId: table.ownerSessionId || appSessionId,
      seats: nextSeats,
      startedAt: shouldStart ? (table.startedAt ?? now) : null,
    };
    setOkeyPrototypeTablesByRoom((current) => {
      const nextRoomTables = (current[roomId] ?? []).slice();
      const nextIndex = nextRoomTables.findIndex((entry) => entry.id === tableRow.id);
      if (nextIndex < 0) return current;
      nextRoomTables[nextIndex] = nextTable;
      return {
        ...current,
        [roomId]: nextRoomTables,
      };
    });
    setOkeyPrototypeSelectedTableId(tableRow.id);
    setOkeyPrototypeSeatDraft(reservedSeat);
    setOkeyPrototypeSeatReservation({
      tableId: tableRow.id,
      seatNo: reservedSeat,
    });
    if (startedNow && nextOccupiedSeatNos.length >= 4) {
      setOkeyPrototypeSessionHandNo(1);
      setOkeyPrototypeSeatHandWins(createDefaultOkeyPrototypeSeatWinState());
      setOkeyPrototypeSeatPenaltyTotals(createDefaultOkeyPrototypeSeatWinState());
      setOkeyPrototypeDrawHandCount(0);
      setOkeyPrototypeLastHandSummary("");
      const ownerSeat = nextOccupiedSeatNos.find((seatNo) => sanitizeGuestId(nextTable.seats[seatNo]?.userId ?? "") === sanitizeGuestId(nextTable.ownerUserId ?? ""))
        ?? nextOccupiedSeatNos[0]
        ?? reservedSeat;
      applyOkeyPrototypeDeal(ownerSeat, nextTable.startedAt ?? Date.now(), nextOccupiedSeatNos);
      setLobbyNotice(`Masa ${tableRow.tableNo} doldu. Oyun basladi.`);
      appendOkeyPrototypeAction(`Oyun basladi: Masa ${tableRow.tableNo} (4/4)`);
    } else {
      const waitingPlayers = Math.max(0, 4 - nextOccupiedSeatNos.length);
      setLobbyNotice(`Masa ${tableRow.tableNo} / Koltuk ${reservedSeat}. Oyun icin ${waitingPlayers} oyuncu bekleniyor.`);
    }
    appendOkeyPrototypeAction(`${sourceLabel}: Masa ${tableRow.tableNo}, Koltuk ${reservedSeat}`);
  }

  function leaveOkeyPrototypeSeat(sourceLabel: string) {
    const reservation = okeyPrototypeSeatReservation;
    if (!reservation) return;
    let leftTableNo = 0;
    let tableClosed = false;
    let leftSuccessfully = false;
    const safeUserId = sanitizeGuestId(currentProfile.userId);
    setOkeyPrototypeTablesByRoom((current) => {
      const nextState: Record<string, OkeyPrototypeLobbyTableState[]> = {};
      Object.entries(current).forEach(([roomId, tables]) => {
        nextState[roomId] = tables.slice();
      });
      for (const [roomId, tables] of Object.entries(nextState)) {
        const tableIndex = tables.findIndex((table) => table.id === reservation.tableId);
        if (tableIndex < 0) continue;
        const table = tables[tableIndex];
        if (!table) return current;
        leftTableNo = table.tableNo;
        const nextSeats: Partial<Record<OkeyPrototypeSeatNo, OkeyPrototypeLobbySeatState>> = { ...table.seats };
        const reservedSeatNo = Math.max(1, Math.min(4, reservation.seatNo)) as OkeyPrototypeSeatNo;
        const reservedSeat = nextSeats[reservedSeatNo];
        const canRemoveReservedSeat = Boolean(
          reservedSeat
          && (sanitizeGuestId(reservedSeat.userId) === safeUserId || reservedSeat.sessionId === appSessionId),
        );
        if (canRemoveReservedSeat) {
          delete nextSeats[reservedSeatNo];
        } else {
          const fallbackSeatNo = OKEY_PROTOTYPE_SEATS.find((seatNo) => {
            const occupant = nextSeats[seatNo];
            if (!occupant) return false;
            return sanitizeGuestId(occupant.userId) === safeUserId || occupant.sessionId === appSessionId;
          });
          if (!fallbackSeatNo) {
            return current;
          }
          delete nextSeats[fallbackSeatNo];
        }

        const occupiedSeatNos = getOkeyPrototypeOccupiedSeatNos({ seats: nextSeats });
        if (occupiedSeatNos.length === 0) {
          tables.splice(tableIndex, 1);
          tableClosed = true;
        } else {
          const nextOwnerSeat = occupiedSeatNos[0];
          const nextOwner = nextOwnerSeat ? nextSeats[nextOwnerSeat] ?? null : null;
          const nextTable: OkeyPrototypeLobbyTableState = {
            ...table,
            seats: nextSeats,
            ownerUserId: nextOwner?.userId ?? "",
            ownerSessionId: nextOwner?.sessionId ?? "",
            startedAt: occupiedSeatNos.length >= 4 ? table.startedAt ?? Date.now() : null,
          };
          tables[tableIndex] = nextTable;
        }
        nextState[roomId] = tables;
        leftSuccessfully = true;
        return nextState;
      }
      return current;
    });

    if (!leftSuccessfully) {
      setLobbyNotice("Masadan ayrilma tamamlanamadi.");
      return;
    }
    appendOkeyPrototypeAction(`${sourceLabel}: Masa ${leftTableNo}, Koltuk ${reservation.seatNo}`);
    resetOkeyPrototypeSeatSessionState();
    if (tableClosed) {
      setLobbyNotice(`Masa ${leftTableNo} kapandi.`);
    } else {
      setLobbyNotice(`Masa ${leftTableNo} masasindan ayrildin.`);
    }
  }

  function adminCloseOkeyPrototypeTable(tableRow: OkeyPrototypeTableSketchRow) {
    if (!isAdmin) return;
    let removed = false;
    setOkeyPrototypeTablesByRoom((current) => {
      const roomTables = (current[tableRow.roomId] ?? []).slice();
      const nextRoomTables = roomTables.filter((table) => table.id !== tableRow.id);
      if (nextRoomTables.length === roomTables.length) {
        return current;
      }
      removed = true;
      return {
        ...current,
        [tableRow.roomId]: nextRoomTables,
      };
    });
    if (!removed) {
      setLobbyNotice("Masa kapatilamadi.");
      return;
    }
    if (okeyPrototypeSeatReservation?.tableId === tableRow.id) {
      resetOkeyPrototypeSeatSessionState();
    }
    setLobbyNotice(`Masa ${tableRow.tableNo} admin tarafindan kapatildi.`);
    appendOkeyPrototypeAction(`Admin masa kapatti: Masa ${tableRow.tableNo}`);
  }

  function applyOkeyPrototypeDeal(
    firstSeat: OkeyPrototypeSeatNo,
    seed = Date.now(),
    activeSeats: readonly OkeyPrototypeSeatNo[] = OKEY_PROTOTYPE_SEATS,
  ) {
    const deal = createOkeyPrototypeDealState(seed, firstSeat, activeSeats);
    setOkeyPrototypeRackState(deal.rackState);
    setOkeyPrototypeWallTiles(deal.wallTiles);
    setOkeyPrototypeIndicatorTile(deal.indicatorTile);
    setOkeyPrototypeOkeyTile(deal.okeyTile);
    setOkeyPrototypeSahteOkeyCount(2);
    setOkeyPrototypeTurnSeat(deal.turnSeat);
    setOkeyPrototypeHandFirstSeat(firstSeat);
    setOkeyPrototypeTurnRound(deal.turnRound);
    setOkeyPrototypeTurnPhase(deal.turnPhase);
    setOkeyPrototypeTurnLockedAfterMeld(false);
    setOkeyPrototypeTurnOpeningPoints(0);
    setOkeyPrototypeDiscardPile([]);
    setOkeyPrototypePendingDiscardTileId("");
    setOkeyPrototypeDiscardDraftTileId("");
    setOkeyPrototypeMeldDraftTileIds([]);
    setOkeyPrototypeOpenedMelds([]);
    setOkeyPrototypeAttachTargetMeldId("");
    setOkeyPrototypeSeatOpenedState(createDefaultOkeyPrototypeSeatOpenedState());
    setOkeyPrototypeWinnerSeat(null);
    setOkeyPrototypeHandDrawn(false);
  }

  function moveOkeyPrototypeTurnToNextSeat() {
    const seats = okeyPrototypeActiveTurnSeats.length > 0
      ? okeyPrototypeActiveTurnSeats
      : [okeyPrototypeTurnSeat as OkeyPrototypeSeatNo];
    const currentIndex = seats.findIndex((seatNo) => seatNo === okeyPrototypeTurnSeat);
    const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (safeCurrentIndex + 1) % seats.length;
    const nextSeat = seats[nextIndex] ?? seats[0] ?? (okeyPrototypeTurnSeat as OkeyPrototypeSeatNo);
    setOkeyPrototypeTurnSeat(nextSeat);
    setOkeyPrototypeTurnPhase("draw");
    setOkeyPrototypeTurnLockedAfterMeld(false);
    setOkeyPrototypeTurnOpeningPoints(0);
    setOkeyPrototypePendingDiscardTileId("");
    setOkeyPrototypeDiscardDraftTileId("");
    setOkeyPrototypeMeldDraftTileIds([]);
    setOkeyPrototypeAttachTargetMeldId("");
    if (nextIndex === 0) {
      const nextRound = okeyPrototypeTurnRound + 1;
      setOkeyPrototypeTurnRound(nextRound);
      return { nextSeat, nextRound };
    }
    return { nextSeat, nextRound: okeyPrototypeTurnRound };
  }

  function selectOkeyPrototypeDiscardDraft(tileId: string) {
    if (!okeyPrototypeCanAdvanceTurn) return;
    if (okeyPrototypeTurnPhase !== "discard") {
      appendOkeyPrototypeAction("Gecersiz hamle: Tas secmek icin once tas cekmelisin.");
      return;
    }
    const tile = okeyPrototypeSeatRackTiles.find((entry) => entry.id === tileId);
    if (!tile) return;
    setOkeyPrototypeDiscardDraftTileId(tileId);
    appendOkeyPrototypeAction(`Atilacak tas secildi: ${formatOkeyPrototypeTile(tile)}`);
  }

  function toggleOkeyPrototypeMeldDraftTile(tileId: string) {
    if (!okeyPrototypeCanAdvanceTurn) return;
    if (okeyPrototypeTurnPhase !== "discard") {
      appendOkeyPrototypeAction("Gecersiz hamle: Per acmak icin once tas cekmelisin.");
      return;
    }
    const tile = okeyPrototypeSeatRackTiles.find((entry) => entry.id === tileId);
    if (!tile) return;
    setOkeyPrototypeMeldDraftTileIds((current) => {
      if (current.includes(tileId)) {
        return current.filter((entry) => entry !== tileId);
      }
      return [...current, tileId];
    });
  }

  function clearOkeyPrototypeMeldDraft() {
    if (okeyPrototypeMeldDraftTileIds.length === 0) return;
    setOkeyPrototypeMeldDraftTileIds([]);
    appendOkeyPrototypeAction("Per taslagi temizlendi.");
  }

  function clearOkeyPrototypeTileSelections() {
    if (!okeyPrototypeDiscardDraftTileId && okeyPrototypeMeldDraftTileIds.length === 0) return;
    setOkeyPrototypeDiscardDraftTileId("");
    setOkeyPrototypeMeldDraftTileIds([]);
    appendOkeyPrototypeAction("Tahta secimi temizlendi.");
  }

  function selectOkeyPrototypeAttachTarget(meldId: string) {
    const target = okeyPrototypeOpenedMelds.find((meld) => meld.id === meldId);
    if (!target) return;
    if (okeyPrototypeAttachTargetMeldId === target.id) {
      setOkeyPrototypeAttachTargetMeldId("");
      appendOkeyPrototypeAction("Per ekleme hedefi temizlendi.");
      return;
    }
    setOkeyPrototypeAttachTargetMeldId(target.id);
    appendOkeyPrototypeAction(`Per ekleme hedefi secildi: K${target.seatNo} | El ${target.round}`);
  }

  function openOkeyPrototypeMeld() {
    if (okeyPrototypeHandCompleted) {
      appendOkeyPrototypeAction("Gecersiz hamle: El tamamlandi. Yeni el baslat.");
      return;
    }
    if (!okeyPrototypeCanAdvanceTurn) return;
    if (okeyPrototypeTurnPhase !== "discard") {
      appendOkeyPrototypeAction("Gecersiz hamle: Per acmak icin once tas cekmelisin.");
      return;
    }
    if (okeyPrototypeMeldDraftTiles.length < 3) {
      appendOkeyPrototypeAction("Gecersiz hamle: Per acmak icin en az 3 tas sec.");
      return;
    }
    const validation = evaluateOkeyPrototypeMeldDraft(okeyPrototypeMeldDraftTiles, okeyPrototypeOkeyTile);
    if (!validation.valid || !validation.kind) {
      appendOkeyPrototypeAction(`Gecersiz per: ${validation.reason}`);
      return;
    }
    const seatNo = okeyPrototypeTurnSeat as OkeyPrototypeSeatNo;
    const nextTileCountAfterMeld = okeyPrototypeSeatRackTiles.length - okeyPrototypeMeldDraftTiles.length;
    if (nextTileCountAfterMeld < 1) {
      appendOkeyPrototypeAction("Gecersiz per: Turu bitirmek icin en az 1 tas elde kalmali.");
      return;
    }
    const selectedIds = new Set(okeyPrototypeMeldDraftTiles.map((tile) => tile.id));
    const consumedPendingDiscardTile = okeyPrototypePendingDiscardTileId
      ? selectedIds.has(okeyPrototypePendingDiscardTileId)
      : false;
    const meldPoints = getOkeyPrototypeMeldPointsWithJokers(okeyPrototypeMeldDraftTiles, okeyPrototypeOkeyTile);
    setOkeyPrototypeRackState((current) => ({
      ...current,
      [seatNo]: (current[seatNo] ?? []).filter((tile) => !selectedIds.has(tile.id)),
    }));
    const meldEntry: OkeyPrototypeMeldEntry = {
      id: `okey-proto-meld-${seatNo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      seatNo,
      round: okeyPrototypeTurnRound,
      tiles: okeyPrototypeMeldDraftTiles.slice().sort((left, right) => left.value - right.value),
      kind: validation.kind,
      at: Date.now(),
    };
    setOkeyPrototypeOpenedMelds((current) => [meldEntry, ...current].slice(0, 40));
    setOkeyPrototypeAttachTargetMeldId(meldEntry.id);
    setOkeyPrototypeMeldDraftTileIds([]);
    if (consumedPendingDiscardTile) {
      setOkeyPrototypePendingDiscardTileId("");
    }
    setOkeyPrototypeTurnLockedAfterMeld(true);
    if (!okeyPrototypeSeatOpenedState[seatNo]) {
      const nextOpeningPoints = okeyPrototypeTurnOpeningPoints + meldPoints;
      setOkeyPrototypeTurnOpeningPoints(nextOpeningPoints);
      if (nextOpeningPoints >= OKEY_PROTOTYPE_OPENING_TARGET_POINTS) {
        setOkeyPrototypeSeatOpenedState((current) => ({
          ...current,
          [seatNo]: true,
        }));
        appendOkeyPrototypeAction(`El acildi: Koltuk ${seatNo} (${nextOpeningPoints}/${OKEY_PROTOTYPE_OPENING_TARGET_POINTS})`);
      } else {
        appendOkeyPrototypeAction(`Acilis puani: ${nextOpeningPoints}/${OKEY_PROTOTYPE_OPENING_TARGET_POINTS}`);
      }
    }
    appendOkeyPrototypeAction(`Per acildi: ${validation.kind} (${meldEntry.tiles.map((tile) => formatOkeyPrototypeTile(tile)).join(", ")})`);
  }

  function openOkeyPrototypePairs() {
    if (okeyPrototypeHandCompleted) {
      appendOkeyPrototypeAction("Gecersiz hamle: El tamamlandi. Yeni el baslat.");
      return;
    }
    if (!okeyPrototypeCanAdvanceTurn) return;
    if (okeyPrototypeTurnPhase !== "discard") {
      appendOkeyPrototypeAction("Cift acmak icin once tas cekmelisin.");
      return;
    }
    const seatNo = okeyPrototypeTurnSeat as OkeyPrototypeSeatNo;
    if (okeyPrototypeSeatOpenedState[seatNo]) {
      appendOkeyPrototypeAction(`Koltuk ${seatNo} zaten acik.`);
      return;
    }
    const pairCount = countOkeyPrototypeIdenticalPairs(okeyPrototypeSeatRackTiles, okeyPrototypeOkeyTile);
    if (pairCount < OKEY_PROTOTYPE_PAIR_OPEN_MIN_PAIRS) {
      appendOkeyPrototypeAction(`Cift acmak icin en az ${OKEY_PROTOTYPE_PAIR_OPEN_MIN_PAIRS} cift gerekir (su an ${pairCount}).`);
      return;
    }
    setOkeyPrototypeSeatOpenedState((current) => ({
      ...current,
      [seatNo]: true,
    }));
    setOkeyPrototypeTurnOpeningPoints(OKEY_PROTOTYPE_OPENING_TARGET_POINTS);
    setOkeyPrototypePendingDiscardTileId("");
    appendOkeyPrototypeAction(`El cift acildi: Koltuk ${seatNo} (${pairCount} cift).`);
  }

  function attachOkeyPrototypeTileToMeld() {
    if (okeyPrototypeHandCompleted) {
      appendOkeyPrototypeAction("Gecersiz hamle: El tamamlandi. Yeni el baslat.");
      return;
    }
    if (!okeyPrototypeCanAdvanceTurn) return;
    if (okeyPrototypeTurnPhase !== "discard") {
      appendOkeyPrototypeAction("Gecersiz hamle: Per eklemek icin once tas cekmelisin.");
      return;
    }
    if (!okeyPrototypeCurrentSeatOpened) {
      appendOkeyPrototypeAction("Gecersiz hamle: Per eklemek icin once elini acmalisin.");
      return;
    }
    const targetMeld = okeyPrototypeAttachTargetMeld;
    if (!targetMeld) {
      appendOkeyPrototypeAction("Gecersiz hamle: Per eklemek icin acik bir per sec.");
      return;
    }
    const tile = okeyPrototypeDiscardDraftTile;
    if (!tile) {
      appendOkeyPrototypeAction("Gecersiz hamle: Per eklemek icin raftan bir tas sec.");
      return;
    }
    const validation = canAttachOkeyPrototypeTileToMeld(tile, targetMeld, okeyPrototypeOkeyTile);
    if (!validation.valid) {
      appendOkeyPrototypeAction(`Gecersiz hamle: ${validation.reason}`);
      return;
    }
    const seatNo = okeyPrototypeTurnSeat as OkeyPrototypeSeatNo;
    const currentRack = okeyPrototypeSeatRackTiles;
    const selectedIndex = currentRack.findIndex((entry) => entry.id === tile.id);
    if (selectedIndex < 0) {
      appendOkeyPrototypeAction("Gecersiz hamle: Secilen tas rafta bulunamadi.");
      return;
    }
    if (currentRack.length - 1 < 1) {
      appendOkeyPrototypeAction("Gecersiz hamle: Turu bitirmek icin en az 1 tas elde kalmali.");
      return;
    }
    const attachedTile = currentRack[selectedIndex];
    setOkeyPrototypeRackState((current) => ({
      ...current,
      [seatNo]: (current[seatNo] ?? []).filter((entry) => entry.id !== attachedTile.id),
    }));
    setOkeyPrototypeOpenedMelds((current) => current.map((meld) => {
      if (meld.id !== targetMeld.id) return meld;
      return {
        ...meld,
        tiles: [...meld.tiles, attachedTile].slice().sort((left, right) => left.value - right.value),
      };
    }));
    if (okeyPrototypePendingDiscardTileId && attachedTile.id === okeyPrototypePendingDiscardTileId) {
      setOkeyPrototypePendingDiscardTileId("");
    }
    setOkeyPrototypeDiscardDraftTileId("");
    appendOkeyPrototypeAction(`Per genisletildi: K${targetMeld.seatNo} / El ${targetMeld.round} -> ${formatOkeyPrototypeTile(attachedTile)} eklendi.`);
  }

  function drawOkeyPrototypeTile() {
    if (okeyPrototypeHandCompleted) {
      appendOkeyPrototypeAction("Gecersiz hamle: El tamamlandi. Yeni el baslat.");
      return;
    }
    if (!okeyPrototypeCanAdvanceTurn) return;
    if (okeyPrototypeTurnPhase !== "draw") {
      appendOkeyPrototypeAction("Gecersiz hamle: Once tas atmalisin.");
      return;
    }
    const topWallTile = okeyPrototypeWallTiles[0] ?? null;
    if (!topWallTile || okeyPrototypeDrawPileRemaining <= 0) {
      if (okeyPrototypeDiscardPile.length === 0) {
        setOkeyPrototypeHandDrawn(true);
        setOkeyPrototypeDrawHandCount((current) => current + 1);
        setOkeyPrototypeLastHandSummary(`El ${okeyPrototypeSessionHandNo}: Berabere bitti.`);
        appendOkeyPrototypeAction("El berabere bitti: Ortada ve kapali destede tas kalmadi.");
        return;
      }
      appendOkeyPrototypeAction("Gecersiz hamle: Kapali destede tas kalmadi.");
      return;
    }
    const seatNo = okeyPrototypeTurnSeat as OkeyPrototypeSeatNo;
    const currentRack = okeyPrototypeRackState[seatNo] ?? [];
    if (currentRack.length !== OKEY_PROTOTYPE_HAND_TILE_COUNT) {
      appendOkeyPrototypeAction(`Gecersiz hamle: Tas cekmek icin rafta ${OKEY_PROTOTYPE_HAND_TILE_COUNT} tas olmali (su an ${currentRack.length}).`);
      return;
    }
    const tile = topWallTile ?? buildOkeyPrototypeDrawTile(seatNo, currentRack.length);
    setOkeyPrototypeWallTiles((current) => current.slice(1));
    setOkeyPrototypeRackState((current) => ({
      ...current,
      [seatNo]: (() => {
        const nextRack = [...(current[seatNo] ?? []), tile];
        if (okeyPrototypeAutoSortMode === "off") return nextRack;
        return sortOkeyPrototypeRackTiles(nextRack, okeyPrototypeAutoSortMode, okeyPrototypeOkeyTile);
      })(),
    }));
    setOkeyPrototypeTurnPhase("discard");
    setOkeyPrototypePendingDiscardTileId("");
    setOkeyPrototypeDiscardDraftTileId(tile.id);
    appendOkeyPrototypeAction(`Tas cekildi: Koltuk ${seatNo} (${formatOkeyPrototypeTile(tile)})`);
    if (okeyPrototypeDrawPileRemaining === 1) {
      appendOkeyPrototypeAction("Kapali deste bitti: Son tas cekildi.");
    }
  }

  function drawOkeyPrototypeTileFromDiscard() {
    if (okeyPrototypeHandCompleted) {
      appendOkeyPrototypeAction("Gecersiz hamle: El tamamlandi. Yeni el baslat.");
      return;
    }
    if (!okeyPrototypeCanAdvanceTurn) return;
    if (okeyPrototypeTurnPhase !== "draw") {
      appendOkeyPrototypeAction("Gecersiz hamle: Ortadan tas almak icin once tas atmalisin.");
      return;
    }
    const topDiscard = okeyPrototypeDiscardPile[0];
    if (!topDiscard) {
      if (okeyPrototypeDrawPileRemaining <= 0) {
        setOkeyPrototypeHandDrawn(true);
        setOkeyPrototypeDrawHandCount((current) => current + 1);
        setOkeyPrototypeLastHandSummary(`El ${okeyPrototypeSessionHandNo}: Berabere bitti.`);
        appendOkeyPrototypeAction("El berabere bitti: Ortada ve kapali destede tas kalmadi.");
        return;
      }
      appendOkeyPrototypeAction("Gecersiz hamle: Ortada alinacak tas yok.");
      return;
    }
    const seatNo = okeyPrototypeTurnSeat as OkeyPrototypeSeatNo;
    const currentRack = okeyPrototypeRackState[seatNo] ?? [];
    if (!okeyPrototypeCurrentSeatOpened && !canOkeyPrototypeTakeDiscardWhenClosed(currentRack, topDiscard.tile, okeyPrototypeOkeyTile)) {
      appendOkeyPrototypeAction("Ortadan bu tasi alabilmek icin ayni turde 101 veya 5 cift ile acilis yapabilmelisin.");
      return;
    }
    if (currentRack.length !== OKEY_PROTOTYPE_HAND_TILE_COUNT) {
      appendOkeyPrototypeAction(`Gecersiz hamle: Ortadan tas almak icin rafta ${OKEY_PROTOTYPE_HAND_TILE_COUNT} tas olmali (su an ${currentRack.length}).`);
      return;
    }
    const tile = {
      id: `okey-proto-discard-pick-${seatNo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind: topDiscard.tile.kind,
      color: topDiscard.tile.color,
      value: topDiscard.tile.value,
    };
    setOkeyPrototypeDiscardPile((current) => current.slice(1));
    setOkeyPrototypeRackState((current) => ({
      ...current,
      [seatNo]: (() => {
        const nextRack = [...(current[seatNo] ?? []), tile];
        if (okeyPrototypeAutoSortMode === "off") return nextRack;
        return sortOkeyPrototypeRackTiles(nextRack, okeyPrototypeAutoSortMode, okeyPrototypeOkeyTile);
      })(),
    }));
    setOkeyPrototypeTurnPhase("discard");
    setOkeyPrototypePendingDiscardTileId(tile.id);
    setOkeyPrototypeDiscardDraftTileId(tile.id);
    appendOkeyPrototypeAction(
      `Ortadan tas alindi: Koltuk ${seatNo} (${formatOkeyPrototypeTile(tile)}) [K${topDiscard.seatNo} / El ${topDiscard.round}]`,
    );
  }

  function discardOkeyPrototypeTileWithForced(forcedTileId?: string) {
    if (okeyPrototypeHandCompleted) {
      appendOkeyPrototypeAction("Gecersiz hamle: El tamamlandi. Yeni el baslat.");
      return;
    }
    if (!okeyPrototypeCanAdvanceTurn) return;
    if (okeyPrototypeDiscardBlockedByOpening) {
      appendOkeyPrototypeAction(`Gecersiz hamle: Once ${okeyPrototypeOpeningRemainingPoints} puan daha acilis peri acmalisin.`);
      return;
    }
    if (okeyPrototypePendingDiscardTileId) {
      const pendingTile = okeyPrototypeSeatRackTiles.find((tile) => tile.id === okeyPrototypePendingDiscardTileId);
      if (pendingTile) {
        appendOkeyPrototypeAction(`Gecersiz hamle: Ortadan aldigin ${formatOkeyPrototypeTile(pendingTile)} tasini hemen islemelisin.`);
      } else {
        appendOkeyPrototypeAction("Gecersiz hamle: Ortadan alinan tas once islenmeli.");
      }
      return;
    }
    if (okeyPrototypeTurnPhase !== "discard") {
      appendOkeyPrototypeAction("Gecersiz hamle: Once tas cekmelisin.");
      return;
    }
    const seatNo = okeyPrototypeTurnSeat as OkeyPrototypeSeatNo;
    const currentRack = okeyPrototypeRackState[seatNo] ?? [];
    if (currentRack.length === 0) {
      appendOkeyPrototypeAction("Gecersiz hamle: Atacak tas yok.");
      return;
    }
    let droppedTile = currentRack[currentRack.length - 1];
    let nextRack = currentRack.slice(0, -1);
    const selectedTileId = forcedTileId || okeyPrototypeDiscardDraftTileId;
    if (selectedTileId) {
      const selectedIndex = currentRack.findIndex((tile) => tile.id === selectedTileId);
      if (selectedIndex >= 0) {
        droppedTile = currentRack[selectedIndex];
        nextRack = currentRack.filter((_, index) => index !== selectedIndex);
      }
    }
    const discardEntry: OkeyPrototypeDiscardEntry = {
      id: `okey-proto-discard-${seatNo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      seatNo,
      tile: droppedTile,
      round: okeyPrototypeTurnRound,
      at: Date.now(),
    };
    setOkeyPrototypeRackState((current) => ({
      ...current,
      [seatNo]: nextRack,
    }));
    setOkeyPrototypeDiscardDraftTileId("");
    setOkeyPrototypeTurnLockedAfterMeld(false);
    setOkeyPrototypeDiscardPile((current) => [discardEntry, ...current].slice(0, 40));
    if (nextRack.length === 0) {
      const jokerFinish = isOkeyPrototypeJokerTile(droppedTile, okeyPrototypeOkeyTile);
      const penaltyDelta = createDefaultOkeyPrototypeSeatWinState();
      OKEY_PROTOTYPE_SEATS.forEach((seat) => {
        if (seat === seatNo) return;
        const seatRack = okeyPrototypeRackState[seat] ?? [];
        let penalty = getOkeyPrototypeRackPenaltyPoints(seatRack, okeyPrototypeOkeyTile);
        if (jokerFinish) {
          penalty *= 2;
        }
        penaltyDelta[seat] = penalty;
      });
      setOkeyPrototypeSeatPenaltyTotals((current) => ({
        1: (current[1] ?? 0) + (penaltyDelta[1] ?? 0),
        2: (current[2] ?? 0) + (penaltyDelta[2] ?? 0),
        3: (current[3] ?? 0) + (penaltyDelta[3] ?? 0),
        4: (current[4] ?? 0) + (penaltyDelta[4] ?? 0),
      }));
      setOkeyPrototypeWinnerSeat(seatNo);
      setOkeyPrototypeSeatHandWins((current) => ({
        ...current,
        [seatNo]: (current[seatNo] ?? 0) + 1,
      }));
      const penaltyText = OKEY_PROTOTYPE_SEATS
        .filter((seat) => seat !== seatNo)
        .map((seat) => `K${seat}: ${penaltyDelta[seat] ?? 0}`)
        .join(" | ");
      setOkeyPrototypeLastHandSummary(`El ${okeyPrototypeSessionHandNo}: Koltuk ${seatNo} kazandi. Ceza: ${penaltyText}`);
      appendOkeyPrototypeAction(`El tamamlandi: Koltuk ${seatNo} bu eli kazandi.${jokerFinish ? " Okey ile bitti (cezalar x2)." : ""}`);
      appendOkeyPrototypeAction("Yeni el icin 'Yeni El Baslat' butonunu kullan.");
      return;
    }
    const next = moveOkeyPrototypeTurnToNextSeat();
    appendOkeyPrototypeAction(
      `Tas atildi: Koltuk ${seatNo} (${formatOkeyPrototypeTile(droppedTile)}) -> Siradaki Koltuk ${next.nextSeat} (El ${next.nextRound})`,
    );
  }

  function discardOkeyPrototypeTile() {
    discardOkeyPrototypeTileWithForced();
  }

  function resetOkeyPrototypeTurn() {
    if (!okeyPrototypeSeatReservation) return;
    const baseSeat = Math.max(1, Math.min(4, okeyPrototypeSeatReservation.seatNo)) as 1 | 2 | 3 | 4;
    setOkeyPrototypeTurnSeat(baseSeat);
    setOkeyPrototypeTurnRound(1);
    const baseRack = okeyPrototypeRackState[baseSeat] ?? [];
    setOkeyPrototypeTurnPhase(baseRack.length > OKEY_PROTOTYPE_HAND_TILE_COUNT ? "discard" : "draw");
    setOkeyPrototypeTurnLockedAfterMeld(false);
    setOkeyPrototypeTurnOpeningPoints(0);
    setOkeyPrototypePendingDiscardTileId("");
    setOkeyPrototypeDiscardDraftTileId("");
    setOkeyPrototypeMeldDraftTileIds([]);
    setOkeyPrototypeAttachTargetMeldId("");
    setOkeyPrototypeSeatOpenedState(createDefaultOkeyPrototypeSeatOpenedState());
    setOkeyPrototypeWinnerSeat(null);
    setOkeyPrototypeHandDrawn(false);
    appendOkeyPrototypeAction(`Tur sifirlandi: Koltuk ${baseSeat}`);
  }

  function startNewOkeyPrototypeHand() {
    if (!okeyPrototypeSeatReservation) return;
    const baseSeat = Math.max(1, Math.min(4, okeyPrototypeSeatReservation.seatNo)) as OkeyPrototypeSeatNo;
    const activeSeats = okeyPrototypeActiveTurnSeats.length > 0
      ? okeyPrototypeActiveTurnSeats
      : [baseSeat];
    let nextFirstSeat: OkeyPrototypeSeatNo = baseSeat;
    if (okeyPrototypeWinnerSeat && activeSeats.includes(okeyPrototypeWinnerSeat)) {
      nextFirstSeat = okeyPrototypeWinnerSeat;
    } else {
      const currentFirstSeatIndex = activeSeats.findIndex((seatNo) => seatNo === okeyPrototypeHandFirstSeat);
      const safeIndex = currentFirstSeatIndex >= 0 ? currentFirstSeatIndex : 0;
      nextFirstSeat = activeSeats[(safeIndex + 1) % activeSeats.length] ?? activeSeats[0] ?? baseSeat;
    }
    setOkeyPrototypeSessionHandNo((current) => current + 1);
    applyOkeyPrototypeDeal(nextFirstSeat, Date.now(), activeSeats);
    appendOkeyPrototypeAction(`Yeni el baslatildi: Koltuk ${nextFirstSeat} basliyor.`);
  }

  function refreshOkeyPrototypeRackState() {
    const baseSeat = okeyPrototypeSeatReservation
      ? Math.max(1, Math.min(4, okeyPrototypeSeatReservation.seatNo)) as OkeyPrototypeSeatNo
      : 1;
    const activeSeats = okeyPrototypeSeatReservation
      ? okeyPrototypeActiveTurnSeats
      : OKEY_PROTOTYPE_SEATS;
    setOkeyPrototypeSessionHandNo(1);
    setOkeyPrototypeSeatHandWins(createDefaultOkeyPrototypeSeatWinState());
    setOkeyPrototypeSeatPenaltyTotals(createDefaultOkeyPrototypeSeatWinState());
    setOkeyPrototypeDrawHandCount(0);
    setOkeyPrototypeLastHandSummary("");
    applyOkeyPrototypeDeal(baseSeat, Date.now(), activeSeats);
    appendOkeyPrototypeAction("Tas dizilimi yenilendi.");
  }

  function dealOkeyPrototypeWithSeed() {
    if (!okeyPrototypeSeatReservation) {
      appendOkeyPrototypeAction("Seed ile dagitmak icin once bir masaya oturmalisin.");
      return;
    }
    const baseSeat = Math.max(1, Math.min(4, okeyPrototypeSeatReservation.seatNo)) as OkeyPrototypeSeatNo;
    const parsedSeed = Number.parseInt(okeyPrototypeDealSeedDraft.trim(), 10);
    const normalizedSeed = Number.isFinite(parsedSeed) && parsedSeed > 0 ? parsedSeed : Date.now();
    setOkeyPrototypeDealSeedDraft(String(normalizedSeed));
    setOkeyPrototypeSessionHandNo(1);
    setOkeyPrototypeSeatHandWins(createDefaultOkeyPrototypeSeatWinState());
    setOkeyPrototypeSeatPenaltyTotals(createDefaultOkeyPrototypeSeatWinState());
    setOkeyPrototypeDrawHandCount(0);
    setOkeyPrototypeLastHandSummary("");
    applyOkeyPrototypeDeal(baseSeat, normalizedSeed, okeyPrototypeActiveTurnSeats);
    appendOkeyPrototypeAction(`Seed ile dagitildi: ${normalizedSeed} (K${baseSeat})`);
  }

  function sortOkeyPrototypeRack(mode: OkeyPrototypeRackSortMode) {
    if (!okeyPrototypeSeatReservation) {
      appendOkeyPrototypeAction("Rafi siralamak icin once bir masaya oturmalisin.");
      return;
    }
    const seatNo = okeyPrototypeSeatNoForRack as OkeyPrototypeSeatNo;
    const currentRack = okeyPrototypeRackState[seatNo] ?? [];
    if (currentRack.length < 2) {
      appendOkeyPrototypeAction("Raf siralamasi icin en az 2 tas olmali.");
      return;
    }
    const sortedRack = sortOkeyPrototypeRackTiles(currentRack, mode, okeyPrototypeOkeyTile);
    const orderChanged = sortedRack.some((tile, index) => tile.id !== currentRack[index]?.id);
    if (!orderChanged) {
      appendOkeyPrototypeAction(`Raf zaten ${mode === "color" ? "renk" : "deger"} sirasinda.`);
      return;
    }
    setOkeyPrototypeRackState((current) => ({
      ...current,
      [seatNo]: sortedRack,
    }));
    appendOkeyPrototypeAction(`Raf siralandi: K${seatNo} (${mode === "color" ? "renk" : "deger"}).`);
  }

  function createOkeyPrototypeScenarioTile(
    key: string,
    color: OkeyPrototypeTileColor,
    value: number,
    kind: OkeyPrototypeTileKind = "normal",
  ): OkeyPrototypeTile {
    return {
      id: `okey-proto-scn-${key}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind,
      color,
      value,
    };
  }

  function applyOkeyPrototypeScenario(kind: OkeyPrototypeScenarioKind) {
    if (!okeyPrototypeSeatReservation) {
      appendOkeyPrototypeAction("Senaryo icin once bir masaya oturmalisin.");
      return;
    }
    const baseSeat = Math.max(1, Math.min(4, okeyPrototypeSeatReservation.seatNo)) as OkeyPrototypeSeatNo;
    const deal = createOkeyPrototypeDealState(Date.now(), baseSeat, okeyPrototypeActiveTurnSeats);
    const nextRackState: OkeyPrototypeRackState = {
      ...deal.rackState,
      [baseSeat]: [],
    };
    const nextSeatOpenedState = createDefaultOkeyPrototypeSeatOpenedState();
    let nextPhase: OkeyPrototypeTurnPhase = "discard";
    let nextRound = 1;
    let nextDiscardPile: OkeyPrototypeDiscardEntry[] = [];
    let nextOpenedMelds: OkeyPrototypeMeldEntry[] = [];
    let nextAttachTargetMeldId = "";
    let nextDiscardDraftTileId = "";
    let nextWallTiles = deal.wallTiles.slice();

    if (kind === "opening") {
      nextRackState[baseSeat] = [
        createOkeyPrototypeScenarioTile("open-13-r", "kirmizi", 13),
        createOkeyPrototypeScenarioTile("open-13-m", "mavi", 13),
        createOkeyPrototypeScenarioTile("open-13-s", "sari", 13),
        createOkeyPrototypeScenarioTile("open-12-r", "kirmizi", 12),
        createOkeyPrototypeScenarioTile("open-12-m", "mavi", 12),
        createOkeyPrototypeScenarioTile("open-12-s", "sari", 12),
        createOkeyPrototypeScenarioTile("open-11-r", "kirmizi", 11),
        createOkeyPrototypeScenarioTile("open-11-m", "mavi", 11),
        createOkeyPrototypeScenarioTile("open-11-s", "sari", 11),
        createOkeyPrototypeScenarioTile("open-x1", "siyah", 9),
        createOkeyPrototypeScenarioTile("open-x2", "kirmizi", 8),
        createOkeyPrototypeScenarioTile("open-x3", "mavi", 7),
        createOkeyPrototypeScenarioTile("open-x4", "sari", 6),
        createOkeyPrototypeScenarioTile("open-x5", "siyah", 5),
        createOkeyPrototypeScenarioTile("open-x6", "kirmizi", 4),
      ];
      nextDiscardDraftTileId = nextRackState[baseSeat][nextRackState[baseSeat].length - 1]?.id ?? "";
      appendOkeyPrototypeAction("Senaryo yuklendi: Acilis provasi (101 ustu per dizilimi hazir).");
    } else if (kind === "attach") {
      nextSeatOpenedState[baseSeat] = true;
      const attachMeldId = `okey-proto-scn-meld-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      nextOpenedMelds = [{
        id: attachMeldId,
        seatNo: baseSeat,
        round: 1,
        kind: "seri",
        tiles: [
          createOkeyPrototypeScenarioTile("attach-7r", "kirmizi", 7),
          createOkeyPrototypeScenarioTile("attach-8r", "kirmizi", 8),
          createOkeyPrototypeScenarioTile("attach-9r", "kirmizi", 9),
        ],
        at: Date.now(),
      }];
      const scenarioOkeyTile = deal.okeyTile && deal.okeyTile.kind === "normal"
        ? createOkeyPrototypeScenarioTile("attach-okey", deal.okeyTile.color, deal.okeyTile.value)
        : createOkeyPrototypeScenarioTile("attach-j", "sahte", 0, "sahte");
      nextRackState[baseSeat] = [
        createOkeyPrototypeScenarioTile("attach-10r", "kirmizi", 10),
        scenarioOkeyTile,
        createOkeyPrototypeScenarioTile("attach-a1", "mavi", 12),
        createOkeyPrototypeScenarioTile("attach-a2", "sari", 12),
        createOkeyPrototypeScenarioTile("attach-a3", "siyah", 12),
        createOkeyPrototypeScenarioTile("attach-a4", "kirmizi", 5),
        createOkeyPrototypeScenarioTile("attach-a5", "mavi", 5),
        createOkeyPrototypeScenarioTile("attach-a6", "sari", 5),
        createOkeyPrototypeScenarioTile("attach-a7", "siyah", 5),
        createOkeyPrototypeScenarioTile("attach-a8", "kirmizi", 2),
        createOkeyPrototypeScenarioTile("attach-a9", "mavi", 3),
        createOkeyPrototypeScenarioTile("attach-a10", "sari", 4),
        createOkeyPrototypeScenarioTile("attach-a11", "siyah", 6),
        createOkeyPrototypeScenarioTile("attach-a12", "kirmizi", 7),
        createOkeyPrototypeScenarioTile("attach-a13", "mavi", 9),
      ];
      nextAttachTargetMeldId = attachMeldId;
      nextDiscardDraftTileId = nextRackState[baseSeat][0]?.id ?? "";
      appendOkeyPrototypeAction("Senaryo yuklendi: Pere ekleme provasi (hedef per secili).");
    } else if (kind === "finish") {
      nextSeatOpenedState[baseSeat] = true;
      nextRackState[baseSeat] = [
        createOkeyPrototypeScenarioTile("finish-last", "mavi", 12),
      ];
      nextDiscardDraftTileId = nextRackState[baseSeat][0]?.id ?? "";
      appendOkeyPrototypeAction("Senaryo yuklendi: El bitirme provasi (tek tas kaldi).");
    } else {
      nextPhase = "draw";
      nextRackState[baseSeat] = deal.rackState[baseSeat].slice(0, OKEY_PROTOTYPE_HAND_TILE_COUNT);
      nextWallTiles = [];
      nextDiscardPile = [];
      nextDiscardDraftTileId = "";
      appendOkeyPrototypeAction("Senaryo yuklendi: Berabere provasi (duvar ve orta bos).");
    }

    setOkeyPrototypeRackState(nextRackState);
    setOkeyPrototypeWallTiles(nextWallTiles);
    setOkeyPrototypeIndicatorTile(deal.indicatorTile);
    setOkeyPrototypeOkeyTile(deal.okeyTile);
    setOkeyPrototypeSahteOkeyCount(2);
    setOkeyPrototypeDiscardPile(nextDiscardPile);
    setOkeyPrototypePendingDiscardTileId("");
    setOkeyPrototypeTurnSeat(baseSeat);
    setOkeyPrototypeTurnRound(nextRound);
    setOkeyPrototypeTurnPhase(nextPhase);
    setOkeyPrototypeTurnLockedAfterMeld(false);
    setOkeyPrototypeTurnOpeningPoints(0);
    setOkeyPrototypeDiscardDraftTileId(nextDiscardDraftTileId);
    setOkeyPrototypeMeldDraftTileIds([]);
    setOkeyPrototypeOpenedMelds(nextOpenedMelds);
    setOkeyPrototypeAttachTargetMeldId(nextAttachTargetMeldId);
    setOkeyPrototypeSeatOpenedState(nextSeatOpenedState);
    setOkeyPrototypeWinnerSeat(null);
    setOkeyPrototypeHandDrawn(false);
    setOkeyPrototypeLastHandSummary("");
  }

  function onSelectGame(gameId: GameId) {
    if (gameId !== "okey101") {
      setSelectedGameId("okey101");
      saveSelectedGameIdToSession("okey101");
      setLobbyNotice("Bu uygulama sadece 101 Okey icin aciktir.");
      return;
    }
    setSelectedGameId("okey101");
    saveSelectedGameIdToSession("okey101");
    setOkeyPrototypeRoomSketchOpen(false);
    setGamePickerOpen(false);
    setRoomPickerOpen(true);
    setViewMode("lobby");
    setLobbyNotice("101 Okey odalari yukleniyor. Oda secerek devam et.");
    pushEntryScreenHistory("room", "okey101");
  }

  function goToGameSelection() {
    if (roomSession) {
      setLobbyNotice("Anasayfaya donmek icin once masadan kalkmalisin.");
      return;
    }
    if (typeof window !== "undefined") {
      safeStorageRemoveItem(window.sessionStorage, ROOT_GAME_CHOICE_KEY);
      safeStorageRemoveItem(window.sessionStorage, GAME_SELECTION_SESSION_KEY);
      window.location.assign(window.location.pathname);
      return;
    }
  }

  function goToLobbyFromTableView() {
    setViewMode("lobby");
    setRoomPickerOpen(false);
    setGamePickerOpen(false);
    if (roomSession) {
      setLobbyNotice("Lobiye gecildi. Masaya donerek oyuna devam edebilirsin.");
      return;
    }
    setLobbyNotice("Lobiye gecildi.");
  }

  function returnToActiveTableView() {
    if (!roomSession) return;
    setViewMode("table");
    setRoomPickerOpen(false);
    setGamePickerOpen(false);
    setLobbyNotice("Masaya geri donuldu.");
  }

  function openAllRoomsPicker() {
    if (roomSession) {
      setLobbyNotice("Tum odalari acmak icin once masadan kalkmalisin.");
      return;
    }
    setGamePickerOpen(false);
    setRoomPickerOpen(true);
    pushEntryScreenHistory("room", effectiveSelectedGameId);
  }

  function rememberRoomPickerSelection(lobbyId: string) {
    const safeLobbyId = sanitizeLobbyId(lobbyId);
    if (!safeLobbyId) return;
    const identity = getRoomPickerIdentity(member?.id ?? "", guestId);
    saveRoomPickerSessionState(identity, safeLobbyId, selectedGameId);
  }

  function selectLobbyRoom(lobbyId: string) {
    const safeId = sanitizeLobbyId(lobbyId);
    if (!safeId) return;
    if (roomSession) {
      setLobbyNotice("Oda degistirmek icin once masadan kalkmalisin.");
      return;
    }
    setSelectedLobbyId(safeId);
    rememberRoomPickerSelection(safeId);
    setGamePickerOpen(false);
    setViewMode("lobby");
    setRoomPickerOpen(false);
    pushEntryScreenHistory("lobby", effectiveSelectedGameId);
    const roomName = lobbyRooms.find((room) => room.id === safeId)?.name || DEFAULT_LOBBY_NAME;
    setLobbyNotice(`${sanitizeLobbyName(roomName)} odasına girildi.`);
  }

  function openAdminPanelWindow() {
    if (!member || member.role !== "admin") return;
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("admin", "1");
    url.searchParams.set("lobby", activeLobbyId);
    const opened = window.open(url.toString(), "_blank", "noopener,noreferrer");
    if (!opened) {
      setLobbyNotice("Tarayıcı yeni pencereyi engelledi. Popup izni verip tekrar dene.");
      return;
    }
    setLobbyNotice("Admin paneli yeni pencerede açıldı.");
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
      setLobbyNotice("Davet listesini sadece masa sahibi açabilir.");
      return;
    }
    if (!getOpenSeat(table)) {
      setLobbyNotice("Masada iki oyuncu olduğu için davet gönderilemez.");
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
      setLobbyNotice("Masa bulunamadı.");
      return;
    }
    if (notOwner) {
      setLobbyNotice("Masa gizlilik ayarını sadece masa sahibi değiştirebilir.");
      return;
    }
    if (updated) {
      setLobbyNotice(nowPrivate ? "Masa özel yapıldı. Sadece davetliler oturabilir." : "Masa tekrar herkese açıldı.");
      return;
    }
    setLobbyNotice(nowPrivate ? "Masa zaten özel." : "Masa zaten herkese açık.");
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
      setLobbyNotice("Masa bulunamadı.");
      return;
    }
    if (notOwner) {
      setLobbyNotice("İzleyici sohbetini sadece masa sahibi ayarlayabilir.");
      return;
    }
    if (updated) {
      setLobbyNotice(enabled ? "İzleyici sohbeti açıldı." : "İzleyici sohbeti kapatıldı.");
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
      setLobbyNotice("Masa bulunamadı.");
      return;
    }
    if (notOwner) {
      setLobbyNotice("Bu masaya davet gönderebilmek için masa sahibi olmalısın.");
      return;
    }
    if (targetBusy) {
      setLobbyNotice("Seçilen oyuncu şu an başka bir masada.");
      return;
    }
    if (tableFull) {
      setLobbyNotice("Masa dolu olduğu için davet gönderilemedi.");
      return;
    }
    if (invited) {
      closeInvitePicker();
      setLobbyNotice(`${targetName} oyuncusuna masa daveti gönderildi.`);
    }
  }

  function acceptTableInvite(tableId: number) {
    const latest = getCurrentLobbyState();
    const table = latest.tables.find((row) => row.id === tableId);
    if (!table || table.invitedUserId !== currentProfile.userId) {
      setLobbyNotice("Davet artık geçerli değil.");
      return;
    }
    const targetSeat = getOpenSeat(table);
    if (!targetSeat) {
      setLobbyNotice("Masa dolduğu için davet geçersiz oldu.");
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

  async function loadMemberFromSession(session: MemberSession | null) {
    if (!session?.userId || !session?.sessionKey) return null;
    try {
      const url = new URL("/api/auth/me", `${RUNTIME_API_BASE_URL}/`);
      url.searchParams.set("userId", session.userId);
      url.searchParams.set("sessionKey", session.sessionKey);
      url.searchParams.set("gameId", effectiveSelectedGameId);
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
      setAuthError("Kullanıcı adı en az 3 karakter olmalı (harf, rakam, alt çizgi).");
      return;
    }

    if (!displayName || displayName.length < 3) {
      setAuthError("Üye adı en az 3 karakter olmalı.");
      return;
    }
    if (!email.includes("@")) {
      setAuthError("Gecerli e-posta girin.");
      return;
    }
    if (password.length < 4) {
      setAuthError("Şifre en az 4 karakter olmalı.");
      return;
    }

    setAuthBusy(true);
    setAuthError("");
    try {
      const response = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, displayName, email, gender, avatarId, password, gameId: effectiveSelectedGameId }),
      });
      if (!response.ok) {
        setAuthError(await readApiError(response, "Üyelik açılamadı."));
        return;
      }
      const data = (await response.json().catch(() => null)) as { user?: unknown; sessionKey?: unknown } | null;
      const user = normalizeMemberUser(data?.user);
      const sessionKey = sanitizeMemberSessionKey(typeof data?.sessionKey === "string" ? data.sessionKey : "");
      if (!user) {
        setAuthError("Sunucu üyelik yanıtı geçersiz.");
        return;
      }

      if (!sessionKey) {
        setAuthError("Sunucu oturum yaniti gecersiz.");
        return;
      }
      saveJson(MEMBER_SESSION_KEY, { userId: user.id, sessionKey } satisfies MemberSession);
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
      clearRoomPickerSessionState();
      setViewMode("lobby");
      setRoomPickerOpen(true);
      setLobbyNotice("Üyelik açıldı.");
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
      setAuthError("Şifre girin.");
      return;
    }

    setAuthBusy(true);
    setAuthError("");
    try {
      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier, password, gameId: effectiveSelectedGameId }),
      });
      if (!response.ok) {
        setAuthError(await readApiError(response, "Kullanıcı adı/e-posta veya şifre yanlış."));
        return;
      }
      const data = (await response.json().catch(() => null)) as { user?: unknown; sessionKey?: unknown } | null;
      const user = normalizeMemberUser(data?.user);
      const sessionKey = sanitizeMemberSessionKey(typeof data?.sessionKey === "string" ? data.sessionKey : "");
      if (!user) {
        setAuthError("Sunucu giriş yanıtı geçersiz.");
        return;
      }

      if (!sessionKey) {
        setAuthError("Sunucu oturum yaniti gecersiz.");
        return;
      }
      setMember(user);
      setMemberAvatarDraft(user.avatarId);
      saveJson(MEMBER_SESSION_KEY, { userId: user.id, sessionKey } satisfies MemberSession);
      setGuestName(user.displayName);
      setAuthPassword("");
      setAuthError("");
      setMemberNotice("");
      clearRoomPickerSessionState();
      setViewMode("lobby");
      setRoomPickerOpen(true);
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
      setAuthError("Şifre sıfırlama için geçerli e-posta girin.");
      return;
    }
    if (newPassword.length < 4) {
      setAuthError("Yeni şifre en az 4 karakter olmalı.");
      return;
    }

    setForgotBusy(true);
    setAuthError("");
    try {
      const response = await apiFetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, newPassword }),
      });
      if (!response.ok) {
        setAuthError(await readApiError(response, "Şifre sıfırlanamadı."));
        return;
      }
      setForgotNewPassword("");
      setMemberNotice("Şifre sıfırlandı. Yeni şifre ile giriş yapabilirsin.");
    } catch {
      setAuthError("Şifre sıfırlama servisine bağlanılamadı.");
    } finally {
      setForgotBusy(false);
    }
  }

  async function onChangeMyPassword() {
    if (!member || memberActionBusy) return;
    const memberSession = loadMemberSession();
    if (!memberSession || memberSession.userId !== member.id) {
      setMemberNotice("Oturum gecersiz. Lutfen tekrar giris yap.");
      onLogoutMember();
      return;
    }
    const currentPassword = memberPasswordCurrent.trim().slice(0, 64);
    const newPassword = memberPasswordNext.trim().slice(0, 64);
    if (!currentPassword) {
      setMemberNotice("Mevcut sifreyi gir.");
      return;
    }
    if (newPassword.length < 4) {
      setMemberNotice("Yeni şifre en az 4 karakter olmalı.");
      return;
    }

    setMemberActionBusy(true);
    setMemberNotice("");
    try {
      const response = await apiFetch("/api/auth/password/change", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: member.id,
          sessionKey: memberSession.sessionKey,
          gameId: effectiveSelectedGameId,
          currentPassword,
          newPassword,
        }),
      });
      if (!response.ok) {
        setMemberNotice(await readApiError(response, "Şifre değiştirilemedi."));
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
      setMemberNotice("Şifre başarıyla değişti.");
    } catch {
      setMemberNotice("Şifre değiştirme servisinde bağlantı hatası.");
    } finally {
      setMemberActionBusy(false);
    }
  }

  async function onChangeMyAvatar() {
    if (!member || memberActionBusy) return;
    const memberSession = loadMemberSession();
    if (!memberSession || memberSession.userId !== member.id) {
      setMemberNotice("Oturum gecersiz. Lutfen tekrar giris yap.");
      onLogoutMember();
      return;
    }
    const nextAvatarId = sanitizeAvatarId(memberAvatarDraft, member.gender);
    if (nextAvatarId === member.avatarId) {
      setMemberNotice("Avatar zaten secili.");
      return;
    }

    setMemberActionBusy(true);
    setMemberNotice("");
    try {
      const response = await apiFetch("/api/auth/profile/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: member.id,
          sessionKey: memberSession.sessionKey,
          gameId: effectiveSelectedGameId,
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
    safeStorageRemoveItem(window.localStorage, MEMBER_SESSION_KEY);
    clearRoomPickerSessionState();
    setMember(null);
    setMemberAvatarDraft(DEFAULT_AVATAR_BY_GENDER.unknown);
    setMemberPasswordCurrent("");
    setMemberPasswordNext("");
    setMemberNotice("");
    setForgotEmail("");
    setForgotNewPassword("");
    setAuthPassword("");
    setAuthAvatarId(DEFAULT_AVATAR_BY_GENDER.unknown);
    setAuthError("");
    setViewMode("lobby");
    setRoomPickerOpen(true);
    setAccountMenuOpen(false);
    setLobbyNotice("Üyelik oturumu kapatıldı.");
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
      const response = await apiFetch("/api/auth/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId,
          gameId: effectiveSelectedGameId,
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
      setLobbyNotice("Masa bulunamadı.");
      return;
    }
    if (notOwner) {
      setLobbyNotice("Set sayısını sadece masa sahibi belirleyebilir.");
      return;
    }
    if (locked) {
      setLobbyNotice("Set sayısı sadece seri başlamadan değiştirilebilir.");
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
      setLobbyNotice("Masa bulunamadı.");
      return;
    }
    if (notSeated) {
      setLobbyNotice("Bu isteği gönderebilmek için masada oturuyor olmalısın.");
      return;
    }
    if (noOpponent) {
      setLobbyNotice("Rakip olmadığı için izin istemene gerek yok.");
      return;
    }
    if (alreadyGranted) {
      setLobbyNotice("Rakibin zaten puansız ayrılma izni verdi.");
      return;
    }
    if (alreadyRequested) {
      setLobbyNotice("İzin talebin rakibe gönderildi, cevap bekleniyor.");
      return;
    }
    if (updated) {
      setLobbyNotice("Rakibe puansız ayrılma izni talebi gönderildi.");
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
      setLobbyNotice("Masa bulunamadı.");
      return;
    }
    if (noRequest) {
      setLobbyNotice("Bekleyen izin talebi yok.");
      return;
    }
    if (cannotApproveOwnRequest) {
      setLobbyNotice("Kendi izin talebini onaylayamazsın.");
      return;
    }
    if (notOpponent) {
      setLobbyNotice("Sadece rakip oyuncunun talebini onaylayabilirsin.");
      return;
    }
    if (updated) {
      setLobbyNotice(`${requesterName} oyuncusuna puansız ayrılma izni verildi.`);
    }
  }

  function adminCloseTable(tableId: number) {
    if (!member || member.role !== "admin") {
      setLobbyNotice("Masayı kapatmak için admin olmalısın.");
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
      setLobbyNotice("Kapatılacak masa bulunamadı.");
      return;
    }

    if (invitePickerTableId === tableId) {
      setInvitePickerTableId(null);
    }
    setLobbyNotice(`Masa ${tableId} admin tarafından kapatıldı.`);
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
    const seriesStarted = Boolean(activeTable.setPlayed > 0 || matchLiveState.matchActive);
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
    const leavingTableId = roomSession?.tableNo ?? 0;
    const leavingRoomCode = roomSession?.code ?? "";
    const leavingSeat = roomSession?.role === "player" ? roomSession.seat : null;
    releaseSeatOnly();
    setRoomSession(null);
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
    appendFlowEvent("view.lobby", "Masa gorunumunden lobiye donuldu.", {
      tableId: leavingTableId,
      roomCode: leavingRoomCode,
      seat: leavingSeat,
      dedupeKey: `${leavingRoomCode || leavingTableId}-lobby`,
      dedupeMs: 900,
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
    setLobbyNotice("Rakibin 1 dakika hamle yapmadığı için galip sayıldın.");
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

  function resolveProfilePopoverAnchor(triggerEl?: HTMLElement | null) {
    if (typeof window === "undefined") {
      return {
        left: PROFILE_POPOVER_VIEWPORT_MARGIN_PX,
        top: PROFILE_POPOVER_VIEWPORT_MARGIN_PX,
      };
    }
    const viewportWidth = window.innerWidth || 0;
    const viewportHeight = window.innerHeight || 0;
    const maxLeft = Math.max(
      PROFILE_POPOVER_VIEWPORT_MARGIN_PX,
      viewportWidth - PROFILE_POPOVER_WIDTH_PX - PROFILE_POPOVER_VIEWPORT_MARGIN_PX,
    );
    if (!triggerEl) {
      return {
        left: PROFILE_POPOVER_VIEWPORT_MARGIN_PX,
        top: Math.max(PROFILE_POPOVER_VIEWPORT_MARGIN_PX, Math.round(viewportHeight * 0.2)),
      };
    }
    const rect = triggerEl.getBoundingClientRect();
    const left = Math.round(Math.min(maxLeft, Math.max(PROFILE_POPOVER_VIEWPORT_MARGIN_PX, rect.left)));
    let top = Math.round(rect.bottom + PROFILE_POPOVER_GAP_PX);
    if (top + PROFILE_POPOVER_MIN_HEIGHT_PX > viewportHeight - PROFILE_POPOVER_VIEWPORT_MARGIN_PX) {
      top = Math.round(Math.max(PROFILE_POPOVER_VIEWPORT_MARGIN_PX, rect.top - PROFILE_POPOVER_MIN_HEIGHT_PX - PROFILE_POPOVER_GAP_PX));
    }
    return { left, top };
  }

  async function openPlayerProfile(
    userId: string,
    displayName: string,
    points: number,
    stats: PlayerStats,
    username?: string,
    gender?: MemberGender,
    avatarId?: AvatarId,
    triggerEl?: HTMLElement | null,
  ) {
    const anchor = resolveProfilePopoverAnchor(triggerEl);
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
      anchorLeft: anchor.left,
      anchorTop: anchor.top,
    };

    if (!isMemberUserId(userId)) {
      setProfileModal(baseState);
      return;
    }

    setProfileModal({ ...baseState, loading: true });
    try {
      const url = new URL("/api/auth/profile", `${RUNTIME_API_BASE_URL}/`);
      url.searchParams.set("userId", userId);
      url.searchParams.set("gameId", effectiveSelectedGameId);
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
        userId: user.id,
        anchorLeft: anchor.left,
        anchorTop: anchor.top,
      });
    } catch {
      setProfileModal({ ...baseState, loading: false, error: "Profil servisine baglanilamadi." });
    }
  }

  function syncRoomSeatHeartbeat() {
    if (!roomSession) return;
    if (roomSession.role !== "player") return;
    let blocked = false;
    let blockedReason: "occupied" | "private" | "already-seated" | "duplicate-user" | null = null;
    let autoStarted = false;
    let resolvedRoomCode = "";

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
          whiteClearToken: null,
          blackClearToken: null,
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
      resolvedRoomCode = table.roomCode;
      const existingSeat = findSessionSeat(cleaned, appSessionId);
      const isSameTable = existingSeat
        ? existingSeat.table.id === table.id || existingSeat.table.roomCode === roomCode
        : false;
      const existingUserSeat = findUserSeat(cleaned, currentProfile.userId);
      const userSeatedInAnotherSession = Boolean(
        existingUserSeat
        && existingUserSeat.sessionId !== appSessionId,
      );
      if (userSeatedInAnotherSession) {
        blocked = true;
        blockedReason = "duplicate-user";
        return current;
      }
      if (existingSeat && !isSameTable) {
        blocked = true;
        blockedReason = "already-seated";
        return current;
      }

      let gateShouldReset = false;
      if (existingSeat && isSameTable && existingSeat.seat !== roomSession.seat) {
        table = existingSeat.seat === "white"
          ? { ...table, white: null, whiteClearToken: createSeatClearToken(appSessionId || "white-heartbeat-switch") }
          : { ...table, black: null, blackClearToken: createSeatClearToken(appSessionId || "black-heartbeat-switch") };
        gateShouldReset = true;
      }

      if (isTablePrivateBlockedForUser(table, currentProfile.userId, appSessionId)) {
        blocked = true;
        blockedReason = "private";
        return current;
      }

      const occupied = roomSession.seat === "white" ? table.white : table.black;
      const occupiedByDifferentSession = Boolean(
        occupied
        && occupied.sessionId !== appSessionId,
      );
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
          ? {
            ...table,
            white: seatState,
            whiteClearToken: null,
            ownerUserId: table.ownerUserId || sanitizeGuestId(currentProfile.userId),
          }
          : {
            ...table,
            black: seatState,
            blackClearToken: null,
            ownerUserId: table.ownerUserId || sanitizeGuestId(currentProfile.userId),
          };

      const started = autoStartTableWhenBothSeated(patched, now);
      if (!patched.startedAt && Boolean(started.startedAt)) {
        autoStarted = true;
      }
      tables[index] = normalizeTableAccess(normalizeTableStartGate(started));
      return {
        ...current,
        lobbyName: sanitizeLobbyName(roomSession.roomName || current.lobbyName),
        tables: sortTables(tables),
        updatedAt: now,
      };
    });

    if (blocked) {
      appendFlowEvent("seat.heartbeat-blocked", `Koltuk kalp atisi engellendi: ${blockedReason || "occupied"}.`, {
        tableId: roomSession.tableNo,
        roomCode: resolvedRoomCode || roomSession.code,
        seat: roomSession.seat,
        dedupeKey: `${resolvedRoomCode || roomSession.code}-${roomSession.seat}-${blockedReason || "occupied"}`,
      });
      if (blockedReason === "private") {
        setLobbyNotice("Bu masa ozel oldugu icin koltuk korunuyor.");
      } else if (blockedReason === "duplicate-user") {
        setLobbyNotice("Bu hesap baska bir tarayicida aktif. Diger oturumu kapatip tekrar deneyin.");
      } else if (blockedReason === "already-seated") {
        setLobbyNotice("Aynı anda sadece tek masada oturabilirsin.");
      } else {
        setLobbyNotice(`${seatText(roomSession.seat)} koltugu dolu gorunuyor.`);
      }
      return;
    }
    if (autoStarted) {
      appendFlowEvent("table.autostart", "Kalp atisinda iki koltuk dolu goruldu, oyun otomatik baslatildi.", {
        tableId: roomSession.tableNo,
        roomCode: resolvedRoomCode || roomSession.code,
        seat: roomSession.seat,
        dedupeKey: `${resolvedRoomCode || roomSession.code}-heartbeat-autostart`,
        dedupeMs: 1_000,
      });
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
          onClick={() => sitToTable(table.id, seat, table.roomCode, selectedGameId === "tavla")}
          disabled={seatLocked || privateBlocked}
          title={
            seatLocked
              ? `Önce Masa ${myCurrentSeat?.table.id} için masadan kalk`
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
            onClick={(event) => openPlayerProfile(
              occupant.userId,
              occupant.displayName,
              occupant.points,
              occupant.stats,
              occupant.username,
              occupant.gender,
              occupant.avatarId,
              event.currentTarget,
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

  function getOkeyLobbyOccupiedSeatNos(row: OkeyPrototypeTableSketchRow) {
    return row.occupiedSeatNos.slice().sort((left, right) => left - right);
  }

  function getOkeyLobbySeatProfile(row: OkeyPrototypeTableSketchRow, seatNo: OkeyPrototypeSeatNo) {
    const seat = row.seats[seatNo];
    if (!seat) return null;
    const isMine = sanitizeGuestId(seat.userId) === sanitizeGuestId(currentProfile.userId) || seat.sessionId === appSessionId;
    return {
      displayName: seat.displayName,
      gender: seat.gender,
      avatarId: seat.avatarId,
      mine: isMine,
    };
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
        setLobbyNotice(`Oyunu kazandın. +${gameRules.winPoints} puan eklendi.`);
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
        `Set serisini kazandın (${seriesResult.whiteWins}-${seriesResult.blackWins}). +${gameRules.winPoints} puan eklendi.`,
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
    const channelForConnection = activeRealtimeLobbyChannel;
    const storageKeyForConnection = activeLobbyStorageKey;
    const lobbyNameForConnection = activeLobbyName;

    const clearReconnectTimer = () => {
      if (realtimeReconnectTimerRef.current === null) return;
      window.clearTimeout(realtimeReconnectTimerRef.current);
      realtimeReconnectTimerRef.current = null;
    };

    const scheduleReconnect = (overrideWaitMs?: number) => {
      if (cancelled || realtimeReconnectTimerRef.current !== null) return;
      const forcedWait = Number.isFinite(overrideWaitMs) ? Number(overrideWaitMs) : 0;
      const waitMs = forcedWait > 0 ? forcedWait : reconnectDelay;
      if (!(forcedWait > 0)) {
        reconnectDelay = Math.min(reconnectDelay * 2, 10_000);
      }
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
      const now = Date.now();
      const wsDisabledUntil = realtimeWsDisabledUntilRef.current;
      if (wsDisabledUntil > now) {
        const remaining = wsDisabledUntil - now;
        setRealtimeSocketReadyState(typeof WebSocket === "undefined" ? 3 : WebSocket.CLOSED);
        setRealtimeStatus("offline");
        scheduleReconnect(Math.min(Math.max(remaining + 120, 600), WS_DISABLE_DURATION_MS));
        return;
      }
      const existingSocket = realtimeSocketRef.current;
      if (existingSocket) {
        if (existingSocket.readyState === WebSocket.OPEN) {
          setRealtimeSocketReadyState(existingSocket.readyState);
          setRealtimeStatus("online");
          return;
        }
        if (existingSocket.readyState === WebSocket.CONNECTING) {
          setRealtimeSocketReadyState(existingSocket.readyState);
          setRealtimeStatus("connecting");
          return;
        }
        realtimeSocketRef.current = null;
      }
      setRealtimeStatus("connecting");
      let socket: WebSocket;
      try {
        socket = new WebSocket(buildRealtimeChannelUrl(REALTIME_WS_BASE_URL, channelForConnection, appSessionId));
      } catch {
        setRealtimeSocketReadyState(typeof WebSocket === "undefined" ? 3 : WebSocket.CLOSED);
        setRealtimeStatus("offline");
        scheduleReconnect();
        return;
      }

      realtimeSocketRef.current = socket;
      setRealtimeSocketReadyState(socket.readyState);
      realtimeReceivedSnapshotRef.current = false;
      let opened = false;

      const seedTimer = window.setTimeout(() => {
        if (cancelled) return;
        if (realtimeSocketRef.current !== socket) return;
        if (activeRealtimeLobbyChannelRef.current !== channelForConnection) return;
        if (socket.readyState !== WebSocket.OPEN) return;
        if (realtimeReceivedSnapshotRef.current) return;
        const localSnapshot = loadLobbyState(storageKeyForConnection, lobbyNameForConnection);
        realtimeRemoteStateRef.current = localSnapshot;
        realtimeReceivedSnapshotRef.current = true;
        saveJson(storageKeyForConnection, localSnapshot);
        setLobbyState(localSnapshot);
        sendRealtimeSnapshot(localSnapshot, "seed");
      }, 1_200);

      socket.addEventListener("open", () => {
        if (cancelled || realtimeSocketRef.current !== socket) return;
        if (activeRealtimeLobbyChannelRef.current !== channelForConnection) return;
        opened = true;
        realtimeWsPreopenFailCountRef.current = 0;
        realtimeWsDisabledUntilRef.current = 0;
        reconnectDelay = 1_000;
        if (ENABLE_WS_DEBUG_LOGS) {
          console.debug("[WS] opened", { session: appSessionId, url: socket.url });
        }
        setRealtimeSocketReadyState(socket.readyState);
        setSyncHealth((prev) => ({
          ...prev,
          lastWsOpenAt: Date.now(),
          wsOpenCount: prev.wsOpenCount + 1,
          lastError: "",
        }));
        setRealtimeStatus("online");
        const helloMessage: RealtimeMessage = {
          kind: "hello",
          channel: channelForConnection,
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
        if (activeRealtimeLobbyChannelRef.current !== channelForConnection) return;
        if (typeof event.data !== "string") return;
        if (ENABLE_WS_DEBUG_LOGS) {
          console.debug("[WS] message received", { length: event.data.length });
        }
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
        if (activeRealtimeLobbyChannelRef.current !== channelForConnection) return;
        setSyncHealth((prev) => ({
          ...prev,
          wsErrorCount: prev.wsErrorCount + 1,
          lastError: "ws baglanti hatasi",
        }));
        setRealtimeStatus("offline");
      });

      socket.addEventListener("close", () => {
        window.clearTimeout(seedTimer);
        if (cancelled || realtimeSocketRef.current !== socket) return;
        if (activeRealtimeLobbyChannelRef.current !== channelForConnection) return;
        if (ENABLE_WS_DEBUG_LOGS) {
          console.debug("[WS] closed");
        }
        if (!opened) {
          const nextFailCount = realtimeWsPreopenFailCountRef.current + 1;
          realtimeWsPreopenFailCountRef.current = nextFailCount;
          if (nextFailCount >= WS_PREOPEN_FAIL_DISABLE_THRESHOLD) {
            realtimeWsDisabledUntilRef.current = Date.now() + WS_DISABLE_DURATION_MS;
            setSyncHealth((prev) => ({ ...prev, lastError: "ws geçici kapatıldı, http senkron aktif" }));
          }
        } else {
          realtimeWsPreopenFailCountRef.current = 0;
        }
        realtimeSocketRef.current = null;
        setRealtimeSocketReadyState(typeof WebSocket === "undefined" ? 3 : WebSocket.CLOSED);
        setSyncHealth((prev) => ({
          ...prev,
          wsCloseCount: prev.wsCloseCount + 1,
        }));
        setRealtimeStatus("offline");
        if (realtimeWsDisabledUntilRef.current > Date.now()) {
          scheduleReconnect(Math.min(Math.max(realtimeWsDisabledUntilRef.current - Date.now() + 120, 600), WS_DISABLE_DURATION_MS));
          return;
        }
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
  }, [appSessionId, activeRealtimeLobbyChannel]);

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
    let timer: number | null = null;

    const scheduleNext = () => {
      if (cancelled) return;
      const intervalMs = document.hidden ? HTTP_SYNC_BACKGROUND_RUN_INTERVAL_MS : HTTP_SYNC_RUN_INTERVAL_MS;
      timer = window.setTimeout(() => {
        void tick();
      }, intervalMs);
    };

    const run = async () => {
      if (cancelled) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setRealtimeStatus("offline");
        return;
      }
      const socket = realtimeSocketRef.current;
      const pending = realtimePendingSnapshotRef.current;
      if (socket && socket.readyState === WebSocket.OPEN && !pending) {
        const now = Date.now();
        if (now - realtimeLastPushAtRef.current >= 12_000) {
          await syncRealtimeViaHttp("http-write-heartbeat");
          return;
        }
        if (now - realtimeLastPullAtRef.current >= 10_000) {
          await pullRealtimeViaHttp("http-read-backup");
        }
        return;
      }
      await syncRealtimeViaHttp("http-fallback");
    };

    const tick = async () => {
      await run();
      scheduleNext();
    };

    void tick();

    return () => {
      cancelled = true;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [appSessionId, activeRealtimeLobbyChannel]);

  useEffect(() => {
    const onMessage = (event: MessageEvent<LegacyHostMessage>) => {
      if (event.origin !== window.location.origin) return;
      const payload = event.data;
      if (!payload || typeof payload !== "object") return;
      if ((payload as { source?: unknown }).source !== "tavla-legacy") return;

      if (payload.type === "table-chat-ready") {
        syncTableChatToIframe();
        syncRoomStartGateToIframe();
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
  }, [currentProfile.userId, currentProfile.displayName, handleLegacyMatchFinished, sendTableChat, syncTableChatToIframe, syncRoomStartGateToIframe, roomSession, mode]);

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
      setOpponentIdleModal({
        open: true,
        matchToken: tracker.matchToken || latest.matchToken,
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [roomSession, mode, currentRoomTable?.roomCode, currentProfile.userId]);

  useEffect(() => {
    void refreshGameRules();
    void refreshPublishedDesign();
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
    if (isAdminWindow && member?.role === "admin") return;
    setDesignDraft(designPublished);
  }, [designPublished, isAdminWindow, member?.role]);

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
    if (adminSelectedUserId && adminUsers.some((user) => user.id === adminSelectedUserId)) return;
    setAdminSelectedUserId(adminUsers[0]?.id ?? "");
  }, [adminUsers, adminSelectedUserId]);

  useEffect(() => {
    if (adminSelectedLobbyId && lobbyRooms.some((room) => room.id === adminSelectedLobbyId)) return;
    setAdminSelectedLobbyId(lobbyRooms[0]?.id ?? "");
  }, [lobbyRooms, adminSelectedLobbyId]);

  useEffect(() => {
    void loadLobbyRoomsFromService();
  }, []);

  useEffect(() => {
    const safeLobbyId = sanitizeLobbyId(activeLobbyId) || DEFAULT_LOBBY_ID;
    if (typeof window !== "undefined") {
      safeStorageSetItem(window.localStorage, getActiveLobbyStorageKey(selectedGameId), safeLobbyId);
      if (selectedGameId === DEFAULT_GAME_ID) {
        // Tavla için eski storage anahtarını da güncel tutuyoruz.
        safeStorageSetItem(window.localStorage, ACTIVE_LOBBY_ID_KEY, safeLobbyId);
      }
    }
    const loaded = loadLobbyState(makeLobbyStateStorageKey(safeLobbyId), activeLobbyName);
    const next = loaded.lobbyName === activeLobbyName
      ? loaded
      : { ...loaded, lobbyName: activeLobbyName, updatedAt: Date.now() };
    saveJson(makeLobbyStateStorageKey(safeLobbyId), next);
    realtimeRemoteStateRef.current = next;
    realtimePendingSnapshotRef.current = next;
    realtimeReceivedSnapshotRef.current = false;
    setLobbyState(next);

    if (roomSession && roomSession.lobbyId !== safeLobbyId) {
      clearOpponentIdleWatch();
      timeoutWinWaiverRef.current = null;
      leavePermissionPromptKeyRef.current = "";
      leavePermissionAutoLeavingRef.current = false;
      setRoomSession(null);
      setViewMode("lobby");
      setLobbyNotice(`${activeLobbyName} odasina gecildi.`);
    }
  }, [activeLobbyId, activeLobbyName, selectedGameId]);

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
        safeStorageRemoveItem(window.localStorage, MEMBER_SESSION_KEY);
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
    if (!member) return;
    let cancelled = false;
    const validateMemberSession = async () => {
      const session = loadMemberSession();
      if (!session || session.userId !== member.id) return;
      const user = await loadMemberFromSession(session);
      if (cancelled || user) return;
      safeStorageRemoveItem(window.localStorage, MEMBER_SESSION_KEY);
      setMember(null);
      setMemberAvatarDraft(DEFAULT_AVATAR_BY_GENDER.unknown);
      setMemberNotice("Bu hesap baska bir tarayicida acildigi icin oturum kapatildi.");
      setLobbyNotice("Bu hesap baska bir tarayicida acildigi icin oturum kapatildi.");
    };
    void validateMemberSession();
    const timer = window.setInterval(() => {
      void validateMemberSession();
    }, MEMBER_SESSION_REVALIDATE_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (!document.hidden) {
        void validateMemberSession();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [member?.id]);

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
    safeStorageSetItem(window.localStorage, GUEST_STORAGE_KEY, safeGuestName);
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
    if (canAccessOkeyPrototype) return;
    if (selectedGameId !== "okey101") return;
    setSelectedGameId("tavla");
    saveSelectedGameIdToSession("tavla");
    setOkeyPrototypeRoomSketchOpen(false);
    if (!roomSession) {
      setViewMode("lobby");
      setGamePickerOpen(false);
      setRoomPickerOpen(true);
    }
    setLobbyNotice("101 Okey prototipi sadece admin kullanicisi icin acik.");
  }, [canAccessOkeyPrototype, selectedGameId, roomSession]);

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
    url.searchParams.set("lobby", activeLobbyId);
    url.searchParams.set("game", selectedGameId);
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
    if (!roomSession && viewMode === "lobby") {
      const entryScreen: EntryScreen = showGamePicker ? "game" : showRoomPicker ? "room" : "lobby";
      url.searchParams.set("entry", entryScreen);
    } else {
      url.searchParams.delete("entry");
    }
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [roomSession, safeGuestName, activeLobbyId, selectedGameId, viewMode, showGamePicker, showRoomPicker]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPopState = () => {
      if (roomSession) return;
      const requestedGameFromUrl = readGameIdFromUrl() ?? DEFAULT_GAME_ID;
      const gameFromUrl: GameId =
        !canAccessOkeyPrototype && requestedGameFromUrl === "okey101"
          ? "tavla"
          : requestedGameFromUrl;
      setSelectedGameId(gameFromUrl);
      saveSelectedGameIdToSession(gameFromUrl);
      if (!canAccessOkeyPrototype && requestedGameFromUrl === "okey101") {
        setSelectedGameId("tavla");
        saveSelectedGameIdToSession("tavla");
      }
      const entry = readEntryScreenFromUrl();
      if (entry === "game") {
        setViewMode("lobby");
        setRoomPickerOpen(true);
        setGamePickerOpen(false);
        return;
      }
      if (entry === "room") {
        setViewMode("lobby");
        setGamePickerOpen(false);
        setRoomPickerOpen(true);
        return;
      }
      if (entry === "lobby") {
        setViewMode("lobby");
        setGamePickerOpen(false);
        setRoomPickerOpen(false);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [canAccessOkeyPrototype, roomSession]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(activeLobbySyncChannel);
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
  }, [activeLobbySyncChannel, activeLobbyStorageKey, activeLobbyName]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === activeLobbyStorageKey) {
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
            safeStorageRemoveItem(window.localStorage, MEMBER_SESSION_KEY);
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
  }, [activeLobbyStorageKey, activeLobbyName]);

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
  }, [activeLobbyStorageKey, activeLobbyName]);

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
  }, [roomSession, appSessionId, currentProfile.userId, activeLobbyId, activeLobbyStorageKey]);

  useEffect(() => {
    if (!roomSession || roomSession.role !== "player") {
      leavePermissionPromptKeyRef.current = "";
      leaveIncomingIgnoredKeyRef.current = "";
      leaveIncomingActiveKeyRef.current = "";
      closeLeaveIncomingModal();
      return;
    }
    if (!currentRoomTable) {
      leaveIncomingActiveKeyRef.current = "";
      closeLeaveIncomingModal();
      return;
    }
    const myUserId = sanitizeGuestId(currentProfile.userId);
    if (!myUserId) {
      leavePermissionPromptKeyRef.current = "";
      leaveIncomingIgnoredKeyRef.current = "";
      leaveIncomingActiveKeyRef.current = "";
      closeLeaveIncomingModal();
      return;
    }
    const mySeat = roomSession.seat === "white" ? currentRoomTable.white : currentRoomTable.black;
    const opponentSeat = roomSession.seat === "white" ? currentRoomTable.black : currentRoomTable.white;
    const requestUserId = sanitizeGuestId(currentRoomTable.leavePermissionRequestByUserId ?? "");
    const grantedUserId = sanitizeGuestId(currentRoomTable.leavePermissionGrantedToUserId ?? "");
    const mySeatUserId = sanitizeGuestId(mySeat?.userId ?? "");
    const opponentUserId = sanitizeGuestId(opponentSeat?.userId ?? "");

    const shouldClearIgnoredRequestKey = !requestUserId || grantedUserId === requestUserId;
    if (
      !mySeat
      || !mySeatUserId
      || mySeatUserId !== myUserId
      || !opponentSeat
      || !requestUserId
      || requestUserId !== opponentUserId
      || grantedUserId === requestUserId
    ) {
      leavePermissionPromptKeyRef.current = "";
      leaveIncomingActiveKeyRef.current = "";
      if (shouldClearIgnoredRequestKey) {
        leaveIncomingIgnoredKeyRef.current = "";
      }
      closeLeaveIncomingModal();
      return;
    }

    const promptKey = `${currentRoomTable.roomCode}:${requestUserId}`;
    if (leaveIncomingIgnoredKeyRef.current === promptKey) {
      if (leaveIncomingModal.open) {
        setLeaveIncomingModal({ open: false, requesterName: "", requestKey: "" });
      }
      leaveIncomingActiveKeyRef.current = "";
      return;
    }
    if (leavePermissionPromptKeyRef.current === promptKey) return;
    leavePermissionPromptKeyRef.current = promptKey;
    leaveIncomingActiveKeyRef.current = promptKey;

    const requesterName = opponentSeat.displayName || "Rakip";
    setLeaveIncomingModal({
      open: true,
      requesterName,
      requestKey: promptKey,
    });
  }, [roomSession, currentRoomTable, currentProfile.userId]);

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
    void leaveRoomAndGoLobby(true);
  }, [roomSession, currentRoomTable, currentProfile.userId, leaveRoomAndGoLobby]);

  useEffect(() => {
    const safeUserId = sanitizeGuestId(currentProfile.userId);
    if (!safeUserId) return;
    const notices = sortTables(lobbyState.tables).filter(
      (table) => table.inviteNoticeForUserId === safeUserId && table.inviteNoticeText && table.inviteNoticeId,
    );
    if (notices.length === 0) return;
    const latest = notices[notices.length - 1];
    const latestNoticeId = sanitizeChatId(latest.inviteNoticeId ?? "");
    const latestNoticeText = latest.inviteNoticeText ?? "";
    const noticeDedupKey = latestNoticeId || latestNoticeText;
    if (latest.inviteNoticeText) {
      if (latest.inviteNoticeText.startsWith(LEAVE_NOTICE_REJECT_PREFIX)) {
        if (!noticeDedupKey || leaveRejectNoticeSeenKeyRef.current !== noticeDedupKey) {
          if (noticeDedupKey) {
            leaveRejectNoticeSeenKeyRef.current = noticeDedupKey;
          }
          const message = latest.inviteNoticeText.slice(LEAVE_NOTICE_REJECT_PREFIX.length).trim();
          setLeaveInfoModal({
            open: true,
            title: "Masadan Çık",
            message: message || "Puansız ayrılma teklifin reddedildi.",
          });
        }
      } else {
        setLobbyNotice(latest.inviteNoticeText);
      }
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
    setLobbyNotice("Özel masalara izleyici girişi kapalı.");
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
    lobbyState.guestLabels,
    guestId,
    activeLobbyId,
    activeLobbyStorageKey,
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
        const localSnapshot = loadLobbyState(activeLobbyStorageKey, activeLobbyName);
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
  }, [roomSession, currentRoomTable, realtimeStatus, activeLobbyStorageKey, activeLobbyName]);

  useEffect(() => {
    if (viewMode === "lobby") return;
    setAccountMenuOpen(false);
  }, [viewMode]);

  useEffect(() => {
    const onBeforeUnload = () => {
      const latest = getCurrentLobbyState();
      const cleanedTables = cleanupStaleAndPrune(latest.tables).tables;
      const scopedUserId = roomSession && roomSession.role === "player" ? sanitizeGuestId(currentProfile.userId) : "";
      const scopedRoomCode = roomSession && roomSession.role === "player" ? sanitizeRoomCode(roomSession.code) : "";
      const scopedTableId = roomSession && roomSession.role === "player" ? Math.max(1, roomSession.tableNo) : 0;
      const cleared = clearSessionFromTables(cleanedTables, appSessionId, scopedUserId, scopedRoomCode, scopedTableId);
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
      saveJson(activeLobbyStorageKey, next);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [appSessionId, currentProfile.userId, activeLobbyStorageKey, roomSession]);

  if (isAdminWindow) {
    return (
      <main className="my-shell my-admin-window-page" style={designCssVars}>
        <header className="my-topbar">
          <div className="my-topbar-left">
            <button className="my-top-btn my-btn-member-alt" onClick={() => window.close()}>
              Pencereyi Kapat
            </button>
            <button className="my-top-btn my-btn-open" onClick={leaveAdminWithoutSaving}>
              Oyuna Don
            </button>
          </div>
          <div className="my-topbar-right">
            <strong className="my-admin-title">Admin Paneli</strong>
          </div>
        </header>
        {!member || member.role !== "admin" ? (
          <section className="my-admin-window-blocked">
            <h2>Admin girişi gerekli</h2>
            <p className="line">Bu pencereyi kullanmak için admin hesabı ile giriş yapmalısın.</p>
          </section>
        ) : (
          <section className="my-admin-window-layout">
            <section className="my-side-card">
              <h3>Lobi Yonetimi</h3>
              <div className="my-inline-actions">
                <input
                  className="my-input"
                  placeholder="Yeni lobi adi"
                  value={adminLobbyNameDraft}
                  onChange={(e) => setAdminLobbyNameDraft(e.target.value)}
                  disabled={adminBusy}
                />
                <button
                  className="my-action-btn"
                  onClick={() => runAdminLobbyAction("createLobby", { name: sanitizeLobbyName(adminLobbyNameDraft) })}
                  disabled={adminBusy || sanitizeLobbyName(adminLobbyNameDraft).length < 2}
                >
                  Lobi Ekle
                </button>
              </div>
              <div className="my-admin-room-list">
                {lobbyRooms.map((room) => (
                  <button
                    key={room.id}
                    className={`my-action-btn ${adminSelectedLobbyId === room.id ? "" : "soft"}`}
                    onClick={() => {
                      setAdminSelectedLobbyId(room.id);
                      setAdminLobbyNameDraft(room.name);
                    }}
                    disabled={adminBusy}
                  >
                    {room.name}
                  </button>
                ))}
              </div>
              {selectedAdminLobby ? (
                <div className="my-inline-actions">
                  <input
                    className="my-input"
                    value={adminLobbyNameDraft}
                    onChange={(e) => setAdminLobbyNameDraft(e.target.value)}
                    disabled={adminBusy}
                  />
                  <button
                    className="my-action-btn soft"
                    onClick={() => runAdminLobbyAction("renameLobby", { lobbyId: selectedAdminLobby.id, name: sanitizeLobbyName(adminLobbyNameDraft) })}
                    disabled={adminBusy || sanitizeLobbyName(adminLobbyNameDraft).length < 2}
                  >
                    Adi Degistir
                  </button>
                  <button
                    className="my-action-btn danger"
                    onClick={() => runAdminLobbyAction("deleteLobby", { lobbyId: selectedAdminLobby.id })}
                    disabled={adminBusy || lobbyRooms.length <= 1}
                  >
                    Lobiyi Sil
                  </button>
                </div>
              ) : null}
              {lobbyRoomsError ? <p className="my-error">{lobbyRoomsError}</p> : null}
              {adminNotice ? <p className="my-notice my-notice-soft">{adminNotice}</p> : null}
            </section>

            <section className="my-side-card">
              <h3>Oyun Kurallari</h3>
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
                <button className="my-action-btn soft" onClick={() => loadAdminState(member.id)} disabled={adminBusy}>
                  Yenile
                </button>
              </div>
              {adminError ? <p className="my-error">{adminError}</p> : null}
            </section>

            <section className="my-side-card my-admin-design-editor-card">
              <h3>Tasarim Modu</h3>
              <p className="line">Soldan duzenle, sagdaki onizleme alaninda canli olarak gor. Oyun mantigi degismez.</p>

              <div className="my-inline-actions">
                <button
                  className="my-action-btn soft"
                  onClick={() => setAdminDesignPreview((prev) => !prev)}
                  disabled={adminDesignBusy}
                >
                  {adminDesignPreview ? "Onizleme Acik" : "Onizleme Kapali"}
                </button>
                <button
                  className="my-action-btn soft"
                  onClick={() => resetDesignDraftToPublished(true)}
                  disabled={adminDesignBusy}
                >
                  Taslagi Geri Al
                </button>
                <button
                  className="my-action-btn danger"
                  onClick={leaveAdminWithoutSaving}
                  disabled={adminDesignBusy}
                >
                  Kaydetmeden Cik
                </button>
              </div>

              <details className="my-admin-design-group" open>
                <summary>Yerlesim ve Buton Siralari</summary>
              <div className="my-field">
                <span>Buton Sirasi (Surukle-Birak)</span>
                <div className="my-admin-room-list">
                  {normalizeDesignLayout(designDraft.layout, createDefaultDesignConfig().layout).lobbyHeaderActions.map((action) => (
                    <button
                      key={action}
                      className="my-action-btn soft"
                      draggable={!adminDesignBusy}
                      onDragStart={() => setAdminDesignDraggingAction(action)}
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDrop={() => {
                        moveDesignLobbyAction(action);
                        setAdminDesignDraggingAction(null);
                      }}
                      onDragEnd={() => setAdminDesignDraggingAction(null)}
                      disabled={adminDesignBusy}
                    >
                      {action === "openTable" ? "Masa Ac" : "Hemen Oyna"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="my-field">
                <span>Ust Bar Sirasi (Surukle-Birak)</span>
                <div className="my-admin-room-list">
                  {normalizeDesignLayout(designDraft.layout, createDefaultDesignConfig().layout).lobbyTopButtons.map((action) => (
                    <button
                      key={action}
                      className="my-action-btn soft"
                      draggable={!adminDesignBusy}
                      onDragStart={() => setAdminDesignDraggingTopButton(action)}
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDrop={() => {
                        moveDesignTopButton(action);
                        setAdminDesignDraggingTopButton(null);
                      }}
                      onDragEnd={() => setAdminDesignDraggingTopButton(null)}
                      disabled={adminDesignBusy}
                    >
                      {action === "home" ? "Ana Sayfa" : action === "roomSelect" ? "Tum Odalar" : "Bota Karsi"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="my-field">
                <span>Masa Sahibi Buton Sirasi</span>
                <div className="my-admin-room-list">
                  {normalizeDesignLayout(designDraft.layout, createDefaultDesignConfig().layout).roomOwnerButtons.map((action) => (
                    <button
                      key={action}
                      className="my-action-btn soft"
                      draggable={!adminDesignBusy}
                      onDragStart={() => setAdminDesignDraggingRoomOwnerButton(action)}
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDrop={() => {
                        moveDesignRoomOwnerButton(action);
                        setAdminDesignDraggingRoomOwnerButton(null);
                      }}
                      onDragEnd={() => setAdminDesignDraggingRoomOwnerButton(null)}
                      disabled={adminDesignBusy}
                    >
                      {action === "invite"
                        ? "Davet Et"
                        : action === "private"
                          ? "Masa Ozel Yap/Kapat"
                          : action === "spectator"
                            ? "Izleyici Yazisi Ac/Kapat"
                            : "Davet Linki Kopyala"}
                    </button>
                  ))}
                </div>
              </div>
              </details>

              <details className="my-admin-design-group">
                <summary>Renk ve Boyut</summary>
              <div className="my-admin-rules-grid">
                <label className="my-field">
                  <span>Buton Olcegi %</span>
                  <input
                    className="my-input"
                    type="range"
                    min={80}
                    max={140}
                    value={designDraft.sizing.buttonScalePct}
                    onChange={(e) => updateDesignSizing("buttonScalePct", normalizeRuleNumber(e.target.value, designDraft.sizing.buttonScalePct, 80, 140))}
                    disabled={adminDesignBusy}
                  />
                </label>
                <label className="my-field">
                  <span>Lobi Masa Alani</span>
                  <input
                    className="my-input"
                    type="number"
                    min={360}
                    max={760}
                    value={designDraft.sizing.lobbyTableZoneHeight}
                    onChange={(e) => updateDesignSizing("lobbyTableZoneHeight", normalizeRuleNumber(e.target.value, designDraft.sizing.lobbyTableZoneHeight, 360, 760))}
                    disabled={adminDesignBusy}
                  />
                </label>
                <label className="my-field">
                  <span>Tahta Min Yukseklik</span>
                  <input
                    className="my-input"
                    type="number"
                    min={420}
                    max={760}
                    value={designDraft.sizing.roomBoardMinHeight}
                    onChange={(e) => updateDesignSizing("roomBoardMinHeight", normalizeRuleNumber(e.target.value, designDraft.sizing.roomBoardMinHeight, 420, 760))}
                    disabled={adminDesignBusy}
                  />
                </label>
              </div>

              <div className="my-admin-rules-grid">
                <label className="my-field">
                  <span>Arkaplan Baslangic</span>
                  <input className="my-input" type="color" value={designDraft.theme.shellFrom} onChange={(e) => updateDesignTheme("shellFrom", e.target.value)} disabled={adminDesignBusy} />
                </label>
                <label className="my-field">
                  <span>Arkaplan Bitis</span>
                  <input className="my-input" type="color" value={designDraft.theme.shellTo} onChange={(e) => updateDesignTheme("shellTo", e.target.value)} disabled={adminDesignBusy} />
                </label>
                <label className="my-field">
                  <span>Topbar Baslangic</span>
                  <input className="my-input" type="color" value={designDraft.theme.topbarFrom} onChange={(e) => updateDesignTheme("topbarFrom", e.target.value)} disabled={adminDesignBusy} />
                </label>
                <label className="my-field">
                  <span>Topbar Bitis</span>
                  <input className="my-input" type="color" value={designDraft.theme.topbarTo} onChange={(e) => updateDesignTheme("topbarTo", e.target.value)} disabled={adminDesignBusy} />
                </label>
                <label className="my-field">
                  <span>Panel Font</span>
                  <input className="my-input" value={designDraft.theme.fontFamily} onChange={(e) => updateDesignTheme("fontFamily", e.target.value)} disabled={adminDesignBusy} />
                </label>
              </div>
              </details>

              <details className="my-admin-design-group">
                <summary>Metinler</summary>
              <div className="my-admin-rules-grid">
                <label className="my-field">
                  <span>Lobi Masa Ac</span>
                  <input
                    className="my-input"
                    value={designDraft.texts.lobbyOpenTable ?? ""}
                    onChange={(e) => updateDesignText("lobbyOpenTable", e.target.value)}
                    disabled={adminDesignBusy}
                  />
                </label>
                <label className="my-field">
                  <span>Lobi Hemen Oyna</span>
                  <input
                    className="my-input"
                    value={designDraft.texts.lobbyQuickPlay ?? ""}
                    onChange={(e) => updateDesignText("lobbyQuickPlay", e.target.value)}
                    disabled={adminDesignBusy}
                  />
                </label>
                <label className="my-field">
                  <span>Masadan Kalk</span>
                  <input
                    className="my-input"
                    value={designDraft.texts.roomLeaveTable ?? ""}
                    onChange={(e) => updateDesignText("roomLeaveTable", e.target.value)}
                    disabled={adminDesignBusy}
                  />
                </label>
                <label className="my-field">
                  <span>Gonder Butonu</span>
                  <input
                    className="my-input"
                    value={designDraft.texts.chatSend ?? ""}
                    onChange={(e) => updateDesignText("chatSend", e.target.value)}
                    disabled={adminDesignBusy}
                  />
                </label>
              </div>

              <div className="my-admin-rules-grid">
                <label className="my-field">
                  <span>Ust Bar Ana Sayfa</span>
                  <input
                    className="my-input"
                    value={designDraft.texts.lobbyHome ?? ""}
                    onChange={(e) => updateDesignText("lobbyHome", e.target.value)}
                    disabled={adminDesignBusy}
                  />
                </label>
                <label className="my-field">
                  <span>Ust Bar Tum Odalar</span>
                  <input
                    className="my-input"
                    value={designDraft.texts.lobbyRoomSelect ?? ""}
                    onChange={(e) => updateDesignText("lobbyRoomSelect", e.target.value)}
                    disabled={adminDesignBusy}
                  />
                </label>
                <label className="my-field">
                  <span>Ust Bar Bota Karsi</span>
                  <input
                    className="my-input"
                    value={designDraft.texts.lobbyBotMode ?? ""}
                    onChange={(e) => updateDesignText("lobbyBotMode", e.target.value)}
                    disabled={adminDesignBusy}
                  />
                </label>
                <label className="my-field">
                  <span>Masa Menusu Lobiye Don</span>
                  <input
                    className="my-input"
                    value={designDraft.texts.roomBackLobby ?? ""}
                    onChange={(e) => updateDesignText("roomBackLobby", e.target.value)}
                    disabled={adminDesignBusy}
                  />
                </label>
                <label className="my-field">
                  <span>Davet Et</span>
                  <input
                    className="my-input"
                    value={designDraft.texts.roomInvite ?? ""}
                    onChange={(e) => updateDesignText("roomInvite", e.target.value)}
                    disabled={adminDesignBusy}
                  />
                </label>
                <label className="my-field">
                  <span>Masa Ozel Yap</span>
                  <input
                    className="my-input"
                    value={designDraft.texts.roomPrivateEnable ?? ""}
                    onChange={(e) => updateDesignText("roomPrivateEnable", e.target.value)}
                    disabled={adminDesignBusy}
                  />
                </label>
                <label className="my-field">
                  <span>Ozeli Kapat</span>
                  <input
                    className="my-input"
                    value={designDraft.texts.roomPrivateDisable ?? ""}
                    onChange={(e) => updateDesignText("roomPrivateDisable", e.target.value)}
                    disabled={adminDesignBusy}
                  />
                </label>
                <label className="my-field">
                  <span>Izleyici Yazisini Ac</span>
                  <input
                    className="my-input"
                    value={designDraft.texts.roomSpectatorEnable ?? ""}
                    onChange={(e) => updateDesignText("roomSpectatorEnable", e.target.value)}
                    disabled={adminDesignBusy}
                  />
                </label>
                <label className="my-field">
                  <span>Izleyici Yazisini Kapat</span>
                  <input
                    className="my-input"
                    value={designDraft.texts.roomSpectatorDisable ?? ""}
                    onChange={(e) => updateDesignText("roomSpectatorDisable", e.target.value)}
                    disabled={adminDesignBusy}
                  />
                </label>
                <label className="my-field">
                  <span>Davet Linki Kopyala</span>
                  <input
                    className="my-input"
                    value={designDraft.texts.roomCopyInvite ?? ""}
                    onChange={(e) => updateDesignText("roomCopyInvite", e.target.value)}
                    disabled={adminDesignBusy}
                  />
                </label>
              </div>
              </details>

              <details className="my-admin-design-group">
                <summary>Yayin ve Geri Alma</summary>
              <div className="my-inline-actions">
                <button className="my-action-btn" onClick={publishDesignDraft} disabled={adminDesignBusy}>
                  {adminDesignBusy ? "Yayinlaniyor..." : "Yayinla"}
                </button>
                <button className="my-action-btn soft" onClick={resetDesignToDefault} disabled={adminDesignBusy}>
                  Varsayilan
                </button>
              </div>

              <div className="my-inline-actions">
                <select
                  className="my-input"
                  value={String(adminDesignRollbackVersion || "")}
                  onChange={(e) => setAdminDesignRollbackVersion(Number.parseInt(e.target.value, 10) || 0)}
                  disabled={adminDesignBusy || adminDesignHistory.length === 0}
                >
                  {adminDesignHistory.length === 0 ? (
                    <option value="">Geri alinacak surum yok</option>
                  ) : (
                    adminDesignHistory.map((version) => (
                      <option key={version.version} value={version.version}>
                        v{version.version} - {new Date(version.updatedAt).toLocaleString("tr-TR")}
                      </option>
                    ))
                  )}
                </select>
                <button
                  className="my-action-btn soft"
                  onClick={rollbackDesignVersion}
                  disabled={adminDesignBusy || !adminDesignRollbackVersion}
                >
                  Geri Al
                </button>
              </div>
              </details>
              {adminDesignNotice ? <p className="my-notice my-notice-soft">{adminDesignNotice}</p> : null}
              {adminDesignError ? <p className="my-error">{adminDesignError}</p> : null}
            </section>

            <section className="my-side-card my-admin-design-preview-card">
              <h3>Tasarim Onizleme</h3>
              <p className="line">
                {adminDesignPreview
                  ? "Onizleme acik: Asagida taslak degisiklikleri goruyorsun."
                  : "Onizleme kapali: Asagida yayindaki son gorunum gosteriliyor."}
              </p>
              <div className="my-admin-design-preview-surface" style={designPreviewCssVars}>
                <div className="my-admin-design-preview-topbar">
                  {designPreviewLayout.lobbyTopButtons.map((action) => (
                    <button key={`preview-top-${action}`} className="my-top-btn my-btn-member-alt" type="button">
                      {action === "home"
                        ? (designPreviewTarget.texts.lobbyHome || "Ana Sayfa")
                        : action === "roomSelect"
                          ? (designPreviewTarget.texts.lobbyRoomSelect || "Tum Odalar")
                          : (designPreviewTarget.texts.lobbyBotMode || "Bota Karsi")}
                    </button>
                  ))}
                </div>
                <div className="my-admin-design-preview-lobby">
                  <div className="my-admin-design-preview-title">
                    <strong>Lobi 1</strong>
                    <span>{designPreviewTarget.texts.lobbyEmptyTitle || "Acik masalar"}</span>
                  </div>
                  <p className="line">{designPreviewTarget.texts.lobbyEmptySub || "Masa ve sohbet alanini burada canli gorursun."}</p>
                  <div className="my-admin-design-preview-actions">
                    {designPreviewLayout.lobbyHeaderActions.map((action) => (
                      <button key={`preview-head-${action}`} className={`my-top-btn ${action === "openTable" ? "my-btn-open" : "my-btn-play"}`} type="button">
                        {action === "openTable"
                          ? (designPreviewTarget.texts.lobbyOpenTable || "Masa Ac")
                          : (designPreviewTarget.texts.lobbyQuickPlay || "Hemen Oyna")}
                      </button>
                    ))}
                  </div>
                  <div className="my-admin-design-preview-owner">
                    {designPreviewLayout.roomOwnerButtons.map((action) => (
                      <button key={`preview-owner-${action}`} className="my-action-btn soft" type="button">
                        {action === "invite"
                          ? (designPreviewTarget.texts.roomInvite || "Davet Et")
                          : action === "private"
                            ? (designPreviewTarget.texts.roomPrivateEnable || "Masa Ozel Yap")
                            : action === "spectator"
                              ? (designPreviewTarget.texts.roomSpectatorDisable || "Izleyici Yazisini Kapat")
                              : (designPreviewTarget.texts.roomCopyInvite || "Davet Linki Kopyala")}
                      </button>
                    ))}
                    <button className="my-action-btn soft" type="button">
                      {designPreviewTarget.texts.roomBackLobby || "Lobiye Don"}
                    </button>
                    <button className="my-action-btn danger" type="button">
                      {designPreviewTarget.texts.roomLeaveTable || "Masadan Kalk"}
                    </button>
                  </div>
                  <div className="my-admin-design-preview-chat">
                    <span>ornek: Kullanici: Merhaba, bu bir onizleme mesajidir.</span>
                    <button className="my-action-btn" type="button">
                      {designPreviewTarget.texts.chatSend || "Gonder"}
                    </button>
                  </div>
                </div>
              </div>
              <p className="line">Kaydetmeden ciktiginda tum taslak degisiklikler silinir, yayinlanan gorunum aynen kalir.</p>
            </section>

            <section className="my-side-card my-admin-users-panel">
              <h3>Kullanıcı Yönetimi</h3>
              <div className="my-admin-toolbar">
                <input
                  className="my-input"
                  placeholder="Kullanıcı ara"
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
                  <option value="user">Sadece Üye</option>
                </select>
              </div>

              <div className="my-admin-user-split">
                <div className="my-admin-user-list-compact">
                  {visibleAdminUsers.map((user) => (
                    <button
                      key={user.id}
                      className={`my-action-btn ${adminSelectedUserId === user.id ? "" : "soft"}`}
                      onClick={() => setAdminSelectedUserId(user.id)}
                    >
                      {user.displayName} ({user.points})
                    </button>
                  ))}
                </div>

                <div className="my-admin-user-detail">
                  {selectedAdminUser ? (
                    <>
                      <h4>{selectedAdminUser.displayName}</h4>
                      <p className="line">@{selectedAdminUser.username}</p>
                      <p className="line">{selectedAdminUser.email}</p>
                      <p className="line">Rol: {selectedAdminUser.role === "admin" ? "Admin" : "Üye"}</p>
                      <p className="line">Durum: {selectedAdminUser.isBlocked ? "Engelli" : "Aktif"}</p>
                      <p className="line">Puan: {selectedAdminUser.points}</p>
                      <p className="line">
                        Oyun: {selectedAdminUser.stats.gamesPlayed} / K: {selectedAdminUser.stats.wins} / M: {selectedAdminUser.stats.losses} / Kacis: {selectedAdminUser.stats.resigns}
                      </p>

                      <div className="my-admin-actions">
                        <button
                          className={`my-action-btn ${selectedAdminUser.isBlocked ? "" : "soft"}`}
                          onClick={() => runAdminUserAction(selectedAdminUser.id, "setBlocked", { blocked: !selectedAdminUser.isBlocked })}
                          disabled={adminBusy || selectedAdminUser.id === member.id}
                        >
                          {selectedAdminUser.isBlocked ? "Engeli Kaldır" : "Kullanıcıyı Engelle"}
                        </button>
                        <button
                          className={`my-action-btn ${selectedAdminUser.permissions.lobbyChat ? "soft" : ""}`}
                          onClick={() => runAdminUserAction(selectedAdminUser.id, "setPermission", { permission: "lobbyChat", value: !selectedAdminUser.permissions.lobbyChat })}
                          disabled={adminBusy}
                        >
                          Lobi Mesaj: {selectedAdminUser.permissions.lobbyChat ? "Acik" : "Kapali"}
                        </button>
                        <button
                          className={`my-action-btn ${selectedAdminUser.permissions.tableChat ? "soft" : ""}`}
                          onClick={() => runAdminUserAction(selectedAdminUser.id, "setPermission", { permission: "tableChat", value: !selectedAdminUser.permissions.tableChat })}
                          disabled={adminBusy}
                        >
                          Masa Mesaj: {selectedAdminUser.permissions.tableChat ? "Acik" : "Kapali"}
                        </button>
                        <button
                          className={`my-action-btn ${selectedAdminUser.permissions.spectatorChat ? "soft" : ""}`}
                          onClick={() => runAdminUserAction(selectedAdminUser.id, "setPermission", { permission: "spectatorChat", value: !selectedAdminUser.permissions.spectatorChat })}
                          disabled={adminBusy}
                        >
                          İzleyici Mesaj: {selectedAdminUser.permissions.spectatorChat ? "Açık" : "Kapalı"}
                        </button>
                        <button
                          className="my-action-btn"
                          onClick={() => runAdminUserAction(selectedAdminUser.id, "setRole", { role: selectedAdminUser.role === "admin" ? "user" : "admin" })}
                          disabled={adminBusy}
                        >
                          {selectedAdminUser.role === "admin" ? "Üyeye Çevir" : "Admin Yap"}
                        </button>
                        <button
                          className="my-action-btn danger"
                          onClick={() => runAdminUserAction(selectedAdminUser.id, "deleteUser")}
                          disabled={adminBusy || selectedAdminUser.id === member.id}
                        >
                          Kullanıcıyı Sil
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="my-chat-empty">Detay icin listeden bir kullanici sec.</p>
                  )}
                </div>
              </div>
            </section>
          </section>
        )}
      </main>
    );
  }

  return (
    <main className="my-shell" style={designCssVars}>
      {viewMode === "lobby" ? (
        <header className="my-topbar">
          <div className="my-topbar-left">
            {!roomSession && !showGamePicker && !showRoomPicker ? (
              <>
                <button
                  className="my-top-btn my-btn-member-alt"
                  style={{ order: lobbyTopButtonOrder.indexOf("home") }}
                  onClick={goToGameSelection}
                >
                  {activeDesign.texts.lobbyHome || "Ana Sayfa"}
                </button>
                <button
                  className="my-top-btn my-btn-member-alt"
                  style={{ order: lobbyTopButtonOrder.indexOf("roomSelect") }}
                  onClick={openAllRoomsPicker}
                >
                  {activeDesign.texts.lobbyRoomSelect || "Tum Odalar"}
                </button>
                <button
                  className="my-top-btn my-btn-open my-lobby-top-action-hidden my-design-label-btn"
                  data-design-label={activeDesign.texts.lobbyOpenTable || "Masa Aç"}
                  onClick={onOpenTable}
                >
                  Masa Aç
                </button>
                <button className="my-top-btn my-btn-play my-lobby-top-action-hidden" onClick={onQuickPlay}>
                  {activeDesign.texts.lobbyQuickPlay || "Hemen Oyna"}
                </button>
                {isTavlaSelectedGame ? (
                  <button className="my-top-btn my-btn-bot" style={{ order: lobbyTopButtonOrder.indexOf("botMode") }} onClick={startBotGame}>
                    {activeDesign.texts.lobbyBotMode || "Bota Karsi"}
                  </button>
                ) : null}
              </>
            ) : null}
            {roomSession ? (
              <>
                {isTavlaSelectedGame ? (
                  <button className="my-top-btn my-btn-member-alt" onClick={returnToActiveTableView}>
                    Masaya Don
                  </button>
                ) : null}
                <button className="my-top-btn my-btn-danger" onClick={openLeaveActionModal}>
                  {activeDesign.texts.roomLeaveTable || "Masadan Kalk"}
                </button>
              </>
            ) : null}
          </div>

          <div className="my-topbar-right my-topbar-account-wrap">
            <button
              className="my-account-trigger"
              onClick={() => setAccountMenuOpen((current) => !current)}
              title={member ? "Profil ve ayarlar" : "Üyelik ve giriş"}
            >
              <AvatarBadge avatarId={currentProfile.avatarId} gender={currentProfile.gender} size="sm" />
              <span>{member ? member.displayName : "Misafir"}</span>
            </button>
            {!member ? (
              <>
                <button className="my-top-btn my-btn-member" onClick={() => openAccountMenu("register")}>
                  Üye Ol
                </button>
                <button className="my-top-btn my-btn-member-alt" onClick={() => openAccountMenu("login")}>
                  Giris
                </button>
              </>
            ) : (
              <>
                <button className="my-top-btn my-btn-member-alt" onClick={() => setAccountMenuOpen((current) => !current)}>
                  Ayarlar
                </button>
                {isAdmin ? (
                  <button className="my-top-btn my-btn-member" onClick={openAdminPanelWindow}>
                    Admin Paneli
                  </button>
                ) : null}
              </>
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
                        <p className="line">Kullanıcı: @{member.username}</p>
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
                        {memberActionBusy ? "İşleniyor..." : "Şifre Değiştir"}
                      </button>
                    </div>
                    {memberNotice ? <p className="my-notice my-notice-soft">{memberNotice}</p> : null}
                    <div className="my-inline-actions">
                      <button className="my-action-btn soft" onClick={onLogoutMember}>
                        Çıkış
                      </button>
                      {isAdmin ? <p className="line">Admin paneline ust menudeki <strong>Admin Paneli</strong> butonundan ulasabilirsin.</p> : null}
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
                        Üye Ol
                      </button>
                      <button className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")} disabled={authBusy}>
                        Giris
                      </button>
                    </div>
                    {authMode === "register" ? (
                      <>
                        <input
                          className="my-input"
                          placeholder="Kullanıcı adı (or: gokcek34)"
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
                          placeholder="Şifre"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          disabled={authBusy}
                        />
                        <button className="my-action-btn" onClick={onRegisterMember} disabled={authBusy}>
                          {authBusy ? "İşleniyor..." : "Üye Ol ve Başla"}
                        </button>
                      </>
                    ) : (
                      <>
                        <input
                          className="my-input"
                          placeholder="Kullanıcı adı veya E-posta"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          disabled={authBusy}
                        />
                        <input
                          className="my-input"
                          type="password"
                          placeholder="Şifre"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          disabled={authBusy}
                        />
                        <button className="my-action-btn" onClick={onLoginMember} disabled={authBusy}>
                          {authBusy ? "Isleniyor..." : "Giris Yap"}
                        </button>
                        <p className="line">Şifremi unuttum</p>
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
                          {forgotBusy ? "İşleniyor..." : "E-posta ile Şifre Sıfırla"}
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
        showGamePicker ? (
          <section className="my-entry-page my-game-picker-page">
            <div className="my-entry-head">
              <h2>Oyun Secimi</h2>
              <p>Oynamak istedigin oyunu secerek devam et.</p>
            </div>
            <div className="my-game-picker-grid">
              <button
                type="button"
                className={`my-game-picker-card game-tavla ${isTavlaSelectedGame ? "active" : ""}`}
                onClick={() => onSelectGame("tavla")}
              >
                <span className="my-game-picker-thumb" aria-hidden="true" />
                <span className="my-game-picker-badge">Hazir</span>
                <strong>Klasik Tavla</strong>
                <p>Online masa, bot modu ve mevcut sistemle devam et.</p>
              </button>
              {canAccessOkeyPrototype ? (
                <button
                  type="button"
                  className={`my-game-picker-card game-okey ${selectedGameId === "okey101" ? "active" : ""}`}
                  onClick={() => onSelectGame("okey101")}
                >
                  <span className="my-game-picker-thumb" aria-hidden="true" />
                  <span className="my-game-picker-badge">Prototip</span>
                  <strong>101 Okey</strong>
                  <p>Izole gelistirme alaniyla 101 Okey altyapisini guvenli sekilde baslat.</p>
                </button>
              ) : null}
              <article className="my-game-picker-card game-batak disabled">
                <span className="my-game-picker-thumb" aria-hidden="true" />
                <span className="my-game-picker-badge">Yakinda</span>
                <strong>Batak</strong>
                <p>Batak masasi yakinda bu ekrana eklenecek.</p>
              </article>
            </div>
          </section>
        ) : !isTavlaSelectedGame && okeyPrototypeRoomSketchOpen ? (
          <section className="my-entry-page my-game-coming-soon-page">
            <div className="my-entry-head">
              <h2>101 Okey</h2>
              <p>Bu ekran izole prototip alanidir. Tavla sistemi etkilenmez.</p>
            </div>
            <div className="my-game-coming-shell">
              <article className="my-empty-state my-game-coming-soon-state">
                <span className="my-game-coming-pill">Prototip Asamasi</span>
                <p className="my-empty-state-title">101 Okey gelistirmesi basladi.</p>
                <p className="my-empty-state-sub">
                  Bu alan sadece 101 gelistirmesi icin acildi. Tavla kodlari ve online akisi ayni sekilde devam eder.
                </p>
                <div className="my-game-coming-list">
                  <p>Ilk adimlar:</p>
                  <p>1. Oda/lobi yapisini Tavla ile ortak kullan.</p>
                  <p>2. Okey masa durum modelini ayri state katmani ile kur.</p>
                  <p>3. Oyun ici UI ve hamle kurallarini asamali ac.</p>
                </div>
                <div className="my-game-coming-soon-actions">
                  <button className="my-action-btn" type="button" onClick={goToGameSelection}>
                    Ana Sayfaya Don
                  </button>
                  <button className="my-action-btn soft" type="button" onClick={() => onSelectGame("tavla")}>
                    Tavla Moduna Gec
                  </button>
                  <button
                    className="my-action-btn soft"
                    type="button"
                    onClick={() => setOkeyPrototypeRoomSketchOpen((prev) => !prev)}
                  >
                    {okeyPrototypeRoomSketchOpen ? "101 Oda Taslagini Kapat" : "101 Oda Taslagini Ac"}
                  </button>
                </div>
              </article>

              <div className="my-game-coming-side">
                <aside className="my-game-coming-plan">
                  <h3>Yol Haritasi</h3>
                  <div className="my-game-coming-plan-grid">
                    <article className="my-game-coming-plan-card">
                      <strong>Adim 1</strong>
                      <p>Okey lobi girisi ve masa olusturma akisi.</p>
                    </article>
                    <article className="my-game-coming-plan-card">
                      <strong>Adim 2</strong>
                      <p>Tas dizilimi, sira yonetimi ve temel oyun dongusu.</p>
                    </article>
                    <article className="my-game-coming-plan-card">
                      <strong>Adim 3</strong>
                      <p>Sohbet, puanlama, oda ozetleri ve mobil iyilestirme.</p>
                    </article>
                  </div>
                </aside>

                <section className="my-game-coming-preview">
                  <div className="my-game-coming-preview-head">
                    <h3>101 Lobi Onizleme</h3>
                    <span>UI Taslak</span>
                  </div>
                  <div className="my-game-coming-preview-grid">
                    <article className="my-game-coming-preview-card waiting">
                      <header>
                        <strong>Masa Yok</strong>
                        <em>Bekliyor</em>
                      </header>
                      <p>Henüz açık masa bulunmuyor.</p>
                      <p>Masa sahibi ilk masayı açar.</p>
                      <p>4 oyuncu dolunca oyun başlar.</p>
                      <p>Admin masayı kapatabilir.</p>
                    </article>
                    <article className="my-game-coming-preview-card active">
                      <header>
                        <strong>Masa Kuralları</strong>
                        <em>101</em>
                      </header>
                      <p>Sadece 4 koltuk bulunur.</p>
                      <p>Masa sahibi masayı açan oyuncudur.</p>
                      <p>Dolmadan oyun başlamaz.</p>
                      <p>Kapanan masa listeden düşer.</p>
                    </article>
                  </div>
                </section>
              </div>
            </div>
            {okeyPrototypeRoomSketchOpen ? (
              <section
                className="my-game-coming-room-shell"
                data-table-active={okeyPrototypeSeatReservation ? "true" : "false"}
                style={{ "--okey-proto-tile-scale": String(okeyPrototypeTileScale) } as CSSProperties}
              >
                <div className="my-game-coming-room-head">
                  <h3>101 Oda Taslagi</h3>
                  <span>Izole Prototip</span>
                </div>
                <div className="my-game-coming-room-filters">
                  <button
                    type="button"
                    className={`my-game-coming-room-filter ${okeyPrototypeRoomFilter === "all" ? "active" : ""}`}
                    onClick={() => setOkeyPrototypeRoomFilter("all")}
                  >
                    Tumu
                  </button>
                  <button
                    type="button"
                    className={`my-game-coming-room-filter ${okeyPrototypeRoomFilter === "fast" ? "active" : ""}`}
                    onClick={() => setOkeyPrototypeRoomFilter("fast")}
                  >
                    Hizli
                  </button>
                  <button
                    type="button"
                    className={`my-game-coming-room-filter ${okeyPrototypeRoomFilter === "busy" ? "active" : ""}`}
                    onClick={() => setOkeyPrototypeRoomFilter("busy")}
                  >
                    Kalabalik
                  </button>
                </div>
                {okeyPrototypeSelectedRoom ? (
                  <div className="my-game-coming-room-selected">
                    <strong>Secili Oda: {okeyPrototypeSelectedRoom.name}</strong>
                    <p>
                      Mod: {okeyPrototypeSelectedRoom.level} | Aktif Masa: {okeyPrototypeSelectedRoom.activeTables} | Oyuncu: {okeyPrototypeSelectedRoom.players}
                    </p>
                    <p>Gorunen Oda: {okeyPrototypeFilteredRooms.length} | Toplam Oyuncu: {okeyPrototypeFilteredPlayers}</p>
                  </div>
                ) : null}
                <div className="my-game-coming-room-grid">
                  {okeyPrototypeFilteredRooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      className={`my-game-coming-room-card ${okeyPrototypeSelectedRoomId === room.id ? "active" : ""}`}
                      onClick={() => {
                        setOkeyPrototypeSelectedRoomId(room.id);
                        appendOkeyPrototypeAction(`Oda secildi: ${room.name}`);
                      }}
                    >
                      <header>
                        <strong>{room.name}</strong>
                        <em>{room.level}</em>
                      </header>
                      <p>Aktif Masa: {room.activeTables}</p>
                      <p>Oyuncu: {room.players}</p>
                    </button>
                  ))}
                </div>
                {okeyPrototypeSelectedRoom ? (
                  <section className="my-game-coming-table-sketch">
                    <div className="my-game-coming-table-sketch-head">
                      <strong>{okeyPrototypeSelectedRoom.name} | Masa Taslagi</strong>
                      <span>
                        {okeyPrototypeVisibleTableSketchRows.length}/{okeyPrototypeTableSketchRows.length} Masa | Filtre: {okeyPrototypeActiveFilters.length}
                      </span>
                    </div>
                    <div className="my-game-coming-table-sketch-filters">
                      <button
                        type="button"
                        className={`my-game-coming-table-sketch-filter ${okeyPrototypeTableFilter === "all" ? "active" : ""}`}
                        aria-pressed={okeyPrototypeTableFilter === "all"}
                        title="Tum masa filtrelerini goster"
                        aria-label="Tum masa filtrelerini goster"
                        onClick={() => setOkeyPrototypeTableFilter("all")}
                      >
                        Tumu
                      </button>
                      <button
                        type="button"
                        className={`my-game-coming-table-sketch-filter ${okeyPrototypeTableFilter === "active" ? "active" : ""}`}
                        aria-pressed={okeyPrototypeTableFilter === "active"}
                        title="Sadece aktif masalari goster"
                        aria-label="Sadece aktif masalari goster"
                        onClick={() => setOkeyPrototypeTableFilter("active")}
                      >
                        Aktif
                      </button>
                      <button
                        type="button"
                        className={`my-game-coming-table-sketch-filter ${okeyPrototypeTableFilter === "waiting" ? "active" : ""}`}
                        aria-pressed={okeyPrototypeTableFilter === "waiting"}
                        title="Sadece bekleyen masalari goster"
                        aria-label="Sadece bekleyen masalari goster"
                        onClick={() => setOkeyPrototypeTableFilter("waiting")}
                      >
                        Bekleyen
                      </button>
                      <button
                        type="button"
                        className={`my-game-coming-table-sketch-filter ${okeyPrototypeOnlyWithFreeSeats ? "active" : ""}`}
                        aria-pressed={okeyPrototypeOnlyWithFreeSeats}
                        title={okeyPrototypeOnlyWithFreeSeats ? "Bos koltuk filtresini kapat" : "Bos koltuk filtresini ac"}
                        aria-label={okeyPrototypeOnlyWithFreeSeats ? "Bos koltuk filtresini kapat" : "Bos koltuk filtresini ac"}
                        onClick={() => {
                          setOkeyPrototypeOnlyWithFreeSeats((current) => {
                            const next = !current;
                            appendOkeyPrototypeAction(next ? "Bos koltuk filtresi acildi." : "Bos koltuk filtresi kapatildi.");
                            return next;
                          });
                        }}
                      >
                        Bos Koltuk Var
                      </button>
                    </div>
                    <div className="my-game-coming-table-sketch-sort">
                      <label htmlFor="okey-prototype-table-sort">Siralama</label>
                      <select
                        id="okey-prototype-table-sort"
                        className="my-game-coming-table-sketch-sort-select"
                        value={okeyPrototypeTableSort}
                        onChange={(e) => setOkeyPrototypeTableSort(e.target.value as "tableNo" | "occupancy" | "status")}
                        title="Masa listesini siralar"
                        aria-label="Masa listesi siralama secimi"
                        aria-controls="okey-prototype-table-sketch-grid"
                      >
                        <option value="tableNo">Masa No</option>
                        <option value="occupancy">Doluluk</option>
                        <option value="status">Durum</option>
                      </select>
                    </div>
                    <div className="my-game-coming-table-sketch-search">
                      <label htmlFor="okey-prototype-table-search">Masa Ara</label>
                      <div className="my-game-coming-table-sketch-search-row">
                        <input
                          id="okey-prototype-table-search"
                          className="my-game-coming-table-sketch-search-input"
                          value={okeyPrototypeTableSearch}
                          onChange={(e) => setOkeyPrototypeTableSearch(e.target.value.replace(/[^\d]/g, "").slice(0, 2))}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            e.preventDefault();
                            selectFirstOkeyPrototypeSearchResult();
                          }}
                          placeholder="Masa No (or. 3)"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          enterKeyHint="search"
                          autoComplete="off"
                          spellCheck={false}
                          maxLength={2}
                          title="Masa numarasina gore arama yapar"
                          aria-describedby="okey-prototype-table-search-meta"
                          aria-controls="okey-prototype-table-sketch-grid"
                        />
                        <button
                          type="button"
                          className="my-action-btn soft my-game-coming-table-sketch-search-pick-btn"
                          onClick={selectFirstOkeyPrototypeSearchResult}
                          disabled={okeyPrototypeTableSearch.trim().length === 0 || okeyPrototypeVisibleTableSketchRows.length === 0}
                          title="Arama sonucundaki ilk masayi secer"
                          aria-label="Arama sonucundaki ilk masayi sec"
                        >
                          Ilk Sonuc
                        </button>
                        <button
                          type="button"
                          className="my-action-btn soft my-game-coming-table-sketch-search-clear-btn"
                          onClick={() => {
                            if (okeyPrototypeTableSearch.trim().length === 0) return;
                            setOkeyPrototypeTableSearch("");
                            appendOkeyPrototypeAction("Masa aramasi temizlendi.");
                          }}
                          disabled={okeyPrototypeTableSearch.trim().length === 0}
                          title="Masa arama kutusunu temizler"
                          aria-label="Masa aramasini temizle"
                        >
                          Temizle
                        </button>
                      </div>
                      <p id="okey-prototype-table-search-meta" className="my-game-coming-table-sketch-search-meta" aria-live="polite" role="status" aria-atomic="true">
                        Sonuc: {okeyPrototypeVisibleTableSketchRows.length} masa | Enter: Ilk Sonuc
                      </p>
                    </div>
                    <button
                      type="button"
                      className="my-action-btn soft my-game-coming-table-sketch-reset-btn"
                      onClick={resetOkeyPrototypeTableFilters}
                      disabled={!okeyPrototypeHasTableFilters}
                      title="Tum masa filtrelerini temizler"
                      aria-label={`Filtreleri sifirla. Aktif filtre: ${okeyPrototypeActiveFilters.length}`}
                    >
                      Filtreleri Sifirla ({okeyPrototypeActiveFilters.length})
                    </button>
                    {okeyPrototypeActiveFilters.length > 0 ? (
                      <div className="my-game-coming-table-sketch-active-filters">
                        <p className="my-game-coming-table-sketch-filter-count" aria-live="polite" role="status" aria-atomic="true">
                          Aktif filtreler: {okeyPrototypeActiveFilters.length}
                        </p>
                        {okeyPrototypeActiveFilters.map((filter) => (
                          <button
                            key={`okey-filter-${filter.key}`}
                            type="button"
                            className="my-game-coming-table-sketch-filter-chip-btn"
                            onClick={() => clearOkeyPrototypeFilterChip(filter.key, filter.label)}
                            aria-label={`${filter.label} filtresini kaldir`}
                            title={`${filter.label} filtresini kaldir`}
                          >
                            {filter.label} ×
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="my-game-coming-table-sketch-filter-empty" aria-live="polite" role="status" aria-atomic="true">Aktif filtre yok.</p>
                    )}
                    {okeyPrototypeSelectedTable ? (
                      <p className="my-game-coming-table-sketch-selected" aria-live="polite" role="status" aria-atomic="true">
                        Secili Masa: {okeyPrototypeSelectedTable.tableNo} | Durum: {okeyPrototypeSelectedTable.active ? "Aktif" : "Bekliyor"} | Dolu Koltuk: {okeyPrototypeSelectedTable.seated}/4
                      </p>
                    ) : null}
                    {okeyPrototypeSelectedTable && okeyPrototypeVisibleTableSketchRows.length > 1 ? (
                      <div className="my-game-coming-table-sketch-nav">
                        <span className="my-game-coming-table-sketch-nav-indicator" aria-live="polite" role="status" aria-atomic="true">
                          {okeyPrototypeSelectedTablePosition}/{okeyPrototypeVisibleTableSketchRows.length}
                        </span>
                        <button
                          type="button"
                          className="my-action-btn soft my-game-coming-table-sketch-nav-btn"
                          onClick={() => jumpOkeyPrototypeTableSelection("first")}
                          disabled={okeyPrototypeSelectedTableIndex <= 0}
                          title="Ilk masaya git"
                          aria-label="Ilk masaya git"
                        >
                          Ilk Masa
                        </button>
                        <button
                          type="button"
                          className="my-action-btn soft my-game-coming-table-sketch-nav-btn"
                          onClick={() => moveOkeyPrototypeTableSelection(-1)}
                          disabled={okeyPrototypeSelectedTableIndex <= 0}
                          title="Onceki masaya git"
                          aria-label="Onceki masaya git"
                        >
                          Onceki Masa
                        </button>
                        <button
                          type="button"
                          className="my-action-btn soft my-game-coming-table-sketch-nav-btn"
                          onClick={() => moveOkeyPrototypeTableSelection(1)}
                          disabled={okeyPrototypeSelectedTableIndex < 0 || okeyPrototypeSelectedTableIndex >= okeyPrototypeVisibleTableSketchRows.length - 1}
                          title="Sonraki masaya git"
                          aria-label="Sonraki masaya git"
                        >
                          Sonraki Masa
                        </button>
                        <button
                          type="button"
                          className="my-action-btn soft my-game-coming-table-sketch-nav-btn"
                          onClick={pickRandomOkeyPrototypeTable}
                          disabled={okeyPrototypeVisibleTableSketchRows.length < 2}
                          title="Rastgele masa sec"
                          aria-label="Rastgele masa sec"
                        >
                          Rastgele Masa
                        </button>
                        <button
                          type="button"
                          className="my-action-btn soft my-game-coming-table-sketch-nav-btn"
                          onClick={pickRandomOkeyPrototypeFreeSeatTable}
                          disabled={okeyPrototypeRandomFreeSeatTableCandidates.length === 0}
                          title="Rastgele bos koltuklu masa sec"
                          aria-label="Rastgele bos koltuklu masa sec"
                        >
                          Rastgele Bos
                        </button>
                        <button
                          type="button"
                          className="my-action-btn soft my-game-coming-table-sketch-nav-btn"
                          onClick={() => jumpOkeyPrototypeTableSelection("last")}
                          disabled={okeyPrototypeSelectedTableIndex < 0 || okeyPrototypeSelectedTableIndex >= okeyPrototypeVisibleTableSketchRows.length - 1}
                          title="Son masaya git"
                          aria-label="Son masaya git"
                        >
                          Son Masa
                        </button>
                      </div>
                    ) : null}
                    <div className="my-game-coming-table-sketch-summary">
                      <article className="my-game-coming-table-sketch-summary-item">
                        <strong>{okeyPrototypeTableSummary.total}</strong>
                        <span>Gorunen Masa</span>
                      </article>
                      <article className="my-game-coming-table-sketch-summary-item">
                        <strong>{okeyPrototypeTableSummary.active}</strong>
                        <span>Aktif</span>
                      </article>
                      <article className="my-game-coming-table-sketch-summary-item">
                        <strong>{okeyPrototypeTableSummary.waiting}</strong>
                        <span>Bekleyen</span>
                      </article>
                      <article className="my-game-coming-table-sketch-summary-item">
                        <strong>{okeyPrototypeTableSummary.occupiedSeats}</strong>
                        <span>Toplam Dolu</span>
                      </article>
                      <article className="my-game-coming-table-sketch-summary-item">
                        <strong>{okeyPrototypeTableSummary.freeSeats}</strong>
                        <span>Toplam Bos</span>
                      </article>
                      <article className="my-game-coming-table-sketch-summary-item">
                        <strong>%{okeyPrototypeTableSummary.occupancyPct}</strong>
                        <span>Doluluk</span>
                      </article>
                    </div>
                    {okeyPrototypeQuickJoinTable ? (
                      <div className="my-game-coming-table-sketch-quick-join">
                        <p>
                          Hizli Oneri: Masa {okeyPrototypeQuickJoinTable.tableNo} | Bos Koltuk: {Math.max(0, 4 - okeyPrototypeQuickJoinTable.seated)}
                          {" "}({okeyPrototypeTableSummary.freeSeats} bos koltuk / {okeyPrototypeTableSummary.occupiedSeats} dolu)
                        </p>
                        <div className="my-game-coming-table-sketch-quick-join-actions">
                          <button
                            type="button"
                            className="my-action-btn soft"
                            onClick={() => {
                              setOkeyPrototypeSelectedTableId(okeyPrototypeQuickJoinTable.id);
                              appendOkeyPrototypeAction(`Hizli oneriden masa secildi: ${okeyPrototypeQuickJoinTable.tableNo}`);
                            }}
                          >
                            Onerilen Masayi Sec
                          </button>
                          <button
                            type="button"
                            className="my-action-btn"
                            onClick={() => {
                              const occupiedSeatNos = getOkeyLobbyOccupiedSeatNos(okeyPrototypeQuickJoinTable);
                              const quickSeat = (OKEY_PROTOTYPE_SEATS.find((seatNo) => !occupiedSeatNos.includes(seatNo)) ?? 1) as OkeyPrototypeSeatNo;
                              reserveOkeyPrototypeSeat(okeyPrototypeQuickJoinTable, quickSeat, "Hizli oturuldu");
                            }}
                            disabled={okeyPrototypeQuickJoinTable.seated >= 4}
                          >
                            Hizli Otur
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {okeyPrototypeSelectedTableSeats.length > 0 ? (
                      <div className="my-game-coming-table-seat-row">
                        {okeyPrototypeSelectedTableSeats.map((seat) => (
                          <button
                            key={seat.id}
                            type="button"
                            className={`my-game-coming-table-seat ${seat.occupied ? "occupied" : "empty"} ${!seat.occupied && okeyPrototypeSeatDraft === seat.seatNo ? "draft" : ""}`}
                            onClick={() => {
                              if (seat.occupied) return;
                              setOkeyPrototypeSeatDraft(seat.seatNo);
                              appendOkeyPrototypeAction(`Koltuk secildi: ${seat.seatNo}`);
                            }}
                            disabled={seat.occupied}
                          >
                            <strong>Koltuk {seat.seatNo}</strong>
                            <span>{seat.label}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className="my-game-coming-table-seat-actions">
                      <div className="my-game-coming-table-seat-chip-row">
                        {okeyPrototypeAvailableSeatNos.length > 0 ? (
                          okeyPrototypeAvailableSeatNos.map((seatNo) => (
                            <button
                              key={`seat-chip-${seatNo}`}
                              type="button"
                              className={`my-game-coming-table-seat-chip ${okeyPrototypeSeatDraft === seatNo ? "active" : ""}`}
                              onClick={() => {
                                setOkeyPrototypeSeatDraft(seatNo);
                                appendOkeyPrototypeAction(`Koltuk secildi: ${seatNo}`);
                              }}
                            >
                              Koltuk {seatNo}
                            </button>
                          ))
                        ) : (
                          <span className="my-game-coming-table-seat-empty-note">Bu masada bos koltuk yok.</span>
                        )}
                      </div>
                      <div className="my-game-coming-table-seat-action-buttons">
                        <button
                          type="button"
                          className="my-action-btn"
                          aria-describedby="okey-prototype-seat-status"
                          onClick={() => {
                            if (!okeyPrototypeSelectedTable) return;
                            if (okeyPrototypeAvailableSeatNos.length === 0) return;
                            reserveOkeyPrototypeSeat(okeyPrototypeSelectedTable, okeyPrototypeSeatDraft, "Masaya oturuldu");
                          }}
                          disabled={!okeyPrototypeSelectedTable || okeyPrototypeAvailableSeatNos.length === 0}
                        >
                          Masaya Otur (Prototip)
                        </button>
                        <button
                          type="button"
                          className="my-action-btn soft"
                          aria-describedby="okey-prototype-seat-status"
                          onClick={() => {
                            leaveOkeyPrototypeSeat("Masadan ayrildi");
                          }}
                          disabled={!okeyPrototypeSeatReservation}
                        >
                          Masadan Ayril (Prototip)
                        </button>
                      </div>
                      <p
                        id="okey-prototype-seat-status"
                        className="my-game-coming-table-seat-status"
                        role="status"
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        {okeyPrototypeSeatReservation && okeyPrototypeJoinedTable
                            ? `Prototip oturum: Masa ${okeyPrototypeJoinedTable.tableNo} / Koltuk ${okeyPrototypeSeatReservation.seatNo}`
                            : "Prototip oturum acik degil."}
                      </p>
                      <div className="my-game-coming-prototype-turn">
                        <div className="my-game-coming-prototype-turn-head">
                          <strong>Tur Yonetimi (Prototip)</strong>
                          <span>Seri El {okeyPrototypeSessionHandNo} | Tur {okeyPrototypeTurnRound} | Faz: {okeyPrototypeTurnPhase === "draw" ? "Tas Cek" : "Tas At"}</span>
                        </div>
                        <div className="my-game-coming-prototype-turn-phase-strip" aria-label="Tur fazlari">
                          <span
                            className={`my-game-coming-prototype-turn-phase-chip ${
                              !okeyPrototypeHandCompleted && okeyPrototypeTurnPhase === "draw" ? "active" : "waiting"
                            }`}
                          >
                            1. Tas Cek
                          </span>
                          <span
                            className={`my-game-coming-prototype-turn-phase-chip ${
                              !okeyPrototypeHandCompleted && okeyPrototypeTurnPhase === "discard" ? "active" : "waiting"
                            }`}
                          >
                            2. Tas At
                          </span>
                          {okeyPrototypeHandCompleted ? (
                            <span className="my-game-coming-prototype-turn-phase-chip complete">El Tamam</span>
                          ) : null}
                        </div>
                        <p className="my-game-coming-prototype-turn-pile-status" role="status" aria-live="polite" aria-atomic="true">
                          Kapali Deste: {okeyPrototypeDrawPileRemaining} tas
                        </p>
                        <p className="my-game-coming-prototype-turn-indicator-status" role="status" aria-live="polite" aria-atomic="true">
                          Gosterge:
                          {" "}
                          {okeyPrototypeIndicatorTile ? formatOkeyPrototypeTile(okeyPrototypeIndicatorTile) : "-"}
                          {" | "}
                          Okey:
                          {" "}
                          {okeyPrototypeOkeyTile ? formatOkeyPrototypeTile(okeyPrototypeOkeyTile) : "-"}
                          {" | "}
                          Sahte Okey: {okeyPrototypeSahteOkeyCount} (Destede: {okeyPrototypeSahteInWall})
                        </p>
                        <p className="my-game-coming-prototype-turn-open-status" role="status" aria-live="polite" aria-atomic="true">
                          El Durumu: Koltuk {okeyPrototypeTurnSeat} {okeyPrototypeCurrentSeatOpened ? "ACIK" : "KAPALI"}
                        </p>
                        <p className="my-game-coming-prototype-turn-seat-list" role="status" aria-live="polite" aria-atomic="true">
                          Aktif Koltuklar: {okeyPrototypeActiveTurnSeats.map((seatNo) => `K${seatNo}`).join(", ")}
                        </p>
                        <div className="my-game-coming-prototype-turn-order" aria-label="Sira akisi">
                          {okeyPrototypeTurnQueue.map((entry) => (
                            <span
                              key={`okey-proto-turn-order-${entry.seatNo}`}
                              className={`my-game-coming-prototype-turn-order-chip ${entry.current ? "current" : ""} ${entry.next ? "next" : ""}`}
                              title={`K${entry.seatNo} | ${entry.role}`}
                            >
                              {entry.current ? "Simdi" : entry.next ? "Sonra" : "Bekle"}
                              {" • "}
                              K{entry.seatNo}
                              {" • "}
                              {entry.name}
                            </span>
                          ))}
                        </div>
                        <p className="my-game-coming-prototype-turn-scoreboard" role="status" aria-live="polite" aria-atomic="true">
                          El Kazanci: {okeyPrototypeSeatScoreSummaryText} | Ceza Toplami: {okeyPrototypeSeatPenaltySummaryText} | Berabere: {okeyPrototypeDrawHandCount}
                        </p>
                        {okeyPrototypeLastHandSummary ? (
                          <p className="my-game-coming-prototype-turn-last-summary" role="status" aria-live="polite" aria-atomic="true">
                            Sonuc: {okeyPrototypeLastHandSummary}
                          </p>
                        ) : null}
                        {!okeyPrototypeCurrentSeatOpened ? (
                          <p className="my-game-coming-prototype-turn-opening-points" role="status" aria-live="polite" aria-atomic="true">
                            Acilis Puani: {okeyPrototypeTurnOpeningPoints}/{OKEY_PROTOTYPE_OPENING_TARGET_POINTS}
                          </p>
                        ) : null}
                        <p
                          id="okey-prototype-turn-status"
                          className="my-game-coming-prototype-turn-status"
                          role="status"
                          aria-live="polite"
                          aria-atomic="true"
                        >
                          {okeyPrototypeHandDrawn
                            ? "El berabere bitti: Ortada ve kapali destede tas kalmadi."
                            : okeyPrototypeHandCompleted
                            ? `El tamamlandi: Koltuk ${okeyPrototypeWinnerSeat} kazandi.`
                            : okeyPrototypeCanAdvanceTurn
                            ? `Aktif tur: Koltuk ${okeyPrototypeTurnSeat} | Faz: ${okeyPrototypeTurnPhase === "draw" ? "Tas Cek" : "Tas At"} | Siradaki: Koltuk ${okeyPrototypeNextTurnSeat}`
                            : "Tur dongusu icin once bir masaya otur."}
                        </p>
                        {okeyPrototypeTurnLockedAfterMeld ? (
                          <p className="my-game-coming-prototype-turn-lock" role="status" aria-live="polite" aria-atomic="true">
                            Tur kilidi aktif: Per actin. Turu devretmek icin once tas atmalisin.
                          </p>
                        ) : null}
                        {okeyPrototypeHandCompleted ? (
                          <p className="my-game-coming-prototype-turn-complete" role="status" aria-live="polite" aria-atomic="true">
                            {okeyPrototypeHandDrawn
                              ? "El berabere bitti. Yeni El Baslat ile devam edebilirsin."
                              : `El tamamlandi: Koltuk ${okeyPrototypeWinnerSeat} kazandi. Yeni El Baslat ile devam edebilirsin.`}
                          </p>
                        ) : null}
                        <div className="my-game-coming-prototype-turn-actions">
                          <button
                            type="button"
                            className="my-action-btn soft"
                            onClick={drawOkeyPrototypeTile}
                            disabled={!okeyPrototypeCanDrawTile}
                            aria-describedby="okey-prototype-turn-status"
                          >
                            Tas Cek (Prototip)
                          </button>
                          <button
                            type="button"
                            className="my-action-btn soft"
                            onClick={drawOkeyPrototypeTileFromDiscard}
                            disabled={!okeyPrototypeCanDrawFromDiscard}
                            aria-describedby="okey-prototype-turn-status"
                          >
                            Ortadan Tas Al (Prototip)
                          </button>
                          <button
                            type="button"
                            className="my-action-btn soft"
                            onClick={discardOkeyPrototypeTile}
                            disabled={!okeyPrototypeCanDiscardTile}
                            aria-describedby="okey-prototype-turn-status"
                          >
                            Tas At (Prototip)
                          </button>
                          <button
                            type="button"
                            className="my-action-btn soft"
                            onClick={resetOkeyPrototypeTurn}
                            disabled={!okeyPrototypeCanAdvanceTurn}
                            aria-describedby="okey-prototype-turn-status"
                          >
                            Turu Sifirla (Prototip)
                          </button>
                          <button
                            type="button"
                            className="my-action-btn soft"
                            onClick={startNewOkeyPrototypeHand}
                            disabled={!okeyPrototypeSeatReservation}
                            aria-describedby="okey-prototype-turn-status"
                          >
                            Yeni El Baslat (Prototip)
                          </button>
                        </div>
                        <div className="my-game-coming-prototype-turn-actions">
                          <button
                            type="button"
                            className="my-action-btn soft"
                            onClick={() => applyOkeyPrototypeScenario("opening")}
                            disabled={!okeyPrototypeSeatReservation}
                            aria-describedby="okey-prototype-turn-status"
                          >
                            Senaryo: Acilis
                          </button>
                          <button
                            type="button"
                            className="my-action-btn soft"
                            onClick={() => applyOkeyPrototypeScenario("attach")}
                            disabled={!okeyPrototypeSeatReservation}
                            aria-describedby="okey-prototype-turn-status"
                          >
                            Senaryo: Pere Ekle
                          </button>
                          <button
                            type="button"
                            className="my-action-btn soft"
                            onClick={() => applyOkeyPrototypeScenario("finish")}
                            disabled={!okeyPrototypeSeatReservation}
                            aria-describedby="okey-prototype-turn-status"
                          >
                            Senaryo: Eli Bitir
                          </button>
                          <button
                            type="button"
                            className="my-action-btn soft"
                            onClick={() => applyOkeyPrototypeScenario("draw-end")}
                            disabled={!okeyPrototypeSeatReservation}
                            aria-describedby="okey-prototype-turn-status"
                          >
                            Senaryo: Berabere
                          </button>
                        </div>
                      </div>
                      <div className="my-game-coming-prototype-board">
                        <div className="my-game-coming-prototype-board-head">
                          <strong>Masa Onizleme (Prototip)</strong>
                          <div className="my-game-coming-prototype-board-head-controls">
                            <span>Aktif tur: K{okeyPrototypeTurnSeat}</span>
                            <button
                              type="button"
                              className="my-action-btn soft my-game-coming-prototype-board-mode-btn"
                              onClick={() => setOkeyPrototypeBoardMaskOthers((prev) => !prev)}
                              aria-describedby="okey-prototype-turn-status"
                            >
                              {okeyPrototypeBoardMaskOthers ? "Acik Masa Gorunumu" : "Gizli Masa Gorunumu"}
                            </button>
                          </div>
                        </div>
                        <div className="my-game-coming-prototype-board-status" role="status" aria-live="polite" aria-atomic="true">
                          <span>
                            Atis:
                            {" "}
                            {okeyPrototypeDiscardDraftTile ? formatOkeyPrototypeTile(okeyPrototypeDiscardDraftTile) : "-"}
                          </span>
                          <span>Per: {okeyPrototypeMeldDraftTiles.length} tas</span>
                          <span>
                            Hedef:
                            {" "}
                            {okeyPrototypeAttachTargetMeld
                              ? `K${okeyPrototypeAttachTargetMeld.seatNo}/E${okeyPrototypeAttachTargetMeld.round}`
                              : "-"}
                          </span>
                          <button
                            type="button"
                            className={`my-action-btn soft my-game-coming-prototype-board-action-btn ${okeyPrototypeCanDiscardTile && okeyPrototypeDiscardDraftTile ? "suggested" : ""}`}
                            onClick={discardOkeyPrototypeTile}
                            disabled={!okeyPrototypeCanDiscardTile || !okeyPrototypeDiscardDraftTile}
                            aria-describedby="okey-prototype-turn-status"
                          >
                            Secili Tasi At
                          </button>
                          <button
                            type="button"
                            className={`my-action-btn soft my-game-coming-prototype-board-action-btn ${okeyPrototypeCanSelectRackTiles && okeyPrototypeMeldDraftTiles.length >= 3 && okeyPrototypeMeldDraftValidation.valid ? "suggested" : ""}`}
                            onClick={openOkeyPrototypeMeld}
                            disabled={!okeyPrototypeCanSelectRackTiles || okeyPrototypeMeldDraftTiles.length < 3 || !okeyPrototypeMeldDraftValidation.valid}
                            aria-describedby="okey-prototype-turn-status"
                          >
                            Secili Peri Ac
                          </button>
                          <button
                            type="button"
                            className={`my-action-btn soft my-game-coming-prototype-board-action-btn ${
                              !okeyPrototypeCurrentSeatOpened && okeyPrototypeCurrentSeatPairOpenCount >= OKEY_PROTOTYPE_PAIR_OPEN_MIN_PAIRS ? "suggested" : ""
                            }`}
                            onClick={openOkeyPrototypePairs}
                            disabled={
                              !okeyPrototypeCanAdvanceTurn
                              || okeyPrototypeTurnPhase !== "discard"
                              || okeyPrototypeCurrentSeatOpened
                              || okeyPrototypeCurrentSeatPairOpenCount < OKEY_PROTOTYPE_PAIR_OPEN_MIN_PAIRS
                            }
                            aria-describedby="okey-prototype-turn-status"
                          >
                            5 Cift Ac
                          </button>
                          <button
                            type="button"
                            className={`my-action-btn soft my-game-coming-prototype-board-action-btn ${okeyPrototypeAttachValidation.valid ? "suggested" : ""}`}
                            onClick={attachOkeyPrototypeTileToMeld}
                            disabled={!okeyPrototypeAttachValidation.valid}
                            aria-describedby="okey-prototype-turn-status"
                          >
                            Secili Pere Ekle
                          </button>
                          <button
                            type="button"
                            className="my-action-btn soft my-game-coming-prototype-board-clear-btn"
                            onClick={clearOkeyPrototypeTileSelections}
                            disabled={!okeyPrototypeDiscardDraftTileId && okeyPrototypeMeldDraftTileIds.length === 0}
                            aria-describedby="okey-prototype-turn-status"
                          >
                            Secimi Temizle
                          </button>
                        </div>
                        <p className="my-game-coming-prototype-board-hint" role="status" aria-live="polite" aria-atomic="true">
                          {okeyPrototypeBoardHintText}
                        </p>
                        <div className="my-game-coming-prototype-board-grid" aria-label="101 okey masa onizleme">
                          <section className="my-game-coming-prototype-board-center" aria-label="Masa merkezi ve ortak bilgiler">
                            <div className="my-game-coming-prototype-board-center-piles">
                              <button
                                type="button"
                                className={`my-action-btn soft my-game-coming-prototype-board-center-pile-btn ${okeyPrototypeCanDrawTile ? "suggested" : ""}`}
                                onClick={drawOkeyPrototypeTile}
                                disabled={!okeyPrototypeCanDrawTile}
                                aria-describedby="okey-prototype-turn-status"
                              >
                                <span>Kapali Deste</span>
                                <strong>{okeyPrototypeDrawPileRemaining}</strong>
                              </button>
                              <button
                                type="button"
                                className={`my-action-btn soft my-game-coming-prototype-board-center-pile-btn ${okeyPrototypeCanDrawFromDiscard ? "suggested" : ""}`}
                                onClick={drawOkeyPrototypeTileFromDiscard}
                                disabled={!okeyPrototypeCanDrawFromDiscard}
                                aria-describedby="okey-prototype-turn-status"
                              >
                                <span>Ortadan Al</span>
                                {okeyPrototypeLastDiscard ? (
                                  <span
                                    className={`my-game-coming-prototype-rack-tile tile-${okeyPrototypeLastDiscard.tile.color} ${isOkeyPrototypeJokerTile(okeyPrototypeLastDiscard.tile, okeyPrototypeOkeyTile) ? "joker-tile" : ""}`}
                                    title={`${formatOkeyPrototypeTile(okeyPrototypeLastDiscard.tile)} | K${okeyPrototypeLastDiscard.seatNo}`}
                                  >
                                    {renderOkeyPrototypeTileFace(okeyPrototypeLastDiscard.tile)}
                                  </span>
                                ) : (
                                  <span className="my-game-coming-prototype-board-seat-empty">-</span>
                                )}
                              </button>
                            </div>
                            <p>
                              Acik Per:
                              {" "}
                              <strong>{okeyPrototypeOpenedMelds.length}</strong>
                            </p>
                            <p>
                              Gosterge:
                              {" "}
                              {okeyPrototypeIndicatorTile ? formatOkeyPrototypeTile(okeyPrototypeIndicatorTile) : "-"}
                            </p>
                            <p>
                              Okey:
                              {" "}
                              {okeyPrototypeOkeyTile ? formatOkeyPrototypeTile(okeyPrototypeOkeyTile) : "-"}
                            </p>
                            <div className="my-game-coming-prototype-board-center-melds">
                              <p>Masa Perleri:</p>
                              {okeyPrototypeOpenedMeldPreview.length === 0 ? (
                                <span className="my-game-coming-prototype-board-center-melds-empty">Henuz acik per yok.</span>
                              ) : (
                                <div className="my-game-coming-prototype-board-center-melds-list">
                                  {okeyPrototypeOpenedMeldPreview.map((meld) => (
                                    <button
                                      key={`okey-proto-board-center-meld-${meld.id}`}
                                      type="button"
                                      className={`my-game-coming-prototype-board-center-meld-btn ${okeyPrototypeAttachTargetMeldId === meld.id ? "active" : ""}`}
                                      onClick={() => selectOkeyPrototypeAttachTarget(meld.id)}
                                      aria-describedby="okey-prototype-turn-status"
                                    >
                                      <span>K{meld.seatNo} / El {meld.round}</span>
                                      <div className="my-game-coming-prototype-board-center-meld-btn-tiles">
                                        {meld.tiles.map((tile) => {
                                          const tileIsJoker = isOkeyPrototypeJokerTile(tile, okeyPrototypeOkeyTile);
                                          return (
                                            <span
                                              key={`${meld.id}-${tile.id}`}
                                              className={`my-game-coming-prototype-rack-tile tile-${tile.color} ${tileIsJoker ? "joker-tile" : ""}`}
                                              title={`${formatOkeyPrototypeTile(tile)}${tileIsJoker ? " (joker)" : ""}`}
                                            >
                                              {renderOkeyPrototypeTileFace(tile)}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </section>
                          {OKEY_PROTOTYPE_SEATS.map((seatNo) => {
                            const seatTiles = okeyPrototypeRackState[seatNo] ?? [];
                            const isTurnSeat = seatNo === okeyPrototypeTurnSeat;
                            const isOpenedSeat = okeyPrototypeSeatOpenedState[seatNo] ?? false;
                            const canInteractBoardSeat = isTurnSeat && okeyPrototypeCanSelectRackTiles;
                            const isMaskedSeat = okeyPrototypeBoardMaskOthers && !isTurnSeat;
                            const isLocalSeat = seatNo === okeyPrototypeLocalSeatNo;
                            const displaySeatPosition = okeyPrototypeDisplaySeatPositionBySeat[seatNo] ?? seatNo;
                            const seatRole = okeyPrototypeSeatRoleLabels[seatNo];
                            const seatName = okeyPrototypeSeatDisplayNames[seatNo];
                            return (
                              <article
                                key={`okey-proto-board-seat-${seatNo}`}
                                className={`my-game-coming-prototype-board-seat seat-${displaySeatPosition} ${isTurnSeat ? "active" : ""} ${isLocalSeat ? "self" : ""}`}
                                aria-label={`Koltuk ${seatNo} (${seatRole}) ${seatName}. Raf gorunumu. Ekran pozisyonu: ${displaySeatPosition}`}
                              >
                                <header>
                                  <strong className="my-game-coming-prototype-board-seat-title">
                                    <AvatarBadge
                                      avatarId={okeyPrototypeSeatAvatarIds[seatNo] ?? DEFAULT_AVATAR_BY_GENDER.unknown}
                                      gender={seatNo === okeyPrototypeLocalSeatNo ? sanitizeMemberGender(member?.gender ?? currentProfile.gender) : "unknown"}
                                      size="sm"
                                      className="my-game-coming-prototype-board-seat-avatar"
                                    />
                                    K{seatNo}
                                    {" • "}
                                    {seatRole === "Bos" ? "Bos" : `${seatRole}: ${seatName}`}
                                  </strong>
                                  <span>{isTurnSeat ? "SIRA | " : ""}{isOpenedSeat ? "ACIK" : "KAPALI"} | {seatTiles.length} tas</span>
                                </header>
                                <div className="my-game-coming-prototype-board-seat-tiles">
                                  {seatTiles.length === 0 ? (
                                    <span className="my-game-coming-prototype-board-seat-empty">Bos koltuk</span>
                                  ) : isMaskedSeat ? (
                                    seatTiles.map((tile) => (
                                      <span
                                        key={`okey-proto-board-seat-${seatNo}-${tile.id}`}
                                        className="my-game-coming-prototype-rack-tile tile-sahte my-game-coming-prototype-board-seat-masked-tile"
                                        title={`K${seatNo} kapali tas`}
                                      >
                                        ?
                                      </span>
                                    ))
                                  ) : (
                                    seatTiles.map((tile) => {
                                      const tileIsJoker = isOkeyPrototypeJokerTile(tile, okeyPrototypeOkeyTile);
                                      const isDiscardSelected = okeyPrototypeDiscardDraftTileId === tile.id;
                                      const isMeldSelected = okeyPrototypeMeldDraftTileIds.includes(tile.id);
                                      return (
                                        <button
                                          key={`okey-proto-board-seat-${seatNo}-${tile.id}`}
                                          type="button"
                                          className={`my-game-coming-prototype-rack-tile tile-${tile.color} ${isDiscardSelected ? "discard-selected" : ""} ${isMeldSelected ? "meld-selected" : ""} ${tileIsJoker ? "joker-tile" : ""}`}
                                          onClick={() => {
                                            if (!canInteractBoardSeat) return;
                                            selectOkeyPrototypeDiscardDraft(tile.id);
                                            toggleOkeyPrototypeMeldDraftTile(tile.id);
                                          }}
                                          disabled={!canInteractBoardSeat}
                                          aria-pressed={isDiscardSelected || isMeldSelected}
                                          title={`${formatOkeyPrototypeTile(tile)}${tileIsJoker ? " (joker)" : ""}`}
                                        >
                                          {renderOkeyPrototypeTileFace(tile)}
                                        </button>
                                      );
                                    })
                                  )}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </div>
                      <div className="my-game-coming-prototype-rack">
                        <div className="my-game-coming-prototype-rack-head">
                          <strong>Tas Dizilimi (Prototip)</strong>
                          <span>Koltuk {okeyPrototypeSeatNoForRack}: {okeyPrototypeSeatRackTiles.length} tas</span>
                        </div>
                        <div className="my-game-coming-prototype-rack-scale">
                          <label htmlFor="okey-prototype-scale-range">Tas Boyutu</label>
                          <input
                            id="okey-prototype-scale-range"
                            type="range"
                            min={85}
                            max={130}
                            step={5}
                            value={okeyPrototypeTileScalePct}
                            onChange={(e) => {
                              const parsed = Number.parseInt(e.target.value, 10);
                              if (!Number.isFinite(parsed)) return;
                              setOkeyPrototypeTileScalePct(normalizeOkeyPrototypeTileScalePct(parsed));
                            }}
                            aria-label="101 prototip tas boyutu"
                          />
                          <span>%{okeyPrototypeTileScalePct}</span>
                        </div>
                        <div className="my-game-coming-prototype-rack-scale-presets">
                          <button
                            type="button"
                            className={`my-action-btn soft my-game-coming-prototype-rack-scale-btn ${okeyPrototypeTileScalePct === 95 ? "active" : ""}`}
                            onClick={() => setOkeyPrototypeTileScalePct(95)}
                          >
                            Kucuk (%95)
                          </button>
                          <button
                            type="button"
                            className={`my-action-btn soft my-game-coming-prototype-rack-scale-btn ${okeyPrototypeTileScalePct === 100 ? "active" : ""}`}
                            onClick={() => setOkeyPrototypeTileScalePct(100)}
                          >
                            Standart (%100)
                          </button>
                          <button
                            type="button"
                            className={`my-action-btn soft my-game-coming-prototype-rack-scale-btn ${okeyPrototypeTileScalePct === 115 ? "active" : ""}`}
                            onClick={() => setOkeyPrototypeTileScalePct(115)}
                          >
                            Buyuk (%115)
                          </button>
                        </div>
                        <div className="my-game-coming-prototype-rack-autosort">
                          <label htmlFor="okey-prototype-autosort-select">Otomatik Sirala</label>
                          <select
                            id="okey-prototype-autosort-select"
                            value={okeyPrototypeAutoSortMode}
                            onChange={(e) => {
                              const nextValue = normalizeOkeyPrototypeAutoSortMode(e.target.value);
                              setOkeyPrototypeAutoSortMode(nextValue);
                            }}
                            aria-label="101 prototip otomatik siralama secimi"
                          >
                            <option value="off">Kapali</option>
                            <option value="color">Renk Sirasi</option>
                            <option value="value">Deger Sirasi</option>
                          </select>
                        </div>
                        <div className="my-game-coming-prototype-rack-bot-mode">
                          <button
                            type="button"
                            className={`my-action-btn soft my-game-coming-prototype-rack-bot-btn ${okeyPrototypeBotModeEnabled ? "active" : ""}`}
                            onClick={() => setOkeyPrototypeBotModeEnabled((current) => !current)}
                            disabled={!okeyPrototypeSeatReservation}
                          >
                            {okeyPrototypeBotModeEnabled ? "Bot Modu: Acik" : "Bot Modu: Kapali"}
                          </button>
                          <div className="my-game-coming-prototype-rack-bot-difficulty">
                            <label htmlFor="okey-prototype-bot-difficulty-select">Bot Zorlugu</label>
                            <select
                              id="okey-prototype-bot-difficulty-select"
                              value={okeyPrototypeBotDifficulty}
                              onChange={(event) => {
                                const rawValue = event.target.value;
                                if (rawValue === "easy" || rawValue === "normal" || rawValue === "hard") {
                                  setOkeyPrototypeBotDifficulty(rawValue);
                                }
                              }}
                              disabled={!okeyPrototypeSeatReservation}
                              aria-label="101 prototip bot zorlugu"
                            >
                              <option value="easy">Kolay</option>
                              <option value="normal">Orta</option>
                              <option value="hard">Zor</option>
                            </select>
                          </div>
                          <p role="status" aria-live="polite" aria-atomic="true">
                            {!okeyPrototypeSeatReservation
                              ? "Bot modu icin once masaya otur."
                              : okeyPrototypeIsBotTurn
                              ? `Bot K${okeyPrototypeTurnSeat} hamle yapiyor...`
                              : okeyPrototypeBotModeEnabled
                              ? `Rakip koltuklar sira geldiginde otomatik oynar. (Zorluk: ${okeyPrototypeBotDifficulty === "easy" ? "Kolay" : okeyPrototypeBotDifficulty === "hard" ? "Zor" : "Orta"})`
                              : "Bot testini acmak icin butonu kullan."}
                          </p>
                        </div>
                        <div className="my-game-coming-prototype-rack-seat-summary" role="status" aria-live="polite" aria-atomic="true">
                          {okeyPrototypeRackSeatSummaries.map((item) => (
                            <p key={`rack-seat-${item.seatNo}`}>
                              K{item.seatNo}: {item.tileCount}
                            </p>
                          ))}
                        </div>
                        <div className="my-game-coming-prototype-rack-tiles" aria-label={`Koltuk ${okeyPrototypeSeatNoForRack} tas dizilimi`}>
                          {okeyPrototypeSeatRackTiles.map((tile) => (
                            (() => {
                              const tileIsJoker = isOkeyPrototypeJokerTile(tile, okeyPrototypeOkeyTile);
                              return (
                            <button
                              key={tile.id}
                              type="button"
                              className={`my-game-coming-prototype-rack-tile tile-${tile.color} ${okeyPrototypeDiscardDraftTileId === tile.id ? "discard-selected" : ""} ${okeyPrototypeMeldDraftTileIds.includes(tile.id) ? "meld-selected" : ""} ${tileIsJoker ? "joker-tile" : ""}`}
                              onClick={() => {
                                selectOkeyPrototypeDiscardDraft(tile.id);
                                toggleOkeyPrototypeMeldDraftTile(tile.id);
                              }}
                              disabled={!okeyPrototypeCanSelectRackTiles}
                              aria-pressed={okeyPrototypeDiscardDraftTileId === tile.id}
                              title={`${formatOkeyPrototypeTile(tile)}${tileIsJoker ? " (joker)" : ""}`}
                            >
                              {renderOkeyPrototypeTileFace(tile)}
                            </button>
                              );
                            })()
                          ))}
                        </div>
                        <p className="my-game-coming-prototype-rack-discard-status" role="status" aria-live="polite" aria-atomic="true">
                          {okeyPrototypeTurnPhase === "discard"
                            ? (okeyPrototypeDiscardDraftTile
                              ? `Atilacak tas: ${formatOkeyPrototypeTile(okeyPrototypeDiscardDraftTile)}`
                              : "Atilacak tasi rafdan sec.")
                            : "Tas secimi icin once Tas Cek adimini tamamla."}
                        </p>
                        {okeyPrototypeDiscardBlockedByOpening ? (
                          <p className="my-game-coming-prototype-rack-opening-warning" role="status" aria-live="polite" aria-atomic="true">
                            Tas atmak icin once {okeyPrototypeOpeningRemainingPoints} puan daha acilis peri acmalisin.
                          </p>
                        ) : null}
                        {!okeyPrototypeCurrentSeatOpened ? (
                          <p className="my-game-coming-prototype-rack-opening-warning" role="status" aria-live="polite" aria-atomic="true">
                            Cift acma: {okeyPrototypeCurrentSeatPairOpenCount}/{OKEY_PROTOTYPE_PAIR_OPEN_MIN_PAIRS}
                          </p>
                        ) : null}
                        {okeyPrototypePendingDiscardTile ? (
                          <p className="my-game-coming-prototype-rack-opening-warning" role="status" aria-live="polite" aria-atomic="true">
                            Ortadan alinan tas: {formatOkeyPrototypeTile(okeyPrototypePendingDiscardTile)} (hemen islenmeli)
                          </p>
                        ) : null}
                        <p className="my-game-coming-prototype-meld-draft-status" role="status" aria-live="polite" aria-atomic="true">
                          {okeyPrototypeMeldDraftTiles.length === 0
                            ? "Per taslagi: henuz secim yok."
                            : `Per taslagi: ${okeyPrototypeMeldDraftTiles.length} tas | ${okeyPrototypeMeldDraftValidation.valid ? `Uygun ${okeyPrototypeMeldDraftValidation.kind}` : okeyPrototypeMeldDraftValidation.reason}`}
                        </p>
                        <p className="my-game-coming-prototype-meld-attach-status" role="status" aria-live="polite" aria-atomic="true">
                          Per ekleme hedefi:
                          {" "}
                          {okeyPrototypeAttachTargetMeld
                            ? `K${okeyPrototypeAttachTargetMeld.seatNo} / El ${okeyPrototypeAttachTargetMeld.round}`
                            : "henuz secili per yok"}
                          {" | "}
                          {okeyPrototypeDiscardDraftTile
                            ? `Secili tas ${formatOkeyPrototypeTile(okeyPrototypeDiscardDraftTile)}`
                            : "Secili tas yok"}
                          {" | "}
                          {okeyPrototypeAttachValidation.valid ? "Ekleme uygun." : okeyPrototypeAttachValidation.reason}
                        </p>
                        <div className="my-game-coming-prototype-rack-actions">
                          <button
                            type="button"
                            className="my-action-btn soft"
                            onClick={openOkeyPrototypeMeld}
                            disabled={!okeyPrototypeCanSelectRackTiles || okeyPrototypeMeldDraftTiles.length < 3 || !okeyPrototypeMeldDraftValidation.valid}
                          >
                            Per Ac (Prototip)
                          </button>
                          <button
                            type="button"
                            className="my-action-btn soft"
                            onClick={openOkeyPrototypePairs}
                            disabled={
                              !okeyPrototypeCanAdvanceTurn
                              || okeyPrototypeTurnPhase !== "discard"
                              || okeyPrototypeCurrentSeatOpened
                              || okeyPrototypeCurrentSeatPairOpenCount < OKEY_PROTOTYPE_PAIR_OPEN_MIN_PAIRS
                            }
                          >
                            5 Cift Ac
                          </button>
                          <button
                            type="button"
                            className="my-action-btn soft"
                            onClick={attachOkeyPrototypeTileToMeld}
                            disabled={!okeyPrototypeAttachValidation.valid}
                          >
                            Secili Pere Ekle (Prototip)
                          </button>
                          <button
                            type="button"
                            className="my-action-btn soft"
                            onClick={clearOkeyPrototypeMeldDraft}
                            disabled={okeyPrototypeMeldDraftTiles.length === 0}
                          >
                            Per Taslagini Temizle
                          </button>
                          <button
                            type="button"
                            className="my-action-btn soft"
                            onClick={refreshOkeyPrototypeRackState}
                            aria-describedby="okey-prototype-turn-status"
                          >
                            Taslari Yeniden Dagit (Prototip)
                          </button>
                          <button
                            type="button"
                            className="my-action-btn soft"
                            onClick={() => sortOkeyPrototypeRack("color")}
                            disabled={!okeyPrototypeSeatReservation || okeyPrototypeSeatRackTiles.length < 2}
                            aria-describedby="okey-prototype-turn-status"
                          >
                            Rafi Sirala (Renk)
                          </button>
                          <button
                            type="button"
                            className="my-action-btn soft"
                            onClick={() => sortOkeyPrototypeRack("value")}
                            disabled={!okeyPrototypeSeatReservation || okeyPrototypeSeatRackTiles.length < 2}
                            aria-describedby="okey-prototype-turn-status"
                          >
                            Rafi Sirala (Deger)
                          </button>
                        </div>
                        <div className="my-game-coming-prototype-seed-row">
                          <input
                            type="text"
                            className="my-game-coming-prototype-seed-input"
                            value={okeyPrototypeDealSeedDraft}
                            onChange={(event) => {
                              const digits = event.target.value.replace(/\D+/g, "").slice(0, 12);
                              setOkeyPrototypeDealSeedDraft(digits);
                            }}
                            placeholder="Seed"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            autoComplete="off"
                            spellCheck={false}
                            title="Ayni seed ile ayni tas dagitimini tekrar kurar."
                            aria-label="Seed degeri"
                            aria-describedby="okey-prototype-turn-status"
                          />
                          <button
                            type="button"
                            className="my-action-btn soft"
                            onClick={dealOkeyPrototypeWithSeed}
                            disabled={!okeyPrototypeSeatReservation}
                            aria-describedby="okey-prototype-turn-status"
                          >
                            Seed Ile Dagit
                          </button>
                        </div>
                      </div>
                      <div className="my-game-coming-prototype-discard">
                        <div className="my-game-coming-prototype-discard-head">
                          <strong>Orta Alan (Prototip)</strong>
                          <span>{okeyPrototypeDiscardPile.length} atilan tas</span>
                        </div>
                        <p
                          className="my-game-coming-prototype-discard-status"
                          role="status"
                          aria-live="polite"
                          aria-atomic="true"
                        >
                          {okeyPrototypeLastDiscard
                            ? `Son atilan: Koltuk ${okeyPrototypeLastDiscard.seatNo} (${formatOkeyPrototypeTile(okeyPrototypeLastDiscard.tile)}) / El ${okeyPrototypeLastDiscard.round}`
                            : "Henuz orta alana atilan tas yok."}
                        </p>
                        <div className="my-game-coming-prototype-discard-tiles" aria-label="Orta alandaki son atilan taslar">
                          {okeyPrototypeDiscardPreview.length === 0 ? (
                            <span className="my-game-coming-prototype-discard-empty">Tas atildikca burada gorunecek.</span>
                          ) : (
                            okeyPrototypeDiscardPreview.map((entry) => (
                              (() => {
                                const tileIsJoker = isOkeyPrototypeJokerTile(entry.tile, okeyPrototypeOkeyTile);
                                return (
                                  <span
                                    key={entry.id}
                                    className={`my-game-coming-prototype-rack-tile tile-${entry.tile.color} ${tileIsJoker ? "joker-tile" : ""}`}
                                  >
                                    {renderOkeyPrototypeTileFace(entry.tile)}
                                  </span>
                                );
                              })()
                            ))
                          )}
                        </div>
                      </div>
                      <div className="my-game-coming-prototype-melds">
                        <div className="my-game-coming-prototype-melds-head">
                          <strong>Acilan Perler (Prototip)</strong>
                          <span>{okeyPrototypeOpenedMelds.length} per</span>
                        </div>
                        <div className="my-game-coming-prototype-melds-open-summary" role="status" aria-live="polite" aria-atomic="true">
                          {okeyPrototypeSeatOpenedSummary.map((item) => (
                            <p key={`opened-seat-${item.seatNo}`}>
                              K{item.seatNo}: {item.opened ? "ACIK" : "KAPALI"}
                            </p>
                          ))}
                        </div>
                        <div className="my-game-coming-prototype-melds-list" aria-label="Acilan per listesi">
                          {okeyPrototypeOpenedMeldPreview.length === 0 ? (
                            <span className="my-game-coming-prototype-melds-empty">Henuz acilan per yok.</span>
                          ) : (
                            okeyPrototypeOpenedMeldPreview.map((meld) => (
                              <article
                                key={meld.id}
                                className={`my-game-coming-prototype-meld-item ${okeyPrototypeAttachTargetMeldId === meld.id ? "targeted" : ""}`}
                              >
                                <header>
                                  <strong>K{meld.seatNo} | El {meld.round}</strong>
                                  <span>{meld.kind}</span>
                                  <button
                                    type="button"
                                    className={`my-game-coming-prototype-meld-target-btn ${okeyPrototypeAttachTargetMeldId === meld.id ? "active" : ""}`}
                                    onClick={() => selectOkeyPrototypeAttachTarget(meld.id)}
                                  >
                                    {okeyPrototypeAttachTargetMeldId === meld.id ? "Hedef Secili" : "Hedef Sec"}
                                  </button>
                                </header>
                                <div className="my-game-coming-prototype-meld-item-tiles">
                                  {meld.tiles.map((tile) => (
                                    (() => {
                                      const tileIsJoker = isOkeyPrototypeJokerTile(tile, okeyPrototypeOkeyTile);
                                      return (
                                        <span
                                          key={`${meld.id}-${tile.id}`}
                                          className={`my-game-coming-prototype-rack-tile tile-${tile.color} ${tileIsJoker ? "joker-tile" : ""}`}
                                        >
                                          {renderOkeyPrototypeTileFace(tile)}
                                        </span>
                                      );
                                    })()
                                  ))}
                                </div>
                              </article>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="my-game-coming-prototype-log">
                      <div className="my-game-coming-prototype-log-head">
                        <strong>Prototip Olay Gecmisi</strong>
                        <button
                          type="button"
                          className="my-action-btn soft"
                          onClick={() => setOkeyPrototypeActionLog([])}
                          disabled={okeyPrototypeActionLog.length === 0}
                          title="Prototip olay gecmisini temizler"
                          aria-label="Prototip olay gecmisini temizle"
                        >
                          Temizle
                        </button>
                      </div>
                      <div className="my-game-coming-prototype-log-list" role="log" aria-live="polite" aria-relevant="additions text">
                        {okeyPrototypeActionLog.length === 0 ? (
                          <p className="my-game-coming-prototype-log-empty">Henuz kayitli prototip aksiyonu yok.</p>
                        ) : (
                          okeyPrototypeActionLog.map((item) => (
                            <p key={item.id} className="my-game-coming-prototype-log-entry">
                              <span>{new Date(item.at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                              {item.text}
                            </p>
                          ))
                        )}
                      </div>
                    </div>
                    <div
                      id="okey-prototype-table-sketch-grid"
                      className="my-game-coming-table-sketch-grid"
                      role="region"
                      aria-label={`Masa kart listesi. Gorunen masa: ${okeyPrototypeVisibleTableSketchRows.length}`}
                    >
                      {okeyPrototypeVisibleTableSketchRows.length === 0 ? (
                        <div className="my-game-coming-table-sketch-empty-state">
                          <p className="my-game-coming-table-sketch-empty">Aramaya uygun masa bulunamadi.</p>
                          {okeyPrototypeHasTableFilters ? (
                            <button
                              type="button"
                              className="my-action-btn soft my-game-coming-table-sketch-empty-reset-btn"
                              onClick={resetOkeyPrototypeTableFilters}
                              title="Filtreleri temizleyip masa listesini yeniler"
                              aria-label="Filtreleri temizle ve tekrar dene"
                            >
                              Filtreleri Temizle ve Tekrar Dene
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        okeyPrototypeVisibleTableSketchRows.map((row) => (
                          <button
                            key={row.id}
                            type="button"
                            className={`my-game-coming-table-sketch-card ${row.active ? "active" : "waiting"} ${okeyPrototypeSelectedTableId === row.id ? "selected" : ""}`}
                            title={`Masa ${row.tableNo}, durum ${row.started ? "oyunda" : "bekliyor"}, dolu koltuk ${row.seated}/4`}
                            aria-label={`Masa ${row.tableNo}, durum ${row.started ? "oyunda" : "bekliyor"}, dolu koltuk ${row.seated}/4`}
                            aria-pressed={okeyPrototypeSelectedTableId === row.id}
                            onClick={() => {
                              setOkeyPrototypeSelectedTableId(row.id);
                              appendOkeyPrototypeAction(`Masa secildi: ${row.tableNo}`);
                            }}
                          >
                            <header>
                              <strong>Masa {row.tableNo}</strong>
                              <em>{row.started ? "Oyunda" : "Bekliyor"}</em>
                            </header>
                            <p>Dolu Koltuk: {row.seated}/4</p>
                            <p>{row.started ? "Oyun basladi." : "Masa 4 oyuncu bekliyor."}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </section>
                ) : null}
              </section>
            ) : null}
          </section>
        ) : showRoomPicker ? (
          <section className={`my-entry-page my-room-picker-page ${isTavlaSelectedGame ? "" : "my-room-picker-page-okey"}`}>
            <div className={`my-room-picker-topbar ${isTavlaSelectedGame ? "" : "my-room-picker-topbar-okey"}`}>
              <div className="my-room-picker-topbar-left">
                <button className="my-room-picker-tab my-room-picker-home-tab" type="button" onClick={goToGameSelection}>
                  Anasayfa
                </button>
                <div className="my-room-picker-tabs my-room-picker-tabs-secondary">
                  <button className="my-room-picker-tab active" type="button">Tum Odalar</button>
                  <button className="my-room-picker-tab" type="button" disabled>Hizli</button>
                  <button className="my-room-picker-tab" type="button" disabled>Kalabalik</button>
                </div>
              </div>
              <div className="my-room-picker-actions">
                <button className="my-action-btn" type="button" onClick={onQuickPlay}>{activeDesign.texts.lobbyQuickPlay || "Hemen Oyna"}</button>
                <button className="my-action-btn soft" type="button" onClick={() => void loadLobbyRoomsFromService()} disabled={lobbyRoomsBusy}>
                  {lobbyRoomsBusy ? "Yukleniyor..." : "Listeyi Yenile"}
                </button>
              </div>
            </div>
            <div className="my-room-picker-columns">
              {roomPickerRows.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  className={`my-room-picker-card ${activeLobbyId === room.id ? "active" : ""} ${isTavlaSelectedGame ? "" : "my-room-picker-card-okey"}`}
                  onClick={() => selectLobbyRoom(room.id)}
                >
                  <div className="my-room-picker-card-head">
                    <strong>{room.name}</strong>
                    {activeLobbyId === room.id ? <span>Seçili</span> : null}
                  </div>
                  <p>Masa: {room.activeTables}</p>
                  <p>Oyuncu: {room.seatedPlayers}</p>
                </button>
              ))}
            </div>
            {lobbyRoomsError ? <p className="my-error">{lobbyRoomsError}</p> : null}
          </section>
        ) : (
          <section className={`my-lobby-layout ${isTavlaSelectedGame ? "" : "my-lobby-layout-okey"}`}>
          <div className={`my-lobby-main ${isTavlaSelectedGame ? "" : "my-lobby-main-okey"}`}>
            <div className="my-lobby-header">
              <div className="my-lobby-title">
                <h2>{activeLobbyName}</h2>
                <p>Açık masalar</p>
              </div>
              {!roomSession ? (
                <div className="my-lobby-header-actions">
                  <button
                    className="my-top-btn my-btn-open my-design-label-btn"
                    data-design-label={activeDesign.texts.lobbyOpenTable || "Masa Aç"}
                    onClick={onOpenTable}
                    style={{ order: lobbyHeaderActionOrder.indexOf("openTable") }}
                  >
                    Masa Aç
                  </button>
                  <button className="my-top-btn my-btn-play" onClick={onQuickPlay} style={{ order: lobbyHeaderActionOrder.indexOf("quickPlay") }}>
                    {activeDesign.texts.lobbyQuickPlay || "Hemen Oyna"}
                  </button>
                </div>
              ) : null}
            </div>

            {!isTavlaSelectedGame && !roomSession && !useTavlaLikeOkeyLayout ? (
              <section className="my-okey-lobby-controls" aria-label="101 masa acma bolumu">
                <h3>101 Masa Açma</h3>
                <p>Yeni masa açtığında masa sahibi olursun. Masada 4 oyuncu dolunca oyun başlar.</p>
                <div className="my-okey-lobby-controls-actions">
                  <button className="my-action-btn" type="button" onClick={onOpenTable}>
                    Yeni Masa Aç
                  </button>
                  <button className="my-action-btn soft" type="button" onClick={onQuickPlay}>
                    Hızlı Otur
                  </button>
                </div>
              </section>
            ) : null}

            {normalizedLobbyNotice ? <p className="my-notice">{normalizedLobbyNotice}</p> : null}
            {incomingInviteTable ? (
              <div className="my-invite-banner">
                <p>
                  Masa {incomingInviteTable.id} icin davet aldin.
                  {incomingInviteTable.isPrivate ? " (Özel masa)" : ""}
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

            <div className={`my-lobby-table-zone ${isTavlaSelectedGame ? "" : "my-lobby-table-zone-okey"}`}>
              {(isTavlaSelectedGame || useTavlaLikeOkeyLayout) ? (
                openedTables.length === 0 ? (
                  <div className="my-empty-state my-empty-state-lobby">
                    <p className="my-empty-state-sub my-empty-state-sub-link">
                      <button type="button" className="my-empty-state-action-btn" onClick={onOpenTable}>Masa Aç</button>
                      {" "}butonu ile ilk masayı açabilirsin.
                    </p>
                    <p className="my-empty-state-title">Henüz açık masa yok.</p>
                    <p className="my-empty-state-sub"><span className="my-empty-state-action">Masa Aç</span> butonu ile ilk masayı açabilirsin.</p>
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
                        <article key={table.id} className={`my-table-card ${status} ${isTavlaSelectedGame ? "" : "my-table-card-okey"}`}>
                          <button
                            className="my-watch-eye-btn"
                            onClick={() => watchTableAsSpectator(table)}
                            disabled={!canWatchTable}
                            title={canWatchTable ? "Masayı izleyici olarak aç" : table.isPrivate ? "Özel masalar izleyiciye kapalı" : "İzlemek için masada oturmamalısın"}
                            style={showWatchEye ? undefined : { display: "none" }}
                            aria-label="Masayı izle"
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
                            {table.isPrivate ? <span className="my-private-badge">Özel</span> : null}
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
                                {mySeatHere && isTavlaSelectedGame ? (
                                  <button className="my-action-btn" onClick={() => goToTable(table, mySeatHere)}>
                                    Masaya Git
                                  </button>
                                ) : null}
                                {mySeatHere && isOwnerHere ? (
                                  <button
                                    className="my-action-btn soft"
                                    onClick={() => openInvitePicker(table)}
                                    disabled={!tableHasOpenSeat}
                                    title={tableHasOpenSeat ? "Oyuncu davet et" : "Masa dolu olduğu için davet kapalı"}
                                  >
                                    Davet Et
                                  </button>
                                ) : null}
                                {mySeatHere && isOwnerHere ? (
                                  <button
                                    className={`my-action-btn ${table.isPrivate ? "" : "soft"}`}
                                    onClick={() => setTablePrivateMode(table.id, !table.isPrivate)}
                                  >
                                    {table.isPrivate ? "Özeli Kapat" : "Özel Yap"}
                                  </button>
                                ) : null}
                                {canAdminClose ? (
                                  <button className="my-action-btn danger" onClick={() => adminCloseTable(table.id)}>
                                    Masayı Kapat
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )
              ) : (
                okeyPrototypeLobbyRows.length === 0 ? (
                  <div className="my-empty-state my-empty-state-lobby">
                    <p className="my-empty-state-title">Henüz açık masa yok.</p>
                    <p className="my-empty-state-sub">
                      <span className="my-empty-state-action">Yeni Masa Aç</span> ile ilk 101 masasını açabilirsin.
                    </p>
                  </div>
                ) : (
                  <div className="my-okey-lobby-grid">
                    {okeyPrototypeLobbyRows.map((row) => {
                      const occupiedSeatNos = getOkeyLobbyOccupiedSeatNos(row);
                      const mySeatNo = okeyPrototypeSeatReservation?.tableId === row.id
                        ? Math.max(1, Math.min(4, okeyPrototypeSeatReservation.seatNo))
                        : null;
                      const seatLockedByOtherTable = Boolean(okeyPrototypeSeatReservation && okeyPrototypeSeatReservation.tableId !== row.id);
                      return (
                        <article key={`okey-lobby-table-${row.id}`} className={`my-okey-lobby-card ${row.active ? "active" : "waiting"} ${mySeatNo ? "mine" : ""}`}>
                          <div className="my-okey-lobby-card-head">
                            <strong>Masa {row.tableNo}</strong>
                            <span>{row.started ? "Oyunda" : "Bekliyor"}</span>
                          </div>
                          <div className="my-okey-lobby-board">
                            {OKEY_PROTOTYPE_SEATS.map((seatNo) => {
                              const occupied = occupiedSeatNos.includes(seatNo);
                              const seatProfile = occupied ? getOkeyLobbySeatProfile(row, seatNo) : null;
                              const seatMine = mySeatNo === seatNo;
                              return (
                                <div key={`okey-lobby-seat-${row.id}-${seatNo}`} className={`my-okey-lobby-seat seat-${seatNo} ${occupied ? "occupied" : "empty"} ${seatMine ? "mine" : ""}`}>
                                  {occupied && seatProfile ? (
                                    <div className="my-okey-lobby-seat-occupant">
                                      <AvatarBadge avatarId={seatProfile.avatarId} gender={seatProfile.gender} size="sm" />
                                      <span title={seatProfile.displayName}>{seatProfile.displayName}</span>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      className="my-otur-btn my-okey-otur-btn"
                                      onClick={() => {
                                        reserveOkeyPrototypeSeat(row, seatNo, "Masaya oturuldu");
                                      }}
                                      disabled={seatLockedByOtherTable}
                                      title={seatLockedByOtherTable ? "Önce mevcut 101 masandan ayrılmalısın." : `Masa ${row.tableNo}, Koltuk ${seatNo}`}
                                    >
                                      OTUR
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                            <div className="my-okey-lobby-center">{row.tableNo}</div>
                          </div>
                          <div className="my-okey-lobby-card-foot">
                            <span>{occupiedSeatNos.length}/4 Dolu</span>
                            <div className="my-mini-actions">
                              <span>OP: {Math.max(1, Math.ceil(occupiedSeatNos.length / 2))}</span>
                              {isAdmin ? (
                                <button className="my-action-btn danger" onClick={() => adminCloseOkeyPrototypeTable(row)}>
                                  Masayı Kapat
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )
              )}
            </div>

            <section className="my-chat-card my-chat-card-lobby">
              <div className="my-chat-compose my-chat-compose-lobby">
                <input
                  className="my-input"
                  placeholder={canWriteLobbyChat ? "Lobiye mesaj yaz..." : "Yazmak için üye girişi yap"}
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
                  {activeDesign.texts.chatSend || "Gönder"}
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
                      <p>
                        <strong>{message.displayName}:</strong> {message.text}
                      </p>
                    </article>
                  ))
                )}
              </div>
              {!canWriteLobbyChat ? <p className="my-chat-hint">Lobiye sadece üye oyuncular yazabilir.</p> : null}
            </section>
          </div>

          <aside className={`my-lobby-side ${isTavlaSelectedGame ? "" : "my-lobby-side-okey"}`}>
            <section className="my-side-card my-side-card-online">
              <h3>Oyuncu Listesi</h3>
              <div className="my-online-head">
                <span>ISIM</span>
                <span>PUAN</span>
                <span>MASA</span>
                <span className="my-online-sr-only">Durum</span>
              </div>
              <div className="my-online-list">
                {onlineRows.map((row, index) => (
                  <div key={row.key} className="my-online-row">
                    <span className={`my-online-dot my-online-dot-palette-${index % 6}`} aria-hidden="true" />
                    <button
                      type="button"
                      className="my-name-link name"
                      onClick={(event) =>
                        openPlayerProfile(row.userId, row.name, row.points, row.stats, row.username, row.gender, row.avatarId, event.currentTarget)
                      }
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

            {diagnosticsEnabled ? (
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
                    <span>WS Ac/Kapa/Hata</span>
                    <strong>{syncHealth.wsOpenCount} / {syncHealth.wsCloseCount} / {syncHealth.wsErrorCount}</strong>
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
                  <div className="my-sync-row">
                    <span>HTTP Push/Pull Sayisi</span>
                    <strong>{syncHealth.httpPushCount} / {syncHealth.httpPullCount}</strong>
                  </div>
                </div>
                <div className="my-sync-flow-log">
                  <p className="line">Akis Olaylari ({flowEvents.length})</p>
                  <div className="my-sync-flow-list">
                    {flowEvents.length === 0 ? (
                      <p className="my-chat-empty">Henuz akis olayi yok.</p>
                    ) : (
                      flowEvents.slice(-8).reverse().map((entry) => (
                        <p key={entry.id} className="my-sync-flow-item">
                          <strong>{entry.kind}</strong> - {entry.detail}
                        </p>
                      ))
                    )}
                  </div>
                </div>
                <button className="my-action-btn soft" onClick={() => void runRealtimeHealthProbe()}>
                  Simdi Test Et
                </button>
                {syncHealth.lastError ? <p className="my-error my-sync-error">{syncHealth.lastError}</p> : null}
              </section>
            ) : null}

            {false ? (
              <section className="my-side-card">
                <h3>Admin Paneli</h3>
                <div className="my-admin-summary-grid">
                  <article className="my-admin-summary-card">
                    <span>Toplam Üye</span>
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
                    placeholder="Kullanıcı ara (ad, e-posta, id)"
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
                    <option value="user">Sadece Üye</option>
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
                    <option value="createdAt">Yeni Üyeler</option>
                    <option value="name">Ada Gore</option>
                  </select>
                </div>

                {adminError ? <p className="my-error">{adminError}</p> : null}
                {adminNotice ? <p className="my-notice my-notice-soft">{adminNotice}</p> : null}

                <div className="my-admin-user-list">
                  {visibleAdminUsers.map((user) => (
                    <article key={user.id} className="my-admin-user-row">
                      <p className="line">
                        <strong>{user.displayName}</strong> / {user.role === "admin" ? "Admin" : "Üye"}
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
                          <span>Özel Delta (+/-)</span>
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
                          {user.role === "admin" ? "Üye Yap" : "Admin Yap"}
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
                  {visibleAdminUsers.length === 0 ? <p className="my-chat-empty">Filtreye uyan kullanıcı bulunamadı.</p> : null}
                </div>
              </section>
            ) : null}

          </aside>
        </section>
      )) : (
        <section className={`my-room-view my-room-view-topless ${roomSession ? "in-room" : "local-mode"}`}>
          <header className="my-room-header-strip">
            {roomSession ? (
              <>
                <strong>{roomSession.roomName}</strong>
                <span>/ Masa {roomSession.tableNo}</span>
                {roomStartState?.started ? <span className="my-room-start-indicator">Oyun başladı</span> : null}
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
                  <button className="my-action-btn danger my-room-main-leave" onClick={openLeaveActionModal}>
                    {activeDesign.texts.roomLeaveTable || "Masadan Kalk"}
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
                    Oyun Modu: <code>Online İki Oyuncu</code>
                  </p>
                ) : (
                  <div className="my-seat-toggle">
                    <button className={`my-seat-btn ${mode === "local" ? "active" : ""}`} onClick={() => onSelectMode("local")}>
                      İki Oyuncu
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
                      Oda: <code>{roomSession.roomName}</code>
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
                      style={{ order: roomOwnerButtonOrder.indexOf("invite") }}
                      onClick={() => openInvitePicker(currentRoomTable)}
                      disabled={!currentRoomHasOpenSeat}
                    >
                      {activeDesign.texts.roomInvite || "Davet Et"}
                    </button>
                    <button
                      className={`my-action-btn my-design-label-btn ${currentRoomTable.isPrivate ? "" : "soft"}`}
                      style={{ order: roomOwnerButtonOrder.indexOf("private") }}
                      data-design-label={
                        currentRoomTable.isPrivate
                          ? (activeDesign.texts.roomPrivateDisable || "Ozeli Kapat")
                          : (activeDesign.texts.roomPrivateEnable || "Masa Ozel Yap")
                      }
                      onClick={() => setTablePrivateMode(currentRoomTable.id, !currentRoomTable.isPrivate)}
                    >
                      {currentRoomTable.isPrivate ? "Özeli Kapat" : "Masa Özel Yap"}
                    </button>
                    <button
                      className={`my-action-btn my-design-label-btn ${currentRoomTable.allowSpectatorChat === false ? "" : "soft"}`}
                      style={{ order: roomOwnerButtonOrder.indexOf("spectator") }}
                      data-design-label={
                        currentRoomTable.allowSpectatorChat === false
                          ? (activeDesign.texts.roomSpectatorEnable || "Izleyici Yazisini Ac")
                          : (activeDesign.texts.roomSpectatorDisable || "Izleyici Yazisini Kapat")
                      }
                      onClick={() => setSpectatorChatEnabled(currentRoomTable.id, currentRoomTable.allowSpectatorChat === false)}
                    >
                      {currentRoomTable.allowSpectatorChat === false ? "İzleyici Yazısını Aç" : "İzleyici Yazısını Kapat"}
                    </button>
                  </div>
                ) : null}
                <button className="my-action-btn soft" onClick={goToLobbyFromTableView}>
                  {activeDesign.texts.roomBackLobby || "Lobiye Don"}
                </button>
                {normalizedLobbyNotice ? <p className="my-notice my-notice-soft">{normalizedLobbyNotice}</p> : null}
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
                    window.setTimeout(() => {
                      syncRoomStartGateToIframe(iframeRef.current?.contentWindow ?? null);
                    }, ROOM_START_GATE_RESYNC_DELAY_MS);
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

              {roomSession ? (
                <button className="my-action-btn danger my-room-main-leave my-room-mobile-leave" onClick={openLeaveActionModal}>
                  {activeDesign.texts.roomLeaveTable || "Masadan Kalk"}
                </button>
              ) : null}

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
                        ? canWriteRoomChat ? "Masa sohbetine mesaj yaz..." : "Masa sohbeti için üye girişi gerekli"
                        : canWriteRoomChat ? "Lobiye mesaj yaz..." : "Lobiye yazmak için üye girişi yap"
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
                    {activeDesign.texts.chatSend || "Gönder"}
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
                        <p>
                          <strong>{message.displayName}:</strong> {message.text}
                        </p>
                      </article>
                    ))
                  )}
                </div>
                {!canWriteRoomChat ? (
                  <p className="my-chat-hint">
                    {roomChatTab === "table" ? "Masa sohbetine sadece üye oyuncular yazabilir." : "Lobiye sadece üye oyuncular yazabilir."}
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
                      onClick={(event) => openPlayerProfile(
                        roomWhiteSeat.userId,
                        roomWhiteSeat.displayName,
                        roomWhiteSeat.points,
                        roomWhiteSeat.stats,
                        roomWhiteSeat.username,
                        roomWhiteSeat.gender,
                        roomWhiteSeat.avatarId,
                        event.currentTarget,
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
                      onClick={(event) => openPlayerProfile(
                        roomBlackSeat.userId,
                        roomBlackSeat.displayName,
                        roomBlackSeat.points,
                        roomBlackSeat.stats,
                        roomBlackSeat.username,
                        roomBlackSeat.gender,
                        roomBlackSeat.avatarId,
                        event.currentTarget,
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
                          onClick={(event) => openPlayerProfile(
                            row.userId,
                            row.name,
                            row.points,
                            row.stats,
                            row.username,
                            row.gender,
                            row.avatarId,
                            event.currentTarget,
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
        <article
          className="my-modal-card my-profile-popover"
          role="dialog"
          aria-modal="false"
          aria-label="Oyuncu Profili"
          style={{ left: `${profileModal.anchorLeft}px`, top: `${profileModal.anchorTop}px` }}
        >
          <div className="my-profile-modal-head">
            <AvatarBadge avatarId={profileModal.avatarId} gender={profileModal.gender} size="lg" />
            <h3>{profileModal.username ? `@${profileModal.username}` : "Oyuncu Profili"}</h3>
          </div>
          {profileModal.loading ? (
            <p className="line">Profil yukleniyor...</p>
          ) : (
            <>
              <p className="line">{profileModal.isMember ? "Üye Oyuncu" : "Misafir Oyuncu"}</p>
              {profileModal.username ? <p className="line">Kullanıcı: @{profileModal.username}</p> : null}
              <p className="line">Cinsiyet: {genderLabel(profileModal.gender)}</p>
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
      ) : null}

      {opponentIdleModal.open ? (
        <section className="my-modal-backdrop" role="presentation" onClick={postponeOpponentIdleWinOffer}>
          <article
            className="my-modal-card my-leave-action-modal my-leave-action-modal-compact"
            role="dialog"
            aria-modal="true"
            aria-label="Hamle süresi uyarısı"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Hamle Bekleniyor</h3>
            <p className="my-leave-action-message">
              Rakibiniz 1 dakikadır hamle yapmıyor. Oyunu kazanmak istiyor musunuz?
            </p>
            <div className="my-leave-action-buttons my-leave-action-buttons-two">
              <button className="my-action-btn" type="button" onClick={acceptOpponentIdleWinOffer}>
                Kazan
              </button>
              <button className="my-action-btn soft" type="button" onClick={postponeOpponentIdleWinOffer}>
                Beklemek İstiyorum
              </button>
            </div>
          </article>
        </section>
      ) : null}

      {leaveActionModalOpen ? (
        <section className="my-modal-backdrop" role="presentation" onClick={closeLeaveActionModal}>
          <article
            className="my-modal-card my-leave-action-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Masadan çık"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="my-leave-action-close" type="button" onClick={closeLeaveActionModal} aria-label="Kapat">
              x
            </button>
            <h3>Masadan Çık</h3>
            <p className="my-leave-action-message">
              Rakibe puan kaybetmeden terk etme teklif edilsin mi?
            </p>
            <div className="my-leave-action-buttons">
              <button className="my-action-btn danger" type="button" onClick={() => void leaveNowFromModal()}>
                Şimdi Terket
              </button>
              <button className="my-action-btn" type="button" onClick={offerLeaveWithoutPenaltyFromModal}>
                Teklif Et
              </button>
              <button className="my-action-btn soft" type="button" onClick={closeLeaveActionModal}>
                İptal Et
              </button>
            </div>
          </article>
        </section>
      ) : null}

      {leaveIncomingModal.open ? (
        <section className="my-modal-backdrop" role="presentation" onClick={() => closeLeaveIncomingModal(true)}>
          <article
            className="my-modal-card my-leave-action-modal my-leave-action-modal-compact"
            role="dialog"
            aria-modal="true"
            aria-label="Puansız ayrılma teklifi"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="my-leave-action-close" type="button" onClick={() => closeLeaveIncomingModal(true)} aria-label="Kapat">
              x
            </button>
            <h3>Masadan Çık</h3>
            <p className="my-leave-action-message">
              {leaveIncomingModal.requesterName} puan kaybetmeden terk etme teklif ediyor. Kabul ediyor musun?
            </p>
            <div className="my-leave-action-buttons my-leave-action-buttons-two">
              <button className="my-action-btn" type="button" onClick={acceptLeaveOfferFromModal}>
                Kabul Et
              </button>
              <button className="my-action-btn soft" type="button" onClick={rejectLeaveOfferFromModal}>
                Reddet
              </button>
            </div>
          </article>
        </section>
      ) : null}

      {leaveInfoModal.open ? (
        <section className="my-modal-backdrop" role="presentation" onClick={closeLeaveInfoModal}>
          <article
            className="my-modal-card my-leave-action-modal my-leave-action-modal-compact"
            role="dialog"
            aria-modal="true"
            aria-label="Teklif sonucu"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{leaveInfoModal.title || "Masadan Çık"}</h3>
            <p className="my-leave-action-message">{leaveInfoModal.message}</p>
            <div className="my-leave-action-buttons my-leave-action-buttons-single">
              <button className="my-action-btn" type="button" onClick={closeLeaveInfoModal}>
                Tamam
              </button>
            </div>
          </article>
        </section>
      ) : null}

      {leaveConfirmModal.open ? (
        <section className="my-modal-backdrop" role="presentation" onClick={() => closeLeaveConfirmModal(false)}>
          <article
            className="my-modal-card my-leave-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Masadan çıkış uyarısı"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{leaveConfirmModal.title || "Masadan Çıkış Uyarısı"}</h3>
            <p className="line">{leaveConfirmModal.message}</p>
            <div className="my-leave-confirm-actions">
              <button className="my-action-btn danger" type="button" onClick={() => closeLeaveConfirmModal(true)}>
                Çık
              </button>
              <button className="my-action-btn soft" type="button" onClick={() => closeLeaveConfirmModal(false)}>
                İptal
              </button>
            </div>
          </article>
        </section>
      ) : null}
    </main>
  );
}

export default Okey101App;

