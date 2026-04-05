/// <reference types="vite/client" />

import type { LevelData } from '../types/level';

const levelCache = new Map<number, LevelData[]>();

export class LevelLoader {
  static async loadWorld(world: number): Promise<LevelData[]> {
    const cached = levelCache.get(world);
    if (cached) return cached;

    const url = `${import.meta.env.BASE_URL}levels/world-${world}.json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load world ${world}: ${response.statusText}`);
    }
    const levels = (await response.json()) as LevelData[];
    levelCache.set(world, levels);
    return levels;
  }

  static async loadLevel(world: number, level: number): Promise<LevelData> {
    const levels = await LevelLoader.loadWorld(world);
    const data = levels.find((l) => l.level === level);
    if (!data) {
      throw new Error(`Level ${level} not found in world ${world}`);
    }
    return data;
  }
}
