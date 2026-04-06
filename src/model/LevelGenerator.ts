import type { LevelData, IslandData } from '../types/level';

/* ------------------------------------------------------------------ */
/*  Seeded PRNG (mulberry32)                                          */
/* ------------------------------------------------------------------ */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

interface Pos { row: number; col: number }
interface PlacedIsland extends Pos { faction: number }
interface SolutionBridge { a: PlacedIsland; b: PlacedIsland; count: number }

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function posKey(r: number, c: number): string { return `${r},${c}`; }

/** Check if two islands are on the same row or column with no other island between. */
function canBridge(
  a: Pos, b: Pos,
  occupiedCells: Set<string>
): boolean {
  if (a.row === b.row) {
    const minC = Math.min(a.col, b.col);
    const maxC = Math.max(a.col, b.col);
    if (maxC - minC < 2) return true; // adjacent
    for (let c = minC + 1; c < maxC; c++) {
      if (occupiedCells.has(posKey(a.row, c))) return false;
    }
    return true;
  }
  if (a.col === b.col) {
    const minR = Math.min(a.row, b.row);
    const maxR = Math.max(a.row, b.row);
    if (maxR - minR < 2) return true;
    for (let r = minR + 1; r < maxR; r++) {
      if (occupiedCells.has(posKey(r, a.col))) return false;
    }
    return true;
  }
  return false;
}

/** Get the intermediate cells a bridge would occupy. */
function bridgeCells(a: Pos, b: Pos): Pos[] {
  const cells: Pos[] = [];
  if (a.row === b.row) {
    const minC = Math.min(a.col, b.col);
    const maxC = Math.max(a.col, b.col);
    for (let c = minC + 1; c < maxC; c++) cells.push({ row: a.row, col: c });
  } else {
    const minR = Math.min(a.row, b.row);
    const maxR = Math.max(a.row, b.row);
    for (let r = minR + 1; r < maxR; r++) cells.push({ row: r, col: a.col });
  }
  return cells;
}

function bridgeKey(a: Pos, b: Pos): string {
  if (a.row < b.row || (a.row === b.row && a.col < b.col)) {
    return `${a.row},${a.col}-${b.row},${b.col}`;
  }
  return `${b.row},${b.col}-${a.row},${a.col}`;
}

/* ------------------------------------------------------------------ */
/*  Generator parameters                                              */
/* ------------------------------------------------------------------ */

export interface GeneratorParams {
  seed: number;
  world: number;
  level: number;
  gridWidth: number;
  gridHeight: number;
  numFactions: number;
  minIslandsPerFaction: number;
  maxIslandsPerFaction: number;
  allowDoubleBridges: boolean;
  doubleBridgeChance: number; // 0..1
  maxAttempts?: number;
}

/* ------------------------------------------------------------------ */
/*  Spatial partitioning for faction placement                        */
/* ------------------------------------------------------------------ */

/**
 * Partition the grid into roughly equal regions for each faction.
 * Uses alternating horizontal/vertical splits so factions occupy
 * contiguous rectangular areas — this ensures same-faction islands
 * can bridge to each other without crossing other factions.
 */
function partitionGrid(
  width: number, height: number,
  numFactions: number,
  rng: () => number
): Pos[][] {
  interface Rect { r0: number; c0: number; r1: number; c1: number }

  function splitRect(rect: Rect, n: number): Rect[] {
    if (n <= 1) return [rect];

    const rh = rect.r1 - rect.r0;
    const cw = rect.c1 - rect.c0;

    // Split along the longer axis
    const splitHoriz = rh >= cw;
    const half = Math.ceil(n / 2);

    if (splitHoriz) {
      // Add jitter to the split point
      const mid = rect.r0 + Math.floor(rh * (0.4 + rng() * 0.2));
      const clamped = Math.max(rect.r0 + 1, Math.min(rect.r1 - 1, mid));
      return [
        ...splitRect({ r0: rect.r0, c0: rect.c0, r1: clamped, c1: rect.c1 }, half),
        ...splitRect({ r0: clamped, c0: rect.c0, r1: rect.r1, c1: rect.c1 }, n - half)
      ];
    } else {
      const mid = rect.c0 + Math.floor(cw * (0.4 + rng() * 0.2));
      const clamped = Math.max(rect.c0 + 1, Math.min(rect.c1 - 1, mid));
      return [
        ...splitRect({ r0: rect.r0, c0: rect.c0, r1: rect.r1, c1: clamped }, half),
        ...splitRect({ r0: rect.r0, c0: clamped, r1: rect.r1, c1: rect.c1 }, n - half)
      ];
    }
  }

  const rects = splitRect({ r0: 0, c0: 0, r1: height, c1: width }, numFactions);
  return rects.map(rect => {
    const positions: Pos[] = [];
    for (let r = rect.r0; r < rect.r1; r++) {
      for (let c = rect.c0; c < rect.c1; c++) {
        positions.push({ row: r, col: c });
      }
    }
    return positions;
  });
}

