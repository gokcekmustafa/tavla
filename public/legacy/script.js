const WHITE = "white";
const BLACK = "black";
const POINT_COUNT = 24;
const CHECKERS_PER_PLAYER = 15;
const BOT_DELAY_MS = 900;
const BOT_MOVE_DELAY_MS = 700;
const LOG_LIMIT = 140;
const ANIMATION_DURATION_MS = 420;

const dom = {
  boardGrid: document.getElementById("board-grid"),
  centerDiceStage: document.getElementById("center-dice-stage"),
  currentPlayer: document.getElementById("current-player"),
  diceContainer: document.getElementById("dice-container"),
  statusText: document.getElementById("status-text"),
  rollBtn: document.getElementById("roll-btn"),
  newGameBtn: document.getElementById("new-game-btn"),
  undoBtn: document.getElementById("undo-btn"),
  modeSelect: document.getElementById("game-mode-select"),
  moveLog: document.getElementById("move-log"),
  offWhite: document.getElementById("off-white"),
  offBlack: document.getElementById("off-black"),
  offWhiteCount: document.getElementById("off-white-count"),
  offBlackCount: document.getElementById("off-black-count"),
};

const pointElements = new Map();
const barSlotElements = new Map();

let gameState = createInitialState();
let currentPlayer = WHITE;
let remainingDice = [];
let hasRolled = false;
let selectedSource = null;
let availableMoves = [];
let winner = null;
let statusMessage = "Beyaz başlıyor. Zar atarak oyunu başlat.";
let gameMode = window.__BOOT_MODE__ === "bot" ? "bot" : "local";
let moveLog = [];
let pendingBotTimer = null;
let turnUndoSnapshot = null;
let movesMadeThisTurn = 0;
let dragSource = null;
let lastRolledDice = [];
let isAnimating = false;

const botPlayer = BLACK;

buildBoard();
attachEvents();
addLog(gameMode === "bot" ? "Bilgisayara karşı modda yeni oyun hazır." : "Yeni oyun hazır.");
render();

// ─── State ────────────────────────────────────────────────────────────────────

function createInitialState() {
  const state = {
    points: Array.from({ length: POINT_COUNT }, () => ({ owner: null, count: 0 })),
    bar: { [WHITE]: 0, [BLACK]: 0 },
    borneOff: { [WHITE]: 0, [BLACK]: 0 },
  };
  addCheckers(state, 24, WHITE, 2);
  addCheckers(state, 13, WHITE, 5);
  addCheckers(state, 8, WHITE, 3);
  addCheckers(state, 6, WHITE, 5);
  addCheckers(state, 1, BLACK, 2);
  addCheckers(state, 12, BLACK, 5);
  addCheckers(state, 17, BLACK, 3);
  addCheckers(state, 19, BLACK, 5);
  return state;
}

function addCheckers(state, point, player, amount) {
  const target = state.points[point - 1];
  target.owner = player;
  target.count += amount;
}

// ─── Board Build ──────────────────────────────────────────────────────────────

function buildBoard() {
  dom.boardGrid.innerHTML = "";

  const topRow = [13, 14, 15, 16, 17, 18, null, 19, 20, 21, 22, 23, 24];
  const bottomRow = [12, 11, 10, 9, 8, 7, null, 6, 5, 4, 3, 2, 1];

  renderRow(topRow, "top", 1);
  renderRow(bottomRow, "bottom", 2);

  const barZone = document.createElement("div");
  barZone.className = "bar-zone";
  barZone.id = "bar-zone";

  const blackBar = createBarSlot(BLACK, "Siyah Bar");
  const whiteBar = createBarSlot(WHITE, "Beyaz Bar");
  barZone.append(blackBar, whiteBar);
  dom.boardGrid.appendChild(barZone);
}

function createBarSlot(player, title) {
  const slot = document.createElement("button");
  slot.type = "button";
  slot.className = "bar-slot";
  slot.dataset.source = "bar";
  slot.dataset.player = player;
  slot.addEventListener("click", onBarSlotClick);
  slot.addEventListener("dragstart", onDragStartFromBar);
  slot.addEventListener("dragover", onDragOverTarget);
  slot.addEventListener("drop", onDropOnBar);
  slot.addEventListener("dragend", onDragEnd);

  const label = document.createElement("p");
  label.className = "bar-slot-title";
  label.textContent = title;

  const count = document.createElement("p");
  count.className = "bar-count";
  count.id = `bar-${player}-count`;
  count.textContent = "0 taş";

  const stack = document.createElement("div");
  stack.className = "bar-stack";
  stack.id = `bar-${player}-stack`;

  slot.append(label, count, stack);
  barSlotElements.set(player, slot);
  return slot;
}

