"use client";

import { useMemo, useState } from "react";

type Terrain = "sea" | "plain" | "forest" | "hill" | "mountain";
type Faction = "red" | "blue" | "green" | "yellow";
type Building = "farm" | "lumber" | "quarry" | "market" | "barracks";
type Tile = {
  id: number;
  x: number;
  y: number;
  terrain: Terrain;
  owner?: Faction;
  settlement?: 1 | 2 | 3;
  buildings: Building[];
  troops: number;
};

type Resources = { food: number; wood: number; stone: number; gold: number };

const W = 16;
const H = 10;
const factionNames: Record<Faction, string> = {
  red: "赤の盟約",
  blue: "蒼海連邦",
  green: "翠嶺同盟",
  yellow: "黄金公国",
};
const terrainNames: Record<Terrain, string> = {
  sea: "海域",
  plain: "平原",
  forest: "森林",
  hill: "丘陵",
  mountain: "山地",
};
const terrainIcons: Record<Terrain, string> = {
  sea: "≈",
  plain: "·",
  forest: "♠",
  hill: "∿",
  mountain: "▲",
};
const buildingData: Record<Building, { name: string; cost: Partial<Resources>; desc: string }> = {
  farm: { name: "農場", cost: { wood: 18, gold: 8 }, desc: "毎ターン 食料 +5" },
  lumber: { name: "製材所", cost: { stone: 8, gold: 10 }, desc: "毎ターン 木材 +4" },
  quarry: { name: "採石場", cost: { wood: 12, gold: 10 }, desc: "毎ターン 石材 +4" },
  market: { name: "市場", cost: { wood: 14, stone: 10 }, desc: "毎ターン 金貨 +6" },
  barracks: { name: "兵舎", cost: { wood: 22, stone: 18, gold: 16 }, desc: "徴兵と部隊編成を解禁" },
};

function noise(x: number, y: number) {
  const n = Math.sin(x * 91.7 + y * 47.3) * 43758.5453;
  return n - Math.floor(n);
}

function makeMap(): Tile[] {
  return Array.from({ length: W * H }, (_, id) => {
    const x = id % W;
    const y = Math.floor(id / W);
    const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
    const n = noise(x, y);
    let terrain: Terrain;
    if (edge === 0 || n < 0.14) terrain = "sea";
    else if (n > 0.87) terrain = "mountain";
    else if (n > 0.68) terrain = "hill";
    else if (n > 0.43) terrain = "forest";
    else terrain = "plain";
    return { id, x, y, terrain, buildings: [], troops: 0 };
  });
}

const fmtCost = (cost: Partial<Resources>) =>
  Object.entries(cost)
    .map(([key, val]) => `${({ food: "食", wood: "木", stone: "石", gold: "金" } as Record<string, string>)[key]}${val}`)
    .join(" ");

