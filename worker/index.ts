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

type MatchOutcome = "win" | "loss" | "resign";
type MemberRole = "user" | "admin";

type GameRules = {
  winPoints: number;
  lossPoints: number;
  resignPenaltyPoints: number;
  updatedAt: number;
};

type PublicMemberUser = {
  id: string;
  displayName: string;
  email: string;
  points: number;
  createdAt: number;
  stats: MemberStats;
  role: MemberRole;
};

type StoredMemberUser = PublicMemberUser & {
  password: string;
};

const AUTH_DO_NAME = "members-v1";
const AUTH_RULES_KEY = "settings:rules";
const DEFAULT_WIN_POINTS = 100;
const DEFAULT_LOSS_POINTS = 0;
const DEFAULT_RESIGN_PENALTY_POINTS = 50;
const PRIMARY_ADMIN_EMAIL = "gokcek@outlook.com";

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

function sanitizeMemberDisplayName(raw: unknown) {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, 24);
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

function sanitizeMemberRole(raw: unknown): MemberRole {
  if (raw === "admin") return "admin";
  return "user";
}

function normalizeDisplayLookupKey(raw: unknown) {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 24);
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

function createMemberId() {
  return sanitizeMemberId(`m${Date.now().toString(36)}${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`);
}

function toPublicUser(user: StoredMemberUser): PublicMemberUser {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    points: user.points,
    createdAt: user.createdAt,
    stats: normalizeMemberStats(user.stats),
    role: sanitizeMemberRole(user.role),
  };
}

function normalizeStoredMemberUser(raw: unknown): StoredMemberUser | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<StoredMemberUser>;
  const id = sanitizeMemberId(candidate.id);
  const email = sanitizeMemberEmail(candidate.email);
  const password = sanitizeMemberPassword(candidate.password);
  if (!id || !email || !password) return null;
  return {
    id,
    displayName: sanitizeMemberDisplayName(candidate.displayName) || "Uye",
    email,
    password,
    points: Math.max(0, sanitizeFinitePoints(candidate.points, 1500)),
    createdAt: Number.isFinite(candidate.createdAt) ? Number(candidate.createdAt) : Date.now(),
    stats: normalizeMemberStats(candidate.stats),
    role: sanitizeMemberRole(candidate.role),
  };
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
  if (primary.status !== 404) return primary;
  if (request.method !== "GET") return primary;
  const accept = request.headers.get("accept") || "";
  if (!accept.includes("text/html")) return primary;

  const url = new URL(request.url);
  url.pathname = "/index.html";
  return env.ASSETS.fetch(new Request(url.toString(), request));
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
        return auth.fetch(request);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Bilinmeyen hata";
        return jsonResponse({
          error: `Kimlik servisi gecici hata verdi: ${message}`,
        }, 500);
      }
    }

    if (url.pathname === "/realtime") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected websocket upgrade", { status: 426 });
      }
      const channel = sanitizeChannel(url.searchParams.get("channel"));
      if (!channel) {
        return new Response("Missing or invalid channel", { status: 400 });
      }
      const roomId = env.ROOMS.idFromName(channel);
      const room = env.ROOMS.get(roomId);
      return room.fetch(request);
    }

    return serveAssetWithSpaFallback(request, env);
  },
};

export class RealtimeRoom {
  private readonly snapshotKey = "snapshot";
  private readonly ctx: DurableObjectState;

