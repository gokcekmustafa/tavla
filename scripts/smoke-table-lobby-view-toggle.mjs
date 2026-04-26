import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

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

const fnGoToLobbyFromTableView = extractAppFunctionSegment("goToLobbyFromTableView");
const fnReturnToActiveTableView = extractAppFunctionSegment("returnToActiveTableView");

const checks = [
  {
    label: "Masadan lobiye gecis fonksiyonu sadece gorunumu lobby yapip roomSession'i koruyor",
    test: () =>
      fnGoToLobbyFromTableView.includes("setViewMode(\"lobby\");")
      && fnGoToLobbyFromTableView.includes("setRoomPickerOpen(false);")
      && fnGoToLobbyFromTableView.includes("setGamePickerOpen(false);")
      && fnGoToLobbyFromTableView.includes("if (roomSession) {")
      && fnGoToLobbyFromTableView.includes("setLobbyNotice(\"Lobiye gecildi. Masaya donerek oyuna devam edebilirsin.\");")
      && !fnGoToLobbyFromTableView.includes("setRoomSession(null);"),
  },
  {
    label: "Masaya donus fonksiyonu aktif roomSession varsa table gorunumune geri aliyor",
    test: () =>
      fnReturnToActiveTableView.includes("if (!roomSession) return;")
      && fnReturnToActiveTableView.includes("setViewMode(\"table\");")
      && fnReturnToActiveTableView.includes("setRoomPickerOpen(false);")
      && fnReturnToActiveTableView.includes("setGamePickerOpen(false);")
      && fnReturnToActiveTableView.includes("setLobbyNotice(\"Masaya geri donuldu.\");"),
  },
  {
    label: "Lobi topbarinda roomSession varken Masaya Don butonu returnToActiveTableView'a bagli",
    test: () =>
      has("{roomSession ? (")
      && has("<button className=\"my-top-btn my-btn-member-alt\" onClick={returnToActiveTableView}>")
      && has("Masaya Don"),
  },
  {
    label: "Masa ekrani kenar menude Lobiye Don butonu goToLobbyFromTableView'a bagli",
    test: () =>
      has("<button className=\"my-action-btn soft\" onClick={goToLobbyFromTableView}>")
      && has("{activeDesign.texts.roomBackLobby || \"Lobiye Don\"}"),
  },
  {
    label: "URL senkronu roomSession bilgilerini query parametrelerine yaziyor (refreshte geri donus icin)",
    test: () =>
      has("if (roomSession) {")
      && has("url.searchParams.set(\"room\", roomSession.code);")
      && has("url.searchParams.set(\"seat\", roomSession.seat);")
      && has("url.searchParams.set(\"name\", safeGuestName);")
      && has("url.searchParams.set(\"room_name\", roomSession.roomName);")
      && has("url.searchParams.set(\"table\", String(roomSession.tableNo));"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Table/lobby view toggle smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Table/lobby view toggle smoke passed.");
