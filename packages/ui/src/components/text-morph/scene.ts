import type { PixelImage } from "./textMorphMath";

// An original procedural picture, drawn from shapes: a lighthouse on a rock at
// night, a moon, a beam and a sea. Any RGBA pixels work as a Text Morph image;
// this one exists so the component needs no image file or decoder.

type RGB = [number, number, number];
const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const hex = (h: number): RGB => [(h >> 16) & 255, (h >> 8) & 255, h & 255];

function star(u: number, v: number): number {
  const gx = Math.floor(u * 70);
  const gy = Math.floor(v * 50);
  let h = (Math.imul(gx + 31, 73856093) ^ Math.imul(gy + 17, 19349663)) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  if (h % 41 !== 0) return 0;
  const cx = (gx + 0.5) / 70;
  const cy = (gy + 0.5) / 50;
  return Math.hypot(u - cx, v - cy) < 0.006 ? 1 : 0;
}

function sample(u: number, v: number): RGB {
  const TX = 0.36;
  let c: RGB = mix(hex(0x0a1030), hex(0x24356e), Math.min(1, v * 1.2));
  if (v < 0.7 && star(u, v)) c = hex(0xdfe8ff);

  // Moon
  const md = Math.hypot(u - 0.74, v - 0.2);
  if (md < 0.115) {
    c = hex(0xf6f0cf);
    if (Math.hypot(u - 0.71, v - 0.17) < 0.028) c = hex(0xddd4a6);
    if (Math.hypot(u - 0.77, v - 0.235) < 0.02) c = hex(0xe3dbb0);
  } else if (md < 0.16) {
    c = mix(c, hex(0x8c9ad0), 0.35 * (1 - (md - 0.115) / 0.045));
  }

  // Beam from the lantern to the right edge
  const lx = TX;
  const ly = 0.27;
  if (u > lx) {
    const t = (u - lx) / (1 - lx);
    const top = ly - 0.02 - t * 0.2;
    const bot = ly + 0.02 + t * 0.12;
    if (v > top && v < bot) c = mix(c, hex(0xffe7a0), 0.85 * (1 - t * 0.5));
  }

  // Sea
  if (v > 0.72) {
    const wave = 0.012 * Math.sin(u * 46 + v * 30) + 0.006 * Math.sin(u * 91);
    const k = Math.min(1, (v - 0.72) / 0.28);
    c = mix(hex(0x2f7f9a), hex(0x123c58), k);
    if (Math.sin((v + wave) * 150) > 0.78) c = mix(c, hex(0x9fdcec), 0.8);
  }

  // Rock
  const rockTop = 0.74 + Math.abs(u - TX) * 0.9;
  if (v > rockTop - 0.02 && v < 0.84 && Math.abs(u - TX) < 0.2) {
    c = mix(hex(0x9a95a6), hex(0x625e70), (v - 0.72) * 4);
  }

  // Tower, in five bands
  if (v > 0.3 && v < 0.75) {
    const half = 0.06 + ((v - 0.3) / 0.45) * 0.05;
    if (Math.abs(u - TX) < half) {
      const band = Math.floor(((v - 0.3) / 0.45) * 5);
      c = band % 2 === 0 ? hex(0xf7f1e4) : hex(0xe0493a);
      if (u - TX > half * 0.45) c = mix(c, hex(0x2b2f45), 0.3);
    }
  }
  // Gallery rail and lantern room
  if (v > 0.285 && v < 0.31 && Math.abs(u - TX) < 0.1) c = hex(0xd7dae6);
  if (v > 0.215 && v < 0.285 && Math.abs(u - TX) < 0.05) c = hex(0xffd35a);
  // Roof
  if (v > 0.16 && v <= 0.215) {
    const half = ((v - 0.16) / 0.055) * 0.068;
    if (Math.abs(u - TX) < half) c = hex(0xe0493a);
  }
  if (v > 0.135 && v <= 0.16 && Math.abs(u - TX) < 0.008) c = hex(0xd7dae6);
  return c;
}

