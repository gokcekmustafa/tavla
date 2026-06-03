const WHITE = "white";
const BLACK = "black";
const POINT_COUNT = 24;
const CHECKERS_PER_PLAYER = 15;
const BOT_DELAY_MS = 800;
const BOT_AFTER_DICE_REVEAL_MS = 260;
const BOT_DIFFICULTY_EASY = "easy";
const BOT_DIFFICULTY_MEDIUM = "medium";
const BOT_DIFFICULTY_HARD = "hard";
const BOT_THINK_DELAY_BY_LEVEL = {
  [BOT_DIFFICULTY_EASY]: 980,
  [BOT_DIFFICULTY_MEDIUM]: BOT_DELAY_MS,
  [BOT_DIFFICULTY_HARD]: 420,
};
const BOT_DICE_OUTCOMES = buildBotDiceOutcomes();
const LOG_LIMIT = 140;
const ANIM_MS = 380;
const AUTO_ROLL_DELAY_MS = 520;
const TOUCH_DOUBLE_TAP_WINDOW_MS = 320;
const ROOM_CHANNEL_PREFIX = "tavla-room-";
const ROOM_RECONNECT_BASE_MS = 1200;
const ROOM_RECONNECT_MAX_MS = 10000;
const DICE_SPRITE_COLUMNS = 15;
const DICE_SPRITE_ROWS = 7;
const DICE_SPRITE_PATH = "./assets/theme/dice-roll-sprite.png";
const DICE_SPRITE_ALPHA_THRESHOLD = 16;
const DICE_SPRITE_RANDOM_FRAME_COUNT = 24;
const DICE_ROLL_TOTAL_MS = 1750;
const DICE_ROLL_STAGGER_MS = 120;
const DICE_RESULT_VISIBLE_MS = 1200;
const DICE_PASS_AFTER_REVEAL_MS = 420;
const SHOW_MOVE_PATH_GUIDES = true;
const CHECKER_SIZE_MIN = 16;
const CHECKER_SIZE_MAX = 48;
const CHECKER_VISIBLE_PER_POINT = 6;
const TABLE_CHAT_LIMIT = 80;
const TABLE_CHAT_TEXT_MAX = 180;

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
  botDifficultyControl: document.getElementById("bot-difficulty-control"),
  botDifficultySelect: document.getElementById("bot-difficulty-select"),
  colorWhiteInput: document.getElementById("player-color-white"),
  colorBlackInput: document.getElementById("player-color-black"),
  autoRollToggle:  document.getElementById("auto-roll-toggle"),
  autoRollToggleSide: document.getElementById("auto-roll-toggle-side"),
  moveLog:         document.getElementById("move-log"),
  tableChatLog:    document.getElementById("table-chat-log"),
  tableChatInput:  document.getElementById("table-chat-input"),
  tableChatSendBtn: document.getElementById("table-chat-send-btn"),
  tableChatEmojiRow: document.getElementById("table-chat-emoji-row"),
  tableChatHint:   document.getElementById("table-chat-hint"),
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
  roomBootNote:    document.getElementById("room-boot-note"),
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
let botDifficulty     = normalizeBotDifficulty(window.__BOOT_BOT_DIFFICULTY__);
let moveLog           = [];
let pendingBotTimer   = null;
let pendingAutoRollTimer = null;
let pendingFinishTurnTimer = null;
let pendingCheckerSelectTimer = null;
let turnUndoSnapshot  = null;
let turnUndoStack     = [];
let movesMadeThisTurn = 0;
let turnRollMoveCount = 0;
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
let roomReconnectDelayMs = ROOM_RECONNECT_BASE_MS;
let roomSyncCounter   = 0;
const roomPendingMessages = [];
let preferredPlayerColor = WHITE;
let diceRollSettledAt = 0;
let boardPerspectiveColor = null;
let diceSpriteSheetPromise = null;
let diceSpriteSheet = null;
const diceSpriteCanvasState = new WeakMap();
const diceSpriteSheetMeta = new WeakMap();
let centerDiceVisibleUntil = 0;
let centerDiceClearTimer = null;
let matchToken = createMatchToken();
let lastHostStateSignature = "";
let hostActivityTick = 0;
let tableChatRows = [];
let roomStartGateActive = false;
let roomStartGateBothSeated = true;
let roomStartGateStarted = true;
let pointerHintEl = null;
let pointerHintTimer = null;
let lastTouchTapSource = null;
let lastTouchTapAt = 0;

const roomParams = parseRoomParamsSafe();
const roomSenderCounters = new Map();
const roomQueryParams = new URLSearchParams(window.location.search);
const memberChatEnabledFromQuery = roomQueryParams.get("member") === "1";
let tableChatCanView = isRoomMode();
let tableChatCanWrite = memberChatEnabledFromQuery && isRoomMode();
roomStartGateActive = isRoomMode() && !roomParams.observer;
roomStartGateBothSeated = !roomStartGateActive;
roomStartGateStarted = !roomStartGateActive;

initPreferredPlayerColor();
void preloadDiceSpriteSheet();
buildBoard();
attachEvents();
initRoomMode();
render();
announceRoomJoin();
notifyHostTableChatReady();

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
  const observer = params.get("observer") === "1";
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
    enabled: Boolean(roomCode && (seatParam === WHITE || seatParam === BLACK || observer)),
    code: roomCode,
    roomName,
    tableNo,
    seat,
    observer,
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
  const observer = params.get("observer") === "1";
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
    enabled: Boolean(roomCode && (seatParam === WHITE || seatParam === BLACK || observer)),
    code: roomCode,
    roomName,
    tableNo,
    seat,
    observer,
    session: sessionRaw || createRoomSessionId(),
    guest: guestRaw || "Misafir",
    syncWs: normalizeRoomSyncWsBase(syncWsRaw),
  };
}

function normalizePlayerColor(value) {
  return value === BLACK ? BLACK : WHITE;
}

function normalizeBotDifficulty(value) {
  if (value === BOT_DIFFICULTY_EASY || value === BOT_DIFFICULTY_HARD) return value;
  return BOT_DIFFICULTY_MEDIUM;
}

