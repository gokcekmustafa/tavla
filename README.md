# Tavla (Local Web Uygulaması)

Bu proje, Supabase gerektirmeden tarayıcıda çalışan yerel bir tavla uygulamasıdır.

## Neler Var

- İki oyunculu local tavla (aynı cihazda)
- Zar atma (çift zar durumunda 4 hamle)
- Geçerli hamle kontrolü
- Kırma (rakip tek taşını bara gönderme)
- Bardan oyuna giriş zorunluluğu
- Toplama (bearing off) kuralları
- Kazanan tespiti
- Bilgisayara karsi oyun modu (basit bot)
- Hamle gecmisi paneli
- Geri al (undo)

## Çalıştırma

1. `index.html` dosyasını tarayıcıda aç.
2. `Zar At` ile turu başlat.
3. Kaynak taşı seçip hedefe tıklayarak hamle yap.
4. Mod seciminden `Bilgisayara Karsi` acip bota karsi oynayabilirsin.
5. `Geri Al` ile son adimi geri alabilirsin.

## Supabase Gerekli mi?

Bu sürüm için hayır.Supabase yalnızca şu ihtiyaçlarda gerekli olur:

- Online eşleşme
- Kullanıcı hesabı / giriş
- Maç geçmişi, istatistik, liderlik tablosu
- Gerçek zamanlı senkronizasyon

## Sonraki Adım (İstersen)

Bir sonraki aşamada Supabase ekleyip oda tabanlı online 1v1 mimarisi kurabiliriz.
