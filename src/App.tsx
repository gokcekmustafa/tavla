import { useEffect, useMemo, useState } from "react";
import { isNhostConfigured } from "./lib/nhost";
import "./App.css";

type GameMode = "local" | "bot";
type Seat = "white" | "black";

type RoomSession = {
  code: string;
  seat: Seat;
  sessionId: string;
};

const GUEST_STORAGE_KEY = "tavla.guestName";
const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function sanitizeRoomCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function sanitizeGuestName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 24);
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

function getInitialRoomSession(): RoomSession | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const room = sanitizeRoomCode(params.get("room") ?? "");
  const seatParam = params.get("seat");
  const seat: Seat | null = seatParam === "white" || seatParam === "black" ? seatParam : null;
  if (!room || !seat) return null;

  return {
    code: room,
    seat,
    sessionId: createSessionId(),
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

function App() {
  const [mode, setMode] = useState<GameMode>("local");
  const [iframeKey, setIframeKey] = useState(1);
  const [guestName, setGuestName] = useState(getInitialGuestName);
  const [roomSession, setRoomSession] = useState<RoomSession | null>(getInitialRoomSession);
  const [roomCodeInput, setRoomCodeInput] = useState(() => getInitialRoomSession()?.code ?? "");
  const [joinSeat, setJoinSeat] = useState<Seat>(() => getInitialRoomSession()?.seat ?? "black");
  const [copied, setCopied] = useState(false);

  const safeGuestName = useMemo(() => sanitizeGuestName(guestName) || "Misafir", [guestName]);
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
    }
    return `/legacy/index.html?${qp.toString()}`;
  }, [mode, iframeKey, roomSession, safeGuestName, isRoomMode]);

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
    } else {
      url.searchParams.delete("room");
      url.searchParams.delete("seat");
      url.searchParams.delete("name");
    }
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [roomSession, safeGuestName]);

  function refreshBoard() {
    setIframeKey((v) => v + 1);
  }

  function onCreateRoom() {
    const code = createRoomCode();
    setRoomCodeInput(code);
    setRoomSession({
      code,
      seat: "white",
      sessionId: createSessionId(),
    });
    setJoinSeat("black");
    setCopied(false);
    refreshBoard();
  }

  function onJoinRoom() {
    const code = sanitizeRoomCode(roomCodeInput);
    if (!code) return;
    setRoomCodeInput(code);
    setRoomSession({
      code,
      seat: joinSeat,
      sessionId: createSessionId(),
    });
    setCopied(false);
    refreshBoard();
  }

  function onLeaveRoom() {
    setRoomSession(null);
    setCopied(false);
    refreshBoard();
  }

  async function onCopyInvite() {
    if (!roomSession) return;
    const inviteSeat: Seat = roomSession.seat === "white" ? "black" : "white";
    const url = new URL(window.location.href);
    url.searchParams.set("room", roomSession.code);
    url.searchParams.set("seat", inviteSeat);
    url.searchParams.set("name", safeGuestName);
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1300);
  }

  return (
    <main className="t-root">
      <header className="t-header">
        <div className="t-brand">
          <span className="t-eyebrow">Canli Oyun Deneyimi</span>
          <h1 className="t-title">TAVLA</h1>
          <div className="t-pills">
            <span className="t-pill">Cloudflare Canli</span>
            <span className="t-pill">
              {isRoomMode ? "Oda Modu" : mode === "bot" ? "Bot Acik" : "2 Oyuncu Modu"}
            </span>
            <span className={`t-pill ${isNhostConfigured ? "ok" : "warn"}`}>
              {isNhostConfigured ? "Nhost Hazir" : "Nhost Bekliyor"}
            </span>
            {roomSession ? (
              <span className="t-pill ok">
                {`Oda ${roomSession.code} / ${roomSession.seat === "white" ? "Beyaz" : "Siyah"}`}
              </span>
            ) : null}
          </div>
        </div>
        <div className="t-header-actions">
          <button className="btn-secondary" onClick={refreshBoard}>
            Oyunu Sifirla
          </button>
          <a className="btn-link" href={iframeUrl} target="_blank" rel="noreferrer">
            Yeni Sekmede Ac
          </a>
        </div>
      </header>

      <div className="t-grid">
        <div className="t-card">
          <p className="t-label">Nhost Durumu</p>
          <p className={`t-value ${isNhostConfigured ? "ok" : "warn"}`}>
            {isNhostConfigured ? "Baglanti ayarlandi" : "Ayar bekleniyor"}
          </p>
          <p className="t-muted">
            <code>.env</code> icine <code>VITE_NHOST_SUBDOMAIN</code> ve <code>VITE_NHOST_REGION</code>{" "}
            eklendiginde uye girisi ve sohbet entegrasyonuna gececegiz.
          </p>
        </div>

        <div className="t-card">
          <p className="t-label">Oyun Modu</p>
          <div className="mode-toggle">
            <button
              className={`btn-mode ${mode === "local" ? "active" : ""}`}
              onClick={() => setMode("local")}
              disabled={isRoomMode}
            >
              Iki Oyuncu
            </button>
            <button
              className={`btn-mode ${mode === "bot" ? "active" : ""}`}
              onClick={() => setMode("bot")}
              disabled={isRoomMode}
            >
              Bilgisayara Karsi
            </button>
          </div>
          <p className="t-muted">
            {isRoomMode
              ? "Oda aktifken oyun modu local olarak kilitli kalir."
              : "Bu asamada tavla oyunu legacy motorla calisiyor. Sonraki adimda motoru React bilesenlerine tasiyacagiz."}
          </p>
        </div>

        <div className="t-card">
          <p className="t-label">Oda MVP (Faz 1)</p>
          <div className="t-room-grid">
            <label className="t-field">
              <span>Misafir Adi</span>
              <input
                className="t-input"
                value={guestName}
                maxLength={24}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Misafir"
              />
            </label>

            {!roomSession ? (
              <>
                <label className="t-field">
                  <span>Oda Kodu</span>
                  <input
                    className="t-input"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(sanitizeRoomCode(e.target.value))}
                    placeholder="AB12CD"
                  />
                </label>
                <div className="mode-toggle">
                  <button
                    className={`btn-mode ${joinSeat === "white" ? "active" : ""}`}
                    onClick={() => setJoinSeat("white")}
                  >
                    Beyaz
                  </button>
                  <button
                    className={`btn-mode ${joinSeat === "black" ? "active" : ""}`}
                    onClick={() => setJoinSeat("black")}
                  >
                    Siyah
                  </button>
                </div>
                <div className="t-room-actions">
                  <button className="btn-secondary" onClick={onCreateRoom}>
                    Oda Olustur
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={onJoinRoom}
                    disabled={sanitizeRoomCode(roomCodeInput).length < 4}
                  >
                    Odaya Katil
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="t-muted">
                  Aktif oda: <code>{roomSession.code}</code> / Sen:{" "}
                  <code>{roomSession.seat === "white" ? "Beyaz" : "Siyah"}</code>
                </p>
                <div className="t-room-actions">
                  <button className="btn-secondary" onClick={onCopyInvite}>
                    {copied ? "Kopyalandi" : "Davet Linki Kopyala"}
                  </button>
                  <button className="btn-secondary" onClick={onLeaveRoom}>
                    Odadan Cik
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <section className="t-board-wrap">
        <div className="t-board-head">
          <p className="t-board-title">OYUN TAHTASI</p>
          <p className="t-board-subtitle">Hamleleri asagidaki canli alanda oynayabilirsin.</p>
        </div>
        <div className="t-board-frame">
          <iframe title="Tavla Oyunu" src={iframeUrl} />
        </div>
      </section>

      <section className="t-roadmap">
        <p className="t-label">Sonraki Teknik Adimlar</p>
        <ol>
          <li>Guest + oda kodu MVP canliya alinacak</li>
          <li>Gercek backend realtime ile cihazlar arasi senkron</li>
          <li>Email/sifre uye girisi ve profil tablosu</li>
          <li>Lobby, davet ve eslesme servisleri</li>
          <li>Supabase tasimasina uygun Postgres sema disiplini</li>
        </ol>
      </section>
    </main>
  );
}

export default App;
