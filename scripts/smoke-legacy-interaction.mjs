import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const legacyPath = resolve("public", "legacy", "script.js");
const source = readFileSync(legacyPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "Temel surukle-birak handlerlari mevcut",
    test: () =>
      has("onDragStartFromChecker")
      && has("onDragOverTarget")
      && has("onDropOnPoint")
      && has("onDropOnBar")
      && has("onDropOnOffArea"),
  },
  {
    label: "Checker drag event baglari mevcut",
    test: () =>
      has("addEventListener(\"dragstart\", onDragStartFromChecker)")
      && has("addEventListener(\"dragend\",   onDragEnd)")
      && has("ch.classList.add(\"draggable-checker\")"),
  },
  {
    label: "Mobil dokunma ve cift tik handlerlari mevcut",
    test: () =>
      has("addEventListener(\"touchstart\", onCheckerTouchStart")
      && has("addEventListener(\"dblclick\",  onCheckerDoubleClick)")
      && has("addEventListener(\"touchstart\", onBarChipTouchStart")
      && has("addEventListener(\"dblclick\", onBarChipDoubleClick)"),
  },
  {
    label: "Hedef highlight siniflari ve hesaplama akisi mevcut",
    test: () =>
      has("highlight-target")
      && has("collectReachableTargetsFromSource(")
      && has("classList.add(\"highlight-target\")"),
  },
  {
    label: "Geri al akisi ve undo snapshot yapisi mevcut",
    test: () =>
      has("onUndoMove")
      && has("turnUndoStack.push(undoSnap)")
      && has("publishRoomSnapshot(\"undo\")"),
  },
  {
    label: "Zar animasyonunda settle timestamp ve sprite sheet akisi mevcut",
    test: () =>
      has("diceRollSettledAt")
      && has("DICE_ROLL_TOTAL_MS")
      && has("dice-roll-sprite")
      && has("diceSpriteSheetPromise"),
  },
  {
    label: "Cift zar/hamle optimizasyon akislari mevcut",
    test: () =>
      has("getOptimalMoves(state, player, dice)")
      && has("maxMoves(state, player, dice, memo)")
      && has("removeOneDie(dice, m.die)"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Legacy interaction smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Legacy interaction smoke passed.");
