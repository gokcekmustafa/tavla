const WHITE = "white";
const BLACK = "black";
const POINT_COUNT = 24;
const CHECKERS_PER_PLAYER = 15;
const BOT_DELAY_MS = 800;
const BOT_AFTER_DICE_REVEAL_MS = 260;
const LOG_LIMIT = 140;
const ANIM_MS = 380;
const AUTO_ROLL_DELAY_MS = 520;
const ROOM_CHANNEL_PREFIX = "tavla-room-";
const DICE_SPRITE_COLUMNS = 15;
const DICE_SPRITE_ROWS = 7;
const DICE_ROLL_TOTAL_MS = 1750;
const DICE_ROLL_STAGGER_MS = 120;
const SHOW_MOVE_PATH_GUIDES = false;
const CHECKER_SIZE_MIN = 16;
const CHECKER_SIZE_MAX = 48;
const CHECKER_VISIBLE_PER_POINT = 6;

const dom = {
  tableWrap:       document.querySelector(".table-wrap"),
  boardGrid:       document.getElementById("board-grid"),
  guideLayer:      document.getElementById("guide-layer"),
  centerDiceStage: document.getElementById("center-dice-stage"),
  currentPlayer:   document.getElementById("current-player"),
  diceContainer:   document.getElementById("dice-container"),
  statusText:      document.getElementById("status-text"),
  rollBtn:         document.getElementById("roll-btn"),
  newGameBtn:      document.getElementById("new-game-btn"),
  undoBtn:         document.getElementById("undo-btn"),
  modeSelect:      document.getElementById("game-mode-select"),
  colorWhiteInput: document.getElementById("player-color-white"),
  colorBlackInput: document.getElementById("player-color-black"),
  autoRollToggle:  document.getElementById("auto-roll-toggle"),
  moveLog:         document.getElementById("move-log"),
  offWhite:        document.getElementById("off-white"),
  offBlack:        document.getElementById("off-black"),
  offWhiteCount:   document.getElementById("off-white-count"),
  offBlackCount:   document.getElementById("off-black-count"),
  offWhiteStack:   document.getElementById("off-white-stack"),
  offBlackStack:   document.getElementById("off-black-stack"),
  winnerModal:     document.getElementById("winner-modal"),
  winnerText:      document.getElementById("winner-text"),
  winnerCloseBtn:  document.getElementById("winner-close-btn"),
  roomMeta:        document.getElementById("room-meta"),
  roomMetaCode:    document.getElementById("room-meta-code"),
  roomMetaSeat:    document.getElementById("room-meta-seat"),
  roomTitleMain:   document.getElementById("room-title-main"),
  roomTitleSub:    document.getElementById("room-title-sub"),
};

const pointElements   = new Map();
const barSlotElements = new Map();

let gameState         = createInitialState();
let currentPlayer     = WHITE;
let remainingDice     = [];
let hasRolled         = false;
let selectedSource    = null;
let availableMoves    = [];
let winner            = null;
let statusMessage     = "Beyaz başlıyor. Zar atarak oyunu başlat.";
let gameMode          = window.__BOOT_MODE__ === "bot" ? "bot" : "local";
let moveLog           = [];
let pendingBotTimer   = null;
let pendingAutoRollTimer = null;
let turnUndoSnapshot  = null;
let movesMadeThisTurn = 0;
let dragSource        = null;
let lastRolledDice    = [];
let lastDicePlayer    = WHITE;
let isAnimating       = false;
let autoRollEnabled   = false;
let pendingMoveChain  = [];
let isApplyingRemoteState = false;
let roomChannel       = null;
let roomSocket        = null;
let roomReconnectTimer = null;
let roomSyncCounter   = 0;
const roomPendingMessages = [];
let preferredPlayerColor = WHITE;
let diceRollSettledAt = 0;

const roomParams = parseRoomParamsSafe();
const roomSenderCounters = new Map();

buildBoard();
attachEvents();
initRoomMode();
initPreferredPlayerColor();
addLog(getBootLogMessage());
render();
announceRoomJoin();

// ── State ────────────────────────────────────────────────────────

function createInitialState() {
  const state = {
    points:   Array.from({ length: POINT_COUNT }, () => ({ owner: null, count: 0 })),
    bar:      { [WHITE]: 0, [BLACK]: 0 },
    borneOff: { [WHITE]: 0, [BLACK]: 0 },
  };
  addCheckers(state, 24, WHITE, 2);
  addCheckers(state, 13, WHITE, 5);
  addCheckers(state, 8,  WHITE, 3);
  addCheckers(state, 6,  WHITE, 5);
  addCheckers(state, 1,  BLACK, 2);
  addCheckers(state, 12, BLACK, 5);
  addCheckers(state, 17, BLACK, 3);
  addCheckers(state, 19, BLACK, 5);
  return state;
}

function addCheckers(state, point, player, amount) {
  const t = state.points[point - 1];
  t.owner = player;
  t.count += amount;
}