function renderRow(rowConfig, side, gridRow) {
  rowConfig.forEach((point, index) => {
    if (!point) return;

    const pointEl = document.createElement("button");
    pointEl.type = "button";
    pointEl.className = `point ${side}`;
    pointEl.dataset.point = String(point);
    pointEl.style.gridColumn = String(index + 1);
    pointEl.style.gridRow = String(gridRow);
    pointEl.addEventListener("click", onPointClick);
    pointEl.addEventListener("dragover", onDragOverTarget);
    pointEl.addEventListener("drop", onDropOnPoint);

    const triangle = document.createElement("div");
    triangle.className = "point-triangle";

    const label = document.createElement("p");
    label.className = "point-label";
    label.textContent = String(point);

    const stack = document.createElement("div");
    stack.className = "checker-stack";
    stack.id = `stack-${point}`;

    pointEl.append(triangle, label, stack);
    dom.boardGrid.appendChild(pointEl);
    pointElements.set(point, pointEl);
  });
}

// ─── Events ───────────────────────────────────────────────────────────────────

function attachEvents() {
  dom.rollBtn.addEventListener("click", onRollDice);
  dom.newGameBtn.addEventListener("click", onNewGame);
  dom.undoBtn.addEventListener("click", onUndoMove);
  dom.modeSelect.addEventListener("change", onModeChange);
  dom.offWhite.addEventListener("click", onOffAreaClick);
  dom.offBlack.addEventListener("click", onOffAreaClick);
  dom.offWhite.addEventListener("dragover", onDragOverTarget);
  dom.offBlack.addEventListener("dragover", onDragOverTarget);
  dom.offWhite.addEventListener("drop", onDropOnOffArea);
  dom.offBlack.addEventListener("drop", onDropOnOffArea);
}

function onNewGame() {
  clearPendingBotTimer();
  gameState = createInitialState();
  currentPlayer = WHITE;
  remainingDice = [];
  hasRolled = false;
  selectedSource = null;
  availableMoves = [];
  winner = null;
  moveLog = [];
  turnUndoSnapshot = null;
  movesMadeThisTurn = 0;
  dragSource = null;
  lastRolledDice = [];
  isAnimating = false;
  setStatus("Yeni oyun başladı. Beyaz zar atsın.");
  addLog("Yeni oyun başladı.");
  render();
}

function onModeChange() {
  const nextMode = dom.modeSelect.value === "bot" ? "bot" : "local";
  if (nextMode === gameMode) return;
  gameMode = nextMode;
  clearPendingBotTimer();
  turnUndoSnapshot = null;
  movesMadeThisTurn = 0;
  dragSource = null;
  if (gameMode === "bot") {
    setStatus("Bilgisayara karşı mod aktif. Siyah bot oynar.");
    addLog("Mod değişti: Bilgisayara karşı.");
  } else {
    setStatus("İki oyunculu local mod aktif.");
    addLog("Mod değişti: İki oyuncu.");
  }
  render();
  maybeScheduleBotAction();
}

function onUndoMove() {
  if (!canUndoCurrentTurn()) {
    setStatus("Geri alma yalnızca ilk hamleden sonra kullanılabilir.");
    render();
    return;
  }
  clearPendingBotTimer();
  restoreSnapshot(turnUndoSnapshot);
  movesMadeThisTurn = 0;
  dragSource = null;
  setStatus("İlk hamle geri alındı. Turuna devam edebilirsin.");
  render();
  maybeScheduleBotAction();
}

function onRollDice(arg) {
  const invokedByBot = Boolean(arg && arg.fromBot);
  if (winner) return;
  if (isBotTurn() && !invokedByBot) {
    setStatus("Sıra bilgisayarda. Biraz bekle.");
    render();
    return;
  }
  if (hasRolled) {
    setStatus("Bu tur zar zaten atıldı. Hamle yapmaya devam et.");
    render();
    return;
  }

  const first = randomDie();
  const second = randomDie();
  lastRolledDice = [first, second];
  remainingDice = first === second ? [first, first, first, first] : [first, second];
  hasRolled = true;
  movesMadeThisTurn = 0;
  selectedSource = null;
  availableMoves = getOptimalMoves(gameState, currentPlayer, remainingDice);
  showCenterDiceRoll(first, second);

  const rolledText = first === second ? `${first}-${second} (çift)` : `${first}-${second}`;
  addLog(`${playerText(currentPlayer)} zar attı: ${rolledText}.`);

  if (!availableMoves.length) {
    setStatus(`${playerText(currentPlayer)} hamle yapamadı. Sıra rakibe geçti.`);
    addLog(`${playerText(currentPlayer)} hamle yapamadı.`);
    turnUndoSnapshot = null;
    window.setTimeout(finishTurn, 1200);
    return;
  }

  turnUndoSnapshot = captureSnapshot();
  setStatus(`${playerText(currentPlayer)} için hamle seç. Kaynak taşı tıkla.`);
  render();
  maybeScheduleBotAction();
}

function onPointClick(event) {
  if (isAnimating) return;
  const point = Number(event.currentTarget.dataset.point);
  handleSourceOrDestination(point);
}

