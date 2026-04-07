import Phaser from 'phaser';
import { APP } from './app';
import { BootScene } from '../scenes/BootScene';
import { MenuScene } from '../scenes/MenuScene';
import { WorldMapScene } from '../scenes/WorldMapScene';
import { QuickPlayScene } from '../scenes/QuickPlayScene';
import { PlayScene } from '../scenes/PlayScene';
import { UIScene } from '../scenes/UIScene';
import { SettingsScene } from '../scenes/SettingsScene';
import { TutorialScene } from '../scenes/TutorialScene';

export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: APP.backgroundColor,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: APP.designWidth,
      height: APP.designHeight
    },
    scene: [BootScene, MenuScene, WorldMapScene, QuickPlayScene, PlayScene, UIScene, SettingsScene, TutorialScene],
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
      powerPreference: 'high-performance'
    },
    input: {
      activePointers: 3
    }
  };
}
