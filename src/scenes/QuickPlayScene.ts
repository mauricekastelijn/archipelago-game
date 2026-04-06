import Phaser from 'phaser';
import { APP } from '../config/app';
import { TextButton } from '../ui/TextButton';
import { SaveSystem } from '../systems/SaveSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { generateQuickPlay } from '../model/LevelGenerator';
import type { Difficulty } from '../types/save';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert'
};
const DIFFICULTY_COLORS: Record<Difficulty, number> = {
  easy: 0x22c55e,
  medium: 0x3b82f6,
  hard: 0xf59e0b,
  expert: 0xef4444
};
const MAX_FACTIONS = 4;

export class QuickPlayScene extends Phaser.Scene {
  private selectedDifficulty!: Difficulty;
  private selectedFactions!: number;
  private difficultyButtons: Phaser.GameObjects.Container[] = [];
  private factionButtons: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('quickplay');
  }

  create(): void {
    const { width } = this.scale;
    const save = SaveSystem.load();
    this.selectedDifficulty = save.quickPlayDifficulty;
    this.selectedFactions = save.quickPlayFactions;
    this.difficultyButtons = [];
    this.factionButtons = [];

    this.cameras.main.setBackgroundColor(APP.backgroundColor);

    // Back button
    new TextButton(this, 36, 36, 48, 40, '←', () => {
      this.scene.start('menu');
    }).setDepth(10);

    // Title
    this.add.text(width / 2, 36, 'Quick Play', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      color: '#f8fafc',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // --- Difficulty section ---
    const diffY = 120;
    this.add.text(width / 2, diffY, 'Difficulty', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#93c5fd'
    }).setOrigin(0.5);

    const btnH = 44;

    // Layout: 2x2 grid for difficulty buttons
    const cols = 2;
    const gridGap = 10;
    const gridBtnW = (width - 56 - gridGap) / cols;
    const gridStartX = 28 + gridBtnW / 2;

    for (let i = 0; i < DIFFICULTIES.length; i++) {
      const diff = DIFFICULTIES[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = gridStartX + col * (gridBtnW + gridGap);
      const by = diffY + 40 + row * (btnH + gridGap);

      const btn = this.createOptionButton(
        bx, by, gridBtnW, btnH,
        DIFFICULTY_LABELS[diff],
        diff === this.selectedDifficulty,
        DIFFICULTY_COLORS[diff],
        () => this.selectDifficulty(diff)
      );
      this.difficultyButtons.push(btn);
    }

    // --- Factions section ---
    const factY = diffY + 40 + 2 * (btnH + gridGap) + 30;
    this.add.text(width / 2, factY, 'Factions', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#93c5fd'
    }).setOrigin(0.5);

    const facBtnW = 56;
    const facGap = 12;
    const totalFacW = MAX_FACTIONS * facBtnW + (MAX_FACTIONS - 1) * facGap;
    const facStartX = (width - totalFacW) / 2 + facBtnW / 2;

    for (let i = 1; i <= MAX_FACTIONS; i++) {
      const bx = facStartX + (i - 1) * (facBtnW + facGap);
      const by = factY + 44;

      const btn = this.createOptionButton(
        bx, by, facBtnW, btnH,
        `${i}`,
        i === this.selectedFactions,
        0x93c5fd,
        () => this.selectFactions(i)
      );
      this.factionButtons.push(btn);
    }

    // --- Start button ---
    const startBtnY = factY + 130;
    const startBtn = new TextButton(this, width / 2, startBtnY, 220, 56, '▶  Start', () => {
      this.startGameAsync(startBtn);
    });

    // --- Description ---
    this.add.text(width / 2, startBtnY + 60, 'A new puzzle is generated\neach time you play.', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#64748b',
      align: 'center'
    }).setOrigin(0.5);
  }

  private createOptionButton(
    x: number, y: number, w: number, h: number,
    label: string, selected: boolean, accentColor: number,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, w, h, selected ? accentColor : 0x1f2937, selected ? 0.9 : 0.7)
      .setStrokeStyle(2, selected ? accentColor : 0x475569, selected ? 1 : 0.6)
      .setOrigin(0.5);

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: selected ? '#0b1020' : '#cbd5e1',
      fontStyle: selected ? 'bold' : 'normal'
    }).setOrigin(0.5);

    container.add([bg, text]);
    container.setSize(w, h);

    // Manual hit detection (same pattern as TextButton)
    const isInBounds = (pointer: Phaser.Input.Pointer): boolean => {
      const dx = Math.abs(pointer.worldX - x);
      const dy = Math.abs(pointer.worldY - y);
      return dx <= w / 2 && dy <= h / 2;
    };

    const handleDown = (pointer: Phaser.Input.Pointer): void => {
      if (isInBounds(pointer)) container.setScale(0.95);
    };
    const handleUp = (pointer: Phaser.Input.Pointer): void => {
      container.setScale(1);
      if (isInBounds(pointer)) {
        AudioSystem.buttonClick();
        onClick();
      }
    };

    this.input.on('pointerdown', handleDown);
    this.input.on('pointerup', handleUp);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', handleDown);
      this.input.off('pointerup', handleUp);
    });

    return container;
  }

  private updateButtonStyle(
    container: Phaser.GameObjects.Container,
    selected: boolean,
    accentColor: number
  ): void {
    const bg = container.getAt(0) as Phaser.GameObjects.Rectangle;
    const text = container.getAt(1) as Phaser.GameObjects.Text;

    bg.setFillStyle(selected ? accentColor : 0x1f2937, selected ? 0.9 : 0.7);
    bg.setStrokeStyle(2, selected ? accentColor : 0x475569, selected ? 1 : 0.6);
    text.setColor(selected ? '#0b1020' : '#cbd5e1');
    text.setFontStyle(selected ? 'bold' : 'normal');
  }

  private selectDifficulty(diff: Difficulty): void {
    this.selectedDifficulty = diff;
    SaveSystem.update({ quickPlayDifficulty: diff });

    for (let i = 0; i < DIFFICULTIES.length; i++) {
      this.updateButtonStyle(
        this.difficultyButtons[i],
        DIFFICULTIES[i] === diff,
        DIFFICULTY_COLORS[DIFFICULTIES[i]]
      );
    }
  }

  private selectFactions(n: number): void {
    this.selectedFactions = n;
    SaveSystem.update({ quickPlayFactions: n });

    for (let i = 0; i < MAX_FACTIONS; i++) {
      this.updateButtonStyle(
        this.factionButtons[i],
        i + 1 === n,
        0x93c5fd
      );
    }
  }

  private startGameAsync(startBtn: TextButton): void {
    // Show spinner on button
    startBtn.setText('⏳  Generating...');
    startBtn.setEnabled(false);

    // Defer generation to next frame so the UI update renders
    this.time.delayedCall(50, () => {
      const level = generateQuickPlay(this.selectedDifficulty, this.selectedFactions);
      this.scene.start('play', {
        levelData: level,
        returnScene: 'quickplay',
        quickPlayLabel: `Quick Play — ${DIFFICULTY_LABELS[this.selectedDifficulty]}`
      });
      this.scene.launch('ui', { returnScene: 'quickplay' });
    });
  }
}
