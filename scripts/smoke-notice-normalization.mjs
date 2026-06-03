import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "Turkce mojibake duzeltme tablosu tanimli",
    test: () =>
      has("const TURKISH_MOJIBAKE_REPLACEMENTS: Array<[string, string]> = [")
      && has("[\"Ã‡\", \"Ç\"]")
      && has("[\"Ä°\", \"İ\"]")
      && has("[\"ÅŸ\", \"ş\"]"),
  },
  {
    label: "Notice metni normalize fonksiyonu mevcut",
    test: () =>
      has("function normalizeTurkishDisplayText(value: string)")
      && has("next = next.split(broken).join(fixed);"),
  },
  {
    label: "lobbyNotice render oncesi normalize edilip kullaniliyor",
    test: () =>
      has("const normalizedLobbyNotice = useMemo(() => normalizeTurkishDisplayText(lobbyNotice), [lobbyNotice]);")
      && has("{normalizedLobbyNotice ? <p className=\"my-notice\">{normalizedLobbyNotice}</p> : null}")
      && has("{normalizedLobbyNotice ? <p className=\"my-notice my-notice-soft\">{normalizedLobbyNotice}</p> : null}"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Notice normalization smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Notice normalization smoke passed.");
