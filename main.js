const HEX_SIZE = 38;
const SQRT3 = Math.sqrt(3);
const GRID_COLS = 28;
const GRID_ROWS = 18;
const DEFAULT_COUNTRY_COLOR = "#e06666";
const PAN_SENSITIVITY = 1.65;

const TERRAIN_OPTIONS = [
  { key: "plain", label: "平原", color: "#b8cf8d" },
  { key: "forest", label: "森", color: "#6f9d63" },
  { key: "mountain", label: "山", color: "#9a9287" },
  { key: "sea", label: "海", color: "#6ea3d8" },
  { key: "desert", label: "砂漠", color: "#d9bf83" },
  { key: "snow", label: "雪原", color: "#dfeaf2" }
];

const TERRAIN_LABEL_MAP = Object.fromEntries(
  TERRAIN_OPTIONS.map((item) => [item.key, item.label])
);

const PRESET_COUNTRIES = [
  { name: "ドーラシア", color: "#b02727" },
  { name: "エリミネンス", color: "#e0d067" },
  { name: "ゼロ", color: "#46ddd3" },
  { name: "ライ", color: "#5f866b" },
  { name: "レイシア", color: "#2e24c2" },
  { name: "ネクレール", color: "#92ec32" },
  { name: "キトラ", color: "#7efbf3" },
  { name: "サングイト", color: "#b19710" },
  { name: "クラーレ", color: "#943ebb" }
];

const state = {
  tiles: createInitialTiles(),
  countries: createPresetCountries(),
  cities: [],
  tool: "terrain",
  selectedTerrain: "plain",
  selectedCountryId: "",
  countryPaintMode: "paint",
  cityMode: "paint",
  draggingTilePaint: false,
  isPanning: false,
  showGrid: true,
  hoverTileId: null,
  selectedCityTileId: null,
  camera: { x: 120, y: 80, scale: 1 }
};

if (state.countries.length > 0) {
  state.selectedCountryId = state.countries[0].id;
}

const refs = {
  mapSvg: document.getElementById("mapSvg"),
  terrainButtons: document.getElementById("terrainButtons"),
  fillButtons: document.getElementById("fillButtons"),

  toolTerrainBtn: document.getElementById("toolTerrainBtn"),
  toolCountryBtn: document.getElementById("toolCountryBtn"),
  toolCityBtn: document.getElementById("toolCityBtn"),

  terrainControls: document.getElementById("terrainControls"),
  countryControls: document.getElementById("countryControls"),
  cityControls: document.getElementById("cityControls"),

  countryPaintBtn: document.getElementById("countryPaintBtn"),
  countryEraseBtn: document.getElementById("countryEraseBtn"),
  countrySelect: document.getElementById("countrySelect"),
  selectedCountryInfo: document.getElementById("selectedCountryInfo"),
  clearOwnershipBtn: document.getElementById("clearOwnershipBtn"),

  cityPaintBtn: document.getElementById("cityPaintBtn"),
  cityEraseBtn: document.getElementById("cityEraseBtn"),
  cityNameInput: document.getElementById("cityNameInput"),
  cityHpInput: document.getElementById("cityHpInput"),
  cityLevelInput: document.getElementById("cityLevelInput"),
  selectedCityInfo: document.getElementById("selectedCityInfo"),
  cityList: document.getElementById("cityList"),

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
  desertCount: document.getElementById("desertCount"),
  snowCount: document.getElementById("snowCount"),

  hoverTileInfo: document.getElementById("hoverTileInfo"),
  exportWrap: document.getElementById("exportWrap"),
  exportText: document.getElementById("exportText")
};

const panStart = { mouseX: 0, mouseY: 0, camX: 0, camY: 0 };

function createPresetCountries() {
  return PRESET_COUNTRIES.map((country, index) => ({
    id: `country_preset_${index + 1}`,
    name: country.name,
    color: country.color
  }));
}

