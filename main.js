const HEX_SIZE = 42;
const SQRT3 = Math.sqrt(3);
const GRID_COLS = 24;
const GRID_ROWS = 18;
const DEFAULT_COUNTRY_COLOR = "#e06666";

const TERRAIN_OPTIONS = [
  { key: "plain", label: "平原", color: "#a8d08d" },
  { key: "forest", label: "森", color: "#6aa84f" },
  { key: "mountain", label: "山", color: "#8e7f7f" },
  { key: "sea", label: "海", color: "#6fa8dc" }
];

const TERRAIN_LABEL_MAP = Object.fromEntries(
  TERRAIN_OPTIONS.map((item) => [item.key, item.label])
);
const TERRAIN_COLOR_MAP = Object.fromEntries(
  TERRAIN_OPTIONS.map((item) => [item.key, item.color])
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

const panStart = { mouseX: 0, mouseY: 0, camX: 0, camY: 0 };

function createInitialTiles(cols = GRID_COLS, rows = GRID_ROWS) {
  const tiles = [];
  for (let q = 0; q < cols; q += 1) {
    for (let r = 0; r < rows; r += 1) {
      tiles.push({
        id: `${q}_${r}`,
        q,
        r,
        terrain: "plain",
        countryId: null
      });
    }
  }
  return tiles;
}

function hexToPixel(q, r, size = HEX_SIZE) {
  return {
    x: size * 1.5 * q,
    y: size * SQRT3 * (r + q / 2)
  };
}

function polygonPoints(cx, cy, size = HEX_SIZE) {
  const points = [];
  for (let i = 0; i < 6; i += 1) {
    const angleRad = (Math.PI / 180) * (60 * i);
    const x = cx + size * Math.cos(angleRad);
    const y = cy + size * Math.sin(angleRad);
    points.push(`${x},${y}`);
  }
  return points.join(" ");
}

function getCountryById(id) {
  return state.countries.find((country) => country.id === id) || null;
}

function getTileById(id) {
  return state.tiles.find((tile) => tile.id === id) || null;
}

function getOwnedTileCount(countryId) {
  return state.tiles.filter((tile) => tile.countryId === countryId).length;
}

function buildMapBounds() {
  const positions = state.tiles.map((tile) => hexToPixel(tile.q, tile.r));
  const xs = positions.map((p) => p.x);
  const ys = positions.map((p) => p.y);
  const minX = Math.min(...xs) - HEX_SIZE - 80;
  const maxX = Math.max(...xs) + HEX_SIZE + 80;
  const minY = Math.min(...ys) - HEX_SIZE - 80;
  const maxY = Math.max(...ys) + HEX_SIZE + 80;

  return {
    width: maxX - minX,
    height: maxY - minY
  };
}

function setTool(tool) {
  state.tool = tool;
  refs.toolTerrainBtn.classList.toggle("active", tool === "terrain");
  refs.toolCountryBtn.classList.toggle("active", tool === "country");
  refs.terrainControls.classList.toggle("hidden", tool !== "terrain");
  refs.countryControls.classList.toggle("hidden", tool !== "country");
}

function paintTile(tileId) {
  const tile = getTileById(tileId);
  if (!tile) return;

  if (state.tool === "terrain") {
    tile.terrain = state.selectedTerrain;
  } else if (state.tool === "country") {
    tile.countryId =
      state.countryPaintMode === "erase"
        ? null
        : (state.selectedCountryId || tile.countryId);
  }

  render();
}

function addCountry() {
  const name = refs.countryNameInput.value.trim();
  const color = refs.countryColorInput.value;

  if (!name) return;

  const newCountry = {
    id: `country_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    name,
    color
  };

  state.countries.push(newCountry);
  state.selectedCountryId = newCountry.id;
  refs.countryNameInput.value = "";
  refs.countryColorInput.value = DEFAULT_COUNTRY_COLOR;
  setTool("country");
  render();
}

function removeCountry(countryId) {
  state.countries = state.countries.filter((country) => country.id !== countryId);
  state.tiles.forEach((tile) => {
    if (tile.countryId === countryId) tile.countryId = null;
  });
  if (state.selectedCountryId === countryId) {
    state.selectedCountryId = "";
  }
  render();
}

function clearOwnership() {
  state.tiles.forEach((tile) => {
    tile.countryId = null;
  });
  render();
}

function resetMap() {
  state.tiles = createInitialTiles();
  state.countries = [];
  state.tool = "terrain";
  state.selectedTerrain = "plain";
  state.selectedCountryId = "";
  state.countryPaintMode = "paint";
  state.showGrid = true;
  state.hoverTileId = null;
  state.camera = { x: 120, y: 80, scale: 1 };
  refs.countryNameInput.value = "";
  refs.countryColorInput.value = DEFAULT_COUNTRY_COLOR;
  refs.exportText.value = "";
  refs.exportWrap.classList.add("hidden");
  render();
}

function exportJson() {
  refs.exportText.value = JSON.stringify(
    {
      countries: state.countries,
      tiles: state.tiles
    },
    null,
    2
  );
  refs.exportWrap.classList.remove("hidden");
}

function fillAllTerrain(terrainKey) {
  state.tiles.forEach((tile) => {
    tile.terrain = terrainKey;
  });
  render();
}

function updateStats() {
  const counts = {
    plain: 0,
    forest: 0,
    mountain: 0,
    sea: 0
  };

  state.tiles.forEach((tile) => {
    counts[tile.terrain] += 1;
  });

  refs.plainCount.textContent = counts.plain;
  refs.forestCount.textContent = counts.forest;
  refs.mountainCount.textContent = counts.mountain;
  refs.seaCount.textContent = counts.sea;
}

function renderTerrainButtons() {
  refs.terrainButtons.innerHTML = "";
  refs.fillButtons.innerHTML = "";

  TERRAIN_OPTIONS.forEach((terrain) => {
    const button = document.createElement("button");
    button.textContent = terrain.label;
    button.style.background = terrain.color;
    button.style.color = "#0f172a";
    button.style.fontWeight = "700";
    button.className = state.selectedTerrain === terrain.key ? "active" : "";
    button.addEventListener("click", () => {
      state.selectedTerrain = terrain.key;
      render();
    });
    refs.terrainButtons.appendChild(button);

    const fillButton = document.createElement("button");
    fillButton.textContent = `全体を${terrain.label}化`;
    fillButton.className = "fill-btn";
    fillButton.addEventListener("click", () => fillAllTerrain(terrain.key));
    refs.fillButtons.appendChild(fillButton);
  });
}

function renderCountrySelect() {
  refs.countrySelect.innerHTML = '<option value="">国を選択してください</option>';
  state.countries.forEach((country) => {
    const option = document.createElement("option");
    option.value = country.id;
    option.textContent = country.name;
    refs.countrySelect.appendChild(option);
  });
  refs.countrySelect.value = state.selectedCountryId;
}

function renderSelectedCountryInfo() {
  const country = getCountryById(state.selectedCountryId);
  if (!country) {
    refs.selectedCountryInfo.classList.add("hidden");
    refs.selectedCountryInfo.innerHTML = "";
    return;
  }

  refs.selectedCountryInfo.classList.remove("hidden");
  refs.selectedCountryInfo.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
      <div style="width:16px;height:16px;border-radius:999px;border:1px solid rgba(255,255,255,.6);background:${country.color};"></div>
      <strong>${escapeHtml(country.name)}</strong>
    </div>
    <div>所有タイル数: ${getOwnedTileCount(country.id)}</div>
  `;
}

function renderCountryList() {
  refs.countryList.innerHTML = "";

  if (state.countries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "mini-card";
    empty.textContent = "まだ国がありません。";
    refs.countryList.appendChild(empty);
    return;
  }

  state.countries.forEach((country) => {
    const wrap = document.createElement("div");
    wrap.className = "country-item";

    const top = document.createElement("div");
    top.className = "country-item-top";

    const pick = document.createElement("button");
    pick.className = `country-color-pick ${state.selectedCountryId === country.id ? "selected" : ""}`;
    pick.style.background = country.color;
    pick.title = "この国を選択";
    pick.addEventListener("click", () => {
      state.selectedCountryId = country.id;
      setTool("country");
      render();
    });

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = country.name;
    nameInput.addEventListener("input", (e) => {
      country.name = e.target.value;
      renderCountrySelect();
      renderSelectedCountryInfo();
      renderCountryList();
      renderHoverTileInfo();
    });

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "削除";
    delBtn.addEventListener("click", () => removeCountry(country.id));

    top.appendChild(pick);
    top.appendChild(nameInput);
    top.appendChild(delBtn);

    const actions = document.createElement("div");
    actions.className = "country-item-actions";

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = country.color;
    colorInput.addEventListener("input", (e) => {
      country.color = e.target.value;
      render();
    });

    const owned = document.createElement("span");
    owned.style.color = "#94a3b8";
    owned.style.fontSize = "14px";
    owned.textContent = `所有タイル: ${getOwnedTileCount(country.id)}`;

    actions.appendChild(colorInput);
    actions.appendChild(owned);

    wrap.appendChild(top);
    wrap.appendChild(actions);

    refs.countryList.appendChild(wrap);
  });
}

function renderHoverTileInfo() {
  const tile = getTileById(state.hoverTileId);

  if (!tile) {
    refs.hoverTileInfo.classList.add("hidden");
    refs.hoverTileInfo.innerHTML = "";
    return;
  }

  const country = tile.countryId ? getCountryById(tile.countryId) : null;
  refs.hoverTileInfo.classList.remove("hidden");
  refs.hoverTileInfo.innerHTML = `
    <div><strong>ホバー中タイル</strong></div>
    <div>座標: q=${tile.q}, r=${tile.r}</div>
    <div>地形: ${TERRAIN_LABEL_MAP[tile.terrain]}</div>
    <div>所属: ${country ? escapeHtml(country.name) : "未設定"}</div>
  `;
}

function renderMap() {
  const bounds = buildMapBounds();
  const width = Math.max(1600, bounds.width + 300);
  const height = Math.max(1100, bounds.height + 300);

  refs.mapSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  refs.mapSvg.innerHTML = "";

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
  filter.setAttribute("id", "shadow");
  filter.setAttribute("x", "-50%");
  filter.setAttribute("y", "-50%");
  filter.setAttribute("width", "200%");
  filter.setAttribute("height", "200%");
  const feDropShadow = document.createElementNS("http://www.w3.org/2000/svg", "feDropShadow");
  feDropShadow.setAttribute("dx", "0");
  feDropShadow.setAttribute("dy", "5");
  feDropShadow.setAttribute("stdDeviation", "8");
  feDropShadow.setAttribute("flood-color", "#000000");
  feDropShadow.setAttribute("flood-opacity", "0.35");
  filter.appendChild(feDropShadow);
  defs.appendChild(filter);
  refs.mapSvg.appendChild(defs);

  const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  background.setAttribute("x", "0");
  background.setAttribute("y", "0");
  background.setAttribute("width", width);
  background.setAttribute("height", height);
  background.setAttribute("fill", "transparent");
  refs.mapSvg.appendChild(background);

  const mapGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  mapGroup.setAttribute(
    "transform",
    `translate(${state.camera.x} ${state.camera.y}) scale(${state.camera.scale})`
  );

  state.tiles.forEach((tile) => {
    const pos = hexToPixel(tile.q, tile.r);
    const country = tile.countryId ? getCountryById(tile.countryId) : null;

    const base = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    base.setAttribute("points", polygonPoints(pos.x, pos.y, HEX_SIZE));
    base.setAttribute("fill", TERRAIN_COLOR_MAP[tile.terrain]);
    base.setAttribute("stroke", state.showGrid ? "rgba(15,23,42,0.9)" : "transparent");
    base.setAttribute("stroke-width", "2");
    base.setAttribute("filter", "url(#shadow)");

    base.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      state.draggingTilePaint = true;
      paintTile(tile.id);
    });

    base.addEventListener("mouseenter", () => {
      state.hoverTileId = tile.id;
      if (state.draggingTilePaint) {
        paintTile(tile.id);
      } else {
        renderHoverTileInfo();
      }
    });

    mapGroup.appendChild(base);

    if (country) {
      const overlay = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      overlay.setAttribute("points", polygonPoints(pos.x, pos.y, HEX_SIZE * 0.72));
      overlay.setAttribute("fill", country.color);
      overlay.setAttribute("fill-opacity", "0.55");
      overlay.setAttribute("pointer-events", "none");
      mapGroup.appendChild(overlay);

      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", pos.x);
      dot.setAttribute("cy", pos.y);
      dot.setAttribute("r", HEX_SIZE * 0.12);
      dot.setAttribute("fill", country.color);
      dot.setAttribute("stroke", "white");
      dot.setAttribute("stroke-width", "1.5");
      dot.setAttribute("pointer-events", "none");
      mapGroup.appendChild(dot);
    }
  });

  refs.mapSvg.appendChild(mapGroup);
}

