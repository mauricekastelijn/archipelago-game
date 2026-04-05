import Phaser from 'phaser';
import { createGameConfig } from '../config/gameConfig';

declare global {
  interface Window {
    __GAME__?: Phaser.Game;
  }
}

export function bootGame(parentId: string): Phaser.Game {
  const existingGame = window.__GAME__;
  if (existingGame) {
    existingGame.destroy(true);
  }

  const game = new Phaser.Game(createGameConfig(parentId));
  window.__GAME__ = game;
  return game;
}