function onBarSlotClick(event) {
  if (isAnimating) return;
  const player = event.currentTarget.dataset.player;
  if (player !== currentPlayer) return;
  handleSourceOrDestination("bar");
}

function onOffAreaClick(event) {
  if (isAnimating || isBotTurn()) {
    setStatus("Sıra bilgisayarda.");
    render();
    return;
  }
  const targetPlayer = event.currentTarget.dataset.off;
  if (targetPlayer !== currentPlayer || selectedSource === null) return;
  const move = pickPreferredMove(
    availableMoves.filter((c) => c.from === selectedSource && c.to === "off"),
  );
  if (!move) return;
  playMove(move);
}

// ─── Drag & Drop ──────────────────────────────────────────────────────────────

function onDragStartFromChecker(event) {
  if (isBotTurn() || !hasRolled || isAnimating) {
    event.preventDefault();
    return;
  }
  const source = Number(event.currentTarget.dataset.source);
  dragSource = source;
  selectedSource = source;
  render();
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", String(source));
}

function onDragStartFromBar(event) {
  const player = event.currentTarget.dataset.player;
  if (player !== currentPlayer || isBotTurn() || !hasRolled || isAnimating) {
    event.preventDefault();
    return;
  }
  dragSource = "bar";
  selectedSource = "bar";
  render();
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", "bar");
}

function onDragEnd() {
  dragSource = null;
  render();
}

function onDragOverTarget(event) {
  if (!hasRolled || winner || isBotTurn() || dragSource === null || isAnimating) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

function onDropOnPoint(event) {
  event.preventDefault();
  if (dragSource === null) return;
  const targetPoint = Number(event.currentTarget.dataset.point);
  attemptMoveFromSourceToTarget(dragSource, targetPoint);
  dragSource = null;
}

function onDropOnBar(event) {
  event.preventDefault();
  dragSource = null;
}

function onDropOnOffArea(event) {
  event.preventDefault();
  const targetPlayer = event.currentTarget.dataset.off;
  if (targetPlayer !== currentPlayer || dragSource === null) return;
  attemptMoveFromSourceToTarget(dragSource, "off");
  dragSource = null;
}

function attemptMoveFromSourceToTarget(source, target) {
  if (winner || isBotTurn() || !hasRolled || isAnimating) {
    dragSource = null;
    return;
  }
  const matchingMoves = availableMoves.filter(
    (c) => c.from === source && c.to === target,
  );
  if (matchingMoves.length) {
    playMove(pickPreferredMove(matchingMoves));
    return;
  }
  if (getSelectableSources().has(source)) {
    selectedSource = source;
  }
  setStatus("Bu hamle geçersiz.");
  render();
}

function handleSourceOrDestination(target) {
  if (winner || isAnimating) return;
  if (isBotTurn()) {
    setStatus("Sıra bilgisayarda. Hamle bekleniyor.");
    render();
    return;
  }
  if (!hasRolled) {
    setStatus("Önce zar atman gerekiyor.");
    render();
    return;
  }

  const selectableSources = getSelectableSources();

  if (selectedSource === null) {
    if (!selectableSources.has(target)) {
      setStatus("Bu taş için geçerli hamle yok.");
      render();
      return;
    }
    selectedSource = target;
    render();
    return;
  }

  if (selectedSource === target) {
    selectedSource = null;
    render();
    return;
  }

  const matchingMoves = availableMoves.filter(
    (c) => c.from === selectedSource && c.to === target,
  );

  if (matchingMoves.length) {
    playMove(pickPreferredMove(matchingMoves));
    return;
  }

  if (selectableSources.has(target)) {
    selectedSource = target;
    render();
    return;
  }

  setStatus("Seçili taş bu hedefe gidemiyor.");
  render();
}

// ─── Move Animation ───────────────────────────────────────────────────────────

function animateCheckerMove(fromPoint, toPoint, player, callback) {
  const fromEl = fromPoint === "bar"
    ? document.getElementById(`bar-${player}-stack`)
    : document.getElementById(`stack-${fromPoint}`);
  const toEl = toPoint === "off"
    ? (player === WHITE ? dom.offWhite : dom.offBlack)
    : document.getElementById(`stack-${toPoint}`);

  if (!fromEl || !toEl) {
    callback();
    return;
  }

  const fromRect = fromEl.getBoundingClientRect();
  const toRect = toEl.getBoundingClientRect();

  const ghost = document.createElement("span");
  ghost.className = `checker ${player} checker-ghost`;
  ghost.style.cssText = `
    position: fixed;
    left: ${fromRect.left + fromRect.width / 2 - 18}px;
    top: ${fromRect.top + fromRect.height / 2 - 18}px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    pointer-events: none;
    z-index: 9999;
    transition: left ${ANIMATION_DURATION_MS}ms cubic-bezier(0.4,0,0.2,1),
                top ${ANIMATION_DURATION_MS}ms cubic-bezier(0.4,0,0.2,1),
                transform ${ANIMATION_DURATION_MS}ms ease;
    transform: scale(1.15);
    box-shadow: 0 8px 32px rgba(0,0,0,0.45);
  `;
  document.body.appendChild(ghost);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ghost.style.left = `${toRect.left + toRect.width / 2 - 18}px`;
      ghost.style.top = `${toRect.top + toRect.height / 2 - 18}px`;
      ghost.style.transform = "scale(1)";
    });
  });

  window.setTimeout(() => {
    ghost.remove();
    callback();
  }, ANIMATION_DURATION_MS + 30);
}

