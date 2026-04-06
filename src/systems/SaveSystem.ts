import { APP } from '../config/app';
import type { SaveData, Difficulty } from '../types/save';

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
function isValidDifficulty(v: unknown): v is Difficulty {
  return typeof v === 'string' && VALID_DIFFICULTIES.includes(v as Difficulty);
}

const DEFAULT_SAVE: SaveData = {
  currentWorld: 1,
  currentLevel: 1,
  levelResults: {},
  soundEnabled: true,
  musicEnabled: true,
  quickPlayDifficulty: 'medium',
  quickPlayFactions: 1
};

export class SaveSystem {
  static load(): SaveData {
    try {
      const raw = localStorage.getItem(APP.saveKey);
      if (!raw) return { ...DEFAULT_SAVE, levelResults: {} };
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      return {
        currentWorld: typeof parsed.currentWorld === 'number' ? parsed.currentWorld : DEFAULT_SAVE.currentWorld,
        currentLevel: typeof parsed.currentLevel === 'number' ? parsed.currentLevel : DEFAULT_SAVE.currentLevel,
        levelResults: typeof parsed.levelResults === 'object' && parsed.levelResults !== null
          ? parsed.levelResults
          : {},
        soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : DEFAULT_SAVE.soundEnabled,
        musicEnabled: typeof parsed.musicEnabled === 'boolean' ? parsed.musicEnabled : DEFAULT_SAVE.musicEnabled,
        quickPlayDifficulty: isValidDifficulty(parsed.quickPlayDifficulty) ? parsed.quickPlayDifficulty : DEFAULT_SAVE.quickPlayDifficulty,
        quickPlayFactions: typeof parsed.quickPlayFactions === 'number' && parsed.quickPlayFactions >= 1 && parsed.quickPlayFactions <= 4
          ? parsed.quickPlayFactions : DEFAULT_SAVE.quickPlayFactions
      };
    } catch {
      return { ...DEFAULT_SAVE, levelResults: {} };
    }
  }

  static save(data: SaveData): void {
    localStorage.setItem(APP.saveKey, JSON.stringify(data));
  }

  static update(patch: Partial<SaveData>): SaveData {
    const next = { ...SaveSystem.load(), ...patch };
    SaveSystem.save(next);
    return next;
  }
}
