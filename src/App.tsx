import { useMemo, useState } from "react";
import "./App.css";
import TavlaApp from "./apps/tavla/TavlaApp";
import Okey101App from "./apps/okey101/Okey101App";

type RootGameChoice = "tavla" | "okey101" | null;

const ROOT_GAME_CHOICE_KEY = "tavla.root.selected.game.v1";

function readPathChoice(): RootGameChoice {
  if (typeof window === "undefined") return null;
  const path = window.location.pathname.toLowerCase();
  if (path.startsWith("/tavla") || path === "/tasarim") return "tavla";
  if (path.startsWith("/okey101") || path.startsWith("/okey")) return "okey101";
  const params = new URLSearchParams(window.location.search);
  if (params.get("game") === "tavla") return "tavla";
  if (params.get("game") === "okey101") return "okey101";
  return null;
}

function readStoredChoice(): RootGameChoice {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(ROOT_GAME_CHOICE_KEY);
  if (raw === "tavla" || raw === "okey101") return raw;
  return null;
}

function saveChoice(choice: RootGameChoice) {
  if (typeof window === "undefined") return;
  if (!choice) {
    window.sessionStorage.removeItem(ROOT_GAME_CHOICE_KEY);
    return;
  }
  window.sessionStorage.setItem(ROOT_GAME_CHOICE_KEY, choice);
}

function GameHub({ onSelect }: { onSelect: (choice: Exclude<RootGameChoice, null>) => void }) {
  return (
    <section className="my-entry-page my-game-picker-page">
      <div className="my-entry-head">
        <h2>Oyun Secimi</h2>
        <p>Oynamak istedigin oyunu secerek devam et.</p>
      </div>
      <div className="my-game-picker-grid">
        <button
          type="button"
          className="my-game-picker-card game-tavla"
          onClick={() => onSelect("tavla")}
        >
          <span className="my-game-picker-thumb" aria-hidden="true" />
          <span className="my-game-picker-badge">Hazir</span>
          <strong>Klasik Tavla</strong>
          <p>Online masa, bot modu ve mevcut sistemle devam et.</p>
        </button>
        <button
          type="button"
          className="my-game-picker-card game-okey"
          onClick={() => onSelect("okey101")}
        >
          <span className="my-game-picker-thumb" aria-hidden="true" />
          <span className="my-game-picker-badge">Hazir</span>
          <strong>101 Okey</strong>
          <p>4 kisilik masa yapisiyla 101 gelistirmesine devam et.</p>
        </button>
      </div>
    </section>
  );
}

function App() {
  const initialChoice = useMemo<RootGameChoice>(() => {
    const pathChoice = readPathChoice();
    if (pathChoice) return pathChoice;
    return readStoredChoice();
  }, []);
  const [rootChoice, setRootChoice] = useState<RootGameChoice>(initialChoice);
  const isDesignMode = useMemo(() => {
    if (typeof window === "undefined") return false;
    if (window.location.pathname.toLowerCase() === "/tasarim") return true;
    if (window.location.hash.toLowerCase() === "#/tasarim") return true;
    const params = new URLSearchParams(window.location.search);
    return params.get("design") === "1";
  }, []);

  if (rootChoice === "tavla") return <TavlaApp designMode={isDesignMode} />;
  if (rootChoice === "okey101") return <Okey101App />;

  return (
    <GameHub
      onSelect={(choice) => {
        setRootChoice(choice);
        saveChoice(choice);
      }}
    />
  );
}

export default App;
