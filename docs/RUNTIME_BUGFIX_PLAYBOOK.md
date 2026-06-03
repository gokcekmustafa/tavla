# Runtime Bugfix Playbook (Tek Sorun / Tek Duzeltme)

Bu rehber, calisan ozellikleri bozmadan runtime bugfix yapmayi standardize eder.

## Hedef

- Her turda yalnizca **tek bir bug** hedeflemek.
- Degisiklik etkisini dar tutmak.
- Her bugfix sonunda `check:safe` ile regresyon taramasi yapmak.

## Zorunlu Akis

1. Sorunu tek cumle ile tanimla.
2. Etkilenen tek akis ve dosyalari sinirla.
3. Duzeltmeyi minimum diff ile uygula.
4. `check:safe` calistir.
5. Sonucu 3 maddeyle raporla:
   - Beklenen
   - Gerceklesen
   - Kalan risk

## Kirmizi Cizgiler

- Bir bugfix turunda birden fazla davranis degisikligi yapma.
- UI/tema iyilestirmesini bugfix turuna karistirma.
- Kanit yoksa fallback/cleanup kodu ekleme.

## Test Notu

- Runtime bugfixte mutlaka:
  - ilgili bug akisi manuel test,
  - tam `check:safe` zinciri,
  - sonra commit.

