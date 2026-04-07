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
   * Find one bridge that should be changed.
   * Prefers removing clearly wrong bridges before suggesting new ones.
   * Returns undefined if no hint is found.
   */
  static findForcedMove(grid: Grid): HintResult | undefined {
    // Phase 1: find bridges that are clearly wrong and should be removed
    const wrongBridge = Solver.findWrongBridge(grid);
    if (wrongBridge) return wrongBridge;

    // Phase 2: find forced additions via constraint propagation
    return Solver.findForcedAddition(grid);
  }

  /**
   * Find a bridge that is definitely wrong:
   * - Bridge crosses another bridge
   * - Bridge contributes to an over-connected island
   */
  private static findWrongBridge(grid: Grid): HintResult | undefined {
    for (const bridge of grid.bridges.values()) {
      if (bridge.count === 0) continue;

      // Check if this bridge crosses another bridge
      if (grid.wouldCross(bridge.islandA, bridge.islandB)) {
        return { islandA: bridge.islandA, islandB: bridge.islandB, targetCount: 0 };
      }
    }

    // Check for over-connected islands — remove a bridge from the most over-connected
    for (const island of grid.islands) {
      const used = grid.getDegreeUsed(island);
      if (used <= island.degree) continue;

      // Find a bridge to remove: prefer bridges where the neighbor is also over-connected
      let bestBridge: { islandA: Island; islandB: Island } | null = null;
      let bestScore = -1;

      for (const bridge of grid.bridges.values()) {
        if (bridge.count === 0) continue;
        let neighbor: Island | null = null;
        if (bridge.islandA === island) neighbor = bridge.islandB;
        else if (bridge.islandB === island) neighbor = bridge.islandA;
        if (!neighbor) continue;

        const neighborOver = grid.getDegreeUsed(neighbor) - neighbor.degree;
        const score = Math.max(0, neighborOver) + 1;
        if (score > bestScore) {
          bestScore = score;
          bestBridge = { islandA: bridge.islandA, islandB: bridge.islandB };
        }
      }

      if (bestBridge) {
        const currentCount = grid.getBridgeCount(bestBridge.islandA, bestBridge.islandB);
        return { islandA: bestBridge.islandA, islandB: bestBridge.islandB, targetCount: currentCount - 1 };
      }
    }

    return undefined;
  }

  /**
   * Find one bridge that must exist in the solution via constraint propagation.
   */
  private static findForcedAddition(grid: Grid): HintResult | undefined {
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
