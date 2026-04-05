import { describe, it, expect } from 'vitest';
import { Bridge } from './Bridge';
import { Island } from './Island';

describe('Bridge', () => {
  it('creates consistent keys regardless of order', () => {
    const key1 = Bridge.makeKey(0, 0, 2, 2);
    const key2 = Bridge.makeKey(2, 2, 0, 0);
    expect(key1).toBe(key2);
  });

  it('reports horizontal/vertical correctly', () => {
    const a = new Island(0, 0, 0, 1);
    const b = new Island(0, 3, 0, 1);
    const c = new Island(3, 0, 0, 1);

    const hBridge = new Bridge(a, b);
    expect(hBridge.isHorizontal).toBe(true);
    expect(hBridge.isVertical).toBe(false);

    const vBridge = new Bridge(a, c);
    expect(vBridge.isHorizontal).toBe(false);
    expect(vBridge.isVertical).toBe(true);
  });

  it('calculates occupied cells for horizontal bridge', () => {
    const a = new Island(0, 0, 0, 1);
    const b = new Island(0, 3, 0, 1);
    const bridge = new Bridge(a, b);
    const cells = bridge.occupiedCells();
    expect(cells).toEqual([
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ]);
  });

  it('calculates occupied cells for vertical bridge', () => {
    const a = new Island(0, 0, 0, 1);
    const b = new Island(3, 0, 0, 1);
    const bridge = new Bridge(a, b);
    const cells = bridge.occupiedCells();
    expect(cells).toEqual([
      { row: 1, col: 0 },
      { row: 2, col: 0 },
    ]);
  });

  it('returns empty cells for adjacent islands', () => {
    const a = new Island(0, 0, 0, 1);
    const b = new Island(0, 1, 0, 1);
    const bridge = new Bridge(a, b);
    expect(bridge.occupiedCells()).toEqual([]);
  });
});
