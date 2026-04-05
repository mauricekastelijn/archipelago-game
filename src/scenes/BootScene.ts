import Phaser from 'phaser';
import { APP } from '../config/app';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    this.load.svg('icon', 'assets/icon.svg');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(APP.backgroundColor);
    this.scene.start('menu');
  }
}