// ─── Play Move ────────────────────────────────────────────────────────────────

function playMove(move, skipAnimation) {
  if (!move) return;

  const fromPoint = move.from;
  const toPoint = move.to;
  const player = currentPlayer;

  if (skipAnimation) {
    executeMove(move);
    return;
  }

  isAnimating = true;
  render();

  animateCheckerMove(fromPoint, toPoint, player, () => {
    isAnimating = false;
    executeMove(move);
  });
}

function executeMove(move) {
  const hit = move.to !== "off" && isHitMove(gameState, currentPlayer, move);
  gameState = applyMove(gameState, currentPlayer, move);
  remainingDice = removeOneDie(remainingDice, move.die);
  movesMadeThisTurn += 1;
  selectedSource = null;
  dragSource = null;

  addLog(formatMoveLog(currentPlayer, move, hit));

  if (gameState.borneOff[currentPlayer] >= CHECKERS_PER_PLAYER) {
    winner = currentPlayer;
    hasRolled = false;
    remainingDice = [];
    availableMoves = [];
    turnUndoSnapshot = null;
    setStatus(`🏆 ${playerText(currentPlayer)} oyunu kazandı! Tebrikler.`);
    addLog(`${playerText(currentPlayer)} oyunu kazandı.`);
    render();
    return;
  }

  if (!remainingDice.length) {
    setStatus(`${playerText(currentPlayer)} turunu tamamladı.`);
    finishTurn();
    return;
  }

  availableMoves = getOptimalMoves(gameState, currentPlayer, remainingDice);

  if (!availableMoves.length) {
    setStatus("Kalan zarlarla geçerli hamle yok. Sıra rakibe geçti.");
    addLog(`${playerText(currentPlayer)} kalan zarlarla hamle yapamadı.`);
    finishTurn();
    return;
  }

  setStatus(`${playerText(currentPlayer)} hamleye devam et.`);
  render();
  maybeScheduleBotAction();
}

function finishTurn() {
  hasRolled = false;
  remainingDice = [];
  availableMoves = [];
  selectedSource = null;
  dragSource = null;
  movesMadeThisTurn = 0;
  turnUndoSnapshot = null;
  lastRolledDice = [];
  currentPlayer = opponentOf(currentPlayer);
  render();
  maybeScheduleBotAction();
}

// ─── Bot ──────────────────────────────────────────────────────────────────────

function maybeScheduleBotAction() {
  clearPendingBotTimer();
  if (!isBotTurn()) return;
  pendingBotTimer = window.setTimeout(() => {
    pendingBotTimer = null;
    runBotAction();
  }, BOT_DELAY_MS);
}

function runBotAction() {
  if (!isBotTurn() || winner) return;

  if (!hasRolled) {
    onRollDice({ fromBot: true });
    return;
  }

  if (!availableMoves.length) {
    setStatus("Bot hamle bulamadı. Tur bitti.");
    addLog("Bot hamle bulamadı.");
    finishTurn();
    return;
  }

  const chosenMove = chooseBotMove(gameState, botPlayer, availableMoves);

  // Bot hamlesi animasyonlu ve görünür şekilde oynanır
  isAnimating = true;
  render();

  animateCheckerMove(chosenMove.from, chosenMove.to, botPlayer, () => {
    isAnimating = false;
    executeMove(chosenMove);
  });
}

function clearPendingBotTimer() {
  if (pendingBotTimer === null) return;
  clearTimeout(pendingBotTimer);
  pendingBotTimer = null;
}

// ─── Render ───────────────────────────────────────────────────────────────────

function render() {
  renderTurnInfo();
  renderStatus();
  renderDice();
  renderBoardState();
  renderHighlights();
  renderMoveLog();
}

function renderTurnInfo() {
  const turnLabel = isBotTurn() ? `${playerText(currentPlayer)} (Bot)` : playerText(currentPlayer);
  dom.currentPlayer.textContent = turnLabel;
  dom.currentPlayer.classList.toggle("winner", Boolean(winner));
  dom.rollBtn.disabled = hasRolled || Boolean(winner) || isBotTurn() || isAnimating;
  dom.undoBtn.disabled = !canUndoCurrentTurn();
  dom.modeSelect.value = gameMode;
}

function renderStatus() {
  dom.statusText.textContent = statusMessage;
}

