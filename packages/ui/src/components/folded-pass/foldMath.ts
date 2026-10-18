// Folded Pass geometry. Three panels joined by two creases (a Z-fold), seen through a perspective camera.
// Pure functions shared by the React Native Skia component and the web preview, so both draw the same mesh.
export type Point = { x: number; y: number };
export type PanelMesh = { pos: Point[]; shade: number[]; front: boolean };
export type FoldMesh = { panels: PanelMesh[] };

export const PANELS = 3;
export const COLS = 4;
// Row stops along a panel (0 = start crease, 1 = end crease). Dense near the creases so crease shading has resolution.
export const ROW_STOPS = [0, 0.025, 0.06, 0.11, 0.2, 0.35, 0.5, 0.65, 0.8, 0.89, 0.94, 0.975, 1];
export const ROWS = ROW_STOPS.length - 1;
export const VERTS = (COLS + 1) * (ROWS + 1);
// A fully folded pass stops a hair short of 180 degrees so the stack keeps a defined paper order.
export const PSI_MAX = Math.PI - 0.02;
const CAMERA = 560;
const YAW = 0.11;
const LIGHT = (() => {
  const l = [-0.32, -0.5, 0.8];
  const n = Math.hypot(l[0], l[1], l[2]);
  return [l[0] / n, l[1] / n, l[2] / n];
})();

export const clamp = (v: number, lo = 0, hi = 1) => {
  "worklet";
  return Math.max(lo, Math.min(hi, v));
};
const smooth = (v: number) => {
  "worklet";
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};

export function makeFoldGrid() {
  const uv: Point[] = [],
    indices: number[] = [];
  for (let r = 0; r <= ROWS; r++) for (let c = 0; c <= COLS; c++) uv.push({ x: c / COLS, y: ROW_STOPS[r] });
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const a = r * (COLS + 1) + c,
        b = a + 1,
        d = a + COLS + 1,
        e = d + 1;
      indices.push(a, b, d, b, e, d);
    }
  return { uv, indices };
}

// Fold turn at each crease. u = 0 is folded, u = 1 is flat. A little overshoot past 1 is allowed (spring settle).
export function foldAngle(u: number) {
  "worklet";
  return clamp(1 - u, -0.05, 1) * PSI_MAX;
}

// Vertical drag distance that moves the pass from folded to open.
export function scrub(start: number, dy: number, distance: number) {
  "worklet";
  return clamp(start + dy / Math.max(1, distance), 0, 1);
}
export function releaseTarget(u: number, velocityY: number) {
  "worklet";
  return Math.abs(velocityY) > 0.3 ? velocityY > 0 : u >= 0.5;
}

// Paper position along panel 2 (the free panel between the creases). Its direction turns slowly along its
// length (a bow), so it bends like paper instead of staying a rigid plank.
function bowOf(psi: number) {
  "worklet";
  return 0.34 * Math.sin(psi);
}

