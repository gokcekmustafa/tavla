export interface Env {
  ASSETS: Fetcher;
  ROOMS: DurableObjectNamespace;
  AUTH: DurableObjectNamespace;
}

type RealtimeMessage = {
  kind: "hello" | "snapshot";
  channel: string;
  sender: string;
  counter: number;
  at: number;
  payload?: unknown;
  reason?: string;
};

type MemberStats = {
  gamesPlayed: number;
  wins: number;
  losses: number;
  resigns: number;
};

type GameId = "tavla" | "okey101";
type MemberGameProfile = {
  points: number;
  stats: MemberStats;
};
type MemberGameProfiles = Record<GameId, MemberGameProfile>;

type MatchOutcome = "win" | "loss" | "resign";
type MemberRole = "user" | "admin" | "superadmin";
type MemberGender = "male" | "female" | "unknown";
type MemberPermissionKey = "lobbyChat" | "tableChat" | "spectatorChat";
type AvatarId =
  | "male_01"
  | "male_02"
  | "male_03"
  | "female_01"
  | "female_02"
  | "female_03"
  | "neutral_01";

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

type DesignSettings = {
  published: DesignConfig;
  history: DesignConfig[];
  updatedAt: number;
};

type MemberPermissions = {
  lobbyChat: boolean;
  tableChat: boolean;
  spectatorChat: boolean;
};

type LobbyRoomConfig = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  createdByUserId: string | null;
};

type PublicMemberUser = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  gender: MemberGender;
  avatarId: AvatarId;
  points: number;
  createdAt: number;
  stats: MemberStats;
  role: MemberRole;
  isBlocked: boolean;
  permissions: MemberPermissions;
};

type StoredMemberUser = PublicMemberUser & {
  password: string;
  activeSessionKey: string;
  activeSessionAt: number;
  gameProfiles: MemberGameProfiles;
};

const AUTH_DO_NAME = "members-v1";
const AUTH_RULES_KEY = "settings:rules";
const AUTH_LOBBIES_KEY = "settings:lobbies";
const AUTH_DESIGN_KEY = "settings:design";
const DESIGN_HISTORY_LIMIT = 25;
const DEFAULT_MEMBER_POINTS = 1500;
const DEFAULT_MEMBER_GAME_ID: GameId = "tavla";
const DEFAULT_WIN_POINTS = 100;
const DEFAULT_LOSS_POINTS = 0;
const DEFAULT_RESIGN_PENALTY_POINTS = 50;
const PRIMARY_ADMIN_EMAIL = "gokcek@outlook.com";
const DEFAULT_LOBBY_ROOMS: LobbyRoomConfig[] = [
  {
    id: "lobi-1",
    name: "Lobi 1",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdByUserId: null,
  },
];
const DEFAULT_AVATAR_BY_GENDER: Record<MemberGender, AvatarId> = {
  male: "male_01",
  female: "female_01",
  unknown: "neutral_01",
};

function sanitizeChannel(raw: string | null | undefined) {
  if (!raw) return "";
  return raw.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 96);
}

function sanitizeSender(raw: unknown) {
  if (typeof raw !== "string") return "";
  return raw.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 96);
}

function sanitizeCounter(raw: unknown) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  const intValue = Math.trunc(value);
  if (intValue < 0 || intValue > 9_999_999) return null;
  return intValue;
}

function isWebSocketUpgrade(request: Request) {
  const upgrade = request.headers.get("Upgrade");
  if (!upgrade) return false;
  return upgrade.toLowerCase().includes("websocket");
}

function sanitizeMemberDisplayName(raw: unknown) {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, 24);
}

function sanitizeMemberUsername(raw: unknown) {
  if (typeof raw !== "string") return "";
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
}

function sanitizeMemberEmail(raw: unknown) {
  if (typeof raw !== "string") return "";
  return raw.trim().toLowerCase().slice(0, 80);
}

function sanitizeMemberPassword(raw: unknown) {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, 64);
}

function sanitizeMemberId(raw: unknown) {
  if (typeof raw !== "string") return "";
  return raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
}

function sanitizeMemberSessionKey(raw: unknown) {
  if (typeof raw !== "string") return "";
  return raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 96);
}

function sanitizeMemberRole(raw: unknown): MemberRole {
  if (raw === "superadmin") return "superadmin";
  if (raw === "admin") return "admin";
  return "user";
}

function sanitizeMemberGender(raw: unknown): MemberGender {
  if (raw === "male" || raw === "female") return raw;
  return "unknown";
}

function sanitizeGameId(raw: unknown, fallback: GameId = DEFAULT_MEMBER_GAME_ID): GameId {
  if (raw === "okey101") return "okey101";
  if (raw === "tavla") return "tavla";
  return fallback;
}

function sanitizeAvatarId(raw: unknown, gender: MemberGender = "unknown"): AvatarId {
  if (
    raw === "male_01"
    || raw === "male_02"
    || raw === "male_03"
    || raw === "female_01"
    || raw === "female_02"
    || raw === "female_03"
    || raw === "neutral_01"
  ) {
    return raw;
  }
  return DEFAULT_AVATAR_BY_GENDER[sanitizeMemberGender(gender)];
}

function normalizeDisplayLookupKey(raw: unknown) {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 24);
}

function normalizeUsernameLookupKey(raw: unknown) {
  return sanitizeMemberUsername(raw);
}

function isPrimaryAdminEmail(email: string) {
  return sanitizeMemberEmail(email) === PRIMARY_ADMIN_EMAIL;
}

function sanitizeMatchOutcome(raw: unknown): MatchOutcome | null {
  if (raw === "win" || raw === "loss" || raw === "resign") return raw;
  return null;
}

function sanitizeMatchToken(raw: unknown) {
  if (typeof raw !== "string") return "";
  return raw.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 120);
}

function sanitizeFinitePoints(raw: unknown, fallback: number) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.trunc(value);
}

function sanitizeStatCount(raw: unknown) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return 0;
  const out = Math.trunc(value);
  if (out < 0) return 0;
  return Math.min(out, 1_000_000);
}

function sanitizeRuleNumber(raw: unknown, fallback: number, min: number, max: number) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  const intValue = Math.trunc(value);
  if (intValue < min) return min;
  if (intValue > max) return max;
  return intValue;
}

function sanitizeBoolean(raw: unknown, fallback = false) {
  if (typeof raw === "boolean") return raw;
  if (raw === "1" || raw === 1 || raw === "true") return true;
  if (raw === "0" || raw === 0 || raw === "false") return false;
  return fallback;
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
    lobbyChat: sanitizeBoolean(candidate.lobbyChat, true),
    tableChat: sanitizeBoolean(candidate.tableChat, true),
    spectatorChat: sanitizeBoolean(candidate.spectatorChat, true),
  };
}

function sanitizeMemberPermissionKey(raw: unknown): MemberPermissionKey | null {
  if (raw === "lobbyChat" || raw === "tableChat" || raw === "spectatorChat") return raw;
  return null;
}

function sanitizeLobbyId(raw: unknown) {
  if (typeof raw !== "string") return "";
  return raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);
}

function sanitizeLobbyName(raw: unknown) {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, 32);
}

function createLobbyId() {
  return sanitizeLobbyId(`l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`) || "lobi-1";
}

function normalizeLobbyRoom(raw: unknown): LobbyRoomConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<LobbyRoomConfig>;
  const id = sanitizeLobbyId(candidate.id);
  const name = sanitizeLobbyName(candidate.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    createdAt: Number.isFinite(candidate.createdAt) ? Number(candidate.createdAt) : Date.now(),
    updatedAt: Number.isFinite(candidate.updatedAt) ? Number(candidate.updatedAt) : Date.now(),
    createdByUserId: sanitizeMemberId(candidate.createdByUserId) || null,
  };
}

function normalizeLobbyRooms(raw: unknown): LobbyRoomConfig[] {
  const rows = Array.isArray(raw) ? raw : [];
  const byId = new Map<string, LobbyRoomConfig>();
  rows.forEach((row) => {
    const lobby = normalizeLobbyRoom(row);
    if (!lobby) return;
    const existing = byId.get(lobby.id);
    if (!existing || lobby.updatedAt >= existing.updatedAt) {
      byId.set(lobby.id, lobby);
    }
  });
  if (byId.size === 0) {
    DEFAULT_LOBBY_ROOMS.forEach((room) => {
      byId.set(room.id, {
        ...room,
        createdAt: room.createdAt || Date.now(),
        updatedAt: room.updatedAt || Date.now(),
      });
    });
  }
  return [...byId.values()]
    .sort((a, b) => a.name.localeCompare(b.name, "tr") || a.id.localeCompare(b.id))
    .map((room) => ({
      ...room,
      name: sanitizeLobbyName(room.name) || "Lobi",
    }));
}

