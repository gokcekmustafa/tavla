# Tavla - Vite + React + TypeScript

Bu repo, tavla uygulamasinin React/TypeScript tabanina gecis surumudur.

## Bu Surumde Neler Var

- Vite + React + TypeScript proje yapisi
- Legacy tavla motoru (`public/legacy`) iframe icinde calisir
- Oyun modu secimi (iki oyuncu / bilgisayara karsi) React kabugundan yonetilir
- Nhost baglanti hazirlik kontrolu (`VITE_NHOST_SUBDOMAIN`, `VITE_NHOST_REGION`)

## Gelistirme

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Nhost Hazirligi

1. Nhost projesi olustur.
2. Repo kokunde `.env` dosyasi ac.
3. Asagidaki degiskenleri gir:

```env
VITE_NHOST_SUBDOMAIN=senin-subdomain
VITE_NHOST_REGION=senin-region
```

Not: Bu asamada tam auth/chat entegrasyonu henuz eklenmedi. Sonraki adimda React tarafina Nhost auth ve sohbet katmani baglanacak.

## Veritabani Baslangici

- Tasinabilir Postgres semasi: [database/schema.sql](database/schema.sql)
- Bu sema Nhost'ta calisir ve daha sonra Supabase'e tasinmasi kolaydir.

## Supabase'e Sonradan Tasima Icin Not

- Uygulama semasini Postgres uyumlu tut.
- Vendor-ozel alanlardan kacin.
- Auth disi is verilerini ayrik tablolarda tut (`profiles`, `games`, `messages`).
