import Phaser from 'phaser';
import { APP } from '../config/app';
import { FACTION_STYLES } from '../config/factionColors';
import { Grid } from '../model/Grid';
import { Island } from '../model/Island';
import { Bridge } from '../model/Bridge';
import { MoveHistory } from '../model/MoveHistory';
import { Solver } from '../model/Solver';
import { SaveSystem } from '../systems/SaveSystem';
import type { LevelData } from '../types/level';

const GRID_PADDING = 40;
const ISLAND_RADIUS_RATIO = 0.35;
const BRIDGE_OFFSET = 4;

export class PlayScene extends Phaser.Scene {
  private grid!: Grid;
  private history!: MoveHistory;
  private levelData!: LevelData;
  private cellSize = 0;
  private gridOffsetX = 0;
  private gridOffsetY = 0;

  private selectedIsland: Island | null = null;
  private islandGraphics: Map<string, Phaser.GameObjects.Container> = new Map();
  private bridgeGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private neighborHighlights: Phaser.GameObjects.Arc[] = [];
  private solved = false;

  // Drag-to-connect state
  private dragStartIsland: Island | null = null;
  private dragLine: Phaser.GameObjects.Graphics | null = null;

  // Long-press-to-remove state
  private longPressTimer: Phaser.Time.TimerEvent | null = null;
  private longPressBridgeKey: string | null = null;
  private static readonly LONG_PRESS_MS = 400;

  constructor() {
    super('play');
  }

