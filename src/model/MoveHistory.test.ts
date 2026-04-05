import { describe, it, expect } from 'vitest';
import { MoveHistory } from './MoveHistory';

describe('MoveHistory', () => {
  it('starts empty', () => {
    const h = new MoveHistory();
    expect(h.moveCount).toBe(0);
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(false);
  });

  it('pushes and undoes moves', () => {
    const h = new MoveHistory();
    h.push({ bridgeKey: 'a', previousCount: 0, newCount: 1 });
    expect(h.moveCount).toBe(1);
    expect(h.canUndo).toBe(true);

    const move = h.undo();
    expect(move).toBeDefined();
    expect(move!.bridgeKey).toBe('a');
    expect(h.moveCount).toBe(0);
    expect(h.canRedo).toBe(true);
  });

  it('redoes after undo', () => {
    const h = new MoveHistory();
    h.push({ bridgeKey: 'a', previousCount: 0, newCount: 1 });
    h.undo();
    const move = h.redo();
    expect(move).toBeDefined();
    expect(move!.bridgeKey).toBe('a');
    expect(h.moveCount).toBe(1);
  });

  it('clears redo stack on new push', () => {
    const h = new MoveHistory();
    h.push({ bridgeKey: 'a', previousCount: 0, newCount: 1 });
    h.undo();
    h.push({ bridgeKey: 'b', previousCount: 0, newCount: 1 });
    expect(h.canRedo).toBe(false);
  });

  it('clears everything', () => {
    const h = new MoveHistory();
    h.push({ bridgeKey: 'a', previousCount: 0, newCount: 1 });
    h.push({ bridgeKey: 'b', previousCount: 0, newCount: 1 });
    h.clear();
    expect(h.moveCount).toBe(0);
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(false);
  });
});
