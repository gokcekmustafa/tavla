# Git Push Credentials (Windows)

Bu not, `SEC_E_NO_CREDENTIALS` benzeri push sorunlarini kalici olarak onlemek icindir.
Oyun davranisina dokunmaz, sadece Git istemci ayarlarini sabitler.

## Bir Defalik Kurulum (Repo Icinde)

```powershell
git -C D:\Playground config --local http.sslBackend openssl
git -C D:\Playground config --local credential.helper manager-core
```

## Hizli Dogrulama

```powershell
git -C D:\Playground config --local --get http.sslBackend
git -C D:\Playground config --local --get credential.helper
npm -C D:\Playground run smoke:git-push-credentials
```

Beklenen:
- `http.sslBackend` => `openssl`
- `credential.helper` => `manager-core`

## Not

- Bu ayarlar sadece bu repoda gecerlidir (`--local`).
- Runtime oyun kodunu etkilemez.
