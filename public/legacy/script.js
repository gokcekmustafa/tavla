const WHITE = "white";
const BLACK = "black";
const POINT_COUNT = 24;
const CHECKERS_PER_PLAYER = 15;
const BOT_DELAY_MS = 800;
const LOG_LIMIT = 140;
const ANIM_MS = 380;
const AUTO_ROLL_DELAY_MS = 520;

const dom = {
  boardGrid:       document.getElementById("board-grid"),
  centerDiceStage: document.getElementById("center-dice-stage"),
  currentPlayer:   document.getElementById("current-player"),
  diceContainer:   document.getElementById("dice-container"),
  statusText:      document.getElementById("status-text"),
  rollBtn:         document.getElementById("roll-btn"),
  newGameBtn:      document.getElementById("new-game-btn"),
  undoBtn:         document.getElementById("undo-btn"),
  modeSelect:      document.getElementById("game-mode-select"),
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

const botPlayer = BLACK;

buildBoard();
attachEvents();
addLog(gameMode === "bot" ? "Bilgisayara karşı modda yeni oyun hazır." : "Yeni oyun hazır.");
render();

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
  dom.autoRollToggle?.addEventListener("change", onAutoRollChange);

  dom.offWhite.addEventListener("click",    onOffAreaClick);
  dom.offBlack.addEventListener("click",    onOffAreaClick);
  dom.offWhite.addEventListener("dragover", onDragOverTarget);
  dom.offBlack.addEventListener("dragover", onDragOverTarget);
  dom.offWhite.addEventListener("drop",     onDropOnOffArea);
  dom.offBlack.addEventListener("drop",     onDropOnOffArea);
  dom.winnerCloseBtn?.addEventListener("click", hideWinnerPopup);
}

function onNewGame() {
  clearPendingBotTimer();
  clearPendingAutoRollTimer();
  gameState         = createInitialState();
  currentPlayer     = WHITE;
  remainingDice     = [];
  hasRolled         = false;
  selectedSource    = null;
  availableMoves    = [];
  winner            = null;
  moveLog           = [];
  turnUndoSnapshot  = null;
  movesMadeThisTurn = 0;
  dragSource        = null;
  lastRolledDice    = [];
  lastDicePlayer    = WHITE;
  isAnimating       = false;
  setStatus("Yeni oyun başladı. Beyaz zar atsın.");
  addLog("Yeni oyun başladı.");
  hideWinnerPopup();
  render();
  maybeScheduleAutoRoll();
}

