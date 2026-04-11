import Phaser from 'phaser';
import { APP } from '../config/app';
import { FACTION_STYLES } from '../config/factionColors';
import { TextButton } from '../ui/TextButton';

/* ------------------------------------------------------------------ */
/*  Mini-board types for tutorial illustrations                       */
/* ------------------------------------------------------------------ */

interface TutIsland {
  row: number; col: number; faction: number; degree: number;
  /** Override: show as satisfied (green number) */
  satisfied?: boolean;
}

interface TutBridge {
  r1: number; c1: number; r2: number; c2: number;
  faction: number; count: 1 | 2;
  /** Show as wrong / crossed-out */
  wrong?: boolean;
}

interface TutPage {
  title: string;
  body: string;
  gridW: number;
  gridH: number;
  islands: TutIsland[];
  bridges: TutBridge[];
  /** Optional highlight ring around certain islands */
  highlights?: Array<{ row: number; col: number; color: number }>;
  /** Optional crossed-bridge indicator */
  crossMark?: { row: number; col: number };
}

/* ------------------------------------------------------------------ */
/*  Tutorial pages                                                    */
/* ------------------------------------------------------------------ */

const PAGES: TutPage[] = [
  // Page 1 — Welcome
  {
    title: 'Welcome!',
    body: 'Your goal is to connect islands\nwith bridges.\n\nEach island shows a number —\nthat\'s how many bridges it needs.',
    gridW: 4, gridH: 3,
    islands: [
      { row: 1, col: 0, faction: 0, degree: 1 },
      { row: 1, col: 3, faction: 0, degree: 1 }
    ],
    bridges: [],
    highlights: [
      { row: 1, col: 0, color: 0xfbbf24 },
      { row: 1, col: 3, color: 0xfbbf24 }
    ]
  },

  // Page 2 — Building a bridge
  {
    title: 'Building Bridges',
    body: 'Tap an island to select it \u2014\na glowing ring appears.\nThen tap a neighbor to connect.\nOr drag between them.',
    gridW: 4, gridH: 3,
    islands: [
      { row: 1, col: 0, faction: 0, degree: 1, satisfied: true },
      { row: 1, col: 3, faction: 0, degree: 1, satisfied: true }
    ],
    bridges: [
      { r1: 1, c1: 0, r2: 1, c2: 3, faction: 0, count: 1 }
    ]
  },

  // Page 3 — Double bridges
  {
    title: 'Double Bridges',
    body: 'Connect the same pair again\nto build a double bridge.\n\nA double bridge counts as 2.',
    gridW: 4, gridH: 3,
    islands: [
      { row: 1, col: 0, faction: 0, degree: 2, satisfied: true },
      { row: 1, col: 3, faction: 0, degree: 2, satisfied: true }
    ],
    bridges: [
      { r1: 1, c1: 0, r2: 1, c2: 3, faction: 0, count: 2 }
    ]
  },

  // Page 4 — Removing bridges
  {
    title: 'Removing Bridges',
    body: 'Press and hold a bridge\nto remove it (one at a time).\n\nOr connect the same pair\na third time to cycle back to 0.',
    gridW: 4, gridH: 3,
    islands: [
      { row: 1, col: 0, faction: 0, degree: 2 },
      { row: 1, col: 3, faction: 0, degree: 2 }
    ],
    bridges: [
      { r1: 1, c1: 0, r2: 1, c2: 3, faction: 0, count: 1, wrong: true }
    ]
  },

  // Page 5 — Alignment rule
  {
    title: 'Straight Lines Only',
    body: 'Bridges only connect islands\nin the same row or column,\nwith no island in between.',
    gridW: 4, gridH: 4,
    islands: [
      { row: 0, col: 0, faction: 0, degree: 2, satisfied: true },
      { row: 0, col: 3, faction: 0, degree: 1, satisfied: true },
      { row: 3, col: 0, faction: 0, degree: 1, satisfied: true }
    ],
    bridges: [
      { r1: 0, c1: 0, r2: 0, c2: 3, faction: 0, count: 1 },
      { r1: 0, c1: 0, r2: 3, c2: 0, faction: 0, count: 1 }
    ]
  },

  // Page 6 — Factions (colors)
  {
    title: 'Factions (Colors)',
    body: 'Islands come in different colors.\nBridges can only connect islands\nof the same color.',
    gridW: 4, gridH: 4,
    islands: [
      { row: 0, col: 0, faction: 0, degree: 1, satisfied: true },
      { row: 0, col: 3, faction: 0, degree: 1, satisfied: true },
      { row: 3, col: 0, faction: 1, degree: 1, satisfied: true },
      { row: 3, col: 3, faction: 1, degree: 1, satisfied: true }
    ],
    bridges: [
      { r1: 0, c1: 0, r2: 0, c2: 3, faction: 0, count: 1 },
      { r1: 3, c1: 0, r2: 3, c2: 3, faction: 1, count: 1 }
    ]
  },

  // Page 7 — No crossing
  {
    title: 'No Crossing!',
    body: 'Bridges cannot cross\neach other — not even bridges\nof the same color.',
    gridW: 4, gridH: 4,
    islands: [
      { row: 0, col: 1, faction: 0, degree: 1, satisfied: true },
      { row: 3, col: 1, faction: 0, degree: 1, satisfied: true },
      { row: 1, col: 0, faction: 1, degree: 1 },
      { row: 1, col: 3, faction: 1, degree: 1 }
    ],
    bridges: [
      { r1: 0, c1: 1, r2: 3, c2: 1, faction: 0, count: 1 }
    ],
    crossMark: { row: 1, col: 1 }
  },

  // Page 8 — Win condition
  {
    title: 'Connect Everything!',
    body: 'Win by satisfying every\nisland\'s number AND connecting\nall islands of each color\ninto one group.',
    gridW: 5, gridH: 4,
    islands: [
      { row: 0, col: 0, faction: 0, degree: 2, satisfied: true },
      { row: 0, col: 4, faction: 0, degree: 1, satisfied: true },
      { row: 3, col: 0, faction: 0, degree: 1, satisfied: true },
      { row: 1, col: 2, faction: 1, degree: 2, satisfied: true },
      { row: 3, col: 2, faction: 1, degree: 1, satisfied: true },
      { row: 1, col: 4, faction: 1, degree: 1, satisfied: true }
    ],
    bridges: [
      { r1: 0, c1: 0, r2: 0, c2: 4, faction: 0, count: 1 },
      { r1: 0, c1: 0, r2: 3, c2: 0, faction: 0, count: 1 },
      { r1: 1, c1: 2, r2: 3, c2: 2, faction: 1, count: 1 },
      { r1: 1, c1: 2, r2: 1, c2: 4, faction: 1, count: 1 }
    ]
  },

  // Page 9 — Helpful tools
  {
    title: 'Helpful Tools',
    body: 'Use the buttons at the bottom:\n\n↩  Undo your last move\n↪  Redo a move\n💡  Get a hint\n🔄  Reset the puzzle',
    gridW: 0, gridH: 0,
    islands: [],
    bridges: []
  },

  // Page 10 — Ready to play
  {
    title: 'Ready to Play!',
    body: 'Every puzzle has exactly one\nsolution. Start with World 1\nfor an easy introduction, or try\nQuick Play for a random puzzle.\n\nGood luck!',
    gridW: 0, gridH: 0,
    islands: [],
    bridges: []
  }
];

