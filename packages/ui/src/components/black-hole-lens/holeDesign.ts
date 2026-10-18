export const HOLE_W = 340;
export const HOLE_H = 380;
export const HOLE_HOME_X = 170;
export const HOLE_HOME_Y = 168;
export const SPACE_BACKGROUND = "#04060d";

export const RING_COLOR: [number, number, number] = [0.75, 0.85, 1.0];
export const RING_STRENGTH = 0.65;

export const HALO_TOP = { height: 26, atten: 0.85 };
export const HALO_BOTTOM = { height: 18, atten: 0.4 };

export type Nebula = { x: number; y: number; r: number; color: [number, number, number]; alpha: number };

export const NEBULAE: Nebula[] = [
  { x: 0.2, y: 0.2, r: 0.5, color: [44, 32, 88], alpha: 0.5 },
  { x: 0.86, y: 0.7, r: 0.44, color: [16, 50, 74], alpha: 0.45 },
  { x: 0.6, y: 0.08, r: 0.34, color: [86, 34, 60], alpha: 0.32 },
];

export const GALAXY = { x: 0.8, y: 0.3, rx: 34, ry: 11, angle: -0.5 };

export function starColor(tint: number): [number, number, number] {
  if (tint < 0.3) return [1.0, 0.92, 0.78];
  if (tint < 0.72) return [0.96, 0.97, 1.0];
  return [0.72, 0.82, 1.0];
}

export const PLANET_PALETTE = {
  light: [236, 220, 178] as const,
  mid: [199, 152, 96] as const,
  dark: [128, 88, 48] as const,
  band: [112, 72, 38] as const,
  glow: [244, 232, 200] as const,
};
