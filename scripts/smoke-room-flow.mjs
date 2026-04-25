import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function extractAppFunctionSegment(name) {
  const markers = [`\n  function ${name}`, `\n  async function ${name}`];
  let marker = markers.find((item) => source.includes(item)) ?? "";
  let start = marker ? source.indexOf(marker) : -1;
  if (start < 0) {
    if (source.startsWith(`function ${name}`) || source.startsWith(`async function ${name}`)) {
      start = 0;
      marker = "";
    } else {
      return "";
    }
  }
  const searchFrom = start + Math.max(marker.length, 1);
  const nextFunction = source.indexOf("\n  function ", searchFrom);
  const nextAsyncFunction = source.indexOf("\n  async function ", searchFrom);
  const nextCandidates = [nextFunction, nextAsyncFunction].filter((value) => value >= 0);
  const next = nextCandidates.length > 0 ? Math.min(...nextCandidates) : -1;
  return source.slice(start, next < 0 ? source.length : next);
}

const fnOnOpenTable = extractAppFunctionSegment("onOpenTable");
const fnSitToTable = extractAppFunctionSegment("sitToTable");
const fnUpsertMySeat = extractAppFunctionSegment("upsertMySeat");
const fnOnRoomStartReady = extractAppFunctionSegment("onRoomStartReady");
const fnLeaveRoomAndGoLobby = extractAppFunctionSegment("leaveRoomAndGoLobby");
const fnCloseRoomAndReturnLobby = extractAppFunctionSegment("closeRoomAndReturnLobby");
const fnReleaseSeatOnly = extractAppFunctionSegment("releaseSeatOnly");
const fnSyncRoomSeatHeartbeat = extractAppFunctionSegment("syncRoomSeatHeartbeat");

const checks = [
  {
    label: "onOpenTable masayi sitToTable ile aciyor",
    test: () => fnOnOpenTable.includes("sitToTable("),
  },
  {
    label: "sitToTable upsertMySeat kullaniyor",
    test: () => fnSitToTable.includes("upsertMySeat("),
  },
  {
    label: "sitToTable oturma olay logu yaziyor",
    test: () =>
      fnSitToTable.includes("appendFlowEvent(\"seat.joined\"")
      && fnSitToTable.includes("appendFlowEvent(\"seat.blocked\""),
  },
  {
    label: "upsertMySeat iki koltuk dolunca autoStart yapiyor",
    test: () => fnUpsertMySeat.includes("autoStartTableWhenBothSeated("),
  },
  {
    label: "heartbeat akisi autoStart yedek kontrolunu iceriyor",
    test: () => fnSyncRoomSeatHeartbeat.includes("autoStartTableWhenBothSeated("),
  },
  {
    label: "onRoomStartReady iframe start gate senkronu yapiyor",
    test: () => fnOnRoomStartReady.includes("syncRoomStartGateToIframe();"),
  },
  {
    label: "leaveRoomAndGoLobby cikista closeRoomAndReturnLobby cagiriyor",
    test: () => fnLeaveRoomAndGoLobby.includes("closeRoomAndReturnLobby();"),
  },
  {
    label: "closeRoomAndReturnLobby seat release + room reset yapiyor",
    test: () =>
      fnCloseRoomAndReturnLobby.includes("releaseSeatOnly();")
      && fnCloseRoomAndReturnLobby.includes("setRoomSession(null);"),
  },
  {
    label: "releaseSeatOnly bosalan masayi tombstone ile kapatiyor",
    test: () =>
      fnReleaseSeatOnly.includes("clearSessionFromTables(")
      && fnReleaseSeatOnly.includes("markClosedTableRooms("),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Room flow smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Room flow smoke passed.");
