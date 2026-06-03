import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function parseGitConfig(configText) {
  const result = {
    httpSslBackend: "",
    credentialHelper: "",
  };

  let activeSection = "";
  const lines = configText.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;

    if (line.startsWith("[") && line.endsWith("]")) {
      activeSection = line.slice(1, -1).trim().toLowerCase();
      continue;
    }

    const eq = line.indexOf("=");
    if (eq < 0) continue;

    const key = line.slice(0, eq).trim().toLowerCase();
    const value = line.slice(eq + 1).trim();

    if (activeSection === "http" && key === "sslbackend") {
      result.httpSslBackend = value;
    }

    if (activeSection.startsWith("credential") && key === "helper") {
      result.credentialHelper = value;
    }
  }

  return result;
}

if (process.platform !== "win32") {
  console.log("Git push credentials smoke skipped (non-Windows platform).");
  process.exit(0);
}

const configPath = resolve(".git", "config");
if (!existsSync(configPath)) {
  console.error("Git push credentials smoke FAILED:");
  console.error("- .git/config dosyasi bulunamadi.");
  process.exit(1);
}

const configText = readFileSync(configPath, "utf8");
const parsed = parseGitConfig(configText);

const sslBackend = parsed.httpSslBackend;
const credentialHelper = parsed.credentialHelper;

const errors = [];

if (sslBackend.toLowerCase() !== "openssl") {
  errors.push(`http.sslBackend beklenen deger 'openssl' ama bulunan: '${sslBackend || "(bos)"}'`);
}

if (!credentialHelper.toLowerCase().includes("manager-core")) {
  errors.push(`credential.helper 'manager-core' icermeli ama bulunan: '${credentialHelper || "(bos)"}'`);
}

if (errors.length > 0) {
  console.error("Git push credentials smoke FAILED:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  console.error("");
  console.error("Duzeltme komutlari:");
  console.error("git config --local http.sslBackend openssl");
  console.error("git config --local credential.helper manager-core");
  process.exit(1);
}

console.log("Git push credentials smoke passed.");
