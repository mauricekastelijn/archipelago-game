import Phaser from 'phaser';
import { TextButton } from '../ui/TextButton';

export class UIScene extends Phaser.Scene {
  private levelText!: Phaser.GameObjects.Text;
  private movesText!: Phaser.GameObjects.Text;
  private overlayElements: Phaser.GameObjects.GameObject[] = [];
  private readonly horizontalMargin = 16;

  constructor() {
    super('ui');
  }

  create(): void {
    const playScene = this.scene.get('play') as Phaser.Scene;
    const { width } = this.scale;
    const fontSize = `${Math.max(18, Math.round(width * 0.05))}px`;
    const smallFontSize = `${Math.max(14, Math.round(width * 0.04))}px`;

    // Top bar: back button + level title
    const backButton = new TextButton(
      this, 36, 28, 48, 40, '←', () => {
        this.scene.stop('play');
        this.scene.stop('ui');
        this.scene.start('menu');
      }
    );
    backButton.setDepth(20);

    this.levelText = this.add
      .text(width / 2, 28, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize,
        color: '#f8fafc'
      })
      .setOrigin(0.5)
      .setDepth(20);

    // Bottom bar: moves + action buttons
    const bottomY = this.scale.height - 40;

    this.movesText = this.add
      .text(this.horizontalMargin, bottomY, 'Moves: 0', {
        fontFamily: 'Arial, sans-serif',
        fontSize: smallFontSize,
        color: '#cbd5e1'
      })
      .setOrigin(0, 0.5)
      .setDepth(20);

    const buttonSize = 44;
    const buttonSpacing = 8;
    const buttonsStartX = width - this.horizontalMargin - buttonSize * 4 - buttonSpacing * 3;

    // Undo button
    new TextButton(
      this, buttonsStartX + buttonSize / 2, bottomY, buttonSize, buttonSize, '↩', () => {
        (playScene as unknown as { undoMove: () => void }).undoMove();
      }
    ).setDepth(20);

    // Redo button
    new TextButton(
      this, buttonsStartX + buttonSize + buttonSpacing + buttonSize / 2, bottomY,
      buttonSize, buttonSize, '↪', () => {
        (playScene as unknown as { redoMove: () => void }).redoMove();
      }
    ).setDepth(20);

    // Hint button
    new TextButton(
      this, buttonsStartX + (buttonSize + buttonSpacing) * 2 + buttonSize / 2, bottomY,
      buttonSize, buttonSize, '💡', () => {
        (playScene as unknown as { useHint: () => void }).useHint();
      }
    ).setDepth(20);

    // Reset button
    new TextButton(
      this, buttonsStartX + (buttonSize + buttonSpacing) * 3 + buttonSize / 2, bottomY,
      buttonSize, buttonSize, '🔄', () => {
        (playScene as unknown as { resetLevel: () => void }).resetLevel();
      }
    ).setDepth(20);

    // Overlay elements tracked for show/hide (no container to avoid coordinate issues)
    this.overlayElements = [];

    // Listen to play scene events
    playScene.events.on('moves-changed', this.onMovesChanged, this);
    playScene.events.on('level-info', this.onLevelInfo, this);
    playScene.events.on('level-complete', this.onLevelComplete, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      playScene.events.off('moves-changed', this.onMovesChanged, this);
      playScene.events.off('level-info', this.onLevelInfo, this);
      playScene.events.off('level-complete', this.onLevelComplete, this);
    });
  }

  private onMovesChanged(moves: number): void {
    this.movesText.setText(`Moves: ${moves}`);
  }

  private onLevelInfo(info: { world: number; level: number }): void {
    this.levelText.setText(`World ${info.world} — Level ${info.level}`);
  }

  private onLevelComplete(data: { stars: number; moves: number; par: number }): void {
    const { width } = this.scale;
    const cx = width / 2;
    const cy = this.scale.height / 2;

    // Destroy any previous overlay elements
    for (const el of this.overlayElements) {
      el.destroy();
    }
    this.overlayElements = [];

    const bg = this.add.rectangle(cx, cy, width - 40, 240, 0x111827, 0.95)
      .setStrokeStyle(2, 0x93c5fd).setDepth(100).setAlpha(0);

    const title = this.add.text(cx, cy - 80, 'Level Complete!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '32px',
      color: '#4ade80',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    const starStr = '★'.repeat(data.stars) + '☆'.repeat(3 - data.stars);
    const stars = this.add.text(cx, cy - 30, starStr, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '40px',
      color: '#fbbf24'
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    const info = this.add.text(cx, cy + 20, `Moves: ${data.moves}  |  Par: ${data.par}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#cbd5e1'
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    const nextButton = new TextButton(
      this, cx, cy + 75, 160, 48, 'Continue', () => {
        this.scene.stop('play');
        this.scene.stop('ui');
        this.scene.start('menu');
      }
    );
    nextButton.setDepth(100).setAlpha(0);

    this.overlayElements = [bg, title, stars, info, nextButton];

    this.tweens.add({
      targets: this.overlayElements,
      alpha: 1,
      duration: 500,
      delay: 800,
      ease: 'Cubic.Out'
    });
  }
}
