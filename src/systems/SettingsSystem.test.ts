import { beforeEach, describe, expect, it } from 'vitest';

import { SaveSystem } from './SaveSystem';
import { SettingsSystem } from './SettingsSystem';

describe('SettingsSystem', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads sound and music flags from the save state', () => {
    SaveSystem.save({
      currentWorld: 1,
      currentLevel: 1,
      levelResults: {},
      soundEnabled: false,
      musicEnabled: true
    });

    expect(SettingsSystem.isSoundEnabled()).toBe(false);
    expect(SettingsSystem.isMusicEnabled()).toBe(true);
  });

  it('toggles sound and persists the result', () => {
    expect(SettingsSystem.toggleSound()).toBe(false);
    expect(SettingsSystem.isSoundEnabled()).toBe(false);

    expect(SettingsSystem.toggleSound()).toBe(true);
    expect(SettingsSystem.isSoundEnabled()).toBe(true);
  });

  it('toggles music and persists the result', () => {
    expect(SettingsSystem.toggleMusic()).toBe(false);
    expect(SettingsSystem.isMusicEnabled()).toBe(false);

    expect(SettingsSystem.toggleMusic()).toBe(true);
    expect(SettingsSystem.isMusicEnabled()).toBe(true);
  });
});