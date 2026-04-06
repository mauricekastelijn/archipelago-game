import { describe, it, expect } from 'vitest';
import { generateLevel, generateWorld, WORLD_PRESETS } from './LevelGenerator';
import { Grid } from './Grid';
import { Island } from './Island';

/**
 * Brute-force verification that a level is solvable.
 * Tries all possible bridge combinations via backtracking.
 * Has a node budget to avoid hanging on large levels.
 */
function findSolution(grid: Grid, maxNodes = 2_000_000): Map<string, number> | null {
  const slots: Array<{ a: Island; b: Island; key: string }> = [];
  const seen = new Set<string>();

  for (const island of grid.islands) {
    for (const neighbor of grid.getNeighbors(island)) {
      const key = `${Math.min(island.row * 100 + island.col, neighbor.row * 100 + neighbor.col)}-${Math.max(island.row * 100 + island.col, neighbor.row * 100 + neighbor.col)}`;
      if (!seen.has(key)) {
        seen.add(key);
        slots.push({ a: island, b: neighbor, key });
      }
    }
  }

  const result = new Map<string, number>();
  let nodes = 0;

  function backtrack(index: number): boolean | 'timeout' {
    nodes++;
    if (nodes > maxNodes) return 'timeout';

    for (const island of grid.islands) {
      if (grid.getDegreeUsed(island) > island.degree) return false;
    }

    if (index === slots.length) {
      return grid.isSolved();
    }

    const { a, b } = slots[index];

    for (const count of [0, 1, 2]) {
      while (grid.getBridgeCount(a, b) !== 0) grid.cycleBridge(a, b);

      for (let i = 0; i < count; i++) grid.cycleBridge(a, b);

      if (count > 0 && grid.wouldCross(a, b)) {
        while (grid.getBridgeCount(a, b) !== 0) grid.cycleBridge(a, b);
        continue;
      }

      const aUsed = grid.getDegreeUsed(a);
      const bUsed = grid.getDegreeUsed(b);
      if (aUsed > a.degree || bUsed > b.degree) {
        while (grid.getBridgeCount(a, b) !== 0) grid.cycleBridge(a, b);
        continue;
      }

      const r = backtrack(index + 1);
      if (r === 'timeout') return 'timeout';
      if (r === true) {
        result.set(slots[index].key, count);
        return true;
      }

      while (grid.getBridgeCount(a, b) !== 0) grid.cycleBridge(a, b);
    }

    return false;
  }

  const r = backtrack(0);
  if (r === true) return result;
  return null; // unsolvable or timed out
}

