import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "Incoming leave modal kapatma yardimcisi ignore + active key reset mantigini koruyor",
    test: () =>
      has("function closeLeaveIncomingModal(ignoreCurrentRequest = false) {")
      && has("const activeKey = leaveIncomingActiveKeyRef.current || leaveIncomingModal.requestKey;")
      && has("if (ignoreCurrentRequest && activeKey) {")
      && has("leaveIncomingIgnoredKeyRef.current = activeKey;")
      && has("leaveIncomingActiveKeyRef.current = \"\";")
      && has("setLeaveIncomingModal((prev) => (prev.open || prev.requestKey ? {"),
  },
  {
    label: "Reject modal aksiyonu popup'i aninda kapatip async reject akisini tetikliyor",
    test: () =>
      has("function rejectLeaveOfferFromModal() {")
      && has("const key = leaveIncomingModal.requestKey || leaveIncomingActiveKeyRef.current || getCurrentLeavePromptKey();")
      && has("leaveIncomingIgnoredKeyRef.current = key;")
      && has("leavePermissionPromptKeyRef.current = key;")
      && has("leaveIncomingActiveKeyRef.current = \"\";")
      && has("setLeaveIncomingModal({ open: false, requesterName: \"\", requestKey: \"\" });")
      && has("window.setTimeout(() => {")
      && has("rejectLeaveWithoutPenalty();")
      && has("}, 0);"),
  },
  {
    label: "Reject yazma akisinda request key uretimi ve tabloda request/grant temizligi yapiliyor",
    test: () =>
      has("function rejectLeaveWithoutPenalty() {")
      && has("let rejectedRequestKey = \"\";")
      && has("rejectedRequestKey = `${table.roomCode}:${requestUserId}`;")
      && has("leavePermissionRequestByUserId: null,")
      && has("leavePermissionGrantedToUserId: null,"),
  },
  {
    label: "Reject basarili oldugunda incoming modal local state'i de kapatiliyor",
    test: () =>
      has("if (updated) {")
      && has("if (rejectedRequestKey) {")
      && has("leaveIncomingIgnoredKeyRef.current = rejectedRequestKey;")
      && has("leaveIncomingActiveKeyRef.current = \"\";")
      && has("setLeaveIncomingModal({ open: false, requesterName: \"\", requestKey: \"\" });"),
  },
  {
    label: "Accept modal aksiyonu close + approve zincirini koruyor",
    test: () =>
      has("function acceptLeaveOfferFromModal() {")
      && has("closeLeaveIncomingModal(true);")
      && has("leavePermissionPromptKeyRef.current = \"\";")
      && has("leaveIncomingIgnoredKeyRef.current = \"\";")
      && has("approveLeaveWithoutPenalty();"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Leave reject modal flow smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Leave reject modal flow smoke passed.");