export function foldMesh(u: number, width: number, panelHeight: number): FoldMesh {
  "worklet";
  const H = panelHeight,
    W = width,
    cx = W / 2;
  const uu = clamp(u, 0, 1.05);
  const psi = foldAngle(uu);
  const bow = bowOf(psi);
  const gamma = YAW * Math.sin(Math.PI * clamp(uu));
  const cg = Math.cos(gamma),
    sg = Math.sin(gamma);
  const vy = H * 3;
  const a0 = psi - bow / 2;
  const sinA0 = Math.sin(a0),
    cosA0 = Math.cos(a0);
  const k = (1 - Math.cos(psi)) / 2; // 0 flat, 1 fully folded
  const panels: PanelMesh[] = [];
  const yEnd2 = (() => {
    if (Math.abs(bow) < 1e-6) return H + H * Math.cos(psi);
    return H + (H * (Math.sin(psi + bow / 2) - sinA0)) / bow;
  })();
  const zEnd2 = (() => {
    if (Math.abs(bow) < 1e-6) return -H * Math.sin(psi);
    return (H * (Math.cos(psi + bow / 2) - cosA0)) / bow;
  })();
  for (let p = 0; p < PANELS; p++) {
    const pos: Point[] = [],
      shade: number[] = [];
    for (let r = 0; r <= ROWS; r++) {
      const s = ROW_STOPS[r];
      let y = 0,
        z = 0,
        alpha = 0;
      if (p === 0) {
        y = s * H;
      } else if (p === 1) {
        alpha = a0 + bow * s;
        if (Math.abs(bow) < 1e-6) {
          y = H + H * s * Math.cos(psi);
          z = -H * s * Math.sin(psi);
        } else {
          y = H + (H * (Math.sin(alpha) - sinA0)) / bow;
          z = (H * (Math.cos(alpha) - cosA0)) / bow;
        }
      } else {
        y = yEnd2 + s * H;
        z = zEnd2;
      }
      // Surface normal of the panel's front face before yaw.
      const ny = Math.sin(alpha),
        nzFlat = Math.cos(alpha);
      const nx = nzFlat * sg,
        nz = nzFlat * cg;
      let lit = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / LIGHT[2];
      for (let c = 0; c <= COLS; c++) {
        const x0 = (c / COLS) * W - cx;
        const xr = x0 * cg + z * sg,
          zr = -x0 * sg + z * cg;
        const scale = CAMERA / (CAMERA - zr);
        pos.push({ x: cx + xr * scale, y: vy + (y - vy) * scale });
        shade.push(lit); // temporary: lighting before facing and creases are known
      }
    }
    // Facing from the signed area of the projected panel outline (positive = front toward the viewer).
    const tl = pos[0],
      tr = pos[COLS],
      bl = pos[ROWS * (COLS + 1)],
      br = pos[ROWS * (COLS + 1) + COLS];
    const area =
      tl.x * tr.y - tr.x * tl.y + (tr.x * br.y - br.x * tr.y) + (br.x * bl.y - bl.x * br.y) + (bl.x * tl.y - tl.x * bl.y);
    const front = area >= 0;
    for (let r = 0; r <= ROWS; r++) {
      const s = ROW_STOPS[r];
      // Distances to the creases, in panel heights.
      const startCrease = p > 0, // panel 2 and 3 have a crease at their start
        endCrease = p < PANELS - 1; // panel 1 and 2 have one at their end
      // Crease 1 (between panels 1 and 2) is a ridge seen from the front; crease 2 is a valley from the front.
      const startKind = p === 1 ? (front ? 0.12 : 0.34) : p === 2 ? (front ? 0.34 : 0.12) : 0;
      const endKind = p === 0 ? (front ? 0.12 : 0.34) : p === 1 ? (front ? 0.34 : 0.12) : 0;
      let ao = 0;
      if (startCrease) ao += startKind * k * Math.pow(1 - smooth(s / 0.22), 1.6);
      if (endCrease) ao += endKind * k * Math.pow(1 - smooth((1 - s) / 0.22), 1.6);
      // Panel 3's top sits in the shadow of the panel above it while folded.
      if (p === 2) ao += 0.22 * k * Math.pow(1 - smooth(s / 0.9), 2);
      for (let c = 0; c <= COLS; c++) {
        const i = r * (COLS + 1) + c;
        let lit = shade[i];
        if (!front) lit = 2 - lit; // back face: light on the opposite side of the normal
        const base = 0.68 + 0.32 * clamp(lit, 0, 1);
        shade[i] = clamp(base * (1 - ao), 0.18, 1);
      }
    }
    panels.push({ pos, shade, front });
  }
  return { panels };
}

// Texture coordinates inside one atlas: fronts in the left half, backs in the right half, panels stacked top to bottom.
// Backs are mapped upside down because folding a panel over turns it about its crease.
export function atlasUV(panel: number, front: boolean, uv: Point[], atlasW: number, atlasH: number): Point[] {
  "worklet";
  const out: Point[] = [];
  for (let i = 0; i < uv.length; i++) {
    const u = uv[i].x,
      v = uv[i].y;
    const ax = front ? u * 0.5 : 0.5 + u * 0.5;
    const ay = (panel + (front ? v : 1 - v)) / PANELS;
    out.push({ x: ax * atlasW, y: ay * atlasH });
  }
  return out;
}