/* ------------------------------------------------------------------ */
/*  Core generator                                                    */
/* ------------------------------------------------------------------ */

export function generateLevel(params: GeneratorParams): LevelData | null {
  const rng = mulberry32(params.seed);
  const maxAttempts = params.maxAttempts ?? 500;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = tryGenerate(params, rng);
    if (result) return result;
  }
  return null;
}

function tryGenerate(params: GeneratorParams, rng: () => number): LevelData | null {
  const { gridWidth, gridHeight, numFactions } = params;
  const occupiedCells = new Set<string>();
  const allIslands: PlacedIsland[] = [];

  // 1. Decide island count per faction
  const islandsPerFaction: number[] = [];
  for (let f = 0; f < numFactions; f++) {
    const count = params.minIslandsPerFaction +
      Math.floor(rng() * (params.maxIslandsPerFaction - params.minIslandsPerFaction + 1));
    islandsPerFaction.push(count);
  }

  // 2. Place islands using spatial partitioning to keep factions clustered
  //    This dramatically improves bridgeability and reduces cross-faction crossings.
  const regions = partitionGrid(gridWidth, gridHeight, numFactions, rng);

  for (let f = 0; f < numFactions; f++) {
    const region = regions[f];
    const shuffled = shuffle(region, rng);
    let placed = 0;

    for (const pos of shuffled) {
      if (placed >= islandsPerFaction[f]) break;
      if (occupiedCells.has(posKey(pos.row, pos.col))) continue;

      // Ensure minimum spacing
      let tooClose = false;
      for (const existing of allIslands) {
        const dr = Math.abs(existing.row - pos.row);
        const dc = Math.abs(existing.col - pos.col);
        if (dr + dc < 2) { tooClose = true; break; }
      }
      if (tooClose) continue;

      allIslands.push({ row: pos.row, col: pos.col, faction: f });
      occupiedCells.add(posKey(pos.row, pos.col));
      placed++;
    }

    if (placed < islandsPerFaction[f]) return null; // couldn't place enough
  }

  // 3. For each faction, find valid neighbor pairs and build a spanning tree
  const solutionBridges: SolutionBridge[] = [];
  const usedBridgeCells = new Map<string, number>(); // cellKey -> faction

  for (let f = 0; f < numFactions; f++) {
    const factionIslands = allIslands.filter(i => i.faction === f);
    if (factionIslands.length <= 1) continue;

    // Find all possible edges for this faction
    const edges: Array<{ a: PlacedIsland; b: PlacedIsland }> = [];
    for (let i = 0; i < factionIslands.length; i++) {
      for (let j = i + 1; j < factionIslands.length; j++) {
        const a = factionIslands[i];
        const b = factionIslands[j];
        if (canBridge(a, b, occupiedCells)) {
          edges.push({ a, b });
        }
      }
    }

    // Build spanning tree using randomized Kruskal's
    const shuffledEdges = shuffle(edges, rng);
    const parent = new Map<string, string>();
    for (const island of factionIslands) {
      parent.set(posKey(island.row, island.col), posKey(island.row, island.col));
    }

    function find(key: string): string {
      while (parent.get(key) !== key) {
        const p = parent.get(parent.get(key)!)!;
        parent.set(key, p);
        key = p;
      }
      return key;
    }

    function union(a: string, b: string): boolean {
      const ra = find(a);
      const rb = find(b);
      if (ra === rb) return false;
      parent.set(ra, rb);
      return true;
    }

    let connected = 0;
    const needed = factionIslands.length - 1;

    for (const edge of shuffledEdges) {
      if (connected >= needed) break;

      // Check this bridge doesn't cross an existing bridge of a different faction
      const cells = bridgeCells(edge.a, edge.b);
      let crosses = false;
      for (const cell of cells) {
        const cellFaction = usedBridgeCells.get(posKey(cell.row, cell.col));
        if (cellFaction !== undefined && cellFaction !== f) {
          crosses = true;
          break;
        }
      }
      if (crosses) continue;

      const ka = posKey(edge.a.row, edge.a.col);
      const kb = posKey(edge.b.row, edge.b.col);
      if (union(ka, kb)) {
        const count = (params.allowDoubleBridges && rng() < params.doubleBridgeChance) ? 2 : 1;
        solutionBridges.push({ a: edge.a, b: edge.b, count });

        // Mark bridge cells as occupied by this faction
        for (const cell of cells) {
          usedBridgeCells.set(posKey(cell.row, cell.col), f);
        }
        connected++;
      }
    }

    if (connected < needed) return null; // couldn't connect all islands
  }

  // 4. Optionally add extra bridges (beyond the spanning tree) for variety
  for (let f = 0; f < numFactions; f++) {
    const factionIslands = allIslands.filter(i => i.faction === f);
    for (let i = 0; i < factionIslands.length; i++) {
      for (let j = i + 1; j < factionIslands.length; j++) {
        if (rng() > 0.15) continue; // only sometimes add extras

        const a = factionIslands[i];
        const b = factionIslands[j];
        const bk = bridgeKey(a, b);

        // Skip if already bridged
        if (solutionBridges.some(sb => bridgeKey(sb.a, sb.b) === bk)) continue;

        if (!canBridge(a, b, occupiedCells)) continue;

        // Check crossing
        const cells = bridgeCells(a, b);
        let crosses = false;
        for (const cell of cells) {
          const cellFaction = usedBridgeCells.get(posKey(cell.row, cell.col));
          if (cellFaction !== undefined && cellFaction !== f) {
            crosses = true;
            break;
          }
        }
        if (crosses) continue;

        const count = (params.allowDoubleBridges && rng() < params.doubleBridgeChance) ? 2 : 1;
        solutionBridges.push({ a, b, count });
        for (const cell of cells) {
          usedBridgeCells.set(posKey(cell.row, cell.col), f);
        }
      }
    }
  }

  // 5. Derive island degrees from the solution
  const degreeMap = new Map<string, number>();
  for (const island of allIslands) {
    degreeMap.set(posKey(island.row, island.col), 0);
  }
  for (const bridge of solutionBridges) {
    const ka = posKey(bridge.a.row, bridge.a.col);
    const kb = posKey(bridge.b.row, bridge.b.col);
    degreeMap.set(ka, degreeMap.get(ka)! + bridge.count);
    degreeMap.set(kb, degreeMap.get(kb)! + bridge.count);
  }

  // Filter out islands with degree 0 (isolated, no bridges needed)
  const finalIslands: IslandData[] = allIslands
    .filter(i => (degreeMap.get(posKey(i.row, i.col)) ?? 0) > 0)
    .map(i => ({
      row: i.row,
      col: i.col,
      faction: i.faction,
      degree: degreeMap.get(posKey(i.row, i.col))!
    }));

  // Ensure at least 2 islands per faction that has bridges
  const factionCounts = new Map<number, number>();
  for (const island of finalIslands) {
    factionCounts.set(island.faction, (factionCounts.get(island.faction) ?? 0) + 1);
  }
  for (const [, count] of factionCounts) {
    if (count < 2) return null;
  }

  // 6. Calculate par moves = total bridge count
  const parMoves = solutionBridges.reduce((sum, b) => sum + b.count, 0);

  if (finalIslands.length < 4) return null; // too few islands
  if (parMoves < 3) return null; // too trivial

  return {
    id: `${params.world}-${params.level}`,
    world: params.world,
    level: params.level,
    gridWidth: params.gridWidth,
    gridHeight: params.gridHeight,
    islands: finalIslands,
    parMoves
  };
}

