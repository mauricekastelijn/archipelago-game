import type { Grid } from './Grid';
import type { Island } from './Island';

export interface HintResult {
  islandA: Island;
  islandB: Island;
  targetCount: number;
}

/**
 * Lightweight constraint propagation solver for hints and validation.
 * No backtracking — uses forced-move detection only.
 */
export class Solver {
  /**
   * Find one bridge that must exist in the solution.
   * Returns undefined if no forced move is found.
   */
  static findForcedMove(grid: Grid): HintResult | undefined {
    for (const island of grid.islands) {
      const neighbors = grid.getNeighbors(island);
      const currentDegree = grid.getDegreeUsed(island);
      const remaining = island.degree - currentDegree;

      if (remaining <= 0) continue;

      // Find neighbors that can still accept bridges
      const available: Array<{ neighbor: Island; canAdd: number }> = [];
      for (const neighbor of neighbors) {
        const bridgeCount = grid.getBridgeCount(island, neighbor);
        const canAdd = 2 - bridgeCount;
        if (canAdd > 0 && !grid.wouldCross(island, neighbor)) {
          const neighborRemaining = neighbor.degree - grid.getDegreeUsed(neighbor);
          if (neighborRemaining > 0) {
            available.push({ neighbor, canAdd: Math.min(canAdd, neighborRemaining) });
          }
        }
      }

      // If remaining degree equals total available slots, all bridges are forced
      const totalAvailable = available.reduce((sum, a) => sum + a.canAdd, 0);
      if (totalAvailable === remaining) {
        for (const { neighbor } of available) {
          const currentCount = grid.getBridgeCount(island, neighbor);
          if (currentCount < 2) {
            return { islandA: island, islandB: neighbor, targetCount: currentCount + 1 };
          }
        }
      }

      // If only one neighbor available and remaining > 0, that bridge is forced
      if (available.length === 1) {
        const { neighbor } = available[0];
        const currentCount = grid.getBridgeCount(island, neighbor);
        return { islandA: island, islandB: neighbor, targetCount: currentCount + 1 };
      }
    }
    return undefined;
  }
}