function createDefaultMemberStats(): MemberStats {
  return {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    resigns: 0,
  };
}

function normalizeMemberStats(raw: unknown): MemberStats {
  if (!raw || typeof raw !== "object") return createDefaultMemberStats();
  const candidate = raw as Partial<MemberStats>;
  const stats = {
    gamesPlayed: sanitizeStatCount(candidate.gamesPlayed),
    wins: sanitizeStatCount(candidate.wins),
    losses: sanitizeStatCount(candidate.losses),
    resigns: sanitizeStatCount(candidate.resigns),
  };
  if (stats.gamesPlayed < stats.wins + stats.losses) {
    stats.gamesPlayed = stats.wins + stats.losses;
  }
  return stats;
}

function createDefaultMemberGameProfile(
  points = DEFAULT_MEMBER_POINTS,
  stats: MemberStats = createDefaultMemberStats(),
): MemberGameProfile {
  return {
    points: Math.max(0, sanitizeFinitePoints(points, DEFAULT_MEMBER_POINTS)),
    stats: normalizeMemberStats(stats),
  };
}

function createDefaultMemberGameProfiles(
  points = DEFAULT_MEMBER_POINTS,
  stats: MemberStats = createDefaultMemberStats(),
): MemberGameProfiles {
  const profile = createDefaultMemberGameProfile(points, stats);
  return {
    tavla: createDefaultMemberGameProfile(profile.points, profile.stats),
    okey101: createDefaultMemberGameProfile(profile.points, profile.stats),
  };
}

function normalizeMemberGameProfile(raw: unknown, fallback: MemberGameProfile): MemberGameProfile {
  const base = createDefaultMemberGameProfile(fallback.points, fallback.stats);
  if (!raw || typeof raw !== "object") return base;
  const candidate = raw as Partial<MemberGameProfile>;
  return {
    points: Math.max(0, sanitizeFinitePoints(candidate.points, base.points)),
    stats: normalizeMemberStats(candidate.stats ?? base.stats),
  };
}

function normalizeMemberGameProfiles(raw: unknown, fallback?: MemberGameProfiles): MemberGameProfiles {
  const base = fallback
    ? {
      tavla: createDefaultMemberGameProfile(fallback.tavla.points, fallback.tavla.stats),
      okey101: createDefaultMemberGameProfile(fallback.okey101.points, fallback.okey101.stats),
    }
    : createDefaultMemberGameProfiles();
  if (!raw || typeof raw !== "object") return base;
  const candidate = raw as Partial<Record<GameId, unknown>>;
  return {
    tavla: normalizeMemberGameProfile(candidate.tavla, base.tavla),
    okey101: normalizeMemberGameProfile(candidate.okey101, base.okey101),
  };
}

function withNormalizedGameProfiles(user: StoredMemberUser): StoredMemberUser {
  const legacyPoints = Math.max(0, sanitizeFinitePoints(user.points, DEFAULT_MEMBER_POINTS));
  const legacyStats = normalizeMemberStats(user.stats);
  const profiles = normalizeMemberGameProfiles(
    user.gameProfiles,
    createDefaultMemberGameProfiles(legacyPoints, legacyStats),
  );
  const defaultProfile = profiles[DEFAULT_MEMBER_GAME_ID];
  return {
    ...user,
    points: defaultProfile.points,
    stats: defaultProfile.stats,
    gameProfiles: profiles,
  };
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
    winPoints: sanitizeRuleNumber(candidate.winPoints, base.winPoints, -10_000, 10_000),
    lossPoints: sanitizeRuleNumber(candidate.lossPoints, base.lossPoints, -10_000, 10_000),
    resignPenaltyPoints: sanitizeRuleNumber(candidate.resignPenaltyPoints, base.resignPenaltyPoints, 0, 10_000),
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
      fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif",
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
  const actionsRaw = Array.isArray(candidate.lobbyHeaderActions) ? candidate.lobbyHeaderActions : fallback.lobbyHeaderActions;
  const ordered: ("openTable" | "quickPlay")[] = [];
  actionsRaw.forEach((item) => {
    if (item === "openTable" || item === "quickPlay") {
      if (!ordered.includes(item)) ordered.push(item);
    }
  });
  if (!ordered.includes("openTable")) ordered.push("openTable");
  if (!ordered.includes("quickPlay")) ordered.push("quickPlay");
  const topRaw = Array.isArray(candidate.lobbyTopButtons) ? candidate.lobbyTopButtons : fallback.lobbyTopButtons;
  const lobbyTopButtons: ("home" | "roomSelect" | "botMode")[] = [];
  topRaw.forEach((item) => {
    if (item === "home" || item === "roomSelect" || item === "botMode") {
      if (!lobbyTopButtons.includes(item)) lobbyTopButtons.push(item);
    }
  });
  if (!lobbyTopButtons.includes("home")) lobbyTopButtons.push("home");
  if (!lobbyTopButtons.includes("roomSelect")) lobbyTopButtons.push("roomSelect");
  if (!lobbyTopButtons.includes("botMode")) lobbyTopButtons.push("botMode");

  const roomOwnerRaw = Array.isArray(candidate.roomOwnerButtons) ? candidate.roomOwnerButtons : fallback.roomOwnerButtons;
  const roomOwnerButtons: ("invite" | "private" | "spectator" | "copyLink")[] = [];
  roomOwnerRaw.forEach((item) => {
    if (item === "invite" || item === "private" || item === "spectator" || item === "copyLink") {
      if (!roomOwnerButtons.includes(item)) roomOwnerButtons.push(item);
    }
  });
  if (!roomOwnerButtons.includes("invite")) roomOwnerButtons.push("invite");
  if (!roomOwnerButtons.includes("private")) roomOwnerButtons.push("private");
  if (!roomOwnerButtons.includes("spectator")) roomOwnerButtons.push("spectator");
  if (!roomOwnerButtons.includes("copyLink")) roomOwnerButtons.push("copyLink");

  return {
    lobbyHeaderActions: ordered,
    lobbyTopButtons,
    roomOwnerButtons,
  };
}

function normalizeDesignSizing(raw: unknown, fallback: DesignSizing): DesignSizing {
  const candidate = raw && typeof raw === "object" ? raw as Partial<DesignSizing> : {};
  return {
    buttonScalePct: sanitizeRuleNumber(candidate.buttonScalePct, fallback.buttonScalePct, 80, 140),
    lobbyTableZoneHeight: sanitizeRuleNumber(candidate.lobbyTableZoneHeight, fallback.lobbyTableZoneHeight, 360, 760),
    roomBoardMinHeight: sanitizeRuleNumber(candidate.roomBoardMinHeight, fallback.roomBoardMinHeight, 420, 760),
  };
}

function normalizeDesignTexts(raw: unknown, fallback: Partial<Record<DesignTextKey, string>>) {
  const next: Partial<Record<DesignTextKey, string>> = {};
  const seed = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  Object.entries(seed).forEach(([keyRaw, valueRaw]) => {
    const key = sanitizeDesignTextKey(keyRaw);
    if (!key) return;
    if (typeof valueRaw !== "string") return;
    const cleaned = valueRaw.replace(/\s+/g, " ").trim().slice(0, 72);
    if (!cleaned) return;
    next[key] = cleaned;
  });
  Object.entries(fallback).forEach(([keyRaw, valueRaw]) => {
    const key = sanitizeDesignTextKey(keyRaw);
    if (!key || !valueRaw || next[key]) return;
    next[key] = valueRaw;
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
    version: sanitizeRuleNumber(candidate.version, base.version, 1, 999_999),
    updatedAt: Number.isFinite(candidate.updatedAt) ? Number(candidate.updatedAt) : base.updatedAt,
    theme: normalizeDesignTheme(candidate.theme, base.theme),
    texts: normalizeDesignTexts(candidate.texts, base.texts),
    layout: normalizeDesignLayout(candidate.layout, base.layout),
    sizing: normalizeDesignSizing(candidate.sizing, base.sizing),
  };
}

function normalizeDesignHistory(raw: unknown): DesignConfig[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const rows: DesignConfig[] = [];
  raw.forEach((item) => {
    const normalized = normalizeDesignConfig(item, createDefaultDesignConfig());
    if (seen.has(normalized.version)) return;
    seen.add(normalized.version);
    rows.push(normalized);
  });
  rows.sort((a, b) => b.version - a.version);
  return rows.slice(0, DESIGN_HISTORY_LIMIT);
}

function normalizeDesignSettings(raw: unknown, fallback?: DesignSettings): DesignSettings {
  const base = fallback ?? {
    published: createDefaultDesignConfig(),
    history: [],
    updatedAt: Date.now(),
  };
  if (!raw || typeof raw !== "object") return base;
  const candidate = raw as Partial<DesignSettings>;
  const published = normalizeDesignConfig(candidate.published, base.published);
  const history = normalizeDesignHistory(candidate.history ?? base.history)
    .filter((row) => row.version !== published.version)
    .slice(0, DESIGN_HISTORY_LIMIT);
  return {
    published,
    history,
    updatedAt: Number.isFinite(candidate.updatedAt) ? Number(candidate.updatedAt) : base.updatedAt,
  };
}

function createMemberId() {
  return sanitizeMemberId(`m${Date.now().toString(36)}${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`);
}

function createMemberSessionKey() {
  return sanitizeMemberSessionKey(`s${Date.now().toString(36)}${crypto.randomUUID().replace(/-/g, "")}`);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error ?? "Bilinmeyen hata");
}

