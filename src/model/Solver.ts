import { Grid } from './Grid';
import { Bridge } from './Bridge';
import type { Island } from './Island';
import type { LevelData } from '../types/level';

export interface HintResult {
  islandA: Island;
  islandB: Island;
  targetCount: number;
}

/** A solved bridge assignment: bridgeKey -> count. */
export type Solution = Map<string, number>;

/* ------------------------------------------------------------------ */
/*  Pure-data solver (no Grid mutation during backtracking)            */
/* ------------------------------------------------------------------ */

interface SolverSlot {
  key: string;
  aIdx: number;
  bIdx: number;
  crossingSlots: number[];
}

interface SolverState {
  counts: number[];
  degreeUsed: number[];
  fixed: boolean[];
}

export class Solver {

  static solve(
    grid: Grid,
    maxSolutions = 1,
    maxNodes = 10_000_000,
  ): Solution[] {
    const model = Solver.buildSolverModel(grid);
    const { slots, islandSlots, islandDegrees } = model;
    const numIslands = grid.islands.length;
    const solutions: Solution[] = [];
    let nodes = 0;

    const state: SolverState = {
      counts: new Array(slots.length).fill(0),
      degreeUsed: new Array(numIslands).fill(0),
      fixed: new Array(slots.length).fill(false),
    };

    function snapshot() {
      return {
        counts: state.counts.slice(),
        degreeUsed: state.degreeUsed.slice(),
        fixed: state.fixed.slice(),
      };
    }

    function restore(snap: ReturnType<typeof snapshot>) {
      for (let i = 0; i < snap.counts.length; i++) state.counts[i] = snap.counts[i];
      for (let i = 0; i < snap.degreeUsed.length; i++) state.degreeUsed[i] = snap.degreeUsed[i];
      for (let i = 0; i < snap.fixed.length; i++) state.fixed[i] = snap.fixed[i];
    }

    function setSlot(si: number, count: number): boolean {
      const old = state.counts[si];
      if (old === count) { state.fixed[si] = true; return true; }
      const diff = count - old;
      state.counts[si] = count;
      state.fixed[si] = true;
      const s = slots[si];
      state.degreeUsed[s.aIdx] += diff;
      state.degreeUsed[s.bIdx] += diff;
      return state.degreeUsed[s.aIdx] <= islandDegrees[s.aIdx] &&
             state.degreeUsed[s.bIdx] <= islandDegrees[s.bIdx];
    }

    function getMaxForSlot(si: number): number {
      for (const ci of slots[si].crossingSlots) {
        if (state.counts[ci] > 0) return 0;
      }
      return 2;
    }

    function propagate(): boolean {
      let changed = true;
      while (changed) {
        changed = false;
        for (let ii = 0; ii < numIslands; ii++) {
          const remaining = islandDegrees[ii] - state.degreeUsed[ii];
          if (remaining < 0) return false;
          if (remaining === 0) {
            for (const si of islandSlots[ii]) {
              if (state.fixed[si]) continue;
              if (!setSlot(si, 0)) return false;
              changed = true;
            }
            continue;
          }
          const unfixed: Array<{ si: number; cap: number }> = [];
          let totalCap = 0;
          for (const si of islandSlots[ii]) {
            if (state.fixed[si]) continue;
            const maxV = getMaxForSlot(si);
            if (maxV === 0) {
              if (!setSlot(si, 0)) return false;
              changed = true;
              continue;
            }
            const s = slots[si];
            const neighborIdx = s.aIdx === ii ? s.bIdx : s.aIdx;
            const neighborRemaining = islandDegrees[neighborIdx] - state.degreeUsed[neighborIdx];
            const cap = Math.min(maxV, Math.max(0, neighborRemaining));
            if (cap <= 0) {
              if (!setSlot(si, 0)) return false;
              changed = true;
              continue;
            }
            unfixed.push({ si, cap });
            totalCap += cap;
          }
          if (totalCap < remaining) return false;
          if (totalCap === remaining) {
            for (const { si, cap } of unfixed) {
              if (!setSlot(si, cap)) return false;
              changed = true;
            }
          } else if (unfixed.length === 1) {
            if (!setSlot(unfixed[0].si, remaining)) return false;
            changed = true;
          }
        }
      }
      return true;
    }

    function checkConnectivity(): boolean {
      const factionIslands = new Map<number, number[]>();
      for (let i = 0; i < numIslands; i++) {
        const f = grid.islands[i].faction;
        if (!factionIslands.has(f)) factionIslands.set(f, []);
        factionIslands.get(f)!.push(i);
      }
      for (const [, indices] of factionIslands) {
        if (indices.length <= 1) continue;
        const visited = new Set<number>();
        const queue = [indices[0]];
        visited.add(indices[0]);
        while (queue.length > 0) {
          const cur = queue.shift()!;
          for (const si of islandSlots[cur]) {
            if (state.counts[si] === 0) continue;
            const s = slots[si];
            const neighbor = s.aIdx === cur ? s.bIdx : s.aIdx;
            if (grid.islands[neighbor].faction === grid.islands[cur].faction && !visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          }
        }
        if (visited.size !== indices.length) return false;
      }
      return true;
    }

    function solveRec(): boolean {
      nodes++;
      if (nodes > maxNodes) return true;
      const snap = snapshot();
      if (!propagate()) { restore(snap); return false; }
      let bestSlot = -1;
      let bestConstraint = Infinity;
      for (let si = 0; si < slots.length; si++) {
        if (state.fixed[si]) continue;
        const s = slots[si];
        const constraint = Math.min(
          islandDegrees[s.aIdx] - state.degreeUsed[s.aIdx],
          islandDegrees[s.bIdx] - state.degreeUsed[s.bIdx],
        );
        if (constraint < bestConstraint) {
          bestConstraint = constraint;
          bestSlot = si;
        }
      }
      if (bestSlot === -1) {
        for (let ii = 0; ii < numIslands; ii++) {
          if (state.degreeUsed[ii] !== islandDegrees[ii]) { restore(snap); return false; }
        }
        if (!checkConnectivity()) { restore(snap); return false; }
        const sol: Solution = new Map();
        for (let si = 0; si < slots.length; si++) {
          sol.set(slots[si].key, state.counts[si]);
        }
        solutions.push(sol);
        restore(snap);
        return solutions.length >= maxSolutions;
      }
      const maxVal = getMaxForSlot(bestSlot);
      for (let count = Math.min(2, maxVal); count >= 0; count--) {
        const branchSnap = snapshot();
        if (setSlot(bestSlot, count)) {
          if (solveRec()) return true;
          if (nodes > maxNodes) return true;
        }
        restore(branchSnap);
      }
      restore(snap);
      return false;
    }

    solveRec();
    return solutions;
  }

  static solveLevel(
    levelData: LevelData,
    maxSolutions = 1,
    maxNodes = 10_000_000,
  ): Solution[] {
    const grid = Grid.fromLevelData(levelData);
    return Solver.solve(grid, maxSolutions, maxNodes);
  }

  static hasUniqueSolution(levelData: LevelData, maxNodes = 2_000_000): boolean {
    const solutions = Solver.solveLevel(levelData, 2, maxNodes);
    return solutions.length === 1;
  }

  static findHint(grid: Grid, solution: Solution): HintResult | undefined {
    for (const bridge of grid.bridges.values()) {
      if (bridge.count === 0) continue;
      const targetCount = solution.get(bridge.key) ?? 0;
      if (bridge.count > targetCount) {
        return { islandA: bridge.islandA, islandB: bridge.islandB, targetCount };
      }
    }
    for (const [key, targetCount] of solution) {
      if (targetCount === 0) continue;
      const bridge = grid.bridges.get(key);
      const currentCount = bridge?.count ?? 0;
      if (currentCount < targetCount) {
        const parts = key.split('-');
        const [r1, c1] = parts[0].split(',').map(Number);
        const [r2, c2] = parts[1].split(',').map(Number);
        const islandA = grid.getIsland(r1, c1);
        const islandB = grid.getIsland(r2, c2);
        if (islandA && islandB) {
          return { islandA, islandB, targetCount: currentCount + 1 };
        }
      }
    }
    return undefined;
  }

  static findForcedMove(grid: Grid): HintResult | undefined {
    for (const bridge of grid.bridges.values()) {
      if (bridge.count === 0) continue;
      if (grid.wouldCross(bridge.islandA, bridge.islandB)) {
        return { islandA: bridge.islandA, islandB: bridge.islandB, targetCount: 0 };
      }
    }
    for (const island of grid.islands) {
      if (grid.getDegreeUsed(island) > island.degree) {
        for (const bridge of grid.bridges.values()) {
          if (bridge.count === 0) continue;
          if (bridge.islandA === island || bridge.islandB === island) {
            return { islandA: bridge.islandA, islandB: bridge.islandB, targetCount: bridge.count - 1 };
          }
        }
      }
    }
    for (const island of grid.islands) {
      const neighbors = grid.getNeighbors(island);
      const remaining = island.degree - grid.getDegreeUsed(island);
      if (remaining <= 0) continue;
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
      const totalAvailable = available.reduce((sum, a) => sum + a.canAdd, 0);
      if (totalAvailable === remaining || available.length === 1) {
        const { neighbor } = available[0];
        const currentCount = grid.getBridgeCount(island, neighbor);
        return { islandA: island, islandB: neighbor, targetCount: currentCount + 1 };
      }
    }
    return undefined;
  }

  private static buildSolverModel(grid: Grid): {
    slots: SolverSlot[];
    islandSlots: number[][];
    islandDegrees: number[];
  } {
    const islandIndex = new Map<string, number>();
    for (let i = 0; i < grid.islands.length; i++) {
      islandIndex.set(grid.islands[i].key, i);
    }
    const slots: SolverSlot[] = [];
    const seen = new Set<string>();
    for (const island of grid.islands) {
      for (const neighbor of grid.getNeighbors(island)) {
        const key = Bridge.makeKey(island.row, island.col, neighbor.row, neighbor.col);
        if (!seen.has(key)) {
          seen.add(key);
          slots.push({
            key,
            aIdx: islandIndex.get(island.key)!,
            bIdx: islandIndex.get(neighbor.key)!,
            crossingSlots: [],
          });
        }
      }
    }
    const slotCells: Array<Array<{ row: number; col: number }>> = [];
    for (const s of slots) {
      const a = grid.islands[s.aIdx];
      const b = grid.islands[s.bIdx];
      const bridge = new Bridge(a, b);
      slotCells.push(bridge.occupiedCells());
    }
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        let crosses = false;
        for (const ci of slotCells[i]) {
          for (const cj of slotCells[j]) {
            if (ci.row === cj.row && ci.col === cj.col) {
              crosses = true;
              break;
            }
          }
          if (crosses) break;
        }
        if (crosses) {
          slots[i].crossingSlots.push(j);
          slots[j].crossingSlots.push(i);
        }
      }
    }
    const islandSlots: number[][] = new Array(grid.islands.length).fill(null).map(() => []);
    for (let si = 0; si < slots.length; si++) {
      islandSlots[slots[si].aIdx].push(si);
      islandSlots[slots[si].bIdx].push(si);
    }
    const islandDegrees = grid.islands.map(isl => isl.degree);
    return { slots, islandSlots, islandDegrees };
  }
}
