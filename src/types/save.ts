export interface LevelResult {
  completed: boolean;
  stars: number;
  bestMoveCount: number;
}

export interface SaveData {
  currentWorld: number;
  currentLevel: number;
  levelResults: Record<string, LevelResult>;
  soundEnabled: boolean;
  musicEnabled: boolean;
}
