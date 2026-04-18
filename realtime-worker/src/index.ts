export interface Env {
  ROOMS: DurableObjectNamespace;
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response("ok", { status: 200 });
    }

    if (url.pathname !== "/realtime") {
      return new Response("Realtime worker is running.", { status: 200 });
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected websocket upgrade", { status: 426 });
    }

    const channel = sanitizeChannel(url.searchParams.get("channel"));
    if (!channel) {
      return new Response("Missing or invalid channel", { status: 400 });
    }

    const id = env.ROOMS.idFromName(channel);
    const room = env.ROOMS.get(id);
    return room.fetch(request);
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
    const payload = JSON.stringify(snapshot);
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(payload);
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
