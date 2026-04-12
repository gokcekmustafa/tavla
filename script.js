const WHITE = "white";
const BLACK = "black";
const POINT_COUNT = 24;
const CHECKERS_PER_PLAYER = 15;
const BOT_DELAY_MS = 550;
const HISTORY_LIMIT = 300;
const LOG_LIMIT = 140;

const dom = {
  boardGrid: document.getElementById("board-grid"),
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
let statusMessage = "Beyaz basliyor. Zar atarak oyunu baslat.";
let gameMode = "local";
let moveLog = [];
let historyStack = [];
let pendingBotTimer = null;

const botPlayer = BLACK;

buildBoard();
attachEvents();
addLog("Yeni oyun hazir.");
render();

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

  const label = document.createElement("p");
  label.className = "bar-slot-title";
  label.textContent = title;

  const count = document.createElement("p");
  count.className = "bar-count";
  count.id = `bar-${player}-count`;
  count.textContent = "0 tas";

  const stack = document.createElement("div");
  stack.className = "bar-stack";
  stack.id = `bar-${player}-stack`;

  slot.append(label, count, stack);
  barSlotElements.set(player, slot);

  return slot;
}

function renderRow(rowConfig, side, gridRow) {
  rowConfig.forEach((point, index) => {
    if (!point) {
      return;
    }

    const pointEl = document.createElement("button");
    pointEl.type = "button";
    pointEl.className = `point ${side}`;
    pointEl.dataset.point = String(point);
    pointEl.style.gridColumn = String(index + 1);
    pointEl.style.gridRow = String(gridRow);
    pointEl.addEventListener("click", onPointClick);

    const label = document.createElement("p");
    label.className = "point-label";
    label.textContent = String(point);

    const stack = document.createElement("div");
    stack.className = "checker-stack";
    stack.id = `stack-${point}`;

    pointEl.append(label, stack);
    dom.boardGrid.appendChild(pointEl);
    pointElements.set(point, pointEl);
  });
}

function attachEvents() {
  dom.rollBtn.addEventListener("click", onRollDice);
  dom.newGameBtn.addEventListener("click", onNewGame);
  dom.undoBtn.addEventListener("click", onUndoMove);
  dom.modeSelect.addEventListener("change", onModeChange);
  dom.offWhite.addEventListener("click", onOffAreaClick);
  dom.offBlack.addEventListener("click", onOffAreaClick);
}

function onNewGame() {
  saveSnapshot();
  clearPendingBotTimer();

  gameState = createInitialState();
  currentPlayer = WHITE;
  remainingDice = [];
  hasRolled = false;
  selectedSource = null;
  availableMoves = [];
  winner = null;
  moveLog = [];

  setStatus("Yeni oyun basladi. Beyaz zar atsin.");
  addLog("Yeni oyun basladi.");
  render();
}

function onModeChange() {
  const nextMode = dom.modeSelect.value === "bot" ? "bot" : "local";
  if (nextMode === gameMode) {
    return;
  }

  saveSnapshot();
  gameMode = nextMode;
  clearPendingBotTimer();

  if (gameMode === "bot") {
    setStatus("Bilgisayara karsi mod aktif. Siyah bot oynar.");
    addLog("Mod degisti: Bilgisayara karsi.");
  } else {
    setStatus("Iki oyunculu local mod aktif.");
    addLog("Mod degisti: Iki oyuncu.");
  }

  render();
  maybeScheduleBotAction();
}

function onUndoMove() {
  if (!historyStack.length) {
    setStatus("Geri alinacak adim yok.");
    render();
    return;
  }

  clearPendingBotTimer();
  const snapshot = historyStack.pop();
  restoreSnapshot(snapshot);
  setStatus(`Geri alindi. ${snapshot.statusMessage}`);
  render();
  maybeScheduleBotAction();
}

