import { describe, expect, it } from 'vitest';

import { clamp } from './clamp';

describe('clamp', () => {
  it('returns the input when it is already in range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('caps values below the minimum', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });

  it('caps values above the maximum', () => {
    expect(clamp(42, 0, 10)).toBe(10);
  });
});