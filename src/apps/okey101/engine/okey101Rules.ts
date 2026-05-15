export type OkeySeatNo = 1 | 2 | 3 | 4;
export type OkeyNormalColor = "kirmizi" | "mavi" | "sari" | "siyah";
export type OkeyTileColor = OkeyNormalColor | "sahte";
export type OkeyTileKind = "normal" | "sahte";

export type OkeyTile = {
  id: string;
  kind: OkeyTileKind;
  color: OkeyTileColor;
  value: number;
};

export type OkeyRackState = Record<OkeySeatNo, OkeyTile[]>;
export type OkeyTurnPhase = "draw" | "discard";
export type OkeyMeldKind = "seri" | "set";

export type OkeyMeldEntry = {
  id: string;
  seatNo: OkeySeatNo;
  round: number;
  tiles: OkeyTile[];
  kind: OkeyMeldKind;
  at: number;
};

export type OkeyRackSortMode = "color" | "value";

export type OkeyDealState = {
  rackState: OkeyRackState;
  wallTiles: OkeyTile[];
  indicatorTile: OkeyTile | null;
  okeyTile: OkeyTile | null;
  turnSeat: OkeySeatNo;
  turnPhase: OkeyTurnPhase;
  turnRound: number;
};

export const OKEY_RULES = {
  totalTileCount: 106,
  handTileCount: 21,
  starterBonusTileCount: 1,
  openingTargetPoints: 101,
  pairOpenMinPairs: 5,
  seats: [1, 2, 3, 4] as const,
  tileColors: ["kirmizi", "mavi", "sari", "siyah"] as const,
};

export function createSeededRandom(seed = 0) {
  let state = (Math.abs(Math.trunc(seed)) || 1) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function shuffleDeck(tiles: OkeyTile[], seed = 0) {
  const random = createSeededRandom(seed || Date.now());
  const shuffled = tiles.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = current;
  }
  return shuffled;
}

export function createDeck(seed = 0) {
  const safeSeed = Math.abs(Math.trunc(seed)) || Date.now();
  const normalCopies = 2;
  const tiles: OkeyTile[] = [];
  OKEY_RULES.tileColors.forEach((color) => {
    for (let value = 1; value <= 13; value += 1) {
      for (let copy = 1; copy <= normalCopies; copy += 1) {
        tiles.push({
          id: `okey-proto-deck-${color}-${value}-${copy}-${safeSeed}`,
          kind: "normal",
          color,
          value,
        });
      }
    }
  });
  for (let copy = 1; copy <= 2; copy += 1) {
    tiles.push({
      id: `okey-proto-deck-sahte-${copy}-${safeSeed}`,
      kind: "sahte",
      color: "sahte",
      value: 0,
    });
  }
  if (tiles.length !== OKEY_RULES.totalTileCount) {
    throw new Error(`101 deste sayisi hatali: ${tiles.length} (beklenen ${OKEY_RULES.totalTileCount})`);
  }
  return shuffleDeck(tiles, safeSeed);
}

export function createOkeyTile(indicatorTile: OkeyTile | null): OkeyTile | null {
  if (!indicatorTile || indicatorTile.kind !== "normal") return null;
  return {
    id: `okey-proto-indicator-okey-${indicatorTile.id}`,
    kind: "normal",
    color: indicatorTile.color,
    value: indicatorTile.value === 13 ? 1 : indicatorTile.value + 1,
  };
}

export function getNormalizedActiveSeats(
  activeSeats: readonly OkeySeatNo[] | null | undefined,
  firstSeat: OkeySeatNo,
) {
  const pool = activeSeats && activeSeats.length > 0 ? activeSeats : OKEY_RULES.seats;
  const deduped = Array.from(new Set(pool))
    .filter((seatNo): seatNo is OkeySeatNo => OKEY_RULES.seats.includes(seatNo as OkeySeatNo))
    .sort((left, right) => left - right);
  if (!deduped.includes(firstSeat)) {
    deduped.push(firstSeat);
    deduped.sort((left, right) => left - right);
  }
  return deduped;
}

export function createEmptyRackState(): OkeyRackState {
  return { 1: [], 2: [], 3: [], 4: [] };
}