function getBotDifficultyLabel(level) {
  const normalized = normalizeBotDifficulty(level);
  if (normalized === BOT_DIFFICULTY_EASY) return "Kolay";
  if (normalized === BOT_DIFFICULTY_HARD) return "Zor";
  return "Orta";
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

function createMatchToken() {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isRoomMode() {
  return roomParams.enabled;
}

function getPerspectiveColor() {
  return isRoomMode() ? roomParams.seat : preferredPlayerColor;
}

function getDiceStageSideForPlayer(player) {
  const rollingPlayer = normalizePlayerColor(player);
  const perspective = getPerspectiveColor();
  return rollingPlayer === perspective ? "right" : "left";
}

function positionCenterDiceStage(side) {
  if (!dom.centerDiceStage || !dom.tableWrap || !dom.boardGrid) return;
  const tableRect = dom.tableWrap.getBoundingClientRect();
  const boardRect = dom.boardGrid.getBoundingClientRect();
  if (!tableRect.width || !boardRect.width || !boardRect.height) return;

  const xRatio = side === "left" ? 0.25 : 0.75;
  const targetX = boardRect.left - tableRect.left + boardRect.width * xRatio;
  const targetY = boardRect.top - tableRect.top + boardRect.height * 0.5;

  dom.centerDiceStage.style.setProperty("--dice-stage-x", `${targetX.toFixed(2)}px`);
  dom.centerDiceStage.style.setProperty("--dice-stage-y", `${targetY.toFixed(2)}px`);
  dom.centerDiceStage.dataset.side = side;
}

function isBlackPerspective() {
  return getPerspectiveColor() === BLACK;
}

function toLogicalPoint(viewPoint) {
  if (!Number.isInteger(viewPoint)) return null;
  if (viewPoint < 1 || viewPoint > POINT_COUNT) return null;
  return isBlackPerspective() ? (POINT_COUNT + 1 - viewPoint) : viewPoint;
}

function isLocalSeatTurn() {
  if (!isRoomMode()) return true;
  if (roomParams.observer) return false;
  return currentPlayer === roomParams.seat;
}

function isRoomStartLocked() {
  if (!roomStartGateActive) return false;
  return !roomStartGateBothSeated || !roomStartGateStarted;
}

function getRoomStartLockedMessage() {
  if (!roomStartGateActive) return "";
  if (!roomStartGateBothSeated) return "İkinci oyuncu bekleniyor.";
  return "İki oyuncu da Oyuna Başla butonuna basmalı.";
}

function getBootLogMessage() {
  if (isRoomMode()) {
    if (roomParams.observer) {
      return `${roomParams.roomName} / Masa ${roomParams.tableNo} izleyici modunda açıldı.`;
    }
    return `${roomParams.roomName} / Masa ${roomParams.tableNo} açıldı. Sen ${playerText(roomParams.seat)} oyuncususun.`;
  }
  return gameMode === "bot" ? "Bilgisayara karşı modda yeni oyun hazır." : "Yeni oyun hazır.";
}

function syncModeBodyClasses() {
  const enableBotLayout = !isRoomMode() && gameMode === "bot";
  document.body.classList.toggle("bot-mode", enableBotLayout);
}

function initRoomMode() {
  if (!isRoomMode()) return;

  document.body.classList.add("room-mode");

  gameMode = "local";
  botDifficulty = BOT_DIFFICULTY_MEDIUM;
  preferredPlayerColor = roomParams.seat;
  if (dom.modeSelect) {
    dom.modeSelect.value = "local";
    dom.modeSelect.disabled = true;
  }
  if (dom.botDifficultySelect) {
    dom.botDifficultySelect.value = BOT_DIFFICULTY_MEDIUM;
    dom.botDifficultySelect.disabled = true;
  }

  if (dom.roomMeta) {
    dom.roomMeta.removeAttribute("hidden");
  }
  if (dom.roomMetaCode) {
    dom.roomMetaCode.textContent = `Oda: ${roomParams.roomName} (Kod: ${roomParams.code})`;
  }
  if (dom.roomMetaSeat) {
    dom.roomMetaSeat.textContent = roomParams.observer
      ? `Masa: ${roomParams.tableNo} / Sen: İzleyici`
      : `Masa: ${roomParams.tableNo} / Sen: ${playerText(roomParams.seat)}`;
  }

  setStatus(`${roomParams.roomName} - Masa ${roomParams.tableNo} aktif. Sıra ${playerText(currentPlayer)} oyuncusunda.`);
  initRoomChannel();
}

function initRoomChannel() {
  if (!isRoomMode()) return;
  const wsUrl = buildRoomSyncUrl();
  if (!wsUrl) {
    addLog("Oda senkron adresi geçersiz.");
    return;
  }

  try {
    roomSocket = new WebSocket(wsUrl);
  } catch (error) {
    roomSocket = null;
    roomChannel = null;
    addLog("Oda senkronu açılamadı.");
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
    roomReconnectDelayMs = ROOM_RECONNECT_BASE_MS;
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
    addLog("Oda bağlantısı koptu. Yeniden bağlanıyor...");
    scheduleRoomReconnect();
  });

  roomSocket.addEventListener("error", () => {
    addLog("Oda bağlantısında hata.");
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
  const delayMs = Math.max(
    ROOM_RECONNECT_BASE_MS,
    Math.min(ROOM_RECONNECT_MAX_MS, roomReconnectDelayMs || ROOM_RECONNECT_BASE_MS)
  );
  roomReconnectTimer = window.setTimeout(() => {
    roomReconnectTimer = null;
    initRoomChannel();
  }, delayMs);
  roomReconnectDelayMs = Math.min(
    ROOM_RECONNECT_MAX_MS,
    Math.max(ROOM_RECONNECT_BASE_MS, Math.floor(delayMs * 1.7))
  );
}

function announceRoomJoin() {
  if (!isRoomMode() || !roomChannel) return;
  sendRoomMessage("hello");
}

function notifyHostTableChatReady() {
  if (!window.parent || window.parent === window) return;
  window.parent.postMessage(
    {
      source: "tavla-legacy",
      type: "table-chat-ready",
    },
    window.location.origin
  );
}

function sanitizeTableChatText(raw) {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, TABLE_CHAT_TEXT_MAX);
}

function normalizeTableChatMessage(raw) {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw;
  const id = typeof candidate.id === "string" ? candidate.id.trim().slice(0, 64) : "";
  const text = sanitizeTableChatText(typeof candidate.text === "string" ? candidate.text : "");
  if (!id || !text) return null;
  const at = Number.isFinite(candidate.at) ? Number(candidate.at) : Date.now();
  const displayNameRaw = typeof candidate.displayName === "string" ? candidate.displayName.trim() : "";
  const displayName = displayNameRaw ? displayNameRaw.slice(0, 32) : "Oyuncu";
  return {
    id,
    at,
    displayName,
    text,
  };
}

function normalizeTableChatRows(raw) {
  if (!Array.isArray(raw)) return [];
  const byId = new Map();
  raw.forEach((item) => {
    const row = normalizeTableChatMessage(item);
    if (!row) return;
    const existing = byId.get(row.id);
    if (!existing || row.at >= existing.at) {
      byId.set(row.id, row);
    }
  });
  return [...byId.values()]
    .sort((a, b) => a.at - b.at || a.id.localeCompare(b.id))
    .slice(-TABLE_CHAT_LIMIT);
}

function formatTableChatTime(timestamp) {
  const date = new Date(Number.isFinite(timestamp) ? timestamp : Date.now());
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

function applyHostTableChatSync(payload) {
  const canView = Boolean(payload && payload.canView);
  const canWrite = Boolean(payload && payload.canWrite);
  tableChatCanView = canView;
  tableChatCanWrite = canView && canWrite;
  tableChatRows = canView ? normalizeTableChatRows(payload?.rows) : [];
  renderTableChat();
}

function renderTableChat() {
  if (!dom.tableChatLog || !dom.tableChatInput || !dom.tableChatSendBtn) return;
  dom.tableChatLog.innerHTML = "";

  if (!tableChatCanView) {
    const empty = document.createElement("p");
    empty.className = "table-chat-empty";
    empty.textContent = "Masa sohbetini sadece masadaki oyuncular görebilir.";
    dom.tableChatLog.appendChild(empty);
  } else if (!tableChatRows.length) {
    const empty = document.createElement("p");
    empty.className = "table-chat-empty";
    empty.textContent = "Masa sohbeti henüz boş.";
    dom.tableChatLog.appendChild(empty);
  } else {
    tableChatRows.forEach((row) => {
      const article = document.createElement("article");
      article.className = "table-chat-row";

      const meta = document.createElement("div");
      meta.className = "table-chat-meta";

      const name = document.createElement("strong");
      name.textContent = row.displayName;
      const time = document.createElement("time");
      time.textContent = formatTableChatTime(row.at);
      meta.appendChild(name);
      meta.appendChild(time);

      const text = document.createElement("p");
      text.textContent = row.text;

      article.appendChild(meta);
      article.appendChild(text);
      dom.tableChatLog.appendChild(article);
    });
  }

  dom.tableChatInput.disabled = !tableChatCanWrite;
  dom.tableChatInput.placeholder = tableChatCanWrite ? "Masaya mesaj yaz..." : "Yazmak için üye girişi yap";
  dom.tableChatSendBtn.disabled = !tableChatCanWrite;

  if (dom.tableChatEmojiRow) {
    const buttons = dom.tableChatEmojiRow.querySelectorAll("button");
    buttons.forEach((button) => {
      button.disabled = !tableChatCanWrite;
    });
  }

  if (dom.tableChatHint) {
    dom.tableChatHint.textContent = tableChatCanWrite
      ? "Son mesajlar altta görünür."
      : "Masa sohbetine sadece üye oyuncular yazabilir.";
  }

  window.requestAnimationFrame(() => {
    if (!dom.tableChatLog) return;
    dom.tableChatLog.scrollTop = dom.tableChatLog.scrollHeight;
  });
}

function sendTableChatToHost(rawText) {
  const text = sanitizeTableChatText(rawText);
  if (!text) return;
  if (!tableChatCanWrite) {
    renderTableChat();
    return;
  }
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(
      {
        source: "tavla-legacy",
        type: "table-chat-send",
        text,
      },
      window.location.origin
    );
  }
  if (dom.tableChatInput) {
    dom.tableChatInput.value = "";
  }
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
  bumpHostActivity();
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
    turnRollMoveCount,
    matchToken,
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
  clearPendingFinishTurnTimer();
  const prevDiceRollSettledAt = diceRollSettledAt;
  const prevLastRolledDice = [...lastRolledDice];
  const prevLastDicePlayer = lastDicePlayer;

  gameState = cloneState(snapshot.gameState || createInitialState());
  currentPlayer = snapshot.currentPlayer === BLACK ? BLACK : WHITE;
  matchToken = typeof snapshot.matchToken === "string" && snapshot.matchToken
    ? snapshot.matchToken.slice(0, 96)
    : matchToken;
  remainingDice = Array.isArray(snapshot.remainingDice)
    ? snapshot.remainingDice.filter((d) => Number.isInteger(d) && d >= 1 && d <= 6)
    : [];
  turnRollMoveCount = Number.isInteger(snapshot.turnRollMoveCount)
    ? Math.max(0, Number(snapshot.turnRollMoveCount))
    : remainingDice.length;
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
  const hasIncomingDice = lastRolledDice.length >= 2;
  const diceChanged = hasIncomingDice && (
    prevLastRolledDice[0] !== lastRolledDice[0]
    || prevLastRolledDice[1] !== lastRolledDice[1]
    || prevLastDicePlayer !== lastDicePlayer
  );
  const hasNewRollStamp = diceRollSettledAt > prevDiceRollSettledAt + 60;

  gameMode = "local";
  selectedSource = null;
  dragSource = null;
  pendingMoveChain = [];
  turnUndoSnapshot = null;
  turnUndoStack = [];
  movesMadeThisTurn = 0;
  turnRollMoveCount = 0;
  isAnimating = false;
  availableMoves = hasRolled ? getOptimalMoves(gameState, currentPlayer, remainingDice) : [];

  if (winner) showWinnerPopup(winner);
  else hideWinnerPopup();

  if (hasIncomingDice && (diceChanged || hasNewRollStamp)) {
    showCenterDice(lastRolledDice[0], lastRolledDice[1] ?? lastRolledDice[0], lastDicePlayer);
  } else if (!hasRolled && !lastRolledDice.length) {
    clearCenterDiceStage();
  }

  bumpHostActivity();
  render();
  maybeScheduleAutoRoll();
  isApplyingRemoteState = false;
}

function canControlRoomAction() {
  if (!isRoomMode()) return true;
  if (roomParams.observer) {
    setStatus("İzleyici modunda hamle yapamazsın.");
    render();
    return false;
  }
  if (isRoomStartLocked()) {
    setStatus(getRoomStartLockedMessage());
    render();
    return false;
  }
  if (winner) return false;
  if (isLocalSeatTurn()) return true;
  setStatus(`Sıra ${playerText(currentPlayer)} oyuncusunda. Sen ${playerText(roomParams.seat)} bekliyorsun.`);
  render();
  return false;
}

// ── Build Board ──────────────────────────────────────────────────

function buildBoard() {
  const perspective = getPerspectiveColor();
  boardPerspectiveColor = perspective;
  dom.tableWrap?.classList.toggle("perspective-black", perspective === BLACK);

  pointElements.clear();
  barSlotElements.clear();
  dom.boardGrid.innerHTML = "";

  const topRow    = [13,14,15,16,17,18, null, 19,20,21,22,23,24];
  const bottomRow = [12,11,10, 9, 8, 7, null,  6, 5, 4, 3, 2, 1];

  renderRow(topRow,    "top",    1);
  renderRow(bottomRow, "bottom", 2);

  const barZone = document.createElement("div");
  barZone.className = "bar-zone";
  barZone.id = "bar-zone";
  const barOrder = perspective === BLACK
    ? [WHITE, BLACK]
    : [BLACK, WHITE];
  barOrder.forEach((player) => {
    barZone.appendChild(createBarSlot(player, playerText(player)));
  });
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
  rowConfig.forEach((viewPoint, index) => {
    if (!viewPoint) return;
    const point = toLogicalPoint(viewPoint);
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

function ensureBoardPerspective() {
  const currentPerspective = getPerspectiveColor();
  if (boardPerspectiveColor === currentPerspective) return;
  buildBoard();
  syncCheckerSizeToBoard();
}

// ── Events ───────────────────────────────────────────────────────

function attachEvents() {
  dom.rollBtn.addEventListener("click",  onRollDice);
  dom.newGameBtn.addEventListener("click", onNewGame);
  dom.undoBtn.addEventListener("click",  onUndoMove);
  dom.modeSelect.addEventListener("change", onModeChange);
  dom.botDifficultySelect?.addEventListener("change", onBotDifficultyChange);
  dom.colorWhiteInput?.addEventListener("change", onPreferredColorChange);
  dom.colorBlackInput?.addEventListener("change", onPreferredColorChange);
  dom.autoRollToggle?.addEventListener("change", onAutoRollChange);
  dom.autoRollToggleSide?.addEventListener("change", onAutoRollChange);

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
    if (dom.centerDiceStage?.classList.contains("show")) {
      const currentSide = dom.centerDiceStage.dataset.side === "left" ? "left" : "right";
      positionCenterDiceStage(currentSide);
    }
  });
  window.addEventListener("message", onHostMessage);
  dom.tableChatSendBtn?.addEventListener("click", () => sendTableChatToHost(dom.tableChatInput?.value || ""));
  dom.tableChatInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    sendTableChatToHost(dom.tableChatInput?.value || "");
  });
  dom.tableChatEmojiRow?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const emoji = target.dataset.chatEmoji;
    if (!emoji) return;
    sendTableChatToHost(emoji);
  });
}

