import type { LevelData, IslandData } from '../types/level';
import type { Difficulty } from '../types/save';

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
    if (maxC - minC < 2) return true;
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

function bridgeKeyStr(a: Pos, b: Pos): string {
  if (a.row < b.row || (a.row === b.row && a.col < b.col)) {
    return `${a.row},${a.col}-${b.row},${b.col}`;
  }
  return `${b.row},${b.col}-${a.row},${a.col}`;
}

/** Check if two bridge segments cross each other. */
function bridgesOverlap(cellsA: Pos[], cellsB: Pos[]): boolean {
  const setA = new Set(cellsA.map(p => posKey(p.row, p.col)));
  for (const p of cellsB) {
    if (setA.has(posKey(p.row, p.col))) return true;
  }
  return false;
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
  minIslands: number;
  maxIslands: number;
  minDegree: number;
  allowDoubleBridges: boolean;
  doubleBridgeChance: number;
  extraBridgeChance: number;
  maxForcedRatio: number;
  minCrossings: number;
  maxAttempts?: number;
}

/* ------------------------------------------------------------------ */
/*  Interleaved territory assignment via multi-source BFS             */
/* ------------------------------------------------------------------ */

/**
 * Assign factions to grid cells using multi-seed BFS (flood-fill).
 * Each faction gets multiple seed points spread across the grid,
 * creating fragmented, interlocking territories with many shared
 * borders and crossing corridors.
 */
function assignTerritories(
  width: number, height: number,
  numFactions: number,
  rng: () => number
): Map<string, number> {
  const assignment = new Map<string, number>();

  // Each faction gets multiple seeds for fragmentation
  const seedsPerFaction = Math.max(2, Math.ceil(Math.max(width, height) / 4));
  const totalSeeds = numFactions * seedsPerFaction;

  // Place all seeds with maximum spacing using greedy farthest-point
  const allCells: Pos[] = [];
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      allCells.push({ row: r, col: c });
    }
  }

  const seeds: Array<{ pos: Pos; faction: number }> = [];

  // Place seeds: cycle through factions to distribute evenly
  const firstIdx = Math.floor(rng() * allCells.length);
  seeds.push({ pos: allCells[firstIdx], faction: 0 });
  assignment.set(posKey(allCells[firstIdx].row, allCells[firstIdx].col), 0);

  for (let i = 1; i < totalSeeds; i++) {
    const faction = i % numFactions;
    let bestPos = allCells[0];
    let bestDist = -1;

    // Shuffle a subset for performance + randomness
    const candidates = shuffle(allCells, rng).slice(0, Math.min(allCells.length, 80));
    for (const cell of candidates) {
      if (assignment.has(posKey(cell.row, cell.col))) continue;
      let minDist = Infinity;
      for (const s of seeds) {
        const d = Math.abs(cell.row - s.pos.row) + Math.abs(cell.col - s.pos.col);
        minDist = Math.min(minDist, d);
      }
      if (minDist > bestDist) {
        bestDist = minDist;
        bestPos = cell;
      }
    }
    seeds.push({ pos: bestPos, faction });
    assignment.set(posKey(bestPos.row, bestPos.col), faction);
  }

  // BFS: grow all seeds simultaneously, shuffled for irregular borders
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  let current = shuffle(seeds.map(s => ({ row: s.pos.row, col: s.pos.col, faction: s.faction })), rng);

  while (current.length > 0) {
    const next: Array<{ row: number; col: number; faction: number }> = [];
    for (const { row, col, faction } of current) {
      for (const [dr, dc] of dirs) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nr >= height || nc < 0 || nc >= width) continue;
        const key = posKey(nr, nc);
        if (assignment.has(key)) continue;
        assignment.set(key, faction);
        next.push({ row: nr, col: nc, faction });
      }
    }
    current = shuffle(next, rng);
  }

  return assignment;
}

/* ------------------------------------------------------------------ */
/*  Forced-move analysis                                              */
/* ------------------------------------------------------------------ */

/**
 * Count how many bridges can be determined by forced-move analysis alone.
 * Uses the same constraint propagation as Solver.findForcedMove.
 * Returns the ratio of forced bridges to total bridges.
 */