function onRollDice(arg) {
  const invokedByBot = Boolean(arg && arg.fromBot);

  if (winner) {
    return;
  }

  if (isBotTurn() && !invokedByBot) {
    setStatus("Sira bilgisayarda. Biraz bekle.");
    render();
    return;
  }

  if (hasRolled) {
    setStatus("Bu tur zar zaten atildi. Hamle yapmaya devam et.");
    render();
    return;
  }

  saveSnapshot();
  const first = randomDie();
  const second = randomDie();
  remainingDice = first === second ? [first, first, first, first] : [first, second];
  hasRolled = true;
  selectedSource = null;
  availableMoves = getOptimalMoves(gameState, currentPlayer, remainingDice);

  const rolledText = first === second ? `${first}-${second} (cift)` : `${first}-${second}`;
  addLog(`${playerText(currentPlayer)} zar atti: ${rolledText}.`);

  if (!availableMoves.length) {
    setStatus(`${playerText(currentPlayer)} hamle yapamadi. Sira rakibe gecti.`);
    addLog(`${playerText(currentPlayer)} hamle yapamadi.`);
    finishTurn();
    return;
  }

  setStatus(`${playerText(currentPlayer)} icin hamle sec. Kaynak tasi tikla.`);
  render();
  maybeScheduleBotAction();
}

function onPointClick(event) {
  const point = Number(event.currentTarget.dataset.point);
  handleSourceOrDestination(point);
}

function onBarSlotClick(event) {
  const player = event.currentTarget.dataset.player;
  if (player !== currentPlayer) {
    return;
  }
  handleSourceOrDestination("bar");
}

function onOffAreaClick(event) {
  if (isBotTurn()) {
    setStatus("Sira bilgisayarda.");
    render();
    return;
  }

  const targetPlayer = event.currentTarget.dataset.off;
  if (targetPlayer !== currentPlayer || selectedSource === null) {
    return;
  }

  const move = pickPreferredMove(
    availableMoves.filter((candidate) => candidate.from === selectedSource && candidate.to === "off"),
  );

  if (!move) {
    return;
  }

  playMove(move);
}

