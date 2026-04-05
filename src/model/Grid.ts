import { Island } from './Island';
import { Bridge } from './Bridge';
import type { LevelData } from '../types/level';

export class Grid {
  readonly width: number;
  readonly height: number;
  readonly islands: Island[];
  readonly bridges: Map<string, Bridge>;

  private islandAt: Map<string, Island>;

  constructor(width: number, height: number, islands: Island[]) {
    this.width = width;
    this.height = height;
    this.islands = islands;
    this.bridges = new Map();
    this.islandAt = new Map();
    for (const island of islands) {
      this.islandAt.set(island.key, island);
    }
  }

  static fromLevelData(data: LevelData): Grid {
    const islands = data.islands.map(
      (d) => new Island(d.row, d.col, d.faction, d.degree)
    );
    return new Grid(data.gridWidth, data.gridHeight, islands);
  }

  getIsland(row: number, col: number): Island | undefined {
    return this.islandAt.get(`${row},${col}`);
  }

  /** Find eligible neighbors: same faction, same row or column, no island between them. */
  getNeighbors(island: Island): Island[] {
    const neighbors: Island[] = [];
    const directions: Array<{ dr: number; dc: number }> = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 }
    ];

    for (const { dr, dc } of directions) {
      let r = island.row + dr;
      let c = island.col + dc;
      while (r >= 0 && r < this.height && c >= 0 && c < this.width) {
        const other = this.getIsland(r, c);
        if (other) {
          if (other.faction === island.faction) {
            neighbors.push(other);
          }
          break;
        }
        r += dr;
        c += dc;
      }
    }
    return neighbors;
  }

  getBridge(islandA: Island, islandB: Island): Bridge | undefined {
    const key = Bridge.makeKey(islandA.row, islandA.col, islandB.row, islandB.col);
    return this.bridges.get(key);
  }

  getBridgeCount(islandA: Island, islandB: Island): number {
    return this.getBridge(islandA, islandB)?.count ?? 0;
  }

  /** Cycle bridge count: 0 → 1 → 2 → 0. Returns the new count. */
  cycleBridge(islandA: Island, islandB: Island): number {
    const key = Bridge.makeKey(islandA.row, islandA.col, islandB.row, islandB.col);
    let bridge = this.bridges.get(key);
    if (!bridge) {
      bridge = new Bridge(islandA, islandB, 0);
      this.bridges.set(key, bridge);
    }
    bridge.count = (bridge.count + 1) % 3;
    return bridge.count;
  }

  /** Set bridge count directly (for undo/redo). */
  setBridgeCount(bridgeKey: string, count: number): void {
    const bridge = this.bridges.get(bridgeKey);
    if (bridge) {
      bridge.count = count;
    }
  }

  /** Total bridges attached to an island. */
  getDegreeUsed(island: Island): number {
    let total = 0;
    for (const bridge of this.bridges.values()) {
      if (bridge.count === 0) continue;
      if (bridge.islandA === island || bridge.islandB === island) {
        total += bridge.count;
      }
    }
    return total;
  }

  /** Check if an island's degree is exactly satisfied. */
  isIslandSatisfied(island: Island): boolean {
    return this.getDegreeUsed(island) === island.degree;
  }

  /** Check if a bridge would cross any existing bridge of a different faction. */
  wouldCross(islandA: Island, islandB: Island): boolean {
    const testBridge = new Bridge(islandA, islandB);
    const testCells = testBridge.occupiedCells();

    for (const bridge of this.bridges.values()) {
      if (bridge.count === 0) continue;
      if (bridge.faction === islandA.faction) continue;

      const existingCells = bridge.occupiedCells();
      for (const tc of testCells) {
        for (const ec of existingCells) {
          if (tc.row === ec.row && tc.col === ec.col) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /** Check if all islands are satisfied. */
  allDegreesSatisfied(): boolean {
    return this.islands.every((island) => this.isIslandSatisfied(island));
  }

  /** Check if all islands of a faction are connected via bridges. */
  isFactionConnected(faction: number): boolean {
    const factionIslands = this.islands.filter((i) => i.faction === faction);
    if (factionIslands.length <= 1) return true;

    const visited = new Set<string>();
    const queue: Island[] = [factionIslands[0]];
    visited.add(factionIslands[0].key);

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const bridge of this.bridges.values()) {
        if (bridge.count === 0) continue;
        let neighbor: Island | undefined;
        if (bridge.islandA === current) neighbor = bridge.islandB;
        else if (bridge.islandB === current) neighbor = bridge.islandA;
        if (neighbor && neighbor.faction === faction && !visited.has(neighbor.key)) {
          visited.add(neighbor.key);
          queue.push(neighbor);
        }
      }
    }
    return visited.size === factionIslands.length;
  }

  /** Check win condition: all degrees satisfied, all factions connected, no crossings. */
  isSolved(): boolean {
    if (!this.allDegreesSatisfied()) return false;

    const factions = new Set(this.islands.map((i) => i.faction));
    for (const faction of factions) {
      if (!this.isFactionConnected(faction)) return false;
    }

    return true;
  }

  /** Reset all bridges to 0. */
  reset(): void {
    this.bridges.clear();
  }
}
