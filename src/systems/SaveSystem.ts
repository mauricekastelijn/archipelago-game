import { APP } from '../config/app';
import type { SaveData } from '../types/save';

const DEFAULT_SAVE: SaveData = {
  bestScore: 0,
  soundEnabled: true,
  musicEnabled: true
};

export class SaveSystem {
  static load(): SaveData {
    try {
      const raw = localStorage.getItem(APP.saveKey);
      if (!raw) return { ...DEFAULT_SAVE };
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      return {
        bestScore: typeof parsed.bestScore === 'number' ? parsed.bestScore : DEFAULT_SAVE.bestScore,
        soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : DEFAULT_SAVE.soundEnabled,
        musicEnabled: typeof parsed.musicEnabled === 'boolean' ? parsed.musicEnabled : DEFAULT_SAVE.musicEnabled
      };
    } catch {
      return { ...DEFAULT_SAVE };
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