export default function Home() {
  const [tiles, setTiles] = useState<Tile[]>(makeMap);
  const [faction, setFaction] = useState<Faction>("red");
  const [started, setStarted] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [turn, setTurn] = useState(1);
  const [resources, setResources] = useState<Resources>({ food: 65, wood: 65, stone: 45, gold: 55 });
  const [log, setLog] = useState<string[]>(["開拓地を選び、最初の村を築いてください。"]);

  const owned = tiles.filter((t) => t.owner === faction);
  const selectedTile = selected === null ? null : tiles[selected];
  const capital = tiles.find((t) => t.owner === faction && t.settlement);

  const income = useMemo(() => {
    const next: Resources = { food: 0, wood: 0, stone: 0, gold: 0 };
    owned.forEach((t) => {
      if (t.terrain === "plain") next.food += 2;
      if (t.terrain === "forest") next.wood += 2;
      if (t.terrain === "hill") next.stone += 2;
      if (t.terrain === "mountain") next.stone += 3;
      t.buildings.forEach((b) => {
        if (b === "farm") next.food += 5;
        if (b === "lumber") next.wood += 4;
        if (b === "quarry") next.stone += 4;
        if (b === "market") next.gold += 6;
      });
      if (t.settlement) next.gold += t.settlement * 2;
    });
    return next;
  }, [owned]);

  function pushLog(message: string) {
    setLog((old) => [message, ...old].slice(0, 7));
  }

  function spend(cost: Partial<Resources>) {
    const ok = Object.entries(cost).every(([k, v]) => resources[k as keyof Resources] >= (v ?? 0));
    if (!ok) return false;
    setResources((r) => {
      const n = { ...r };
      Object.entries(cost).forEach(([k, v]) => (n[k as keyof Resources] -= v ?? 0));
      return n;
    });
    return true;
  }

  function chooseTile(id: number) {
    const tile = tiles[id];
    if (!started) {
      if (tile.terrain === "sea" || tile.terrain === "mountain") {
        pushLog("村は平原・森林・丘陵にのみ建設できます。");
        return;
      }
      setTiles((all) => all.map((t) => (t.id === id ? { ...t, owner: faction, settlement: 1, troops: 4 } : t)));
      setSelected(id);
      setStarted(true);
      pushLog(`${factionNames[faction]}が建国への一歩を踏み出しました。`);
      return;
    }
    setSelected(id);
  }

  function adjacentToOwned(tile: Tile) {
    return owned.some((o) => Math.abs(o.x - tile.x) + Math.abs(o.y - tile.y) === 1);
  }

  function occupy() {
    if (!selectedTile || selectedTile.owner || selectedTile.terrain === "sea" || !adjacentToOwned(selectedTile)) return;
    const cost = selectedTile.terrain === "mountain" ? { food: 8, gold: 10 } : { food: 5, gold: 6 };
    if (!spend(cost)) return pushLog("領土を広げるための資源が足りません。");
    setTiles((all) => all.map((t) => (t.id === selectedTile.id ? { ...t, owner: faction } : t)));
    pushLog(`${terrainNames[selectedTile.terrain]}を新たに領土へ加えました。`);
  }

  function build(kind: Building) {
    if (!selectedTile || selectedTile.owner !== faction || !selectedTile.settlement || selectedTile.buildings.includes(kind)) return;
    const data = buildingData[kind];
    if (!spend(data.cost)) return pushLog(`${data.name}の建築資源が足りません。`);
    setTiles((all) => all.map((t) => (t.id === selectedTile.id ? { ...t, buildings: [...t.buildings, kind] } : t)));
    pushLog(`${data.name}の建築が完了しました。`);
  }

  function upgrade() {
    if (!selectedTile?.settlement || selectedTile.owner !== faction || selectedTile.settlement >= 3) return;
    const costs = selectedTile.settlement === 1
      ? { food: 45, wood: 38, stone: 28, gold: 35 }
      : { food: 80, wood: 70, stone: 75, gold: 65 };
    if (!spend(costs)) return pushLog("拠点を発展させるための資源が足りません。");
    setTiles((all) => all.map((t) => (t.id === selectedTile.id ? { ...t, settlement: (t.settlement! + 1) as 2 | 3 } : t)));
    pushLog(selectedTile.settlement === 1 ? "村は街へと発展しました。" : "城が完成し、ひとつの国が興りました！");
  }

  function recruit() {
    if (!selectedTile?.buildings.includes("barracks")) return;
    if (!spend({ food: 12, gold: 8 })) return pushLog("徴兵に必要な食料または金貨が足りません。");
    setTiles((all) => all.map((t) => (t.id === selectedTile.id ? { ...t, troops: t.troops + 5 } : t)));
    pushLog("新兵5名を部隊へ編成しました。");
  }

  function nextTurn() {
    setResources((r) => ({
      food: r.food + income.food,
      wood: r.wood + income.wood,
      stone: r.stone + income.stone,
      gold: r.gold + income.gold,
    }));
    setTurn((t) => t + 1);
    pushLog(`第${turn}節が終了。領内から資源を徴収しました。`);
  }

  function reset() {
    setTiles(makeMap());
    setStarted(false);
    setSelected(null);
    setTurn(1);
    setResources({ food: 65, wood: 65, stone: 45, gold: 55 });
    setLog(["開拓地を選び、最初の村を築いてください。"]);
  }

  const canOccupy = !!selectedTile && !selectedTile.owner && selectedTile.terrain !== "sea" && adjacentToOwned(selectedTile);
  const settlementLabel = selectedTile?.settlement ? ["", "村", "街", "城"][selectedTile.settlement] : null;

  return (
    <main className="game-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">FR</span>
          <div><strong>FRONTIER REALMS</strong><small>辺境諸国戦記</small></div>
        </div>
        <div className="season">第 {turn} 節 <span>黎明紀 132年</span></div>
        <div className="resources">
          <span>● 食料 <b>{resources.food}</b><i>+{income.food}</i></span>
          <span>◆ 木材 <b>{resources.wood}</b><i>+{income.wood}</i></span>
          <span>▲ 石材 <b>{resources.stone}</b><i>+{income.stone}</i></span>
          <span>✦ 金貨 <b>{resources.gold}</b><i>+{income.gold}</i></span>
        </div>
        <button className="end-turn" disabled={!started} onClick={nextTurn}>節を終える →</button>
      </header>

      <section className="workspace">
        <aside className="left-panel">
          <div className="panel-title">勢力概況</div>
          <div className={`faction-card ${faction}`}>
            <span className="crest">♜</span>
            <div><small>あなたの陣営</small><strong>{factionNames[faction]}</strong></div>
          </div>
          <dl className="stats">
            <div><dt>領土</dt><dd>{owned.length}</dd></div>
            <div><dt>人口</dt><dd>{owned.length * 120 + (capital?.settlement ?? 0) * 350}</dd></div>
            <div><dt>常備兵</dt><dd>{owned.reduce((n, t) => n + t.troops, 0)}</dd></div>
            <div><dt>国力</dt><dd>{Math.floor(owned.length * 3.4 + (capital?.settlement ?? 0) * 12)}</dd></div>
          </dl>
          <div className="panel-title minor">年代記</div>
          <div className="log">
            {log.map((item, i) => <p key={`${item}-${i}`}><em>{i === 0 ? "今" : `${i}前`}</em>{item}</p>)}
          </div>
          <button className="text-button" onClick={reset}>新しい世界を生成</button>
        </aside>

        <div className="map-wrap">
          {!started && (
            <div className="founding-banner">
              <span>建国の第一歩</span>
              <strong>陣営を選び、最初の村を置く土地を選択</strong>
              <div className="faction-picks">
                {(Object.keys(factionNames) as Faction[]).map((f) => (
                  <button key={f} className={`${f} ${faction === f ? "active" : ""}`} onClick={() => setFaction(f)}>
                    <i />{factionNames[f]}
                  </button>
                ))}
              </div>
              <small>平原・森林・丘陵に建設できます</small>
            </div>
          )}
          <div className="map-grid" style={{ gridTemplateColumns: `repeat(${W}, minmax(38px, 1fr))` }}>
            {tiles.map((tile) => (
              <button
                key={tile.id}
                aria-label={`${terrainNames[tile.terrain]} ${tile.x + 1},${tile.y + 1}`}
                onClick={() => chooseTile(tile.id)}
                className={`tile ${tile.terrain} ${tile.owner ? `owned ${tile.owner}` : ""} ${selected === tile.id ? "selected" : ""}`}
              >
                <span className="terrain-icon">{terrainIcons[tile.terrain]}</span>
                {tile.owner && <span className="flag" />}
                {tile.settlement && <span className={`settlement lv${tile.settlement}`}>{tile.settlement === 1 ? "⌂" : tile.settlement === 2 ? "♜" : "♛"}</span>}
                {tile.troops > 0 && <span className="troops">{tile.troops}</span>}
              </button>
            ))}
          </div>
          <div className="map-legend">
            {(Object.keys(terrainNames) as Terrain[]).map((t) => <span key={t}><i className={t} />{terrainNames[t]}</span>)}
          </div>
        </div>

        <aside className="right-panel">
          <div className="panel-title">選択中の土地</div>
          {!selectedTile ? (
            <div className="empty-selection"><span>⌖</span><p>地図上の土地を選択すると<br />詳細を確認できます</p></div>
          ) : (
            <>
              <div className={`terrain-hero ${selectedTile.terrain}`}>
                <span>{terrainIcons[selectedTile.terrain]}</span>
                <div><small>座標 {selectedTile.x + 1} — {selectedTile.y + 1}</small><strong>{settlementLabel ?? terrainNames[selectedTile.terrain]}</strong></div>
              </div>
              <div className="tile-info">
                <span>地形 <b>{terrainNames[selectedTile.terrain]}</b></span>
                <span>支配 <b>{selectedTile.owner ? factionNames[selectedTile.owner] : "未領有"}</b></span>
                <span>部隊 <b>{selectedTile.troops || "—"}</b></span>
              </div>

              {canOccupy && <button className="primary-action" onClick={occupy}>この土地を占領 <small>食5 金6</small></button>}
              {selectedTile.owner === faction && selectedTile.settlement && (
                <>
                  <button className="primary-action" disabled={selectedTile.settlement >= 3} onClick={upgrade}>
                    {selectedTile.settlement === 1 ? "街へ発展" : selectedTile.settlement === 2 ? "城を築く" : "王都完成"} 
                  </button>
                  <div className="panel-title minor">建設計画</div>
                  <div className="building-list">
                    {(Object.keys(buildingData) as Building[]).map((b) => {
                      const data = buildingData[b];
                      const built = selectedTile.buildings.includes(b);
                      return (
                        <button key={b} disabled={built} onClick={() => build(b)}>
                          <span>{b === "farm" ? "♨" : b === "lumber" ? "♣" : b === "quarry" ? "⬟" : b === "market" ? "⚖" : "⚔"}</span>
                          <div><strong>{data.name}{built && "　建設済"}</strong><small>{data.desc}</small><em>{fmtCost(data.cost)}</em></div>
                        </button>
                      );
                    })}
                  </div>
                  {selectedTile.buildings.includes("barracks") && (
                    <button className="recruit" onClick={recruit}>⚔ 新兵を5名徴募 <small>食12 金8</small></button>
                  )}
                </>
              )}
              {!canOccupy && !selectedTile.owner && started && (
                <div className="hint">領土と隣接する陸地のみ占領できます。</div>
              )}
            </>
          )}
        </aside>
      </section>
    </main>
  );
}
