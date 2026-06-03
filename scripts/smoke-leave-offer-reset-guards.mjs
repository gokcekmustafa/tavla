import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "Leave teklif effect'i oyuncu masada degilse tum prompt reflerini sifirliyor",
    test: () =>
      has("if (!roomSession || roomSession.role !== \"player\") {")
      && has("leavePermissionPromptKeyRef.current = \"\";")
      && has("leaveIncomingIgnoredKeyRef.current = \"\";")
      && has("leaveIncomingActiveKeyRef.current = \"\";")
      && has("closeLeaveIncomingModal();"),
  },
  {
    label: "Current table yoksa aktif incoming key temizlenip modal kapaniyor",
    test: () =>
      has("if (!currentRoomTable) {")
      && has("leaveIncomingActiveKeyRef.current = \"\";")
      && has("closeLeaveIncomingModal();")
      && has("return;"),
  },
  {
    label: "Kullanici kimligi yoksa prompt state reset edilerek stale teklif engelleniyor",
    test: () =>
      has("const myUserId = sanitizeGuestId(currentProfile.userId);")
      && has("if (!myUserId) {")
      && has("leavePermissionPromptKeyRef.current = \"\";")
      && has("leaveIncomingIgnoredKeyRef.current = \"\";")
      && has("leaveIncomingActiveKeyRef.current = \"\";"),
  },
  {
    label: "Teklif/gecerlilik kosullari bozulunca prompt key sifirlanip ignored key kosullu temizleniyor",
    test: () =>
      has("const shouldClearIgnoredRequestKey = !requestUserId || grantedUserId === requestUserId;")
      && has("leavePermissionPromptKeyRef.current = \"\";")
      && has("leaveIncomingActiveKeyRef.current = \"\";")
      && has("if (shouldClearIgnoredRequestKey) {")
      && has("leaveIncomingIgnoredKeyRef.current = \"\";"),
  },
  {
    label: "Ayni teklif tekrar modal basmasin diye prompt key dedupe korunuyor",
    test: () =>
      has("const promptKey = `${currentRoomTable.roomCode}:${requestUserId}`;")
      && has("if (leaveIncomingIgnoredKeyRef.current === promptKey) {")
      && has("if (leavePermissionPromptKeyRef.current === promptKey) return;")
      && has("leavePermissionPromptKeyRef.current = promptKey;")
      && has("leaveIncomingActiveKeyRef.current = promptKey;"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Leave offer reset guards smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Leave offer reset guards smoke passed.");
