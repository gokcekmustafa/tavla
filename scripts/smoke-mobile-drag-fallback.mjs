import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const legacyPath = resolve("public", "legacy", "script.js");
const source = readFileSync(legacyPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "Mobil touch handlerlari aktif (checker + bar chip)",
    test: () =>
      has("function onCheckerTouchStart(e)")
      && has("function onBarChipTouchStart(e)")
      && has("addEventListener(\"touchstart\", onCheckerTouchStart, { passive: false });")
      && has("addEventListener(\"touchstart\", onBarChipTouchStart, { passive: false });"),
  },
  {
    label: "Mobilde cift dokunma penceresi consumeTouchDoubleTap ile yonetiliyor",
    test: () =>
      has("function consumeTouchDoubleTap(sourceKey)")
      && has("if (consumeTouchDoubleTap(`point-${source}`)) {")
      && has("if (consumeTouchDoubleTap(\"bar\")) {"),
  },
  {
    label: "Touch handlerlari scroll/ghost-click onlemek icin preventDefault kullaniyor",
    test: () =>
      has("function onCheckerTouchStart(e)")
      && has("e.preventDefault();")
      && has("e.stopPropagation();")
      && has("function onBarChipTouchStart(e)")
      && has("e.preventDefault();")
      && has("e.stopPropagation();"),
  },
  {
    label: "Drag/drop fallback kaynagi dataTransfer yoksa dragSource veya selectedSource'tan aliniyor",
    test: () =>
      has("function getDropSourceFromEvent(e)")
      && has("return dragSource ?? selectedSource;"),
  },
  {
    label: "Kirik pul zorunlulugunda touch/click akisinda pointer hint gosteriliyor",
    test: () =>
      has("setStatus(\"Önce kırık pulu girmelisiniz.\");")
      && has("showPointerHint(\"Önce kırık pulu girmelisiniz.\", e);"),
  },
  {
    label: "Pointer hint hem mouse hem touch koordinatiyla hesaplanip 1 sn sonra kayboluyor",
    test: () =>
      has("function getPointerPosition(evt)")
      && has("const touch = evt?.touches?.[0] || evt?.changedTouches?.[0];")
      && has("function showPointerHint(message, evt)")
      && has("pointerHintTimer = window.setTimeout(() => {")
      && has("}, 1000);"),
  },
  {
    label: "Drag baslangicinda source secimi ile highlight/guide cizimleri tetikleniyor",
    test: () =>
      has("function onDragStartFromChecker(e)")
      && has("dragSource = src;")
      && has("selectedSource = src;")
      && has("renderHighlights();")
      && has("renderGuideLines();"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Mobile drag/fallback smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Mobile drag/fallback smoke passed.");
