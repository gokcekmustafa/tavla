import { DurableObject } from "cloudflare:workers";

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

type PublicMemberUser = {
  id: string;
  displayName: string;
  email: string;
  points: number;
  createdAt: number;
  stats: MemberStats;
};

type StoredMemberUser = PublicMemberUser & {
  password: string;
};

const AUTH_DO_NAME = "members-v1";

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
      const authId = env.AUTH.idFromName(AUTH_DO_NAME);
      const auth = env.AUTH.get(authId);
      return auth.fetch(request);
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

export class RealtimeRoom extends DurableObject<Env> {
  private readonly snapshotKey = "snapshot";

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

export class AuthStore extends DurableObject<Env> {
  private keyByEmail(email: string) {
    return `email:${email}`;
  }

  private keyById(id: string) {
    return `id:${id}`;
  }

  private async getByEmail(email: string): Promise<StoredMemberUser | null> {
    const raw = await this.ctx.storage.get<unknown>(this.keyByEmail(email));
    return normalizeStoredMemberUser(raw);
  }

  private async getById(id: string): Promise<StoredMemberUser | null> {
    const raw = await this.ctx.storage.get<unknown>(this.keyById(id));
    return normalizeStoredMemberUser(raw);
  }

  private async putUser(user: StoredMemberUser) {
    await this.ctx.storage.put(this.keyByEmail(user.email), user);
    await this.ctx.storage.put(this.keyById(user.id), user);
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
    if (request.method === "GET" && pathname === "/api/auth/me") {
      return this.handleMe(url);
    }
    if (request.method === "GET" && pathname === "/api/auth/profile") {
      return this.handleProfile(url);
    }
    if (request.method === "POST" && pathname === "/api/auth/match") {
      return this.handleMatch(request);
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

    const user: StoredMemberUser = {
      id: createMemberId(),
      displayName,
      email,
      password,
      points: 1500,
      createdAt: Date.now(),
      stats: createDefaultMemberStats(),
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
    const email = sanitizeMemberEmail(body.email);
    const password = sanitizeMemberPassword(body.password);
    if (!email || !password) {
      return jsonResponse({ error: "E-posta veya sifre yanlis." }, 401);
    }

    const user = await this.getByEmail(email);
    if (!user || user.password !== password) {
      return jsonResponse({ error: "E-posta veya sifre yanlis." }, 401);
    }

    return jsonResponse({ ok: true, user: toPublicUser(user) }, 200);
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

    return jsonResponse({ ok: true, user: toPublicUser(user) }, 200);
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

    return jsonResponse({ ok: true, user: toPublicUser(user) }, 200);
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
    const fallbackDelta = outcome === "win" ? 100 : outcome === "resign" ? -50 : 0;
    const pointsDelta = sanitizeFinitePoints(body.pointsDelta, fallbackDelta);

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

    await this.putUser(updated);
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
}