function isDoFreeTierWriteLimitError(error: unknown) {
  return getErrorMessage(error).includes("Exceeded allowed rows written in Durable Objects free tier");
}

function toPublicUser(user: StoredMemberUser, gameId: GameId = DEFAULT_MEMBER_GAME_ID): PublicMemberUser {
  const normalizedUser = withNormalizedGameProfiles(user);
  const targetGameId = sanitizeGameId(gameId, DEFAULT_MEMBER_GAME_ID);
  const scopedProfile = normalizedUser.gameProfiles[targetGameId];
  const gender = sanitizeMemberGender(normalizedUser.gender);
  return {
    id: normalizedUser.id,
    username: normalizedUser.username,
    displayName: normalizedUser.displayName,
    email: normalizedUser.email,
    gender,
    avatarId: sanitizeAvatarId(normalizedUser.avatarId, gender),
    points: scopedProfile.points,
    createdAt: normalizedUser.createdAt,
    stats: normalizeMemberStats(scopedProfile.stats),
    role: sanitizeMemberRole(normalizedUser.role),
    isBlocked: sanitizeBoolean(normalizedUser.isBlocked, false),
    permissions: normalizeMemberPermissions(normalizedUser.permissions),
  };
}

function normalizeStoredMemberUser(raw: unknown): StoredMemberUser | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<StoredMemberUser>;
  const id = sanitizeMemberId(candidate.id);
  const email = sanitizeMemberEmail(candidate.email);
  const password = sanitizeMemberPassword(candidate.password);
  if (!id || !email || !password) return null;
  const displayName = sanitizeMemberDisplayName(candidate.displayName) || "Uye";
  const username =
    sanitizeMemberUsername(candidate.username)
    || sanitizeMemberUsername(displayName.replace(/\s+/g, "_"))
    || sanitizeMemberUsername(`u${id.slice(-10)}`)
    || `u${Date.now().toString(36).slice(-6)}`;
  const gender = sanitizeMemberGender(candidate.gender);
  const activeSessionKey = sanitizeMemberSessionKey(candidate.activeSessionKey);
  const legacyPoints = Math.max(0, sanitizeFinitePoints(candidate.points, DEFAULT_MEMBER_POINTS));
  const legacyStats = normalizeMemberStats(candidate.stats);
  const gameProfiles = normalizeMemberGameProfiles(
    (raw as { gameProfiles?: unknown }).gameProfiles,
    createDefaultMemberGameProfiles(legacyPoints, legacyStats),
  );
  const normalized: StoredMemberUser = {
    id,
    username,
    displayName,
    email,
    gender,
    avatarId: sanitizeAvatarId(candidate.avatarId, gender),
    password,
    points: legacyPoints,
    createdAt: Number.isFinite(candidate.createdAt) ? Number(candidate.createdAt) : Date.now(),
    stats: legacyStats,
    role: sanitizeMemberRole(candidate.role),
    isBlocked: sanitizeBoolean(candidate.isBlocked, false),
    permissions: normalizeMemberPermissions(candidate.permissions),
    activeSessionKey,
    activeSessionAt: Number.isFinite(candidate.activeSessionAt) ? Number(candidate.activeSessionAt) : 0,
    gameProfiles,
  };
  return withNormalizedGameProfiles(normalized);
}

function parseRealtimeMessage(raw: string): RealtimeMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;
  const candidate = parsed as Partial<RealtimeMessage>;
  const kind = candidate.kind === "hello" || candidate.kind === "snapshot" ? candidate.kind : null;
  const channel = sanitizeChannel(candidate.channel ?? "");
  const sender = sanitizeSender(candidate.sender);
  const counter = sanitizeCounter(candidate.counter);
  if (!kind || !channel || !sender || counter === null) return null;

  return {
    kind,
    channel,
    sender,
    counter,
    at: Number.isFinite(candidate.at) ? Number(candidate.at) : Date.now(),
    payload: candidate.payload,
    reason: typeof candidate.reason === "string" ? candidate.reason.slice(0, 120) : undefined,
  };
}

async function parseJsonBody(request: Request): Promise<unknown | null> {
  const text = await request.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function serveAssetWithSpaFallback(request: Request, env: Env): Promise<Response> {
  const primary = await env.ASSETS.fetch(request);
  if (primary.status !== 404) return withNoStoreForHtml(primary);
  if (request.method !== "GET") return primary;
  const accept = request.headers.get("accept") || "";
  if (!accept.includes("text/html")) return primary;

  const url = new URL(request.url);
  url.pathname = "/index.html";
  const fallback = await env.ASSETS.fetch(new Request(url.toString(), request));
  return withNoStoreForHtml(fallback);
}

function withNoStoreForHtml(response: Response): Response {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("text/html")) return response;
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store, no-cache, must-revalidate, max-age=0");
  headers.set("pragma", "no-cache");
  headers.set("expires", "0");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response("ok", { status: 200 });
    }

    if (url.pathname.startsWith("/api/auth/")) {
      if (!env.AUTH || typeof env.AUTH.idFromName !== "function") {
        return jsonResponse({
          error: "Kimlik servisi baglantisi eksik (AUTH binding). Deploy ayarini kontrol edin.",
        }, 503);
      }
      try {
        const authId = env.AUTH.idFromName(AUTH_DO_NAME);
        const auth = env.AUTH.get(authId);
        return await auth.fetch(request);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Bilinmeyen hata";
        return jsonResponse({
          error: `Kimlik servisi gecici hata verdi: ${message}`,
        }, 500);
      }
    }

    if (url.pathname === "/realtime") {
      if (!isWebSocketUpgrade(request)) {
        return new Response("Expected websocket upgrade", { status: 426 });
      }
      const channel = sanitizeChannel(url.searchParams.get("channel"));
      if (!channel) {
        return new Response("Missing or invalid channel", { status: 400 });
      }
      const roomId = env.ROOMS.idFromName(channel);
      const room = env.ROOMS.get(roomId);
      return await room.fetch(request);
    }

    if (url.pathname === "/api/lobby-sync") {
      const channel = sanitizeChannel(url.searchParams.get("channel"));
      if (!channel) {
        return jsonResponse({ error: "Missing or invalid channel." }, 400);
      }
      const roomId = env.ROOMS.idFromName(channel);
      const room = env.ROOMS.get(roomId);
      return await room.fetch(request);
    }

    return serveAssetWithSpaFallback(request, env);
  },
};

export class RealtimeRoom {
  private readonly ctx: DurableObjectState;
  private latestSnapshot: RealtimeMessage | null = null;

  constructor(ctx: DurableObjectState, _env: Env) {
    this.ctx = ctx;
  }

  async fetch(request: Request): Promise<Response> {
    if (!isWebSocketUpgrade(request)) {
      if (request.method === "GET") {
        return jsonResponse({
          ok: true,
          snapshot: this.latestSnapshot,
        }, 200);
      }

      if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed." }, 405);
      }

      const body = await parseJsonBody(request);
      if (!body) {
        return jsonResponse({ error: "Invalid realtime payload." }, 400);
      }

      const incoming = parseRealtimeMessage(JSON.stringify(body));
      if (!incoming) {
        return jsonResponse({ error: "Invalid realtime message." }, 400);
      }

      if (incoming.kind === "hello") {
        return jsonResponse({
          ok: true,
          snapshot: this.latestSnapshot,
        }, 200);
      }

      const snapshot: RealtimeMessage = {
        ...incoming,
        kind: "snapshot",
        at: Date.now(),
      };

      this.latestSnapshot = snapshot;
      const encoded = JSON.stringify(snapshot);
      for (const socket of this.ctx.getWebSockets()) {
        try {
          socket.send(encoded);
        } catch {
          // ignore dead sockets
        }
      }

      return jsonResponse({
        ok: true,
        snapshot,
      }, 200);
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketOpen(ws: WebSocket): Promise<void> {
    if (!this.latestSnapshot) return;
    try {
      ws.send(JSON.stringify(this.latestSnapshot));
    } catch {
      // no-op
    }
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const text = typeof message === "string" ? message : new TextDecoder().decode(message);
    const incoming = parseRealtimeMessage(text);
    if (!incoming) return;

    if (incoming.kind === "hello") {
      if (!this.latestSnapshot) return;
      try {
        ws.send(JSON.stringify(this.latestSnapshot));
      } catch {
        // no-op
      }
      return;
    }

    const snapshot: RealtimeMessage = {
      ...incoming,
      kind: "snapshot",
      at: Date.now(),
    };

    this.latestSnapshot = snapshot;
    const encoded = JSON.stringify(snapshot);
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(encoded);
      } catch {
        // ignore dead sockets
      }
    }
  }

  webSocketClose(_ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): void {
    // no-op
  }

  webSocketError(_ws: WebSocket, _error: unknown): void {
    // no-op
  }
}

