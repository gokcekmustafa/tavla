# Stabilizasyon Sprinti (Bozmadan Gelistirme)

Bu dokuman, calisan ozellikleri bozmadan ilerlemek icin minimum guvenlik adimlarini listeler.

## Hedef

- Oyun akisini koruyup (masa acma/oturma/baslama/bitirme) regresyon riskini dusurmek
- Canli senkron istemci yukunu kontrol altina almak
- Her degisiklikte otomatik kontrol ile bozulma riskini erken yakalamak

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
   - WS ac/kapa/hata ve HTTP push/pull sayaclari panelde izlenebilir.
7. Oda/masa akis smoke kontrolu:
   - `scripts/smoke-room-flow.mjs` eklendi,
   - masa acma/oturma/baslatma/cikis zinciri ve kritik cagri baglantilari kontrol ediliyor,
   - `check:safe` icine dahil edildi.
8. Canli senkron dayaniklilik smoke kontrolu:
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
15. Legacy tahta etkilesim smoke kontrolu:
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
20. Oda gecisi + masa kapanis regress smoke kontrolu:
   - `scripts/smoke-room-transition-close.mjs` eklendi,
   - oda degisimi engelleri, seat release, room-missing grace kapanisi, beforeunload temizligi ve closed-table baglantilari kontrol ediliyor,
   - `check:safe` zincirine eklendi.
21. Masadan cikis ceza/izin kurali unit kontrolu:
   - `scripts/unit-leave-penalty-rules.mjs` eklendi,
   - ceza karar mantigi (izin, timeout waiver, rakip baglantisi, seri durumu) senaryo bazli unit seviyede dogrulaniyor,
   - App.tsx ile kaynak baglanti (guard) kontrolleri ile birlikte `check:safe` zincirine eklendi.
22. Mobil secim hassasiyeti + drag/drop fallback smoke kontrolu:
   - `scripts/smoke-mobile-drag-fallback.mjs` eklendi,
   - touch/cift dokunma, drag kaynak fallback, pointer hint ve kirik pul uyari baglantilari kontrol ediliyor,
   - `check:safe` zincirine eklendi.
23. Kritik akis olaylari gozlenebilirlik smoke kontrolu:
   - `scripts/smoke-flow-event-observability.mjs` eklendi,
   - `appendFlowEvent` dedupe/log-limit, kritik event baglantilari ve diagnostik panelde akis listelemesi kontrol ediliyor,
   - `check:safe` zincirine eklendi.
24. Oda ozet sayac refresh tutarliligi smoke kontrolu:
   - `scripts/smoke-room-summary-refresh.mjs` eklendi,
   - room picker cached/fallback ozet, remote refresh timeout-backoff ve UI masa/oyuncu sayaci baglantilari kontrol ediliyor,
   - `check:safe` zincirine eklendi.
25. Kritik notice metinleri smoke kontrolu:
   - `scripts/smoke-critical-notices.mjs` eklendi,
   - masa/oda gecis engelleri, ozel masa uyarilari, masa kapanis/bulunamama ve senkron/servis notice metinleri kontrol ediliyor,
   - `check:safe` zincirine eklendi.
26. Diagnostics recovery checklist dokumani:
   - `docs/DIAGNOSTICS_RECOVERY_CHECKLIST.md` eklendi,
   - WS/HTTP toparlanma akislarini iki istemcili pratik kontrol adimlariyla standardize ediyor,
   - runtime davranisa dokunmadan operasyonel hata tespitini hizlandiriyor.
27. Runtime bugfix playbook dokumani:
   - `docs/RUNTIME_BUGFIX_PLAYBOOK.md` eklendi,
   - tek sorun / tek duzeltme / check:safe disiplinini standartlastiriyor,
   - bugfix turlarinda degisiklik kapsaminin dar tutulmasini garanti altina aliyor.
28. Runtime bugfix (tek sorun): lobby notice karakter normalizasyonu:
   - `src/App.tsx` icinde `normalizeTurkishDisplayText` eklendi,
   - lobby notice metinleri render oncesi normalize edilerek bozuk karakter gorunumu giderildi,
   - `scripts/smoke-notice-normalization.mjs` ile guard edilip `check:safe` zincirine eklendi.
29. Runtime bugfix kuyrugu olusturma:
   - `docs/BUGFIX_QUEUE.md` eklendi,
   - tek bug aktif kalacak sekilde oncelik/durum/triage standardi netlestirildi.
30. Bugfix triage sablonu + kuyruk butunluk smoke kontrolu:
   - `docs/BUGFIX_TRIAGE_TEMPLATE.md` eklendi,
   - `scripts/smoke-bugfix-queue-integrity.mjs` eklendi,
   - kuyruk durum kodlari/oncelik/triage zorunlu alanlari ve "tek aktif bug" kurali otomatik kontrol edilerek `check:safe` zincirine baglandi.
31. Push/deploy kimlik akisi koruma kilidi:
   - `docs/GIT_PUSH_CREDENTIALS_WINDOWS.md` eklendi,
   - `scripts/smoke-git-push-credentials.mjs` eklendi,
   - Windows repoda `http.sslBackend=openssl` ve `credential.helper=manager-core` ayarlari otomatik kontrol edilerek `check:safe` zincirine baglandi.
32. BQ-001 triage baslangic kilidi:
   - `docs/bugs/BQ-001.md` olusturuldu (tek bug kaydi acildi),
   - `scripts/smoke-bq001-triage-ready.mjs` eklendi,
   - kuyrukta BQ-001 satiri + detay kaydi baglantisi ve zorunlu triage basliklari otomatik kontrol edilerek `check:safe` zincirine baglandi.
33. Bug queue/ticket durum senkron kilidi:
   - `scripts/smoke-bug-ticket-sync.mjs` eklendi,
   - `docs/BUGFIX_QUEUE.md` satirindaki her BQ kaydinin `docs/bugs/BQ-xxx.md` dosyasiyla durum/oncelik tutarliligi otomatik kontrol edilerek `check:safe` zincirine baglandi.
34. Bug ticket kalite kilidi:
   - `scripts/smoke-bug-ticket-quality.mjs` eklendi,
   - bug kayitlarinda zorunlu triage basliklari kontrol edildi,
   - `new` durumunda placeholder (`Bekleniyor`) serbest, `triaged` ve sonrasi durumlarda placeholder yasak kurali otomatik kontrol edilerek `check:safe` zincirine baglandi.
35. BQ-001 triage tamamlama (dokuman bug'i):
   - `docs/BUGFIX_QUEUE.md` icinde BQ-001 durumu `triaged` olarak guncellendi,
   - `docs/bugs/BQ-001.md` placeholder metinlerden arindirilarak yeniden uretim/beklenen-gerceklesen/etki alani/cozum stratejisi alanlariyla somut bug kaydina donusturuldu.

## Sonraki adimlar

1. BQ-001'i `in_progress` durumuna alip tek dosya odakli encoding duzeltmesini uygulamak.