/* ------------------------------------------------------------------ */
/*  Tutorial Scene                                                    */
/* ------------------------------------------------------------------ */

const BRIDGE_OFFSET = 4;

export class TutorialScene extends Phaser.Scene {
  private currentPage = 0;
  private pageContainer!: Phaser.GameObjects.Container;
  private prevBtn!: TextButton;
  private nextBtn!: TextButton;
  private pageIndicator!: Phaser.GameObjects.Text;

  constructor() {
    super('tutorial');
  }

  create(): void {
    this.currentPage = 0;
    this.cameras.main.setBackgroundColor(APP.backgroundColor);
    const { width, height } = this.scale;

    // Back button (top-left corner)
    new TextButton(this, 36, 36, 48, 40, '←', () => {
      this.scene.start('menu');
    }).setDepth(10);

    // Title
    this.add.text(width / 2, 36, 'How to Play', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      color: '#f8fafc',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Page container (rebuilt on each page)
    this.pageContainer = this.add.container(0, 0);

    // Navigation buttons at bottom
    const navY = height - 52;

    this.prevBtn = new TextButton(this, 60, navY, 90, 44, '← Back', () => {
      if (this.currentPage > 0) {
        this.currentPage--;
        this.showPage();
      }
    });

    this.nextBtn = new TextButton(this, width - 60, navY, 90, 44, 'Next →', () => {
      if (this.currentPage < PAGES.length - 1) {
        this.currentPage++;
        this.showPage();
      } else {
        this.scene.start('menu');
      }
    });

    this.pageIndicator = this.add.text(width / 2, navY, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#64748b'
    }).setOrigin(0.5);

    this.showPage();
  }

  private showPage(): void {
    const { width } = this.scale;
    const page = PAGES[this.currentPage];

    // Clear previous elements
    this.pageContainer.removeAll(true);

    // Update nav
    this.prevBtn.setAlpha(this.currentPage > 0 ? 1 : 0.3);
    this.prevBtn.setEnabled(this.currentPage > 0);
    this.nextBtn.setText(this.currentPage < PAGES.length - 1 ? 'Next →' : 'Done ✓');
    this.pageIndicator.setText(`${this.currentPage + 1} / ${PAGES.length}`);

    // Page title
    const titleText = this.add.text(width / 2, 90, page.title, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#93c5fd',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.pageContainer.add(titleText);

    // Draw mini game board if applicable
    let boardBottomY = 120;
    if (page.gridW > 0 && page.gridH > 0) {
      boardBottomY = this.drawMiniBoard(page, width / 2, 130);
    }

    // Body text below board
    const bodyText = this.add.text(width / 2, boardBottomY + 20, page.body, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#cbd5e1',
      align: 'center',
      lineSpacing: 6
    }).setOrigin(0.5, 0);
    this.pageContainer.add(bodyText);
  }

