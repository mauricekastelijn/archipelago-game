import { beforeEach, describe, expect, it } from 'vitest';

import { APP } from '../config/app';
import { SaveSystem } from './SaveSystem';

describe('SaveSystem', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default data when no save exists', () => {
    expect(SaveSystem.load()).toEqual({
      bestScore: 0,
      soundEnabled: true,
      musicEnabled: true
    });
  });

  it('falls back to defaults when saved data is invalid', () => {
    localStorage.setItem(APP.saveKey, '{not-valid-json');

    expect(SaveSystem.load()).toEqual({
      bestScore: 0,
      soundEnabled: true,
      musicEnabled: true
    });
  });

  it('merges updates with the existing save state', () => {
    SaveSystem.save({
      bestScore: 10,
      soundEnabled: true,
      musicEnabled: true
    });

    const next = SaveSystem.update({ bestScore: 25, soundEnabled: false });

    expect(next).toEqual({
      bestScore: 25,
      soundEnabled: false,
      musicEnabled: true
    });
    expect(SaveSystem.load()).toEqual(next);
  });
});