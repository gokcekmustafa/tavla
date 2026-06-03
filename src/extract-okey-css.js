const fs = require('fs');
const path = require('path');

const APP_CSS = path.join(__dirname, 'App.css');
const UI101OKEY = path.join(__dirname, 'apps', 'okey101', 'UI101okey.css');
const UI101OKEY_PORTRAIT = path.join(__dirname, 'apps', 'okey101', 'UI101okey-portrait.css');
const UI101OKEY_DESKTOP = path.join(__dirname, 'apps', 'okey101', 'UI101okey-desktop.css');
const LANDSCAPE = path.join(__dirname, 'apps', 'okey101', 'okey101-mobile-landscape.css');

const lines = fs.readFileSync(APP_CSS, 'utf-8').split('\n');

// Track what we're appending to each file
let toUI101okey = [];
let toPortrait = [];
let toDesktop = [];
let toLandscape = [];
let keptLines = [];

// ---- Helpers ----
function extract(from, to) {
  return lines.slice(from - 1, to);
}

function appendLines(target, srcLines) {
  target.push(...srcLines);
}

// ===== DEFINE SECTIONS (1-indexed line numbers) =====

// --- Section A: lines 5034-8488 -> UI101okey.css ---
appendLines(toUI101okey, extract(5034, 8488));

// --- Section B: @media (max-width: 760px) lines 8489-8970 ---
// Keep in App.css: lines 8489-8497 (media query + 2 general rules), then close the media query
// Lines 8499-8970 (okey-specific) -> UI101okey-portrait.css wrapped in @media (max-width: 760px)

// Keep media query open + general rules (8489-8497)
keptLines.push(...extract(8489, 8497));
keptLines.push('}'); // close the media query

// Okey-specific portion: lines 8499-8970 -> portrait (wrapped in @media)
const okeyPortion = extract(8499, 8970);
toPortrait.push('@media (max-width: 760px) {');
toPortrait.push(...okeyPortion.map(l => '  ' + l));
toPortrait.push('}');

// --- Lines 8972-8991 (.processable rules) -> UI101okey.css ---
appendLines(toUI101okey, extract(8972, 8991));

// --- Lines 8994-9420: @media (orientation: landscape) and (max-width: 1366px) -> landscape ---
appendLines(toLandscape, extract(8994, 9420));

// --- Lines 9422-9432: @media (max-width: 1366px) -> UI101okey.css ---
appendLines(toUI101okey, extract(9422, 9432));

// --- Lines 9434-9518: top-level [data-table-active="true"] rules -> UI101okey.css ---
appendLines(toUI101okey, extract(9434, 9518));

// --- Lines 9520-9582: @media (max-width: 1366px) mobile correction -> UI101okey.css ---
appendLines(toUI101okey, extract(9520, 9582));

// --- Lines 9584-9723: @media (max-width: 1366px) mobile/tablet layout -> UI101okey.css ---
appendLines(toUI101okey, extract(9584, 9723));

// --- Lines 9725-9751: @media (max-width: 1366px) player name boxes -> UI101okey.css ---
appendLines(toUI101okey, extract(9725, 9751));

// --- Lines 9753-9829: @media (orientation: landscape) ... -> landscape ---
appendLines(toLandscape, extract(9753, 9829));

// --- Lines 9831-9846: @media (orientation: landscape) ... -> landscape ---
appendLines(toLandscape, extract(9831, 9846));

// --- Lines 9848-9862: @media (orientation: landscape) ... -> landscape ---
appendLines(toLandscape, extract(9848, 9862));

// --- Lines 9864-9872: @media (orientation: landscape) ... -> landscape ---
appendLines(toLandscape, extract(9864, 9872));

// --- Lines 9874-9902: @media (max-width: 1366px) ... -> UI101okey.css ---
appendLines(toUI101okey, extract(9874, 9902));

// --- Lines 9904-9947: @media (max-width: 980px) -> UI101okey.css ---
appendLines(toUI101okey, extract(9904, 9947));

// --- Lines 9949-10136: @media (min-width: 761px) ... -> UI101okey-desktop.css ---
appendLines(toDesktop, extract(9949, 10136));

// --- Lines 10138-10165: @media (max-width: 1366px) ... -> UI101okey.css ---
appendLines(toUI101okey, extract(10138, 10165));

// --- Lines 10167-10302: @media (orientation: landscape) ... -> landscape ---
appendLines(toLandscape, extract(10167, 10302));

// --- Lines 10304-10718: @media (orientation: landscape) ... -> landscape ---
appendLines(toLandscape, extract(10304, 10718));

// --- Lines 10720-10796: @media (orientation: landscape) ... -> landscape ---
appendLines(toLandscape, extract(10720, 10796));

// --- Lines 10797-11017: multi-media landscape query -> landscape ---
appendLines(toLandscape, extract(10797, 11017));

// --- Lines 11018-11387: multi-media landscape query -> landscape ---
appendLines(toLandscape, extract(11018, 11387));

// ===== KEPT LINES =====
// Lines 1-5033 (general styles)
keptLines.unshift(...extract(1, 5033));

// ===== WRITE FILES =====

// Helper: append content to a file with a leading newline separator if file is non-empty
function appendToFile(filePath, contentLines) {
  if (contentLines.length === 0) return;
  let existing = '';
  try { existing = fs.readFileSync(filePath, 'utf-8'); } catch (e) {}
  const separator = (existing.length > 0 && !existing.endsWith('\n')) ? '\n\n' : (existing.length > 0 ? '\n' : '');
  fs.writeFileSync(filePath, existing + separator + contentLines.join('\n'), 'utf-8');
}

// Append extracted content to target files
appendToFile(UI101OKEY, toUI101okey);
appendToFile(UI101OKEY_PORTRAIT, toPortrait);
appendToFile(UI101OKEY_DESKTOP, toDesktop);
appendToFile(LANDSCAPE, toLandscape);

// Write kept lines back to App.css
fs.writeFileSync(APP_CSS, keptLines.join('\n'), 'utf-8');

// ===== REPORT =====
const stats = {
  'App.css (kept)': keptLines.length,
  'UI101okey.css (appended)': toUI101okey.length,
  'UI101okey-portrait.css (appended)': toPortrait.length,
  'UI101okey-desktop.css (appended)': toDesktop.length,
  'okey101-mobile-landscape.css (appended)': toLandscape.length,
};

console.log('=== EXTRACTION COMPLETE ===');
for (const [file, count] of Object.entries(stats)) {
  console.log(`${file}: ${count} lines`);
}

// Verify: total extracted + kept should equal original minus blank line adjustments
const extracted = toUI101okey.length + toPortrait.length + toDesktop.length + toLandscape.length;
const kept = keptLines.length;
const original = lines.length;
console.log(`\nOriginal: ${original} lines`);
console.log(`Kept: ${kept} lines`);
console.log(`Extracted: ${extracted} lines`);
console.log(`Sum: ${kept + extracted} (may differ from original due to added/removed wrapper braces)`);