function handleSourceOrDestination(target) {
  if (winner) {
    return;
  }

  if (isBotTurn()) {
    setStatus("Sira bilgisayarda. Hamle bekleniyor.");
    render();
    return;
  }

  if (!hasRolled) {
    setStatus("Once zar atman gerekiyor.");
    render();
    return;
  }

  const selectableSources = getSelectableSources();

  if (selectedSource === null) {
    if (!selectableSources.has(target)) {
      setStatus("Bu tas icin gecerli hamle yok.");
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
    (candidate) => candidate.from === selectedSource && candidate.to === target,
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

  setStatus("Secili tas bu hedefe gidemiyor.");
  render();
}

function playMove(move) {
  if (!move) {
    return;
  }

  saveSnapshot();
  const hit = move.to !== "off" && isHitMove(gameState, currentPlayer, move);
  gameState = applyMove(gameState, currentPlayer, move);
  remainingDice = removeOneDie(remainingDice, move.die);
  selectedSource = null;

  addLog(formatMoveLog(currentPlayer, move, hit));

  if (gameState.borneOff[currentPlayer] >= CHECKERS_PER_PLAYER) {
    winner = currentPlayer;
    hasRolled = false;
    remainingDice = [];
    availableMoves = [];
    setStatus(`${playerText(currentPlayer)} oyunu kazandi. Tebrikler.`);
    addLog(`${playerText(currentPlayer)} oyunu kazandi.`);
    render();
    return;
  }

  if (!remainingDice.length) {
    setStatus(`${playerText(currentPlayer)} turunu tamamladi.`);
    finishTurn();
    return;
  }

  availableMoves = getOptimalMoves(gameState, currentPlayer, remainingDice);

  if (!availableMoves.length) {
    setStatus("Kalan zarlarla gecerli hamle yok. Sira rakibe gecti.");
    addLog(`${playerText(currentPlayer)} kalan zarlarla hamle yapamadi.`);
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
  currentPlayer = opponentOf(currentPlayer);
  render();
  maybeScheduleBotAction();
}

function maybeScheduleBotAction() {
  clearPendingBotTimer();
  if (!isBotTurn()) {
    return;
  }

  pendingBotTimer = window.setTimeout(() => {
    pendingBotTimer = null;
    runBotAction();
  }, BOT_DELAY_MS);
}

function runBotAction() {
  if (!isBotTurn() || winner) {
    return;
  }

  if (!hasRolled) {
    onRollDice({ fromBot: true });
    return;
  }

  if (!availableMoves.length) {
    setStatus("Bot hamle bulamadi. Tur bitti.");
    addLog("Bot hamle bulamadi.");
    finishTurn();
    return;
  }

  const chosenMove = chooseBotMove(gameState, botPlayer, availableMoves);
  playMove(chosenMove);
}

function clearPendingBotTimer() {
  if (pendingBotTimer === null) {
    return;
  }
  clearTimeout(pendingBotTimer);
  pendingBotTimer = null;
}

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
  dom.rollBtn.disabled = hasRolled || Boolean(winner) || isBotTurn();
  dom.undoBtn.disabled = historyStack.length === 0;
  dom.modeSelect.value = gameMode;
}

function renderStatus() {
  dom.statusText.textContent = statusMessage;
}

function renderDice() {
  dom.diceContainer.innerHTML = "";
  if (!remainingDice.length) {
    return;
  }

  remainingDice.forEach((die) => {
    const chip = document.createElement("span");
    chip.className = "die-chip";
    chip.textContent = String(die);
    dom.diceContainer.appendChild(chip);
  });
}

function renderBoardState() {
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
      stack.appendChild(checker);
    }

    if (pointState.count > 5) {
      const badge = document.createElement("span");
      badge.className = "count-badge";
      badge.textContent = String(pointState.count);
      stack.appendChild(badge);
    }

    pointEl.classList.toggle("blocked", pointState.owner !== currentPlayer && pointState.count >= 2);
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
  countEl.textContent = `${count} tas`;
  stackEl.innerHTML = "";

  const displayCount = Math.min(count, 10);
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

  if (!hasRolled || winner || isBotTurn()) {
    return;
  }

  const selectableSources = getSelectableSources();
  for (const source of selectableSources) {
    if (source === "bar") {
      barSlotElements.get(currentPlayer)?.classList.add("selectable-source");
    } else {
      pointElements.get(source)?.classList.add("selectable-source");
    }
  }

  if (selectedSource === null) {
    return;
  }

  if (selectedSource === "bar") {
    barSlotElements.get(currentPlayer)?.classList.add("selected-source");
  } else {
    pointElements.get(selectedSource)?.classList.add("selected-source");
  }

  const targets = new Set(
    availableMoves.filter((move) => move.from === selectedSource).map((move) => move.to),
  );

  for (const target of targets) {
    if (target === "off") {
      if (currentPlayer === WHITE) {
        dom.offWhite.classList.add("highlight-target");
      } else {
        dom.offBlack.classList.add("highlight-target");
      }
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
    empty.textContent = "Henuz hamle yok.";
    dom.moveLog.appendChild(empty);
    return;
  }

  moveLog.forEach((entry, index) => {
    const item = document.createElement("li");
    item.textContent = `${index + 1}. ${entry}`;
    dom.moveLog.appendChild(item);
  });
}

function addLog(text) {
  moveLog.push(text);
  if (moveLog.length > LOG_LIMIT) {
    moveLog = moveLog.slice(moveLog.length - LOG_LIMIT);
  }
}

function setStatus(text) {
  statusMessage = text;
}

function saveSnapshot() {
  historyStack.push({
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
  });

  if (historyStack.length > HISTORY_LIMIT) {
    historyStack.shift();
  }
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
}

function cloneMoves(moves) {
  return moves.map((move) => ({ ...move }));
}

function isBotTurn() {
  return gameMode === "bot" && currentPlayer === botPlayer && !winner;
}

function formatMoveLog(player, move, hit) {
  const fromText = move.from === "bar" ? "bar" : String(move.from);
  const toText = move.to === "off" ? "off" : String(move.to);
  const hitText = hit ? " x" : "";
  return `${playerText(player)}: ${fromText} -> ${toText} (${move.die})${hitText}`;
}

function isHitMove(state, player, move) {
  if (move.to === "off") {
    return false;
  }
  const target = state.points[move.to - 1];
  return target.owner === opponentOf(player) && target.count === 1;
}

function chooseBotMove(state, player, moves) {
  let bestMove = moves[0];
  let bestScore = -Infinity;

  for (const move of moves) {
    const score = scoreBotMove(state, player, move);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
      continue;
    }
    if (score === bestScore && Math.random() > 0.5) {
      bestMove = move;
    }
  }

  return bestMove;
}

function scoreBotMove(state, player, move) {
  const hit = isHitMove(state, player, move);
  const nextState = applyMove(state, player, move);

  let score = move.die * 2;
  score += moveProgress(player, move.from, move.to) * 3;

  if (move.from === "bar") {
    score += 15;
  }

  if (move.to === "off") {
    score += 120;
  }

  if (hit) {
    score += 70;
  }

  if (move.to !== "off") {
    const destination = nextState.points[move.to - 1];
    if (destination.owner === player && destination.count >= 2) {
      score += 24;
    }
    if (destination.owner === player && destination.count === 1) {
      score -= getHitThreatCount(nextState, player, move.to) * 10;
    }
  }

  return score;
}

function moveProgress(player, from, to) {
  if (to === "off") {
    return player === WHITE ? from : 25 - from;
  }
  if (from === "bar") {
    return player === WHITE ? 25 - to : to;
  }
  return Math.abs(to - from);
}

function getHitThreatCount(state, player, point) {
  const opponent = opponentOf(player);
  let threats = 0;

  for (let source = 1; source <= POINT_COUNT; source += 1) {
    const sourceState = state.points[source - 1];
    if (sourceState.owner !== opponent || sourceState.count === 0) {
      continue;
    }

    const distance = (point - source) * directionOf(opponent);
    if (distance >= 1 && distance <= 6) {
      threats += 1;
    }
  }

  if (state.bar[opponent] > 0) {
    const dieNeeded = dieNeededFromBar(opponent, point);
    if (dieNeeded >= 1 && dieNeeded <= 6) {
      threats += 2;
    }
  }

  return threats;
}

function dieNeededFromBar(player, point) {
  return player === WHITE ? 25 - point : point;
}

function getSelectableSources() {
  return new Set(availableMoves.map((move) => move.from));
}

function getOptimalMoves(state, player, dice) {
  const allMoves = getAllPossibleMoves(state, player, dice);
  if (!allMoves.length) {
    return [];
  }

  const memo = new Map();
  const maxDepth = maxMovesPossible(state, player, dice, memo);
  let optimalMoves = [];

  for (const move of allMoves) {
    const nextState = applyMove(state, player, move);
    const nextDice = removeOneDie(dice, move.die);
    const depth = 1 + maxMovesPossible(nextState, player, nextDice, memo);
    if (depth === maxDepth) {
      optimalMoves.push(move);
    }
  }

  const hasDifferentDice = new Set(dice).size > 1;
  if (maxDepth === 1 && dice.length >= 2 && hasDifferentDice) {
    const highestDie = Math.max(...optimalMoves.map((move) => move.die));
    optimalMoves = optimalMoves.filter((move) => move.die === highestDie);
  }

  return uniqueMoves(optimalMoves);
}

function maxMovesPossible(state, player, dice, memo) {
  if (!dice.length) {
    return 0;
  }

  const key = serializeForMemo(state, player, dice);
  if (memo.has(key)) {
    return memo.get(key);
  }

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
    if (score > best) {
      best = score;
    }
  }

  memo.set(key, best);
  return best;
}

