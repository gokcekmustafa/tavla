# Tavla - Vite + React + TypeScript

Bu repo, tavla uygulamasinin React/TypeScript tabanina gecis surumudur.

## Bu Surumde Neler Var

- Vite + React + TypeScript proje yapisi
- Legacy tavla motoru (`public/legacy`) iframe icinde calisir
- Lobi + oda senkronu global WebSocket uzerinden calisir
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

## Online Realtime Kurulumu (Cloudflare Worker)

Global (farkli sehirlerden) kullanicilarin ayni masalari ve ayni oyunu gorebilmesi icin `realtime-worker` deployment'i gerekir.

1. `realtime-worker` klasorune gir:

```bash
cd realtime-worker
```

2. Worker'i deploy et:

```bash
wrangler login
wrangler deploy
```

3. Frontend `.env` dosyasina realtime endpoint yaz:

```env
VITE_REALTIME_WS_URL=wss://<worker-adi>.<hesap>.workers.dev/realtime
```

`VITE_REALTIME_WS_URL` verilmezse istemci varsayilan olarak ayni origin altinda `/realtime` endpoint'ine baglanir.

## Nhost Hazirligi

```env
VITE_NHOST_SUBDOMAIN=senin-subdomain
VITE_NHOST_REGION=senin-region
VITE_REALTIME_WS_URL=wss://<worker-adi>.<hesap>.workers.dev/realtime
```

## Veritabani Baslangici

- Tasinabilir Postgres semasi: [database/schema.sql](database/schema.sql)
- Bu sema Nhost'ta calisir ve daha sonra Supabase'e tasinmasi kolaydir.
