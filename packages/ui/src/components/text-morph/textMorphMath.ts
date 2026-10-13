// Pure maths for Text Morph. No React Native imports, so it runs on the UI
// thread, on the site and in Node tests. Per-frame functions are worklets.

/** 8-bit RGBA pixels, row-major, top row first. */
export type PixelImage = {
  width: number;
  height: number;
  data: ArrayLike<number>;
};

export type Glyph = { ch: string; x: number; y: number; w: number };
export type TextLayout = { glyphs: Glyph[]; height: number };
export type Target = { x: number; y: number; r: number; g: number; b: number };
export type Box = { x: number; y: number; w: number; h: number };

export type MorphData = {
  count: number;
  chars: string[];
  /** Glyph centre on the page, then centre in the picture. */
  sx: number[];
  sy: number[];
  ex: number[];
  ey: number[];
  /** Glyph width on the page (points) and its width scale in the picture. */
  gw: number[];
  /** Picture colour per glyph, 0..1. */
  cr: number[];
  cg: number[];
  cb: number[];
  /** Start delay 0..1, curl side and strength, spin (radians). */
  delay: number[];
  curl: number[];
  spin: number[];
  fontSize: number;
};

export const PICTURE_SCALE = 0.72;
export const SPREAD = 0.5;

function hash(i: number, salt: number) {
  let h = (Math.imul(i + 1, 374761393) + Math.imul(salt + 7, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Word-wrap a paragraph. `measure` returns the advance of one character. */
export function layoutParagraph(
  text: string,
  maxWidth: number,
  lineHeight: number,
  measure: (ch: string) => number,
): TextLayout {
  const glyphs: Glyph[] = [];
  const space = measure(" ");
  let x = 0;
  let line = 0;
  const paragraphs = text.split("\n");
  paragraphs.forEach((para, pi) => {
    if (pi > 0) {
      line += 1;
      x = 0;
    }
    const words = para.split(/\s+/).filter(Boolean);
    words.forEach((word) => {
      const widths = Array.from(word).map(measure);
      const total = widths.reduce((a, b) => a + b, 0);
      if (x > 0 && x + total > maxWidth) {
        line += 1;
        x = 0;
      }
      Array.from(word).forEach((ch, k) => {
        glyphs.push({ ch, x, y: line * lineHeight, w: widths[k] });
        x += widths[k];
      });
      x += space;
    });
  });
  return { glyphs, height: (line + 1) * lineHeight };
}

function lum(r: number, g: number, b: number) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Pick `count` points inside `box` with density proportional to how bright and
 * opaque the image is there, then relax them apart so letters do not pile up.
 * Points come back in reading order (top to bottom, left to right) and carry
 * the image colour under them.
 */
export function sampleTargets(
  img: PixelImage,
  count: number,
  box: Box,
  options: { grid?: number; contrast?: number; floor?: number; relax?: number } = {},
): Target[] {
  const grid = options.grid ?? 96;
  const contrast = options.contrast ?? 1.15;
  const floor = options.floor ?? 0.03;
  const relax = options.relax ?? 14;
  const gw = Math.min(grid, img.width);
  const gh = Math.min(grid, img.height);
  const weight: number[] = new Array(gw * gh);
  let total = 0;
  for (let gy = 0; gy < gh; gy += 1) {
    for (let gx = 0; gx < gw; gx += 1) {
      const px = Math.min(img.width - 1, Math.floor(((gx + 0.5) / gw) * img.width));
      const py = Math.min(img.height - 1, Math.floor(((gy + 0.5) / gh) * img.height));
      const o = (py * img.width + px) * 4;
      const a = img.data[o + 3] / 255;
      const w = a * (floor + Math.pow(lum(img.data[o], img.data[o + 1], img.data[o + 2]), contrast));
      weight[gy * gw + gx] = w;
      total += w;
    }
  }
  const pts: number[] = [];
  let acc = 0;
  let cell = 0;
  let cum = weight[0];
  for (let i = 0; i < count; i += 1) {
    const q = ((i + 0.5) / count) * total;
    while (cum < q && cell < weight.length - 1) {
      cell += 1;
      cum += weight[cell];
    }
    const gx = cell % gw;
    const gy = Math.floor(cell / gw);
    pts.push(
      (gx + hash(i, 1)) / gw,
      (gy + hash(i, 2)) / gh,
    );
    acc += 1;
  }
  // Relaxation: push close neighbours apart (unit square coordinates).
  const r = 0.8 / Math.sqrt(count);
  for (let it = 0; it < relax; it += 1) {
    const dx = new Array(count).fill(0);
    const dy = new Array(count).fill(0);
    for (let i = 0; i < count; i += 1) {
      for (let j = i + 1; j < count; j += 1) {
        const ax = pts[j * 2] - pts[i * 2];
        const ay = pts[j * 2 + 1] - pts[i * 2 + 1];
        if (ax > r || ax < -r || ay > r || ay < -r) continue;
        const d = Math.hypot(ax, ay);
        if (d >= r || d === 0) continue;
        const push = ((r - d) / d) * 0.25;
        dx[i] -= ax * push;
        dy[i] -= ay * push;
        dx[j] += ax * push;
        dy[j] += ay * push;
      }
    }
    for (let i = 0; i < count; i += 1) {
      pts[i * 2] = Math.min(0.999, Math.max(0.001, pts[i * 2] + dx[i]));
      pts[i * 2 + 1] = Math.min(0.999, Math.max(0.001, pts[i * 2 + 1] + dy[i]));
    }
  }
  const out: Target[] = [];
  for (let i = 0; i < count; i += 1) {
    const u = pts[i * 2];
    const v = pts[i * 2 + 1];
    const px = Math.min(img.width - 1, Math.floor(u * img.width));
    const py = Math.min(img.height - 1, Math.floor(v * img.height));
    const o = (py * img.width + px) * 4;
    out.push({
      x: box.x + u * box.w,
      y: box.y + v * box.h,
      r: img.data[o] / 255,
      g: img.data[o + 1] / 255,
      b: img.data[o + 2] / 255,
    });
  }
  const band = box.h / 38;
  out.sort((a, b) => {
    const ra = Math.floor((a.y - box.y) / band);
    const rb = Math.floor((b.y - box.y) / band);
    return ra !== rb ? ra - rb : a.x - b.x;
  });
  return out;
}

export type MorphConfig = {
  width: number;
  height: number;
  fontSize: number;
  lineHeight: number;
  margin: number;
};

export function makeConfig(width: number): MorphConfig {
  const fontSize = Math.max(8, width * 0.032);
  return {
    width,
    height: width * 1.25,
    fontSize,
    lineHeight: fontSize * 1.5,
    margin: width * 0.075,
  };
}

/** Pair every glyph with a picture point and give it a flight personality. */
export function buildMorph(
  text: string,
  img: PixelImage,
  cfg: MorphConfig,
  measure: (ch: string) => number,
): MorphData {
  const maxW = cfg.width - cfg.margin * 2;
  const room = cfg.height - cfg.margin * 2;
  // Too much text for the card: shrink the type until the page fits.
  let scale = 1;
  let layout = layoutParagraph(text, maxW, cfg.lineHeight, measure);
  while (layout.height > room && scale > 0.3) {
    scale *= 0.94;
    layout = layoutParagraph(text, maxW, cfg.lineHeight * scale, (ch) => measure(ch) * scale);
  }
  const fontSize = cfg.fontSize * scale;
  const lineHeight = cfg.lineHeight * scale;
  const n = layout.glyphs.length;
  const free = cfg.height - cfg.margin * 2 - layout.height;
  const top = cfg.margin + Math.max(0, free) / 2;
  const box: Box = {
    x: cfg.margin,
    y: cfg.margin,
    w: cfg.width - cfg.margin * 2,
    h: cfg.height - cfg.margin * 2,
  };
  const targets = sampleTargets(img, n, box);
  const d: MorphData = {
    count: n,
    chars: [],
    sx: [],
    sy: [],
    ex: [],
    ey: [],
    gw: [],
    cr: [],
    cg: [],
    cb: [],
    delay: [],
    curl: [],
    spin: [],
    fontSize,
  };
  layout.glyphs.forEach((g, i) => {
    const t = targets[i];
    d.chars.push(g.ch);
    d.sx.push(cfg.margin + g.x + g.w / 2);
    d.sy.push(top + g.y + lineHeight * 0.58);
    d.ex.push(t.x);
    d.ey.push(t.y);
    d.gw.push(g.w);
    d.cr.push(t.r);
    d.cg.push(t.g);
    d.cb.push(t.b);
    d.delay.push(0.72 * (i / Math.max(1, n - 1)) + 0.28 * hash(i, 3));
    d.curl.push((hash(i, 4) - 0.5) * 2);
    d.spin.push((hash(i, 5) - 0.5) * 9);
  });
  return d;
}

export function smoothstep(a: number, b: number, x: number) {
  "worklet";
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function easeInOut(t: number) {
  "worklet";
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Fill `out` with x, y, rotation, size, r, g, b per glyph at morph progress p
 * (0 = typeset page, 1 = picture). Glyphs leave in reading order and land
 * with zero rotation, so both end frames are exact.
 */
export function layoutGlyphs(
  p: number,
  d: MorphData,
  ink: number[],
  out: number[],
) {
  "worklet";
  const lift = d.fontSize * 9;
  for (let i = 0; i < d.count; i += 1) {
    const t = Math.min(1, Math.max(0, (p - d.delay[i] * SPREAD) / (1 - SPREAD)));
    const e = easeInOut(t);
    const x0 = d.sx[i];
    const y0 = d.sy[i];
    const x1 = d.ex[i];
    const y1 = d.ey[i];
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const k = d.curl[i] * len * 0.35;
    const cx = mx + (-dy / len) * k;
    const cy = my + (dx / len) * k - lift * Math.sin(Math.PI * Math.min(1, t * 1));
    const u = 1 - e;
    const o = i * 7;
    out[o] = u * u * x0 + 2 * u * e * cx + e * e * x1;
    out[o + 1] = u * u * y0 + 2 * u * e * cy + e * e * y1;
    const bump = Math.sin(Math.PI * e);
    out[o + 2] = d.spin[i] * bump;
    const endSize = d.fontSize * PICTURE_SCALE;
    out[o + 3] = (d.fontSize + (endSize - d.fontSize) * e) * (1 + 0.45 * bump);
    const c = smoothstep(0.15, 0.9, e);
    out[o + 4] = ink[0] + (d.cr[i] - ink[0]) * c;
    out[o + 5] = ink[1] + (d.cg[i] - ink[1]) * c;
    out[o + 6] = ink[2] + (d.cb[i] - ink[2]) * c;
  }
}

/** Page colour at progress p: paper to deep night, 0..1 rgb. */
export function pageColor(p: number, out: number[]) {
  "worklet";
  const m = smoothstep(0.1, 0.8, p);
  out[0] = 0.965 + (0.045 - 0.965) * m;
  out[1] = 0.953 + (0.06 - 0.953) * m;
  out[2] = 0.925 + (0.12 - 0.925) * m;
}
