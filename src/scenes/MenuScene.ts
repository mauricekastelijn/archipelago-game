import Phaser from 'phaser';
import { APP } from '../config/app';
import { TextButton } from '../ui/TextButton';
import { SaveSystem } from '../systems/SaveSystem';
import { SettingsSystem } from '../systems/SettingsSystem';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create(): void {
    const { width, height } = this.scale;
    const save = SaveSystem.load();
    const horizontalMargin = 28;
    const contentWidth = width - horizontalMargin * 2;
    const titleFontSize = Math.min(42, Math.round(width * 0.09));
    const toggleWidth = Math.min(200, (contentWidth - 16) / 2);

    this.cameras.main.setBackgroundColor(APP.backgroundColor);

    this.add.image(width / 2, 150, 'icon').setDisplaySize(96, 96);

    const title = this.add
      .text(width / 2, 250, APP.name, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${titleFontSize}px`,
        color: '#f8fafc',
        align: 'center',
        wordWrap: {
          width: contentWidth,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(width / 2, title.y + title.height / 2 + 26, 'Desktop + mobile starter template', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#93c5fd',
        align: 'center',
        wordWrap: {
          width: contentWidth,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0.5);

    const bestScore = this.add
      .text(width / 2, subtitle.y + subtitle.height / 2 + 24, `Best score: ${save.bestScore}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#cbd5e1',
        align: 'center',
        wordWrap: {
          width: contentWidth,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0.5);

    const playButton = new TextButton(
      this,
      width / 2,
      bestScore.y + bestScore.height / 2 + 90,
      Math.min(250, contentWidth),
      72,
      'Play',
      () => {
        this.scene.start('play');
        this.scene.launch('ui');
      }
    );
    playButton.setDepth(1);

    const settingsY = playButton.y + 72;
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

    this.add
      .text(
        width / 2,
        height - 80,
        'Move with arrow keys / WASD. On touch, drag your finger.\nTap or space to burst forward.',
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '19px',
          color: '#94a3b8',
          align: 'center',
          wordWrap: {
            width: contentWidth,
            useAdvancedWrap: true
          }
        }
      )
      .setOrigin(0.5, 1);
  }
}