/** `size` x `size` RGBA pixels, 2 x 2 supersampled. */
export function lighthouseImage(size = 192): PixelImage {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < 2; sy += 1) {
        for (let sx = 0; sx < 2; sx += 1) {
          const c = sample((x + (sx + 0.5) / 2) / size, (y + (sy + 0.5) / 2) / size);
          r += c[0];
          g += c[1];
          b += c[2];
        }
      }
      const o = (y * size + x) * 4;
      data[o] = r / 4;
      data[o + 1] = g / 4;
      data[o + 2] = b / 4;
      data[o + 3] = 255;
    }
  }
  return { width: size, height: size, data };
}

// Two more original, bold scenes. No downloaded photos or third-party artwork.
function rocket(u: number, v: number): RGB {
  let c = mix(hex(0x080e2d), hex(0x252b53), v);
  if (star(u, v)) c = hex(0xdce8ff);
  // Exhaust plume, fins, body, pointed nose and a blue porthole.
  if (v > 0.66 && v < 0.95 && Math.abs(u - 0.5) < (0.95 - v) * 0.38)
    c = Math.abs(u - 0.5) < (0.94 - v) * 0.16 ? hex(0xffec92) : hex(0xf48142);
  if (v > 0.48 && v < 0.76 && Math.abs(u - 0.5) < 0.1 + (v - 0.48) * 0.5)
    c = hex(0xf0645d);
  if (v >= 0.27 && v < 0.69 && Math.abs(u - 0.5) < 0.105)
    c = u < 0.52 ? hex(0xf5ecdc) : hex(0xb9c5db);
  if (v > 0.09 && v < 0.27 && Math.abs(u - 0.5) < (v - 0.09) * 0.59)
    c = hex(0xf0645d);
  const d = Math.hypot(u - 0.5, v - 0.39);
  if (d < 0.068) c = hex(0xf4bf65);
  if (d < 0.047) c = hex(0x4eaacb);
  return c;
}
function mountains(u: number, v: number): RGB {
  let c = mix(hex(0x321c44), hex(0xa44e59), v);
  if (Math.hypot(u - 0.77, v - 0.22) < 0.12) c = hex(0xffd485);
  // Back range, a tall snowy peak, a smaller foreground peak and lake.
  const back = 0.38 + Math.abs(u - 0.73) * 0.58;
  if (v > back) c = hex(0x715887);
  const ridge = 0.22 + Math.abs(u - 0.35) * 1.1;
  if (v > ridge) {
    c = u < 0.35 ? hex(0x669caf) : hex(0x365b81);
    if (v < 0.4 && v < ridge + 0.09 + 0.018 * Math.sin(u * 65)) c = hex(0xf1eee0);
  }
  const front = 0.46 + Math.abs(u - 0.72) * 0.85;
  if (v > front) c = u < 0.72 ? hex(0x75a5a1) : hex(0x477d84);
  if (v > 0.78) {
    c = mix(hex(0x559aaa), hex(0x153d60), (v - 0.78) / 0.22);
    if (Math.sin(v * 145 + Math.sin(u * 18)) > 0.85) c = hex(0x8ec5c9);
  }
  return c;
}
function renderScene(samplePixel: (u: number, v: number) => RGB, size: number): PixelImage {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const o = (y * size + x) * 4;
    const sum = [0, 0, 0];
    for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
      const c = samplePixel((x + (sx + 0.5) / 2) / size, (y + (sy + 0.5) / 2) / size);
      for (let k = 0; k < 3; k++) sum[k] += c[k];
    }
    for (let k = 0; k < 3; k++) data[o + k] = sum[k] / 4;
    data[o + 3] = 255;
  }
  return { width: size, height: size, data };
}
export const rocketImage = (size = 192): PixelImage => renderScene(rocket, size);
export const mountainsImage = (size = 192): PixelImage => renderScene(mountains, size);
export const PICTURE_PRESETS = [
  { id: 'lighthouse', name: 'Lighthouse', label: 'A lighthouse, moon, beam and sea made of letters', image: lighthouseImage },
  { id: 'rocket', name: 'Rocket', label: 'A rocket with a blue porthole and fiery exhaust made of letters', image: rocketImage },
  { id: 'mountains', name: 'Mountains', label: 'Snowy mountains, a sunset and lake made of letters', image: mountainsImage },
] as const;
