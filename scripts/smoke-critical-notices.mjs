import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const source = readFileSync(appPath, "utf8");

function has(text) {
  return source.includes(text);
}

const checks = [
  {
    label: "Ayni hesabin ikinci oturumuna karsi kritik uyari metni mevcut",
    test: () =>
      has("baska bir tarayicida aktif")
      && has("Diger oturumu kapatip tekrar deneyin."),
  },
  {
    label: "Ozel masa icin oyuncu/katilim engeli uyarilari mevcut",
    test: () =>
      has("Bu masa ozeldir. Sadece masa sahibi veya davet edilen oyuncu oturabilir.")
      && has("Bu masa ozel. Sadece masa sahibi veya davet edilen oyuncu katilabilir."),
  },
  {
    label: "Oda/anasayfa gecisinde masadayken engel uyarilari mevcut",
    test: () =>
      has("Oda degistirmek icin once masadan kalkmalisin.")
      && has("Anasayfaya donmek icin once masadan kalkmalisin.")
      && has("Tum odalari acmak icin once masadan kalkmalisin."),
  },
  {
    label: "Masa bulunamama/kapanma durumlari icin kritik uyari metinleri mevcut",
    test: () =>
      has("Masa bulunamadı.")
      && has("Masa kapandi."),
  },
  {
    label: "Masa kodu/koltuk secimi hatalari icin kritik metinler mevcut",
    test: () =>
      has("Lutfen gecerli bir oda kodu yazin.")
      && has("Masa dolu.")
      && has("Secilen koltuk dolu. Lutfen baska bir koltuk secin."),
  },
  {
    label: "Senkron ve servis hata/bilgi notice metinleri mevcut",
    test: () =>
      has("Canli senkron testi guncellendi.")
      && has("Puan servisine baglanilamadi."),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Critical notices smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Critical notices smoke passed.");