export function createDealState(
  seed = 0,
  firstSeat: OkeySeatNo = 1,
  activeSeats?: readonly OkeySeatNo[],
): OkeyDealState {
  const safeSeed = Math.abs(Math.trunc(seed)) || Date.now();
  const wallTiles = createDeck(safeSeed);
  const indicatorIndex = wallTiles.findIndex((tile) => tile.kind === "normal");
  const indicatorTile = indicatorIndex >= 0 ? wallTiles.splice(indicatorIndex, 1)[0] ?? null : null;
  const okeyTile = createOkeyTile(indicatorTile);
  const rackState = createEmptyRackState();
  const seatsToDeal = getNormalizedActiveSeats(activeSeats, firstSeat);
  seatsToDeal.forEach((seatNo) => {
    for (let round = 0; round < OKEY_RULES.handTileCount; round += 1) {
      const nextTile = wallTiles.shift();
      if (!nextTile) break;
      rackState[seatNo] = [...rackState[seatNo], nextTile];
    }
  });
  for (let bonus = 0; bonus < OKEY_RULES.starterBonusTileCount; bonus += 1) {
    const bonusTile = wallTiles.shift();
    if (!bonusTile) break;
    rackState[firstSeat] = [...rackState[firstSeat], bonusTile];
  }
  return {
    rackState,
    wallTiles,
    indicatorTile,
    okeyTile,
    turnSeat: firstSeat,
    turnPhase: "discard",
    turnRound: 1,
  };
}

export function getEffectiveTileForRules(tile: OkeyTile, okeyTile: OkeyTile | null = null) {
  if (tile.kind !== "sahte" || !okeyTile || okeyTile.kind !== "normal") return tile;
  return { ...tile, color: okeyTile.color, value: okeyTile.value };
}

export function isJokerTile(tile: OkeyTile, okeyTile: OkeyTile | null = null) {
  if (tile.kind !== "normal") return false;
  if (!okeyTile || okeyTile.kind !== "normal") return false;
  return tile.color === okeyTile.color && tile.value === okeyTile.value;
}

export function sortRackTiles(tiles: OkeyTile[], mode: OkeyRackSortMode, okeyTile: OkeyTile | null = null) {
  const colorIndexOf = (tile: OkeyTile) => {
    if (tile.kind !== "normal") return Number.POSITIVE_INFINITY;
    const index = OKEY_RULES.tileColors.findIndex((entry) => entry === tile.color);
    return index >= 0 ? index : Number.POSITIVE_INFINITY;
  };
  return tiles.slice().sort((left, right) => {
    const leftIsJoker = isJokerTile(left, okeyTile);
    const rightIsJoker = isJokerTile(right, okeyTile);
    if (leftIsJoker !== rightIsJoker) return leftIsJoker ? 1 : -1;
    if (mode === "color") {
      const colorDiff = colorIndexOf(left) - colorIndexOf(right);
      if (colorDiff !== 0) return colorDiff;
      const valueDiff = left.value - right.value;
      if (valueDiff !== 0) return valueDiff;
      return left.id.localeCompare(right.id);
    }
    const valueDiff = left.value - right.value;
    if (valueDiff !== 0) return valueDiff;
    const colorDiff = colorIndexOf(left) - colorIndexOf(right);
    if (colorDiff !== 0) return colorDiff;
    return left.id.localeCompare(right.id);
  });
}

