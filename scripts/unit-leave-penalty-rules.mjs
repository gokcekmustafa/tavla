import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function shouldOpenLeaveActionModal({ bothPlayersSeated, firstRollPlayed }) {
  return Boolean(bothPlayersSeated && firstRollPlayed);
}

function computeLeavePenaltyDecision({
  hasMySeat,
  hasOpponentSeat,
  seriesStarted,
  setComplete,
  permissionGranted,
  timeoutWaiver,
  opponentLooksDisconnected,
  localWonCurrentGame,
}) {
  return Boolean(
    hasMySeat
    && hasOpponentSeat
    && seriesStarted
    && !setComplete
    && !permissionGranted
    && !timeoutWaiver
    && !opponentLooksDisconnected
    && !localWonCurrentGame
  );
}

function runUnitScenarios() {
  assert.equal(
    shouldOpenLeaveActionModal({ bothPlayersSeated: true, firstRollPlayed: true }),
    true,
    "Iki oyuncu oturdu + ilk zar atildiysa cikis aksiyon modali acilmali",
  );
  assert.equal(
    shouldOpenLeaveActionModal({ bothPlayersSeated: true, firstRollPlayed: false }),
    false,
    "Ilk zar atilmadiysa cikis aksiyon modali acilmamali",
  );
  assert.equal(
    shouldOpenLeaveActionModal({ bothPlayersSeated: false, firstRollPlayed: true }),
    false,
    "Tek oyunculu masada cikis aksiyon modali acilmamali",
  );

  assert.equal(
    computeLeavePenaltyDecision({
      hasMySeat: true,
      hasOpponentSeat: true,
      seriesStarted: true,
      setComplete: false,
      permissionGranted: false,
      timeoutWaiver: false,
      opponentLooksDisconnected: false,
      localWonCurrentGame: false,
    }),
    true,
    "Set serisi basladiysa ve rakip aktifse ceza uygulanmali",
  );

  assert.equal(
    computeLeavePenaltyDecision({
      hasMySeat: true,
      hasOpponentSeat: true,
      seriesStarted: true,
      setComplete: false,
      permissionGranted: true,
      timeoutWaiver: false,
      opponentLooksDisconnected: false,
      localWonCurrentGame: false,
    }),
    false,
    "Rakip izin verdiyse ceza uygulanmamali",
  );

  assert.equal(
    computeLeavePenaltyDecision({
      hasMySeat: true,
      hasOpponentSeat: true,
      seriesStarted: true,
      setComplete: true,
      permissionGranted: false,
      timeoutWaiver: false,
      opponentLooksDisconnected: false,
      localWonCurrentGame: false,
    }),
    false,
    "Set serisi bittiyse ceza uygulanmamali",
  );

  assert.equal(
    computeLeavePenaltyDecision({
      hasMySeat: true,
      hasOpponentSeat: true,
      seriesStarted: true,
      setComplete: false,
      permissionGranted: false,
      timeoutWaiver: true,
      opponentLooksDisconnected: false,
      localWonCurrentGame: false,
    }),
    false,
    "Timeout waiver varsa ceza uygulanmamali",
  );

  assert.equal(
    computeLeavePenaltyDecision({
      hasMySeat: true,
      hasOpponentSeat: true,
      seriesStarted: true,
      setComplete: false,
      permissionGranted: false,
      timeoutWaiver: false,
      opponentLooksDisconnected: true,
      localWonCurrentGame: false,
    }),
    false,
    "Rakip baglantisiz gorunuyorsa ceza uygulanmamali",
  );

  assert.equal(
    computeLeavePenaltyDecision({
      hasMySeat: true,
      hasOpponentSeat: true,
      seriesStarted: true,
      setComplete: false,
      permissionGranted: false,
      timeoutWaiver: false,
      opponentLooksDisconnected: false,
      localWonCurrentGame: true,
    }),
    false,
    "Oyuncu mevcut oyunu kazandiysa ceza uygulanmamali",
  );
}

function runSourceCouplingChecks() {
  const appPath = resolve("src", "App.tsx");
  const source = readFileSync(appPath, "utf8");
  const has = (text) => source.includes(text);

  const checks = [
    {
      label: "openLeaveActionModal guard kosulu mevcut",
      test: () =>
        has("const bothPlayersSeated = Boolean(activeTable?.white && activeTable?.black);")
        && has("const firstRollPlayed = Boolean(matchLiveState.matchActive || (activeTable?.setPlayed ?? 0) > 0);")
        && has("if (bothPlayersSeated && firstRollPlayed) {"),
    },
    {
      label: "resolveLeavePenaltyContext penalty kosullari mevcut",
      test: () =>
        has("const seriesStarted = Boolean(activeTable.setPlayed > 0 || matchLiveState.matchActive);")
        && has("const shouldPenalize = Boolean(")
        && has("&& !permissionGranted")
        && has("&& !timeoutWaiver")
        && has("&& !opponentLooksDisconnected")
        && has("&& !localWonCurrentGame"),
    },
    {
      label: "leaveRoomAndGoLobby penalty/permission/opponent-left ayrimi mevcut",
      test: () =>
        has("if (leaveContext.shouldPenalize && leaveContext.opponentSeat) {")
        && has("} else if (leaveContext.permissionGranted) {")
        && has("penaltyWaivedBecauseOpponentLeft = Boolean(leaveContext.opponentSeat === null);"),
    },
  ];

  const failed = checks.filter((check) => !check.test());
  if (failed.length > 0) {
    console.error("Leave penalty source coupling FAILED:");
    for (const item of failed) {
      console.error(`- ${item.label}`);
    }
    process.exit(1);
  }
}

runUnitScenarios();
runSourceCouplingChecks();
console.log("Leave penalty unit rules passed.");
