import { describe, it, expect } from 'vitest';
import { Grid } from './Grid';
import { Island } from './Island';

describe('Grid', () => {
  function makeSimpleGrid(): Grid {
    // 3x3 grid, 4 islands of faction 0 at corners
    const islands = [
      new Island(0, 0, 0, 1),
      new Island(0, 2, 0, 1),
      new Island(2, 0, 0, 1),
      new Island(2, 2, 0, 1),
    ];
    return new Grid(3, 3, islands);
  }

  it('finds neighbors in same faction along row/column', () => {
    const grid = makeSimpleGrid();
    const island = grid.getIsland(0, 0)!;
    const neighbors = grid.getNeighbors(island);
    expect(neighbors).toHaveLength(2);
    const keys = neighbors.map((n) => n.key).sort();
    expect(keys).toEqual(['0,2', '2,0']);
  });

  it('does not find neighbors of different faction', () => {
    const islands = [
      new Island(0, 0, 0, 1),
      new Island(0, 2, 1, 1), // different faction
    ];
    const grid = new Grid(3, 3, islands);
    const neighbors = grid.getNeighbors(islands[0]);
    expect(neighbors).toHaveLength(0);
  });

  it('stops at first island in line (no bridge over islands)', () => {
    const islands = [
      new Island(0, 0, 0, 2),
      new Island(0, 1, 0, 2),
      new Island(0, 2, 0, 2),
    ];
    const grid = new Grid(3, 3, islands);
    const neighbors = grid.getNeighbors(islands[0]);
    expect(neighbors).toHaveLength(1);
    expect(neighbors[0].key).toBe('0,1');
  });

  it('cycles bridge count 0 → 1 → 2 → 0', () => {
    const grid = makeSimpleGrid();
    const a = grid.islands[0];
    const b = grid.islands[1];

    expect(grid.getBridgeCount(a, b)).toBe(0);
    grid.cycleBridge(a, b);
    expect(grid.getBridgeCount(a, b)).toBe(1);
    grid.cycleBridge(a, b);
    expect(grid.getBridgeCount(a, b)).toBe(2);
    grid.cycleBridge(a, b);
    expect(grid.getBridgeCount(a, b)).toBe(0);
  });

  it('tracks degree used per island', () => {
    const grid = makeSimpleGrid();
    const a = grid.islands[0];
    const b = grid.islands[1];
    const c = grid.islands[2];

    grid.cycleBridge(a, b); // count = 1
    expect(grid.getDegreeUsed(a)).toBe(1);
    expect(grid.getDegreeUsed(b)).toBe(1);
    expect(grid.getDegreeUsed(c)).toBe(0);
  });

  it('detects island satisfaction', () => {
    const islands = [
      new Island(0, 0, 0, 1),
      new Island(0, 2, 0, 1),
    ];
    const grid = new Grid(3, 3, islands);
    expect(grid.isIslandSatisfied(islands[0])).toBe(false);
    grid.cycleBridge(islands[0], islands[1]);
    expect(grid.isIslandSatisfied(islands[0])).toBe(true);
    expect(grid.isIslandSatisfied(islands[1])).toBe(true);
  });

  it('detects solved state', () => {
    const islands = [
      new Island(0, 0, 0, 1),
      new Island(0, 2, 0, 1),
    ];
    const grid = new Grid(3, 3, islands);
    expect(grid.isSolved()).toBe(false);
    grid.cycleBridge(islands[0], islands[1]);
    expect(grid.isSolved()).toBe(true);
  });

  it('detects faction connectivity', () => {
    const islands = [
      new Island(0, 0, 0, 1),
      new Island(0, 2, 0, 2),
      new Island(2, 2, 0, 1),
    ];
    const grid = new Grid(3, 3, islands);
    expect(grid.isFactionConnected(0)).toBe(false);

    grid.cycleBridge(islands[0], islands[1]); // connect 0,0 and 0,2
    expect(grid.isFactionConnected(0)).toBe(false); // 2,2 still disconnected

    grid.cycleBridge(islands[1], islands[2]); // connect 0,2 and 2,2
    expect(grid.isFactionConnected(0)).toBe(true);
  });

  it('resets all bridges', () => {
    const grid = makeSimpleGrid();
    grid.cycleBridge(grid.islands[0], grid.islands[1]);
    expect(grid.getDegreeUsed(grid.islands[0])).toBe(1);
    grid.reset();
    expect(grid.getDegreeUsed(grid.islands[0])).toBe(0);
  });

  it('creates from LevelData', () => {
    const grid = Grid.fromLevelData({
      id: '1-1',
      world: 1,
      level: 1,
      gridWidth: 5,
      gridHeight: 5,
      islands: [
        { row: 0, col: 0, faction: 0, degree: 2 },
        { row: 0, col: 4, faction: 0, degree: 1 },
      ],
      parMoves: 1,
    });
    expect(grid.width).toBe(5);
    expect(grid.height).toBe(5);
    expect(grid.islands).toHaveLength(2);
  });
});
