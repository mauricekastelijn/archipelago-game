import { describe, it, expect } from 'vitest';
import { generateLevel, generateWorld, WORLD_PRESETS } from './LevelGenerator';
import { Grid } from './Grid';
import { Island } from './Island';

/**
 * Brute-force verification that a level is solvable.
 * Tries all possible bridge combinations via backtracking.
 */
function findSolution(grid: Grid): Map<string, number> | null {
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

  function backtrack(index: number): boolean {
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
        if (count === 0) {
          if (backtrack(index + 1)) {
            result.set(slots[index].key, 0);
            return true;
          }
        }
        continue;
      }

      const aUsed = grid.getDegreeUsed(a);
      const bUsed = grid.getDegreeUsed(b);
      if (aUsed > a.degree || bUsed > b.degree) {
        while (grid.getBridgeCount(a, b) !== 0) grid.cycleBridge(a, b);
        continue;
      }

      if (backtrack(index + 1)) {
        result.set(slots[index].key, count);
        return true;
      }

      while (grid.getBridgeCount(a, b) !== 0) grid.cycleBridge(a, b);
    }

    return false;
  }

  if (backtrack(0)) return result;
  return null;
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
      minIslandsPerFaction: 3,
      maxIslandsPerFaction: 4,
      allowDoubleBridges: false,
      doubleBridgeChance: 0
    });

    expect(level).not.toBeNull();
    expect(level!.islands.length).toBeGreaterThanOrEqual(3);
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
      minIslandsPerFaction: 2,
      maxIslandsPerFaction: 4,
      allowDoubleBridges: false,
      doubleBridgeChance: 0
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
        gridWidth: 6,
        gridHeight: 6,
        numFactions: 2,
        minIslandsPerFaction: 2,
        maxIslandsPerFaction: 4,
        allowDoubleBridges: true,
        doubleBridgeChance: 0.3
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
        numFactions: 2,
        minIslandsPerFaction: 2,
        maxIslandsPerFaction: 3,
        allowDoubleBridges: false,
        doubleBridgeChance: 0
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
      const levels = generateWorld(preset);

      it(`generates ${preset.levels} levels`, () => {
        expect(levels).toHaveLength(preset.levels);
      });

      for (const level of levels) {
        it(`Level ${level.level} (${level.id}) has even degree totals per faction`, () => {
          const factionDegrees = new Map<number, number>();
          for (const island of level.islands) {
            factionDegrees.set(island.faction, (factionDegrees.get(island.faction) ?? 0) + island.degree);
          }
          for (const [faction, total] of factionDegrees) {
            expect(total % 2, `Faction ${faction} has odd total degree ${total}`).toBe(0);
          }
        });

        it(`Level ${level.level} (${level.id}) has reachable neighbors for every island`, () => {
          const grid = Grid.fromLevelData(level);
          for (const island of grid.islands) {
            const neighbors = grid.getNeighbors(island);
            const maxBridges = neighbors.length * 2;
            expect(maxBridges, `Island at (${island.row},${island.col}) degree=${island.degree} has max capacity ${maxBridges}`).toBeGreaterThanOrEqual(island.degree);
          }
        });

        it(`Level ${level.level} (${level.id}) is solvable`, () => {
          const grid = Grid.fromLevelData(level);
          const solution = findSolution(grid);
          expect(solution, `Level ${level.id} has no valid solution`).not.toBeNull();
        });
      }
    });
  }
});
