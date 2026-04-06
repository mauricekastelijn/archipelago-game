import Phaser from 'phaser';
import { APP } from '../config/app';
import { TextButton } from '../ui/TextButton';
import { SaveSystem } from '../systems/SaveSystem';
import { LevelLoader } from '../systems/LevelLoader';
import type { LevelData } from '../types/level';

const WORLD_NAMES: Record<number, string> = {
  1: 'Coral Shores',
  2: 'Emerald Canopy',
  3: 'Granite Peaks',
  4: 'Molten Caldera',
  5: 'Nimbus Heights'
};

const WORLD_COLORS: Record<number, number> = {
  1: 0x3b82f6,
  2: 0x22c55e,
  3: 0x94a3b8,
  4: 0xef4444,
  5: 0xa78bfa
};

const LEVELS_PER_WORLD = 5;
const TOTAL_WORLDS = 5;
const UNLOCK_THRESHOLD = 4; // complete 4 of 5 levels to unlock next world

export class WorldMapScene extends Phaser.Scene {
  constructor() {
    super('worldmap');
  }

  create(): void {
    const { width, height } = this.scale;
    const save = SaveSystem.load();

    this.cameras.main.setBackgroundColor(APP.backgroundColor);

    // Title
    this.add.text(width / 2, 36, 'Select World', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      color: '#f8fafc',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Back to menu button
    new TextButton(this, 36, 36, 48, 40, '←', () => {
      this.scene.start('menu');
    }).setDepth(10);

    // Calculate layout for world cards
    const cardWidth = width - 48;
    const cardHeight = 120;
    const cardGap = 12;
    const startY = 80;

    for (let w = 1; w <= TOTAL_WORLDS; w++) {
      const cy = startY + (w - 1) * (cardHeight + cardGap);
      const isUnlocked = this.isWorldUnlocked(w, save);

      this.drawWorldCard(width / 2, cy, cardWidth, cardHeight, w, isUnlocked, save);
    }

    // Settings button at the bottom
    new TextButton(this, width / 2, height - 40, 160, 44, '⚙ Settings', () => {
      this.scene.start('settings');
    }).setDepth(10);
  }

  private isWorldUnlocked(world: number, save: ReturnType<typeof SaveSystem.load>): boolean {
    if (world === 1) return true;
    // Count completed levels in the previous world
    let completed = 0;
    for (let lvl = 1; lvl <= LEVELS_PER_WORLD; lvl++) {
      if (save.levelResults[`${world - 1}-${lvl}`]?.completed) completed++;
    }
    return completed >= UNLOCK_THRESHOLD;
  }

  private drawWorldCard(
    cx: number, cy: number,
    cardWidth: number, cardHeight: number,
    world: number, isUnlocked: boolean,
    save: ReturnType<typeof SaveSystem.load>
  ): void {
    const worldColor = WORLD_COLORS[world] ?? 0x3b82f6;
    const alpha = isUnlocked ? 0.9 : 0.3;

    // Card background
    this.add.rectangle(cx, cy + cardHeight / 2, cardWidth, cardHeight, 0x1e293b, alpha)
      .setStrokeStyle(2, worldColor, alpha)
      .setOrigin(0.5);

    // World number + name
    const titleX = cx - cardWidth / 2 + 16;
    const titleY = cy + 16;

    this.add.text(titleX, titleY, `World ${world}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: isUnlocked ? '#f8fafc' : '#475569',
      fontStyle: 'bold'
    }).setOrigin(0, 0);

    this.add.text(titleX, titleY + 26, WORLD_NAMES[world] ?? '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: isUnlocked ? '#94a3b8' : '#334155'
    }).setOrigin(0, 0);

    if (!isUnlocked) {
      this.add.text(cx, cy + cardHeight / 2, '🔒', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '32px'
      }).setOrigin(0.5);
      return;
    }

    // Level buttons
    const buttonW = 44;
    const buttonH = 44;
    const gap = 8;
    const totalRowWidth = LEVELS_PER_WORLD * buttonW + (LEVELS_PER_WORLD - 1) * gap;
    const startX = cx - totalRowWidth / 2 + buttonW / 2;
    const buttonsY = cy + cardHeight - 32;

    // Star count for this world
    let totalStars = 0;
    let totalCompleted = 0;

    for (let lvl = 1; lvl <= LEVELS_PER_WORLD; lvl++) {
      const bx = startX + (lvl - 1) * (buttonW + gap);
      const result = save.levelResults[`${world}-${lvl}`];

      if (result?.completed) {
        totalStars += result.stars;
        totalCompleted++;
      }

      new TextButton(this, bx, buttonsY, buttonW, buttonH, `${lvl}`, () => {
        this.startLevel(world, lvl);
      }).setDepth(5);

      if (result?.completed) {
        this.add.text(bx, buttonsY + buttonH / 2 + 6, '★'.repeat(result.stars) + '☆'.repeat(3 - result.stars), {
          fontFamily: 'Arial, sans-serif',
          fontSize: '10px',
          color: '#fbbf24'
        }).setOrigin(0.5, 0);
      }
    }

    // Progress indicator
    const progressText = `${totalCompleted}/${LEVELS_PER_WORLD}  ★${totalStars}/${LEVELS_PER_WORLD * 3}`;
    this.add.text(cx + cardWidth / 2 - 16, titleY + 8, progressText, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      color: '#64748b'
    }).setOrigin(1, 0);
  }

  private async startLevel(world: number, level: number): Promise<void> {
    try {
      const levelData: LevelData = await LevelLoader.loadLevel(world, level);
      this.scene.start('play', { levelData });
      this.scene.launch('ui');
    } catch (err) {
      console.error('Failed to load level:', err);
    }
  }
}