function getDefaultRoomSyncWsBase() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/realtime`;
}

function normalizeRoomSyncWsBase(raw) {
  const fallback = getDefaultRoomSyncWsBase();
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (!trimmed) return fallback;
  try {
    const url = new URL(trimmed, window.location.href);
    if (url.protocol === "http:") url.protocol = "ws:";
    if (url.protocol === "https:") url.protocol = "wss:";
    if (url.protocol !== "ws:" && url.protocol !== "wss:") return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
}

function parseRoomParamsLegacy() {
  const params = new URLSearchParams(window.location.search);
  const roomCode = (params.get("room") || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  const roomNameRaw = (params.get("room_name")
    || params.get("roomName")
    || params.get("oda")
    || params.get("odaAdi")
    || params.get("roomLabel")
    || "")
    .replace(/\s+/g, " ")
    .replace(/[^a-zA-Z0-9ığüşöçİĞÜŞÖÇ _-]/g, "")
    .trim()
    .slice(0, 30);
  const tableRaw = (params.get("table")
    || params.get("tableNo")
    || params.get("masa")
    || params.get("masaNo")
    || "")
    .replace(/[^0-9]/g, "");
  const seatParam = params.get("seat");
  const seat = seatParam === WHITE || seatParam === BLACK ? seatParam : WHITE;
  const sessionRaw = (params.get("session") || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 48);
  const guestRaw = (params.get("guest") || params.get("name") || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
  const syncWsRaw = (params.get("sync_ws")
    || params.get("syncWs")
    || params.get("realtime_ws")
    || params.get("realtimeWs")
    || "");
  const parsedTableNo = Number.parseInt(tableRaw || "0", 10);
  const roomDigits = roomCode.replace(/[^0-9]/g, "");
  const fallbackTableNo = Number.parseInt(roomDigits.slice(-2) || "1", 10);
  const tableNo = Number.isInteger(parsedTableNo) && parsedTableNo > 0
    ? parsedTableNo
    : (Number.isInteger(fallbackTableNo) && fallbackTableNo > 0 ? fallbackTableNo : 1);
  const roomName = roomNameRaw || (roomCode ? `Oda ${roomCode}` : "Yerel Oyun");

  return {
    enabled: Boolean(roomCode && (seatParam === WHITE || seatParam === BLACK)),
    code: roomCode,
    roomName,
    tableNo,
    seat,
    session: sessionRaw || createRoomSessionId(),
    guest: guestRaw || "Misafir",
    syncWs: normalizeRoomSyncWsBase(syncWsRaw),
  };
}

function parseRoomParamsSafe() {
  const params = new URLSearchParams(window.location.search);
  const roomCode = (params.get("room") || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  const roomNameRaw = (params.get("room_name")
    || params.get("roomName")
    || params.get("oda")
    || params.get("odaAdi")
    || params.get("roomLabel")
    || "")
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .trim()
    .slice(0, 30);
  const tableRaw = (params.get("table")
    || params.get("tableNo")
    || params.get("masa")
    || params.get("masaNo")
    || "")
    .replace(/[^0-9]/g, "");
  const seatParam = params.get("seat");
  const seat = seatParam === WHITE || seatParam === BLACK ? seatParam : WHITE;
  const sessionRaw = (params.get("session") || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 48);
  const guestRaw = (params.get("guest") || params.get("name") || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
  const syncWsRaw = (params.get("sync_ws")
    || params.get("syncWs")
    || params.get("realtime_ws")
    || params.get("realtimeWs")
    || "");

  const parsedTableNo = Number.parseInt(tableRaw || "0", 10);
  const roomDigits = roomCode.replace(/[^0-9]/g, "");
  const fallbackTableNo = Number.parseInt(roomDigits.slice(-2) || "1", 10);
  const tableNo = Number.isInteger(parsedTableNo) && parsedTableNo > 0
    ? parsedTableNo
    : (Number.isInteger(fallbackTableNo) && fallbackTableNo > 0 ? fallbackTableNo : 1);
  const roomName = roomNameRaw || (roomCode ? `Oda ${roomCode}` : "Yerel Oyun");

  return {
    enabled: Boolean(roomCode && (seatParam === WHITE || seatParam === BLACK)),
    code: roomCode,
    roomName,
    tableNo,
    seat,
    session: sessionRaw || createRoomSessionId(),
    guest: guestRaw || "Misafir",
    syncWs: normalizeRoomSyncWsBase(syncWsRaw),
  };
}

function normalizePlayerColor(value) {
  return value === BLACK ? BLACK : WHITE;
}

function initPreferredPlayerColor() {
  if (isRoomMode()) {
    preferredPlayerColor = roomParams.seat;
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const colorParam = (params.get("color") || params.get("playerColor") || "").toLowerCase();
  preferredPlayerColor = normalizePlayerColor(colorParam === BLACK ? BLACK : WHITE);
}

function createRoomSessionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function isRoomMode() {
  return roomParams.enabled;
}

function isLocalSeatTurn() {
  if (!isRoomMode()) return true;
  return currentPlayer === roomParams.seat;
}

function getBootLogMessage() {
  if (isRoomMode()) {
    return `${roomParams.roomName} / Masa ${roomParams.tableNo} acildi. Sen ${playerText(roomParams.seat)} oyuncususun.`;
  }
  return gameMode === "bot" ? "Bilgisayara karşı modda yeni oyun hazır." : "Yeni oyun hazır.";
}

function initRoomMode() {
  if (!isRoomMode()) return;

  gameMode = "local";
  preferredPlayerColor = roomParams.seat;
  if (dom.modeSelect) {
    dom.modeSelect.value = "local";
    dom.modeSelect.disabled = true;
  }

  if (dom.roomMeta) {
    dom.roomMeta.removeAttribute("hidden");
  }
  if (dom.roomMetaCode) {
    dom.roomMetaCode.textContent = `Oda: ${roomParams.roomName} (Kod: ${roomParams.code})`;
  }
  if (dom.roomMetaSeat) {
    dom.roomMetaSeat.textContent = `Masa: ${roomParams.tableNo} / Sen: ${playerText(roomParams.seat)}`;
  }

  setStatus(`${roomParams.roomName} - Masa ${roomParams.tableNo} aktif. Sıra ${playerText(currentPlayer)} oyuncusunda.`);
  initRoomChannel();
}

function initRoomChannel() {
  if (!isRoomMode()) return;
  const wsUrl = buildRoomSyncUrl();
  if (!wsUrl) {
    addLog("Oda senkron adresi gecersiz.");
    return;
  }

  try {
    roomSocket = new WebSocket(wsUrl);
  } catch (error) {
    roomSocket = null;
    roomChannel = null;
    addLog("Oda senkronu acilamadi.");
    scheduleRoomReconnect();
    return;
  }

  roomChannel = {
    postMessage(message) {
      if (!roomSocket || roomSocket.readyState !== WebSocket.OPEN) {
        roomPendingMessages.push(message);
        return;
      }
      roomSocket.send(JSON.stringify(message));
    },
    close() {
      if (!roomSocket) return;
      try {
        roomSocket.close(1000, "manual-close");
      } catch {
        // no-op
      }
    },
  };

  roomSocket.addEventListener("open", () => {
    clearRoomReconnectTimer();
    flushRoomPendingMessages();
    sendRoomMessage("hello");
  });

  roomSocket.addEventListener("message", (event) => {
    if (typeof event.data !== "string") return;
    let parsed = null;
    try {
      parsed = JSON.parse(event.data);
    } catch {
      return;
    }
    onRoomChannelMessage({ data: parsed });
  });

  roomSocket.addEventListener("close", () => {
    roomSocket = null;
    addLog("Oda baglantisi koptu. Yeniden baglaniyor...");
    scheduleRoomReconnect();
  });

  roomSocket.addEventListener("error", () => {
    addLog("Oda baglantisinda hata.");
  });
}

function buildRoomSyncUrl() {
  if (!isRoomMode()) return "";
  const base = normalizeRoomSyncWsBase(roomParams.syncWs);
  try {
    const url = new URL(base);
    url.searchParams.set("channel", `${ROOM_CHANNEL_PREFIX}${roomParams.code}`);
    url.searchParams.set("client", roomParams.session);
    return url.toString();
  } catch {
    return "";
  }
}

function flushRoomPendingMessages() {
  if (!roomChannel || !roomSocket || roomSocket.readyState !== WebSocket.OPEN) return;
  while (roomPendingMessages.length > 0) {
    const message = roomPendingMessages.shift();
    roomChannel.postMessage(message);
  }
}

function clearRoomReconnectTimer() {
  if (roomReconnectTimer === null) return;
  window.clearTimeout(roomReconnectTimer);
  roomReconnectTimer = null;
}

function scheduleRoomReconnect() {
  if (!isRoomMode()) return;
  if (roomReconnectTimer !== null) return;
  roomReconnectTimer = window.setTimeout(() => {
    roomReconnectTimer = null;
    initRoomChannel();
  }, 1200);
}

function announceRoomJoin() {
  if (!isRoomMode() || !roomChannel) return;
  sendRoomMessage("hello");
}

function onRoomChannelMessage(event) {
  const msg = event?.data;
  const expectedChannel = `${ROOM_CHANNEL_PREFIX}${roomParams.code}`;
  const sameRoom = msg && (msg.roomCode === roomParams.code || msg.channel === expectedChannel);
  if (!sameRoom || msg.sender === roomParams.session) return;

  if (msg.kind === "hello") {
    publishRoomSnapshot("hello-reply");
    return;
  }

  if (msg.kind !== "snapshot") return;
  const previousCounter = roomSenderCounters.get(msg.sender) || 0;
  if (typeof msg.counter !== "number" || msg.counter <= previousCounter) return;
  roomSenderCounters.set(msg.sender, msg.counter);
  applyRoomSnapshot(msg.payload);
}

function sendRoomMessage(kind, payload) {
  if (!isRoomMode() || !roomChannel) return;
  roomChannel.postMessage({
    kind,
    channel: `${ROOM_CHANNEL_PREFIX}${roomParams.code}`,
    roomCode: roomParams.code,
    sender: roomParams.session,
    counter: roomSyncCounter,
    payload: payload || null,
  });
}

function publishRoomSnapshot(reason) {
  if (!isRoomMode() || !roomChannel || isApplyingRemoteState) return;
  roomSyncCounter += 1;
  roomChannel.postMessage({
    kind: "snapshot",
    channel: `${ROOM_CHANNEL_PREFIX}${roomParams.code}`,
    roomCode: roomParams.code,
    sender: roomParams.session,
    counter: roomSyncCounter,
    reason,
    payload: buildRoomSnapshot(),
  });
}

function buildRoomSnapshot() {
  return {
    gameState: cloneState(gameState),
    currentPlayer,
    remainingDice: [...remainingDice],
    hasRolled,
    winner,
    statusMessage,
    moveLog: [...moveLog],
    lastRolledDice: [...lastRolledDice],
    lastDicePlayer,
    diceRollSettledAt,
  };
}

function applyRoomSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return;

  isApplyingRemoteState = true;
  clearPendingBotTimer();
  clearPendingAutoRollTimer();

  gameState = cloneState(snapshot.gameState || createInitialState());
  currentPlayer = snapshot.currentPlayer === BLACK ? BLACK : WHITE;
  remainingDice = Array.isArray(snapshot.remainingDice)
    ? snapshot.remainingDice.filter((d) => Number.isInteger(d) && d >= 1 && d <= 6)
    : [];
  hasRolled = Boolean(snapshot.hasRolled);
  winner = snapshot.winner === WHITE || snapshot.winner === BLACK ? snapshot.winner : null;
  statusMessage = typeof snapshot.statusMessage === "string" && snapshot.statusMessage
    ? snapshot.statusMessage
    : statusMessage;
  moveLog = Array.isArray(snapshot.moveLog)
    ? snapshot.moveLog.filter((item) => typeof item === "string").slice(-LOG_LIMIT)
    : [];
  lastRolledDice = Array.isArray(snapshot.lastRolledDice)
    ? snapshot.lastRolledDice.filter((d) => Number.isInteger(d) && d >= 1 && d <= 6)
    : [];
  lastDicePlayer = snapshot.lastDicePlayer === BLACK ? BLACK : WHITE;
  diceRollSettledAt = Number.isFinite(snapshot.diceRollSettledAt)
    ? Number(snapshot.diceRollSettledAt)
    : 0;

  gameMode = "local";
  selectedSource = null;
  dragSource = null;
  pendingMoveChain = [];
  turnUndoSnapshot = null;
  movesMadeThisTurn = 0;
  isAnimating = false;
  availableMoves = hasRolled ? getOptimalMoves(gameState, currentPlayer, remainingDice) : [];

  if (winner) showWinnerPopup(winner);
  else hideWinnerPopup();

  render();
  maybeScheduleAutoRoll();
  isApplyingRemoteState = false;
}

function canControlRoomAction() {
  if (!isRoomMode()) return true;
  if (winner) return false;
  if (isLocalSeatTurn()) return true;
  setStatus(`Sıra ${playerText(currentPlayer)} oyuncusunda. Sen ${playerText(roomParams.seat)} bekliyorsun.`);
  render();
  return false;
}

// ── Build Board ──────────────────────────────────────────────────

function buildBoard() {
  dom.boardGrid.innerHTML = "";

  const topRow    = [13,14,15,16,17,18, null, 19,20,21,22,23,24];
  const bottomRow = [12,11,10, 9, 8, 7, null,  6, 5, 4, 3, 2, 1];

  renderRow(topRow,    "top",    1);
  renderRow(bottomRow, "bottom", 2);

  const barZone = document.createElement("div");
  barZone.className = "bar-zone";
  barZone.id = "bar-zone";
  barZone.append(createBarSlot(BLACK, "Siyah"), createBarSlot(WHITE, "Beyaz"));
  dom.boardGrid.appendChild(barZone);
}

function createBarSlot(player, title) {
  const slot = document.createElement("button");
  slot.type = "button";
  slot.className = "bar-slot";
  slot.dataset.source = "bar";
  slot.dataset.player = player;
  slot.addEventListener("click",     onBarSlotClick);
  slot.addEventListener("dragstart", onDragStartFromBar);
  slot.addEventListener("dragover",  onDragOverTarget);
  slot.addEventListener("drop",      onDropOnBar);
  slot.addEventListener("dragend",   onDragEnd);

  const lbl = document.createElement("p");
  lbl.className = "bar-slot-title";
  lbl.textContent = title;

  const cnt = document.createElement("p");
  cnt.className = "bar-count";
  cnt.id = `bar-${player}-count`;
  cnt.textContent = "0 taş";

  const stk = document.createElement("div");
  stk.className = "bar-stack";
  stk.id = `bar-${player}-stack`;

  slot.append(lbl, cnt, stk);
  barSlotElements.set(player, slot);
  return slot;
}

function renderRow(rowConfig, side, gridRow) {
  rowConfig.forEach((point, index) => {
    if (!point) return;

    const el = document.createElement("button");
    el.type = "button";
    el.className = `point ${side}`;
    el.dataset.point = String(point);
    el.style.gridColumn = String(index + 1);
    el.style.gridRow    = String(gridRow);
    el.addEventListener("click",    onPointClick);
    el.addEventListener("dragover", onDragOverTarget);
    el.addEventListener("drop",     onDropOnPoint);

    // triangle div (hidden via CSS, triangles drawn with ::before)
    const tri = document.createElement("div");
    tri.className = "point-triangle";

    const lbl = document.createElement("p");
    lbl.className = "point-label";
    lbl.textContent = String(point);

    const stk = document.createElement("div");
    stk.className = "checker-stack";
    stk.id = `stack-${point}`;

    el.append(tri, lbl, stk);
    dom.boardGrid.appendChild(el);
    pointElements.set(point, el);
  });
}

// ── Events ───────────────────────────────────────────────────────

function attachEvents() {
  dom.rollBtn.addEventListener("click",  onRollDice);
  dom.newGameBtn.addEventListener("click", onNewGame);
  dom.undoBtn.addEventListener("click",  onUndoMove);
  dom.modeSelect.addEventListener("change", onModeChange);
  dom.colorWhiteInput?.addEventListener("change", onPreferredColorChange);
  dom.colorBlackInput?.addEventListener("change", onPreferredColorChange);
  dom.autoRollToggle?.addEventListener("change", onAutoRollChange);

  dom.offWhite.addEventListener("click",    onOffAreaClick);
  dom.offBlack.addEventListener("click",    onOffAreaClick);
  dom.offWhite.addEventListener("dragover", onDragOverTarget);
  dom.offBlack.addEventListener("dragover", onDragOverTarget);
  dom.offWhite.addEventListener("drop",     onDropOnOffArea);
  dom.offBlack.addEventListener("drop",     onDropOnOffArea);
  dom.winnerCloseBtn?.addEventListener("click", hideWinnerPopup);
  window.addEventListener("resize", () => {
    syncCheckerSizeToBoard();
    renderGuideLines();
  });
}

function onNewGame() {
  if (isRoomMode() && roomParams.seat !== WHITE) {
    setStatus("Yeni oyunu Beyaz oyuncu baslatabilir.");
    render();
    return;
  }
  clearPendingBotTimer();
  clearPendingAutoRollTimer();
  const startPlayer = isRoomMode() ? WHITE : normalizePlayerColor(preferredPlayerColor);
  gameState         = createInitialState();
  currentPlayer     = startPlayer;
  remainingDice     = [];
  hasRolled         = false;
  selectedSource    = null;
  availableMoves    = [];
  winner            = null;
  moveLog           = [];
  turnUndoSnapshot  = null;
  movesMadeThisTurn = 0;
  dragSource        = null;
  pendingMoveChain  = [];
  lastRolledDice    = [];
  lastDicePlayer    = startPlayer;
  diceRollSettledAt = 0;
  isAnimating       = false;
  setStatus(`Yeni oyun basladi. ${playerText(currentPlayer)} zar atsin.`);
  addLog("Yeni oyun basladi.");
  hideWinnerPopup();
  clearCenterDiceStage();
  render();
  maybeScheduleAutoRoll();
  publishRoomSnapshot("new-game");
}

function onModeChange() {
  if (isRoomMode()) {
    dom.modeSelect.value = "local";
    setStatus("Oda modunda bot kapali.");
    render();
    return;
  }
  const next = dom.modeSelect.value === "bot" ? "bot" : "local";
  if (next === gameMode) return;
  gameMode = next;
  clearPendingBotTimer();
  clearPendingAutoRollTimer();
  turnUndoSnapshot  = null;
  movesMadeThisTurn = 0;
  dragSource        = null;
  pendingMoveChain  = [];
  if (gameMode === "bot") {
    setStatus("Bilgisayara karşı mod aktif.");
    addLog("Mod: Bilgisayara karşı.");
  } else {
    setStatus("İki oyunculu mod aktif.");
    addLog("Mod: İki oyuncu.");
  }
  render();
  maybeScheduleBotAction();
  maybeScheduleAutoRoll();
}

function onPreferredColorChange() {
  if (isRoomMode()) {
    preferredPlayerColor = roomParams.seat;
    render();
    return;
  }

  const nextColor = dom.colorBlackInput?.checked ? BLACK : WHITE;
  if (nextColor === preferredPlayerColor) return;
  preferredPlayerColor = normalizePlayerColor(nextColor);

  addLog(`Pul rengi: ${playerText(preferredPlayerColor)}.`);
  onNewGame();
}

function onAutoRollChange() {
  autoRollEnabled = Boolean(dom.autoRollToggle?.checked);
  clearPendingAutoRollTimer();
  if (isRoomMode() && !isLocalSeatTurn()) {
    autoRollEnabled = false;
    if (dom.autoRollToggle) dom.autoRollToggle.checked = false;
    setStatus("Otomatik zar sadece kendi siranizda acilabilir.");
    render();
    return;
  }
  addLog(autoRollEnabled ? "Otomatik zar acildi." : "Otomatik zar kapatildi.");
  if (autoRollEnabled && !winner && !hasRolled && !isBotTurn() && !isAnimating) {
    setStatus("Otomatik zar aktif. Zar birazdan atilacak.");
    maybeScheduleAutoRoll();
  } else {
    render();
  }
}

function onUndoMove() {
  if (!canControlRoomAction()) return;
  if (!canUndoCurrentTurn()) {
    setStatus("Geri alma sadece ilk hamleden sonra kullanılabilir.");
    render();
    return;
  }
  clearPendingBotTimer();
  clearPendingAutoRollTimer();
  restoreSnapshot(turnUndoSnapshot);
  movesMadeThisTurn = 0;
  dragSource        = null;
  pendingMoveChain  = [];
  setStatus("İlk hamle geri alındı. Devam edebilirsin.");
  render();
  maybeScheduleBotAction();
  maybeScheduleAutoRoll();
  publishRoomSnapshot("undo");
}

function onRollDice(arg) {
  const fromBot = Boolean(arg && arg.fromBot);
  clearPendingAutoRollTimer();
  if (winner) return;
  if (!fromBot && !canControlRoomAction()) return;
  if (isBotTurn() && !fromBot) { setStatus("Sıra bilgisayarda."); render(); return; }
  if (hasRolled) { setStatus("Zar zaten atıldı. Hamle yap."); render(); return; }

  const d1 = randomDie();
  const d2 = randomDie();
  lastDicePlayer    = currentPlayer;
  lastRolledDice    = [d1, d2];
  remainingDice     = d1 === d2 ? [d1,d1,d1,d1] : [d1,d2];
  hasRolled         = true;
  movesMadeThisTurn = 0;
  selectedSource    = null;
  pendingMoveChain  = [];
  availableMoves    = getOptimalMoves(gameState, currentPlayer, remainingDice);

  showCenterDice(d1, d2, currentPlayer);
  diceRollSettledAt = Date.now() + DICE_ROLL_TOTAL_MS + DICE_ROLL_STAGGER_MS + 160;
  addLog(`${playerText(currentPlayer)}: ${d1}-${d2}${d1===d2 ? " (çift)" : ""}`);

  if (!availableMoves.length) {
    setStatus(`${playerText(currentPlayer)} hamle yapamadı. Sıra geçti.`);
    addLog(`${playerText(currentPlayer)} pas geçti.`);
    turnUndoSnapshot = null;
    render();
    publishRoomSnapshot("roll-no-move");
    window.setTimeout(finishTurn, 1300);
    return;
  }

  turnUndoSnapshot = captureSnapshot();
  setStatus(`${playerText(currentPlayer)}: kaynak taşı seç.`);
  render();
  publishRoomSnapshot("roll");
  maybeScheduleBotAction();
}

function onPointClick(e) {
  if (isAnimating) return;
  if (!canControlRoomAction()) return;
  handleSourceOrDest(Number(e.currentTarget.dataset.point));
}

function onBarSlotClick(e) {
  if (isAnimating) return;
  if (!canControlRoomAction()) return;
  if (e.currentTarget.dataset.player !== currentPlayer) return;
  handleSourceOrDest("bar");
}

function onOffAreaClick(e) {
  if (isAnimating || isBotTurn()) return;
  if (!canControlRoomAction()) return;
  const tp = e.currentTarget.dataset.off;
  if (tp !== currentPlayer || selectedSource === null) return;
  const mv = pickPreferred(availableMoves.filter(c => c.from === selectedSource && c.to === "off"));
  if (mv) { playMove(mv); return; }
  const chain = findMoveChain(selectedSource, "off");
  if (chain) playMoveChain(chain);
}

function onCheckerDoubleClick(e) {
  if (winner || isAnimating || isBotTurn() || !hasRolled) return;
  if (!canControlRoomAction()) return;
  const source = Number(e.currentTarget.dataset.source);
  if (!Number.isInteger(source)) return;
  e.preventDefault();
  e.stopPropagation();

  const move = getDoubleClickMove(source);
  if (!move) {
    setStatus("Bu pul icin hamle yok.");
    render();
    return;
  }

  pendingMoveChain = [];
  playMove(move);
}

function getDoubleClickMove(source) {
  const options = availableMoves.filter((m) => m.from === source);
  if (!options.length) return null;
  const maxDie = Math.max(...options.map((m) => m.die));
  const best = options.filter((m) => m.die === maxDie);
  return pickPreferred(best);
}

// ── Drag & Drop ──────────────────────────────────────────────────

function onDragStartFromChecker(e) {
  if (isBotTurn() || !hasRolled || isAnimating || (isRoomMode() && !isLocalSeatTurn())) { e.preventDefault(); return; }
  const src = Number(e.currentTarget.dataset.source);
  dragSource = src;
  selectedSource = src;
  e.currentTarget.classList.add("dragging-checker");
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", String(src));
  renderHighlights();
  renderGuideLines();
}

function onDragStartFromBar(e) {
  const player = e.currentTarget.dataset.player;
  if (player !== currentPlayer || isBotTurn() || !hasRolled || isAnimating || (isRoomMode() && !isLocalSeatTurn())) {
    e.preventDefault(); return;
  }
  dragSource = "bar";
  selectedSource = "bar";
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", "bar");
  renderHighlights();
  renderGuideLines();
}

function onDragEnd(e) {
  e?.currentTarget?.classList.remove("dragging-checker");
  window.setTimeout(() => {
    dragSource = null;
    render();
  }, 0);
}

function onDragOverTarget(e) {
  if (!hasRolled || winner || isBotTurn() || isAnimating || (isRoomMode() && !isLocalSeatTurn())) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}

function onDropOnPoint(e) {
  e.preventDefault();
  const src = getDropSourceFromEvent(e);
  if (src === null) return;
  const target = Number(e.currentTarget.dataset.point);
  dragSource = null;
  attemptMove(src, target);
}

function onDropOnBar(e) {
  e.preventDefault();
  dragSource = null;
}

function onDropOnOffArea(e) {
  e.preventDefault();
  const tp = e.currentTarget.dataset.off;
  const src = getDropSourceFromEvent(e);
  if (tp !== currentPlayer || src === null) return;
  dragSource = null;
  attemptMove(src, "off");
}

function getDropSourceFromEvent(e) {
  const raw = e.dataTransfer?.getData("text/plain");
  if (raw === "bar") return "bar";
  const parsed = Number(raw);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= POINT_COUNT) return parsed;
  return dragSource ?? selectedSource;
}

function attemptMove(source, target) {
  if (winner || isBotTurn() || !hasRolled || isAnimating) return;
  if (!canControlRoomAction()) return;
  const matches = availableMoves.filter(c => c.from === source && c.to === target);
  if (matches.length) { playMove(pickPreferred(matches)); return; }
  const chain = findMoveChain(source, target);
  if (chain) { playMoveChain(chain); return; }
  if (getSelectableSources().has(source)) selectedSource = source;
  setStatus("Bu hamle geçersiz.");
  render();
}

function handleSourceOrDest(target) {
  if (winner || isAnimating) return;
  if (!canControlRoomAction()) return;
  if (isBotTurn())  { setStatus("Sıra bilgisayarda."); render(); return; }
  if (!hasRolled)   { setStatus("Önce zar at."); render(); return; }

  const sel = getSelectableSources();

  if (selectedSource === null) {
    if (!sel.has(target)) { setStatus("Bu taş için geçerli hamle yok."); render(); return; }
    const quickOffMove = getQuickBearOffMove(target);
    if (quickOffMove) { playMove(quickOffMove); return; }
    selectedSource = target;
    render();
    return;
  }

  if (selectedSource === target) { selectedSource = null; render(); return; }

  const matches = availableMoves.filter(c => c.from === selectedSource && c.to === target);
  if (matches.length) { playMove(pickPreferred(matches)); return; }
  const chain = findMoveChain(selectedSource, target);
  if (chain) { playMoveChain(chain); return; }

  if (sel.has(target)) { selectedSource = target; render(); return; }

  setStatus("Bu hedefe gidemez.");
  render();
}

function getQuickBearOffMove(source) {
  if (!Number.isInteger(source)) return null;
  if (availableMoves.some((m) => m.to !== "off")) return null;
  const offMoves = availableMoves.filter((m) => m.from === source && m.to === "off");
  if (!offMoves.length) return null;
  return pickPreferred(offMoves);
}

function playMoveChain(chain) {
  if (!Array.isArray(chain) || !chain.length) return;
  pendingMoveChain = [...chain];
  const first = pendingMoveChain.shift();
  if (first) playMove(first);
}

function findMoveChain(source, target) {
  if (!hasRolled || winner || isAnimating) return null;
  if (remainingDice.length < 2) return null;
  const chain = searchMoveChain(gameState, remainingDice, source, target, []);
  if (!chain || chain.length < 2) return null;
  return chain;
}

function searchMoveChain(state, dice, from, target, path) {
  if (!dice.length) return null;
  const options = getOptimalMoves(state, currentPlayer, dice).filter((m) => m.from === from);
  if (!options.length) return null;

  const ordered = [...options].sort((a, b) => chainMoveScore(b, target) - chainMoveScore(a, target));

  for (const move of ordered) {
    const nextPath = [...path, move];
    if (move.to === target && nextPath.length >= 2) return nextPath;
    if (move.to === "off") continue;

    const nextState = applyMove(state, currentPlayer, move);
    const nextDice = removeOneDie(dice, move.die);
    const found = searchMoveChain(nextState, nextDice, move.to, target, nextPath);
    if (found) return found;
  }

  return null;
}

function chainMoveScore(move, target) {
  let score = move.die * 3;
  if (move.to === target) score += 120;
  if (target === "off") {
    if (move.to === "off") score += 26;
    return score;
  }
  if (Number.isInteger(target) && Number.isInteger(move.to)) {
    score += Math.max(0, 30 - Math.abs(target - move.to));
  }
  return score;
}

function isSameMove(a, b) {
  return a && b && a.from === b.from && a.to === b.to && a.die === b.die;
}

// ── Animation ────────────────────────────────────────────────────

function getElementCenter(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function animateMove(move, player, cb) {
  const fromEl = move.from === "bar"
    ? document.getElementById(`bar-${player}-stack`)
    : document.getElementById(`stack-${move.from}`);

  if (!fromEl) { cb(); return; }

  const fc = getElementCenter(fromEl);

  let tc;
  if (move.to === "off") {
    tc = getOffStackTargetPosition(player, gameState.borneOff[player]);
  } else {
    const toEl = document.getElementById(`stack-${move.to}`);
    if (!toEl) { cb(); return; }
    tc = getElementCenter(toEl);
  }

  const size = parseInt(getComputedStyle(document.documentElement)
    .getPropertyValue('--checker-size') || '28', 10) || 28;
  const R = Math.max(20, Math.min(32, size));

  const ghost = document.createElement("span");
  ghost.className = `checker ${player}`;
  ghost.style.cssText = [
    "position:fixed",
    `left:${fc.x - R}px`,
    `top:${fc.y - R}px`,
    `width:${R*2}px`,
    `height:${R*2}px`,
    "pointer-events:none",
    "z-index:9999",
    `transition:left ${ANIM_MS}ms cubic-bezier(.4,0,.2,1),top ${ANIM_MS}ms cubic-bezier(.4,0,.2,1),transform ${ANIM_MS}ms ease`,
    "transform:scale(1.18) translateY(0px)",
    "box-shadow:0 10px 30px rgba(0,0,0,0.55)",
  ].join(";");

  document.body.appendChild(ghost);

  // Force reflow then animate
  ghost.getBoundingClientRect();
  ghost.style.left = `${tc.x - R}px`;
  ghost.style.top  = `${tc.y - R}px`;
  ghost.style.transform = move.to === "off" ? "scale(0.95) translateY(-4px)" : "scale(1)";

  window.setTimeout(() => { ghost.remove(); cb(); }, ANIM_MS + 40);
}

function getOffStackTargetPosition(player, currentOffCount) {
  const stackEl = player === WHITE ? dom.offWhiteStack : dom.offBlackStack;
  const areaEl = player === WHITE ? dom.offWhite : dom.offBlack;
  const baseEl = stackEl || areaEl;
  const rect = baseEl.getBoundingClientRect();

  const slot = Math.min(currentOffCount, 9);
  const step = Math.max(8, rect.height / 12);

  return {
    x: rect.left + rect.width / 2,
    y: rect.bottom - (slot + 1) * step,
  };
}

// ── Play Move ────────────────────────────────────────────────────

function playMove(move) {
  if (!move) return;
  isAnimating = true;
  render();

  animateMove(move, currentPlayer, () => {
    isAnimating = false;
    executeMove(move);
  });
}

function executeMove(move) {
  const hit = move.to !== "off" && isHitMove(gameState, currentPlayer, move);
  gameState      = applyMove(gameState, currentPlayer, move);
  remainingDice  = removeOneDie(remainingDice, move.die);
  movesMadeThisTurn++;
  selectedSource = null;
  dragSource     = null;

  addLog(fmtMove(currentPlayer, move, hit));

  if (gameState.borneOff[currentPlayer] >= CHECKERS_PER_PLAYER) {
    pendingMoveChain = [];
    winner        = currentPlayer;
    hasRolled     = false;
    remainingDice = [];
    availableMoves= [];
    turnUndoSnapshot = null;
    setStatus(`${playerText(currentPlayer)} kazandi!`);
    addLog(`${playerText(currentPlayer)} kazandi.`);
    showWinnerPopup(currentPlayer);
    clearCenterDiceStage();
    render();
    publishRoomSnapshot("win");
    return;
  }

  let recalculatedMoves = null;
  if (pendingMoveChain.length) {
    if (!remainingDice.length) {
      pendingMoveChain = [];
    } else {
      recalculatedMoves = getOptimalMoves(gameState, currentPlayer, remainingDice);
      const next = pendingMoveChain[0];
      const playableNext = recalculatedMoves.find((m) => isSameMove(m, next));
      if (playableNext) {
        availableMoves = recalculatedMoves;
        setStatus(`${playerText(currentPlayer)} zincir hamle devam ediyor.`);
        render();
        publishRoomSnapshot("move-chain-step");
        playMove(pendingMoveChain.shift());
        return;
      }
      pendingMoveChain = [];
    }
  }

  if (!remainingDice.length) {
    setStatus(`${playerText(currentPlayer)} turu bitti.`);
    finishTurn();
    return;
  }

  availableMoves = recalculatedMoves || getOptimalMoves(gameState, currentPlayer, remainingDice);

  if (!availableMoves.length) {
    setStatus("Kalan zarlarla hamle yok. Sıra geçti.");
    addLog(`${playerText(currentPlayer)} pas.`);
    finishTurn();
    return;
  }

  setStatus(`${playerText(currentPlayer)} devam et.`);
  render();
  publishRoomSnapshot("move");
  maybeScheduleBotAction();
}

function finishTurn() {
  clearPendingAutoRollTimer();
  pendingMoveChain  = [];
  hasRolled         = false;
  remainingDice     = [];
  availableMoves    = [];
  selectedSource    = null;
  dragSource        = null;
  movesMadeThisTurn = 0;
  turnUndoSnapshot  = null;
  lastRolledDice    = [];
  diceRollSettledAt = 0;
  clearCenterDiceStage();
  currentPlayer     = opponentOf(currentPlayer);
  render();
  maybeScheduleBotAction();
  maybeScheduleAutoRoll();
  publishRoomSnapshot("finish-turn");
}

// ── Bot ──────────────────────────────────────────────────────────

function maybeScheduleBotAction(delayOverrideMs) {
  clearPendingBotTimer();
  if (!isBotTurn()) return;
  const now = Date.now();
  const diceWaitMs = hasRolled ? Math.max(0, diceRollSettledAt - now + BOT_AFTER_DICE_REVEAL_MS) : 0;
  const overrideMs = Number.isFinite(delayOverrideMs) ? Math.max(0, Number(delayOverrideMs)) : 0;
  const delayMs = Math.max(BOT_DELAY_MS, diceWaitMs, overrideMs);
  pendingBotTimer = window.setTimeout(() => { pendingBotTimer = null; runBotAction(); }, delayMs);
}

function runBotAction() {
  if (!isBotTurn() || winner) return;
  if (!hasRolled) { onRollDice({ fromBot: true }); return; }
  if (Date.now() < diceRollSettledAt) {
    maybeScheduleBotAction(diceRollSettledAt - Date.now() + BOT_AFTER_DICE_REVEAL_MS);
    return;
  }
  if (!availableMoves.length) {
    setStatus("Bot hamle bulamadı.");
    addLog("Bot pas.");
    finishTurn();
    return;
  }

  const botColor = getBotColor();
  const mv = chooseBotMove(gameState, botColor, availableMoves);
  isAnimating = true;
  render();
  animateMove(mv, botColor, () => {
    isAnimating = false;
    executeMove(mv);
  });
}

function clearPendingBotTimer() {
  if (pendingBotTimer === null) return;
  clearTimeout(pendingBotTimer);
  pendingBotTimer = null;
}

function maybeScheduleAutoRoll() {
  clearPendingAutoRollTimer();
  if (!autoRollEnabled || winner || hasRolled || isBotTurn() || isAnimating || (isRoomMode() && !isLocalSeatTurn())) return;

  pendingAutoRollTimer = window.setTimeout(() => {
    pendingAutoRollTimer = null;
    if (!autoRollEnabled || winner || hasRolled || isBotTurn() || isAnimating || (isRoomMode() && !isLocalSeatTurn())) return;
    onRollDice({ fromAuto: true });
  }, AUTO_ROLL_DELAY_MS);
}

function clearPendingAutoRollTimer() {
  if (pendingAutoRollTimer === null) return;
  clearTimeout(pendingAutoRollTimer);
  pendingAutoRollTimer = null;
}

function syncCheckerSizeToBoard() {
  const samplePoint = pointElements.get(1) || pointElements.get(13);
  if (!samplePoint) return;

  const rect = samplePoint.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const sampleStack = document.getElementById("stack-1") || document.getElementById("stack-13");
  const stackRect = sampleStack?.getBoundingClientRect();

  const byHeight = Math.floor(rect.height / CHECKER_VISIBLE_PER_POINT);
  const laneWidth = stackRect?.width || rect.width * 0.7;
  const byWidth = Math.floor(laneWidth * 0.95);
  const nextSize = Math.max(CHECKER_SIZE_MIN, Math.min(CHECKER_SIZE_MAX, byHeight, byWidth));

  document.documentElement.style.setProperty("--checker-size", `${nextSize}px`);
}

// ── Render ───────────────────────────────────────────────────────

function render() {
  syncCheckerSizeToBoard();
  renderTurnInfo();
  renderStatus();
  renderDice();
  renderBoardState();
  renderHighlights();
  renderGuideLines();
  renderMoveLog();
}

function renderTurnInfo() {
  const lbl = isBotTurn() ? `${playerText(currentPlayer)} (Bot)` : playerText(currentPlayer);
  const waitingForOpponent = isRoomMode() && !isLocalSeatTurn();
  dom.currentPlayer.textContent = lbl;
  dom.currentPlayer.classList.toggle("winner", Boolean(winner));
  dom.rollBtn.disabled  = hasRolled || Boolean(winner) || isBotTurn() || isAnimating || waitingForOpponent;
  dom.undoBtn.disabled  = !canUndoCurrentTurn();
  dom.modeSelect.value  = gameMode;
  dom.modeSelect.disabled = isRoomMode();
  dom.newGameBtn.disabled = isRoomMode() && roomParams.seat !== WHITE;
  if (dom.autoRollToggle) {
    dom.autoRollToggle.checked = autoRollEnabled;
    dom.autoRollToggle.disabled = waitingForOpponent;
  }
  const effectiveColor = isRoomMode() ? roomParams.seat : preferredPlayerColor;
  if (dom.colorWhiteInput) {
    dom.colorWhiteInput.checked = effectiveColor === WHITE;
    dom.colorWhiteInput.disabled = isRoomMode();
  }
  if (dom.colorBlackInput) {
    dom.colorBlackInput.checked = effectiveColor === BLACK;
    dom.colorBlackInput.disabled = isRoomMode();
  }
  if (dom.roomMeta) {
    if (isRoomMode()) dom.roomMeta.removeAttribute("hidden");
    else dom.roomMeta.setAttribute("hidden", "");
  }
  if (dom.roomMetaCode && isRoomMode()) {
    dom.roomMetaCode.textContent = `Oda: ${roomParams.roomName} (Kod: ${roomParams.code})`;
  }
  if (dom.roomMetaSeat && isRoomMode()) {
    dom.roomMetaSeat.textContent = `Masa: ${roomParams.tableNo} / Sen: ${playerText(roomParams.seat)} / Sira: ${playerText(currentPlayer)}`;
  }
  renderRoomHeader();
}

function renderRoomHeaderLegacy() {
  if (!dom.roomTitleMain || !dom.roomTitleSub) return;

  const titleMain = isRoomMode()
    ? roomParams.roomName
    : (gameMode === "bot" ? "Yerel Oyun - Bot Modu" : "Yerel Oyun");

  const titleSub = isRoomMode()
    ? `Masa ${roomParams.tableNo} · Sen: ${playerText(roomParams.seat)}`
    : `Masa ${roomParams.tableNo}`;

  dom.roomTitleMain.textContent = titleMain;
  dom.roomTitleSub.textContent = titleSub;
}

// Keep this canonical room header renderer as the final declaration.
function renderRoomHeader() {
  if (!dom.roomTitleMain || !dom.roomTitleSub) return;

  const titleMain = isRoomMode()
    ? roomParams.roomName
    : (gameMode === "bot" ? "Yerel Oyun - Bot Modu" : "Yerel Oyun");

  const titleSub = isRoomMode()
    ? `Masa ${roomParams.tableNo} - Sen: ${playerText(roomParams.seat)}`
    : `Masa ${roomParams.tableNo} - Secili: ${playerText(preferredPlayerColor)}`;

  dom.roomTitleMain.textContent = titleMain;
  dom.roomTitleSub.textContent = titleSub;
}

function renderStatus() {
  dom.statusText.textContent = statusMessage;
}

function renderDice() {
  dom.diceContainer.innerHTML = "";
  if (!lastRolledDice.length) return;

  const isDouble = lastRolledDice[0] === lastRolledDice[1];
  const show = isDouble ? [lastRolledDice[0], lastRolledDice[0]] : lastRolledDice;
  const colorClass = lastDicePlayer === WHITE ? "die-white" : "die-black";

  show.forEach((val, i) => {
    const chip = document.createElement("span");
    chip.className = "die-chip";
    chip.classList.add(colorClass);
    chip.appendChild(createDiePips(val, "small"));

    // Simple used check: count how many of this value remain
    const remaining = remainingDice.filter(d => d === val).length;
    const shown     = show.filter((v, j) => v === val && j <= i).length;
    if (shown > remaining) chip.classList.add("die-used");

    dom.diceContainer.appendChild(chip);
  });

  if (isDouble) {
    const badge = document.createElement("span");
    badge.className = "double-badge";
    badge.textContent = `×${remainingDice.length}`;
    dom.diceContainer.appendChild(badge);
  }
}

function renderBoardState() {
  const sel   = getSelectableSources();
  const canDrag = hasRolled && !winner && !isBotTurn() && !isAnimating && (!isRoomMode() || isLocalSeatTurn());

  for (let pt = 1; pt <= POINT_COUNT; pt++) {
    const ps    = gameState.points[pt - 1];
    const stack = document.getElementById(`stack-${pt}`);
    const el    = pointElements.get(pt);
    stack.innerHTML = "";

    if (!ps.owner || ps.count === 0) { el.classList.remove("blocked"); continue; }

    const show = Math.min(ps.count, CHECKER_VISIBLE_PER_POINT);
    for (let i = 0; i < show; i++) {
      const ch = document.createElement("span");
      ch.className = `checker ${ps.owner}`;
      if (pt === selectedSource && ps.owner === currentPlayer) {
        ch.classList.add("selected-checker");
      }
      const canDragThis = canDrag && sel.has(pt) && ps.owner === currentPlayer;
      ch.draggable = canDragThis;
      if (canDragThis) {
        ch.classList.add("draggable-checker");
        ch.dataset.source = String(pt);
        ch.addEventListener("dragstart", onDragStartFromChecker);
        ch.addEventListener("dragend",   onDragEnd);
        ch.addEventListener("dblclick",  onCheckerDoubleClick);
      }
      stack.appendChild(ch);
    }

    if (ps.count > CHECKER_VISIBLE_PER_POINT) {
      const badge = document.createElement("span");
      badge.className = "count-badge";
      badge.textContent = `+${ps.count - CHECKER_VISIBLE_PER_POINT}`;
      stack.appendChild(badge);
    }

    el.classList.toggle("blocked", ps.owner !== currentPlayer && ps.count >= 2);
  }

  const canDragBar = canDrag && sel.has("bar") && gameState.bar[currentPlayer] > 0;
  const barSlot    = barSlotElements.get(currentPlayer);
  if (barSlot) {
    barSlot.draggable = canDragBar;
    barSlot.classList.toggle("draggable-source", canDragBar);
  }

  renderBar(BLACK);
  renderBar(WHITE);
  renderOffStack(BLACK);
  renderOffStack(WHITE);
  dom.offWhiteCount.textContent = `${gameState.borneOff[WHITE]} / ${CHECKERS_PER_PLAYER}`;
  dom.offBlackCount.textContent = `${gameState.borneOff[BLACK]} / ${CHECKERS_PER_PLAYER}`;
}

function renderBar(player) {
  const count   = gameState.bar[player];
  const countEl = document.getElementById(`bar-${player}-count`);
  const stackEl = document.getElementById(`bar-${player}-stack`);
  countEl.textContent = `${count} taş`;
  stackEl.innerHTML   = "";
  const show = Math.min(count, 8);
  for (let i = 0; i < show; i++) {
    const chip = document.createElement("span");
    chip.className = `bar-chip ${player}`;
    if (selectedSource === "bar" && player === currentPlayer) {
      chip.classList.add("selected-checker");
    }
    stackEl.appendChild(chip);
  }
}

function renderOffStack(player) {
  const stackEl = player === WHITE ? dom.offWhiteStack : dom.offBlackStack;
  if (!stackEl) return;

  const count = gameState.borneOff[player];
  stackEl.innerHTML = "";

  const visible = Math.min(count, 10);
  for (let i = 0; i < visible; i++) {
    const chip = document.createElement("span");
    chip.className = `off-chip ${player}`;
    chip.style.setProperty("--stack-index", String(i));
    stackEl.appendChild(chip);
  }

  if (count > 10) {
    const badge = document.createElement("span");
    badge.className = "off-chip-badge";
    badge.textContent = `+${count - 10}`;
    stackEl.appendChild(badge);
  }
}

function renderHighlights() {
  for (const el of pointElements.values())   el.classList.remove("selectable-source","selected-source","highlight-target");
  for (const sl of barSlotElements.values()) sl.classList.remove("selectable-source","selected-source","highlight-target");
  dom.offWhite.classList.remove("highlight-target");
  dom.offBlack.classList.remove("highlight-target");

  if (!hasRolled || winner || isBotTurn() || isAnimating || (isRoomMode() && !isLocalSeatTurn())) return;

  const sel = getSelectableSources();
  for (const src of sel) {
    if (src === "bar") barSlotElements.get(currentPlayer)?.classList.add("selectable-source");
    else               pointElements.get(src)?.classList.add("selectable-source");
  }

  if (selectedSource === null) return;

  if (selectedSource === "bar") barSlotElements.get(currentPlayer)?.classList.add("selected-source");
  else                          pointElements.get(selectedSource)?.classList.add("selected-source");

  const targets = new Set(availableMoves.filter(m => m.from === selectedSource).map(m => m.to));
  for (const t of targets) {
    if (t === "off") {
      (currentPlayer === WHITE ? dom.offWhite : dom.offBlack).classList.add("highlight-target");
    } else {
      pointElements.get(t)?.classList.add("highlight-target");
    }
  }
}

function renderGuideLines() {
  if (!dom.guideLayer || !dom.tableWrap) return;
  dom.guideLayer.innerHTML = "";
  if (!SHOW_MOVE_PATH_GUIDES) return;

  if (!hasRolled || winner || isBotTurn() || isAnimating || (isRoomMode() && !isLocalSeatTurn()) || selectedSource === null) return;

  const targets = [...new Set(availableMoves.filter((m) => m.from === selectedSource).map((m) => m.to))];
  if (!targets.length) return;

  const tableRect = dom.tableWrap.getBoundingClientRect();
  const width = Math.max(1, Math.round(tableRect.width));
  const height = Math.max(1, Math.round(tableRect.height));
  dom.guideLayer.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const source = getGuideAnchor(selectedSource, tableRect);
  if (!source) return;

  const ns = "http://www.w3.org/2000/svg";
  const frag = document.createDocumentFragment();

  targets.forEach((target, idx) => {
    const dest = getGuideAnchor(target, tableRect);
    if (!dest) return;

    const path = document.createElementNS(ns, "path");
    path.classList.add("guide-path");
    path.style.animationDelay = `${idx * 70}ms`;
    path.setAttribute("d", buildGuidePath(source, dest));
    frag.appendChild(path);

    const dot = document.createElementNS(ns, "circle");
    dot.classList.add("guide-dot");
    dot.setAttribute("cx", dest.x.toFixed(1));
    dot.setAttribute("cy", dest.y.toFixed(1));
    dot.setAttribute("r", "4.6");
    frag.appendChild(dot);
  });

  const sourceDot = document.createElementNS(ns, "circle");
  sourceDot.classList.add("guide-source-dot");
  sourceDot.setAttribute("cx", source.x.toFixed(1));
  sourceDot.setAttribute("cy", source.y.toFixed(1));
  sourceDot.setAttribute("r", "5.2");
  frag.appendChild(sourceDot);

  dom.guideLayer.appendChild(frag);
}

function getGuideAnchor(target, tableRect) {
  if (target === "off") {
    const off = currentPlayer === WHITE ? dom.offWhite : dom.offBlack;
    return off ? getElementGuideCenter(off, tableRect) : null;
  }

  if (target === "bar") {
    const bar = barSlotElements.get(currentPlayer);
    return bar ? getElementGuideCenter(bar, tableRect) : null;
  }

  if (!Number.isInteger(target)) return null;
  return getPointGuideAnchor(target, tableRect);
}

function getPointGuideAnchor(point, tableRect) {
  const pointEl = pointElements.get(point);
  if (!pointEl) return null;

  const stack = document.getElementById(`stack-${point}`);
  const checkers = stack ? [...stack.querySelectorAll(".checker")] : [];
  if (checkers.length) {
    const anchorChecker = pointEl.classList.contains("top")
      ? checkers[0]
      : checkers[checkers.length - 1];
    return getElementGuideCenter(anchorChecker, tableRect);
  }

  const rect = pointEl.getBoundingClientRect();
  const yRatio = pointEl.classList.contains("top") ? 0.27 : 0.73;
  return {
    x: rect.left + rect.width / 2 - tableRect.left,
    y: rect.top + rect.height * yRatio - tableRect.top,
  };
}

function getElementGuideCenter(el, tableRect) {
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2 - tableRect.left,
    y: rect.top + rect.height / 2 - tableRect.top,
  };
}

function buildGuidePath(from, to) {
  const midX = (from.x + to.x) / 2;
  const bend = Math.max(22, Math.min(78, Math.abs(to.x - from.x) * 0.13 + Math.abs(to.y - from.y) * 0.1));
  const direction = to.y >= from.y ? -1 : 1;
  const ctrlY = (from.y + to.y) / 2 + direction * bend;
  return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} Q ${midX.toFixed(1)} ${ctrlY.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
}

function renderMoveLog() {
  dom.moveLog.innerHTML = "";
  if (!moveLog.length) {
    const li = document.createElement("li");
    li.className = "empty-log";
    li.textContent = "Henüz hamle yok.";
    dom.moveLog.appendChild(li);
    return;
  }
  [...moveLog].reverse().forEach((entry, i) => {
    const li = document.createElement("li");
    li.textContent = `${moveLog.length - i}. ${entry}`;
    dom.moveLog.appendChild(li);
  });
}

// ── Center Dice Animation ────────────────────────────────────────

function showCenterDice(d1, d2, player) {
  if (!dom.centerDiceStage) return;
  dom.centerDiceStage.innerHTML = "";
  const wrap = document.createElement("div");
  const toneClass = player === WHITE ? "dice-white" : "dice-black";
  const values = [d1, d2];
  wrap.className = `center-dice-wrap ${toneClass}`;

  dom.centerDiceStage.classList.remove("white-turn", "black-turn");
  dom.centerDiceStage.classList.add(player === WHITE ? "white-turn" : "black-turn");

  values.forEach((val, i) => {
    const die = createCenterDie3D(val, toneClass, i);
    wrap.appendChild(die);
  });

  dom.centerDiceStage.appendChild(wrap);
  dom.centerDiceStage.classList.add("show");

  window.setTimeout(() => {
    settleCenterDice(wrap, values, toneClass);
  }, DICE_ROLL_TOTAL_MS + DICE_ROLL_STAGGER_MS + 120);
}

function clearCenterDiceStage() {
  if (!dom.centerDiceStage) return;
  dom.centerDiceStage.innerHTML = "";
  dom.centerDiceStage.classList.remove("show", "white-turn", "black-turn");
}

function settleCenterDice(wrap, values, toneClass) {
  if (!wrap?.isConnected) return;
  const dice = [...wrap.querySelectorAll(".center-die")];
  dice.forEach((dieEl, idx) => {
    const value = values[idx] || values[0] || 1;
    dieEl.classList.add("settled");
    dieEl.innerHTML = "";
    dieEl.appendChild(createCenterDieFlat(value, toneClass));
  });
}

function createCenterDieFlat(value, toneClass) {
  const face = document.createElement("span");
  face.className = `center-die-flat ${toneClass}`;
  face.appendChild(createDiePips(value, "settled"));
  return face;
}

function createCenterDie3D(value, toneClass, index) {
  const die = document.createElement("div");
  die.className = `center-die ${toneClass} rolling`;

  const sprite = document.createElement("span");
  sprite.className = "die-roll-sprite";
  die.appendChild(sprite);

  animateDiceSprite(sprite, value, index);
  return die;
}

function animateDiceSprite(spriteEl, value, index) {
  const delayMs = index * DICE_ROLL_STAGGER_MS;
  const frameSequence = buildDiceFrameSequence(value);
  let lastFrame = -1;
  const startAt = performance.now() + delayMs;

  function tick(now) {
    if (!spriteEl.isConnected) return;
    if (now < startAt) {
      window.requestAnimationFrame(tick);
      return;
    }

    const elapsed = now - startAt;
    const progress = Math.min(1, elapsed / DICE_ROLL_TOTAL_MS);
    const eased = 1 - Math.pow(1 - progress, 3);
    const frameIndex = Math.min(
      frameSequence.length - 1,
      Math.floor(eased * (frameSequence.length - 1))
    );

    if (frameIndex !== lastFrame) {
      setDiceSpriteFrame(spriteEl, frameSequence[frameIndex]);
      lastFrame = frameIndex;
    }

    if (progress < 1) window.requestAnimationFrame(tick);
  }

  window.requestAnimationFrame(tick);
}

function buildDiceFrameSequence(value) {
  const randomFrames = [];
  const randomCount = 28;

  for (let i = 0; i < randomCount; i++) {
    const row = Math.floor(Math.random() * DICE_SPRITE_ROWS);
    const col = Math.floor(Math.random() * DICE_SPRITE_COLUMNS);
    randomFrames.push(row * DICE_SPRITE_COLUMNS + col);
  }

  const settleRow = (Math.max(1, Math.min(6, value)) - 1) % DICE_SPRITE_ROWS;
  const settleCols = [3, 6, 8, 10, 11, 12, 13];
  const settleFrames = settleCols.map((col) => settleRow * DICE_SPRITE_COLUMNS + col);

  return [...randomFrames, ...settleFrames];
}

function setDiceSpriteFrame(spriteEl, frameIndex) {
  const safeIndex = Math.max(0, Math.min(DICE_SPRITE_COLUMNS * DICE_SPRITE_ROWS - 1, frameIndex));
  const col = safeIndex % DICE_SPRITE_COLUMNS;
  const row = Math.floor(safeIndex / DICE_SPRITE_COLUMNS);
  const size = spriteEl.clientWidth || spriteEl.parentElement?.clientWidth || 52;

  spriteEl.style.backgroundSize = `${size * DICE_SPRITE_COLUMNS}px ${size * DICE_SPRITE_ROWS}px`;
  spriteEl.style.backgroundPosition = `${-col * size}px ${-row * size}px`;
}

function getDiceFaceLayout(topValue) {
  const map = {
    1: { front: 2, right: 3 },
    2: { front: 6, right: 3 },
    3: { front: 2, right: 6 },
    4: { front: 1, right: 2 },
    5: { front: 1, right: 4 },
    6: { front: 5, right: 4 },
  };

  const pick = map[topValue] || map[1];

  return {
    top: topValue,
    bottom: 7 - topValue,
    front: pick.front,
    back: 7 - pick.front,
    right: pick.right,
    left: 7 - pick.right,
  };
}

function createDiePips(value, size = "small") {
  const face = document.createElement("span");
  face.className = `die-pips ${size}`;

  const pipMap = {
    1: ["c"],
    2: ["tl", "br"],
    3: ["tl", "c", "br"],
    4: ["tl", "tr", "bl", "br"],
    5: ["tl", "tr", "c", "bl", "br"],
    6: ["tl", "tr", "ml", "mr", "bl", "br"],
  };

  const positions = pipMap[value] || pipMap[1];
  positions.forEach((pos) => {
    const pip = document.createElement("span");
    pip.className = `pip ${pos}`;
    face.appendChild(pip);
  });

  return face;
}

function showWinnerPopup(player) {
  if (!dom.winnerModal || !dom.winnerText) return;
  dom.winnerText.textContent = `${playerText(player)} oyuncusu oyunu kazandi. Tebrikler!`;
  dom.winnerModal.removeAttribute("hidden");
}

function hideWinnerPopup() {
  if (!dom.winnerModal) return;
  dom.winnerModal.setAttribute("hidden", "");
}

// ── Helpers ──────────────────────────────────────────────────────

function addLog(text) {
  moveLog.push(text);
  if (moveLog.length > LOG_LIMIT) moveLog = moveLog.slice(-LOG_LIMIT);
}

function setStatus(text) { statusMessage = text; }

function captureSnapshot() {
  return {
    gameState: cloneState(gameState),
    currentPlayer,
    remainingDice:  [...remainingDice],
    hasRolled,
    selectedSource,
    availableMoves: cloneMoves(availableMoves),
    winner,
    statusMessage,
    gameMode,
    moveLog:        [...moveLog],
    lastRolledDice: [...lastRolledDice],
    diceRollSettledAt,
  };
}

function canUndoCurrentTurn() {
  return Boolean(turnUndoSnapshot && hasRolled && !winner && !isBotTurn() && movesMadeThisTurn === 1 && !isAnimating);
}

function restoreSnapshot(snap) {
  gameState      = cloneState(snap.gameState);
  currentPlayer  = snap.currentPlayer;
  remainingDice  = [...snap.remainingDice];
  hasRolled      = snap.hasRolled;
  selectedSource = snap.selectedSource;
  availableMoves = cloneMoves(snap.availableMoves);
  winner         = snap.winner;
  statusMessage  = snap.statusMessage;
  gameMode       = snap.gameMode;
  moveLog        = [...snap.moveLog];
  lastRolledDice = [...(snap.lastRolledDice || [])];
  diceRollSettledAt = Number.isFinite(snap.diceRollSettledAt) ? Number(snap.diceRollSettledAt) : 0;
}

function fmtMove(player, move, hit) {
  const f = move.from === "bar" ? "bar" : String(move.from);
  const t = move.to   === "off" ? "off" : String(move.to);
  return `${playerText(player)}: ${f}→${t}(${move.die})${hit ? " ✕" : ""}`;
}

function isHitMove(state, player, move) {
  if (move.to === "off") return false;
  const dest = state.points[move.to - 1];
  return dest.owner === opponentOf(player) && dest.count === 1;
}

// ── Smarter Bot ──────────────────────────────────────────────────

function chooseBotMove(state, player, moves) {
  let best = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    const s = scoreBotMove(state, player, m);
    if (s > bestScore || (s === bestScore && Math.random() > 0.55)) {
      bestScore = s; best = m;
    }
  }
  return best;
}

function scoreBotMove(state, player, move) {
  const hit  = isHitMove(state, player, move);
  const next = applyMove(state, player, move);
  const opp  = opponentOf(player);
  let score  = 0;

  if (move.to === "off")  return 250;
  if (move.from === "bar") score += 60;
  if (hit) {
    score += 90;
    score += getPlayerProgress(state, opp) * 40;
  }

  if (move.to !== "off") {
    const dest = next.points[move.to - 1];
    if (dest.owner === player) {
      if (dest.count >= 2) score += 35;
      if (dest.count >= 4) score += 10;
      if (dest.count === 1) score -= getHitThreat(next, player, move.to) * 18;
    }
  }

  score += moveProgress(player, move.from, move.to) * 4;
  if (move.to !== "off" && isHomePoint(player, move.to)) score += 10;
  score += move.die;

  return score;
}

function getPlayerProgress(state, player) {
  let dist = 0;
  for (let pt = 1; pt <= POINT_COUNT; pt++) {
    const ps = state.points[pt - 1];
    if (ps.owner === player) dist += ps.count * (player === WHITE ? pt : 25 - pt);
  }
  dist += state.bar[player] * 25;
  return 1 - dist / (CHECKERS_PER_PLAYER * 24);
}

function moveProgress(player, from, to) {
  if (to === "off")   return player === WHITE ? from : 25 - from;
  if (from === "bar") return player === WHITE ? 25 - to : to;
  return Math.abs(to - from);
}

function getHitThreat(state, player, point) {
  const opp = opponentOf(player);
  let t = 0;
  for (let src = 1; src <= POINT_COUNT; src++) {
    const ps = state.points[src - 1];
    if (ps.owner !== opp || ps.count === 0) continue;
    const d = (point - src) * directionOf(opp);
    if (d >= 1 && d <= 6) t++;
  }
  if (state.bar[opp] > 0) {
    const dn = opp === WHITE ? 25 - point : point;
    if (dn >= 1 && dn <= 6) t += 2;
  }
  return t;
}

// ── Game Logic ───────────────────────────────────────────────────

function getSelectableSources() {
  return new Set(availableMoves.map(m => m.from));
}

function getOptimalMoves(state, player, dice) {
  const all = getAllMoves(state, player, dice);
  if (!all.length) return [];

  // If only one checker remains and it can bear off, allow immediate win move.
  if (countCheckersInPlay(state, player) === 1) {
    const offMoves = all.filter((m) => m.to === "off");
    if (offMoves.length) {
      const bestDie = Math.max(...offMoves.map((m) => m.die));
      return uniqueMoves(offMoves.filter((m) => m.die === bestDie));
    }
  }

  const memo = new Map();
  const maxD = maxMoves(state, player, dice, memo);
  let opt = [];

  for (const m of all) {
    const ns = applyMove(state, player, m);
    const nd = removeOneDie(dice, m.die);
    if (1 + maxMoves(ns, player, nd, memo) === maxD) opt.push(m);
  }

  const diffDice = new Set(dice).size > 1;
  if (maxD === 1 && dice.length >= 2 && diffDice) {
    const hi = Math.max(...opt.map(m => m.die));
    opt = opt.filter(m => m.die === hi);
  }

  return uniqueMoves(opt);
}

function maxMoves(state, player, dice, memo) {
  if (!dice.length) return 0;
  const key = serialize(state, player, dice);
  if (memo.has(key)) return memo.get(key);
  const moves = getAllMoves(state, player, dice);
  if (!moves.length) { memo.set(key, 0); return 0; }
  let best = 0;
  for (const m of moves) {
    const v = 1 + maxMoves(applyMove(state, player, m), player, removeOneDie(dice, m.die), memo);
    if (v > best) best = v;
  }
  memo.set(key, best);
  return best;
}

function getAllMoves(state, player, dice) {
  const moves = [];
  for (const die of [...new Set(dice)]) moves.push(...getMovesForDie(state, player, die));
  return uniqueMoves(moves);
}

function getMovesForDie(state, player, die) {
  const sources = collectSources(state, player);
  const opp     = opponentOf(player);
  const moves   = [];

  for (const src of sources) {
    const tgt = src === "bar" ? entryFromBar(player, die) : src + directionOf(player) * die;

    if (tgt >= 1 && tgt <= POINT_COUNT) {
      const ps = state.points[tgt - 1];
      if (ps.owner === opp && ps.count >= 2) continue;
      moves.push({ from: src, to: tgt, die });
      continue;
    }

    if (src === "bar") continue;
    if (canBearOff(state, player, src, die)) moves.push({ from: src, to: "off", die });
  }

  return moves;
}

function collectSources(state, player) {
  if (state.bar[player] > 0) return ["bar"];
  const s = [];
  for (let pt = 1; pt <= POINT_COUNT; pt++) {
    const ps = state.points[pt - 1];
    if (ps.owner === player && ps.count > 0) s.push(pt);
  }
  return s;
}

function canBearOff(state, player, src, die) {
  if (state.bar[player] > 0)   return false;
  if (!isHomePoint(player, src)) return false;
  if (!allInHome(state, player)) return false;
  const dist = player === WHITE ? src : 25 - src;
  if (die === dist) return true;
  if (die < dist)   return false;
  if (player === WHITE) {
    for (let pt = src + 1; pt <= 6; pt++) {
      const ps = state.points[pt - 1];
      if (ps.owner === WHITE && ps.count > 0) return false;
    }
    return true;
  }
  for (let pt = 19; pt < src; pt++) {
    const ps = state.points[pt - 1];
    if (ps.owner === BLACK && ps.count > 0) return false;
  }
  return true;
}

function allInHome(state, player) {
  for (let pt = 1; pt <= POINT_COUNT; pt++) {
    if (!isHomePoint(player, pt)) {
      const ps = state.points[pt - 1];
      if (ps.owner === player && ps.count > 0) return false;
    }
  }
  return true;
}

function countCheckersInPlay(state, player) {
  let total = state.bar[player];
  for (let pt = 1; pt <= POINT_COUNT; pt++) {
    const ps = state.points[pt - 1];
    if (ps.owner === player) total += ps.count;
  }
  return total;
}

function isHomePoint(player, pt) {
  return player === WHITE ? pt >= 1 && pt <= 6 : pt >= 19 && pt <= 24;
}

function applyMove(state, player, move) {
  const next = cloneState(state);
  const opp  = opponentOf(player);

  if (move.from === "bar") {
    next.bar[player]--;
  } else {
    const src = next.points[move.from - 1];
    src.count--;
    if (src.count === 0) src.owner = null;
  }

  if (move.to === "off") { next.borneOff[player]++; return next; }

  const dest = next.points[move.to - 1];
  if (dest.owner === opp && dest.count === 1) {
    dest.owner = player; dest.count = 1;
    next.bar[opp]++;
    return next;
  }
  if (!dest.owner) { dest.owner = player; dest.count = 1; return next; }
  dest.count++;
  return next;
}

function cloneState(state) {
  return {
    points:   state.points.map(p => ({ owner: p.owner, count: p.count })),
    bar:      { [WHITE]: state.bar[WHITE], [BLACK]: state.bar[BLACK] },
    borneOff: { [WHITE]: state.borneOff[WHITE], [BLACK]: state.borneOff[BLACK] },
  };
}

function cloneMoves(moves) { return moves.map(m => ({ ...m })); }

function pickPreferred(moves) {
  if (!moves.length) return null;
  return [...moves].sort((a, b) => b.die - a.die)[0];
}

function uniqueMoves(moves) {
  const seen = new Set(); const out = [];
  for (const m of moves) {
    const k = `${m.from}-${m.to}-${m.die}`;
    if (!seen.has(k)) { seen.add(k); out.push(m); }
  }
  return out;
}

function serialize(state, player, dice) {
  const pts = state.points.map(p => (!p.owner || !p.count ? "0" : `${p.owner[0]}${p.count}`)).join(".");
  return `${player}|${[...dice].sort().join("")}|b${state.bar[WHITE]}-${state.bar[BLACK]}|o${state.borneOff[WHITE]}-${state.borneOff[BLACK]}|${pts}`;
}

function removeOneDie(dice, val) {
  const i = dice.findIndex(d => d === val);
  if (i === -1) return [...dice];
  return [...dice.slice(0, i), ...dice.slice(i + 1)];
}

function entryFromBar(player, die) { return player === WHITE ? 25 - die : die; }
function directionOf(player)       { return player === WHITE ? -1 : 1; }
function opponentOf(player)        { return player === WHITE ? BLACK : WHITE; }
function getBotColor()             { return opponentOf(preferredPlayerColor); }
function playerText(player)        { return player === WHITE ? "Beyaz" : "Siyah"; }
function isBotTurn()               { return gameMode === "bot" && currentPlayer === getBotColor() && !winner; }
function randomDie()               { return Math.floor(Math.random() * 6) + 1; }
