import { SaveSystem } from './SaveSystem';

export class SettingsSystem {
  static isSoundEnabled(): boolean {
    return SaveSystem.load().soundEnabled;
  }

  static isMusicEnabled(): boolean {
    return SaveSystem.load().musicEnabled;
  }

  static toggleSound(): boolean {
    const current = SaveSystem.load();
    const next = !current.soundEnabled;
    SaveSystem.save({ ...current, soundEnabled: next });
    return next;
  }

  static toggleMusic(): boolean {
    const current = SaveSystem.load();
    const next = !current.musicEnabled;
    SaveSystem.save({ ...current, musicEnabled: next });
    return next;
  }
}
