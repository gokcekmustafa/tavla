# Bugfix Queue

Bu dosya, runtime bugfix turlarini tek tek takip etmek icin kullanilir.
Kural: Her turda sadece 1 bug aktif olur.
Sablon: `docs/BUGFIX_TRIAGE_TEMPLATE.md`

## Durum Kodlari

- `new`: yeni kayit
- `triaged`: kapsam ve etkisi netlesti
- `in_progress`: aktif cozum
- `verifying`: check:safe + manuel test asamasi
- `done`: cozuldu

## Oncelik

- `P0`: oyunu kullanilamaz yapan kritik
- `P1`: ana akis bozan
- `P2`: islevi bozmayan ama deneyimi zedeleyen
- `P3`: kozmetik/minor

## Aktif Kuyruk

| ID | Oncelik | Durum | Alan | Ozet | Sonraki Aksiyon |
| --- | --- | --- | --- | --- | --- |
| BQ-001 | P2 | done | Tooling | BQ kaydindaki kodlama bozulmasi kapatildi (`docs/bugs/BQ-001.md`) | Yeni bug geldiginde BQ-002 ile yeni tur ac |
| BQ-002 | P1 | new | Runtime | Yeni dogrulanabilir canli bug bekleniyor (`docs/bugs/BQ-002.md`) | Ilk bug raporunda triage kaydini doldurup durumu triaged'a al |

## Triage Notu (Her Bug Icin Zorunlu)

1. Tek cumle bug tanimi
2. Yeniden uretim adimlari (en fazla 5 adim)
3. Beklenen / Gerceklesen davranis
4. Etki alani (hangi modlar/ekranlar)
5. Cozum stratejisi (tek dosya/tek akis odagi)
