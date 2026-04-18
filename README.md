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