export class AuthStore {
  private readonly ctx: DurableObjectState;
  private readonly transientUsersById = new Map<string, StoredMemberUser>();
  private readonly transientMatchDedupe = new Set<string>();
  private transientRules: GameRules | null = null;
  private transientLobbies: LobbyRoomConfig[] | null = null;
  private transientDesign: DesignSettings | null = null;

  constructor(ctx: DurableObjectState, _env: Env) {
    this.ctx = ctx;
  }

  private keyById(id: string) {
    return `id:${id}`;
  }

  private keyRules() {
    return AUTH_RULES_KEY;
  }

  private keyLobbies() {
    return AUTH_LOBBIES_KEY;
  }

  private keyDesign() {
    return AUTH_DESIGN_KEY;
  }

  private listTransientUsers(): StoredMemberUser[] {
    return [...this.transientUsersById.values()].map((user) => {
      const normalizedUser = withNormalizedGameProfiles(user);
      return {
        ...normalizedUser,
        stats: normalizeMemberStats(normalizedUser.stats),
        gameProfiles: normalizeMemberGameProfiles(normalizedUser.gameProfiles),
        role: sanitizeMemberRole(normalizedUser.role),
        isBlocked: sanitizeBoolean(normalizedUser.isBlocked, false),
        permissions: normalizeMemberPermissions(normalizedUser.permissions),
      };
    });
  }

