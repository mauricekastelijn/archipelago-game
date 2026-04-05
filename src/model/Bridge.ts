import type { Island } from './Island';

export class Bridge {
  readonly islandA: Island;
  readonly islandB: Island;
  count: number;

  constructor(islandA: Island, islandB: Island, count: number = 0) {
    this.islandA = islandA;
    this.islandB = islandB;
    this.count = count;
  }

  get key(): string {
    return Bridge.makeKey(this.islandA.row, this.islandA.col, this.islandB.row, this.islandB.col);
  }

  get isHorizontal(): boolean {
    return this.islandA.row === this.islandB.row;
  }

  get isVertical(): boolean {
    return this.islandA.col === this.islandB.col;
  }

  get faction(): number {
    return this.islandA.faction;
  }

  /** Returns the cells occupied by this bridge (excluding the island cells themselves). */
  occupiedCells(): Array<{ row: number; col: number }> {
    const cells: Array<{ row: number; col: number }> = [];
    if (this.isHorizontal) {
      const row = this.islandA.row;
      const minCol = Math.min(this.islandA.col, this.islandB.col);
      const maxCol = Math.max(this.islandA.col, this.islandB.col);
      for (let col = minCol + 1; col < maxCol; col++) {
        cells.push({ row, col });
      }
    } else {
      const col = this.islandA.col;
      const minRow = Math.min(this.islandA.row, this.islandB.row);
      const maxRow = Math.max(this.islandA.row, this.islandB.row);
      for (let row = minRow + 1; row < maxRow; row++) {
        cells.push({ row, col });
      }
    }
    return cells;
  }

  static makeKey(r1: number, c1: number, r2: number, c2: number): string {
    if (r1 < r2 || (r1 === r2 && c1 < c2)) {
      return `${r1},${c1}-${r2},${c2}`;
    }
    return `${r2},${c2}-${r1},${c1}`;
  }
}