/* ------------------------------------------------------------------ */
/*  World presets                                                     */
/* ------------------------------------------------------------------ */

export interface WorldPreset {
  world: number;
  levels: number;
  gridWidthRange: [number, number];
  gridHeightRange: [number, number];
  numFactions: [number, number]; // min, max
  minIslandsPerFaction: number;
  maxIslandsPerFaction: number;
  allowDoubleBridges: boolean;
  doubleBridgeChance: number;
}

export const WORLD_PRESETS: WorldPreset[] = [
  {
    world: 1, levels: 5,
    gridWidthRange: [5, 6], gridHeightRange: [5, 6],
    numFactions: [1, 2],
    minIslandsPerFaction: 2, maxIslandsPerFaction: 4,
    allowDoubleBridges: false, doubleBridgeChance: 0
  },
  {
    world: 2, levels: 5,
    gridWidthRange: [6, 7], gridHeightRange: [6, 7],
    numFactions: [2, 2],
    minIslandsPerFaction: 3, maxIslandsPerFaction: 5,
    allowDoubleBridges: true, doubleBridgeChance: 0.25
  },
  {
    world: 3, levels: 5,
    gridWidthRange: [7, 8], gridHeightRange: [7, 8],
    numFactions: [2, 3],
    minIslandsPerFaction: 2, maxIslandsPerFaction: 4,
    allowDoubleBridges: true, doubleBridgeChance: 0.2
  },
  {
    world: 4, levels: 5,
    gridWidthRange: [7, 8], gridHeightRange: [7, 8],
    numFactions: [3, 4],
    minIslandsPerFaction: 2, maxIslandsPerFaction: 4,
    allowDoubleBridges: true, doubleBridgeChance: 0.3
  },
  {
    world: 5, levels: 5,
    gridWidthRange: [8, 9], gridHeightRange: [8, 9],
    numFactions: [3, 4],
    minIslandsPerFaction: 3, maxIslandsPerFaction: 5,
    allowDoubleBridges: true, doubleBridgeChance: 0.35
  }
];

