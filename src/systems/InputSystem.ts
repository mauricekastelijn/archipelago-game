import Phaser from 'phaser';

export interface InputSnapshot {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  primary: boolean;
}

export class InputSystem {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: Record<string, Phaser.Input.Keyboard.Key>;
  private pointerDown = false;

  constructor(scene: Phaser.Scene) {
    this.cursors = scene.input.keyboard?.createCursorKeys() ?? ({} as Phaser.Types.Input.Keyboard.CursorKeys);
    this.wasd = scene.input.keyboard?.addKeys('W,A,S,D,SPACE') as Record<string, Phaser.Input.Keyboard.Key>;

    scene.input.on('pointerdown', () => {
      this.pointerDown = true;
    });
    scene.input.on('pointerup', () => {
      this.pointerDown = false;
    });
  }

  snapshot(): InputSnapshot {
    return {
      left: !!(this.cursors.left?.isDown || this.wasd.A?.isDown),
      right: !!(this.cursors.right?.isDown || this.wasd.D?.isDown),
      up: !!(this.cursors.up?.isDown || this.wasd.W?.isDown),
      down: !!(this.cursors.down?.isDown || this.wasd.S?.isDown),
      primary: !!(this.cursors.space?.isDown || this.pointerDown)
    };
  }
}