function renderDice() {
  dom.diceContainer.innerHTML = "";
  if (!lastRolledDice.length) return;

  const isDouble = lastRolledDice.length === 4 || (lastRolledDice.length === 2 && lastRolledDice[0] === lastRolledDice[1]);
  const displayDice = isDouble ? [lastRolledDice[0], lastRolledDice[0]] : lastRolledDice;

  displayDice.forEach((die, i) => {
    const chip = document.createElement("span");
    chip.className = "die-chip";
    chip.dataset.value = String(die);

    // Dot-based dice face
    const dots = getDotPositions(die);
    dots.forEach(pos => {
      const dot = document.createElement("span");
      dot.className = `die-dot dot-${pos}`;
      chip.appendChild(dot);
    });

    const usedCount = isDouble
      ? Math.max(0, 2 - remainingDice.filter(d => d === die).length / 2)
      : (remainingDice.includes(die) ? 0 : 1);
    if (!remainingDice.includes(die) || (isDouble && i >= remainingDice.length)) {
      chip.classList.add("die-used");
    }

    dom.diceContainer.appendChild(chip);
  });

  if (isDouble) {
    const badge = document.createElement("span");
    badge.className = "double-badge";
    badge.textContent = `×${remainingDice.length}`;
    dom.diceContainer.appendChild(badge);
  }
}

function getDotPositions(value) {
  const positions = {
    1: ["center"],
    2: ["top-right", "bottom-left"],
    3: ["top-right", "center", "bottom-left"],
    4: ["top-left", "top-right", "bottom-left", "bottom-right"],
    5: ["top-left", "top-right", "center", "bottom-left", "bottom-right"],
    6: ["top-left", "top-right", "mid-left", "mid-right", "bottom-left", "bottom-right"],
  };
  return positions[value] || [];
}

function renderBoardState() {
  const selectableSources = getSelectableSources();
  const dragAllowed = hasRolled && !winner && !isBotTurn() && !isAnimating;

  for (let point = 1; point <= POINT_COUNT; point += 1) {
    const pointState = gameState.points[point - 1];
    const stack = document.getElementById(`stack-${point}`);
    const pointEl = pointElements.get(point);
    stack.innerHTML = "";

    if (!pointState.owner || pointState.count === 0) {
      pointEl.classList.remove("blocked");
      continue;
    }

    const displayCount = Math.min(pointState.count, 5);
    for (let i = 0; i < displayCount; i += 1) {
      const checker = document.createElement("span");
      checker.className = `checker ${pointState.owner}`;
      const canDrag = dragAllowed && selectableSources.has(point) && pointState.owner === currentPlayer;
      checker.draggable = canDrag;
      if (canDrag) {
        checker.classList.add("draggable-checker");
        checker.dataset.source = String(point);
        checker.addEventListener("dragstart", onDragStartFromChecker);
        checker.addEventListener("dragend", onDragEnd);
      }
      stack.appendChild(checker);
    }

    if (pointState.count > 5) {
      const badge = document.createElement("span");
      badge.className = "count-badge";
      badge.textContent = `+${pointState.count - 5}`;
      stack.appendChild(badge);
    }

    pointEl.classList.toggle("blocked", pointState.owner !== currentPlayer && pointState.count >= 2);
  }

  const canDragFromBar = dragAllowed && selectableSources.has("bar") && gameState.bar[currentPlayer] > 0;
  const currentBarSlot = barSlotElements.get(currentPlayer);
  if (currentBarSlot) {
    currentBarSlot.draggable = canDragFromBar;
    currentBarSlot.classList.toggle("draggable-source", canDragFromBar);
  }

  renderBar(BLACK);
  renderBar(WHITE);
  dom.offWhiteCount.textContent = `${gameState.borneOff[WHITE]} / ${CHECKERS_PER_PLAYER}`;
  dom.offBlackCount.textContent = `${gameState.borneOff[BLACK]} / ${CHECKERS_PER_PLAYER}`;
}

function renderBar(player) {
  const count = gameState.bar[player];
  const countEl = document.getElementById(`bar-${player}-count`);
  const stackEl = document.getElementById(`bar-${player}-stack`);
  countEl.textContent = `${count} taş`;
  stackEl.innerHTML = "";

  const displayCount = Math.min(count, 8);
  for (let i = 0; i < displayCount; i += 1) {
    const chip = document.createElement("span");
    chip.className = `bar-chip ${player}`;
    stackEl.appendChild(chip);
  }
}

function renderHighlights() {
  for (const pointEl of pointElements.values()) {
    pointEl.classList.remove("selectable-source", "selected-source", "highlight-target");
  }
  for (const slot of barSlotElements.values()) {
    slot.classList.remove("selectable-source", "selected-source", "highlight-target");
  }
  dom.offWhite.classList.remove("highlight-target");
  dom.offBlack.classList.remove("highlight-target");

  if (!hasRolled || winner || isBotTurn() || isAnimating) return;

  const selectableSources = getSelectableSources();
  for (const source of selectableSources) {
    if (source === "bar") {
      barSlotElements.get(currentPlayer)?.classList.add("selectable-source");
    } else {
      pointElements.get(source)?.classList.add("selectable-source");
    }
  }

  if (selectedSource === null) return;

  if (selectedSource === "bar") {
    barSlotElements.get(currentPlayer)?.classList.add("selected-source");
  } else {
    pointElements.get(selectedSource)?.classList.add("selected-source");
  }

  const targets = new Set(
    availableMoves.filter((m) => m.from === selectedSource).map((m) => m.to),
  );

  for (const target of targets) {
    if (target === "off") {
      if (currentPlayer === WHITE) dom.offWhite.classList.add("highlight-target");
      else dom.offBlack.classList.add("highlight-target");
    } else {
      pointElements.get(target)?.classList.add("highlight-target");
    }
  }
}