describe('LevelGenerator', () => {
  it('generates a level with basic params', () => {
    const level = generateLevel({
      seed: 42,
      world: 1,
      level: 1,
      gridWidth: 5,
      gridHeight: 5,
      numFactions: 1,
      minIslands: 4,
      maxIslands: 6,
      minDegree: 1,
      allowDoubleBridges: false,
      doubleBridgeChance: 0,
      extraBridgeChance: 0.15,
      maxForcedRatio: 1.0,
      minCrossings: 0
    });

    expect(level).not.toBeNull();
    expect(level!.islands.length).toBeGreaterThanOrEqual(4);
    expect(level!.parMoves).toBeGreaterThan(0);
  });

  it('generates deterministic output with same seed', () => {
    const params = {
      seed: 123,
      world: 1,
      level: 1,
      gridWidth: 6,
      gridHeight: 6,
      numFactions: 2,
      minIslands: 6,
      maxIslands: 10,
      minDegree: 1,
      allowDoubleBridges: false,
      doubleBridgeChance: 0,
      extraBridgeChance: 0.3,
      maxForcedRatio: 1.0,
      minCrossings: 0
    };

    const a = generateLevel(params);
    const b = generateLevel(params);
    expect(a).toEqual(b);
  });

  it('generated levels have even degree totals per faction', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const level = generateLevel({
        seed,
        world: 1,
        level: 1,
        gridWidth: 7,
        gridHeight: 7,
        numFactions: 2,
        minIslands: 8,
        maxIslands: 12,
        minDegree: 1,
        allowDoubleBridges: true,
        doubleBridgeChance: 0.3,
        extraBridgeChance: 0.4,
        maxForcedRatio: 1.0,
        minCrossings: 0
      });
      if (!level) continue;

      const factionDegrees = new Map<number, number>();
      for (const island of level.islands) {
        factionDegrees.set(island.faction, (factionDegrees.get(island.faction) ?? 0) + island.degree);
      }
      for (const [faction, total] of factionDegrees) {
        expect(total % 2, `Seed ${seed}: faction ${faction} has odd degree total ${total}`).toBe(0);
      }
    }
  });

  it('generated levels are solvable (brute force)', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const level = generateLevel({
        seed,
        world: 1,
        level: 1,
        gridWidth: 6,
        gridHeight: 6,
        numFactions: 1,
        minIslands: 4,
        maxIslands: 6,
        minDegree: 1,
        allowDoubleBridges: false,
        doubleBridgeChance: 0,
        extraBridgeChance: 0.2,
        maxForcedRatio: 1.0,
        minCrossings: 0
      });
      if (!level) continue;

      const grid = Grid.fromLevelData(level);
      const solution = findSolution(grid);
      expect(solution, `Seed ${seed}: level has no valid solution`).not.toBeNull();
    }
  });
});

describe('World generation - all presets', () => {
  for (const preset of WORLD_PRESETS) {
    describe(`World ${preset.world}`, () => {
      let levels: ReturnType<typeof generateWorld>;

      it(`generates ${preset.levels} levels`, () => {
        levels = generateWorld(preset);
        expect(levels).toHaveLength(preset.levels);
      });

      it('all levels have even degree totals per faction', () => {
        if (!levels) return;
        for (const level of levels) {
          const factionDegrees = new Map<number, number>();
          for (const island of level.islands) {
            factionDegrees.set(island.faction, (factionDegrees.get(island.faction) ?? 0) + island.degree);
          }
          for (const [faction, total] of factionDegrees) {
            expect(total % 2, `Level ${level.id}: faction ${faction} has odd total degree ${total}`).toBe(0);
          }
        }
      });

      it('all levels have reachable neighbors for every island', () => {
        if (!levels) return;
        for (const level of levels) {
          const grid = Grid.fromLevelData(level);
          for (const island of grid.islands) {
            const neighbors = grid.getNeighbors(island);
            const maxBridges = neighbors.length * 2;
            expect(maxBridges, `Level ${level.id}: island (${island.row},${island.col}) degree=${island.degree} has max capacity ${maxBridges}`).toBeGreaterThanOrEqual(island.degree);
          }
        }
      });

      it('all levels have sufficient islands', () => {
        if (!levels) return;
        for (const level of levels) {
          expect(level.islands.length, `Level ${level.id}`).toBeGreaterThanOrEqual(4);
        }
      });

      // Brute-force solvability only for small worlds (1-2) where it's computationally feasible
      if (preset.world <= 2) {
        it('all levels are solvable (brute force)', () => {
          if (!levels) return;
          for (const level of levels) {
            const grid = Grid.fromLevelData(level);
            const solution = findSolution(grid);
            expect(solution, `Level ${level.id} has no valid solution`).not.toBeNull();
          }
        });
      }

      // For larger worlds, verify solution-first construction guarantees
      if (preset.world >= 3) {
        it('all levels have non-trivial complexity', () => {
          if (!levels) return;
          for (const level of levels) {
            expect(level.parMoves, `Level ${level.id} par`).toBeGreaterThanOrEqual(8);
            expect(level.islands.length, `Level ${level.id} islands`).toBeGreaterThanOrEqual(10);
          }
        });
      }
    });
  }
});