/**
 * Generate all levels for a world using its preset.
 * Seeds are derived from the world number so output is deterministic.
 */
export function generateWorld(preset: WorldPreset): LevelData[] {
  const rng = mulberry32(preset.world * 1000);
  const levels: LevelData[] = [];

  for (let lvl = 1; lvl <= preset.levels; lvl++) {
    // Interpolate grid size based on level progression
    const t = (lvl - 1) / Math.max(1, preset.levels - 1);
    const gridWidth = preset.gridWidthRange[0] +
      Math.round(t * (preset.gridWidthRange[1] - preset.gridWidthRange[0]));
    const gridHeight = preset.gridHeightRange[0] +
      Math.round(t * (preset.gridHeightRange[1] - preset.gridHeightRange[0]));

    // Interpolate faction count
    const numFactions = preset.numFactions[0] +
      Math.round(t * (preset.numFactions[1] - preset.numFactions[0]));

    // Try seeds until we get a valid level
    let level: LevelData | null = null;
    for (let seedOffset = 0; seedOffset < 500; seedOffset++) {
      const seed = Math.floor(rng() * 2147483647) + seedOffset;
      level = generateLevel({
        seed,
        world: preset.world,
        level: lvl,
        gridWidth,
        gridHeight,
        numFactions,
        minIslandsPerFaction: preset.minIslandsPerFaction,
        maxIslandsPerFaction: preset.maxIslandsPerFaction,
        allowDoubleBridges: preset.allowDoubleBridges,
        doubleBridgeChance: preset.doubleBridgeChance
      });
      if (level) break;
    }

    if (!level) {
      throw new Error(`Failed to generate level ${lvl} for world ${preset.world}`);
    }
    levels.push(level);
  }
  return levels;
}
