/**
 * Light on Painting - original procedural paintings with authored depth.
 *
 * Each painting is a flat list of shapes drawn in painter's order. Albedo
 * color and depth come from the SAME silhouette, so geometry edges always
 * match color edges (no fringing). Depth is 0..1, higher = closer to the
 * viewer; the shading pass relights the scene from the bulb position.
 *
 * The scenes are original compositions drawn with primitive shapes only -
 * no third-party artwork, no ML-baked depth maps.
 */

export type RGB = [number, number, number];

export type Shape =
  | { kind: "rect"; x: number; y: number; w: number; h: number; color: RGB; depth: number }
  | { kind: "circle"; cx: number; cy: number; r: number; color: RGB; depth: number }
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number; color: RGB; depth: number };

export interface Painting {
  name: string;
  /** Background: fills the canvas first. */
  wall: { color: RGB; depth: number };
  shapes: Shape[];
}

/** Coordinates are in a 0..100 scene space, scaled to the buffer. */
export const PAINTINGS: Painting[] = [
  {
    name: "Night Window",
    wall: { color: [24, 28, 44], depth: 0.15 },
    shapes: [
      // window recess (sky), set back from the wall
      { kind: "rect", x: 26, y: 8, w: 48, h: 52, color: [13, 20, 38], depth: 0.06 },
      // stars
      { kind: "circle", cx: 36, cy: 18, r: 0.9, color: [208, 214, 228], depth: 0.06 },
      { kind: "circle", cx: 64, cy: 14, r: 0.7, color: [190, 198, 216], depth: 0.06 },
      { kind: "circle", cx: 55, cy: 30, r: 0.6, color: [176, 186, 206], depth: 0.06 },
      { kind: "circle", cx: 33, cy: 38, r: 0.7, color: [190, 198, 216], depth: 0.06 },
      // moon
      { kind: "circle", cx: 61, cy: 22, r: 6.5, color: [224, 219, 196], depth: 0.07 },
      { kind: "circle", cx: 59, cy: 20.5, r: 1.4, color: [198, 193, 170], depth: 0.08 },
      { kind: "circle", cx: 63, cy: 24, r: 1, color: [205, 200, 178], depth: 0.08 },
      // window frame: outer + cross bars, proud of the wall
      { kind: "rect", x: 24, y: 6, w: 52, h: 3, color: [70, 50, 32], depth: 0.34 },
      { kind: "rect", x: 24, y: 57, w: 52, h: 3, color: [70, 50, 32], depth: 0.34 },
      { kind: "rect", x: 24, y: 6, w: 3, h: 54, color: [70, 50, 32], depth: 0.34 },
      { kind: "rect", x: 73, y: 6, w: 3, h: 54, color: [70, 50, 32], depth: 0.34 },
      { kind: "rect", x: 48.5, y: 6, w: 3, h: 54, color: [62, 44, 28], depth: 0.33 },
      { kind: "rect", x: 24, y: 31, w: 52, h: 3, color: [62, 44, 28], depth: 0.33 },
      // sill
      { kind: "rect", x: 18, y: 60, w: 64, h: 5, color: [96, 66, 40], depth: 0.46 },
      // potted plant on the sill
      { kind: "ellipse", cx: 50, cy: 70, rx: 9, ry: 7, color: [168, 82, 44], depth: 0.58 },
      { kind: "rect", x: 41, y: 64, w: 18, h: 3, color: [188, 98, 54], depth: 0.6 },
      { kind: "circle", cx: 50, cy: 56, r: 4.5, color: [62, 122, 66], depth: 0.72 },
      { kind: "circle", cx: 44, cy: 59, r: 3.8, color: [54, 108, 60], depth: 0.7 },
      { kind: "circle", cx: 56, cy: 59, r: 3.8, color: [70, 132, 72], depth: 0.7 },
      { kind: "circle", cx: 47, cy: 51, r: 3.2, color: [70, 132, 72], depth: 0.74 },
      { kind: "circle", cx: 54, cy: 52, r: 2.8, color: [54, 108, 60], depth: 0.73 },
      // small hanging frame on the right
      { kind: "rect", x: 84, y: 20, w: 12, h: 16, color: [92, 66, 42], depth: 0.3 },
      { kind: "rect", x: 86, y: 22.5, w: 8, h: 11, color: [52, 62, 74], depth: 0.26 },
      { kind: "circle", cx: 90, cy: 30.5, r: 2.2, color: [160, 120, 72], depth: 0.27 },
    ],
  },
  {
    name: "Still Life",
    wall: { color: [48, 34, 26], depth: 0.15 },
    shapes: [
      // warm plaster gradient blocks (upper lighter)
      { kind: "rect", x: 0, y: 0, w: 100, h: 34, color: [58, 42, 31], depth: 0.15 },
      // table band, closer
      { kind: "rect", x: 0, y: 68, w: 100, h: 32, color: [112, 76, 44], depth: 0.42 },
      { kind: "rect", x: 0, y: 68, w: 100, h: 3, color: [132, 92, 54], depth: 0.44 },
      // vase
      { kind: "ellipse", cx: 36, cy: 58, rx: 10, ry: 13, color: [110, 138, 160], depth: 0.66 },
      { kind: "rect", x: 32, y: 42, w: 8, h: 6, color: [122, 150, 172], depth: 0.64 },
      { kind: "ellipse", cx: 33, cy: 54, rx: 3.4, ry: 6, color: [140, 168, 190], depth: 0.68 },
      // stems and leaves from the vase
      { kind: "rect", x: 35, y: 26, w: 1.6, h: 18, color: [76, 110, 62], depth: 0.62 },
      { kind: "ellipse", cx: 30, cy: 30, rx: 4.5, ry: 2.4, color: [86, 124, 70], depth: 0.63 },
      { kind: "ellipse", cx: 41, cy: 27, rx: 4.2, ry: 2.2, color: [96, 134, 78], depth: 0.63 },
      { kind: "circle", cx: 36, cy: 22, r: 3, color: [196, 120, 60], depth: 0.65 },
      // fruit group on the table
      { kind: "circle", cx: 60, cy: 63, r: 6, color: [188, 74, 50], depth: 0.6 },
      { kind: "circle", cx: 70, cy: 64.5, r: 5, color: [206, 122, 44], depth: 0.59 },
      { kind: "circle", cx: 58, cy: 61, r: 1.4, color: [224, 130, 96], depth: 0.62 },
      { kind: "rect", x: 59.4, y: 55.4, w: 1.2, h: 3, color: [96, 70, 40], depth: 0.61 },
      // small plate under the fruit
      { kind: "ellipse", cx: 65, cy: 70, rx: 14, ry: 2.6, color: [190, 182, 168], depth: 0.5 },
    ],
  },
];