function getAllPossibleMoves(state, player, dice) {
  const uniqueDice = [...new Set(dice)];
  const moves = [];
  for (const die of uniqueDice) {
    moves.push(...getMovesByDie(state, player, die));
  }
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
      if (pointState.owner === opponent && pointState.count >= 2) {
        continue;
      }
      moves.push({ from: source, to: target, die });
      continue;
    }

    if (source === "bar") {
      continue;
    }

    if (canBearOff(state, player, source, die)) {
      moves.push({ from: source, to: "off", die });
    }
  }

  return moves;
}

function collectSources(state, player) {
  if (state.bar[player] > 0) {
    return ["bar"];
  }

  const sources = [];
  for (let point = 1; point <= POINT_COUNT; point += 1) {
    const pointState = state.points[point - 1];
    if (pointState.owner === player && pointState.count > 0) {
      sources.push(point);
    }
  }
  return sources;
}

function canBearOff(state, player, sourcePoint, die) {
  if (state.bar[player] > 0) {
    return false;
  }
  if (!isHomePoint(player, sourcePoint)) {
    return false;
  }
  if (!allCheckersInHome(state, player)) {
    return false;
  }

  const distance = player === WHITE ? sourcePoint : 25 - sourcePoint;
  if (die === distance) {
    return true;
  }
  if (die < distance) {
    return false;
  }

  if (player === WHITE) {
    for (let point = sourcePoint + 1; point <= 6; point += 1) {
      const pointState = state.points[point - 1];
      if (pointState.owner === WHITE && pointState.count > 0) {
        return false;
      }
    }
    return true;
  }

  for (let point = 19; point < sourcePoint; point += 1) {
    const pointState = state.points[point - 1];
    if (pointState.owner === BLACK && pointState.count > 0) {
      return false;
    }
  }
  return true;
}

