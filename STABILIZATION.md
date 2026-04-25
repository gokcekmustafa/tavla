# Stabilizasyon Sprinti (Bozmadan Gelistirme)

Bu dokuman, calisan ozellikleri bozmadan ilerlemek icin minimum guvenlik adimlarini listeler.

## Hedef

- Oyun akisini koruyup (masa acma/oturma/baslama/bitirme) regresyon riskini dusurmek
- Canli senkron istemci yukunu kontrol altina almak
- Her degisiklikte otomatik kontrol ile "bozulma" riskini erken yakalamak

## Uygulanan ilk adimlar

1. `scripts/guard-critical-flows.mjs` eklendi.
2. `npm run check:safe` artik:
   - `guard:lobby-sync`
   - `guard:critical`
   - `build`
   adimlarini birlikte calistiriyor.
3. HTTP fallback senkron dongusu:
   - tek seferde tek tick mantigina alindi (setInterval yerine setTimeout zinciri),
   - gizli sekmede daha seyrek calisacak sekilde yavaslatildi.
4. Oyun baslangici iframe senkronu icin guvenlik takviyesi:
   - `table-chat-ready` mesajinda `room-start-gate` yeniden senkron ediliyor,
   - iframe `onLoad` sonrasinda kisa gecikmeli bir ek `room-start-gate` senkronu yapiliyor.
5. Hafif akis log katmani eklendi:
   - masaya oturma/engellenme,
   - masadan ayrilma/lobiye donme,
   - otomatik baslatma (iki koltuk dolunca) olaylari kaydediliyor.
   - panel acik oldugunda son akis olaylari izlenebiliyor.

## Sonraki adimlar

1. Oyuncu/masa gecislerinde kritik olaylari (oturma, ayrilma, oyun baslangici) hafif event log ile izlemek.
2. "Oyun basladi ama bir tarafta baslamadi" senaryosu icin iki istemcili smoke akisi eklemek.
3. Masadan cikis/izin akisi icin birim seviyesinde saf fonksiyon testleri yazmak.
