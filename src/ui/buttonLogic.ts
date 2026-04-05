export function isPointWithinButtonBounds(
    pointX: number,
    pointY: number,
    centerX: number,
    centerY: number,
    width: number,
    height: number
): boolean {
    return Math.abs(pointX - centerX) <= width / 2 && Math.abs(pointY - centerY) <= height / 2;
}