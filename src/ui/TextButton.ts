import Phaser from 'phaser';
import { isPointWithinButtonBounds } from './buttonLogic';

export class TextButton extends Phaser.GameObjects.Container {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void
  ) {
    super(scene, x, y);

    let isPressed = false;
    let pressedPointerId: number | null = null;

    const bg = scene.add
      .rectangle(0, 0, width, height, 0x1f2937, 0.95)
      .setStrokeStyle(2, 0x93c5fd, 0.9)
      .setOrigin(0.5);

    const text = scene.add
      .text(0, 0, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '28px',
        color: '#f8fafc'
      })
      .setOrigin(0.5);

    this.add([bg, text]);
    this.setSize(width, height);

    const setIdleState = (): void => {
      bg.setFillStyle(0x1f2937, 0.95);
      this.setScale(1);
    };

    const setHoverState = (): void => {
      bg.setFillStyle(0x334155, 0.98);
      this.setScale(1.02);
    };

    const setPressedState = (): void => {
      bg.setFillStyle(0x334155, 0.98);
      this.setScale(0.98);
    };

    const isPointerWithinButton = (pointer: Phaser.Input.Pointer): boolean =>
      isPointWithinButtonBounds(pointer.worldX, pointer.worldY, this.x, this.y, width, height);

    const syncHoverState = (pointer: Phaser.Input.Pointer): void => {
      if (isPressed && pointer.id !== pressedPointerId) {
        return;
      }

      if (isPressed) {
        if (isPointerWithinButton(pointer)) {
          setPressedState();
        } else {
          setIdleState();
        }
        return;
      }

      if (isPointerWithinButton(pointer)) {
        setHoverState();
      } else {
        setIdleState();
      }
    };

    const handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
      if (isPressed) {
        return;
      }

      if (!isPointerWithinButton(pointer)) {
        return;
      }

      isPressed = true;
      pressedPointerId = pointer.id;
      setPressedState();
    };

    const handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
      if (!isPressed || pointer.id !== pressedPointerId) {
        return;
      }

      isPressed = false;
      pressedPointerId = null;

      if (isPointerWithinButton(pointer)) {
        syncHoverState(pointer);
        onClick();
      } else {
        syncHoverState(pointer);
      }
    };

    scene.input.on('pointerdown', handlePointerDown);
    scene.input.on('pointermove', syncHoverState);
    scene.input.on('pointerup', handlePointerUp);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off('pointerdown', handlePointerDown);
      scene.input.off('pointermove', syncHoverState);
      scene.input.off('pointerup', handlePointerUp);
    });

    scene.add.existing(this);
    syncHoverState(scene.input.activePointer);
  }
}