function createInitialTiles(cols = GRID_COLS, rows = GRID_ROWS) {
  const tiles = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
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
  const points = [];
  for (let i = 0; i < 6; i += 1) {
    const angleDeg = 60 * i - 30;
    const angleRad = (Math.PI / 180) * angleDeg;
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

function getCityByTileId(tileId) {
  return state.cities.find((city) => city.tileId === tileId) || null;
}

function getOwnedTileCount(countryId) {
  return state.tiles.filter((tile) => tile.countryId === countryId).length;
}

function buildMapBounds() {
  const positions = state.tiles.map((tile) => hexToPixel(tile.col, tile.row));
  const xs = positions.map((p) => p.x);
  const ys = positions.map((p) => p.y);

  const minX = Math.min(...xs) - HEX_SIZE - 100;
  const maxX = Math.max(...xs) + HEX_SIZE + 100;
  const minY = Math.min(...ys) - HEX_SIZE - 140;
  const maxY = Math.max(...ys) + HEX_SIZE + 120;

  return {
    width: maxX - minX,
    height: maxY - minY
  };
}

function setTool(tool) {
  state.tool = tool;
  refs.toolTerrainBtn.classList.toggle("active", tool === "terrain");
  refs.toolCountryBtn.classList.toggle("active", tool === "country");
  refs.toolCityBtn.classList.toggle("active", tool === "city");

  refs.terrainControls.classList.toggle("hidden", tool !== "terrain");
  refs.countryControls.classList.toggle("hidden", tool !== "country");
  refs.cityControls.classList.toggle("hidden", tool !== "city");
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
  } else if (state.tool === "city") {
    if (state.cityMode === "erase") {
      state.cities = state.cities.filter((city) => city.tileId !== tileId);
      if (state.selectedCityTileId === tileId) {
        state.selectedCityTileId = null;
      }
    } else {
      const name = refs.cityNameInput.value.trim();
      const hp = Number(refs.cityHpInput.value || 0);
      const level = Number(refs.cityLevelInput.value || 0);

      if (!name || hp <= 0 || level <= 0) {
        render();
        return;
      }

      const existing = getCityByTileId(tileId);
      if (existing) {
        existing.name = name;
        existing.hp = hp;
        existing.level = level;
      } else {
        state.cities.push({
          tileId,
          name,
          hp,
          level
        });
      }
      state.selectedCityTileId = tileId;
    }
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
    state.selectedCountryId = state.countries[0]?.id || "";
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
  state.countries = createPresetCountries();
  state.cities = [];
  state.tool = "terrain";
  state.selectedTerrain = "plain";
  state.selectedCountryId = state.countries[0]?.id || "";
  state.countryPaintMode = "paint";
  state.cityMode = "paint";
  state.showGrid = true;
  state.hoverTileId = null;
  state.selectedCityTileId = null;
  state.camera = { x: 120, y: 80, scale: 1 };

  refs.cityNameInput.value = "";
  refs.cityHpInput.value = "100";
  refs.cityLevelInput.value = "1";
  refs.exportText.value = "";
  refs.exportWrap.classList.add("hidden");

  render();
}

function exportJson() {
  refs.exportText.value = JSON.stringify(
    {
      countries: state.countries,
      tiles: state.tiles,
      cities: state.cities
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
    sea: 0,
    desert: 0,
    snow: 0
  };

  state.tiles.forEach((tile) => {
    counts[tile.terrain] += 1;
  });

  refs.plainCount.textContent = counts.plain;
  refs.forestCount.textContent = counts.forest;
  refs.mountainCount.textContent = counts.mountain;
  refs.seaCount.textContent = counts.sea;
  refs.desertCount.textContent = counts.desert;
  refs.snowCount.textContent = counts.snow;
}

function renderTerrainButtons() {
  refs.terrainButtons.innerHTML = "";
  refs.fillButtons.innerHTML = "";

  TERRAIN_OPTIONS.forEach((terrain) => {
    const button = document.createElement("button");
    button.textContent = terrain.label;
    button.style.background = terrain.color;
    button.style.color = terrain.key === "snow" ? "#0f172a" : "#0f172a";
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
      renderCityList();
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

function renderCityList() {
  refs.cityList.innerHTML = "";

  if (state.cities.length === 0) {
    const empty = document.createElement("div");
    empty.className = "mini-card";
    empty.textContent = "まだ都市がありません。";
    refs.cityList.appendChild(empty);
    return;
  }

  state.cities.forEach((city) => {
    const tile = getTileById(city.tileId);
    const wrap = document.createElement("div");
    wrap.className = "country-item";

    const title = document.createElement("div");
    title.style.fontWeight = "700";
    title.style.marginBottom = "8px";
    title.textContent = city.name;

    const sub = document.createElement("div");
    sub.style.color = "#94a3b8";
    sub.style.fontSize = "14px";
    sub.style.lineHeight = "1.7";
    sub.innerHTML = `
      座標: ${tile ? `${tile.col}, ${tile.row}` : "-"}<br>
      体力: ${city.hp}<br>
      レベル: ${city.level}
    `;

    const btnRow = document.createElement("div");
    btnRow.className = "country-item-actions";
    btnRow.style.marginTop = "10px";

    const jumpBtn = document.createElement("button");
    jumpBtn.className = "secondary-btn";
    jumpBtn.textContent = "選択";
    jumpBtn.addEventListener("click", () => {
      state.selectedCityTileId = city.tileId;
      refs.cityNameInput.value = city.name;
      refs.cityHpInput.value = city.hp;
      refs.cityLevelInput.value = city.level;
      setTool("city");
      render();
    });

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "削除";
    delBtn.addEventListener("click", () => {
      state.cities = state.cities.filter((c) => c.tileId !== city.tileId);
      if (state.selectedCityTileId === city.tileId) {
        state.selectedCityTileId = null;
      }
      render();
    });

    btnRow.appendChild(jumpBtn);
    btnRow.appendChild(delBtn);

    wrap.appendChild(title);
    wrap.appendChild(sub);
    wrap.appendChild(btnRow);

    refs.cityList.appendChild(wrap);
  });
}

function renderSelectedCityInfo() {
  const city = getCityByTileId(state.selectedCityTileId);
  if (!city) {
    refs.selectedCityInfo.classList.add("hidden");
    refs.selectedCityInfo.innerHTML = "";
    return;
  }

  const tile = getTileById(city.tileId);
  refs.selectedCityInfo.classList.remove("hidden");
  refs.selectedCityInfo.innerHTML = `
    <div><strong>選択中の都市</strong></div>
    <div>名前: ${escapeHtml(city.name)}</div>
    <div>座標: ${tile ? `${tile.col}, ${tile.row}` : "-"}</div>
    <div>体力: ${city.hp}</div>
    <div>レベル: ${city.level}</div>
  `;
}

function renderHoverTileInfo() {
  const tile = getTileById(state.hoverTileId);

  if (!tile) {
    refs.hoverTileInfo.classList.add("hidden");
    refs.hoverTileInfo.innerHTML = "";
    return;
  }

  const country = tile.countryId ? getCountryById(tile.countryId) : null;
  const city = getCityByTileId(tile.id);

  refs.hoverTileInfo.classList.remove("hidden");
  refs.hoverTileInfo.innerHTML = `
    <div><strong>ホバー中タイル</strong></div>
    <div>座標: x=${tile.col}, y=${tile.row}</div>
    <div>地形: ${TERRAIN_LABEL_MAP[tile.terrain]}</div>
    <div>所属: ${country ? escapeHtml(country.name) : "未設定"}</div>
    <div>都市: ${city ? `${escapeHtml(city.name)} (Lv.${city.level} / HP ${city.hp})` : "なし"}</div>
  `;
}

function getTerrainBaseColor(terrain) {
  return TERRAIN_OPTIONS.find((item) => item.key === terrain)?.color || "#b8cf8d";
}

function getTileFillColor(tile) {
  if (!tile.countryId) {
    return getTerrainBaseColor(tile.terrain);
  }
  const country = getCountryById(tile.countryId);
  return country ? country.color : getTerrainBaseColor(tile.terrain);
}

function mixColors(hexA, hexB, ratio) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex(
    a.r * (1 - ratio) + b.r * ratio,
    a.g * (1 - ratio) + b.g * ratio,
    a.b * (1 - ratio) + b.b * ratio
  );
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;

  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

function getTerrainDetailColors(tile) {
  const fill = getTileFillColor(tile);
  const unowned = !tile.countryId;

  switch (tile.terrain) {
    case "plain":
      return {
        main: fill,
        detail1: unowned ? mixColors(fill, "#ffffff", 0.2) : mixColors(fill, "#ffffff", 0.12),
        detail2: unowned ? mixColors(fill, "#7a8f57", 0.35) : mixColors(fill, "#000000", 0.18)
      };
    case "forest":
      return {
        main: fill,
        detail1: mixColors(fill, "#1a4d22", 0.72),
        detail2: mixColors(fill, "#5d432d", 0.55)
      };
    case "mountain":
      return {
        main: fill,
        detail1: mixColors(fill, "#4d4a45", 0.6),
        detail2: mixColors(fill, "#f0f4f8", 0.45)
      };
    case "sea":
      return {
        main: fill,
        detail1: mixColors(fill, "#e6f4ff", 0.65),
        detail2: mixColors(fill, "#3f78b5", 0.3)
      };
    case "desert":
      return {
        main: fill,
        detail1: mixColors(fill, "#f3e3b2", 0.35),
        detail2: mixColors(fill, "#af8c52", 0.4)
      };
    case "snow":
      return {
        main: fill,
        detail1: mixColors(fill, "#ffffff", 0.6),
        detail2: mixColors(fill, "#a9bfd3", 0.3)
      };
    default:
      return {
        main: fill,
        detail1: mixColors(fill, "#ffffff", 0.2),
        detail2: mixColors(fill, "#000000", 0.2)
      };
  }
}

function renderMap() {
  const bounds = buildMapBounds();
  const width = Math.max(1600, bounds.width + 320);
  const height = Math.max(1000, bounds.height + 280);

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
  feDropShadow.setAttribute("dy", "4");
  feDropShadow.setAttribute("stdDeviation", "6");
  feDropShadow.setAttribute("flood-color", "#000000");
  feDropShadow.setAttribute("flood-opacity", "0.28");
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
    const pos = hexToPixel(tile.col, tile.row);
    const hexPoints = polygonPoints(pos.x, pos.y, HEX_SIZE);
    const colors = getTerrainDetailColors(tile);

    const tileGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const base = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    base.setAttribute("points", hexPoints);
    base.setAttribute("fill", colors.main);
    base.setAttribute(
      "stroke",
      state.showGrid
        ? (tile.terrain === "sea" ? "rgba(40,60,90,0.55)" : "rgba(22,34,49,0.85)")
        : "transparent"
    );
    base.setAttribute("stroke-width", "1.7");
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

    tileGroup.appendChild(base);

    if (tile.terrain === "plain") {
      const dots = [
        [-10, -7, 2.2],
        [9, -10, 1.7],
        [-4, 8, 1.8],
        [11, 6, 2.1]
      ];

      dots.forEach(([dx, dy, r]) => {
        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", pos.x + dx);
        c.setAttribute("cy", pos.y + dy);
        c.setAttribute("r", r);
        c.setAttribute("fill", colors.detail1);
        c.setAttribute("fill-opacity", "0.45");
        c.setAttribute("pointer-events", "none");
        tileGroup.appendChild(c);
      });
    }

    if (tile.terrain === "forest") {
      const trees = [
        [-12, -6],
        [0, -10],
        [12, -4],
        [-6, 9],
        [9, 8]
      ];

      trees.forEach(([dx, dy]) => {
        const tri = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        tri.setAttribute(
          "points",
          `${pos.x + dx},${pos.y + dy - 6} ${pos.x + dx - 5},${pos.y + dy + 4} ${pos.x + dx + 5},${pos.y + dy + 4}`
        );
        tri.setAttribute("fill", colors.detail1);
        tri.setAttribute("fill-opacity", "0.95");
        tri.setAttribute("pointer-events", "none");
        tileGroup.appendChild(tri);

        const trunk = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        trunk.setAttribute("x", pos.x + dx - 0.8);
        trunk.setAttribute("y", pos.y + dy + 4);
        trunk.setAttribute("width", "1.6");
        trunk.setAttribute("height", "4");
        trunk.setAttribute("fill", colors.detail2);
        trunk.setAttribute("fill-opacity", "0.95");
        trunk.setAttribute("pointer-events", "none");
        tileGroup.appendChild(trunk);
      });
    }

    if (tile.terrain === "mountain") {
      const mountain1 = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      mountain1.setAttribute(
        "points",
        `${pos.x - 14},${pos.y + 9} ${pos.x - 3},${pos.y - 10} ${pos.x + 9},${pos.y + 9}`
      );
      mountain1.setAttribute("fill", colors.detail1);
      mountain1.setAttribute("fill-opacity", "0.95");
      mountain1.setAttribute("pointer-events", "none");
      tileGroup.appendChild(mountain1);

      const mountain2 = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      mountain2.setAttribute(
        "points",
        `${pos.x - 1},${pos.y + 11} ${pos.x + 11},${pos.y - 8} ${pos.x + 18},${pos.y + 11}`
      );
      mountain2.setAttribute("fill", mixColors(colors.detail1, "#000000", 0.18));
      mountain2.setAttribute("fill-opacity", "0.95");
      mountain2.setAttribute("pointer-events", "none");
      tileGroup.appendChild(mountain2);

      const snow = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      snow.setAttribute(
        "points",
        `${pos.x + 7},${pos.y - 1} ${pos.x + 11},${pos.y - 8} ${pos.x + 14},${pos.y - 1}`
      );
      snow.setAttribute("fill", colors.detail2);
      snow.setAttribute("fill-opacity", "0.85");
      snow.setAttribute("pointer-events", "none");
      tileGroup.appendChild(snow);
    }

    if (tile.terrain === "sea") {
      const waveYs = [-8, 2, 12];
      waveYs.forEach((dy) => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute(
          "d",
          `M ${pos.x - 15} ${pos.y + dy} q 5 -3 10 0 q 5 3 10 0 q 5 -3 10 0`
        );
        path.setAttribute("stroke", colors.detail1);
        path.setAttribute("stroke-opacity", "0.92");
        path.setAttribute("stroke-width", "1.8");
        path.setAttribute("fill", "none");
        path.setAttribute("pointer-events", "none");
        tileGroup.appendChild(path);
      });
    }

    if (tile.terrain === "desert") {
      const dune1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
      dune1.setAttribute(
        "d",
        `M ${pos.x - 13} ${pos.y + 4} q 8 -6 16 0 q 8 6 16 0`
      );
      dune1.setAttribute("stroke", colors.detail2);
      dune1.setAttribute("stroke-width", "2");
      dune1.setAttribute("stroke-opacity", "0.6");
      dune1.setAttribute("fill", "none");
      dune1.setAttribute("pointer-events", "none");
      tileGroup.appendChild(dune1);

      const dune2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
      dune2.setAttribute(
        "d",
        `M ${pos.x - 10} ${pos.y - 8} q 6 -4 12 0 q 6 4 12 0`
      );
      dune2.setAttribute("stroke", colors.detail1);
      dune2.setAttribute("stroke-width", "1.5");
      dune2.setAttribute("stroke-opacity", "0.55");
      dune2.setAttribute("fill", "none");
      dune2.setAttribute("pointer-events", "none");
      tileGroup.appendChild(dune2);
    }

    if (tile.terrain === "snow") {
      const flakes = [
        [-9, -6],
        [10, -8],
        [-2, 8],
        [12, 7]
      ];

      flakes.forEach(([dx, dy]) => {
        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", pos.x + dx);
        c.setAttribute("cy", pos.y + dy);
        c.setAttribute("r", "2");
        c.setAttribute("fill", colors.detail1);
        c.setAttribute("fill-opacity", "0.85");
        c.setAttribute("pointer-events", "none");
        tileGroup.appendChild(c);
      });
    }

    mapGroup.appendChild(tileGroup);
  });

  state.cities.forEach((city) => {
    const tile = getTileById(city.tileId);
    if (!tile) return;

    const pos = hexToPixel(tile.col, tile.row);
    const cityGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const badge = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    badge.setAttribute("cx", pos.x);
    badge.setAttribute("cy", pos.y - 4);
    badge.setAttribute("r", "11");
    badge.setAttribute("fill", "#2f3640");
    badge.setAttribute("stroke", "#f8fafc");
    badge.setAttribute("stroke-width", "1.5");
    cityGroup.appendChild(badge);

    const tower = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    tower.setAttribute("x", pos.x - 4);
    tower.setAttribute("y", pos.y - 10);
    tower.setAttribute("width", "8");
    tower.setAttribute("height", "10");
    tower.setAttribute("fill", "#f8fafc");
    cityGroup.appendChild(tower);

    const roof = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    roof.setAttribute(
      "points",
      `${pos.x - 6},${pos.y - 10} ${pos.x},${pos.y - 16} ${pos.x + 6},${pos.y - 10}`
    );
    roof.setAttribute("fill", "#f8fafc");
    cityGroup.appendChild(roof);

    const nameText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    nameText.setAttribute("x", pos.x);
    nameText.setAttribute("y", pos.y + 24);
    nameText.setAttribute("text-anchor", "middle");
    nameText.setAttribute("font-size", "12");
    nameText.setAttribute("font-weight", "700");
    nameText.setAttribute("fill", "#f8fafc");
    nameText.setAttribute("stroke", "rgba(0,0,0,0.45)");
    nameText.setAttribute("stroke-width", "2.5");
    nameText.setAttribute("paint-order", "stroke");
    nameText.textContent = city.name;
    cityGroup.appendChild(nameText);

    mapGroup.appendChild(cityGroup);
  });

  refs.mapSvg.appendChild(mapGroup);
}

function render() {
  setTool(state.tool);

  refs.countryPaintBtn.classList.toggle("active", state.countryPaintMode === "paint");
  refs.countryEraseBtn.classList.toggle("active", state.countryPaintMode === "erase");
  refs.cityPaintBtn.classList.toggle("active", state.cityMode === "paint");
  refs.cityEraseBtn.classList.toggle("active", state.cityMode === "erase");
  refs.toggleGridBtn.textContent = state.showGrid ? "枠線を隠す" : "枠線を表示";

  renderTerrainButtons();
  renderCountrySelect();
  renderSelectedCountryInfo();
  renderSelectedCityInfo();
  renderCountryList();
  renderCityList();
  renderHoverTileInfo();
  renderMap();
  updateStats();
}

function escapeHtml(value) {
  return String(value)
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

refs.toolCityBtn.addEventListener("click", () => {
  setTool("city");
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

refs.cityPaintBtn.addEventListener("click", () => {
  state.cityMode = "paint";
  render();
});

refs.cityEraseBtn.addEventListener("click", () => {
  state.cityMode = "erase";
  render();
});

refs.countrySelect.addEventListener("change", (e) => {
  state.selectedCountryId = e.target.value;
  render();
});

refs.clearOwnershipBtn.addEventListener("click", clearOwnership);
refs.addCountryBtn?.addEventListener("click", addCountry);

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
  const tag = e.target.tagName.toLowerCase();
  if (tag === "polygon" || tag === "path" || tag === "circle" || tag === "rect" || tag === "text") return;

  state.isPanning = true;
  panStart.mouseX = e.clientX;
  panStart.mouseY = e.clientY;
  panStart.camX = state.camera.x;
  panStart.camY = state.camera.y;
});

refs.mapSvg.addEventListener("mousemove", (e) => {
  if (!state.isPanning) return;
  const dx = (e.clientX - panStart.mouseX) * PAN_SENSITIVITY;
  const dy = (e.clientY - panStart.mouseY) * PAN_SENSITIVITY;
  state.camera.x = panStart.camX + dx;
  state.camera.y = panStart.camY + dy;
  renderMap();
});

refs.mapSvg.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    state.camera.scale = Math.max(
      0.45,
      Math.min(2.3, +(state.camera.scale + delta).toFixed(2))
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