function getLocalHumanColor() {
  if (isRoomMode()) return roomParams.observer ? null : roomParams.seat;
  if (gameMode === "bot") return preferredPlayerColor;
  return null;
}

function isMatchActive() {
  if (winner) return false;
  if (hasRolled) return true;
  if (gameState.bar[WHITE] + gameState.bar[BLACK] > 0) return true;
  if (gameState.borneOff[WHITE] + gameState.borneOff[BLACK] > 0) return true;
  return moveLog.length > 1;
}

function bumpHostActivity() {
  hostActivityTick = (hostActivityTick + 1) % 1000000000;
  if (hostActivityTick <= 0) hostActivityTick = 1;
}

function emitHostState(force = false) {
  const payload = {
    source: "tavla-legacy",
    type: "state",
    matchToken,
    matchActive: isMatchActive(),
    winner: winner || null,
    localColor: getLocalHumanColor(),
    turn: currentPlayer,
    activityTick: hostActivityTick,
    roomCode: roomParams.code || "",
    tableNo: roomParams.tableNo || 0,
  };
  const signature = JSON.stringify(payload);
  if (!force && signature === lastHostStateSignature) return;
  lastHostStateSignature = signature;
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(payload, window.location.origin);
  }
}

function onHostMessage(event) {
  if (event.origin !== window.location.origin) return;
  const data = event.data;
  if (!data || typeof data !== "object") return;
  if (data.source !== "tavla-host") return;
  if (data.type === "room-start-gate") {
    const active = Boolean(data.active) && isRoomMode() && !roomParams.observer;
    roomStartGateActive = active;
    roomStartGateBothSeated = !active || Boolean(data.bothSeated);
    roomStartGateStarted = !active || Boolean(data.started);
    if (isRoomStartLocked()) {
      clearPendingAutoRollTimer();
    }
    render();
    return;
  }
  if (data.type === "table-chat-sync") {
    applyHostTableChatSync(data);
    return;
  }
  if (data.type === "request-soft-refresh") {
    selectedSource = null;
    dragSource = null;
    pendingMoveChain = [];
    availableMoves = hasRolled ? getOptimalMoves(gameState, currentPlayer, remainingDice) : [];
    render();
    maybeScheduleBotAction();
    maybeScheduleAutoRoll();
    if (isRoomMode()) {
      sendRoomMessage("hello");
    } else {
      emitHostState(true);
    }
    return;
  }
  if (data.type !== "request-resign" && data.type !== "request-timeout-win") return;

  const incomingToken = typeof data.matchToken === "string" ? data.matchToken.slice(0, 96) : "";
  if (incomingToken) {
    matchToken = incomingToken;
  }
  const forceLocalWin = data.type === "request-timeout-win";
  const localColor = getLocalHumanColor();
  if (!localColor) return;
  if (winner || !isMatchActive()) return;

  clearPendingBotTimer();
  clearPendingAutoRollTimer();
  clearPendingFinishTurnTimer();
  winner = forceLocalWin ? localColor : opponentOf(localColor);
  hasRolled = false;
  remainingDice = [];
  availableMoves = [];
  selectedSource = null;
  dragSource = null;
  pendingMoveChain = [];
  movesMadeThisTurn = 0;
  turnRollMoveCount = 0;
  turnUndoSnapshot = null;
  turnUndoStack = [];
  if (forceLocalWin) {
    const opponent = opponentOf(localColor);
    setStatus(`${playerText(opponent)} 1 dakika hamle yapmadı. ${playerText(winner)} kazandı.`);
    addLog(`${playerText(opponent)} süre aşımı nedeniyle kaybetti.`);
  } else {
    setStatus(`${playerText(localColor)} masadan kalktı. ${playerText(winner)} kazandı.`);
    addLog(`${playerText(localColor)} masadan ayrıldı.`);
  }
  bumpHostActivity();
  showWinnerPopup(winner);
  publishRoomSnapshot(forceLocalWin ? "host-timeout-win" : "host-resign");
  render();
}

function onNewGame() {
  ensureBoardPerspective();
  if (isRoomMode() && roomParams.observer) {
    setStatus("İzleyici modunda yeni oyun başlatamazsın.");
    render();
    return;
  }
  if (isRoomMode() && roomParams.seat !== WHITE) {
    setStatus("Yeni oyunu Beyaz oyuncu başlatabilir.");
    render();
    return;
  }
  clearPendingBotTimer();
  clearPendingAutoRollTimer();
  clearPendingFinishTurnTimer();
  const startPlayer = isRoomMode() ? WHITE : normalizePlayerColor(preferredPlayerColor);
  gameState         = createInitialState();
  matchToken        = createMatchToken();
  lastHostStateSignature = "";
  currentPlayer     = startPlayer;
  remainingDice     = [];
  hasRolled         = false;
  selectedSource    = null;
  availableMoves    = [];
  winner            = null;
  moveLog           = [];
  turnUndoSnapshot  = null;
  turnUndoStack     = [];
  movesMadeThisTurn = 0;
  turnRollMoveCount = 0;
  dragSource        = null;
  pendingMoveChain  = [];
  lastRolledDice    = [];
  lastDicePlayer    = startPlayer;
  diceRollSettledAt = 0;
  isAnimating       = false;
  setStatus(`Yeni oyun başladı. ${playerText(currentPlayer)} zar atsın.`);
  addLog("Yeni oyun başladı.");
  hideWinnerPopup();
  clearCenterDiceStage(true);
  render();
  maybeScheduleAutoRoll();
  publishRoomSnapshot("new-game");
}

function onModeChange() {
  if (isRoomMode()) {
    dom.modeSelect.value = "local";
    setStatus("Oda modunda bot kapalı.");
    render();
    return;
  }
  const next = dom.modeSelect.value === "bot" ? "bot" : "local";
  if (next === gameMode) return;
  gameMode = next;
  clearPendingBotTimer();
  clearPendingAutoRollTimer();
  clearPendingFinishTurnTimer();
  turnUndoSnapshot  = null;
  turnUndoStack     = [];
  movesMadeThisTurn = 0;
  turnRollMoveCount = 0;
  dragSource        = null;
  pendingMoveChain  = [];
  if (gameMode === "bot") {
    setStatus(`Bilgisayara karşı mod aktif (${getBotDifficultyLabel(botDifficulty)}).`);
    addLog(`Mod: Bilgisayara karşı (${getBotDifficultyLabel(botDifficulty)}).`);
  } else {
    setStatus("İki oyunculu mod aktif.");
    addLog("Mod: İki oyuncu.");
  }
  render();
  maybeScheduleBotAction();
  maybeScheduleAutoRoll();
}

function onBotDifficultyChange() {
  if (isRoomMode()) {
    if (dom.botDifficultySelect) {
      dom.botDifficultySelect.value = BOT_DIFFICULTY_MEDIUM;
      dom.botDifficultySelect.disabled = true;
    }
    botDifficulty = BOT_DIFFICULTY_MEDIUM;
    render();
    return;
  }

  const next = normalizeBotDifficulty(dom.botDifficultySelect?.value);
  if (next === botDifficulty) return;
  botDifficulty = next;
  addLog(`Bot zorluk: ${getBotDifficultyLabel(botDifficulty)}.`);
  if (gameMode === "bot") {
    setStatus(`Bot zorluğu ${getBotDifficultyLabel(botDifficulty)} olarak ayarlandı.`);
    maybeScheduleBotAction(120);
  }
  render();
}
function onPreferredColorChange() {
  if (isRoomMode()) {
    preferredPlayerColor = roomParams.seat;
    ensureBoardPerspective();
    render();
    return;
  }

  const nextColor = dom.colorBlackInput?.checked ? BLACK : WHITE;
  if (nextColor === preferredPlayerColor) return;
  preferredPlayerColor = normalizePlayerColor(nextColor);
  ensureBoardPerspective();

  addLog(`Pul rengi: ${playerText(preferredPlayerColor)}.`);
  onNewGame();
}

function setAutoRollToggleState(checked, disabled) {
  if (dom.autoRollToggle) {
    dom.autoRollToggle.checked = checked;
    if (typeof disabled === "boolean") {
      dom.autoRollToggle.disabled = disabled;
    }
  }
  if (dom.autoRollToggleSide) {
    dom.autoRollToggleSide.checked = checked;
    if (typeof disabled === "boolean") {
      dom.autoRollToggleSide.disabled = disabled;
    }
  }
}