  init(data: { levelData: LevelData }): void {
    this.levelData = data.levelData;
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(APP.backgroundColor);

    this.grid = Grid.fromLevelData(this.levelData);
    this.history = new MoveHistory();
    this.selectedIsland = null;
    this.solved = false;

    this.islandGraphics.clear();
    this.bridgeGraphics.clear();
    this.neighborHighlights = [];

    this.calculateLayout(width, height);
    this.drawGridBackground();
    this.createIslandVisuals();
    this.setupInput();

    this.events.emit('moves-changed', 0);
    this.events.emit('level-info', {
      world: this.levelData.world,
      level: this.levelData.level
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  private calculateLayout(viewWidth: number, viewHeight: number): void {
    const topBarHeight = 70;
    const bottomBarHeight = 100;
    const availableWidth = viewWidth - GRID_PADDING * 2;
    const availableHeight = viewHeight - topBarHeight - bottomBarHeight - GRID_PADDING * 2;

    this.cellSize = Math.floor(
      Math.min(availableWidth / this.grid.width, availableHeight / this.grid.height)
    );

    const gridPixelWidth = this.cellSize * this.grid.width;
    const gridPixelHeight = this.cellSize * this.grid.height;
    this.gridOffsetX = Math.floor((viewWidth - gridPixelWidth) / 2);
    this.gridOffsetY = topBarHeight + Math.floor((availableHeight - gridPixelHeight) / 2) + GRID_PADDING;
  }

  private cellToPixel(row: number, col: number): { x: number; y: number } {
    return {
      x: this.gridOffsetX + col * this.cellSize + this.cellSize / 2,
      y: this.gridOffsetY + row * this.cellSize + this.cellSize / 2
    };
  }

  private drawGridBackground(): void {
    const gfx = this.add.graphics();
    gfx.fillStyle(0x111827, 0.5);
    gfx.fillRoundedRect(
      this.gridOffsetX - 8,
      this.gridOffsetY - 8,
      this.cellSize * this.grid.width + 16,
      this.cellSize * this.grid.height + 16,
      8
    );

    gfx.lineStyle(1, 0x1e293b, 0.3);
    for (let r = 0; r <= this.grid.height; r++) {
      const y = this.gridOffsetY + r * this.cellSize;
      gfx.lineBetween(
        this.gridOffsetX, y,
        this.gridOffsetX + this.grid.width * this.cellSize, y
      );
    }
    for (let c = 0; c <= this.grid.width; c++) {
      const x = this.gridOffsetX + c * this.cellSize;
      gfx.lineBetween(
        x, this.gridOffsetY,
        x, this.gridOffsetY + this.grid.height * this.cellSize
      );
    }
  }

  private createIslandVisuals(): void {
    const radius = this.cellSize * ISLAND_RADIUS_RATIO;
    const fontSize = Math.max(16, Math.round(radius * 1.1));

    for (const island of this.grid.islands) {
      const { x, y } = this.cellToPixel(island.row, island.col);
      const style = FACTION_STYLES[island.faction] ?? FACTION_STYLES[0];

      const circle = this.add.circle(0, 0, radius, style.color);
      circle.setStrokeStyle(2, 0xffffff, 0.8);

      const text = this.add.text(0, 0, `${island.degree}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${fontSize}px`,
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      const container = this.add.container(x, y, [circle, text]);
      container.setSize(radius * 2, radius * 2);
      container.setDepth(10);

      this.islandGraphics.set(island.key, container);
    }
  }

  private findIslandNearPointer(px: number, py: number): Island | null {
    const radius = this.cellSize * ISLAND_RADIUS_RATIO;
    for (const island of this.grid.islands) {
      const pos = this.cellToPixel(island.row, island.col);
      const dx = px - pos.x;
      const dy = py - pos.y;
      if (dx * dx + dy * dy <= radius * radius) {
        return island;
      }
    }
    return null;
  }

  private setupInput(): void {
    // Pointer down: start drag on island, or start long-press on bridge
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.solved) return;

      const island = this.findIslandNearPointer(pointer.worldX, pointer.worldY);
      if (island) {
        this.dragStartIsland = island;
        this.cancelLongPress();
        return;
      }

      // Not an island — check for a bridge under the pointer for long-press removal
      this.deselectIsland();
      const bridgeKey = this.findBridgeNearPointer(pointer.worldX, pointer.worldY);
      if (bridgeKey) {
        this.longPressBridgeKey = bridgeKey;
        this.longPressTimer = this.time.delayedCall(PlayScene.LONG_PRESS_MS, () => {
          this.removeBridge(bridgeKey);
          this.longPressBridgeKey = null;
        });
      }
    });

    // Pointer move: draw drag line, cancel long-press if pointer drifts
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.dragStartIsland && pointer.isDown) {
        this.drawDragLine(this.dragStartIsland, pointer.worldX, pointer.worldY);
      }

      // Cancel long-press if pointer moves more than a small threshold
      if (this.longPressBridgeKey && pointer.isDown) {
        const dist = Phaser.Math.Distance.Between(
          pointer.downX, pointer.downY, pointer.worldX, pointer.worldY
        );
        if (dist > 10) {
          this.cancelLongPress();
        }
      }
    });

    // Pointer up: finish drag or handle tap
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.cancelLongPress();
      this.clearDragLine();

      if (this.solved) {
        this.dragStartIsland = null;
        return;
      }

      const endIsland = this.findIslandNearPointer(pointer.worldX, pointer.worldY);

      // Drag from island A to island B — cycle bridge
      if (this.dragStartIsland && endIsland && this.dragStartIsland !== endIsland) {
        const neighbors = this.grid.getNeighbors(this.dragStartIsland);
        if (neighbors.includes(endIsland)) {
          this.cycleBridgeBetween(this.dragStartIsland, endIsland);
        }
        this.deselectIsland();
        this.dragStartIsland = null;
        return;
      }

      // Tap (no drag) — use existing tap-to-select logic
      if (this.dragStartIsland && endIsland === this.dragStartIsland) {
        this.onIslandTapped(this.dragStartIsland);
      }

      this.dragStartIsland = null;
    });

    // Keyboard
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-Z', (event: KeyboardEvent) => {
        if (event.ctrlKey || event.metaKey || !event.ctrlKey) {
          this.undoMove();
        }
      });
      this.input.keyboard.on('keydown-Y', () => this.redoMove());
      this.input.keyboard.on('keydown-R', () => this.resetLevel());
      this.input.keyboard.on('keydown-H', () => this.useHint());
      this.input.keyboard.on('keydown-ESC', () => this.deselectIsland());
    }
  }

  /** Find the closest bridge within tap distance of a point. */
  private findBridgeNearPointer(px: number, py: number): string | null {
    const threshold = Math.max(12, this.cellSize * 0.15);
    let bestKey: string | null = null;
    let bestDist = threshold;

    for (const [key, bridge] of this.grid.bridges) {
      if (bridge.count === 0) continue;

      const posA = this.cellToPixel(bridge.islandA.row, bridge.islandA.col);
      const posB = this.cellToPixel(bridge.islandB.row, bridge.islandB.col);
      const dist = this.pointToSegmentDist(px, py, posA.x, posA.y, posB.x, posB.y);
      if (dist < bestDist) {
        bestDist = dist;
        bestKey = key;
      }
    }
    return bestKey;
  }

  /** Distance from point (px,py) to line segment (ax,ay)-(bx,by). */
  private pointToSegmentDist(
    px: number, py: number,
    ax: number, ay: number,
    bx: number, by: number
  ): number {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Phaser.Math.Distance.Between(px, py, ax, ay);

    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Phaser.Math.Clamp(t, 0, 1);
    return Phaser.Math.Distance.Between(px, py, ax + t * dx, ay + t * dy);
  }

  /** Remove a bridge entirely (long-press action). */
  private removeBridge(bridgeKey: string): void {
    const bridge = this.grid.bridges.get(bridgeKey);
    if (!bridge || bridge.count === 0) return;

    const previousCount = bridge.count;
    this.grid.setBridgeCount(bridgeKey, 0);
    this.history.push({ bridgeKey, previousCount, newCount: 0 });

    this.drawBridge(bridgeKey);
    this.updateIslandVisuals(bridge.islandA);
    this.updateIslandVisuals(bridge.islandB);
    this.events.emit('moves-changed', this.history.moveCount);

    // Visual feedback: flash the islands
    this.flashIsland(bridge.islandA);
    this.flashIsland(bridge.islandB);
  }

  private cancelLongPress(): void {
    if (this.longPressTimer) {
      this.longPressTimer.destroy();
      this.longPressTimer = null;
    }
    this.longPressBridgeKey = null;
  }

  private drawDragLine(from: Island, toX: number, toY: number): void {
    if (!this.dragLine) {
      this.dragLine = this.add.graphics();
      this.dragLine.setDepth(15);
    }
    this.dragLine.clear();
    const pos = this.cellToPixel(from.row, from.col);
    this.dragLine.lineStyle(2, 0xffffff, 0.4);
    this.dragLine.lineBetween(pos.x, pos.y, toX, toY);
  }

  private clearDragLine(): void {
    if (this.dragLine) {
      this.dragLine.destroy();
      this.dragLine = null;
    }
  }

  private onIslandTapped(island: Island): void {
    if (this.solved) return;

    if (this.selectedIsland === null) {
      this.selectIsland(island);
      return;
    }

    if (this.selectedIsland === island) {
      this.deselectIsland();
      return;
    }

    // Check if tapped island is an eligible neighbor
    const neighbors = this.grid.getNeighbors(this.selectedIsland);
    if (neighbors.includes(island)) {
      this.cycleBridgeBetween(this.selectedIsland, island);
      this.deselectIsland();
      return;
    }

    // Not a neighbor — select the new island instead
    this.deselectIsland();
    this.selectIsland(island);
  }

  private selectIsland(island: Island): void {
    this.selectedIsland = island;

    // Glow effect on selected island
    const container = this.islandGraphics.get(island.key);
    if (container) {
      this.tweens.add({
        targets: container,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 200,
        ease: 'Back.Out'
      });
    }

    // Highlight neighbors
    const neighbors = this.grid.getNeighbors(island);
    for (const neighbor of neighbors) {
      const { x, y } = this.cellToPixel(neighbor.row, neighbor.col);
      const highlight = this.add.circle(x, y, this.cellSize * ISLAND_RADIUS_RATIO + 6, 0xffffff, 0.15);
      highlight.setDepth(5);
      this.neighborHighlights.push(highlight);
    }
  }

  private deselectIsland(): void {
    if (this.selectedIsland) {
      const container = this.islandGraphics.get(this.selectedIsland.key);
      if (container) {
        this.tweens.add({
          targets: container,
          scaleX: 1,
          scaleY: 1,
          duration: 150,
          ease: 'Cubic.Out'
        });
      }
    }
    this.selectedIsland = null;
    for (const h of this.neighborHighlights) {
      h.destroy();
    }
    this.neighborHighlights = [];
  }

  private cycleBridgeBetween(islandA: Island, islandB: Island): void {
    const key = Bridge.makeKey(islandA.row, islandA.col, islandB.row, islandB.col);
    const previousCount = this.grid.getBridgeCount(islandA, islandB);
    const nextCount = (previousCount + 1) % 3;

    // Check crossing only when adding bridges
    if (nextCount > 0 && previousCount === 0 && this.grid.wouldCross(islandA, islandB)) {
      this.flashIsland(islandA);
      return;
    }

    this.grid.cycleBridge(islandA, islandB);
    this.history.push({ bridgeKey: key, previousCount, newCount: nextCount });

    this.drawBridge(key);
    this.updateIslandVisuals(islandA);
    this.updateIslandVisuals(islandB);

    this.events.emit('moves-changed', this.history.moveCount);

    if (this.grid.isSolved()) {
      this.onLevelSolved();
    }
  }

  undoMove(): void {
    if (this.solved) return;
    const move = this.history.undo();
    if (!move) return;

    this.grid.setBridgeCount(move.bridgeKey, move.previousCount);
    this.drawBridge(move.bridgeKey);

    const bridge = this.grid.bridges.get(move.bridgeKey);
    if (bridge) {
      this.updateIslandVisuals(bridge.islandA);
      this.updateIslandVisuals(bridge.islandB);
    }
    this.events.emit('moves-changed', this.history.moveCount);
  }

  redoMove(): void {
    if (this.solved) return;
    const move = this.history.redo();
    if (!move) return;

    this.grid.setBridgeCount(move.bridgeKey, move.newCount);
    this.drawBridge(move.bridgeKey);

    const bridge = this.grid.bridges.get(move.bridgeKey);
    if (bridge) {
      this.updateIslandVisuals(bridge.islandA);
      this.updateIslandVisuals(bridge.islandB);
    }
    this.events.emit('moves-changed', this.history.moveCount);
  }

  resetLevel(): void {
    this.grid.reset();
    this.history.clear();
    this.solved = false;
    this.deselectIsland();

    for (const [, gfx] of this.bridgeGraphics) {
      gfx.destroy();
    }
    this.bridgeGraphics.clear();

    for (const island of this.grid.islands) {
      this.updateIslandVisuals(island);
    }
    this.events.emit('moves-changed', 0);
  }

  useHint(): void {
    if (this.solved) return;
    const hint = Solver.findForcedMove(this.grid);
    if (!hint) return;

    const key = Bridge.makeKey(
      hint.islandA.row, hint.islandA.col,
      hint.islandB.row, hint.islandB.col
    );
    const previousCount = this.grid.getBridgeCount(hint.islandA, hint.islandB);
    if (previousCount >= hint.targetCount) return;

    // Cycle to target
    while (this.grid.getBridgeCount(hint.islandA, hint.islandB) < hint.targetCount) {
      this.grid.cycleBridge(hint.islandA, hint.islandB);
    }
    this.history.push({ bridgeKey: key, previousCount, newCount: hint.targetCount });

    this.drawBridge(key);
    this.updateIslandVisuals(hint.islandA);
    this.updateIslandVisuals(hint.islandB);

    // Pulse hint bridge
    const gfx = this.bridgeGraphics.get(key);
    if (gfx) {
      this.tweens.add({
        targets: gfx,
        alpha: { from: 0.4, to: 1 },
        duration: 300,
        yoyo: true,
        repeat: 2
      });
    }

    this.events.emit('moves-changed', this.history.moveCount);

    if (this.grid.isSolved()) {
      this.onLevelSolved();
    }
  }

  private drawBridge(bridgeKey: string): void {
    let gfx = this.bridgeGraphics.get(bridgeKey);
    if (gfx) {
      gfx.clear();
    } else {
      gfx = this.add.graphics();
      gfx.setDepth(2);
      this.bridgeGraphics.set(bridgeKey, gfx);
    }

    const bridge = this.grid.bridges.get(bridgeKey);
    if (!bridge || bridge.count === 0) return;

    const posA = this.cellToPixel(bridge.islandA.row, bridge.islandA.col);
    const posB = this.cellToPixel(bridge.islandB.row, bridge.islandB.col);
    const style = FACTION_STYLES[bridge.faction] ?? FACTION_STYLES[0];

    const lineWidth = Math.max(2, Math.round(this.cellSize * 0.06));

    if (bridge.count === 1) {
      gfx.lineStyle(lineWidth, style.color, 0.9);
      gfx.lineBetween(posA.x, posA.y, posB.x, posB.y);
    } else if (bridge.count === 2) {
      const offset = BRIDGE_OFFSET;
      if (bridge.isHorizontal) {
        gfx.lineStyle(lineWidth, style.color, 0.9);
        gfx.lineBetween(posA.x, posA.y - offset, posB.x, posB.y - offset);
        gfx.lineBetween(posA.x, posA.y + offset, posB.x, posB.y + offset);
      } else {
        gfx.lineStyle(lineWidth, style.color, 0.9);
        gfx.lineBetween(posA.x - offset, posA.y, posB.x - offset, posB.y);
        gfx.lineBetween(posA.x + offset, posA.y, posB.x + offset, posB.y);
      }
    }
  }

  private updateIslandVisuals(island: Island): void {
    const container = this.islandGraphics.get(island.key);
    if (!container) return;

    const text = container.getAt(1) as Phaser.GameObjects.Text;
    const circle = container.getAt(0) as Phaser.GameObjects.Arc;
    const degreeUsed = this.grid.getDegreeUsed(island);
    const style = FACTION_STYLES[island.faction] ?? FACTION_STYLES[0];

    if (degreeUsed === island.degree) {
      text.setColor('#4ade80');
      circle.setFillStyle(style.color, 0.7);
    } else if (degreeUsed > island.degree) {
      text.setColor('#f87171');
      circle.setFillStyle(style.color);
    } else {
      text.setColor('#ffffff');
      circle.setFillStyle(style.color);
    }
  }

  private flashIsland(island: Island): void {
    const container = this.islandGraphics.get(island.key);
    if (!container) return;
    this.tweens.add({
      targets: container,
      angle: { from: -3, to: 3 },
      duration: 75,
      yoyo: true,
      repeat: 2,
      onComplete: () => container.setAngle(0)
    });
  }

  private onLevelSolved(): void {
    this.solved = true;
    this.deselectIsland();

    const moves = this.history.moveCount;
    const par = this.levelData.parMoves;
    let stars = 1;
    if (moves <= par) stars = 3;
    else if (moves <= par * 1.5) stars = 2;

    // Save result
    const key = `${this.levelData.world}-${this.levelData.level}`;
    const save = SaveSystem.load();
    const existing = save.levelResults[key];
    if (!existing || stars > existing.stars || moves < existing.bestMoveCount) {
      save.levelResults[key] = {
        completed: true,
        stars: Math.max(stars, existing?.stars ?? 0),
        bestMoveCount: Math.min(moves, existing?.bestMoveCount ?? Infinity)
      };
      SaveSystem.save(save);
    }

    this.events.emit('level-complete', { stars, moves, par });

    // Celebration: pulse all bridges
    let delay = 0;
    for (const [, gfx] of this.bridgeGraphics) {
      this.tweens.add({
        targets: gfx,
        alpha: { from: 0.5, to: 1 },
        duration: 200,
        delay,
        yoyo: true
      });
      delay += 100;
    }

    // Bounce all islands
    for (const island of this.grid.islands) {
      const container = this.islandGraphics.get(island.key);
      if (container) {
        this.tweens.add({
          targets: container,
          scaleX: 1.08,
          scaleY: 1.08,
          duration: 300,
          delay: delay + 200,
          yoyo: true,
          ease: 'Bounce.Out'
        });
      }
    }
  }

  private handleShutdown(): void {
    this.cancelLongPress();
    this.clearDragLine();
    this.islandGraphics.clear();
    this.bridgeGraphics.clear();
    this.neighborHighlights = [];
  }
}
