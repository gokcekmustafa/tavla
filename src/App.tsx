import { useEffect, useMemo, useState } from "react";
import "./App.css";

type GameMode = "local" | "bot";
type Seat = "white" | "black";

type RoomSession = {
  code: string;
  seat: Seat;
  sessionId: string;
  roomName: string;
  tableNo: number;
};

const GUEST_STORAGE_KEY = "tavla.guestName";
const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function sanitizeRoomCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function sanitizeGuestName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 24);
}

function sanitizeRoomName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 30);
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

function getInitialRoomSession(): RoomSession | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const room = sanitizeRoomCode(params.get("room") ?? "");
  const seatParam = params.get("seat");
  const seat: Seat | null = seatParam === "white" || seatParam === "black" ? seatParam : null;
  if (!room || !seat) return null;
  const roomName = sanitizeRoomName(
    params.get("room_name") ?? params.get("roomName") ?? params.get("oda") ?? `Oda ${room}`,
  );
  const tableNo = sanitizeTableNo(
    params.get("table") ?? params.get("tableNo") ?? params.get("masa") ?? "1",
  );

  return {
    code: room,
    seat,
    sessionId: createSessionId(),
    roomName: roomName || `Oda ${room}`,
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

function App() {
  const [mode, setMode] = useState<GameMode>("local");
  const [iframeKey, setIframeKey] = useState(1);
  const [guestName, setGuestName] = useState(getInitialGuestName);
  const [roomSession, setRoomSession] = useState<RoomSession | null>(getInitialRoomSession);
  const [roomCodeInput, setRoomCodeInput] = useState(() => getInitialRoomSession()?.code ?? "");
  const [roomNameInput, setRoomNameInput] = useState(() => getInitialRoomSession()?.roomName ?? "Salon");
  const [tableNoInput, setTableNoInput] = useState(() => String(getInitialRoomSession()?.tableNo ?? 1));
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
      qp.set("room_name", roomSession.roomName);
      qp.set("table", String(roomSession.tableNo));
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

  function refreshBoard() {
    setIframeKey((v) => v + 1);
  }

  function onCreateRoom() {
    const code = createRoomCode();
    const roomName = sanitizeRoomName(roomNameInput) || `Oda ${code}`;
    const tableNo = sanitizeTableNo(tableNoInput);
    setRoomCodeInput(code);
    setRoomNameInput(roomName);
    setTableNoInput(String(tableNo));
    setRoomSession({
      code,
      seat: "white",
      sessionId: createSessionId(),
      roomName,
      tableNo,
    });
    setJoinSeat("black");
    setCopied(false);
    refreshBoard();
  }

  function onJoinRoom() {
    const code = sanitizeRoomCode(roomCodeInput);
    if (!code) return;
    const roomName = sanitizeRoomName(roomNameInput) || `Oda ${code}`;
    const tableNo = sanitizeTableNo(tableNoInput);
    setRoomCodeInput(code);
    setRoomNameInput(roomName);
    setTableNoInput(String(tableNo));
    setRoomSession({
      code,
      seat: joinSeat,
      sessionId: createSessionId(),
      roomName,
      tableNo,
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
    url.searchParams.set("room_name", roomSession.roomName);
    url.searchParams.set("table", String(roomSession.tableNo));
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1300);
  }

  return (
    <main className="t-root t-compact-root">
      <section className="t-board-wrap t-board-wrap-full">
        <div className="t-board-frame">
          <iframe title="Tavla Oyunu" src={iframeUrl} />
        </div>
      </section>

      <section className="t-room-dock">
        <div className="t-room-inline-grid">
          <label className="t-field">
            <span>Misafir</span>
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
                <span>Oda Adi</span>
                <input
                  className="t-input"
                  value={roomNameInput}
                  maxLength={30}
                  onChange={(e) => setRoomNameInput(sanitizeRoomName(e.target.value))}
                  placeholder="Salon"
                />
              </label>
              <label className="t-field">
                <span>Masa No</span>
                <input
                  className="t-input"
                  value={tableNoInput}
                  inputMode="numeric"
                  onChange={(e) => setTableNoInput(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                  placeholder="1"
                />
              </label>
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
            </>
          ) : (
            <>
              <p className="t-muted">
                Aktif oda: <code>{roomSession.roomName}</code> / Masa <code>{roomSession.tableNo}</code> / Kod{" "}
                <code>{roomSession.code}</code> / Sen:{" "}
                <code>{roomSession.seat === "white" ? "Beyaz" : "Siyah"}</code>
              </p>
              <button className="btn-secondary" onClick={onCopyInvite}>
                {copied ? "Kopyalandi" : "Davet Linki Kopyala"}
              </button>
              <button className="btn-secondary" onClick={onLeaveRoom}>
                Odadan Cik
              </button>
            </>
          )}

          <button className="btn-secondary" onClick={refreshBoard}>
            Tahtayi Yenile
          </button>
          <a className="btn-link" href={iframeUrl} target="_blank" rel="noreferrer">
            Yeni Sekme
          </a>
        </div>
      </section>
    </main>
  );
}

export default App;