function onModeChange() {
  const next = dom.modeSelect.value === "bot" ? "bot" : "local";
  if (next === gameMode) return;
  gameMode = next;
  clearPendingBotTimer();
  clearPendingAutoRollTimer();
  turnUndoSnapshot  = null;
  movesMadeThisTurn = 0;
  dragSource        = null;
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

function onAutoRollChange() {
  autoRollEnabled = Boolean(dom.autoRollToggle?.checked);
  clearPendingAutoRollTimer();
  addLog(autoRollEnabled ? "Otomatik zar acildi." : "Otomatik zar kapatildi.");
  if (autoRollEnabled && !winner && !hasRolled && !isBotTurn() && !isAnimating) {
    setStatus("Otomatik zar aktif. Zar birazdan atilacak.");
    maybeScheduleAutoRoll();
  } else {
    render();
  }
}

function onUndoMove() {
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
  setStatus("İlk hamle geri alındı. Devam edebilirsin.");
  render();
  maybeScheduleBotAction();
  maybeScheduleAutoRoll();
}

function onRollDice(arg) {
  const fromBot = Boolean(arg && arg.fromBot);
  clearPendingAutoRollTimer();
  if (winner) return;
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
  availableMoves    = getOptimalMoves(gameState, currentPlayer, remainingDice);

  showCenterDice(d1, d2, currentPlayer);
  addLog(`${playerText(currentPlayer)}: ${d1}-${d2}${d1===d2 ? " (çift)" : ""}`);

  if (!availableMoves.length) {
    setStatus(`${playerText(currentPlayer)} hamle yapamadı. Sıra geçti.`);
    addLog(`${playerText(currentPlayer)} pas geçti.`);
    turnUndoSnapshot = null;
    window.setTimeout(finishTurn, 1300);
    return;
  }

  turnUndoSnapshot = captureSnapshot();
  setStatus(`${playerText(currentPlayer)}: kaynak taşı seç.`);
  render();
  maybeScheduleBotAction();
}

function onPointClick(e) {
  if (isAnimating) return;
  handleSourceOrDest(Number(e.currentTarget.dataset.point));
}

function onBarSlotClick(e) {
  if (isAnimating) return;
  if (e.currentTarget.dataset.player !== currentPlayer) return;
  handleSourceOrDest("bar");
}

function onOffAreaClick(e) {
  if (isAnimating || isBotTurn()) return;
  const tp = e.currentTarget.dataset.off;
  if (tp !== currentPlayer || selectedSource === null) return;
  const mv = pickPreferred(availableMoves.filter(c => c.from === selectedSource && c.to === "off"));
  if (mv) playMove(mv);
}

// ── Drag & Drop ──────────────────────────────────────────────────

function onDragStartFromChecker(e) {
  if (isBotTurn() || !hasRolled || isAnimating) { e.preventDefault(); return; }
  const src = Number(e.currentTarget.dataset.source);
  dragSource = src;
  selectedSource = src;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", String(src));
}

function onDragStartFromBar(e) {
  const player = e.currentTarget.dataset.player;
  if (player !== currentPlayer || isBotTurn() || !hasRolled || isAnimating) {
    e.preventDefault(); return;
  }
  dragSource = "bar";
  selectedSource = "bar";
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", "bar");
}

function onDragEnd() {
  window.setTimeout(() => {
    dragSource = null;
    render();
  }, 0);
}

function onDragOverTarget(e) {
  if (!hasRolled || winner || isBotTurn() || isAnimating) return;
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
  const matches = availableMoves.filter(c => c.from === source && c.to === target);
  if (matches.length) { playMove(pickPreferred(matches)); return; }
  if (getSelectableSources().has(source)) selectedSource = source;
  setStatus("Bu hamle geçersiz.");
  render();
}

function handleSourceOrDest(target) {
  if (winner || isAnimating) return;
  if (isBotTurn())  { setStatus("Sıra bilgisayarda."); render(); return; }
  if (!hasRolled)   { setStatus("Önce zar at."); render(); return; }

  const sel = getSelectableSources();

  if (selectedSource === null) {
    if (!sel.has(target)) { setStatus("Bu taş için geçerli hamle yok."); render(); return; }
    selectedSource = target;
    render();
    return;
  }

  if (selectedSource === target) { selectedSource = null; render(); return; }

  const matches = availableMoves.filter(c => c.from === selectedSource && c.to === target);
  if (matches.length) { playMove(pickPreferred(matches)); return; }

  if (sel.has(target)) { selectedSource = target; render(); return; }

  setStatus("Bu hedefe gidemez.");
  render();
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
    winner        = currentPlayer;
    hasRolled     = false;
    remainingDice = [];
    availableMoves= [];
    turnUndoSnapshot = null;
    setStatus(`${playerText(currentPlayer)} kazandi!`);
    addLog(`${playerText(currentPlayer)} kazandi.`);
    showWinnerPopup(currentPlayer);
    render();
    return;
  }

  if (!remainingDice.length) {
    setStatus(`${playerText(currentPlayer)} turu bitti.`);
    finishTurn();
    return;
  }

  availableMoves = getOptimalMoves(gameState, currentPlayer, remainingDice);

  if (!availableMoves.length) {
    setStatus("Kalan zarlarla hamle yok. Sıra geçti.");
    addLog(`${playerText(currentPlayer)} pas.`);
    finishTurn();
    return;
  }

  setStatus(`${playerText(currentPlayer)} devam et.`);
  render();
  maybeScheduleBotAction();
}

function finishTurn() {
  clearPendingAutoRollTimer();
  hasRolled         = false;
  remainingDice     = [];
  availableMoves    = [];
  selectedSource    = null;
  dragSource        = null;
  movesMadeThisTurn = 0;
  turnUndoSnapshot  = null;
  lastRolledDice    = [];
  currentPlayer     = opponentOf(currentPlayer);
  render();
  maybeScheduleBotAction();
  maybeScheduleAutoRoll();
}

// ── Bot ──────────────────────────────────────────────────────────

function maybeScheduleBotAction() {
  clearPendingBotTimer();
  if (!isBotTurn()) return;
  pendingBotTimer = window.setTimeout(() => { pendingBotTimer = null; runBotAction(); }, BOT_DELAY_MS);
}

