# Diagnostics Recovery Checklist

Bu kontrol listesi, oyun davranisini degistirmeden canli senkron problemlerini hizli teyit etmek icin kullanilir.

## 1) Hazirlik

- Uygulamayi iki farkli istemcide ac (`masaustu + mobil` veya `iki farkli browser`).
- URL'e `?diag=1` ekleyip paneli ac.
- Her iki tarafta ayni lobi secili oldugunu dogrula.

## 2) Baslangic Beklentisi

- `Canli Senkron Durum`: `online`
- `WebSocket`: `acik` veya kisa sureli `baglaniyor`
- `WS Open/Close/Error`: Open artarken Error sabit kalmali veya cok dusuk olmali
- `HTTP Push/Pull`: zamani geldiginde artmali, tek yonde donup kalmamali

## 3) Masa/Oyuncu Senaryosu

- Istemci A masa acar, istemci B masayi gorur.
- Istemci B masaya oturur, iki tarafta da masa dolu gorunur.
- Oyunculardan biri masadan kalktiginda diger tarafta gecikmeli ama tutarli sekilde guncellenir.
- Oda degistirip geri donunce oda ozetindeki `Masa` ve `Oyuncu` sayaclari tutarli kalir.

## 4) Hata ve Recovery Kontrolu

- Kisa baglanti kesintisinden sonra:
  - `Durum` yeniden `online` olur.
  - `HTTP Pull`/`WS Mesaj` tekrar akmaya baslar.
  - `Son Snapshot` zamani guncellenir.
- `lastError` varsa gecici olmalı; kalici art arda hata goruluyorsa log alin.

## 5) Hata Kaydi (Bug Raporu Icin)

- Hangi istemciler kullanildi (OS/browser/mobil modeli)
- Saat + lobi + masa no/kod
- Diagnostics panelinden:
  - Durum, WS state
  - WS Open/Close/Error
  - HTTP Push/Pull sayaci
  - lastError metni
- Beklenen/gerceklesen davranis (kisa ve net)