export function evaluateMeldDraft(tiles: OkeyTile[], okeyTile: OkeyTile | null = null) {
  if (tiles.length < 3) return { valid: false, kind: null as OkeyMeldKind | null, reason: "En az 3 tas secmelisin." };
  if (tiles.length > 13) return { valid: false, kind: null as OkeyMeldKind | null, reason: "Bu kadar tas tek perde kullanilamaz." };
  const ruleTiles = tiles.map((tile) => getEffectiveTileForRules(tile, okeyTile));
  const jokerCount = ruleTiles.filter((tile) => isJokerTile(tile, okeyTile)).length;
  const normalTiles = ruleTiles.filter((tile) => !isJokerTile(tile, okeyTile));

  const setAttempt = (() => {
    if (tiles.length > 4) return { valid: false, reason: "Set peri en fazla 4 tas olabilir." };
    if (normalTiles.length === 0) return { valid: true, reason: "" };
    const baseValue = normalTiles[0]?.value ?? 0;
    if (!normalTiles.every((tile) => tile.value === baseValue)) return { valid: false, reason: "Set icin joker disi taslar ayni degerde olmali." };
    const colors = new Set(normalTiles.map((tile) => tile.color));
    if (colors.size !== normalTiles.length) return { valid: false, reason: "Set perinde renkler tekrar edemez." };
    return { valid: true, reason: "" };
  })();
  if (setAttempt.valid) return { valid: true, kind: "set" as OkeyMeldKind, reason: "" };

  const seriesAttempt = (() => {
    if (normalTiles.length === 0) return { valid: true, reason: "" };
    const sameColor = normalTiles.every((tile) => tile.color === normalTiles[0]?.color);
    if (!sameColor) return { valid: false, reason: "Seri icin tum taslar ayni renkte olmali." };
    const sortedValues = normalTiles.map((tile) => tile.value).sort((a, b) => a - b);
    for (let index = 1; index < sortedValues.length; index += 1) {
      if (sortedValues[index] === sortedValues[index - 1]) return { valid: false, reason: "Seri icin degerler ardisik olmali." };
    }
    let requiredJokerCount = 0;
    for (let index = 1; index < sortedValues.length; index += 1) {
      requiredJokerCount += Math.max(0, sortedValues[index] - sortedValues[index - 1] - 1);
    }
    if (requiredJokerCount > jokerCount) return { valid: false, reason: "Seri icin degerler ardisik olmali." };
    const remainingJokers = jokerCount - requiredJokerCount;
    const minValue = sortedValues[0] ?? 1;
    const maxValue = sortedValues[sortedValues.length - 1] ?? 13;
    const frontSpace = Math.max(0, minValue - 1);
    const backSpace = Math.max(0, 13 - maxValue);
    if (remainingJokers > frontSpace + backSpace) return { valid: false, reason: "Seri 1-13 araligini asmamali." };
    return { valid: true, reason: "" };
  })();
  if (seriesAttempt.valid) return { valid: true, kind: "seri" as OkeyMeldKind, reason: "" };
  return { valid: false, kind: null as OkeyMeldKind | null, reason: seriesAttempt.reason || setAttempt.reason || "Secili taslar ne set ne seri kuralina uyuyor." };
}

export function getMeldPointsWithJokers(tiles: OkeyTile[], okeyTile: OkeyTile | null = null) {
  const validation = evaluateMeldDraft(tiles, okeyTile);
  if (!validation.valid || !validation.kind) return tiles.reduce((sum, tile) => sum + tile.value, 0);
  const ruleTiles = tiles.map((tile) => getEffectiveTileForRules(tile, okeyTile));
  const jokerTiles = ruleTiles.filter((tile) => isJokerTile(tile, okeyTile));
  const normalTiles = ruleTiles.filter((tile) => !isJokerTile(tile, okeyTile));
  if (jokerTiles.length === 0) return ruleTiles.reduce((sum, tile) => sum + tile.value, 0);
  if (validation.kind === "set") {
    const baseValue = normalTiles[0]?.value ?? 10;
    return normalTiles.reduce((sum, tile) => sum + tile.value, 0) + jokerTiles.length * baseValue;
  }
  if (normalTiles.length === 0) return jokerTiles.length * 10;
  const sortedValues = normalTiles.map((tile) => tile.value).sort((a, b) => a - b);
  let points = sortedValues.reduce((sum, value) => sum + value, 0);
  let remainingJokers = jokerTiles.length;
  // Bosluklari once normal taslarin arasinda doldur.
  for (let index = 1; index < sortedValues.length; index += 1) {
    const previous = sortedValues[index - 1];
    const current = sortedValues[index];
    const gap = Math.max(0, current - previous - 1);
    for (let offset = 1; offset <= gap && remainingJokers > 0; offset += 1) {
      points += previous + offset;
      remainingJokers -= 1;
    }
  }
  // Kalan jokerleri her adimda en yuksek gecerli uca yerlestir.
  // Boylece 11-12-joker durumunda joker 10 yerine 13 olarak sayilir.
  let lower = (sortedValues[0] ?? 1) - 1;
  let upper = (sortedValues[sortedValues.length - 1] ?? 13) + 1;
  while (remainingJokers > 0) {
    const lowerCandidate = lower >= 1 ? lower : Number.NEGATIVE_INFINITY;
    const upperCandidate = upper <= 13 ? upper : Number.NEGATIVE_INFINITY;
    if (!Number.isFinite(lowerCandidate) && !Number.isFinite(upperCandidate)) break;
    if (upperCandidate >= lowerCandidate) {
      points += upperCandidate;
      upper += 1;
    } else {
      points += lowerCandidate;
      lower -= 1;
    }
    remainingJokers -= 1;
  }
  if (remainingJokers > 0) points += remainingJokers * 10;
  return points;
}

export function getRackPenaltyPoints(tiles: OkeyTile[], okeyTile: OkeyTile | null = null) {
  return tiles.reduce((sum, sourceTile) => {
    const tile = getEffectiveTileForRules(sourceTile, okeyTile);
    if (isJokerTile(tile, okeyTile)) return sum + 25;
    return sum + Math.max(1, tile.value);
  }, 0);
}

export function countIdenticalPairs(tiles: OkeyTile[], okeyTile: OkeyTile | null = null) {
  const counts = new Map<string, number>();
  tiles.forEach((sourceTile) => {
    const tile = getEffectiveTileForRules(sourceTile, okeyTile);
    if (isJokerTile(tile, okeyTile)) return;
    const key = `${tile.color}-${tile.value}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  let pairCount = 0;
  counts.forEach((count) => {
    pairCount += Math.floor(count / 2);
  });
  return pairCount;
}

export function hasAnyMeldIncludingTile(tiles: OkeyTile[], requiredTileId: string, okeyTile: OkeyTile | null = null) {
  const requiredIndex = tiles.findIndex((tile) => tile.id === requiredTileId);
  if (requiredIndex < 0) return false;
  const maxSize = Math.min(6, tiles.length);
  for (let targetSize = 3; targetSize <= maxSize; targetSize += 1) {
    const picked: number[] = [];
    let found = false;
    const pick = (start: number) => {
      if (found) return;
      if (picked.length === targetSize) {
        if (!picked.includes(requiredIndex)) return;
        const meldTiles = picked.map((index) => tiles[index]);
        const validation = evaluateMeldDraft(meldTiles, okeyTile);
        if (validation.valid) found = true;
        return;
      }
      const remaining = targetSize - picked.length;
      for (let index = start; index <= tiles.length - remaining; index += 1) {
        picked.push(index);
        pick(index + 1);
        picked.pop();
        if (found) return;
      }
    };
    pick(0);
    if (found) return true;
  }
  return false;
}

export function canTakeDiscardWhenClosed(currentRack: OkeyTile[], discardedTile: OkeyTile, okeyTile: OkeyTile | null = null) {
  const nextRack = [...currentRack, discardedTile];
  if (countIdenticalPairs(nextRack, okeyTile) >= OKEY_RULES.pairOpenMinPairs) return true;
  if (getRackPenaltyPoints(nextRack, okeyTile) < OKEY_RULES.openingTargetPoints) return false;
  return hasAnyMeldIncludingTile(nextRack, discardedTile.id, okeyTile);
}

export function canAttachTileToMeld(tile: OkeyTile, meld: OkeyMeldEntry, okeyTile: OkeyTile | null = null) {
  const nextTiles = [...meld.tiles, tile];
  const validation = evaluateMeldDraft(nextTiles, okeyTile);
  if (!validation.valid || validation.kind !== meld.kind) {
    return { valid: false, reason: "Bu tas secili pere eklenemiyor." };
  }
  if (meld.kind === "set") {
    const colors = new Set(nextTiles.map((entry) => getEffectiveTileForRules(entry, okeyTile).color));
    if (colors.size !== nextTiles.length) {
      return { valid: false, reason: "Set perinde renkler tekrar edemez." };
    }
    if (nextTiles.length > 4) {
      return { valid: false, reason: "Set peri en fazla 4 tas olabilir." };
    }
  }
  return { valid: true, reason: "" };
}
