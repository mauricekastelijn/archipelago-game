export interface LevelResult {
  completed: boolean;
  stars: number;
  bestMoveCount: number;
}

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface SaveData {
  currentWorld: number;
  currentLevel: number;
  levelResults: Record<string, LevelResult>;
  soundEnabled: boolean;
  musicEnabled: boolean;
  quickPlayDifficulty: Difficulty;
  quickPlayFactions: number;
}
