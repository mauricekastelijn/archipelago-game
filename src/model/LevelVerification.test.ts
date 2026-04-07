import { describe, it, expect } from 'vitest';
import { Grid } from './Grid';
import { Island } from './Island';
import type { LevelData } from '../types/level';
import world1Data from '../../public/levels/world-1.json';
import world2Data from '../../public/levels/world-2.json';
import world3Data from '../../public/levels/world-3.json';
import world4Data from '../../public/levels/world-4.json';
import world5Data from '../../public/levels/world-5.json';

/**
 * Brute-force verification that a level is solvable.
 * Tries all possible bridge combinations via backtracking.
 * Has a node budget to avoid hanging on large levels.
 */
function findSolution(grid: Grid, maxNodes = 2_000_000): Map<string, number> | null {
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
    let nodes = 0;

    function backtrack(index: number): boolean | 'timeout' {
        nodes++;
        if (nodes > maxNodes) return 'timeout';

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
                while (grid.getBridgeCount(a, b) !== 0) grid.cycleBridge(a, b);
                continue;
            }

            // Check degree constraint early
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

            // Reset
            while (grid.getBridgeCount(a, b) !== 0) grid.cycleBridge(a, b);
        }

        return false;
    }

    const r = backtrack(0);
    if (r === true) return result;
    return null;
}

describe('World 1 level verification', () => {
    const levels = world1Data as LevelData[];

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

function verifyWorld(worldName: string, levels: LevelData[], bruteForce = false): void {
    describe(`${worldName} level verification`, () => {
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

            if (bruteForce) {
                it(`Level ${level.level} (${level.id}) is solvable`, () => {
                    const grid = Grid.fromLevelData(level);
                    const solution = findSolution(grid);
                    expect(solution, `Level ${level.id} has no valid solution`).not.toBeNull();
                });
            }
        }
    });
}

verifyWorld('World 2', world2Data as LevelData[], true);
verifyWorld('World 3', world3Data as LevelData[]);
verifyWorld('World 4', world4Data as LevelData[]);
verifyWorld('World 5', world5Data as LevelData[]);
