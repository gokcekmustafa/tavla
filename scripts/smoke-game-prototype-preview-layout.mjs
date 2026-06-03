import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const cssPath = resolve("src", "App.css");
const appSource = readFileSync(appPath, "utf8");
const cssSource = readFileSync(cssPath, "utf8");

function hasApp(text) {
  return appSource.includes(text);
}

function hasCss(text) {
  return cssSource.includes(text);
}

function countCss(text) {
  if (!text) return 0;
  return cssSource.split(text).length - 1;
}

const checks = [
  {
    label: "101 prototipte lobi onizleme bloklari mevcut",
    test: () =>
      hasApp("<div className=\"my-game-coming-side\">")
      && hasApp("<section className=\"my-game-coming-preview\">")
      && hasApp("<h3>101 Lobi Onizleme</h3>")
      && hasApp("className=\"my-game-coming-preview-card waiting\"")
      && hasApp("className=\"my-game-coming-preview-card active\""),
  },
  {
    label: "101 onizleme stilleri App.css icinde tanimli",
    test: () =>
      hasCss(".my-game-coming-side {")
      && hasCss(".my-game-coming-preview {")
      && hasCss(".my-game-coming-preview-grid {")
      && hasCss(".my-game-coming-preview-card.active {"),
  },
  {
    label: "Mobilde onizleme gridi tek kolona dusuruluyor",
    test: () =>
      countCss(".my-game-coming-preview-grid {") >= 2
      && hasCss("grid-template-columns: 1fr;"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Game prototype preview layout smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Game prototype preview layout smoke passed.");
