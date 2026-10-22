// Look of the Sand Hourglass card: a blown-glass hourglass on turned wooden
// plates and pillars, in a dark room. The static frame is plain data so the
// Skia component and the web preview draw the same picture.
export const HOUR_W = 320;
export const HOUR_H = 380;
export const HOUR_BACKGROUND = "#0a0f1c";
export const HOUR_GLASS = "rgba(226, 234, 255, 0.5)";
export const HOUR_GLASS_SOFT = "rgba(226, 234, 255, 0.14)";
export const HOUR_PLATE = "#4a3620";
export const HOUR_PLATE_EDGE = "#7a5c34";
// Sand shades, lightest first; grains keep the shade they were seeded with.
export const SAND_SHADES = ["#f1cf8a", "#e8c070", "#dfb25c", "#d2a24c"];
// Under-layer behind every grain: shades the rim of the pile and the gaps.
export const SAND_RIM = "#8f6322";
export const SAND_RIM_STROKE = 3.5;
// Grain disks are drawn a little larger than the physics radius so that
// neighbours overlap into a continuous body of sand, with the shade variation
// left as fine mottling. Two sizes keep the pile from looking like a grid.
export const SAND_STROKES = [2.8, 2.4];

export type HourFill =
  | string
  | { lin: [number, number, number, number]; stops: [number, string][] };
export type HourPrim = { x: number; y: number; w: number; h: number; r: number; fill: HourFill };

// Behind the glass: floor shadow, then the two turned pillars.
export const HOUR_BACK: HourPrim[] = [
  { x: 52, y: 358, w: 216, h: 16, r: 8, fill: "rgba(0, 0, 0, 0.55)" },
  { x: 40, y: 22, w: 8, h: 336, r: 4, fill: { lin: [40, 0, 48, 0], stops: [[0, "#4a331b"], [0.35, "#c29a5c"], [1, "#4b341c"]] } },
  { x: 272, y: 22, w: 8, h: 336, r: 4, fill: { lin: [272, 0, 280, 0], stops: [[0, "#4a331b"], [0.35, "#c29a5c"], [1, "#4b341c"]] } },
];
// In front: the two plates with a lit top edge, and pillar collars.
export const HOUR_FRONT: HourPrim[] = [
  { x: 34, y: 14, w: 252, h: 18, r: 7, fill: { lin: [0, 14, 0, 32], stops: [[0, "#b08a52"], [0.18, "#8a6a3c"], [1, "#35240f"]] } },
  { x: 34, y: 348, w: 252, h: 18, r: 7, fill: { lin: [0, 348, 0, 366], stops: [[0, "#8a6a3c"], [0.7, "#4a3620"], [1, "#2a1b0b"]] } },
  { x: 38, y: 17, w: 244, h: 2, r: 1, fill: "rgba(255, 226, 170, 0.55)" },
  { x: 38, y: 351, w: 244, h: 2, r: 1, fill: "rgba(255, 226, 170, 0.35)" },
];
// Cylinder shading across the glass: bright rims, clear middle.
export const HOUR_GLASS_SHADE: { lin: [number, number, number, number]; stops: [number, string][] } = {
  lin: [56, 0, 264, 0],
  stops: [[0, "rgba(190, 210, 255, 0.24)"], [0.2, "rgba(190, 210, 255, 0.06)"], [0.5, "rgba(190, 210, 255, 0.03)"], [0.82, "rgba(190, 210, 255, 0.07)"], [1, "rgba(190, 210, 255, 0.22)"]],
};
