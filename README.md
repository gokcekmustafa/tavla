# Tavla - Vite + React + TypeScript

Bu repo, tavla uygulamasinin React/TypeScript tabanina gecis surumudur.

## Bu Surumde Neler Var

- Vite + React + TypeScript proje yapisi
- Legacy tavla motoru (`public/legacy`) iframe icinde calisir
- Lobi + oda senkronu global WebSocket + Durable Object uzerinden calisir
- Misafirler cihaz-bazli benzersiz isim alir (`Misafir N`)
- Oyun modu secimi (iki oyuncu / bilgisayara karsi) React kabugundan yonetilir

## Gelistirme

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Mobil Hazirlik (Capacitor)

Bu proje tek kod tabaniyla Android ve iOS'a hazirlanabilir.

1. Capacitor paketlerini kur:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
```

2. Platform projelerini olustur:

```bash
npm run cap:add:android
npm run cap:add:ios
```

3. React build + mobil senkron:

```bash
npm run cap:sync
```

4. Native IDE ile ac:

```bash
npm run cap:open:android
npm run cap:open:ios
```

Mobil app icinden API cagrilari icin:

```env
VITE_API_BASE_URL=https://tavla.gokcek.workers.dev
VITE_REALTIME_WS_URL=wss://tavla.gokcek.workers.dev/realtime
```

## Uretim Deploy (Tek Worker)

Bu proje tek Cloudflare Worker olarak deploy edilir:
- Statik `dist` dosyalari servisi
- `/realtime` websocket endpoint'i
- Durable Object ile kanal bazli canli senkron

1. Build al:

```bash
npm run build
```

2. Worker'i deploy et:

```bash
wrangler login
npm run deploy
```

Deploy sonrasi uygulama URL'i ornek:

`https://tavla.gokcek.workers.dev`

Realtime endpoint otomatik:

`wss://tavla.gokcek.workers.dev/realtime`

3. Gerekirse `.env` icinde manuel override:

```env
VITE_REALTIME_WS_URL=wss://<worker-adi>.<hesap>.workers.dev/realtime
```

`VITE_REALTIME_WS_URL` verilmezse istemci otomatik olarak ayni origin'de `/realtime` endpoint'ine baglanir.

## Nhost Hazirligi

```env
VITE_NHOST_SUBDOMAIN=senin-subdomain
VITE_NHOST_REGION=senin-region
VITE_REALTIME_WS_URL=wss://<worker-adi>.<hesap>.workers.dev/realtime
```

## Veritabani Baslangici

- Tasinabilir Postgres semasi: [database/schema.sql](database/schema.sql)
- Bu sema Nhost'ta calisir ve daha sonra Supabase'e tasinmasi kolaydir.
