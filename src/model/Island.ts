export class Island {
  readonly row: number;
  readonly col: number;
  readonly faction: number;
  readonly degree: number;

  constructor(row: number, col: number, faction: number, degree: number) {
    this.row = row;
    this.col = col;
    this.faction = faction;
    this.degree = degree;
  }

  get key(): string {
    return `${this.row},${this.col}`;
  }
}
