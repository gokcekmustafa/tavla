import { useMemo, useState } from "react";
import { isNhostConfigured } from "./lib/nhost";
import "./App.css";

function App() {
  const [mode, setMode] = useState<"local" | "bot">("local");
  const [iframeKey, setIframeKey] = useState(1);

  const iframeUrl = useMemo(() => {
    const qp = new URLSearchParams();
    qp.set("mode", mode);
    qp.set("t", String(iframeKey));
    return `/legacy/index.html?${qp.toString()}`;
  }, [mode, iframeKey]);

  return (
    <main className="shell">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Canli Oyun Deneyimi</p>
          <h1>Tavla Arena</h1>
          <p className="subtitle">Vite + React + TypeScript gecis surumu</p>
          <div className="hero-pills">
            <span className="pill">Cloudflare Canli</span>
            <span className="pill">{mode === "bot" ? "Bot Acik" : "2 Oyuncu Modu"}</span>
            <span className={`pill ${isNhostConfigured ? "pill-ok" : "pill-warn"}`}>
              {isNhostConfigured ? "Nhost Hazir" : "Nhost Bekliyor"}
            </span>
          </div>
        </div>
        <div className="hero-actions">
          <button type="button" className="secondary-btn" onClick={() => setIframeKey((value) => value + 1)}>
            Oyunu Sifirla
          </button>
          <a className="primary-link" href={iframeUrl} target="_blank" rel="noreferrer">
            Yeni Sekmede Ac
          </a>
        </div>
      </header>

      <section className="status-grid">
        <article className="card">
          <p className="label">Nhost Durumu</p>
          <p className={`value ${isNhostConfigured ? "ok" : "warn"}`}>
            {isNhostConfigured ? "Baglanti ayarlandi" : "Ayar bekleniyor"}
          </p>
          <p className="muted">
            `.env` icine `VITE_NHOST_SUBDOMAIN` ve `VITE_NHOST_REGION` eklendiginde uye girisi ve sohbet entegrasyonuna gececegiz.
          </p>
        </article>

        <article className="card">
          <p className="label">Oyun Modu</p>
          <div className="mode-actions">
            <button
              type="button"
              className={mode === "local" ? "primary-btn" : "secondary-btn"}
              onClick={() => setMode("local")}
            >
              Iki Oyuncu
            </button>
            <button
              type="button"
              className={mode === "bot" ? "primary-btn" : "secondary-btn"}
              onClick={() => setMode("bot")}
            >
              Bilgisayara Karsi
            </button>
          </div>
          <p className="muted">
            Bu asamada tavla oyunu legacy motorla calisiyor. Sonraki adimda motoru React bilesenlerine tasiyacagiz.
          </p>
        </article>
      </section>

      <section className="board-frame">
        <div className="board-head">
          <p className="board-title">Oyun Tahtasi</p>
          <p className="board-subtitle">Hamleleri asagidaki canli alanda oynayabilirsin.</p>
        </div>
        <iframe title="Tavla Oyunu" src={iframeUrl} />
      </section>

      <section className="roadmap">
        <p className="label">Sonraki Teknik Adimlar</p>
        <ol>
          <li>Nhost proje olusturma ve env baglama</li>
          <li>Email/sifre uyelik akisi</li>
          <li>Gercek zamanli sohbet tablolari ve API</li>
          <li>Online oda ve eslesme modeli</li>
          <li>Supabase tasimasina uygun Postgres sema disiplini</li>
        </ol>
      </section>
    </main>
  );
}

export default App;
