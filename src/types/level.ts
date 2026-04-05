export interface IslandData {
  row: number;
  col: number;
  faction: number;
  degree: number;
}

export interface LevelData {
  id: string;
  world: number;
  level: number;
  gridWidth: number;
  gridHeight: number;
  islands: IslandData[];
  parMoves: number;
}