export interface RasterizedPainting {
  name: string;
  size: number;
  albedo: Uint8ClampedArray; // RGBA
  depth: Float32Array;
}

function inside(s: Shape, x: number, y: number): boolean {
  if (s.kind === "rect") return x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h;
  if (s.kind === "circle") {
    const dx = x - s.cx;
    const dy = y - s.cy;
    return dx * dx + dy * dy <= s.r * s.r;
  }
  const dx = (x - s.cx) / s.rx;
  const dy = (y - s.cy) / s.ry;
  return dx * dx + dy * dy <= 1;
}

/**
 * Rasterize albedo + depth at size x size. Painter's order: later shapes win.
 * Supersampled ss x ss per pixel and box-filtered down, so silhouettes are
 * smooth instead of stair-stepped after upscaling.
 */
export function rasterize(p: Painting, size: number, ss = 2): RasterizedPainting {
  const hi = size * ss;
  const hiAlbedo = new Float32Array(hi * hi * 3);
  const hiDepth = new Float32Array(hi * hi);
  const k = 100 / hi;
  for (let y = 0; y < hi; y++) {
    for (let x = 0; x < hi; x++) {
      const sx = (x + 0.5) * k;
      const sy = (y + 0.5) * k;
      let c = p.wall.color;
      let d = p.wall.depth;
      for (const s of p.shapes) {
        if (inside(s, sx, sy)) {
          c = s.color;
          d = s.depth;
        }
      }
      const i = y * hi + x;
      hiAlbedo[i * 3] = c[0];
      hiAlbedo[i * 3 + 1] = c[1];
      hiAlbedo[i * 3 + 2] = c[2];
      hiDepth[i] = d;
    }
  }
  const albedo = new Uint8ClampedArray(size * size * 4);
  const depth = new Float32Array(size * size);
  const n = ss * ss;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, d = 0;
      for (let dy = 0; dy < ss; dy++) {
        for (let dx = 0; dx < ss; dx++) {
          const i = (y * ss + dy) * hi + (x * ss + dx);
          r += hiAlbedo[i * 3];
          g += hiAlbedo[i * 3 + 1];
          b += hiAlbedo[i * 3 + 2];
          d += hiDepth[i];
        }
      }
      const o = y * size + x;
      albedo[o * 4] = r / n;
      albedo[o * 4 + 1] = g / n;
      albedo[o * 4 + 2] = b / n;
      albedo[o * 4 + 3] = 255;
      depth[o] = d / n;
    }
  }
  return { name: p.name, size, albedo, depth };
}
