# Tavla Realtime Worker

Bu Worker, lobi ve oda kanallari icin global WebSocket senkronu saglar.

## Kurulum

1. `npm i -g wrangler` (veya `npx wrangler ...`)
2. Cloudflare hesabinda login ol:

```bash
wrangler login
```

3. Bu klasorde deploy et:

```bash
cd realtime-worker
wrangler deploy
```

Deploy sonrasi Worker URL'i su formatta olur:

`https://<worker-adi>.<hesap>.workers.dev`

WebSocket endpoint:

`wss://<worker-adi>.<hesap>.workers.dev/realtime`

## Frontend Entegrasyonu

Uygulama `.env` dosyasinda su degiskeni kullanir:

```env
VITE_REALTIME_WS_URL=wss://<worker-adi>.<hesap>.workers.dev/realtime
```

Bu URL hem React lobi senkronunda hem de legacy oyun odasi senkronunda kullanilir.
