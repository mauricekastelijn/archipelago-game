import Phaser from 'phaser';
import { APP } from '../config/app';
import { TextButton } from '../ui/TextButton';
import { SettingsSystem } from '../systems/SettingsSystem';
import { AudioSystem } from '../systems/AudioSystem';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('settings');
  }

  create(): void {
    const { width } = this.scale;
    const toggleWidth = Math.min(260, width - 56);

    this.cameras.main.setBackgroundColor(APP.backgroundColor);

    // Back button
    new TextButton(this, 36, 36, 48, 40, '←', () => {
      this.scene.start('menu');
    }).setDepth(10);

    // Title
    this.add.text(width / 2, 36, 'Settings', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      color: '#f8fafc',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Sound toggle
    const soundLabel = (): string => `Sound: ${SettingsSystem.isSoundEnabled() ? 'On' : 'Off'}`;
    const soundButton = new TextButton(this, width / 2, 120, toggleWidth, 48, soundLabel(), () => {
      SettingsSystem.toggleSound();
      (soundButton.getAt(1) as Phaser.GameObjects.Text).setText(soundLabel());
    });

    // Music toggle
    const musicLabel = (): string => `Music: ${SettingsSystem.isMusicEnabled() ? 'On' : 'Off'}`;
    const musicButton = new TextButton(this, width / 2, 184, toggleWidth, 48, musicLabel(), () => {
      SettingsSystem.toggleMusic();
      AudioSystem.updateMusicState();
      (musicButton.getAt(1) as Phaser.GameObjects.Text).setText(musicLabel());
    });
  }
}
