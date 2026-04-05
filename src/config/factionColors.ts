export interface FactionStyle {
  color: number;
  hex: string;
  name: string;
}

export const FACTION_STYLES: FactionStyle[] = [
  { color: 0x3b82f6, hex: '#3b82f6', name: 'Blue' },
  { color: 0xef4444, hex: '#ef4444', name: 'Red' },
  { color: 0x22c55e, hex: '#22c55e', name: 'Green' },
  { color: 0xf59e0b, hex: '#f59e0b', name: 'Amber' }
];

export const SATISFIED_COLOR = 0x4ade80;
export const OVERCONNECTED_COLOR = 0xf87171;
