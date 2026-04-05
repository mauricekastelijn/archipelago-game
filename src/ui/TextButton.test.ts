import { describe, expect, it } from 'vitest';

import { isPointWithinButtonBounds } from './buttonLogic';

describe('isPointWithinButtonBounds', () => {
    it('returns true for the center of the button', () => {
        expect(isPointWithinButtonBounds(100, 100, 100, 100, 250, 72)).toBe(true);
    });

    it('returns true at the exact edge', () => {
        // Right edge: 100 + 125 = 225
        expect(isPointWithinButtonBounds(225, 100, 100, 100, 250, 72)).toBe(true);
        // Bottom edge: 100 + 36 = 136
        expect(isPointWithinButtonBounds(100, 136, 100, 100, 250, 72)).toBe(true);
        // Left edge: 100 - 125 = -25
        expect(isPointWithinButtonBounds(-25, 100, 100, 100, 250, 72)).toBe(true);
        // Top edge: 100 - 36 = 64
        expect(isPointWithinButtonBounds(100, 64, 100, 100, 250, 72)).toBe(true);
    });

    it('returns false one pixel beyond each edge', () => {
        expect(isPointWithinButtonBounds(226, 100, 100, 100, 250, 72)).toBe(false);
        expect(isPointWithinButtonBounds(100, 137, 100, 100, 250, 72)).toBe(false);
        expect(isPointWithinButtonBounds(-26, 100, 100, 100, 250, 72)).toBe(false);
        expect(isPointWithinButtonBounds(100, 63, 100, 100, 250, 72)).toBe(false);
    });
});