function computeForcedRatio(levelData: LevelData): number {
  // Build a lightweight grid model for analysis
  const islandMap = new Map<string, { faction: number; degree: number; row: number; col: number }>();
  for (const isl of levelData.islands) {
    islandMap.set(posKey(isl.row, isl.col), isl);
  }

  // Find all neighbor pairs (same faction, same row/col, no island between)
  type Pair = { a: IslandData; b: IslandData; key: string };
  const pairs: Pair[] = [];
  const seenPairs = new Set<string>();

  for (const island of levelData.islands) {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      let r = island.row + dr;
      let c = island.col + dc;
      while (r >= 0 && r < levelData.gridHeight && c >= 0 && c < levelData.gridWidth) {
        const other = islandMap.get(posKey(r, c));
        if (other) {
          if (other.faction === island.faction) {
            const key = bridgeKeyStr(island, other);
            if (!seenPairs.has(key)) {
              seenPairs.add(key);
              pairs.push({ a: island, b: other, key });
            }
          }
          break;
        }
        r += dr;
        c += dc;
      }
    }
  }

  // Simulate forced-move analysis
  const bridgeCounts = new Map<string, number>();
  for (const p of pairs) bridgeCounts.set(p.key, 0);

  const getDegreeUsed = (isl: IslandData): number => {
    let total = 0;
    for (const p of pairs) {
      const c = bridgeCounts.get(p.key) ?? 0;
      if (c === 0) continue;
      if ((p.a.row === isl.row && p.a.col === isl.col) ||
          (p.b.row === isl.row && p.b.col === isl.col)) {
        total += c;
      }
    }
    return total;
  };

  // Check if a bridge would cross an existing bridge of a different faction
  const wouldCross = (pair: Pair): boolean => {
    const cells = bridgeCells(pair.a, pair.b);
    for (const other of pairs) {
      const oc = bridgeCounts.get(other.key) ?? 0;
      if (oc === 0) continue;
      const otherCells = bridgeCells(other.a, other.b);
      if (bridgesOverlap(cells, otherCells)) return true;
    }
    return false;
  };

  let totalForced = 0;
  let changed = true;
  const maxIter = levelData.islands.length * 10;
  let iter = 0;

  while (changed && iter < maxIter) {
    changed = false;
    iter++;
    for (const island of levelData.islands) {
      const used = getDegreeUsed(island);
      const remaining = island.degree - used;
      if (remaining <= 0) continue;

      // Find available neighbors
      const available: Array<{ pair: Pair; canAdd: number }> = [];
      for (const p of pairs) {
        let neighbor: IslandData | null = null;
        if (p.a.row === island.row && p.a.col === island.col) neighbor = p.b;
        else if (p.b.row === island.row && p.b.col === island.col) neighbor = p.a;
        if (!neighbor) continue;

        const currentCount = bridgeCounts.get(p.key) ?? 0;
        const canAdd = 2 - currentCount;
        if (canAdd <= 0) continue;
        if (wouldCross(p)) continue;

        const neighborRemaining = neighbor.degree - getDegreeUsed(neighbor);
        if (neighborRemaining <= 0) continue;

        available.push({ pair: p, canAdd: Math.min(canAdd, neighborRemaining) });
      }

      const totalAvailable = available.reduce((sum, a) => sum + a.canAdd, 0);

      // All bridges forced: remaining == total available slots
      if (totalAvailable === remaining) {
        for (const { pair, canAdd } of available) {
          const old = bridgeCounts.get(pair.key) ?? 0;
          // We need to add 'canAdd' bridges worth, but only up to remaining
          const toAdd = Math.min(canAdd, remaining - (getDegreeUsed(island) - used));
          if (toAdd > 0) {
            bridgeCounts.set(pair.key, old + toAdd);
            totalForced += toAdd;
            changed = true;
          }
        }
      }
      // Only one neighbor: forced
      else if (available.length === 1) {
        const { pair } = available[0];
        const old = bridgeCounts.get(pair.key) ?? 0;
        bridgeCounts.set(pair.key, old + 1);
        totalForced += 1;
        changed = true;
      }
    }
  }

  return levelData.parMoves > 0 ? totalForced / levelData.parMoves : 1;
}

/* ------------------------------------------------------------------ */
/*  Core generator                                                    */
/* ------------------------------------------------------------------ */

export function generateLevel(params: GeneratorParams): LevelData | null {
  const rng = mulberry32(params.seed);
  const maxAttempts = params.maxAttempts ?? 200;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = tryGenerate(params, rng);
    if (result) return result;
  }
  return null;
}

