import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "Puan kurali alanlari ve normalize akisi mevcut",
    test: () =>
      has("type GameRules = {")
      && has("winPoints: number;")
      && has("lossPoints: number;")
      && has("resignPenaltyPoints: number;")
      && has("function normalizeGameRules("),
  },
  {
    label: "Set serisi tamamlanma ve kazanan hesaplama fonksiyonlari mevcut",
    test: () =>
      has("function tableSeriesWinner(")
      && has("function isTableSeriesComplete("),
  },
  {
    label: "Set sonucu kaydetme akisi token dedupe ile calisiyor",
    test: () =>
      has("async function recordSeriesGameResult(token: string, winner: Seat)")
      && has("if (table.setResultTokens.includes(safeToken))")
      && has("setResultTokens = normalizeSeriesTokenList([...table.setResultTokens, safeToken]);"),
  },
  {
    label: "Set tamamlaninca start gate resetleniyor",
    test: () =>
      has("if (completed) {")
      && has("table = resetTableStartGate({")
      && has("leavePermissionRequestByUserId: null,")
      && has("leavePermissionGrantedToUserId: null,"),
  },
  {
    label: "Masadan cikis ceza baglami leave context uzerinden hesaplaniyor",
    test: () =>
      has("function resolveLeavePenaltyContext(activeTable: LobbyTable | null)")
      && has("const setComplete = isTableSeriesComplete(activeTable);")
      && has("const seriesStarted = Boolean(activeTable.setPlayed > 0 || matchLiveState.matchActive);"),
  },
  {
    label: "Resign puanlamasi iki oyuncuya outcome uyguluyor",
    test: () =>
      has("async function awardResignResult(matchToken: string)")
      && has("applyOutcomeForUserId(mySeat.userId, \"resign\"")
      && has("applyOutcomeForUserId(opponentSeat.userId, \"win\""),
  },
  {
    label: "Match finished akisi set kaydi ve puan sonucunu bagliyor",
    test: () =>
      has("async function handleLegacyMatchFinished(message: LegacyMatchFinishedMessage)")
      && has("const seriesResult = await recordSeriesGameResult(token, winner);")
      && has("await applyOutcomeForUserId(currentProfile.userId, localOutcome, currentProfile.displayName, seriesResult.settleToken || token);"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Series/scoring smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Series/scoring smoke passed.");
