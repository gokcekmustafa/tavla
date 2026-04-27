import TavlaApp from "./apps/tavla/TavlaApp";
import Okey101App from "./apps/okey101/Okey101App";

function navigateTo(path: string) {
  if (typeof window === "undefined") return;
  if (window.location.pathname === path) return;
  window.location.assign(path);
}

function GameHub() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0d4f63", padding: "24px" }}>
      <section
        style={{
          width: "min(640px, 100%)",
          borderRadius: 16,
          border: "2px solid rgba(86, 168, 195, 0.6)",
          background: "linear-gradient(180deg, #146b84, #0f5570)",
          padding: 20,
          color: "#ecf9ff",
          display: "grid",
          gap: 14,
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.7rem", lineHeight: 1.1 }}>Oyun Secimi</h1>
        <p style={{ margin: 0, color: "#d4eef8" }}>Tavla ve 101 Okey artik ayri uygulamalar olarak calisir.</p>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <button
            type="button"
            onClick={() => navigateTo("/tavla")}
            style={{
              minHeight: 54,
              borderRadius: 10,
              border: "1px solid rgba(248, 220, 156, 0.72)",
              background: "linear-gradient(180deg, #d7a83b, #a7731a)",
              color: "#fffdfa",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Tavla Uygulamasi
          </button>
          <button
            type="button"
            onClick={() => navigateTo("/okey101")}
            style={{
              minHeight: 54,
              borderRadius: 10,
              border: "1px solid rgba(104, 183, 112, 0.78)",
              background: "linear-gradient(180deg, #3b9d4c, #2a7d39)",
              color: "#f6fff7",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            101 Okey Uygulamasi
          </button>
        </div>
      </section>
    </main>
  );
}

function App() {
  if (typeof window === "undefined") return <GameHub />;
  const path = window.location.pathname.toLowerCase();
  if (path.startsWith("/tavla")) return <TavlaApp />;
  if (path.startsWith("/okey101") || path.startsWith("/okey")) return <Okey101App />;
  return <GameHub />;
}

export default App;
