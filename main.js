const HEX_SIZE = 38;
const SQRT3 = Math.sqrt(3);
const GRID_COLS = 28;
const GRID_ROWS = 18;
const DEFAULT_COUNTRY_COLOR = "#e06666";
const PAN_SENSITIVITY = 1.65;

const TERRAIN_OPTIONS = [
  { key: "plain", label: "平原" },
  { key: "forest", label: "森" },
  { key: "mountain", label: "山" },
  { key: "sea", label: "海" }
];

const TERRAIN_LABEL_MAP = Object.fromEntries(
  TERRAIN_OPTIONS.map((item) => [item.key, item.label])
);

const state = {
  tiles: createInitialTiles(),
  countries: [],
  tool: "terrain",
  selectedTerrain: "plain",
  selectedCountryId: "",
  countryPaintMode: "paint",
  draggingTilePaint: false,
  isPanning: false,
  showGrid: true,
  hoverTileId: null,
  camera: { x: 120, y: 80, scale: 1 }
};

const refs = {
  mapSvg: document.getElementById("mapSvg"),
  terrainButtons: document.getElementById("terrainButtons"),
  fillButtons: document.getElementById("fillButtons"),
  toolTerrainBtn: document.getElementById("toolTerrainBtn"),
  toolCountryBtn: document.getElementById("toolCountryBtn"),
  terrainControls: document.getElementById("terrainControls"),
  countryControls: document.getElementById("countryControls"),
  countryPaintBtn: document.getElementById("countryPaintBtn"),
  countryEraseBtn: document.getElementById("countryEraseBtn"),
  countrySelect: document.getElementById("countrySelect"),
  selectedCountryInfo: document.getElementById("selectedCountryInfo"),
  clearOwnershipBtn: document.getElementById("clearOwnershipBtn"),
  countryNameInput: document.getElementById("countryNameInput"),
  countryColorInput: document.getElementById("countryColorInput"),
  addCountryBtn: document.getElementById("addCountryBtn"),
  countryList: document.getElementById("countryList"),
  toggleGridBtn: document.getElementById("toggleGridBtn"),
  resetCameraBtn: document.getElementById("resetCameraBtn"),
  exportBtn: document.getElementById("exportBtn"),
  resetMapBtn: document.getElementById("resetMapBtn"),
  plainCount: document.getElementById("plainCount"),
  forestCount: document.getElementById("forestCount"),
  mountainCount: document.getElementById("mountainCount"),
  seaCount: document.getElementById("seaCount"),
  hoverTileInfo: document.getElementById("hoverTileInfo"),
  exportWrap: document.getElementById("exportWrap"),
  exportText: document.getElementById("exportText")
};

function createInitialTiles(cols = GRID_COLS, rows = GRID_ROWS) {
  const tiles = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      tiles.push({
        id: `${col}_${row}`,
        col,
        row,
        terrain: "plain",
        countryId: null
      });
    }
  }
  return tiles;
}

function hexToPixel(col, row, size = HEX_SIZE) {
  return {
    x: size * SQRT3 * (col + 0.5 * (row % 2)),
    y: size * 1.5 * row
  };
}

function polygonPoints(cx, cy, size = HEX_SIZE) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
  }
  return pts.join(" ");
}

function getCountryById(id) {
  return state.countries.find(c => c.id === id);
}

function getTileFillColor(tile) {
  const base = {
    plain: "#b8cf8d",
    forest: "#6f9d63",
    mountain: "#9a9287",
    sea: "#6ea3d8"
  }[tile.terrain];

  // ★ここが今回のポイント（海はそのまま）
  if (tile.terrain === "sea") return base;

  if (!tile.countryId) return base;

  const country = getCountryById(tile.countryId);
  if (!country) return base;

  return mixColors(base, country.color, 0.5);
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#",""),16);
  return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
}

function rgbToHex(r,g,b){
  return "#" + [r,g,b].map(v=>Math.round(v).toString(16).padStart(2,"0")).join("");
}

function mixColors(a,b,ratio){
  const ca = hexToRgb(a), cb = hexToRgb(b);
  return rgbToHex(
    ca.r*(1-ratio)+cb.r*ratio,
    ca.g*(1-ratio)+cb.g*ratio,
    ca.b*(1-ratio)+cb.b*ratio
  );
}

function paintTile(id){
  const tile = state.tiles.find(t=>t.id===id);
  if(!tile) return;

  if(state.tool==="terrain"){
    tile.terrain = state.selectedTerrain;
  }else{
    tile.countryId = state.countryPaintMode==="erase" ? null : state.selectedCountryId;
  }
  render();
}

function renderMap(){
  const svg = refs.mapSvg;
  svg.innerHTML="";

  const g = document.createElementNS("http://www.w3.org/2000/svg","g");
  g.setAttribute("transform",
    `translate(${state.camera.x} ${state.camera.y}) scale(${state.camera.scale})`
  );

  state.tiles.forEach(tile=>{
    const pos = hexToPixel(tile.col,tile.row);

    const hex = document.createElementNS("http://www.w3.org/2000/svg","polygon");
    hex.setAttribute("points", polygonPoints(pos.x,pos.y));
    hex.setAttribute("fill", getTileFillColor(tile));
    hex.setAttribute("stroke", state.showGrid ? "#223" : "none");

    hex.addEventListener("mousedown", e=>{
      e.stopPropagation();
      state.draggingTilePaint=true;
      paintTile(tile.id);
    });

    hex.addEventListener("mouseenter", ()=>{
      if(state.draggingTilePaint) paintTile(tile.id);
    });

    g.appendChild(hex);
  });

  svg.appendChild(g);
}

function render(){
  renderMap();
}

render();