function runBotAction() {
  if (!isBotTurn() || winner) return;
  if (!hasRolled) { onRollDice({ fromBot: true }); return; }
  if (!availableMoves.length) {
    setStatus("Bot hamle bulamadı.");
    addLog("Bot pas.");
    finishTurn();
    return;
  }

  const mv = chooseBotMove(gameState, botPlayer, availableMoves);
  isAnimating = true;
  render();
  animateMove(mv, botPlayer, () => {
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
  if (!autoRollEnabled || winner || hasRolled || isBotTurn() || isAnimating) return;

  pendingAutoRollTimer = window.setTimeout(() => {
    pendingAutoRollTimer = null;
    if (!autoRollEnabled || winner || hasRolled || isBotTurn() || isAnimating) return;
    onRollDice({ fromAuto: true });
  }, AUTO_ROLL_DELAY_MS);
}

function clearPendingAutoRollTimer() {
  if (pendingAutoRollTimer === null) return;
  clearTimeout(pendingAutoRollTimer);
  pendingAutoRollTimer = null;
}

// ── Render ───────────────────────────────────────────────────────

function render() {
  renderTurnInfo();
  renderStatus();
  renderDice();
  renderBoardState();
  renderHighlights();
  renderMoveLog();
}

function renderTurnInfo() {
  const lbl = isBotTurn() ? `${playerText(currentPlayer)} (Bot)` : playerText(currentPlayer);
  dom.currentPlayer.textContent = lbl;
  dom.currentPlayer.classList.toggle("winner", Boolean(winner));
  dom.rollBtn.disabled  = hasRolled || Boolean(winner) || isBotTurn() || isAnimating;
  dom.undoBtn.disabled  = !canUndoCurrentTurn();
  dom.modeSelect.value  = gameMode;
  if (dom.autoRollToggle) {
    dom.autoRollToggle.checked = autoRollEnabled;
  }
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
  const canDrag = hasRolled && !winner && !isBotTurn() && !isAnimating;

  for (let pt = 1; pt <= POINT_COUNT; pt++) {
    const ps    = gameState.points[pt - 1];
    const stack = document.getElementById(`stack-${pt}`);
    const el    = pointElements.get(pt);
    stack.innerHTML = "";

    if (!ps.owner || ps.count === 0) { el.classList.remove("blocked"); continue; }

    const show = Math.min(ps.count, 5);
    for (let i = 0; i < show; i++) {
      const ch = document.createElement("span");
      ch.className = `checker ${ps.owner}`;
      const canDragThis = canDrag && sel.has(pt) && ps.owner === currentPlayer;
      ch.draggable = canDragThis;
      if (canDragThis) {
        ch.classList.add("draggable-checker");
        ch.dataset.source = String(pt);
        ch.addEventListener("dragstart", onDragStartFromChecker);
        ch.addEventListener("dragend",   onDragEnd);
      }
      stack.appendChild(ch);
    }

    if (ps.count > 5) {
      const badge = document.createElement("span");
      badge.className = "count-badge";
      badge.textContent = `+${ps.count - 5}`;
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

  if (!hasRolled || winner || isBotTurn() || isAnimating) return;

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
  wrap.className = `center-dice-wrap ${toneClass}`;

  dom.centerDiceStage.classList.remove("white-turn", "black-turn");
  dom.centerDiceStage.classList.add(player === WHITE ? "white-turn" : "black-turn");

  [d1, d2].forEach((val, i) => {
    const die = document.createElement("div");
    die.className = `center-die ${toneClass} rolling`;
    die.style.animationDelay = `${i * 80}ms`;
    die.appendChild(createDiePips(val, "large"));
    wrap.appendChild(die);
  });

  dom.centerDiceStage.appendChild(wrap);
  dom.centerDiceStage.classList.add("show");

  window.setTimeout(() => {
    wrap.querySelectorAll(".center-die").forEach(d => d.classList.remove("rolling"));
  }, 940);

  window.setTimeout(() => {
    dom.centerDiceStage.classList.remove("show", "white-turn", "black-turn");
  }, 2600);
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
function playerText(player)        { return player === WHITE ? "Beyaz" : "Siyah"; }
function isBotTurn()               { return gameMode === "bot" && currentPlayer === botPlayer && !winner; }
function randomDie()               { return Math.floor(Math.random() * 6) + 1; }
