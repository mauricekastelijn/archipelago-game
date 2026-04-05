import Phaser from 'phaser';
import { APP } from '../config/app';
import { InputSystem } from '../systems/InputSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { clamp } from '../utils/clamp';

const RUN_DURATION_SECONDS = 30;

export class PlayScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Arc;
  private target!: Phaser.GameObjects.Arc;
  private stars!: Phaser.GameObjects.Group;
  private inputSystem!: InputSystem;
  private score = 0;
  private remainingTime = RUN_DURATION_SECONDS;
  private readonly velocity = new Phaser.Math.Vector2();
  private runTimer?: Phaser.Time.TimerEvent;
  private runFinished = false;

  constructor() {
    super('play');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(APP.backgroundColor);

    this.resetRunState();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    this.inputSystem = new InputSystem(this);

    this.add.rectangle(width / 2, height / 2, width - 24, height - 24, 0x111827, 0.7).setStrokeStyle(2, 0x334155);

    for (let i = 0; i < 36; i += 1) {
      const x = Phaser.Math.Between(20, width - 20);
      const y = Phaser.Math.Between(20, height - 20);
      const alpha = Phaser.Math.FloatBetween(0.08, 0.2);
      this.add.circle(x, y, Phaser.Math.Between(1, 3), 0xffffff, alpha);
    }

    this.player = this.add.circle(width / 2, height / 2, 18, 0x6ee7b7);
    this.player.setStrokeStyle(3, 0xffffff, 0.9);

    this.target = this.add.circle(width / 2, 140, 12, 0xf59e0b);
    this.target.setStrokeStyle(2, 0xffffff, 0.9);

    this.stars = this.add.group();
    for (let i = 0; i < 8; i += 1) {
      this.spawnStar();
    }

    this.runTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.runFinished) {
          return;
        }

        this.remainingTime = Math.max(0, this.remainingTime - 1);
        this.events.emit('time-changed', this.remainingTime);

        if (this.remainingTime === 0) {
          this.finishRun();
        }
      }
    });

    this.events.emit('score-changed', this.score);
    this.events.emit('time-changed', this.remainingTime);
  }

  update(_time: number, delta: number): void {
    if (this.runFinished) {
      return;
    }

    const dt = delta / 1000;
    const { width, height } = this.scale;
    const input = this.inputSystem.snapshot();

    let ax = 0;
    let ay = 0;
    const accel = 560;
    const friction = 0.95;
    const maxSpeed = 360;

    if (input.left) ax -= accel;
    if (input.right) ax += accel;
    if (input.up) ay -= accel;
    if (input.down) ay += accel;

    if (input.primary) {
      const pointer = this.input.activePointer;
      const dx = pointer.worldX - this.player.x;
      const dy = pointer.worldY - this.player.y;
      const len = Math.hypot(dx, dy) || 1;
      ax += (dx / len) * accel * 0.7;
      ay += (dy / len) * accel * 0.7;

      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.target.x, this.target.y);
      this.velocity.x += Math.cos(angle) * 16;
      this.velocity.y += Math.sin(angle) * 16;
    }

    this.velocity.x += ax * dt;
    this.velocity.y += ay * dt;
    this.velocity.scale(friction);
    this.velocity.setLength(Math.min(this.velocity.length(), maxSpeed));

    this.player.x = clamp(this.player.x + this.velocity.x * dt, 18, width - 18);
    this.player.y = clamp(this.player.y + this.velocity.y * dt, 18, height - 18);

    const wobble = Math.sin(this.time.now / 150) * 1.5;
    this.player.setScale(1 + Math.abs(wobble) * 0.03);

    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.target.x, this.target.y) < 34) {
      this.score += 10;
      this.events.emit('score-changed', this.score);
      this.repositionTarget();
      this.cameras.main.shake(80, 0.002);
    }

    const children = this.stars.getChildren() as Phaser.GameObjects.Arc[];
    for (const star of children) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, star.x, star.y) < 26) {
        this.score += 3;
        this.events.emit('score-changed', this.score);
        star.destroy();
        this.spawnStar();
      }
    }
  }

  private resetRunState(): void {
    this.runTimer?.remove(false);
    this.runFinished = false;
    this.score = 0;
    this.remainingTime = RUN_DURATION_SECONDS;
    this.velocity.set(0, 0);
  }

  private handleShutdown(): void {
    this.runFinished = true;
    this.runTimer?.remove(false);
    this.runTimer = undefined;
  }

  private spawnStar(): void {
    const { width, height } = this.scale;
    const star = this.add.circle(
      Phaser.Math.Between(24, width - 24),
      Phaser.Math.Between(120, height - 24),
      6,
      0x93c5fd
    );
    star.setStrokeStyle(2, 0xffffff, 0.8);
    this.tweens.add({
      targets: star,
      alpha: { from: 0.5, to: 1 },
      duration: Phaser.Math.Between(500, 1200),
      yoyo: true,
      repeat: -1
    });
    this.stars.add(star);
  }

  private repositionTarget(): void {
    const { width, height } = this.scale;
    this.target.setPosition(
      Phaser.Math.Between(36, width - 36),
      Phaser.Math.Between(120, height - 36)
    );
  }

  private finishRun(): void {
    if (this.runFinished) {
      return;
    }

    this.runFinished = true;
    this.runTimer?.remove(false);

    const save = SaveSystem.load();
    if (this.score > save.bestScore) {
      SaveSystem.update({ bestScore: this.score });
    }

    this.scene.stop('ui');
    this.scene.start('menu');
  }
}
