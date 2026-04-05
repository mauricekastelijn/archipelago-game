import Phaser from 'phaser';
import { APP } from '../config/app';
import { TextButton } from '../ui/TextButton';
import { SaveSystem } from '../systems/SaveSystem';
import { SettingsSystem } from '../systems/SettingsSystem';
import { LevelLoader } from '../systems/LevelLoader';
import type { LevelData } from '../types/level';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create(): void {
    const { width } = this.scale;
    const save = SaveSystem.load();
    const horizontalMargin = 28;
    const contentWidth = width - horizontalMargin * 2;
    const titleFontSize = Math.min(42, Math.round(width * 0.09));
    const toggleWidth = Math.min(200, (contentWidth - 16) / 2);

    this.cameras.main.setBackgroundColor(APP.backgroundColor);

    this.add.image(width / 2, 120, 'icon').setDisplaySize(80, 80);

    const title = this.add
      .text(width / 2, 200, APP.name, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${titleFontSize}px`,
        color: '#f8fafc',
        align: 'center',
        wordWrap: { width: contentWidth, useAdvancedWrap: true }
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, title.y + title.height / 2 + 20, 'Build bridges. Unite the islands.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#93c5fd',
        align: 'center',
        wordWrap: { width: contentWidth, useAdvancedWrap: true }
      })
      .setOrigin(0.5);

    // Level buttons for World 1
    const levelStartY = 330;
    const cols = 5;
    const buttonW = 52;
    const buttonH = 52;
    const gap = 8;
    const totalRowWidth = cols * buttonW + (cols - 1) * gap;
    const startX = (width - totalRowWidth) / 2 + buttonW / 2;

    this.add.text(width / 2, levelStartY - 40, 'World 1 — Coral Shores', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#94a3b8'
    }).setOrigin(0.5);

    for (let i = 1; i <= 5; i++) {
      const row = Math.floor((i - 1) / cols);
      const col = (i - 1) % cols;
      const bx = startX + col * (buttonW + gap);
      const by = levelStartY + row * (buttonH + gap);

      const result = save.levelResults[`1-${i}`];

      new TextButton(this, bx, by, buttonW, buttonH, `${i}`, () => {
        this.startLevel(1, i);
      }).setDepth(1);

      if (result?.completed) {
        this.add.text(bx, by + buttonH / 2 + 8, '★'.repeat(result.stars) + '☆'.repeat(3 - result.stars), {
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          color: '#fbbf24'
        }).setOrigin(0.5, 0);
      }
    }

    // Settings toggles
    const settingsY = levelStartY + Math.ceil(5 / cols) * (buttonH + gap) + 60;
    const soundLabel = (): string => `Sound: ${SettingsSystem.isSoundEnabled() ? 'On' : 'Off'}`;
    const musicLabel = (): string => `Music: ${SettingsSystem.isMusicEnabled() ? 'On' : 'Off'}`;

    const soundButton = new TextButton(this, width / 2 - toggleWidth / 2 - 4, settingsY, toggleWidth, 48, soundLabel(), () => {
      SettingsSystem.toggleSound();
      (soundButton.getAt(1) as Phaser.GameObjects.Text).setText(soundLabel());
    });

    const musicButton = new TextButton(this, width / 2 + toggleWidth / 2 + 4, settingsY, toggleWidth, 48, musicLabel(), () => {
      SettingsSystem.toggleMusic();
      (musicButton.getAt(1) as Phaser.GameObjects.Text).setText(musicLabel());
    });
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