function renderMoveLog() {
  dom.moveLog.innerHTML = "";
  if (!moveLog.length) {
    const empty = document.createElement("li");
    empty.className = "empty-log";
    empty.textContent = "Henüz hamle yok.";
    dom.moveLog.appendChild(empty);
    return;
  }
  [...moveLog].reverse().forEach((entry, index) => {
    const item = document.createElement("li");
    item.textContent = `${moveLog.length - index}. ${entry}`;
    dom.moveLog.appendChild(item);
  });
}

// ─── Dice Roll Center Animation ───────────────────────────────────────────────

function showCenterDiceRoll(first, second) {
  if (!dom.centerDiceStage) return;
  dom.centerDiceStage.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "center-dice-wrap";

  [first, second].forEach((die, i) => {
    const dieEl = document.createElement("div");
    dieEl.className = "center-die rolling";
    dieEl.style.animationDelay = `${i * 60}ms`;

    const dots = getDotPositions(die);
    dots.forEach(pos => {
      const dot = document.createElement("span");
      dot.className = `die-dot dot-${pos}`;
      dieEl.appendChild(dot);
    });

    wrap.appendChild(dieEl);
  });

  dom.centerDiceStage.appendChild(wrap);
  dom.centerDiceStage.classList.add("show");

  window.setTimeout(() => {
    wrap.querySelectorAll(".center-die").forEach(d => d.classList.remove("rolling"));
  }, 600);

  window.setTimeout(() => {
    dom.centerDiceStage.classList.remove("show");
  }, 1800);
}

// ─── Log ──────────────────────────────────────────────────────────────────────

function addLog(text) {
  moveLog.push(text);
  if (moveLog.length > LOG_LIMIT) moveLog = moveLog.slice(moveLog.length - LOG_LIMIT);
}

function setStatus(text) {
  statusMessage = text;
}

// ─── Snapshot ─────────────────────────────────────────────────────────────────

function captureSnapshot() {
  return {
    gameState: cloneState(gameState),
    currentPlayer,
    remainingDice: [...remainingDice],
    hasRolled,
    selectedSource,
    availableMoves: cloneMoves(availableMoves),
    winner,
    statusMessage,
    gameMode,
    moveLog: [...moveLog],
    lastRolledDice: [...lastRolledDice],
  };
}

function canUndoCurrentTurn() {
  return Boolean(
    turnUndoSnapshot &&
    hasRolled &&
    !winner &&
    !isBotTurn() &&
    movesMadeThisTurn === 1 &&
    !isAnimating,
  );
}

function restoreSnapshot(snapshot) {
  gameState = cloneState(snapshot.gameState);
  currentPlayer = snapshot.currentPlayer;
  remainingDice = [...snapshot.remainingDice];
  hasRolled = snapshot.hasRolled;
  selectedSource = snapshot.selectedSource;
  availableMoves = cloneMoves(snapshot.availableMoves);
  winner = snapshot.winner;
  statusMessage = snapshot.statusMessage;
  gameMode = snapshot.gameMode;
  moveLog = [...snapshot.moveLog];
  lastRolledDice = [...(snapshot.lastRolledDice || [])];
}

// ─── Game Logic ───────────────────────────────────────────────────────────────

function cloneMoves(moves) {
  return moves.map((m) => ({ ...m }));
}

function isBotTurn() {
  return gameMode === "bot" && currentPlayer === botPlayer && !winner;
}

function formatMoveLog(player, move, hit) {
  const fromText = move.from === "bar" ? "bar" : String(move.from);
  const toText = move.to === "off" ? "off" : String(move.to);
  const hitText = hit ? " ✕" : "";
  return `${playerText(player)}: ${fromText}→${toText} (${move.die})${hitText}`;
}

function isHitMove(state, player, move) {
  if (move.to === "off") return false;
  const target = state.points[move.to - 1];
  return target.owner === opponentOf(player) && target.count === 1;
}

// ─── Smarter Bot ──────────────────────────────────────────────────────────────