function render() {
  setTool(state.tool);

  refs.countryPaintBtn.classList.toggle("active", state.countryPaintMode === "paint");
  refs.countryEraseBtn.classList.toggle("active", state.countryPaintMode === "erase");
  refs.toggleGridBtn.textContent = state.showGrid ? "枠線を隠す" : "枠線を表示";

  renderTerrainButtons();
  renderCountrySelect();
  renderSelectedCountryInfo();
  renderCountryList();
  renderHoverTileInfo();
  renderMap();
  updateStats();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

refs.toolTerrainBtn.addEventListener("click", () => {
  setTool("terrain");
  render();
});

refs.toolCountryBtn.addEventListener("click", () => {
  setTool("country");
  render();
});

refs.countryPaintBtn.addEventListener("click", () => {
  state.countryPaintMode = "paint";
  render();
});

refs.countryEraseBtn.addEventListener("click", () => {
  state.countryPaintMode = "erase";
  render();
});

refs.countrySelect.addEventListener("change", (e) => {
  state.selectedCountryId = e.target.value;
  render();
});

refs.clearOwnershipBtn.addEventListener("click", clearOwnership);
refs.addCountryBtn.addEventListener("click", addCountry);

refs.toggleGridBtn.addEventListener("click", () => {
  state.showGrid = !state.showGrid;
  render();
});

refs.resetCameraBtn.addEventListener("click", () => {
  state.camera = { x: 120, y: 80, scale: 1 };
  render();
});

refs.exportBtn.addEventListener("click", exportJson);
refs.resetMapBtn.addEventListener("click", resetMap);

refs.mapSvg.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  if (e.target.tagName.toLowerCase() === "polygon") return;

  state.isPanning = true;
  panStart.mouseX = e.clientX;
  panStart.mouseY = e.clientY;
  panStart.camX = state.camera.x;
  panStart.camY = state.camera.y;
});

refs.mapSvg.addEventListener("mousemove", (e) => {
  if (!state.isPanning) return;
  const dx = e.clientX - panStart.mouseX;
  const dy = e.clientY - panStart.mouseY;
  state.camera.x = panStart.camX + dx;
  state.camera.y = panStart.camY + dy;
  renderMap();
});

refs.mapSvg.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    state.camera.scale = Math.max(
      0.45,
      Math.min(2.2, +(state.camera.scale + delta).toFixed(2))
    );
    renderMap();
  },
  { passive: false }
);

refs.mapSvg.addEventListener("mouseleave", () => {
  state.hoverTileId = null;
  renderHoverTileInfo();
});

window.addEventListener("mouseup", () => {
  state.draggingTilePaint = false;
  state.isPanning = false;
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    state.draggingTilePaint = false;
    state.isPanning = false;
  }
});

render();