  constructor(ctx: DurableObjectState, _env: Env) {
    this.ctx = ctx;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected websocket upgrade", { status: 426 });
    }
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketOpen(ws: WebSocket): Promise<void> {
    const latest = await this.ctx.storage.get<RealtimeMessage>(this.snapshotKey);
    if (!latest) return;
    try {
      ws.send(JSON.stringify(latest));
    } catch {
      // no-op
    }
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const text = typeof message === "string" ? message : new TextDecoder().decode(message);
    const incoming = parseRealtimeMessage(text);
    if (!incoming) return;

    if (incoming.kind === "hello") {
      const latest = await this.ctx.storage.get<RealtimeMessage>(this.snapshotKey);
      if (!latest) return;
      try {
        ws.send(JSON.stringify(latest));
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

    await this.ctx.storage.put(this.snapshotKey, snapshot);
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

  constructor(ctx: DurableObjectState, _env: Env) {
    this.ctx = ctx;
  }

  private keyByEmail(email: string) {
    return `email:${email}`;
  }

  private keyByDisplayName(displayName: string) {
    const key = normalizeDisplayLookupKey(displayName);
    if (!key) return "";
    return `name:${key}`;
  }

  private keyById(id: string) {
    return `id:${id}`;
  }

  private keyRules() {
    return AUTH_RULES_KEY;
  }

  private async getByEmail(email: string): Promise<StoredMemberUser | null> {
    const raw = await this.ctx.storage.get<unknown>(this.keyByEmail(email));
    return normalizeStoredMemberUser(raw);
  }

  private async getByDisplayName(displayName: string): Promise<StoredMemberUser | null> {
    const key = this.keyByDisplayName(displayName);
    if (!key) return null;
    const raw = await this.ctx.storage.get<unknown>(key);
    return normalizeStoredMemberUser(raw);
  }

  private async getById(id: string): Promise<StoredMemberUser | null> {
    const raw = await this.ctx.storage.get<unknown>(this.keyById(id));
    return normalizeStoredMemberUser(raw);
  }

  private async findDisplayNameFallback(displayName: string): Promise<StoredMemberUser | null> {
    const lookupKey = normalizeDisplayLookupKey(displayName);
    if (!lookupKey) return null;
    const rows = await this.ctx.storage.list<unknown>({ prefix: "id:" });
    for (const raw of rows.values()) {
      const user = normalizeStoredMemberUser(raw);
      if (!user) continue;
      if (normalizeDisplayLookupKey(user.displayName) === lookupKey) {
        return user;
      }
    }
    return null;
  }

  private async findByIdentifier(identifierRaw: unknown): Promise<StoredMemberUser | null> {
    const identifier = typeof identifierRaw === "string" ? identifierRaw.trim() : "";
    if (!identifier) return null;
    if (identifier.includes("@")) {
      const email = sanitizeMemberEmail(identifier);
      if (!email) return null;
      return this.getByEmail(email);
    }

    const displayName = sanitizeMemberDisplayName(identifier);
    if (!displayName) return null;

    const indexed = await this.getByDisplayName(displayName);
    if (indexed) return indexed;

    const fallback = await this.findDisplayNameFallback(displayName);
    if (!fallback) return null;
    await this.putUser(fallback);
    return fallback;
  }

  private async listUsers(): Promise<StoredMemberUser[]> {
    const users: StoredMemberUser[] = [];
    const rows = await this.ctx.storage.list<unknown>({ prefix: "id:" });
    for (const raw of rows.values()) {
      const user = normalizeStoredMemberUser(raw);
      if (!user) continue;
      users.push(user);
    }
    users.sort((a, b) => a.displayName.localeCompare(b.displayName, "tr"));
    return users;
  }

  private async countAdmins(): Promise<number> {
    const users = await this.listUsers();
    return users.filter((user) => user.role === "admin").length;
  }

  private async getRules(): Promise<GameRules> {
    const raw = await this.ctx.storage.get<unknown>(this.keyRules());
    return normalizeGameRules(raw);
  }

  private async putRules(rules: GameRules): Promise<GameRules> {
    const normalized = normalizeGameRules(rules, rules);
    await this.ctx.storage.put(this.keyRules(), normalized);
    return normalized;
  }

  private async ensureBootstrapAdmin(user: StoredMemberUser): Promise<StoredMemberUser> {
    if (user.role === "admin") return user;
    if (isPrimaryAdminEmail(user.email)) {
      const promoted: StoredMemberUser = {
        ...user,
        role: "admin",
      };
      await this.putUser(promoted, user);
      return promoted;
    }
    const adminCount = await this.countAdmins();
    if (adminCount > 0) return user;
    const promoted: StoredMemberUser = {
      ...user,
      role: "admin",
    };
    await this.putUser(promoted, user);
    return promoted;
  }

  private async putUser(user: StoredMemberUser, previous?: StoredMemberUser | null) {
    const normalized: StoredMemberUser = {
      ...user,
      role: sanitizeMemberRole(user.role),
    };

    if (previous) {
      if (previous.email !== normalized.email) {
        await this.ctx.storage.delete(this.keyByEmail(previous.email));
      }
      const previousNameKey = this.keyByDisplayName(previous.displayName);
      const nextNameKey = this.keyByDisplayName(normalized.displayName);
      if (previousNameKey && previousNameKey !== nextNameKey) {
        await this.ctx.storage.delete(previousNameKey);
      }
    }

    await this.ctx.storage.put(this.keyByEmail(normalized.email), normalized);
    await this.ctx.storage.put(this.keyById(normalized.id), normalized);
    const nameKey = this.keyByDisplayName(normalized.displayName);
    if (nameKey) {
      await this.ctx.storage.put(nameKey, normalized);
    }
  }

  private async deleteUser(user: StoredMemberUser) {
    await this.ctx.storage.delete(this.keyById(user.id));
    await this.ctx.storage.delete(this.keyByEmail(user.email));
    const nameKey = this.keyByDisplayName(user.displayName);
    if (nameKey) {
      await this.ctx.storage.delete(nameKey);
    }
  }

  private async requireAdmin(userIdRaw: unknown): Promise<StoredMemberUser | null> {
    const userId = sanitizeMemberId(userIdRaw);
    if (!userId) return null;
    const user = await this.getById(userId);
    if (!user) return null;
    const normalized = await this.ensureBootstrapAdmin(user);
    if (normalized.role !== "admin") return null;
    return normalized;
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
    if (request.method === "GET" && pathname === "/api/auth/rules") {
      return this.handleRules();
    }
    if (request.method === "GET" && pathname === "/api/auth/me") {
      return this.handleMe(url);
    }
    if (request.method === "GET" && pathname === "/api/auth/profile") {
      return this.handleProfile(url);
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

    return jsonResponse({ error: "Bulunamadi." }, 404);
  }

  private async handleRegister(request: Request): Promise<Response> {
    const payload = await parseJsonBody(request);
    if (!payload || typeof payload !== "object") {
      return jsonResponse({ error: "Gecersiz istek." }, 400);
    }

    const body = payload as Record<string, unknown>;
    const displayName = sanitizeMemberDisplayName(body.displayName);
    const email = sanitizeMemberEmail(body.email);
    const password = sanitizeMemberPassword(body.password);

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

    const existingName = (await this.getByDisplayName(displayName)) ?? (await this.findDisplayNameFallback(displayName));
    if (existingName) {
      return jsonResponse({ error: "Bu kullanici adi zaten alinmis." }, 409);
    }

    const role: MemberRole = isPrimaryAdminEmail(email) || (await this.countAdmins()) === 0 ? "admin" : "user";
    const user: StoredMemberUser = {
      id: createMemberId(),
      displayName,
      email,
      password,
      points: 1500,
      createdAt: Date.now(),
      stats: createDefaultMemberStats(),
      role,
    };

    await this.putUser(user);
    return jsonResponse({ ok: true, user: toPublicUser(user) }, 201);
  }

  private async handleLogin(request: Request): Promise<Response> {
    const payload = await parseJsonBody(request);
    if (!payload || typeof payload !== "object") {
      return jsonResponse({ error: "Gecersiz istek." }, 400);
    }

    const body = payload as Record<string, unknown>;
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

    const normalized = await this.ensureBootstrapAdmin(user);
    return jsonResponse({ ok: true, user: toPublicUser(normalized) }, 200);
  }

  private async handleRules(): Promise<Response> {
    const rules = await this.getRules();
    return jsonResponse({ ok: true, rules }, 200);
  }

  private async handleMe(url: URL): Promise<Response> {
    const userId = sanitizeMemberId(url.searchParams.get("userId"));
    if (!userId) {
      return jsonResponse({ error: "Gecersiz oturum." }, 400);
    }

    const user = await this.getById(userId);
    if (!user) {
      return jsonResponse({ error: "Oturum bulunamadi." }, 404);
    }

    const normalized = await this.ensureBootstrapAdmin(user);
    return jsonResponse({ ok: true, user: toPublicUser(normalized) }, 200);
  }

  private async handleProfile(url: URL): Promise<Response> {
    const userId = sanitizeMemberId(url.searchParams.get("userId"));
    if (!userId) {
      return jsonResponse({ error: "Gecersiz kullanici." }, 400);
    }

    const user = await this.getById(userId);
    if (!user) {
      return jsonResponse({ error: "Kullanici bulunamadi." }, 404);
    }

    const normalized = await this.ensureBootstrapAdmin(user);
    return jsonResponse({ ok: true, user: toPublicUser(normalized) }, 200);
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
    if (!userId || !outcome) {
      return jsonResponse({ error: "Kullanici veya sonuc gecersiz." }, 400);
    }

    const user = await this.getById(userId);
    if (!user) {
      return jsonResponse({ error: "Kullanici bulunamadi." }, 404);
    }

    const dedupeKey = matchToken ? `match:${userId}:${matchToken}` : "";
    if (dedupeKey) {
      const alreadyProcessed = await this.ctx.storage.get<boolean>(dedupeKey);
      if (alreadyProcessed) {
        return jsonResponse({
          ok: true,
          user: toPublicUser(user),
          applied: {
            outcome,
            pointsDelta: 0,
            duplicate: true,
            matchToken,
          },
        }, 200);
      }
    }

    const stats = normalizeMemberStats(user.stats);
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

    const updated: StoredMemberUser = {
      ...user,
      points: Math.max(0, user.points + pointsDelta),
      stats,
    };

    await this.putUser(updated, user);
    if (dedupeKey) {
      await this.ctx.storage.put(dedupeKey, true);
    }
    return jsonResponse({
      ok: true,
      user: toPublicUser(updated),
      applied: {
        outcome,
        pointsDelta,
        duplicate: false,
        matchToken: matchToken || undefined,
      },
    }, 200);
  }

  private async handleAdminState(url: URL): Promise<Response> {
    const admin = await this.requireAdmin(url.searchParams.get("userId"));
    if (!admin) {
      return jsonResponse({ error: "Admin yetkisi gerekli." }, 403);
    }

    const users = (await this.listUsers()).map((user) => toPublicUser(user));
    const rules = await this.getRules();
    return jsonResponse({
      ok: true,
      admin: toPublicUser(admin),
      users,
      rules,
    }, 200);
  }

  private async handleAdminUser(request: Request): Promise<Response> {
    const payload = await parseJsonBody(request);
    if (!payload || typeof payload !== "object") {
      return jsonResponse({ error: "Gecersiz istek." }, 400);
    }

    const body = payload as Record<string, unknown>;
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
      if (isPrimaryAdminEmail(target.email) && nextRole !== "admin") {
        return jsonResponse({ error: "Ana admin hesabi daima admin kalmalidir." }, 400);
      }
      if (target.role === "admin" && nextRole === "user" && (await this.countAdmins()) <= 1) {
        return jsonResponse({ error: "Sistemde en az bir admin kalmali." }, 400);
      }
      const updated: StoredMemberUser = {
        ...target,
        role: nextRole,
      };
      await this.putUser(updated, target);
      return jsonResponse({ ok: true, user: toPublicUser(updated) }, 200);
    }

    if (action === "setPoints") {
      const nextPoints = Math.max(0, sanitizeFinitePoints(body.points, target.points));
      const updated: StoredMemberUser = {
        ...target,
        points: nextPoints,
      };
      await this.putUser(updated, target);
      return jsonResponse({ ok: true, user: toPublicUser(updated) }, 200);
    }

    if (action === "addPoints") {
      const delta = sanitizeRuleNumber(body.delta, 0, -10_000, 10_000);
      const updated: StoredMemberUser = {
        ...target,
        points: Math.max(0, target.points + delta),
      };
      await this.putUser(updated, target);
      return jsonResponse({ ok: true, user: toPublicUser(updated) }, 200);
    }

    if (action === "resetStats") {
      const updated: StoredMemberUser = {
        ...target,
        stats: createDefaultMemberStats(),
      };
      await this.putUser(updated, target);
      return jsonResponse({ ok: true, user: toPublicUser(updated) }, 200);
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
}