function tryGenerate(params: GeneratorParams, rng: () => number): LevelData | null {
  const { gridWidth, gridHeight, numFactions, minIslands, maxIslands } = params;
  const occupiedCells = new Set<string>();
  const allIslands: PlacedIsland[] = [];

  // 1. Assign territories via interleaved flood-fill
  const territories = assignTerritories(gridWidth, gridHeight, numFactions, rng);

  // 2. Determine island count per faction
  const targetIslands = minIslands + Math.floor(rng() * (maxIslands - minIslands + 1));

  // Gather all cells grouped by faction
  const factionCells = new Map<number, Pos[]>();
  for (let r = 0; r < gridHeight; r++) {
    for (let c = 0; c < gridWidth; c++) {
      const f = territories.get(posKey(r, c));
      if (f === undefined) continue;
      if (!factionCells.has(f)) factionCells.set(f, []);
      factionCells.get(f)!.push({ row: r, col: c });
    }
  }

  // Distribute proportionally
  const factionTargets = new Map<number, number>();
  const totalCells = gridWidth * gridHeight;
  let assigned = 0;
  for (let f = 0; f < numFactions; f++) {
    const cells = factionCells.get(f) ?? [];
    const proportion = cells.length / totalCells;
    const target = Math.max(3, Math.round(targetIslands * proportion));
    factionTargets.set(f, target);
    assigned += target;
  }
  while (assigned > targetIslands && assigned > numFactions * 3) {
    let maxF = 0, maxC = 0;
    for (const [f, t] of factionTargets) {
      if (t > maxC && t > 3) { maxF = f; maxC = t; }
    }
    factionTargets.set(maxF, maxC - 1);
    assigned--;
  }

  // 3. Connectivity-aware placement: each new island must have a
  //    bridgeable sight line to an existing same-faction island.
  //    This guarantees the spanning tree can always be built.
  for (let f = 0; f < numFactions; f++) {
    const cells = shuffle(factionCells.get(f) ?? [], rng);
    const target = factionTargets.get(f) ?? 3;
    const fIslands: PlacedIsland[] = [];

    // Place first island freely
    let firstPlaced = false;
    for (const pos of cells) {
      if (occupiedCells.has(posKey(pos.row, pos.col))) continue;
      allIslands.push({ row: pos.row, col: pos.col, faction: f });
      fIslands.push({ row: pos.row, col: pos.col, faction: f });
      occupiedCells.add(posKey(pos.row, pos.col));
      firstPlaced = true;
      break;
    }
    if (!firstPlaced) return null;

    // Place remaining islands: each must have a clear sight line to an existing same-faction island
    let attempts = 0;
    const maxPlaceAttempts = cells.length * 3;
    while (fIslands.length < target && attempts < maxPlaceAttempts) {
      attempts++;
      const pos = cells[Math.floor(rng() * cells.length)];
      if (occupiedCells.has(posKey(pos.row, pos.col))) continue;

      // Check min spacing from same-faction
      let tooClose = false;
      for (const existing of fIslands) {
        if (Math.abs(existing.row - pos.row) + Math.abs(existing.col - pos.col) < 2) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      // Check this position can bridge to at least one existing same-faction island
      let hasSightLine = false;
      for (const existing of fIslands) {
        if (canBridge(pos, existing, occupiedCells)) {
          hasSightLine = true;
          break;
        }
      }
      if (!hasSightLine) continue;

      allIslands.push({ row: pos.row, col: pos.col, faction: f });
      fIslands.push({ row: pos.row, col: pos.col, faction: f });
      occupiedCells.add(posKey(pos.row, pos.col));
    }

    if (fIslands.length < 3) return null;
  }

  // 3. Build solution bridges — spanning tree + extra bridges
  const solutionBridges: SolutionBridge[] = [];
  const usedBridgeCells = new Map<string, number>(); // cellKey -> faction

  for (let f = 0; f < numFactions; f++) {
    const factionIslands = allIslands.filter(i => i.faction === f);
    if (factionIslands.length < 2) return null;

    // Find all possible edges
    const edges: Array<{ a: PlacedIsland; b: PlacedIsland; cells: Pos[] }> = [];
    for (let i = 0; i < factionIslands.length; i++) {
      for (let j = i + 1; j < factionIslands.length; j++) {
        const a = factionIslands[i];
        const b = factionIslands[j];
        if (canBridge(a, b, occupiedCells)) {
          edges.push({ a, b, cells: bridgeCells(a, b) });
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

      // Check crossing with existing bridges of different factions
      let crosses = false;
      for (const cell of edge.cells) {
        if (usedBridgeCells.has(posKey(cell.row, cell.col))) {
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
        for (const cell of edge.cells) {
          usedBridgeCells.set(posKey(cell.row, cell.col), f);
        }
        connected++;
      }
    }

    if (connected < needed) return null;
  }

  // 4. Aggressively add extra bridges beyond spanning tree
  const allEdges: Array<{ a: PlacedIsland; b: PlacedIsland; cells: Pos[] }> = [];
  for (let f = 0; f < numFactions; f++) {
    const factionIslands = allIslands.filter(i => i.faction === f);
    for (let i = 0; i < factionIslands.length; i++) {
      for (let j = i + 1; j < factionIslands.length; j++) {
        const a = factionIslands[i];
        const b = factionIslands[j];
        if (!canBridge(a, b, occupiedCells)) continue;
        const bk = bridgeKeyStr(a, b);
        if (solutionBridges.some(sb => bridgeKeyStr(sb.a, sb.b) === bk)) continue;
        allEdges.push({ a, b, cells: bridgeCells(a, b) });
      }
    }
  }

  for (const edge of shuffle(allEdges, rng)) {
    if (rng() > params.extraBridgeChance) continue;

    let crosses = false;
    for (const cell of edge.cells) {
      if (usedBridgeCells.has(posKey(cell.row, cell.col))) {
        crosses = true;
        break;
      }
    }
    if (crosses) continue;

    const count = (params.allowDoubleBridges && rng() < params.doubleBridgeChance) ? 2 : 1;
    solutionBridges.push({ a: edge.a, b: edge.b, count });
    for (const cell of edge.cells) {
      usedBridgeCells.set(posKey(cell.row, cell.col), edge.a.faction);
    }
  }

  // 5. Derive island degrees from solution
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

  // Filter out islands with degree 0
  const finalIslands: IslandData[] = allIslands
    .filter(i => (degreeMap.get(posKey(i.row, i.col)) ?? 0) > 0)
    .map(i => ({
      row: i.row,
      col: i.col,
      faction: i.faction,
      degree: degreeMap.get(posKey(i.row, i.col))!
    }));

  // Enforce minimum degree
  if (params.minDegree > 1) {
    for (const isl of finalIslands) {
      if (isl.degree < params.minDegree) return null;
    }
  }

  // Ensure at least 3 islands per active faction
  const factionCounts = new Map<number, number>();
  for (const island of finalIslands) {
    factionCounts.set(island.faction, (factionCounts.get(island.faction) ?? 0) + 1);
  }
  for (const [, count] of factionCounts) {
    if (count < 3) return null;
  }

  // 6. Calculate par moves
  const parMoves = solutionBridges.reduce((sum, b) => sum + b.count, 0);

  if (finalIslands.length < 6) return null;
  if (parMoves < 5) return null;

  // 7. Count crossing corridors (cells contested by multiple factions)
  if (params.minCrossings > 0) {
    const crossings = countCrossingCorridors(finalIslands, occupiedCells, gridWidth, gridHeight);
    if (crossings < params.minCrossings) return null;
  }

  const candidate: LevelData = {
    id: `${params.world}-${params.level}`,
    world: params.world,
    level: params.level,
    gridWidth,
    gridHeight,
    islands: finalIslands,
    parMoves
  };

  // 8. Forced-move difficulty filter
  if (params.maxForcedRatio < 1) {
    const ratio = computeForcedRatio(candidate);
    if (ratio > params.maxForcedRatio) return null;
  }

  return candidate;
}

/* ------------------------------------------------------------------ */
/*  Crossing corridor analysis                                        */
/* ------------------------------------------------------------------ */

/**
 * Count the number of cells where potential bridges of different
 * factions would contest the same corridor space.
 */
function countCrossingCorridors(
  islands: IslandData[],
  _occupiedCells: Set<string>,
  gridWidth: number,
  gridHeight: number
): number {
  // For each faction, find all possible bridge corridors
  const factionCorridors = new Map<number, Set<string>>();

  const islandMap = new Map<string, IslandData>();
  for (const isl of islands) islandMap.set(posKey(isl.row, isl.col), isl);

  for (const island of islands) {
    if (!factionCorridors.has(island.faction)) {
      factionCorridors.set(island.faction, new Set());
    }
    const corridors = factionCorridors.get(island.faction)!;

    // Find same-faction neighbors in each direction
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      let r = island.row + dr;
      let c = island.col + dc;
      while (r >= 0 && r < gridHeight && c >= 0 && c < gridWidth) {
        const other = islandMap.get(posKey(r, c));
        if (other) {
          if (other.faction === island.faction) {
            // Mark corridor cells
            const cells = bridgeCells(island, other);
            for (const cell of cells) {
              corridors.add(posKey(cell.row, cell.col));
            }
          }
          break;
        }
        r += dr;
        c += dc;
      }
    }
  }

  // Count cells that appear in corridors of 2+ factions
  const allCorridorCells = new Map<string, Set<number>>();
  for (const [faction, cells] of factionCorridors) {
    for (const cell of cells) {
      if (!allCorridorCells.has(cell)) allCorridorCells.set(cell, new Set());
      allCorridorCells.get(cell)!.add(faction);
    }
  }

  let contested = 0;
  for (const [, factions] of allCorridorCells) {
    if (factions.size >= 2) contested++;
  }

  return contested;
}

/* ------------------------------------------------------------------ */
/*  World presets                                                     */
/* ------------------------------------------------------------------ */

export interface WorldPreset {
  world: number;
  levels: number;
  gridWidthRange: [number, number];
  gridHeightRange: [number, number];
  numFactions: [number, number];
  minIslands: number;
  maxIslands: number;
  minDegree: number;
  allowDoubleBridges: boolean;
  doubleBridgeChance: number;
  extraBridgeChance: number;
  maxForcedRatio: number;
  minCrossings: number;
}

export const WORLD_PRESETS: WorldPreset[] = [
  {
    // World 1: tutorial, single faction, small grid
    world: 1, levels: 5,
    gridWidthRange: [5, 6], gridHeightRange: [5, 6],
    numFactions: [1, 1],
    minIslands: 4, maxIslands: 6,
    minDegree: 1,
    allowDoubleBridges: false, doubleBridgeChance: 0,
    extraBridgeChance: 0.15,
    maxForcedRatio: 1.0,  // tutorial: forced moves OK
    minCrossings: 0
  },
  {
    // World 2: two factions, introducing crossing tension
    world: 2, levels: 5,
    gridWidthRange: [7, 7], gridHeightRange: [7, 7],
    numFactions: [2, 2],
    minIslands: 10, maxIslands: 14,
    minDegree: 1,
    allowDoubleBridges: true, doubleBridgeChance: 0.3,
    extraBridgeChance: 0.45,
    maxForcedRatio: 0.7,
    minCrossings: 1
  },
  {
    // World 3: larger grid, higher density, min degree 2
    world: 3, levels: 5,
    gridWidthRange: [7, 8], gridHeightRange: [7, 8],
    numFactions: [2, 3],
    minIslands: 10, maxIslands: 16,
    minDegree: 1,
    allowDoubleBridges: true, doubleBridgeChance: 0.35,
    extraBridgeChance: 0.5,
    maxForcedRatio: 0.6,
    minCrossings: 1
  },
  {
    // World 4: 3 factions, dense placement, hard
    world: 4, levels: 5,
    gridWidthRange: [8, 9], gridHeightRange: [8, 9],
    numFactions: [3, 3],
    minIslands: 12, maxIslands: 18,
    minDegree: 1,
    allowDoubleBridges: true, doubleBridgeChance: 0.4,
    extraBridgeChance: 0.55,
    maxForcedRatio: 0.6,
    minCrossings: 0
  },
  {
    // World 5: 3-4 factions, very dense, expert
    world: 5, levels: 5,
    gridWidthRange: [9, 9], gridHeightRange: [9, 9],
    numFactions: [3, 4],
    minIslands: 14, maxIslands: 22,
    minDegree: 1,
    allowDoubleBridges: true, doubleBridgeChance: 0.45,
    extraBridgeChance: 0.6,
    maxForcedRatio: 0.55,
    minCrossings: 0
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
    const t = (lvl - 1) / Math.max(1, preset.levels - 1);
    const gridWidth = preset.gridWidthRange[0] +
      Math.round(t * (preset.gridWidthRange[1] - preset.gridWidthRange[0]));
    const gridHeight = preset.gridHeightRange[0] +
      Math.round(t * (preset.gridHeightRange[1] - preset.gridHeightRange[0]));

    const numFactions = preset.numFactions[0] +
      Math.round(t * (preset.numFactions[1] - preset.numFactions[0]));

    // Interpolate difficulty: later levels get more islands, stricter filtering
    const minIslands = Math.round(preset.minIslands + t * 2);
    const maxIslands = Math.round(preset.maxIslands + t * 2);
    const extraBridgeChance = preset.extraBridgeChance + t * 0.1;
    const maxForcedRatio = Math.max(0.15, preset.maxForcedRatio - t * 0.1);

    let level: LevelData | null = null;
    for (let seedOffset = 0; seedOffset < 2000; seedOffset++) {
      const seed = Math.floor(rng() * 2147483647) + seedOffset;
      level = generateLevel({
        seed,
        world: preset.world,
        level: lvl,
        gridWidth,
        gridHeight,
        numFactions,
        minIslands,
        maxIslands,
        minDegree: preset.minDegree,
        allowDoubleBridges: preset.allowDoubleBridges,
        doubleBridgeChance: preset.doubleBridgeChance,
        extraBridgeChance,
        maxForcedRatio,
        minCrossings: preset.minCrossings
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

/* ------------------------------------------------------------------ */
/*  Quick Play generator                                              */
/* ------------------------------------------------------------------ */

interface QuickPlayPreset {
  gridWidth: number;
  gridHeight: number;
  minIslands: number;
  maxIslands: number;
  minDegree: number;
  allowDoubleBridges: boolean;
  doubleBridgeChance: number;
  extraBridgeChance: number;
  maxForcedRatio: number;
}

const QUICK_PLAY_PRESETS: Record<Difficulty, QuickPlayPreset> = {
  easy: {
    gridWidth: 5, gridHeight: 6,
    minIslands: 4, maxIslands: 6, minDegree: 1,
    allowDoubleBridges: false, doubleBridgeChance: 0,
    extraBridgeChance: 0.15, maxForcedRatio: 1.0
  },
  medium: {
    gridWidth: 7, gridHeight: 7,
    minIslands: 8, maxIslands: 12, minDegree: 1,
    allowDoubleBridges: true, doubleBridgeChance: 0.3,
    extraBridgeChance: 0.4, maxForcedRatio: 0.65
  },
  hard: {
    gridWidth: 8, gridHeight: 8,
    minIslands: 14, maxIslands: 18, minDegree: 1,
    allowDoubleBridges: true, doubleBridgeChance: 0.45,
    extraBridgeChance: 0.55, maxForcedRatio: 0.35
  },
  expert: {
    gridWidth: 9, gridHeight: 9,
    minIslands: 18, maxIslands: 24, minDegree: 1,
    allowDoubleBridges: true, doubleBridgeChance: 0.5,
    extraBridgeChance: 0.6, maxForcedRatio: 0.25
  }
};

/**
 * Generate a single quick-play level on the fly.
 * Uses Date.now() as the seed for variety.
 */
export function generateQuickPlay(difficulty: Difficulty, numFactions: number): LevelData {
  const preset = QUICK_PLAY_PRESETS[difficulty];
  const minCrossings = numFactions > 1 && (difficulty === 'hard' || difficulty === 'expert') ? 1 : 0;

  // Try with multiple seeds until we get a valid level
  for (let attempt = 0; attempt < 50; attempt++) {
    const seed = (Date.now() + attempt * 7919) & 0x7fffffff;
    const level = generateLevel({
      seed,
      world: 0,
      level: 0,
      gridWidth: preset.gridWidth,
      gridHeight: preset.gridHeight,
      numFactions,
      minIslands: preset.minIslands,
      maxIslands: preset.maxIslands,
      minDegree: preset.minDegree,
      allowDoubleBridges: preset.allowDoubleBridges,
      doubleBridgeChance: preset.doubleBridgeChance,
      extraBridgeChance: preset.extraBridgeChance,
      maxForcedRatio: preset.maxForcedRatio,
      minCrossings,
      maxAttempts: 400
    });
    if (level) {
      level.id = `qp-${seed}`;
      return level;
    }
  }

  // Fallback: relax constraints
  const seed = Date.now() & 0x7fffffff;
  const level = generateLevel({
    seed,
    world: 0,
    level: 0,
    gridWidth: preset.gridWidth,
    gridHeight: preset.gridHeight,
    numFactions,
    minIslands: preset.minIslands,
    maxIslands: preset.maxIslands,
    minDegree: preset.minDegree,
    allowDoubleBridges: preset.allowDoubleBridges,
    doubleBridgeChance: preset.doubleBridgeChance,
    extraBridgeChance: preset.extraBridgeChance,
    maxForcedRatio: 1.0,
    minCrossings: 0,
    maxAttempts: 1000
  });
  if (level) {
    level.id = `qp-${seed}`;
    return level;
  }
  throw new Error('Failed to generate quick play level');
}
