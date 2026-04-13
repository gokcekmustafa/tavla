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
    <main className="t-root">
      <header className="t-header">
        <div className="t-brand">
          <span className="t-eyebrow">Canlı Oyun Deneyimi</span>
          <h1 className="t-title">TAVLA</h1>
          <div className="t-pills">
            <span className="t-pill">Cloudflare Canlı</span>
            <span className="t-pill">
              {mode === "bot" ? "Bot Açık" : "2 Oyuncu Modu"}
            </span>
            <span className={`t-pill ${isNhostConfigured ? "ok" : "warn"}`}>
              {isNhostConfigured ? "Nhost Hazır" : "Nhost Bekliyor"}
            </span>
          </div>
        </div>
        <div className="t-header-actions">
          <button
            className="btn-secondary"
            onClick={() => setIframeKey((v) => v + 1)}
          >
            Oyunu Sıfırla
          </button>
          <a
            className="btn-link"
            href={iframeUrl}
            target="_blank"
            rel="noreferrer"
          >
            Yeni Sekmede Aç ↗
          </a>
        </div>
      </header>

      <div className="t-grid">
        <div className="t-card">
          <p className="t-label">Nhost Durumu</p>
          <p className={`t-value ${isNhostConfigured ? "ok" : "warn"}`}>
            {isNhostConfigured ? "Bağlantı ayarlandı" : "Ayar bekleniyor"}
          </p>
          <p className="t-muted">
            <code>.env</code> içine <code>VITE_NHOST_SUBDOMAIN</code> ve{" "}
            <code>VITE_NHOST_REGION</code> eklendiğinde üye girişi ve sohbet
            entegrasyonuna geçeceğiz.
          </p>
        </div>

        <div className="t-card">
          <p className="t-label">Oyun Modu</p>
          <div className="mode-toggle">
            <button
              className={`btn-mode ${mode === "local" ? "active" : ""}`}
              onClick={() => setMode("local")}
            >
              İki Oyuncu
            </button>
            <button
              className={`btn-mode ${mode === "bot" ? "active" : ""}`}
              onClick={() => setMode("bot")}
            >
              Bilgisayara Karşı
            </button>
          </div>
          <p className="t-muted">
            Bu aşamada tavla oyunu legacy motorla çalışıyor. Sonraki adımda
            motoru React bileşenlerine taşıyacağız.
          </p>
        </div>
      </div>

      <section className="t-board-wrap">
        <div className="t-board-head">
          <p className="t-board-title">OYUN TAHTASI</p>
          <p className="t-board-subtitle">
            Hamleleri aşağıdaki canlı alanda oynayabilirsin.
          </p>
        </div>
        <div className="t-board-frame">
          <iframe title="Tavla Oyunu" src={iframeUrl} />
        </div>
      </section>

      <section className="t-roadmap">
        <p className="t-label">Sonraki Teknik Adımlar</p>
        <ol>
          <li>Nhost proje oluşturma ve env bağlama</li>
          <li>Email/şifre üyelik akışı</li>
          <li>Gerçek zamanlı sohbet tabloları ve API</li>
          <li>Online oda ve eşleşme modeli</li>
          <li>Supabase taşımasına uygun Postgres şema disiplini</li>
        </ol>
      </section>
    </main>
  );
}

export default App;
