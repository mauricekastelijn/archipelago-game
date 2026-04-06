import { beforeEach, describe, expect, it } from 'vitest';

import { APP } from '../config/app';
import { SaveSystem } from './SaveSystem';

describe('SaveSystem', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default data when no save exists', () => {
    expect(SaveSystem.load()).toEqual({
      currentWorld: 1,
      currentLevel: 1,
      levelResults: {},
      soundEnabled: true,
      musicEnabled: true,
      quickPlayDifficulty: 'medium',
      quickPlayFactions: 1
    });
  });

  it('falls back to defaults when saved data is invalid', () => {
    localStorage.setItem(APP.saveKey, '{not-valid-json');

    expect(SaveSystem.load()).toEqual({
      currentWorld: 1,
      currentLevel: 1,
      levelResults: {},
      soundEnabled: true,
      musicEnabled: true,
      quickPlayDifficulty: 'medium',
      quickPlayFactions: 1
    });
  });

  it('merges updates with the existing save state', () => {
    SaveSystem.save({
      currentWorld: 1,
      currentLevel: 3,
      levelResults: {},
      soundEnabled: true,
      musicEnabled: true,
      quickPlayDifficulty: 'medium',
      quickPlayFactions: 1
    });

    const next = SaveSystem.update({ currentLevel: 5, soundEnabled: false });

    expect(next).toEqual({
      currentWorld: 1,
      currentLevel: 5,
      levelResults: {},
      soundEnabled: false,
      musicEnabled: true,
      quickPlayDifficulty: 'medium',
      quickPlayFactions: 1
    });
    expect(SaveSystem.load()).toEqual(next);
  });
});