import Phaser from 'phaser';
import { APP } from '../config/app';
import { TextButton } from '../ui/TextButton';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create(): void {
    const { width, height } = this.scale;
    const horizontalMargin = 28;
    const contentWidth = width - horizontalMargin * 2;
    const titleFontSize = Math.min(42, Math.round(width * 0.09));

    this.cameras.main.setBackgroundColor(APP.backgroundColor);

    this.add.image(width / 2, height * 0.22, 'icon').setDisplaySize(80, 80);

    const title = this.add
      .text(width / 2, height * 0.35, APP.name, {
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

    // Play button
    new TextButton(this, width / 2, height * 0.6, 200, 56, 'Play', () => {
      this.scene.start('worldmap');
    });

    // Settings button
    new TextButton(this, width / 2, height * 0.6 + 72, 200, 48, '⚙ Settings', () => {
      this.scene.start('settings');
    });
  }
}