function resolveRequestedAutoRollState(event) {
  const target = event?.currentTarget;
  if (target && typeof target === "object" && "checked" in target) {
    return Boolean(target.checked);
  }
  if (dom.autoRollToggleSide) return Boolean(dom.autoRollToggleSide.checked);
  return Boolean(dom.autoRollToggle?.checked);
}

function onAutoRollChange(event) {
  autoRollEnabled = resolveRequestedAutoRollState(event);
  clearPendingAutoRollTimer();
  if (isRoomStartLocked()) {
    autoRollEnabled = false;
    setAutoRollToggleState(false);
    setStatus(getRoomStartLockedMessage());
    render();
    return;
  }
  if (isRoomMode() && !isLocalSeatTurn()) {
    autoRollEnabled = false;
    setAutoRollToggleState(false);
    setStatus("Otomatik zar sadece kendi sıranızda açılabilir.");
    render();
    return;
  }
  setAutoRollToggleState(autoRollEnabled);
  addLog(autoRollEnabled ? "Otomatik zar açıldı." : "Otomatik zar kapatıldı.");
  if (autoRollEnabled && !winner && !hasRolled && !isBotTurn() && !isAnimating) {
    setStatus("Otomatik zar aktif. Zar birazdan atılacak.");
    maybeScheduleAutoRoll();
  } else {
    render();
  }
}

function onUndoMove() {
  if (!canControlRoomAction()) return;
  if (!canUndoCurrentTurn()) {
    setStatus("Bu aşamada geri alma kullanılamaz.");
    render();
    return;
  }
  clearPendingBotTimer();
  clearPendingAutoRollTimer();
  const snapshot = turnUndoStack.pop();
  if (!snapshot) {
    setStatus("Bu aşamada geri alma kullanılamaz.");
    render();
    return;
  }
  restoreSnapshot(snapshot);
  turnUndoSnapshot = turnUndoStack.length ? turnUndoStack[turnUndoStack.length - 1] : null;
  dragSource        = null;
  pendingMoveChain  = [];
  setStatus("Tür başına geri alındı. Devam edebilirsin.");
  render();
  maybeScheduleBotAction();
  maybeScheduleAutoRoll();
  publishRoomSnapshot("undo");
}

function onRollDice(arg) {
  const fromBot = Boolean(arg && arg.fromBot);
  clearPendingAutoRollTimer();
  clearPendingFinishTurnTimer();
  if (winner) return;
  if (!fromBot && !canControlRoomAction()) return;
  if (isRoomStartLocked()) { setStatus(getRoomStartLockedMessage()); render(); return; }
  if (isBotTurn() && !fromBot) { setStatus("Sıra bilgisayarda."); render(); return; }
  if (hasRolled) { setStatus("Zar zaten atıldı. Hamle yap."); render(); return; }

  const d1 = randomDie();
  const d2 = randomDie();
  lastDicePlayer    = currentPlayer;
  lastRolledDice    = [d1, d2];
  remainingDice     = d1 === d2 ? [d1,d1,d1,d1] : [d1,d2];
  hasRolled         = true;
  movesMadeThisTurn = 0;
  turnRollMoveCount = remainingDice.length;
  turnUndoStack     = [];
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
    turnUndoStack = [];
    turnRollMoveCount = 0;
    render();
    publishRoomSnapshot("roll-no-move");
    scheduleFinishTurnAfterDiceReveal(1300);
    return;
  }

  turnUndoSnapshot = null;
  setStatus(`${playerText(currentPlayer)}: kaynak taşı seç.`);
  render();
  publishRoomSnapshot("roll");
  maybeScheduleBotAction();
}

function onPointClick(e) {
  if (isAnimating) return;
  if (!canControlRoomAction()) return;
  const target = Number(e.currentTarget.dataset.point);
  if (selectedSource === null) {
    const selectable = getSelectableSources();
    if (gameState.bar[currentPlayer] > 0 && !selectable.has(target)) {
      setStatus("Önce kırık pulu girmelisiniz.");
      showPointerHint("Önce kırık pulu girmelisiniz.", e);
      render();
      return;
    }
  }
  handleSourceOrDest(target);
}

function onBarSlotClick(e) {
  if (isAnimating) return;
  if (!canControlRoomAction()) return;
  if (e.currentTarget.dataset.player !== currentPlayer) return;
  handleSourceOrDest("bar");
}

function onBarChipMouseDown(e) {
  if (winner || isAnimating || isBotTurn() || !hasRolled) return;
  if (!canControlRoomAction()) return;
  if (Number.isFinite(e.button) && e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  handleSourceOrDest("bar");
}

function onBarChipTouchStart(e) {
  if (winner || isAnimating || isBotTurn() || !hasRolled) return;
  if (!canControlRoomAction()) return;
  e.preventDefault();
  e.stopPropagation();

  if (consumeTouchDoubleTap("bar")) {
    const options = availableMoves.filter((m) => m.from === "bar");
    if (options.length !== 1) {
      handleSourceOrDest("bar");
      return;
    }
    pendingMoveChain = [];
    playMove(options[0]);
    return;
  }

  handleSourceOrDest("bar");
}

function onBarChipDoubleClick(e) {
  if (winner || isAnimating || isBotTurn() || !hasRolled) return;
  if (!canControlRoomAction()) return;
  e.preventDefault();
  e.stopPropagation();

  const options = availableMoves.filter((m) => m.from === "bar");
  if (options.length !== 1) {
    handleSourceOrDest("bar");
    return;
  }

  pendingMoveChain = [];
  playMove(options[0]);
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
    setStatus("Bu pul için hamle yok.");
    render();
    return;
  }

  pendingMoveChain = [];
  playMove(move);
}

function clearPendingCheckerSelectTimer() {
  if (pendingCheckerSelectTimer === null) return;
  window.clearTimeout(pendingCheckerSelectTimer);
  pendingCheckerSelectTimer = null;
}

function queueCheckerSelectionRender(source) {
  clearPendingCheckerSelectTimer();
  pendingCheckerSelectTimer = window.setTimeout(() => {
    pendingCheckerSelectTimer = null;
    if (dragSource !== null) return;
    if (isAnimating || winner || !hasRolled) return;
    if (selectedSource !== source) return;
    render();
  }, 0);
}

function onCheckerMouseDown(e) {
  if (winner || isAnimating || isBotTurn() || !hasRolled) return;
  if (!canControlRoomAction()) return;
  if (Number.isFinite(e.button) && e.button !== 0) return;
  const source = Number(e.currentTarget.dataset.source);
  if (!Number.isInteger(source)) return;
  const selectable = getSelectableSources();
  if (!selectable.has(source)) {
    if (gameState.bar[currentPlayer] > 0) {
      setStatus("Önce kırık pulu girmelisiniz.");
      showPointerHint("Önce kırık pulu girmelisiniz.", e);
      render();
    }
    return;
  }
  // Draggable pullarda native dragstart'in tetiklenmesini engellememek için
  // mousedown'da default davranışı koruyoruz.
  if (!e.currentTarget.draggable) {
    e.preventDefault();
  }
  e.stopPropagation();

  if (e.detail >= 2) {
    const move = getDoubleClickMove(source);
    if (!move) {
      setStatus("Bu pul için hamle yok.");
      render();
      return;
    }
    pendingMoveChain = [];
    playMove(move);
    return;
  }

  if (selectedSource === source) {
    selectedSource = null;
    queueCheckerSelectionRender(source);
    return;
  }
  selectedSource = source;
  queueCheckerSelectionRender(source);
}

function onCheckerTouchStart(e) {
  if (winner || isAnimating || isBotTurn() || !hasRolled) return;
  if (!canControlRoomAction()) return;
  const source = Number(e.currentTarget.dataset.source);
  if (!Number.isInteger(source)) return;
  const selectable = getSelectableSources();
  if (!selectable.has(source)) {
    if (gameState.bar[currentPlayer] > 0) {
      setStatus("Önce kırık pulu girmelisiniz.");
      showPointerHint("Önce kırık pulu girmelisiniz.", e);
      render();
    }
    return;
  }
  e.preventDefault();
  e.stopPropagation();

  if (consumeTouchDoubleTap(`point-${source}`)) {
    const move = getDoubleClickMove(source);
    if (!move) {
      setStatus("Bu pul için hamle yok.");
      render();
      return;
    }
    pendingMoveChain = [];
    playMove(move);
    return;
  }

  if (selectedSource === source) {
    selectedSource = null;
    queueCheckerSelectionRender(source);
    return;
  }
  selectedSource = source;
  queueCheckerSelectionRender(source);
}

function getDoubleClickMove(source) {
  const options = availableMoves.filter((m) => m.from === source);
  if (!options.length) return null;
  const maxDie = Math.max(...options.map((m) => m.die));
  const best = options.filter((m) => m.die === maxDie);
  return pickPreferred(best);
}

function consumeTouchDoubleTap(sourceKey) {
  const now = Date.now();
  const isDouble = lastTouchTapSource === sourceKey && (now - lastTouchTapAt) <= TOUCH_DOUBLE_TAP_WINDOW_MS;
  if (isDouble) {
    lastTouchTapSource = null;
    lastTouchTapAt = 0;
    return true;
  }
  lastTouchTapSource = sourceKey;
  lastTouchTapAt = now;
  return false;
}

// ── Drag & Drop ──────────────────────────────────────────────────

function onDragStartFromChecker(e) {
  if (isBotTurn() || !hasRolled || isAnimating || isRoomStartLocked() || (isRoomMode() && !isLocalSeatTurn())) { e.preventDefault(); return; }
  clearPendingCheckerSelectTimer();
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
  if (player !== currentPlayer || isBotTurn() || !hasRolled || isAnimating || isRoomStartLocked() || (isRoomMode() && !isLocalSeatTurn())) {
    e.preventDefault(); return;
  }
  clearPendingCheckerSelectTimer();
  dragSource = "bar";
  selectedSource = "bar";
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", "bar");
  renderHighlights();
  renderGuideLines();
}

