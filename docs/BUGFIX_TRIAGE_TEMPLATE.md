# Bugfix Triage Template

Bu dokuman, her runtime bugfix turunda ayni disiplinle ilerlemek icin kullanilir.
Kural: Her turda sadece 1 bug aktif tutulur.

## 1) Tek Cumle Bug Tanimi

- Ornek: "Masa acildiktan sonra ikinci oyuncu oturunca oyun baslamiyor."

## 2) Yeniden Uretim Adimlari (En Fazla 5 Adim)

1. 
2. 
3. 
4. 
5. 

## 3) Beklenen / Gerceklesen Davranis

- Beklenen:
- Gerceklesen:

## 4) Etki Alani

- Mod: (online / bot / mobil / masaustu)
- Ekran: (lobi / masa / oda secimi)
- Rol: (masa sahibi / sonradan oturan / izleyici)

## 5) Cozum Stratejisi (Tek Dosya / Tek Akis)

- Hedef dosya:
- Hedef fonksiyon/akis:
- Neden en dar kapsam:

## 6) Dogrulama Plani

- Otomatik: `npm run check:safe`
- Manuel: en fazla 3 adimlik hizli test

## 7) Kapanis Notu

- Duzeltme ozeti:
- Etkilenen alanlar:
- Regress riski:
