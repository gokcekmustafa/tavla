@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=IM+Fell+English:ital@0;1&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.t-root {
  min-height: 100vh;
  background:
    repeating-linear-gradient(91deg, transparent, rgba(255,210,130,0.012) 1px, transparent 2px, transparent 22px),
    repeating-linear-gradient(180deg, transparent, rgba(0,0,0,0.06) 1px, transparent 2px, transparent 44px),
    radial-gradient(ellipse at 15% 60%, rgba(60,25,8,0.7) 0%, transparent 55%),
    radial-gradient(ellipse at 85% 20%, rgba(40,18,6,0.6) 0%, transparent 50%),
    linear-gradient(155deg, #1c0e06 0%, #2b1507 35%, #190c05 65%, #221106 100%);
  font-family: 'IM Fell English', serif;
  color: rgba(200,160,90,0.85);
}

/* Header */
.t-header {
  position: relative;
  background: rgba(0,0,0,0.25);
  padding: 28px 32px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  border-bottom: 0.5px solid rgba(180,130,60,0.2);
}
.t-eyebrow {
  font-style: italic;
  font-size: 12px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(160,115,55,0.5);
  display: block;
  margin-bottom: 4px;
}
.t-title {
  font-family: 'Cinzel', serif;
  font-size: clamp(28px, 5vw, 44px);
  font-weight: 700;
  letter-spacing: 0.16em;
  color: #c8955a;
  text-shadow: 0 2px 0 rgba(0,0,0,0.7), 0 0 40px rgba(200,149,90,0.2);
}
.t-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.t-pill {
  font-style: italic;
  font-size: 11px;
  letter-spacing: 0.08em;
  padding: 3px 10px;
  border: 0.5px solid rgba(180,130,60,0.3);
  color: rgba(170,125,60,0.65);
  background: rgba(180,130,60,0.05);
}
.t-pill.ok  { border-color: rgba(80,160,80,0.4);  color: rgba(100,180,90,0.7); }
.t-pill.warn { border-color: rgba(200,140,40,0.4); color: rgba(200,150,50,0.7); }

.t-header-actions { display: flex; gap: 10px; flex-wrap: wrap; }

.btn-secondary, .btn-link {
  font-family: 'Cinzel', serif;
  font-size: 11px;
  letter-spacing: 0.12em;
  color: rgba(180,130,60,0.7);
  background: transparent;
  border: 0.5px solid rgba(180,130,60,0.35);
  padding: 8px 18px;
  cursor: pointer;
  transition: all 0.25s;
  text-decoration: none;
  display: inline-block;
}
.btn-secondary:hover, .btn-link:hover {
  color: #c8955a;
  border-color: rgba(200,155,80,0.65);
  background: rgba(180,130,60,0.07);
}

/* Grid */
.t-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1px;
  background: rgba(180,130,60,0.08);
  border-bottom: 0.5px solid rgba(180,130,60,0.12);
}
.t-card { background: rgba(12,5,2,0.55); padding: 24px 28px; display: flex; flex-direction: column; gap: 12px; }
.t-label { font-family: 'Cinzel', serif; font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(160,115,55,0.5); }
.t-value { font-size: 15px; color: rgba(200,160,90,0.8); }
.t-value.ok { color: rgba(100,180,90,0.8); }
.t-value.warn { color: rgba(200,150,50,0.8); }
.t-muted { font-style: italic; font-size: 12px; color: rgba(150,105,45,0.45); line-height: 1.6; }
.t-muted code { font-family: monospace; font-size: 11px; color: rgba(180,130,60,0.45); font-style: normal; }

.mode-toggle { display: flex; gap: 8px; }
.btn-mode {
  font-family: 'Cinzel', serif;
  font-size: 10px;
  letter-spacing: 0.1em;
  padding: 7px 14px;
  border: 0.5px solid rgba(180,130,60,0.3);
  background: transparent;
  color: rgba(160,115,55,0.55);
  cursor: pointer;
  transition: all 0.25s;
  position: relative;
}
.btn-mode.active {
  border-color: rgba(200,155,80,0.7);
  color: #c8955a;
  background: rgba(180,130,60,0.1);
}
.btn-mode:hover:not(.active) { color: rgba(180,140,70,0.7); border-color: rgba(180,130,60,0.5); }

/* Board */
.t-board-wrap { padding: 24px 32px 32px; }
.t-board-head { display: flex; align-items: baseline; gap: 16px; margin-bottom: 16px; }
.t-board-title { font-family: 'Cinzel', serif; font-size: 13px; letter-spacing: 0.18em; color: rgba(180,130,60,0.6); }
.t-board-subtitle { font-style: italic; font-size: 12px; color: rgba(140,100,40,0.4); }
.t-board-frame {
  border: 0.5px solid rgba(180,130,60,0.25);
  overflow: hidden;
  background: rgba(0,0,0,0.4);
  box-shadow: inset 0 0 0 4px rgba(10,4,1,0.8), inset 0 0 0 5px rgba(180,130,60,0.1);
}
.t-board-frame iframe { display: block; width: 100%; height: min(620px, 72vw); border: none; }

/* Roadmap */
.t-roadmap { padding: 28px 32px 36px; border-top: 0.5px solid rgba(180,130,60,0.1); background: rgba(0,0,0,0.2); }
.t-roadmap ol { list-style: none; counter-reset: step; display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
.t-roadmap li {
  font-style: italic;
  font-size: 13px;
  color: rgba(150,110,50,0.5);
  padding-left: 24px;
  position: relative;
  line-height: 1.5;
  counter-increment: step;
}
.t-roadmap li::before {
  content: counter(step, upper-roman);
  position: absolute;
  left: 0;
  font-family: 'Cinzel', serif;
  font-style: normal;
  font-size: 10px;
  color: rgba(160,115,55,0.35);
  top: 1px;
}
