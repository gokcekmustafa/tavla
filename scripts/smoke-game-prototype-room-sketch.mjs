import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src", "App.tsx");
const cssPath = resolve("src", "App.css");
const appSource = readFileSync(appPath, "utf8");
const cssSource = readFileSync(cssPath, "utf8");

function hasApp(text) {
  return appSource.includes(text);
}

function hasCss(text) {
  return cssSource.includes(text);
}

const checks = [
  {
    label: "101 oda taslagi local state ile ac/kapatiliyor",
    test: () =>
      hasApp("const [okeyPrototypeRoomSketchOpen, setOkeyPrototypeRoomSketchOpen] = useState(false);")
      && hasApp("const [okeyPrototypeRoomFilter, setOkeyPrototypeRoomFilter] = useState<\"all\" | \"fast\" | \"busy\">(\"all\");")
      && hasApp("const [okeyPrototypeSelectedRoomId, setOkeyPrototypeSelectedRoomId] = useState<string>(OKEY_PROTOTYPE_ROOMS[0]?.id ?? \"\");")
      && hasApp("const [okeyPrototypeTableFilter, setOkeyPrototypeTableFilter] = useState<\"all\" | \"active\" | \"waiting\">(\"all\");")
      && hasApp("const [okeyPrototypeOnlyWithFreeSeats, setOkeyPrototypeOnlyWithFreeSeats] = useState(false);")
      && hasApp("const [okeyPrototypeTableSearch, setOkeyPrototypeTableSearch] = useState(\"\");")
      && hasApp("const [okeyPrototypeTableSort, setOkeyPrototypeTableSort] = useState<\"tableNo\" | \"occupancy\" | \"status\">(\"tableNo\");")
      && hasApp("const [okeyPrototypeSelectedTableId, setOkeyPrototypeSelectedTableId] = useState(\"\");")
      && hasApp("const [okeyPrototypeSeatDraft, setOkeyPrototypeSeatDraft] = useState(1);")
      && hasApp("const [okeyPrototypeSeatReservation, setOkeyPrototypeSeatReservation] = useState<{ tableId: string; seatNo: number } | null>(null);")
      && hasApp("const [okeyPrototypeActionLog, setOkeyPrototypeActionLog] = useState<Array<{ id: string; at: number; text: string }>>([]);")
      && hasApp("const okeyPrototypeSelectedTableIndex = useMemo(() => {")
      && hasApp("const okeyPrototypeSelectedTablePosition = okeyPrototypeSelectedTableIndex >= 0 ? okeyPrototypeSelectedTableIndex + 1 : 0;")
      && hasApp("const okeyPrototypeRandomFreeSeatTableCandidates = useMemo(() => {")
      && hasApp("const okeyPrototypeHasTableFilters = Boolean(")
      && hasApp("const okeyPrototypeActiveFilters = useMemo(() => {")
      && hasApp("function appendOkeyPrototypeAction(rawText: string) {")
      && hasApp("function resetOkeyPrototypeTableFilters() {")
      && hasApp("function clearOkeyPrototypeFilterChip(filterKey: string, label: string) {")
      && hasApp("function moveOkeyPrototypeTableSelection(step: number) {")
      && hasApp("function jumpOkeyPrototypeTableSelection(target: \"first\" | \"last\") {")
      && hasApp("function pickRandomOkeyPrototypeTable() {")
      && hasApp("function pickRandomOkeyPrototypeFreeSeatTable() {")
      && hasApp("function selectFirstOkeyPrototypeSearchResult() {")
      && hasApp("onClick={() => setOkeyPrototypeRoomSketchOpen((prev) => !prev)}")
      && hasApp("{okeyPrototypeRoomSketchOpen ? \"101 Oda Taslagini Kapat\" : \"101 Oda Taslagini Ac\"}"),
  },
  {
    label: "101 oda taslagi kartlari render ediliyor",
    test: () =>
      hasApp("const OKEY_PROTOTYPE_ROOMS = [")
      && hasApp("className=\"my-game-coming-room-shell\"")
      && hasApp("className=\"my-game-coming-room-filters\"")
      && hasApp("className={`my-game-coming-room-filter ${okeyPrototypeRoomFilter === \"all\" ? \"active\" : \"\"}`}")
      && hasApp("className=\"my-game-coming-room-selected\"")
      && hasApp("className=\"my-game-coming-room-grid\"")
      && hasApp("okeyPrototypeFilteredRooms.map((room) => (")
      && hasApp("className={`my-game-coming-room-card ${okeyPrototypeSelectedRoomId === room.id ? \"active\" : \"\"}`}")
      && hasApp("appendOkeyPrototypeAction(`Oda secildi: ${room.name}`);")
      && hasApp("Gorunen Oda: {okeyPrototypeFilteredRooms.length} | Toplam Oyuncu: {okeyPrototypeFilteredPlayers}")
      && hasApp("const okeyPrototypeTableSketchRows = useMemo(() => {")
      && hasApp("className=\"my-game-coming-table-sketch\"")
      && hasApp("className=\"my-game-coming-table-sketch-filters\"")
      && hasApp("Masa | Filtre: {okeyPrototypeActiveFilters.length}")
      && hasApp("className={`my-game-coming-table-sketch-filter ${okeyPrototypeTableFilter === \"all\" ? \"active\" : \"\"}`}")
      && hasApp("className={`my-game-coming-table-sketch-filter ${okeyPrototypeOnlyWithFreeSeats ? \"active\" : \"\"}`}")
      && hasApp("Bos Koltuk Var")
      && hasApp("className=\"my-game-coming-table-sketch-sort\"")
      && hasApp("className=\"my-game-coming-table-sketch-sort-select\"")
      && hasApp("const okeyPrototypeVisibleTableSketchRows = useMemo(() => {")
      && hasApp("className=\"my-game-coming-table-sketch-search\"")
      && hasApp("className=\"my-game-coming-table-sketch-search-row\"")
      && hasApp("className=\"my-game-coming-table-sketch-search-input\"")
      && hasApp("onKeyDown={(e) => {")
      && hasApp("if (e.key !== \"Enter\") return;")
      && hasApp("selectFirstOkeyPrototypeSearchResult();")
      && hasApp("className=\"my-action-btn soft my-game-coming-table-sketch-search-pick-btn\"")
      && hasApp("title=\"Arama sonucundaki ilk masayi secer\"")
      && hasApp("Ilk Sonuc")
      && hasApp("Arama sonucu secildi:")
      && hasApp("className=\"my-action-btn soft my-game-coming-table-sketch-search-clear-btn\"")
      && hasApp("title=\"Masa arama kutusunu temizler\"")
      && hasApp("Masa aramasi temizlendi.")
      && hasApp("Temizle")
      && hasApp("className=\"my-game-coming-table-sketch-search-meta\"")
      && hasApp("aria-live=\"polite\"")
      && hasApp("Sonuc: {okeyPrototypeVisibleTableSketchRows.length} masa | Enter: Ilk Sonuc")
      && hasApp("className=\"my-action-btn soft my-game-coming-table-sketch-reset-btn\"")
      && hasApp("title=\"Tum masa filtrelerini temizler\"")
      && hasApp("aria-label={`Filtreleri sifirla. Aktif filtre: ${okeyPrototypeActiveFilters.length}`}")
      && hasApp("Filtreleri Sifirla")
      && hasApp("Filtreleri Sifirla ({okeyPrototypeActiveFilters.length})")
      && hasApp("className=\"my-game-coming-table-sketch-active-filters\"")
      && hasApp("className=\"my-game-coming-table-sketch-filter-count\"")
      && hasApp("Aktif filtreler: {okeyPrototypeActiveFilters.length}")
      && hasApp("className=\"my-game-coming-table-sketch-filter-chip-btn\"")
      && hasApp("title={`${filter.label} filtresini kaldir`}")
      && hasApp("className=\"my-game-coming-table-sketch-filter-empty\"")
      && hasApp("Aktif filtre yok.")
      && hasApp("onClick={() => clearOkeyPrototypeFilterChip(filter.key, filter.label)}")
      && hasApp("className=\"my-game-coming-table-sketch-selected\"")
      && hasApp("className=\"my-game-coming-table-sketch-nav\"")
      && hasApp("className=\"my-game-coming-table-sketch-nav-indicator\"")
      && hasApp("{okeyPrototypeSelectedTablePosition}/{okeyPrototypeVisibleTableSketchRows.length}")
      && hasApp("className=\"my-action-btn soft my-game-coming-table-sketch-nav-btn\"")
      && hasApp("onClick={() => jumpOkeyPrototypeTableSelection(\"first\")}")
      && hasApp("onClick={() => moveOkeyPrototypeTableSelection(-1)}")
      && hasApp("onClick={() => moveOkeyPrototypeTableSelection(1)}")
      && hasApp("onClick={() => jumpOkeyPrototypeTableSelection(\"last\")}")
      && hasApp("Ilk Masa")
      && hasApp("Onceki Masa")
      && hasApp("Sonraki Masa")
      && hasApp("onClick={pickRandomOkeyPrototypeTable}")
      && hasApp("Rastgele Masa")
      && hasApp("onClick={pickRandomOkeyPrototypeFreeSeatTable}")
      && hasApp("Rastgele Bos")
      && hasApp("Son Masa")
      && hasApp("const okeyPrototypeTableSummary = useMemo(() => {")
      && hasApp("const okeyPrototypeQuickJoinTable = useMemo(() => {")
      && hasApp("className=\"my-game-coming-table-sketch-summary\"")
      && hasApp("className=\"my-game-coming-table-sketch-summary-item\"")
      && hasApp("<span>Toplam Dolu</span>")
      && hasApp("<span>Toplam Bos</span>")
      && hasApp("className=\"my-game-coming-table-sketch-quick-join\"")
      && hasApp("Hizli Oneri: Masa {okeyPrototypeQuickJoinTable.tableNo}")
      && hasApp("appendOkeyPrototypeAction(`Hizli oneriden masa secildi: ${okeyPrototypeQuickJoinTable.tableNo}`);")
      && hasApp("Onerilen Masayi Sec")
      && hasApp("const okeyPrototypeSelectedTableSeats = useMemo(() => {")
      && hasApp("const okeyPrototypeAvailableSeatNos = useMemo(() => {")
      && hasApp("className=\"my-game-coming-table-seat-row\"")
      && hasApp("className={`my-game-coming-table-seat ${seat.occupied ? \"occupied\" : \"empty\"} ${!seat.occupied && okeyPrototypeSeatDraft === seat.seatNo ? \"draft\" : \"\"}`}")
      && hasApp("className=\"my-game-coming-table-seat-actions\"")
      && hasApp("className=\"my-game-coming-table-seat-chip-row\"")
      && hasApp("className={`my-game-coming-table-seat-chip ${okeyPrototypeSeatDraft === seatNo ? \"active\" : \"\"}`}")
      && hasApp("Masaya Otur (Prototip)")
      && hasApp("Masadan Ayril (Prototip)")
      && hasApp("className=\"my-game-coming-table-seat-status\"")
      && hasApp("className=\"my-game-coming-prototype-log\"")
      && hasApp("className=\"my-game-coming-prototype-log-list\"")
      && hasApp("className=\"my-game-coming-prototype-log-entry\"")
      && hasApp("Henuz kayitli prototip aksiyonu yok.")
      && hasApp("className=\"my-game-coming-table-sketch-grid\"")
      && hasApp("className=\"my-game-coming-table-sketch-empty-state\"")
      && hasApp("Aramaya uygun masa bulunamadi.")
      && hasApp("Filtreleri Temizle ve Tekrar Dene")
      && hasApp("okeyPrototypeVisibleTableSketchRows.map((row) => (")
      && hasApp("className={`my-game-coming-table-sketch-card ${row.active ? \"active\" : \"waiting\"} ${okeyPrototypeSelectedTableId === row.id ? \"selected\" : \"\"}`}")
      && hasApp("appendOkeyPrototypeAction(`Masa secildi: ${row.tableNo}`);"),
  },
  {
    label: "101 oda taslagi css siniflari mevcut",
    test: () =>
      hasCss(".my-game-coming-room-shell {")
      && hasCss(".my-game-coming-room-head {")
      && hasCss(".my-game-coming-room-filters {")
      && hasCss(".my-game-coming-room-filter.active {")
      && hasCss(".my-game-coming-room-selected {")
      && hasCss(".my-game-coming-room-grid {")
      && hasCss(".my-game-coming-room-card {")
      && hasCss(".my-game-coming-room-card.active {")
      && hasCss(".my-game-coming-table-sketch {")
      && hasCss(".my-game-coming-table-sketch-filters {")
      && hasCss(".my-game-coming-table-sketch-filter.active {")
      && hasCss(".my-game-coming-table-sketch-sort {")
      && hasCss(".my-game-coming-table-sketch-sort-select {")
      && hasCss(".my-game-coming-table-sketch-search {")
      && hasCss(".my-game-coming-table-sketch-search-row {")
      && hasCss(".my-game-coming-table-sketch-search-input {")
      && hasCss(".my-game-coming-table-sketch-search-pick-btn {")
      && hasCss(".my-game-coming-table-sketch-search-clear-btn {")
      && hasCss(".my-game-coming-table-sketch-search-meta {")
      && hasCss(".my-game-coming-table-sketch-reset-btn {")
      && hasCss(".my-game-coming-table-sketch-active-filters {")
      && hasCss(".my-game-coming-table-sketch-filter-count {")
      && hasCss(".my-game-coming-table-sketch-filter-empty {")
      && hasCss(".my-game-coming-table-sketch-filter-chip-btn {")
      && hasCss(".my-game-coming-table-sketch-selected {")
      && hasCss(".my-game-coming-table-sketch-nav {")
      && hasCss(".my-game-coming-table-sketch-nav-indicator {")
      && hasCss(".my-game-coming-table-sketch-nav-btn {")
      && hasCss(".my-game-coming-table-sketch-summary {")
      && hasCss(".my-game-coming-table-sketch-summary-item {")
      && hasCss(".my-game-coming-table-sketch-quick-join {")
      && hasCss(".my-game-coming-table-seat-row {")
      && hasCss(".my-game-coming-table-seat.occupied {")
      && hasCss(".my-game-coming-table-seat.draft {")
      && hasCss(".my-game-coming-table-seat-actions {")
      && hasCss(".my-game-coming-table-seat-chip.active {")
      && hasCss(".my-game-coming-table-seat-status {")
      && hasCss(".my-game-coming-prototype-log {")
      && hasCss(".my-game-coming-prototype-log-list {")
      && hasCss(".my-game-coming-prototype-log-entry {")
      && hasCss(".my-game-coming-table-sketch-grid {")
      && hasCss(".my-game-coming-table-sketch-empty-state {")
      && hasCss(".my-game-coming-table-sketch-empty {")
      && hasCss(".my-game-coming-table-sketch-empty-reset-btn {")
      && hasCss(".my-game-coming-table-sketch-card.active {")
      && hasCss(".my-game-coming-table-sketch-card.selected {"),
  },
];

const failed = checks.filter((check) => !check.test());

if (failed.length > 0) {
  console.error("Game prototype room sketch smoke FAILED:");
  for (const item of failed) {
    console.error(`- ${item.label}`);
  }
  process.exit(1);
}

console.log("Game prototype room sketch smoke passed.");
