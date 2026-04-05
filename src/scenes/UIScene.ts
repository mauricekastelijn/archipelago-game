import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private readonly horizontalMargin = 24;

  constructor() {
    super('ui');
  }

  create(): void {
    const playScene = this.scene.get('play') as Phaser.Scene;
    const fontSize = `${Math.max(24, Math.round(this.scale.width * 0.07))}px`;

    this.scoreText = this.add
      .text(this.horizontalMargin, 18, 'Score: 0', {
        fontFamily: 'Arial, sans-serif',
        fontSize,
        color: '#f8fafc'
      })
      .setDepth(10);

    this.timeText = this.add
      .text(this.scale.width - this.horizontalMargin, 18, '30', {
        fontFamily: 'Arial, sans-serif',
        fontSize,
        color: '#f8fafc'
      })
      .setOrigin(1, 0)
      .setDepth(10);

    playScene.events.on('score-changed', this.onScoreChanged, this);
    playScene.events.on('time-changed', this.onTimeChanged, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      playScene.events.off('score-changed', this.onScoreChanged, this);
      playScene.events.off('time-changed', this.onTimeChanged, this);
    });
  }

  private onScoreChanged(score: number): void {
    this.scoreText.setText(`Score: ${score}`);
  }

  private onTimeChanged(seconds: number): void {
    this.timeText.setText(`${seconds}s`);
  }
}