  private findTransientByEmail(email: string): StoredMemberUser | null {
    for (const user of this.transientUsersById.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  private findTransientByDisplayName(displayName: string): StoredMemberUser | null {
    const lookup = normalizeDisplayLookupKey(displayName);
    if (!lookup) return null;
    for (const user of this.transientUsersById.values()) {
      if (normalizeDisplayLookupKey(user.displayName) === lookup) return user;
    }
    return null;
  }

  private findTransientByUsername(username: string): StoredMemberUser | null {
    const lookup = normalizeUsernameLookupKey(username);
    if (!lookup) return null;
    for (const user of this.transientUsersById.values()) {
      if (normalizeUsernameLookupKey(user.username) === lookup) return user;
    }
    return null;
  }

  private mergeUsers(durableUsers: StoredMemberUser[]): StoredMemberUser[] {
    const byId = new Map<string, StoredMemberUser>();
    for (const user of durableUsers) {
      byId.set(user.id, user);
    }
    for (const user of this.listTransientUsers()) {
      byId.set(user.id, user);
    }
    const users = [...byId.values()];
    users.sort((a, b) => a.displayName.localeCompare(b.displayName, "tr"));
    return users;
  }

  private async listDurableUsers(): Promise<StoredMemberUser[]> {
    const users: StoredMemberUser[] = [];
    const rows = await this.ctx.storage.list<unknown>({ prefix: "id:" });
    for (const raw of rows.values()) {
      const user = normalizeStoredMemberUser(raw);
      if (!user) continue;
      users.push(user);
    }
    return users;
  }

  private async getByEmail(email: string): Promise<StoredMemberUser | null> {
    const transient = this.findTransientByEmail(email);
    if (transient) return transient;
    const users = await this.listDurableUsers();
    for (const user of users) {
      if (user.email === email) return user;
    }
    return null;
  }

  private async getByDisplayName(displayName: string): Promise<StoredMemberUser | null> {
    const transient = this.findTransientByDisplayName(displayName);
    if (transient) return transient;
    const lookup = normalizeDisplayLookupKey(displayName);
    if (!lookup) return null;
    const users = await this.listDurableUsers();
    for (const user of users) {
      if (normalizeDisplayLookupKey(user.displayName) === lookup) return user;
    }
    return null;
  }

  private async getByUsername(username: string): Promise<StoredMemberUser | null> {
    const transient = this.findTransientByUsername(username);
    if (transient) return transient;
    const lookup = normalizeUsernameLookupKey(username);
    if (!lookup) return null;
    const users = await this.listDurableUsers();
    for (const user of users) {
      if (normalizeUsernameLookupKey(user.username) === lookup) return user;
    }
    return null;
  }

  private async getById(id: string): Promise<StoredMemberUser | null> {
    const transient = this.transientUsersById.get(id);
    if (transient) return transient;
    const raw = await this.ctx.storage.get<unknown>(this.keyById(id));
    return normalizeStoredMemberUser(raw);
  }

  private async findDisplayNameFallback(displayName: string): Promise<StoredMemberUser | null> {
    return this.getByDisplayName(displayName);
  }

  private async findByIdentifier(identifierRaw: unknown): Promise<StoredMemberUser | null> {
    const identifier = typeof identifierRaw === "string" ? identifierRaw.trim() : "";
    if (!identifier) return null;
    if (identifier.includes("@")) {
      const email = sanitizeMemberEmail(identifier);
      if (!email) return null;
      return this.getByEmail(email);
    }

    const username = sanitizeMemberUsername(identifier);
    if (username) {
      const byUsername = await this.getByUsername(username);
      if (byUsername) return byUsername;
    }

    const displayName = sanitizeMemberDisplayName(identifier);
    if (!displayName) return null;

    return this.getByDisplayName(displayName);
  }

  private async listUsers(): Promise<StoredMemberUser[]> {
    const durableUsers = await this.listDurableUsers();
    return this.mergeUsers(durableUsers);
  }

  private async countAdmins(): Promise<number> {
    const users = await this.listUsers();
    return users.filter((user) => user.role === "admin").length;
  }

  private async getRules(): Promise<GameRules> {
    const fallback = this.transientRules ?? createDefaultGameRules();
    const raw = await this.ctx.storage.get<unknown>(this.keyRules());
    const normalized = normalizeGameRules(raw, fallback);
    this.transientRules = normalized;
    return normalized;
  }

  private async putRules(rules: GameRules): Promise<GameRules> {
    const normalized = normalizeGameRules(rules, rules);
    this.transientRules = normalized;
    try {
      await this.ctx.storage.put(this.keyRules(), normalized);
    } catch (error) {
      if (!isDoFreeTierWriteLimitError(error)) throw error;
    }
    return normalized;
  }

  private async getLobbies(): Promise<LobbyRoomConfig[]> {
    const fallback = this.transientLobbies ?? normalizeLobbyRooms(DEFAULT_LOBBY_ROOMS);
    const raw = await this.ctx.storage.get<unknown>(this.keyLobbies());
    const normalized = normalizeLobbyRooms(raw ?? fallback);
    this.transientLobbies = normalized;
    return normalized;
  }

  private async putLobbies(lobbies: LobbyRoomConfig[]): Promise<LobbyRoomConfig[]> {
    const normalized = normalizeLobbyRooms(lobbies);
    this.transientLobbies = normalized;
    try {
      await this.ctx.storage.put(this.keyLobbies(), normalized);
    } catch (error) {
      if (!isDoFreeTierWriteLimitError(error)) throw error;
    }
    return normalized;
  }

  private async getDesignSettings(): Promise<DesignSettings> {
    const fallback = this.transientDesign ?? {
      published: createDefaultDesignConfig(),
      history: [],
      updatedAt: Date.now(),
    };
    const raw = await this.ctx.storage.get<unknown>(this.keyDesign());
    const normalized = normalizeDesignSettings(raw, fallback);
    this.transientDesign = normalized;
    return normalized;
  }

  private async putDesignSettings(settings: DesignSettings): Promise<DesignSettings> {
    const normalized = normalizeDesignSettings(settings, settings);
    this.transientDesign = normalized;
    try {
      await this.ctx.storage.put(this.keyDesign(), normalized);
    } catch (error) {
      if (!isDoFreeTierWriteLimitError(error)) throw error;
    }
    return normalized;
  }

  private async ensureBootstrapAdmin(user: StoredMemberUser): Promise<StoredMemberUser> {
    if (user.role === "superadmin") return user;
    if (isPrimaryAdminEmail(user.email)) {
      const promoted: StoredMemberUser = {
        ...user,
        role: "superadmin",
      };
      await this.putUser(promoted, user);
      return promoted;
    }
    if (user.role === "admin") return user;
    const adminCount = await this.countAdmins();
    if (adminCount > 0) return user;
    const promoted: StoredMemberUser = {
      ...user,
      role: "admin",
    };
    await this.putUser(promoted, user);
    return promoted;
  }

  private async putUser(user: StoredMemberUser, _previous?: StoredMemberUser | null) {
    const normalizedScopedUser = withNormalizedGameProfiles(user);
    const gender = sanitizeMemberGender(normalizedScopedUser.gender);
    const normalized: StoredMemberUser = {
      ...normalizedScopedUser,
      gender,
      avatarId: sanitizeAvatarId(normalizedScopedUser.avatarId, gender),
      role: sanitizeMemberRole(normalizedScopedUser.role),
      isBlocked: sanitizeBoolean(normalizedScopedUser.isBlocked, false),
      permissions: normalizeMemberPermissions(normalizedScopedUser.permissions),
      stats: normalizeMemberStats(normalizedScopedUser.stats),
      gameProfiles: normalizeMemberGameProfiles(normalizedScopedUser.gameProfiles),
      activeSessionKey: sanitizeMemberSessionKey(normalizedScopedUser.activeSessionKey),
      activeSessionAt: Number.isFinite(normalizedScopedUser.activeSessionAt) ? Number(normalizedScopedUser.activeSessionAt) : 0,
    };
    this.transientUsersById.set(normalized.id, normalized);
    try {
      await this.ctx.storage.put(this.keyById(normalized.id), normalized);
    } catch (error) {
      if (!isDoFreeTierWriteLimitError(error)) {
        throw error;
      }
    }
  }

  private async deleteUser(user: StoredMemberUser) {
    this.transientUsersById.delete(user.id);
    try {
      await this.ctx.storage.delete(this.keyById(user.id));
    } catch (error) {
      if (!isDoFreeTierWriteLimitError(error)) {
        throw error;
      }
    }
  }

  private async requireAdmin(userIdRaw: unknown): Promise<StoredMemberUser | null> {
    const userId = sanitizeMemberId(userIdRaw);
    if (!userId) return null;
    const user = await this.getById(userId);
    if (!user) return null;
    const normalized = await this.ensureBootstrapAdmin(user);
    if (normalized.role !== "admin" && normalized.role !== "superadmin") return null;
    return normalized;
  }

  private async requireActiveSession(userIdRaw: unknown, sessionKeyRaw: unknown): Promise<StoredMemberUser | null> {
    const userId = sanitizeMemberId(userIdRaw);
    const sessionKey = sanitizeMemberSessionKey(sessionKeyRaw);
    if (!userId || !sessionKey) return null;
    const user = await this.getById(userId);
    if (!user) return null;
    const activeSessionKey = sanitizeMemberSessionKey(user.activeSessionKey);
    if (!activeSessionKey || activeSessionKey !== sessionKey) return null;
    return user;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, "");

    if (request.method === "POST" && pathname === "/api/auth/register") {
      return this.handleRegister(request);
    }
    if (request.method === "POST" && pathname === "/api/auth/login") {
      return this.handleLogin(request);
    }
    if (request.method === "POST" && pathname === "/api/auth/password/forgot") {
      return this.handleForgotPassword(request);
    }
    if (request.method === "POST" && pathname === "/api/auth/password/change") {
      return this.handleChangePassword(request);
    }
    if (request.method === "GET" && pathname === "/api/auth/rules") {
      return this.handleRules();
    }
    if (request.method === "GET" && pathname === "/api/auth/lobbies") {
      return this.handleLobbies();
    }
    if (request.method === "GET" && pathname === "/api/auth/design") {
      return this.handleDesign();
    }
    if (request.method === "GET" && pathname === "/api/auth/design/tavla") {
      return this.handleDesignTavla(url);
    }
    if (request.method === "POST" && pathname === "/api/auth/design/tavla") {
      return this.handleDesignTavlaUpdate(request);
    }
    if (request.method === "GET" && pathname === "/api/auth/me") {
      return this.handleMe(url);
    }
    if (request.method === "GET" && pathname === "/api/auth/profile") {
      return this.handleProfile(url);
    }
    if (request.method === "POST" && pathname === "/api/auth/profile/update") {
      return this.handleProfileUpdate(request);
    }
    if (request.method === "POST" && pathname === "/api/auth/match") {
      return this.handleMatch(request);
    }
    if (request.method === "GET" && pathname === "/api/auth/admin/state") {
      return this.handleAdminState(url);
    }
    if (request.method === "POST" && pathname === "/api/auth/admin/user") {
      return this.handleAdminUser(request);
    }
    if (request.method === "POST" && pathname === "/api/auth/admin/rules") {
      return this.handleAdminRules(request);
    }
    if (request.method === "POST" && pathname === "/api/auth/admin/lobbies") {
      return this.handleAdminLobbies(request);
    }
    if (request.method === "GET" && pathname === "/api/auth/admin/design") {
      return this.handleAdminDesign(url);
    }
    if (request.method === "POST" && pathname === "/api/auth/admin/design") {
      return this.handleAdminDesignUpdate(request);
    }

    return jsonResponse({ error: "Bulunamadi." }, 404);
  }

  private async handleRegister(request: Request): Promise<Response> {
    const payload = await parseJsonBody(request);
    if (!payload || typeof payload !== "object") {
      return jsonResponse({ error: "Gecersiz istek." }, 400);
    }

    const body = payload as Record<string, unknown>;
    const username = sanitizeMemberUsername(body.username);
    const displayName = sanitizeMemberDisplayName(body.displayName) || sanitizeMemberDisplayName(body.username) || "Uye";
    const email = sanitizeMemberEmail(body.email);
    const password = sanitizeMemberPassword(body.password);
    const gender = sanitizeMemberGender(body.gender);
    const avatarId = sanitizeAvatarId(body.avatarId, gender);
    const gameId = sanitizeGameId(body.gameId, DEFAULT_MEMBER_GAME_ID);

    if (!username || username.length < 3) {
      return jsonResponse({ error: "Kullanici adi en az 3 karakter olmali (harf, rakam, alt cizgi)." }, 400);
    }

    if (!displayName || displayName.length < 3) {
      return jsonResponse({ error: "Uye adi en az 3 karakter olmali." }, 400);
    }
    if (!email.includes("@")) {
      return jsonResponse({ error: "Gecerli e-posta girin." }, 400);
    }
    if (password.length < 4) {
      return jsonResponse({ error: "Sifre en az 4 karakter olmali." }, 400);
    }

    const existing = await this.getByEmail(email);
    if (existing) {
      return jsonResponse({ error: "Bu e-posta ile hesap zaten var." }, 409);
    }

    const existingUsername = await this.getByUsername(username);
    if (existingUsername) {
      return jsonResponse({ error: "Bu kullanici adi zaten alinmis." }, 409);
    }

    const existingName = await this.getByDisplayName(displayName);
    if (existingName) {
      return jsonResponse({ error: "Bu gorunen ad zaten kullaniliyor." }, 409);
    }

    const role: MemberRole = isPrimaryAdminEmail(email) || (await this.countAdmins()) === 0 ? "superadmin" : "user";
    const sessionKey = createMemberSessionKey();
    const defaultGameProfiles = createDefaultMemberGameProfiles(DEFAULT_MEMBER_POINTS, createDefaultMemberStats());
    const user: StoredMemberUser = {
      id: createMemberId(),
      username,
      displayName,
      email,
      gender,
      avatarId,
      password,
      points: defaultGameProfiles[DEFAULT_MEMBER_GAME_ID].points,
      createdAt: Date.now(),
      stats: defaultGameProfiles[DEFAULT_MEMBER_GAME_ID].stats,
      gameProfiles: defaultGameProfiles,
      role,
      isBlocked: false,
      permissions: createDefaultMemberPermissions(),
      activeSessionKey: sessionKey,
      activeSessionAt: Date.now(),
    };

    await this.putUser(user);
    return jsonResponse({ ok: true, user: toPublicUser(user, gameId), sessionKey }, 201);
  }

  private async handleLogin(request: Request): Promise<Response> {
    const payload = await parseJsonBody(request);
    if (!payload || typeof payload !== "object") {
      return jsonResponse({ error: "Gecersiz istek." }, 400);
    }

    const body = payload as Record<string, unknown>;
    const gameId = sanitizeGameId(body.gameId, DEFAULT_MEMBER_GAME_ID);
    const identifier = typeof body.identifier === "string"
      ? body.identifier
      : (typeof body.email === "string" ? body.email : "");
    const password = sanitizeMemberPassword(body.password);
    if (!identifier || !password) {
      return jsonResponse({ error: "Kullanici adi/e-posta veya sifre yanlis." }, 401);
    }

    const user = await this.findByIdentifier(identifier);
    if (!user || user.password !== password) {
      return jsonResponse({ error: "Kullanici adi/e-posta veya sifre yanlis." }, 401);
    }
    if (sanitizeBoolean(user.isBlocked, false)) {
      return jsonResponse({ error: "Hesabiniz admin tarafindan engellenmis." }, 403);
    }

    const normalized = await this.ensureBootstrapAdmin(user);
    const sessionKey = createMemberSessionKey();
    const updated: StoredMemberUser = {
      ...normalized,
      activeSessionKey: sessionKey,
      activeSessionAt: Date.now(),
    };
    await this.putUser(updated, normalized);
    return jsonResponse({ ok: true, user: toPublicUser(updated, gameId), sessionKey }, 200);
  }

  private async handleForgotPassword(request: Request): Promise<Response> {
    const payload = await parseJsonBody(request);
    if (!payload || typeof payload !== "object") {
      return jsonResponse({ error: "Gecersiz istek." }, 400);
    }

    const body = payload as Record<string, unknown>;
    const email = sanitizeMemberEmail(body.email);
    const newPassword = sanitizeMemberPassword(body.newPassword);
    if (!email.includes("@")) {
      return jsonResponse({ error: "Gecerli e-posta girin." }, 400);
    }
    if (newPassword.length < 4) {
      return jsonResponse({ error: "Yeni sifre en az 4 karakter olmali." }, 400);
    }

    const user = await this.getByEmail(email);
    if (!user) {
      return jsonResponse({ error: "Bu e-posta ile kayitli kullanici bulunamadi." }, 404);
    }

    const updated: StoredMemberUser = {
      ...user,
      password: newPassword,
      activeSessionKey: "",
      activeSessionAt: 0,
    };
    await this.putUser(updated, user);
    return jsonResponse({ ok: true, message: "Sifre sifirlandi." }, 200);
  }

  private async handleChangePassword(request: Request): Promise<Response> {
    const payload = await parseJsonBody(request);
    if (!payload || typeof payload !== "object") {
      return jsonResponse({ error: "Gecersiz istek." }, 400);
    }

    const body = payload as Record<string, unknown>;
    const userId = sanitizeMemberId(body.userId);
    const sessionKey = sanitizeMemberSessionKey(body.sessionKey);
    const gameId = sanitizeGameId(body.gameId, DEFAULT_MEMBER_GAME_ID);
    const currentPassword = sanitizeMemberPassword(body.currentPassword);
    const newPassword = sanitizeMemberPassword(body.newPassword);
    if (!userId || !sessionKey || !currentPassword || !newPassword) {
      return jsonResponse({ error: "Kullanici veya sifre bilgisi eksik." }, 400);
    }
    if (newPassword.length < 4) {
      return jsonResponse({ error: "Yeni sifre en az 4 karakter olmali." }, 400);
    }

    const user = await this.requireActiveSession(userId, sessionKey);
    if (!user) {
      return jsonResponse({ error: "Oturum gecersiz. Lutfen tekrar giris yapin." }, 401);
    }
    if (user.password !== currentPassword) {
      return jsonResponse({ error: "Mevcut sifre hatali." }, 401);
    }

    const updated: StoredMemberUser = {
      ...user,
      password: newPassword,
    };
    await this.putUser(updated, user);
    return jsonResponse({ ok: true, user: toPublicUser(updated, gameId) }, 200);
  }

  private async handleRules(): Promise<Response> {
    const rules = await this.getRules();
    return jsonResponse({ ok: true, rules }, 200);
  }

  private async handleLobbies(): Promise<Response> {
    const lobbies = await this.getLobbies();
    return jsonResponse({ ok: true, lobbies }, 200);
  }

  private async handleDesign(): Promise<Response> {
    const settings = await this.getDesignSettings();
    return jsonResponse({
      ok: true,
      design: settings.published,
    }, 200);
  }

  private async requireSession(url: URL): Promise<StoredMemberUser | null> {
    const userId = sanitizeMemberId(url.searchParams.get("userId"));
    const sessionKey = sanitizeMemberSessionKey(url.searchParams.get("sessionKey"));
    if (!userId || !sessionKey) return null;
    return this.requireActiveSession(userId, sessionKey);
  }

  private async handleDesignTavla(_url: URL): Promise<Response> {
    try {
      const raw = await this.ctx.storage.get<string>("design:tavla:global");
      const settings = raw ? JSON.parse(raw) : null;
      return jsonResponse({ ok: true, settings }, 200);
    } catch (e) {
      return jsonResponse({ ok: true, settings: null }, 200);
    }
  }

  private async handleDesignTavlaUpdate(request: Request): Promise<Response> {
    const payload = await parseJsonBody(request);
    if (!payload || typeof payload !== "object") return jsonResponse({ error: "Gecersiz istek." }, 400);
    const body = payload as Record<string, unknown>;
    const userId = sanitizeMemberId(body.userId);
    const sessionKey = sanitizeMemberSessionKey(body.sessionKey);
    if (!userId || !sessionKey) return jsonResponse({ error: "Gecersiz oturum." }, 401);
    const user = await this.requireActiveSession(userId, sessionKey);
    if (!user) return jsonResponse({ error: "Oturum gecersiz." }, 401);
    if (user.role !== "admin" && user.role !== "superadmin") {
      return jsonResponse({ error: "Bu islem icin admin yetkisi gerekli." }, 403);
    }
    const settings = typeof body.settings === "object" && body.settings !== null ? body.settings : null;
    if (!settings) return jsonResponse({ error: "Gecersiz ayarlar." }, 400);
    await this.ctx.storage.put("design:tavla:global", JSON.stringify(settings));
    return jsonResponse({ ok: true }, 200);
  }

  private async handleMe(url: URL): Promise<Response> {
    const userId = sanitizeMemberId(url.searchParams.get("userId"));
    const sessionKey = sanitizeMemberSessionKey(url.searchParams.get("sessionKey"));
    const gameId = sanitizeGameId(url.searchParams.get("gameId"), DEFAULT_MEMBER_GAME_ID);
    if (!userId || !sessionKey) {
      return jsonResponse({ error: "Gecersiz oturum." }, 400);
    }

    const user = await this.requireActiveSession(userId, sessionKey);
    if (!user) {
      return jsonResponse({ error: "Oturum baska bir cihazda acildi. Lutfen tekrar giris yapin." }, 401);
    }

    const normalized = await this.ensureBootstrapAdmin(user);
    return jsonResponse({ ok: true, user: toPublicUser(normalized, gameId) }, 200);
  }

  private async handleProfile(url: URL): Promise<Response> {
    const userId = sanitizeMemberId(url.searchParams.get("userId"));
    const gameId = sanitizeGameId(url.searchParams.get("gameId"), DEFAULT_MEMBER_GAME_ID);
    if (!userId) {
      return jsonResponse({ error: "Gecersiz kullanici." }, 400);
    }

    const user = await this.getById(userId);
    if (!user) {
      return jsonResponse({ error: "Kullanici bulunamadi." }, 404);
    }

    const normalized = await this.ensureBootstrapAdmin(user);
    return jsonResponse({ ok: true, user: toPublicUser(normalized, gameId) }, 200);
  }

  private async handleProfileUpdate(request: Request): Promise<Response> {
    const payload = await parseJsonBody(request);
    if (!payload || typeof payload !== "object") {
      return jsonResponse({ error: "Gecersiz istek." }, 400);
    }
    const body = payload as Record<string, unknown>;
    const userId = sanitizeMemberId(body.userId);
    const sessionKey = sanitizeMemberSessionKey(body.sessionKey);
    const gameId = sanitizeGameId(body.gameId, DEFAULT_MEMBER_GAME_ID);
    if (!userId || !sessionKey) {
      return jsonResponse({ error: "Gecersiz kullanici." }, 400);
    }

    const user = await this.requireActiveSession(userId, sessionKey);
    if (!user) {
      return jsonResponse({ error: "Oturum gecersiz. Lutfen tekrar giris yapin." }, 401);
    }

    const nextGender = sanitizeMemberGender(body.gender ?? user.gender);
    const nextAvatarId = sanitizeAvatarId(body.avatarId, nextGender);
    const nextDisplayName = sanitizeMemberDisplayName(body.displayName ?? user.displayName) || user.displayName;

    const updated: StoredMemberUser = {
      ...user,
      displayName: nextDisplayName,
      gender: nextGender,
      avatarId: nextAvatarId,
    };
    await this.putUser(updated, user);
    const normalized = await this.ensureBootstrapAdmin(updated);
    return jsonResponse({ ok: true, user: toPublicUser(normalized, gameId) }, 200);
  }

  private async handleMatch(request: Request): Promise<Response> {
    const payload = await parseJsonBody(request);
    if (!payload || typeof payload !== "object") {
      return jsonResponse({ error: "Gecersiz istek." }, 400);
    }

    const body = payload as Record<string, unknown>;
    const userId = sanitizeMemberId(body.userId);
    const outcome = sanitizeMatchOutcome(body.outcome);
    const matchToken = sanitizeMatchToken(body.matchToken);
    const gameId = sanitizeGameId(body.gameId, DEFAULT_MEMBER_GAME_ID);
    if (!userId || !outcome) {
      return jsonResponse({ error: "Kullanici veya sonuc gecersiz." }, 400);
    }

    const user = await this.getById(userId);
    if (!user) {
      return jsonResponse({ error: "Kullanici bulunamadi." }, 404);
    }

    const dedupeKey = matchToken ? `match:${gameId}:${userId}:${matchToken}` : "";
    if (dedupeKey) {
      if (this.transientMatchDedupe.has(dedupeKey)) {
        return jsonResponse({
          ok: true,
          user: toPublicUser(user, gameId),
          applied: {
            outcome,
            pointsDelta: 0,
            duplicate: true,
            matchToken,
          },
        }, 200);
      }
      const alreadyProcessed = await this.ctx.storage.get<boolean>(dedupeKey);
      if (alreadyProcessed) {
        return jsonResponse({
          ok: true,
          user: toPublicUser(user, gameId),
          applied: {
            outcome,
            pointsDelta: 0,
            duplicate: true,
            matchToken,
          },
        }, 200);
      }
    }

    const userWithProfiles = withNormalizedGameProfiles(user);
    const gameProfile = normalizeMemberGameProfile(
      userWithProfiles.gameProfiles[gameId],
      createDefaultMemberGameProfile(),
    );
    const stats = normalizeMemberStats(gameProfile.stats);
    const rules = await this.getRules();
    const pointsDelta = outcome === "win"
      ? rules.winPoints
      : outcome === "resign"
        ? -rules.resignPenaltyPoints
        : rules.lossPoints;

    stats.gamesPlayed += 1;
    if (outcome === "win") {
      stats.wins += 1;
    } else if (outcome === "loss") {
      stats.losses += 1;
    } else {
      stats.losses += 1;
      stats.resigns += 1;
    }

    const nextGameProfiles = {
      ...userWithProfiles.gameProfiles,
      [gameId]: {
        points: Math.max(0, gameProfile.points + pointsDelta),
        stats,
      },
    } satisfies MemberGameProfiles;
    const updated: StoredMemberUser = {
      ...userWithProfiles,
      gameProfiles: nextGameProfiles,
    };

    await this.putUser(updated, user);
    if (dedupeKey) {
      this.transientMatchDedupe.add(dedupeKey);
      try {
        await this.ctx.storage.put(dedupeKey, true);
      } catch (error) {
        if (!isDoFreeTierWriteLimitError(error)) throw error;
      }
    }
    return jsonResponse({
      ok: true,
      user: toPublicUser(updated, gameId),
      applied: {
        outcome,
        pointsDelta,
        duplicate: false,
        matchToken: matchToken || undefined,
      },
    }, 200);
  }

  private async handleAdminState(url: URL): Promise<Response> {
    const gameId = sanitizeGameId(url.searchParams.get("gameId"), DEFAULT_MEMBER_GAME_ID);
    const admin = await this.requireAdmin(url.searchParams.get("userId"));
    if (!admin) {
      return jsonResponse({ error: "Admin yetkisi gerekli." }, 403);
    }

    const users = (await this.listUsers()).map((user) => toPublicUser(user, gameId));
    const rules = await this.getRules();
    const lobbies = await this.getLobbies();
    const design = await this.getDesignSettings();
    return jsonResponse({
      ok: true,
      admin: toPublicUser(admin, gameId),
      users,
      rules,
      lobbies,
      design: design.published,
      designHistory: design.history,
    }, 200);
  }

  private async handleAdminUser(request: Request): Promise<Response> {
    const payload = await parseJsonBody(request);
    if (!payload || typeof payload !== "object") {
      return jsonResponse({ error: "Gecersiz istek." }, 400);
    }

    const body = payload as Record<string, unknown>;
    const gameId = sanitizeGameId(body.gameId, DEFAULT_MEMBER_GAME_ID);
    const admin = await this.requireAdmin(body.adminUserId);
    if (!admin) {
      return jsonResponse({ error: "Admin yetkisi gerekli." }, 403);
    }

    const targetUserId = sanitizeMemberId(body.targetUserId);
    if (!targetUserId) {
      return jsonResponse({ error: "Hedef kullanici gecersiz." }, 400);
    }

    const target = await this.getById(targetUserId);
    if (!target) {
      return jsonResponse({ error: "Hedef kullanici bulunamadi." }, 404);
    }

    const action = typeof body.action === "string" ? body.action : "";

    if (action === "deleteUser") {
      if (target.id === admin.id) {
        return jsonResponse({ error: "Kendi hesabinizi silemezsiniz." }, 400);
      }
      if (isPrimaryAdminEmail(target.email)) {
        return jsonResponse({ error: "Ana admin hesabi silinemez." }, 400);
      }
      if (target.role === "admin" && (await this.countAdmins()) <= 1) {
        return jsonResponse({ error: "Son admin silinemez." }, 400);
      }
      await this.deleteUser(target);
      return jsonResponse({
        ok: true,
        deleted: true,
        targetUserId: target.id,
      }, 200);
    }

    if (action === "setRole") {
      const nextRole = sanitizeMemberRole(body.role);
      if (isPrimaryAdminEmail(target.email) && nextRole !== "admin" && nextRole !== "superadmin") {
        return jsonResponse({ error: "Ana admin hesabi daima admin/superadmin kalmalidir." }, 400);
      }
      if (target.role === "admin" && nextRole === "user" && (await this.countAdmins()) <= 1) {
        return jsonResponse({ error: "Sistemde en az bir admin kalmali." }, 400);
      }
      const updated: StoredMemberUser = {
        ...target,
        role: nextRole,
      };
      await this.putUser(updated, target);
      return jsonResponse({ ok: true, user: toPublicUser(updated, gameId) }, 200);
    }

    if (action === "setPoints") {
      const targetWithProfiles = withNormalizedGameProfiles(target);
      const nextPoints = Math.max(0, sanitizeFinitePoints(body.points, targetWithProfiles.gameProfiles[gameId].points));
      const nextGameProfiles = {
        ...targetWithProfiles.gameProfiles,
        [gameId]: {
          points: nextPoints,
          stats: normalizeMemberStats(targetWithProfiles.gameProfiles[gameId].stats),
        },
      } satisfies MemberGameProfiles;
      const updated: StoredMemberUser = {
        ...targetWithProfiles,
        gameProfiles: nextGameProfiles,
      };
      await this.putUser(updated, target);
      return jsonResponse({ ok: true, user: toPublicUser(updated, gameId) }, 200);
    }

    if (action === "addPoints") {
      const targetWithProfiles = withNormalizedGameProfiles(target);
      const delta = sanitizeRuleNumber(body.delta, 0, -10_000, 10_000);
      const currentPoints = targetWithProfiles.gameProfiles[gameId].points;
      const nextGameProfiles = {
        ...targetWithProfiles.gameProfiles,
        [gameId]: {
          points: Math.max(0, currentPoints + delta),
          stats: normalizeMemberStats(targetWithProfiles.gameProfiles[gameId].stats),
        },
      } satisfies MemberGameProfiles;
      const updated: StoredMemberUser = {
        ...targetWithProfiles,
        gameProfiles: nextGameProfiles,
      };
      await this.putUser(updated, target);
      return jsonResponse({ ok: true, user: toPublicUser(updated, gameId) }, 200);
    }

    if (action === "resetStats") {
      const targetWithProfiles = withNormalizedGameProfiles(target);
      const nextGameProfiles = {
        ...targetWithProfiles.gameProfiles,
        [gameId]: {
          points: targetWithProfiles.gameProfiles[gameId].points,
          stats: createDefaultMemberStats(),
        },
      } satisfies MemberGameProfiles;
      const updated: StoredMemberUser = {
        ...targetWithProfiles,
        gameProfiles: nextGameProfiles,
      };
      await this.putUser(updated, target);
      return jsonResponse({ ok: true, user: toPublicUser(updated, gameId) }, 200);
    }

    if (action === "setBlocked") {
      const blocked = sanitizeBoolean(body.blocked, target.isBlocked);
      const updated: StoredMemberUser = {
        ...target,
        isBlocked: blocked,
      };
      await this.putUser(updated, target);
      return jsonResponse({ ok: true, user: toPublicUser(updated, gameId) }, 200);
    }

    if (action === "setPermission") {
      const permission = sanitizeMemberPermissionKey(body.permission);
      if (!permission) {
        return jsonResponse({ error: "Gecersiz yetki anahtari." }, 400);
      }
      const value = sanitizeBoolean(body.value, true);
      const nextPermissions = {
        ...normalizeMemberPermissions(target.permissions),
        [permission]: value,
      } satisfies MemberPermissions;
      const updated: StoredMemberUser = {
        ...target,
        permissions: nextPermissions,
      };
      await this.putUser(updated, target);
      return jsonResponse({ ok: true, user: toPublicUser(updated, gameId) }, 200);
    }

    return jsonResponse({ error: "Bilinmeyen admin islemi." }, 400);
  }

  private async handleAdminRules(request: Request): Promise<Response> {
    const payload = await parseJsonBody(request);
    if (!payload || typeof payload !== "object") {
      return jsonResponse({ error: "Gecersiz istek." }, 400);
    }

    const body = payload as Record<string, unknown>;
    const admin = await this.requireAdmin(body.adminUserId);
    if (!admin) {
      return jsonResponse({ error: "Admin yetkisi gerekli." }, 403);
    }

    const current = await this.getRules();
    const rawRules = body.rules && typeof body.rules === "object"
      ? body.rules
      : body;
    const next = normalizeGameRules(rawRules, current);
    next.updatedAt = Date.now();
    const saved = await this.putRules(next);
    return jsonResponse({
      ok: true,
      admin: toPublicUser(admin),
      rules: saved,
    }, 200);
  }

  private async handleAdminLobbies(request: Request): Promise<Response> {
    const payload = await parseJsonBody(request);
    if (!payload || typeof payload !== "object") {
      return jsonResponse({ error: "Gecersiz istek." }, 400);
    }
    const body = payload as Record<string, unknown>;
    const admin = await this.requireAdmin(body.adminUserId);
    if (!admin) {
      return jsonResponse({ error: "Admin yetkisi gerekli." }, 403);
    }

    const action = typeof body.action === "string" ? body.action : "";
    const current = await this.getLobbies();

    if (action === "createLobby") {
      const name = sanitizeLobbyName(body.name);
      if (!name || name.length < 2) {
        return jsonResponse({ error: "Lobi adi en az 2 karakter olmali." }, 400);
      }
      const id = createLobbyId();
      if (current.some((room) => room.id === id)) {
        return jsonResponse({ error: "Lobi olusturulurken id cakismasi olustu. Tekrar deneyin." }, 409);
      }
      const now = Date.now();
      const next = await this.putLobbies([
        ...current,
        {
          id,
          name,
          createdAt: now,
          updatedAt: now,
          createdByUserId: admin.id,
        },
      ]);
      return jsonResponse({ ok: true, lobbies: next }, 200);
    }

    if (action === "renameLobby") {
      const lobbyId = sanitizeLobbyId(body.lobbyId);
      const name = sanitizeLobbyName(body.name);
      if (!lobbyId || !name || name.length < 2) {
        return jsonResponse({ error: "Lobi veya ad bilgisi gecersiz." }, 400);
      }
      const index = current.findIndex((room) => room.id === lobbyId);
      if (index < 0) {
        return jsonResponse({ error: "Lobi bulunamadi." }, 404);
      }
      const now = Date.now();
      const nextRows = [...current];
      nextRows[index] = {
        ...nextRows[index],
        name,
        updatedAt: now,
      };
      const next = await this.putLobbies(nextRows);
      return jsonResponse({ ok: true, lobbies: next }, 200);
    }

    if (action === "deleteLobby") {
      const lobbyId = sanitizeLobbyId(body.lobbyId);
      if (!lobbyId) {
        return jsonResponse({ error: "Lobi bilgisi gecersiz." }, 400);
      }
      if (current.length <= 1) {
        return jsonResponse({ error: "En az bir lobi kalmali." }, 400);
      }
      const nextRows = current.filter((room) => room.id !== lobbyId);
      if (nextRows.length === current.length) {
        return jsonResponse({ error: "Lobi bulunamadi." }, 404);
      }
      const next = await this.putLobbies(nextRows);
      return jsonResponse({ ok: true, lobbies: next }, 200);
    }

    if (action === "replaceLobbies") {
      const rows = Array.isArray(body.lobbies) ? body.lobbies : null;
      if (!rows) return jsonResponse({ error: "Lobi listesi gecersiz." }, 400);
      const normalized = normalizeLobbyRooms(rows);
      if (normalized.length === 0) {
        return jsonResponse({ error: "En az bir lobi olmali." }, 400);
      }
      const saved = await this.putLobbies(normalized);
      return jsonResponse({ ok: true, lobbies: saved }, 200);
    }

    return jsonResponse({ error: "Bilinmeyen admin lobi islemi." }, 400);
  }

  private async handleAdminDesign(url: URL): Promise<Response> {
    const admin = await this.requireAdmin(url.searchParams.get("userId"));
    if (!admin) {
      return jsonResponse({ error: "Admin yetkisi gerekli." }, 403);
    }
    const settings = await this.getDesignSettings();
    return jsonResponse({
      ok: true,
      admin: toPublicUser(admin),
      design: settings.published,
      history: settings.history,
    }, 200);
  }

  private async handleAdminDesignUpdate(request: Request): Promise<Response> {
    const payload = await parseJsonBody(request);
    if (!payload || typeof payload !== "object") {
      return jsonResponse({ error: "Gecersiz istek." }, 400);
    }
    const body = payload as Record<string, unknown>;
    const admin = await this.requireAdmin(body.adminUserId);
    if (!admin) {
      return jsonResponse({ error: "Admin yetkisi gerekli." }, 403);
    }
    const action = typeof body.action === "string" ? body.action : "";
    const current = await this.getDesignSettings();

    if (action === "publish") {
      const draft = normalizeDesignConfig(body.design, current.published);
      const nextVersion = current.published.version + 1;
      const now = Date.now();
      const published: DesignConfig = {
        ...draft,
        version: nextVersion,
        updatedAt: now,
      };
      const history = [
        current.published,
        ...current.history.filter((row) => row.version !== current.published.version),
      ].slice(0, DESIGN_HISTORY_LIMIT);
      const next = await this.putDesignSettings({
        published,
        history,
        updatedAt: now,
      });
      return jsonResponse({
        ok: true,
        admin: toPublicUser(admin),
        design: next.published,
        history: next.history,
      }, 200);
    }

    if (action === "rollback") {
      const targetVersion = sanitizeRuleNumber(body.version, 0, 0, 999_999);
      if (targetVersion <= 0) {
        return jsonResponse({ error: "Geri alinacak surum gecersiz." }, 400);
      }
      const source = [current.published, ...current.history].find((row) => row.version === targetVersion);
      if (!source) {
        return jsonResponse({ error: "Secilen surum bulunamadi." }, 404);
      }
      const now = Date.now();
      const published: DesignConfig = {
        ...source,
        version: current.published.version + 1,
        updatedAt: now,
      };
      const history = [
        current.published,
        ...current.history.filter((row) => row.version !== current.published.version && row.version !== source.version),
      ].slice(0, DESIGN_HISTORY_LIMIT);
      const next = await this.putDesignSettings({
        published,
        history,
        updatedAt: now,
      });
      return jsonResponse({
        ok: true,
        admin: toPublicUser(admin),
        design: next.published,
        history: next.history,
      }, 200);
    }

    if (action === "resetDefault") {
      const now = Date.now();
      const published: DesignConfig = {
        ...createDefaultDesignConfig(),
        version: current.published.version + 1,
        updatedAt: now,
      };
      const history = [
        current.published,
        ...current.history.filter((row) => row.version !== current.published.version),
      ].slice(0, DESIGN_HISTORY_LIMIT);
      const next = await this.putDesignSettings({
        published,
        history,
        updatedAt: now,
      });
      return jsonResponse({
        ok: true,
        admin: toPublicUser(admin),
        design: next.published,
        history: next.history,
      }, 200);
    }

    return jsonResponse({ error: "Bilinmeyen tasarim islemi." }, 400);
  }
}
