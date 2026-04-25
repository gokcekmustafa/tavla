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
6. Guvenli diagnostik modu:
   - varsayilan kapali, oyun davranisini etkilemez,
   - `?diag=1` ile acilabilir (kalici saklanir),
   - WS ac/kapa/hata ve HTTP push/pull sayaçlari panelde izlenebilir.
7. Oda/masa akis smoke kontrolu:
   - `scripts/smoke-room-flow.mjs` eklendi,
   - masa acma/oturma/baslatma/cikis zinciri ve kritik cagri baglantilari kontrol ediliyor,
   - `check:safe` icine dahil edildi.
8. Canli senkron dayanıklılık smoke kontrolu:
   - `scripts/smoke-realtime-resilience.mjs` eklendi,
   - WS/HTTP fallback/backoff, timeout ve start-gate re-sync korumalari kontrol ediliyor,
   - `check:safe` zincirine eklendi.
9. Kimlik/oturum butunlugu smoke kontrolu:
   - `scripts/smoke-identity-session.mjs` eklendi,
   - duplicate-user koltuk engeli, session temizligi ve storage senkronu kontrolleri yapiliyor,
   - `check:safe` zincirine eklendi.
10. Oda bagimsizligi + erisim smoke kontrolu:
   - `scripts/smoke-room-isolation-access.mjs` eklendi,
   - oda scope filtresi, presence tabanli oda ozetleri, ozel masa/izleyici erisim kurallari kontrol ediliyor,
   - `check:safe` zincirine eklendi.
11. Masadan cikma/izin akisi smoke kontrolu:
   - `scripts/smoke-leave-permission-flow.mjs` eklendi,
   - teklif, onay, red, modal acilma kosulu ve auto-leave baglantilari kontrol ediliyor,
   - `check:safe` zincirine eklendi.
12. Worker deploy/config smoke kontrolu:
   - `scripts/smoke-worker-deploy-config.mjs` eklendi,
   - wrangler assets/do bindingleri, worker route/export baglantilari ve DurableObject extends hatasi korumasi kontrol ediliyor,
   - `check:safe` zincirine eklendi.
13. Sohbet kapsam/izin smoke kontrolu:
   - `scripts/smoke-chat-scope.mjs` eklendi,
   - lobi/masa sohbetinin oturum zamanina gore filtrelenmesi ve rol/izin kurallarinin baglantilari kontrol ediliyor,
   - `check:safe` zincirine eklendi.
14. Anasayfa/oda secimi oturum smoke kontrolu:
   - `scripts/smoke-entry-room-session.mjs` eklendi,
   - oyun secimi + oda secimi session persistence ve masadayken gecis engelleri kontrol ediliyor,
   - `check:safe` zincirine eklendi.
15. Legacy tahta etkileşim smoke kontrolu:
   - `scripts/smoke-legacy-interaction.mjs` eklendi,
   - surukle-birak, mobil dokunma/cift tik, highlight, geri al ve zar animasyonu baglantilari kontrol ediliyor,
   - `check:safe` zincirine eklendi.
16. Set serisi + puanlama smoke kontrolu:
   - `scripts/smoke-series-scoring.mjs` eklendi,
   - set token dedupe, seri tamamlanma, resign puani ve match-finished puan baglantilari kontrol ediliyor,
   - `check:safe` zincirine eklendi.
17. Presence yasam dongusu smoke kontrolu:
   - `scripts/smoke-presence-lifecycle.mjs` eklendi,
   - presence dedupe/heartbeat, lobi degisimi temizligi, beforeunload temizligi ve stale prune baglantilari kontrol ediliyor,
   - `check:safe` zincirine eklendi.
18. Oyun baslangic senkronu smoke kontrolu:
   - `scripts/smoke-room-start-sync.mjs` eklendi,
   - room-start-gate mesaj akisi, iframe onLoad re-sync, periyodik start-gate korumasi ve baslat overlay baglantilari kontrol ediliyor,
   - `check:safe` zincirine eklendi.
19. Iki istemcili oyun baslangic zinciri smoke kontrolu:
   - `scripts/smoke-two-client-start.mjs` eklendi,
   - auto-start, heartbeat yedegi, WS/HTTP snapshot yayin-alim ve room-start-gate baglantilari birlikte kontrol ediliyor,
   - `check:safe` zincirine eklendi.

## Sonraki adimlar

1. Oyuncu/masa gecislerinde kritik olaylari (oturma, ayrilma, oyun baslangici) hafif event log ile izlemek.
2. Masadan cikis/izin akisi icin birim seviyesinde saf fonksiyon testleri yazmak.
3. Oda degisimi + masa kapanisi gecisleri icin odakli regress smoke adimi eklemek.
