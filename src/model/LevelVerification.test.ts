import { describe, it, expect } from 'vitest';
import { Grid } from './Grid';
import { Island } from './Island';
import type { LevelData } from '../types/level';
import levelData from '../../public/levels/world-1.json';

/**
 * Brute-force verification that a level is solvable.
 * Tries all possible bridge combinations via backtracking.
 */
function findSolution(grid: Grid): Map<string, number> | null {
    // Build list of possible bridge slots (pairs of same-faction neighbors)
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
        // Check if any island is over-connected
        for (const island of grid.islands) {
            if (grid.getDegreeUsed(island) > island.degree) return false;
        }

        if (index === slots.length) {
            return grid.isSolved();
        }

        const { a, b } = slots[index];

        // Try 0, 1, 2 bridges for this slot
        for (const count of [0, 1, 2]) {
            // Reset to 0 first
            while (grid.getBridgeCount(a, b) !== 0) grid.cycleBridge(a, b);

            // Set to target count
            for (let i = 0; i < count; i++) grid.cycleBridge(a, b);

            // Check crossing constraint
            if (count > 0 && grid.wouldCross(a, b)) {
                // Can't use this bridge, only try 0
                while (grid.getBridgeCount(a, b) !== 0) grid.cycleBridge(a, b);
                if (count === 0) {
                    if (backtrack(index + 1)) {
                        result.set(slots[index].key, 0);
                        return true;
                    }
                }
                continue;
            }

            // Check degree constraint early
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

            // Reset
            while (grid.getBridgeCount(a, b) !== 0) grid.cycleBridge(a, b);
        }

        return false;
    }

    if (backtrack(0)) return result;
    return null;
}

describe('World 1 level verification', () => {
    const levels = levelData as LevelData[];

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
                expect(maxBridges, `Island at (${island.row},${island.col}) faction=${island.faction} degree=${island.degree} has max capacity ${maxBridges}`).toBeGreaterThanOrEqual(island.degree);
            }
        });

        it(`Level ${level.level} (${level.id}) is solvable`, () => {
            const grid = Grid.fromLevelData(level);
            const solution = findSolution(grid);
            expect(solution, `Level ${level.id} has no valid solution`).not.toBeNull();
        });
    }
});