function chooseBotMove(state, player, moves) {
  // Evaluate each move with look-ahead scoring
  let bestMove = moves[0];
  let bestScore = -Infinity;

  for (const move of moves) {
    const score = scoreBotMoveDeep(state, player, move);
    if (score > bestScore || (score === bestScore && Math.random() > 0.6)) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

function scoreBotMoveDeep(state, player, move) {
  const hit = isHitMove(state, player, move);
  const nextState = applyMove(state, player, move);
  const opponent = opponentOf(player);

  let score = 0;

  // Priority 1: Bearing off is always best
  if (move.to === "off") {
    score += 200;
    return score;
  }

  // Priority 2: Must enter from bar
  if (move.from === "bar") score += 50;

  // Priority 3: Hit opponent blot (exposed checker)
  if (hit) {
    score += 80;
    // Extra bonus if opponent is close to bearing off
    const opponentProgress = getPlayerProgress(state, opponent);
    if (opponentProgress > 0.7) score += 40;
  }

  // Priority 4: Build primes (blocks of 2+)
  if (move.to !== "off") {
    const dest = nextState.points[move.to - 1];
    if (dest.owner === player) {
      if (dest.count >= 2) score += 30; // Making a point
      if (dest.count >= 3) score += 10; // Stronger block
      if (dest.count === 1) {
        // Don't leave blots in dangerous areas
        const threats = getHitThreatCount(nextState, player, move.to);
        score -= threats * 15;
      }
    }
  }

  // Priority 5: Advance checkers efficiently
  score += moveProgress(player, move.from, move.to) * 4;

  // Priority 6: Avoid leaving blots near opponent
  if (move.from !== "bar" && move.to !== "off") {
    const sourceAfter = nextState.points[move.from - 1];
    if (sourceAfter.count === 0) {
      // We cleared the source point — check if it was a blot before
      // clearing a blot can be good
      score += 5;
    }
  }

  // Priority 7: Positional — prefer building home board
  if (move.to !== "off" && isHomePoint(player, move.to)) {
    score += 8;
  }

  // Priority 8: Use higher dice value
  score += move.die;

  return score;
}

function getPlayerProgress(state, player) {
  let totalDistance = 0;
  const maxDistance = CHECKERS_PER_PLAYER * 24;

  for (let point = 1; point <= POINT_COUNT; point++) {
    const ps = state.points[point - 1];
    if (ps.owner === player) {
      const dist = player === WHITE ? point : 25 - point;
      totalDistance += ps.count * dist;
    }
  }
  totalDistance += state.bar[player] * 25;

  return 1 - totalDistance / maxDistance;
}

function scoreBotMove(state, player, move) {
  return scoreBotMoveDeep(state, player, move);
}

function moveProgress(player, from, to) {
  if (to === "off") return player === WHITE ? from : 25 - from;
  if (from === "bar") return player === WHITE ? 25 - to : to;
  return Math.abs(to - from);
}

function getHitThreatCount(state, player, point) {
  const opponent = opponentOf(player);
  let threats = 0;
  for (let source = 1; source <= POINT_COUNT; source++) {
    const sourceState = state.points[source - 1];
    if (sourceState.owner !== opponent || sourceState.count === 0) continue;
    const distance = (point - source) * directionOf(opponent);
    if (distance >= 1 && distance <= 6) threats++;
  }
  if (state.bar[opponent] > 0) {
    const dieNeeded = dieNeededFromBar(opponent, point);
    if (dieNeeded >= 1 && dieNeeded <= 6) threats += 2;
  }
  return threats;
}

function dieNeededFromBar(player, point) {
  return player === WHITE ? 25 - point : point;
}

function getSelectableSources() {
  return new Set(availableMoves.map((m) => m.from));
}

function getOptimalMoves(state, player, dice) {
  const allMoves = getAllPossibleMoves(state, player, dice);
  if (!allMoves.length) return [];

  const memo = new Map();
  const maxDepth = maxMovesPossible(state, player, dice, memo);
  let optimalMoves = [];

  for (const move of allMoves) {
    const nextState = applyMove(state, player, move);
    const nextDice = removeOneDie(dice, move.die);
    const depth = 1 + maxMovesPossible(nextState, player, nextDice, memo);
    if (depth === maxDepth) optimalMoves.push(move);
  }

  const hasDifferentDice = new Set(dice).size > 1;
  if (maxDepth === 1 && dice.length >= 2 && hasDifferentDice) {
    const highestDie = Math.max(...optimalMoves.map((m) => m.die));
    optimalMoves = optimalMoves.filter((m) => m.die === highestDie);
  }

  return uniqueMoves(optimalMoves);
}

function maxMovesPossible(state, player, dice, memo) {
  if (!dice.length) return 0;
  const key = serializeForMemo(state, player, dice);
  if (memo.has(key)) return memo.get(key);

  const moves = getAllPossibleMoves(state, player, dice);
  if (!moves.length) {
    memo.set(key, 0);
    return 0;
  }

  let best = 0;
  for (const move of moves) {
    const nextState = applyMove(state, player, move);
    const nextDice = removeOneDie(dice, move.die);
    const score = 1 + maxMovesPossible(nextState, player, nextDice, memo);
    if (score > best) best = score;
  }

  memo.set(key, best);
  return best;
}

function getAllPossibleMoves(state, player, dice) {
  const uniqueDice = [...new Set(dice)];
  const moves = [];
  for (const die of uniqueDice) moves.push(...getMovesByDie(state, player, die));
  return uniqueMoves(moves);
}

function getMovesByDie(state, player, die) {
  const sources = collectSources(state, player);
  const opponent = opponentOf(player);
  const moves = [];

  for (const source of sources) {
    const target = source === "bar"
      ? entryPointFromBar(player, die)
      : source + directionOf(player) * die;

    if (target >= 1 && target <= POINT_COUNT) {
      const pointState = state.points[target - 1];
      if (pointState.owner === opponent && pointState.count >= 2) continue;
      moves.push({ from: source, to: target, die });
      continue;
    }

    if (source === "bar") continue;

    if (canBearOff(state, player, source, die)) {
      moves.push({ from: source, to: "off", die });
    }
  }

  return moves;
}

function collectSources(state, player) {
  if (state.bar[player] > 0) return ["bar"];
  const sources = [];
  for (let point = 1; point <= POINT_COUNT; point++) {
    const ps = state.points[point - 1];
    if (ps.owner === player && ps.count > 0) sources.push(point);
  }
  return sources;
}

function canBearOff(state, player, sourcePoint, die) {
  if (state.bar[player] > 0) return false;
  if (!isHomePoint(player, sourcePoint)) return false;
  if (!allCheckersInHome(state, player)) return false;

  const distance = player === WHITE ? sourcePoint : 25 - sourcePoint;
  if (die === distance) return true;
  if (die < distance) return false;

  if (player === WHITE) {
    for (let point = sourcePoint + 1; point <= 6; point++) {
      const ps = state.points[point - 1];
      if (ps.owner === WHITE && ps.count > 0) return false;
    }
    return true;
  }

  for (let point = 19; point < sourcePoint; point++) {
    const ps = state.points[point - 1];
    if (ps.owner === BLACK && ps.count > 0) return false;
  }
  return true;
}

function allCheckersInHome(state, player) {
  for (let point = 1; point <= POINT_COUNT; point++) {
    if (!isHomePoint(player, point)) {
      const ps = state.points[point - 1];
      if (ps.owner === player && ps.count > 0) return false;
    }
  }
  return true;
}

function isHomePoint(player, point) {
  return player === WHITE ? point >= 1 && point <= 6 : point >= 19 && point <= 24;
}

function applyMove(state, player, move) {
  const next = cloneState(state);
  const opponent = opponentOf(player);

  if (move.from === "bar") {
    next.bar[player] -= 1;
  } else {
    const source = next.points[move.from - 1];
    source.count -= 1;
    if (source.count === 0) source.owner = null;
  }

  if (move.to === "off") {
    next.borneOff[player] += 1;
    return next;
  }

  const destination = next.points[move.to - 1];
  if (destination.owner === opponent && destination.count === 1) {
    destination.owner = player;
    destination.count = 1;
    next.bar[opponent] += 1;
    return next;
  }

  if (!destination.owner) {
    destination.owner = player;
    destination.count = 1;
    return next;
  }

  destination.count += 1;
  return next;
}

function cloneState(state) {
  return {
    points: state.points.map((p) => ({ owner: p.owner, count: p.count })),
    bar: { [WHITE]: state.bar[WHITE], [BLACK]: state.bar[BLACK] },
    borneOff: { [WHITE]: state.borneOff[WHITE], [BLACK]: state.borneOff[BLACK] },
  };
}

function pickPreferredMove(moves) {
  if (!moves.length) return null;
  return [...moves].sort((a, b) => b.die - a.die)[0];
}

function uniqueMoves(moves) {
  const seen = new Set();
  const output = [];
  for (const move of moves) {
    const key = `${move.from}-${move.to}-${move.die}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(move);
  }
  return output;
}

function serializeForMemo(state, player, dice) {
  const points = state.points.map((p) => (!p.owner || !p.count ? "0" : `${p.owner[0]}${p.count}`)).join(".");
  const sortedDice = [...dice].sort((a, b) => a - b).join("");
  return `${player}|d${sortedDice}|b${state.bar[WHITE]}-${state.bar[BLACK]}|o${state.borneOff[WHITE]}-${state.borneOff[BLACK]}|${points}`;
}

function removeOneDie(dice, value) {
  const index = dice.findIndex((d) => d === value);
  if (index === -1) return [...dice];
  return [...dice.slice(0, index), ...dice.slice(index + 1)];
}

function entryPointFromBar(player, die) {
  return player === WHITE ? 25 - die : die;
}

function directionOf(player) {
  return player === WHITE ? -1 : 1;
}

function opponentOf(player) {
  return player === WHITE ? BLACK : WHITE;
}

function playerText(player) {
  return player === WHITE ? "Beyaz" : "Siyah";
}

function randomDie() {
  return Math.floor(Math.random() * 6) + 1;
}