function onDragEnd(e) {
  clearPendingCheckerSelectTimer();
  e?.currentTarget?.classList.remove("dragging-checker");
  window.setTimeout(() => {
    dragSource = null;
    render();
  }, 0);
}

function onDragOverTarget(e) {
  if (!hasRolled || winner || isBotTurn() || isAnimating || isRoomStartLocked() || (isRoomMode() && !isLocalSeatTurn())) return;
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
    if (!sel.has(target)) {
      if (gameState.bar[currentPlayer] > 0 && target !== "bar") {
        setStatus("Önce kırık pulu girmelisiniz.");
      } else {
        setStatus("Bu taş için geçerli hamle yok.");
      }
      render();
      return;
    }
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

  if (gameState.bar[currentPlayer] > 0 && selectedSource !== "bar") {
    setStatus("Önce kırık pulu girmelisiniz.");
  } else {
    setStatus("Bu hedefe gidemez.");
  }
  render();
}

function getQuickBearOffMove(source) {
  if (!Number.isInteger(source)) return null;
  const offMoves = availableMoves.filter((m) => m.from === source && m.to === "off");
  if (!offMoves.length) return null;

  const sourceDistanceToOff = currentPlayer === WHITE ? source : 25 - source;
  const oversizeDieOffMoves = offMoves.filter((m) => m.die > sourceDistanceToOff);
  if (oversizeDieOffMoves.length) return pickPreferred(oversizeDieOffMoves);

  if (availableMoves.some((m) => m.to !== "off")) return null;
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

function collectReachableTargetsFromSource(state, player, dice, source, outTargets) {
  if (!Array.isArray(dice) || !dice.length) return;
  if (source === "off") return;

  const options = getOptimalMoves(state, player, dice).filter((m) => m.from === source);
  if (!options.length) return;

  for (const move of options) {
    outTargets.add(move.to);
    if (move.to === "off") continue;
    const nextState = applyMove(state, player, move);
    const nextDice = removeOneDie(dice, move.die);
    if (!nextDice.length) continue;
    collectReachableTargetsFromSource(nextState, player, nextDice, move.to, outTargets);
  }
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
  const stackFromTop = Boolean(stackEl && stackEl.classList.contains("stack-from-top"));

  return {
    x: rect.left + rect.width / 2,
    y: stackFromTop
      ? rect.top + (slot + 1) * step
      : rect.bottom - (slot + 1) * step,
  };
}

// ── Play Move ────────────────────────────────────────────────────

function playMove(move) {
  if (!move) return;
  const undoSnap = captureSnapshot();
  turnUndoStack.push(undoSnap);
  turnUndoSnapshot = undoSnap;
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
    turnUndoStack = [];
    turnRollMoveCount = 0;
    setStatus(`${playerText(currentPlayer)} kazandı!`);
    addLog(`${playerText(currentPlayer)} kazandı.`);
    showWinnerPopup(currentPlayer);
    clearCenterDiceStage(true);
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
  clearPendingFinishTurnTimer();
  clearPendingAutoRollTimer();
  pendingMoveChain  = [];
  hasRolled         = false;
  remainingDice     = [];
  availableMoves    = [];
  selectedSource    = null;
  dragSource        = null;
  movesMadeThisTurn = 0;
  turnRollMoveCount = 0;
  turnUndoSnapshot  = null;
  turnUndoStack     = [];
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
  const baseDelay = BOT_THINK_DELAY_BY_LEVEL[normalizeBotDifficulty(botDifficulty)] ?? BOT_DELAY_MS;
  const delayMs = Math.max(baseDelay, diceWaitMs, overrideMs);
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
  const mv = chooseBotMove(gameState, botColor, availableMoves, remainingDice, botDifficulty);
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

function clearPendingFinishTurnTimer() {
  if (pendingFinishTurnTimer === null) return;
  clearTimeout(pendingFinishTurnTimer);
  pendingFinishTurnTimer = null;
}

function scheduleFinishTurnAfterDiceReveal(minDelayMs = 0) {
  clearPendingFinishTurnTimer();
  const minDelay = Number.isFinite(minDelayMs) ? Math.max(0, Number(minDelayMs)) : 0;
  const now = Date.now();
  const diceRevealWaitMs = hasRolled
    ? Math.max(0, diceRollSettledAt - now + DICE_PASS_AFTER_REVEAL_MS)
    : 0;
  const delayMs = Math.max(minDelay, diceRevealWaitMs);
  if (delayMs <= 0) {
    finishTurn();
    return;
  }
  pendingFinishTurnTimer = window.setTimeout(() => {
    pendingFinishTurnTimer = null;
    finishTurn();
  }, delayMs);
}

function maybeScheduleAutoRoll() {
  clearPendingAutoRollTimer();
  if (!autoRollEnabled || winner || hasRolled || isBotTurn() || isAnimating || isRoomStartLocked() || (isRoomMode() && !isLocalSeatTurn())) return;

  pendingAutoRollTimer = window.setTimeout(() => {
    pendingAutoRollTimer = null;
    if (!autoRollEnabled || winner || hasRolled || isBotTurn() || isAnimating || isRoomStartLocked() || (isRoomMode() && !isLocalSeatTurn())) return;
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
  syncModeBodyClasses();
  ensureBoardPerspective();
  syncCheckerSizeToBoard();
  renderTurnInfo();
  renderStatus();
  renderRoomBootNote();
  renderDice();
  renderBoardState();
  renderHighlights();
  renderGuideLines();
  renderTableChat();
  renderMoveLog();
  emitHostState();
}

function renderTurnInfo() {
  const lbl = isBotTurn() ? `${playerText(currentPlayer)} (Bot)` : playerText(currentPlayer);
  const waitingForOpponent = isRoomMode() && !isLocalSeatTurn();
  const roomStartBlocked = isRoomStartLocked();
  dom.currentPlayer.textContent = lbl;
  dom.currentPlayer.classList.toggle("winner", Boolean(winner));
  dom.rollBtn.disabled  = hasRolled || Boolean(winner) || isBotTurn() || isAnimating || waitingForOpponent || roomStartBlocked;
  dom.undoBtn.disabled  = !canUndoCurrentTurn();
  dom.modeSelect.value  = gameMode;
  dom.modeSelect.disabled = isRoomMode();
  if (dom.botDifficultyControl) {
    dom.botDifficultyControl.hidden = isRoomMode() || gameMode !== "bot";
  }
  if (dom.botDifficultySelect) {
    dom.botDifficultySelect.value = normalizeBotDifficulty(botDifficulty);
    dom.botDifficultySelect.disabled = isRoomMode() || gameMode !== "bot";
  }
  dom.newGameBtn.disabled = (isRoomMode() && roomParams.seat !== WHITE) || (isRoomMode() && roomParams.observer);
  setAutoRollToggleState(autoRollEnabled, waitingForOpponent || roomStartBlocked);
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
    dom.roomMetaSeat.textContent = roomParams.observer
      ? `Masa: ${roomParams.tableNo} / Sen: İzleyici / Sıra: ${playerText(currentPlayer)}`
      : `Masa: ${roomParams.tableNo} / Sen: ${playerText(roomParams.seat)} / Sıra: ${playerText(currentPlayer)}`;
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
    ? roomParams.observer
      ? `Masa ${roomParams.tableNo} - Sen: İzleyici`
      : `Masa ${roomParams.tableNo} - Sen: ${playerText(roomParams.seat)}`
    : `Masa ${roomParams.tableNo} - Seçili: ${playerText(preferredPlayerColor)}`;

  dom.roomTitleMain.textContent = titleMain;
  dom.roomTitleSub.textContent = titleSub;
}

function renderStatus() {
  dom.statusText.textContent = statusMessage;
}

function renderRoomBootNote() {
  if (!dom.roomBootNote) return;
  dom.roomBootNote.textContent = getBootLogMessage();
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
  const canControl = hasRolled && !winner && !isBotTurn() && !isAnimating && (!isRoomMode() || isLocalSeatTurn());
  const canDrag = canControl;

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
      const isOwnChecker = ps.owner === currentPlayer;
      const canSelectThis = canControl && isOwnChecker;
      const canDragThis = canDrag && sel.has(pt) && isOwnChecker;
      ch.draggable = canDragThis;
      if (canSelectThis) {
        ch.dataset.source = String(pt);
        ch.addEventListener("mousedown", onCheckerMouseDown);
        ch.addEventListener("touchstart", onCheckerTouchStart, { passive: false });
        ch.addEventListener("dblclick",  onCheckerDoubleClick);
      }
      if (canDragThis) {
        ch.classList.add("draggable-checker");
        ch.addEventListener("dragstart", onDragStartFromChecker);
        ch.addEventListener("dragend",   onDragEnd);
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

  renderBar(BLACK, sel);
  renderBar(WHITE, sel);
  renderOffStack(BLACK);
  renderOffStack(WHITE);
  dom.offWhiteCount.textContent = `${gameState.borneOff[WHITE]} / ${CHECKERS_PER_PLAYER}`;
  dom.offBlackCount.textContent = `${gameState.borneOff[BLACK]} / ${CHECKERS_PER_PLAYER}`;
}

function renderBar(player, selectableSources) {
  const count   = gameState.bar[player];
  const countEl = document.getElementById(`bar-${player}-count`);
  const stackEl = document.getElementById(`bar-${player}-stack`);
  const barSelectable = Boolean(
    selectableSources
    && selectableSources.has("bar")
    && player === currentPlayer
    && count > 0
  );
  countEl.textContent = `${count} taş`;
  stackEl.innerHTML   = "";
  const show = Math.min(count, 8);
  for (let i = 0; i < show; i++) {
    const chip = document.createElement("span");
    chip.className = `bar-chip ${player}`;
    if (barSelectable) {
      chip.classList.add("selectable-bar-chip");
      chip.addEventListener("mousedown", onBarChipMouseDown);
      chip.addEventListener("touchstart", onBarChipTouchStart, { passive: false });
      chip.addEventListener("dblclick", onBarChipDoubleClick);
    }
    if (selectedSource === "bar" && player === currentPlayer) {
      chip.classList.add("selected-checker", "selected-bar-chip");
    }
    stackEl.appendChild(chip);
  }
}

function renderOffStack(player) {
  const stackEl = player === WHITE ? dom.offWhiteStack : dom.offBlackStack;
  if (!stackEl) return;
  const perspective = getPerspectiveColor();
  const stackFromTop = player !== perspective;
  stackEl.classList.toggle("stack-from-top", stackFromTop);

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

  const highlightMoves = remainingDice.length >= 3
    ? getOptimalMoves(gameState, currentPlayer, remainingDice)
    : availableMoves;
  const sel = new Set(highlightMoves.map((m) => m.from));
  for (const src of sel) {
    if (src === "bar") barSlotElements.get(currentPlayer)?.classList.add("selectable-source");
    else               pointElements.get(src)?.classList.add("selectable-source");
  }

  if (selectedSource === null) return;

  if (selectedSource === "bar") barSlotElements.get(currentPlayer)?.classList.add("selected-source");
  else                          pointElements.get(selectedSource)?.classList.add("selected-source");

  const targets = new Set();
  collectReachableTargetsFromSource(gameState, currentPlayer, remainingDice, selectedSource, targets);
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
  if (!dom.moveLog) return;
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
  if (centerDiceClearTimer !== null) {
    window.clearTimeout(centerDiceClearTimer);
    centerDiceClearTimer = null;
  }
  dom.centerDiceStage.innerHTML = "";
  const wrap = document.createElement("div");
  const toneClass = player === WHITE ? "dice-white" : "dice-black";
  const side = getDiceStageSideForPlayer(player);
  const values = [d1, d2];
  wrap.className = `center-dice-wrap ${toneClass}`;
  centerDiceVisibleUntil = Date.now() + DICE_ROLL_TOTAL_MS + DICE_ROLL_STAGGER_MS + DICE_RESULT_VISIBLE_MS;
  positionCenterDiceStage(side);
  dom.centerDiceStage.classList.remove("white-turn", "black-turn", "side-left", "side-right");
  dom.centerDiceStage.classList.add(side === "left" ? "side-left" : "side-right");

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

function clearCenterDiceStage(force = false) {
  if (!dom.centerDiceStage) return;
  if (!force) {
    const waitMs = centerDiceVisibleUntil - Date.now();
    if (waitMs > 0) {
      if (centerDiceClearTimer !== null) {
        window.clearTimeout(centerDiceClearTimer);
      }
      centerDiceClearTimer = window.setTimeout(() => {
        centerDiceClearTimer = null;
        clearCenterDiceStage(true);
      }, waitMs + 16);
      return;
    }
  }
  if (centerDiceClearTimer !== null) {
    window.clearTimeout(centerDiceClearTimer);
    centerDiceClearTimer = null;
  }
  centerDiceVisibleUntil = 0;
  dom.centerDiceStage.innerHTML = "";
  dom.centerDiceStage.classList.remove("show", "white-turn", "black-turn", "side-left", "side-right");
  delete dom.centerDiceStage.dataset.side;
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

  const sprite = document.createElement("canvas");
  sprite.className = "die-roll-sprite";
  sprite.setAttribute("aria-hidden", "true");
  die.appendChild(sprite);

  animateDiceSprite(sprite, value, index);
  return die;
}

function animateDiceSprite(spriteEl, value, index) {
  const delayMs = index * DICE_ROLL_STAGGER_MS;
  const frameSequence = buildDiceFrameSequence(value);
  let lastFrame = -1;
  const startAt = performance.now() + delayMs;
  let preparedSheet = diceSpriteSheet;
  primeDiceSpriteCanvas(spriteEl);

  if (!preparedSheet) {
    void preloadDiceSpriteSheet().then((sheet) => {
      preparedSheet = sheet;
      if (!sheet || lastFrame < 0 || !spriteEl.isConnected) return;
      setDiceSpriteFrame(spriteEl, frameSequence[lastFrame], sheet);
    });
  }

  function tick(now) {
    if (!spriteEl.isConnected) return;
    if (now < startAt) {
      window.requestAnimationFrame(tick);
      return;
    }

    const elapsed = now - startAt;
    const progress = Math.min(1, elapsed / DICE_ROLL_TOTAL_MS);
    const frameIndex = Math.min(
      frameSequence.length - 1,
      Math.floor(progress * (frameSequence.length - 1))
    );

    if (frameIndex !== lastFrame) {
      setDiceSpriteFrame(spriteEl, frameSequence[frameIndex], preparedSheet);
      lastFrame = frameIndex;
    }

    if (progress < 1) window.requestAnimationFrame(tick);
  }

  window.requestAnimationFrame(tick);
}

function buildDiceFrameSequence(value) {
  const randomFrames = [];
  const randomCount = DICE_SPRITE_RANDOM_FRAME_COUNT;
  const startRow = Math.floor(Math.random() * DICE_SPRITE_ROWS);
  const startCol = Math.floor(Math.random() * DICE_SPRITE_COLUMNS);
  const stride = 1 + Math.floor(Math.random() * 3);
  const rowBumpEvery = 4 + Math.floor(Math.random() * 3);

  for (let i = 0; i < randomCount; i++) {
    const col = (startCol + i * stride) % DICE_SPRITE_COLUMNS;
    const rowShift = Math.floor(i / rowBumpEvery);
    const row = (startRow + rowShift) % DICE_SPRITE_ROWS;
    randomFrames.push(row * DICE_SPRITE_COLUMNS + col);
  }

  const settleRow = (Math.max(1, Math.min(6, value)) - 1) % DICE_SPRITE_ROWS;
  const settleCols = [3, 6, 8, 10, 11, 12, 13];
  const settleFrames = settleCols.map((col) => settleRow * DICE_SPRITE_COLUMNS + col);

  return [...randomFrames, ...settleFrames];
}

function preloadDiceSpriteSheet() {
  if (diceSpriteSheet) return Promise.resolve(diceSpriteSheet);
  if (diceSpriteSheetPromise) return diceSpriteSheetPromise;

  diceSpriteSheetPromise = new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      if (!width || !height) {
        resolve(null);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const pixels = imageData.data;
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        if (r <= DICE_SPRITE_ALPHA_THRESHOLD && g <= DICE_SPRITE_ALPHA_THRESHOLD && b <= DICE_SPRITE_ALPHA_THRESHOLD) {
          pixels[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      diceSpriteSheet = canvas;
      resolve(canvas);
    };
    img.onerror = () => resolve(null);
    img.src = DICE_SPRITE_PATH;
  });

  return diceSpriteSheetPromise;
}

function setDiceSpriteFrame(spriteEl, frameIndex, preparedSheet = null) {
  const sheet = preparedSheet || diceSpriteSheet;
  if (sheet && drawDiceSpriteFrameCanvas(spriteEl, frameIndex, sheet)) return;
  setDiceSpriteFrameLegacy(spriteEl, frameIndex);
}

function primeDiceSpriteCanvas(spriteEl) {
  if (!(spriteEl instanceof HTMLCanvasElement)) return null;
  let state = diceSpriteCanvasState.get(spriteEl);
  if (!state) {
    const ctx = spriteEl.getContext("2d", { alpha: true, desynchronized: true }) || spriteEl.getContext("2d");
    if (!ctx) return null;
    state = { ctx, pixelSize: 0 };
    diceSpriteCanvasState.set(spriteEl, state);
  }

  const drawSize = Math.max(1, Math.round(spriteEl.clientWidth || spriteEl.parentElement?.clientWidth || 52));
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const pixelSize = Math.max(1, Math.round(drawSize * dpr));
  if (state.pixelSize !== pixelSize || spriteEl.width !== pixelSize || spriteEl.height !== pixelSize) {
    spriteEl.width = pixelSize;
    spriteEl.height = pixelSize;
    state.pixelSize = pixelSize;
  }
  return state;
}

function getDiceSpriteSheetMeta(sheet) {
  let meta = diceSpriteSheetMeta.get(sheet);
  if (meta) return meta;

  meta = {
    srcW: Math.floor(sheet.width / DICE_SPRITE_COLUMNS) || 1,
    srcH: Math.floor(sheet.height / DICE_SPRITE_ROWS) || 1,
    maxIndex: DICE_SPRITE_COLUMNS * DICE_SPRITE_ROWS - 1,
  };
  diceSpriteSheetMeta.set(sheet, meta);
  return meta;
}

function drawDiceSpriteFrameCanvas(spriteEl, frameIndex, sheet) {
  if (!(spriteEl instanceof HTMLCanvasElement)) return false;
  const state = diceSpriteCanvasState.get(spriteEl) || primeDiceSpriteCanvas(spriteEl);
  if (!state?.ctx) return false;
  const meta = getDiceSpriteSheetMeta(sheet);
  const safeIndex = Math.max(0, Math.min(meta.maxIndex, frameIndex));
  const col = safeIndex % DICE_SPRITE_COLUMNS;
  const row = Math.floor(safeIndex / DICE_SPRITE_COLUMNS);
  const srcX = col * meta.srcW;
  const srcY = row * meta.srcH;
  const pixelSize = state.pixelSize || spriteEl.width || 52;

  state.ctx.clearRect(0, 0, pixelSize, pixelSize);
  if (!state.smoothingReady) {
    state.ctx.imageSmoothingEnabled = true;
    state.smoothingReady = true;
  }
  state.ctx.drawImage(sheet, srcX, srcY, meta.srcW, meta.srcH, 0, 0, pixelSize, pixelSize);
  return true;
}

function setDiceSpriteFrameLegacy(spriteEl, frameIndex) {
  const safeIndex = Math.max(0, Math.min(DICE_SPRITE_COLUMNS * DICE_SPRITE_ROWS - 1, frameIndex));
  const col = safeIndex % DICE_SPRITE_COLUMNS;
  const row = Math.floor(safeIndex / DICE_SPRITE_COLUMNS);
  const size = spriteEl.clientWidth || spriteEl.parentElement?.clientWidth || 52;

  spriteEl.style.backgroundImage = `url("${DICE_SPRITE_PATH}")`;
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
  dom.winnerText.textContent = `Oyunu ${playerText(player)} kazandı!....`;
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

function ensurePointerHintEl() {
  if (pointerHintEl && pointerHintEl.isConnected) return pointerHintEl;
  const el = document.createElement("div");
  el.className = "cursor-warning-hint";
  document.body.appendChild(el);
  pointerHintEl = el;
  return el;
}

function getPointerPosition(evt) {
  if (evt && Number.isFinite(evt.clientX) && Number.isFinite(evt.clientY)) {
    return { x: Number(evt.clientX), y: Number(evt.clientY) };
  }
  const touch = evt?.touches?.[0] || evt?.changedTouches?.[0];
  if (touch && Number.isFinite(touch.clientX) && Number.isFinite(touch.clientY)) {
    return { x: Number(touch.clientX), y: Number(touch.clientY) };
  }
  return {
    x: window.innerWidth * 0.5,
    y: window.innerHeight * 0.5,
  };
}

function showPointerHint(message, evt) {
  const text = typeof message === "string" ? message.trim() : "";
  if (!text) return;
  const el = ensurePointerHintEl();
  const pos = getPointerPosition(evt);
  el.textContent = text;
  const viewportW = Math.max(1, window.innerWidth || document.documentElement?.clientWidth || 0);
  const viewportH = Math.max(1, window.innerHeight || document.documentElement?.clientHeight || 0);
  const margin = 8;
  const gap = 10;
  const hintW = Math.max(1, el.offsetWidth || 160);
  const hintH = Math.max(1, el.offsetHeight || 28);

  let left = pos.x - (hintW / 2);
  left = Math.max(margin, Math.min(left, viewportW - hintW - margin));

  const topAbove = pos.y - hintH - gap;
  const topBelow = pos.y + gap;
  let top = topAbove >= margin ? topAbove : topBelow;
  top = Math.max(margin, Math.min(top, viewportH - hintH - margin));

  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
  el.classList.add("show");
  if (pointerHintTimer !== null) {
    window.clearTimeout(pointerHintTimer);
  }
  pointerHintTimer = window.setTimeout(() => {
    pointerHintTimer = null;
    if (pointerHintEl) {
      pointerHintEl.classList.remove("show");
    }
  }, 1000);
}

function captureSnapshot() {
  return {
    gameState: cloneState(gameState),
    currentPlayer,
    remainingDice:  [...remainingDice],
    turnRollMoveCount,
    matchToken,
    hasRolled,
    selectedSource,
    availableMoves: cloneMoves(availableMoves),
    winner,
    statusMessage,
    gameMode,
    moveLog:        [...moveLog],
    lastRolledDice: [...lastRolledDice],
    diceRollSettledAt,
    movesMadeThisTurn,
  };
}

function canUndoCurrentTurn() {
  return Boolean(
    turnUndoStack.length
    && hasRolled
    && !winner
    && !isBotTurn()
    && !isAnimating
    && movesMadeThisTurn > 0
    && turnRollMoveCount > 0
    && movesMadeThisTurn < turnRollMoveCount,
  );
}

function restoreSnapshot(snap) {
  gameState      = cloneState(snap.gameState);
  currentPlayer  = snap.currentPlayer;
  matchToken     = typeof snap.matchToken === "string" && snap.matchToken ? snap.matchToken.slice(0, 96) : matchToken;
  remainingDice  = [...snap.remainingDice];
  turnRollMoveCount = Number.isInteger(snap.turnRollMoveCount)
    ? Math.max(0, Number(snap.turnRollMoveCount))
    : 0;
  hasRolled      = snap.hasRolled;
  selectedSource = snap.selectedSource;
  availableMoves = cloneMoves(snap.availableMoves);
  winner         = snap.winner;
  statusMessage  = snap.statusMessage;
  gameMode       = snap.gameMode;
  moveLog        = [...snap.moveLog];
  lastRolledDice = [...(snap.lastRolledDice || [])];
  diceRollSettledAt = Number.isFinite(snap.diceRollSettledAt) ? Number(snap.diceRollSettledAt) : 0;
  movesMadeThisTurn = Number.isInteger(snap.movesMadeThisTurn)
    ? Math.max(0, Number(snap.movesMadeThisTurn))
    : 0;
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

function chooseBotMove(state, player, moves, dice, difficulty) {
  if (!Array.isArray(moves) || moves.length === 0) return null;
  const level = normalizeBotDifficulty(difficulty);
  if (level === BOT_DIFFICULTY_EASY) {
    return chooseBotMoveEasy(state, player, moves);
  }
  if (level === BOT_DIFFICULTY_HARD) {
    return chooseBotMoveHard(state, player, moves, dice);
  }
  return chooseBotMoveMedium(state, player, moves);
}

function chooseBotMoveEasy(state, player, moves) {
  const ranked = moves
    .map((move) => ({ move, score: scoreBotMove(state, player, move) }))
    .sort((a, b) => b.score - a.score);

  const bucketSize = Math.max(2, Math.ceil(ranked.length * 0.65));
  const bucket = ranked.slice(0, bucketSize);
  const choice = bucket[Math.floor(Math.random() * bucket.length)] || ranked[0];
  return choice?.move || moves[0];
}

function chooseBotMoveMedium(state, player, moves) {
  let best = moves[0];
  let bestScore = -Infinity;
  for (const move of moves) {
    const score = scoreBotMove(state, player, move);
    if (score > bestScore || (score === bestScore && Math.random() > 0.55)) {
      best = move;
      bestScore = score;
    }
  }
  return best;
}

function buildBotDiceOutcomes() {
  const outcomes = [];
  for (let first = 1; first <= 6; first++) {
    for (let second = first; second <= 6; second++) {
      const isDouble = first === second;
      outcomes.push({
        dice: isDouble ? [first, first, first, first] : [first, second],
        weight: isDouble ? 1 : 2,
      });
    }
  }
  return outcomes;
}

function chooseBotMoveHard(state, player, moves, dice) {
  const turnDice = Array.isArray(dice) ? [...dice] : [];
  const searchDepth = Math.min(6, Math.max(2, turnDice.length + 1));
  const planMemo = new Map();
  const replyMemo = new Map();
  const replyTurnMemo = new Map();

  let best = moves[0];
  let bestScore = -Infinity;

  const rankedMoves = [...moves]
    .map((move) => ({ move, quick: scoreBotMove(state, player, move) }))
    .sort((a, b) => b.quick - a.quick);

  for (const { move, quick } of rankedMoves) {
    const nextState = applyMove(state, player, move);
    const nextDice = removeOneDie(turnDice, move.die);
    const continuation = nextDice.length
      ? getHardTurnPlanScore(nextState, player, nextDice, searchDepth - 1, planMemo)
      : 0;
    const boardEval = evaluateBoardStateForBot(nextState, player);
    const opponentReply = estimateOpponentTurnScore(nextState, player, replyMemo, replyTurnMemo);
    const safetyEdge = (countBlots(nextState, opponentOf(player)) - countBlots(nextState, player)) * 1.15;
    const tacticalEdge =
      (countHomeMadePoints(nextState, player) - countHomeMadePoints(state, player)) * 2.2
      + (countBlockedEntryPoints(nextState, opponentOf(player)) - countBlockedEntryPoints(state, opponentOf(player))) * 1.8;
    const total =
      quick * 0.42
      + continuation * 1.12
      + boardEval * 0.78
      - opponentReply * 0.52
      + safetyEdge
      + tacticalEdge;

    if (total > bestScore || (total === bestScore && move.die > best.die)) {
      bestScore = total;
      best = move;
    }
  }
  return best;
}

function getHardTurnPlanScore(state, player, dice, depth, memo) {
  const usableDice = Array.isArray(dice) ? [...dice] : [];
  if (!usableDice.length || depth <= 0) {
    return evaluateBoardStateForBot(state, player);
  }

  const key = `${depth}|${serialize(state, player, usableDice)}|plan`;
  if (memo.has(key)) return memo.get(key);

  const options = getOptimalMoves(state, player, usableDice);
  if (!options.length) {
    const stuckPenalty = 6 + countBlots(state, player) * 1.25;
    const score = evaluateBoardStateForBot(state, player) - stuckPenalty;
    memo.set(key, score);
    return score;
  }

  const ranked = options
    .map((move) => {
      const nextState = applyMove(state, player, move);
      const immediate = scoreBotMove(state, player, move);
      const boardEval = evaluateBoardStateForBot(nextState, player);
      return {
        move,
        nextState,
        immediate,
        boardEval,
        quick: immediate * 0.35 + boardEval * 0.65,
      };
    })
    .sort((a, b) => b.quick - a.quick);

  const beamWidth = depth >= 3 ? 10 : 14;
  const candidates = ranked.slice(0, Math.min(beamWidth, ranked.length));

  let best = -Infinity;
  for (const candidate of candidates) {
    const nextDice = removeOneDie(usableDice, candidate.move.die);
    const continuation = nextDice.length
      ? getHardTurnPlanScore(candidate.nextState, player, nextDice, depth - 1, memo)
      : evaluateBoardStateForBot(candidate.nextState, player);
    const score = candidate.immediate * 0.3 + candidate.boardEval * 0.55 + continuation * 0.85;
    if (score > best) best = score;
  }

  memo.set(key, best);
  return best;
}

function estimateOpponentTurnScore(state, player, memo, turnMemo) {
  const opp = opponentOf(player);
  const key = `${serialize(state, opp, [])}|reply`;
  if (memo.has(key)) return memo.get(key);

  let weightedTotal = 0;
  let weightSum = 0;

  for (const outcome of BOT_DICE_OUTCOMES) {
    const score = estimateBestTurnScoreForDice(state, opp, outcome.dice, turnMemo);
    weightedTotal += score * outcome.weight;
    weightSum += outcome.weight;
  }

  const expected = weightSum > 0
    ? weightedTotal / weightSum
    : evaluateBoardStateForBot(state, opp);

  memo.set(key, expected);
  return expected;
}

function estimateBestTurnScoreForDice(state, player, dice, memo) {
  const usableDice = Array.isArray(dice) ? [...dice] : [];
  if (!usableDice.length) return evaluateBoardStateForBot(state, player);

  const key = `${serialize(state, player, usableDice)}|opp-turn`;
  if (memo.has(key)) return memo.get(key);

  const options = getOptimalMoves(state, player, usableDice);
  if (!options.length) {
    const score = evaluateBoardStateForBot(state, player) - 5;
    memo.set(key, score);
    return score;
  }

  const ranked = options
    .map((move) => {
      const nextState = applyMove(state, player, move);
      const immediate = scoreBotMove(state, player, move);
      return {
        move,
        nextState,
        immediate,
        quick: immediate * 0.32 + evaluateBoardStateForBot(nextState, player) * 0.68,
      };
    })
    .sort((a, b) => b.quick - a.quick);

  const beamWidth = usableDice.length > 2 ? 6 : 8;
  const candidates = ranked.slice(0, Math.min(beamWidth, ranked.length));

  let best = -Infinity;
  for (const candidate of candidates) {
    const nextDice = removeOneDie(usableDice, candidate.move.die);
    const continuation = nextDice.length
      ? estimateBestTurnScoreForDice(candidate.nextState, player, nextDice, memo)
      : evaluateBoardStateForBot(candidate.nextState, player);
    const total = candidate.immediate * 0.25 + continuation * 0.9;
    if (total > best) best = total;
  }

  memo.set(key, best);
  return best;
}

function evaluateBoardStateForBot(state, player) {
  const opp = opponentOf(player);
  const raceMode = isRacePosition(state);
  const pipAdvantage = getPipCount(state, opp) - getPipCount(state, player);
  const offAdvantage = state.borneOff[player] - state.borneOff[opp];
  const barAdvantage = state.bar[opp] - state.bar[player];
  const madePointAdvantage = countMadePoints(state, player) - countMadePoints(state, opp);
  const homeMadeAdvantage = countHomeMadePoints(state, player) - countHomeMadePoints(state, opp);
  const blotAdvantage = countBlots(state, opp) - countBlots(state, player);
  const primeAdvantage = longestPrime(state, player) - longestPrime(state, opp);
  const anchorAdvantage = countAnchorsInOpponentHome(state, player) - countAnchorsInOpponentHome(state, opp);
  const blockedEntryAdvantage = countBlockedEntryPoints(state, opp) - countBlockedEntryPoints(state, player);
  const shotAdvantage = countPotentialShots(state, player) - countPotentialShots(state, opp);
  const flexibilityAdvantage = countFlexibility(state, player) - countFlexibility(state, opp);

  if (raceMode) {
    return (
      pipAdvantage * 0.98
      + offAdvantage * 44
      + barAdvantage * 14
      + madePointAdvantage * 1.2
      + homeMadeAdvantage * 2.1
      + blotAdvantage * 4.6
      + flexibilityAdvantage * 1.7
    );
  }

  return (
    pipAdvantage * 0.56
    + offAdvantage * 31
    + barAdvantage * 27
    + madePointAdvantage * 4.3
    + homeMadeAdvantage * 7.4
    + blotAdvantage * 8.6
    + primeAdvantage * 6.2
    + anchorAdvantage * 4.4
    + blockedEntryAdvantage * 3.8
    + shotAdvantage * 2.6
    + flexibilityAdvantage * 2.2
  );
}

function isRacePosition(state) {
  if (state.bar[WHITE] > 0 || state.bar[BLACK] > 0) return false;
  const whiteBack = findBackChecker(state, WHITE);
  const blackBack = findBackChecker(state, BLACK);
  if (!Number.isInteger(whiteBack) || !Number.isInteger(blackBack)) return true;
  return whiteBack < blackBack;
}

function findBackChecker(state, player) {
  if (player === WHITE) {
    for (let pt = POINT_COUNT; pt >= 1; pt--) {
      const ps = state.points[pt - 1];
      if (ps.owner === WHITE && ps.count > 0) return pt;
    }
    return null;
  }

  for (let pt = 1; pt <= POINT_COUNT; pt++) {
    const ps = state.points[pt - 1];
    if (ps.owner === BLACK && ps.count > 0) return pt;
  }
  return null;
}

function countAnchorsInOpponentHome(state, player) {
  const opp = opponentOf(player);
  let total = 0;
  for (let pt = 1; pt <= POINT_COUNT; pt++) {
    if (!isHomePoint(opp, pt)) continue;
    const ps = state.points[pt - 1];
    if (ps.owner === player && ps.count >= 2) total++;
  }
  return total;
}

function countBlockedEntryPoints(state, player) {
  const opp = opponentOf(player);
  let blocked = 0;
  for (let die = 1; die <= 6; die++) {
    const target = entryFromBar(player, die);
    const slot = state.points[target - 1];
    if (slot.owner === opp && slot.count >= 2) blocked++;
  }
  return blocked;
}

function countPotentialShots(state, player) {
  const opp = opponentOf(player);
  let total = 0;

  for (let pt = 1; pt <= POINT_COUNT; pt++) {
    const target = state.points[pt - 1];
    if (target.owner !== opp || target.count !== 1) continue;

    let reachable = false;
    if (state.bar[player] > 0) {
      const die = player === WHITE ? 25 - pt : pt;
      reachable = die >= 1 && die <= 6;
    } else {
      for (let src = 1; src <= POINT_COUNT; src++) {
        const ps = state.points[src - 1];
        if (ps.owner !== player || ps.count <= 0) continue;
        const die = (pt - src) * directionOf(player);
        if (die >= 1 && die <= 6) {
          reachable = true;
          break;
        }
      }
    }

    if (reachable) total++;
  }

  return total;
}

function countFlexibility(state, player) {
  if (state.bar[player] > 0) {
    let entries = 0;
    for (let die = 1; die <= 6; die++) {
      const target = entryFromBar(player, die);
      const slot = state.points[target - 1];
      if (!(slot.owner === opponentOf(player) && slot.count >= 2)) entries++;
    }
    return entries * 0.6;
  }

  const sources = collectSources(state, player);
  if (!sources.length) return 0;

  let playableDice = 0;
  for (let die = 1; die <= 6; die++) {
    if (getMovesForDie(state, player, die).length > 0) playableDice++;
  }

  let spread = 0;
  for (const src of sources) {
    const slot = state.points[src - 1];
    spread += slot.count >= 2 ? 0.7 : 0.45;
  }

  return playableDice + Math.min(6, spread);
}

function getPipCount(state, player) {
  let total = state.bar[player] * 25;
  for (let pt = 1; pt <= POINT_COUNT; pt++) {
    const ps = state.points[pt - 1];
    if (ps.owner !== player || ps.count <= 0) continue;
    const distance = player === WHITE ? pt : 25 - pt;
    total += ps.count * distance;
  }
  return total;
}

function countBlots(state, player) {
  let blots = 0;
  for (let pt = 1; pt <= POINT_COUNT; pt++) {
    const ps = state.points[pt - 1];
    if (ps.owner === player && ps.count === 1) {
      blots += 1 + getHitThreat(state, player, pt) * 0.35;
    }
  }
  return blots;
}

function countMadePoints(state, player) {
  let total = 0;
  for (let pt = 1; pt <= POINT_COUNT; pt++) {
    const ps = state.points[pt - 1];
    if (ps.owner === player && ps.count >= 2) total++;
  }
  return total;
}

function countHomeMadePoints(state, player) {
  let total = 0;
  for (let pt = 1; pt <= POINT_COUNT; pt++) {
    if (!isHomePoint(player, pt)) continue;
    const ps = state.points[pt - 1];
    if (ps.owner === player && ps.count >= 2) total++;
  }
  return total;
}

function longestPrime(state, player) {
  let longest = 0;
  let streak = 0;
  for (let pt = 1; pt <= POINT_COUNT; pt++) {
    const ps = state.points[pt - 1];
    if (ps.owner === player && ps.count >= 2) {
      streak += 1;
      if (streak > longest) longest = streak;
    } else {
      streak = 0;
    }
  }
  return longest;
}

function scoreBotMove(state, player, move) {
  const hit = isHitMove(state, player, move);
  const next = applyMove(state, player, move);
  const opp = opponentOf(player);
  const raceMode = isRacePosition(state);
  let score = 0;

  if (move.to === "off") {
    score += 230;
    if (countCheckersInPlay(next, player) <= 2) score += 45;
  }

  if (move.from === "bar") {
    score += 62 + (state.bar[player] > 1 ? 14 : 0);
  }

  if (hit) {
    score += 96;
    score += getPlayerProgress(state, opp) * 38;
    score += countBlockedEntryPoints(next, opp) * 5.5;
  }

  if (move.to !== "off") {
    const beforeDest = state.points[move.to - 1];
    const dest = next.points[move.to - 1];
    if (dest.owner === player) {
      const madeNow = dest.count >= 2 && (beforeDest.owner !== player || beforeDest.count < 2);
      if (madeNow) score += raceMode ? 18 : 36;
      if (dest.count >= 4) score += 8;
      if (isHomePoint(player, move.to)) score += raceMode ? 8 : 14;

      if (dest.count === 1) {
        score -= getHitThreat(next, player, move.to) * (raceMode ? 8 : 16);
      } else {
        score -= getHitThreat(next, player, move.to) * 1.4;
      }
    }
  }

  if (move.from !== "bar") {
    const srcBefore = state.points[move.from - 1];
    const srcAfter = next.points[move.from - 1];
    if (srcBefore.owner === player && srcBefore.count >= 2 && srcAfter.count === 1) {
      score -= raceMode ? 5 : 20;
      if (isHomePoint(player, move.from)) score -= raceMode ? 4 : 10;
    }
  }

  const progress = moveProgress(player, move.from, move.to);
  score += progress * (raceMode ? 7.4 : 4.8);

  const pipGain = getPipCount(state, player) - getPipCount(next, player);
  score += pipGain * (raceMode ? 1.9 : 0.75);

  if (!raceMode) {
    const shotGain = countPotentialShots(next, player) - countPotentialShots(state, player);
    score += shotGain * 2.4;
  }

  score += move.die * 0.65;

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