function allCheckersInHome(state, player) {
  for (let point = 1; point <= POINT_COUNT; point += 1) {
    if (!isHomePoint(player, point)) {
      const pointState = state.points[point - 1];
      if (pointState.owner === player && pointState.count > 0) {
        return false;
      }
    }
  }
  return true;
}

function isHomePoint(player, point) {
  if (player === WHITE) {
    return point >= 1 && point <= 6;
  }
  return point >= 19 && point <= 24;
}

function applyMove(state, player, move) {
  const next = cloneState(state);
  const opponent = opponentOf(player);

  if (move.from === "bar") {
    next.bar[player] -= 1;
  } else {
    const source = next.points[move.from - 1];
    source.count -= 1;
    if (source.count === 0) {
      source.owner = null;
    }
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
    points: state.points.map((point) => ({ owner: point.owner, count: point.count })),
    bar: { [WHITE]: state.bar[WHITE], [BLACK]: state.bar[BLACK] },
    borneOff: { [WHITE]: state.borneOff[WHITE], [BLACK]: state.borneOff[BLACK] },
  };
}

function pickPreferredMove(moves) {
  if (!moves.length) {
    return null;
  }
  return [...moves].sort((a, b) => b.die - a.die)[0];
}

function uniqueMoves(moves) {
  const seen = new Set();
  const output = [];
  for (const move of moves) {
    const key = `${move.from}-${move.to}-${move.die}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(move);
  }
  return output;
}

function serializeForMemo(state, player, dice) {
  const points = state.points
    .map((point) => {
      if (!point.owner || !point.count) {
        return "0";
      }
      return `${point.owner[0]}${point.count}`;
    })
    .join(".");

  const sortedDice = [...dice].sort((a, b) => a - b).join("");
  return `${player}|d${sortedDice}|b${state.bar[WHITE]}-${state.bar[BLACK]}|o${state.borneOff[WHITE]}-${state.borneOff[BLACK]}|${points}`;
}

function removeOneDie(dice, value) {
  const index = dice.findIndex((die) => die === value);
  if (index === -1) {
    return [...dice];
  }
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