  /**
   * Draw a static mini game board for illustration.
   * Returns the Y coordinate of the bottom edge.
   */
  private drawMiniBoard(page: TutPage, cx: number, topY: number): number {
    const maxBoardW = 300;
    const maxBoardH = 260;
    const cellSize = Math.min(
      Math.floor(maxBoardW / page.gridW),
      Math.floor(maxBoardH / page.gridH)
    );
    const boardW = cellSize * page.gridW;
    const boardH = cellSize * page.gridH;
    const offsetX = cx - boardW / 2;
    const offsetY = topY;

    const toPixel = (row: number, col: number) => ({
      x: offsetX + col * cellSize + cellSize / 2,
      y: offsetY + row * cellSize + cellSize / 2
    });

    // Board background
    const bg = this.add.graphics();
    bg.fillStyle(0x111827, 0.5);
    bg.fillRoundedRect(offsetX - 8, offsetY - 8, boardW + 16, boardH + 16, 8);
    bg.lineStyle(1, 0x1e293b, 0.3);
    for (let r = 0; r <= page.gridH; r++) {
      const y = offsetY + r * cellSize;
      bg.lineBetween(offsetX, y, offsetX + boardW, y);
    }
    for (let c = 0; c <= page.gridW; c++) {
      const x = offsetX + c * cellSize;
      bg.lineBetween(x, offsetY, x, offsetY + boardH);
    }
    this.pageContainer.add(bg);

    // Draw bridges
    const bridgeGfx = this.add.graphics();
    bridgeGfx.setDepth(2);
    this.pageContainer.add(bridgeGfx);

    for (const br of page.bridges) {
      const posA = toPixel(br.r1, br.c1);
      const posB = toPixel(br.r2, br.c2);
      const style = FACTION_STYLES[br.faction] ?? FACTION_STYLES[0];
      const color = br.wrong ? 0xf87171 : style.color;
      const lineWidth = Math.max(2, Math.round(cellSize * 0.06));

      if (br.count === 1) {
        bridgeGfx.lineStyle(lineWidth, color, 0.9);
        bridgeGfx.lineBetween(posA.x, posA.y, posB.x, posB.y);
      } else {
        const offset = BRIDGE_OFFSET;
        const isHoriz = br.r1 === br.r2;
        if (isHoriz) {
          bridgeGfx.lineStyle(lineWidth, color, 0.9);
          bridgeGfx.lineBetween(posA.x, posA.y - offset, posB.x, posB.y - offset);
          bridgeGfx.lineBetween(posA.x, posA.y + offset, posB.x, posB.y + offset);
        } else {
          bridgeGfx.lineStyle(lineWidth, color, 0.9);
          bridgeGfx.lineBetween(posA.x - offset, posA.y, posB.x - offset, posB.y);
          bridgeGfx.lineBetween(posA.x + offset, posA.y, posB.x + offset, posB.y);
        }
      }
    }

    // Draw cross mark if applicable
    if (page.crossMark) {
      const pos = toPixel(page.crossMark.row, page.crossMark.col);
      const sz = cellSize * 0.3;
      const crossGfx = this.add.graphics();
      crossGfx.lineStyle(3, 0xf87171, 1);
      crossGfx.lineBetween(pos.x - sz, pos.y - sz, pos.x + sz, pos.y + sz);
      crossGfx.lineBetween(pos.x + sz, pos.y - sz, pos.x - sz, pos.y + sz);
      crossGfx.setDepth(3);
      this.pageContainer.add(crossGfx);
    }

    // Draw highlights
    if (page.highlights) {
      for (const hl of page.highlights) {
        const pos = toPixel(hl.row, hl.col);
        const ring = this.add.circle(pos.x, pos.y, cellSize * 0.42 + 6, hl.color, 0.2);
        ring.setStrokeStyle(2, hl.color, 0.6);
        ring.setDepth(4);
        this.pageContainer.add(ring);
      }
    }

    // Draw islands
    const radius = cellSize * 0.38;
    const fontSize = Math.max(14, Math.round(radius * 1.0));

    for (const isl of page.islands) {
      const pos = toPixel(isl.row, isl.col);
      const style = FACTION_STYLES[isl.faction] ?? FACTION_STYLES[0];

      const circle = this.add.circle(pos.x, pos.y, radius, style.color, isl.satisfied ? 0.7 : 1);
      circle.setStrokeStyle(2, 0xffffff, 0.8);
      circle.setDepth(10);
      this.pageContainer.add(circle);

      const numColor = isl.satisfied ? '#4ade80' : '#ffffff';
      const text = this.add.text(pos.x, pos.y, `${isl.degree}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${fontSize}px`,
        color: numColor,
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(11);
      this.pageContainer.add(text);
    }

    return offsetY + boardH + 8;
  }
}
