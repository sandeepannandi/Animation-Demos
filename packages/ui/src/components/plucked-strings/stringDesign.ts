// Look of the Plucked Strings card: copper strings over the neck, soundhole and
// bridge of an acoustic instrument, seen from above. The static scene is plain
// data so the Skia component and the web preview draw the same picture.
export const STR_BACKGROUND = "#0e0905";

export type StrFill =
  | string
  | { lin: [number, number, number, number]; stops: [number, string][] }
  | { rad: [number, number, number]; stops: [number, string][] };
export type StrPrim =
  | { k: "rect"; x: number; y: number; w: number; h: number; r?: number; fill: StrFill }
  | { k: "circle"; x: number; y: number; r: number; fill: StrFill }
  | { k: "ring"; x: number; y: number; r: number; w: number; color: string }
  | { k: "line"; x1: number; y1: number; x2: number; y2: number; w: number; color: string };

// Strings run between the nut (x = 26) and the saddle (x = 294) at these heights.
const X0 = 26;
const X1 = 294;
const L = X1 - X0;
const Y = [86, 138, 190, 242, 294];

function scene(): StrPrim[] {
  const out: StrPrim[] = [];
  // Soundboard: dark walnut top with a soft sheen.
  out.push({ k: "rect", x: 6, y: 50, w: 308, h: 280, r: 18, fill: { lin: [0, 50, 0, 330], stops: [[0, "#3b2412"], [0.5, "#2f1c0e"], [1, "#25160a"]] } });
  // Fretboard: ebony, from the nut to the 12th fret where the body begins.
  out.push({ k: "rect", x: 6, y: 62, w: X0 + L * 0.5 - 6, h: 256, r: 0, fill: { lin: [0, 62, 0, 318], stops: [[0, "#1d1510"], [0.5, "#14100c"], [1, "#0f0b08"]] } });
  // Grain on the walnut top and faint grain on the board.
  for (let i = 0; i < 40; i++) {
    const y = 56 + i * 6.8;
    const a = 0.025 + ((i * 37) % 7) * 0.006;
    out.push({ k: "line", x1: X0 + L / 2, y1: y + (i % 3), x2: 312, y2: y - 2 + (i % 4), w: 1, color: `rgba(255, 214, 160, ${a.toFixed(3)})` });
    out.push({ k: "line", x1: 8, y1: y, x2: X0 + L / 2, y2: y + 1, w: 0.8, color: `rgba(255, 235, 210, ${(a * 0.4).toFixed(3)})` });
  }
  // Soundhole with its inlaid rosette.
  out.push({ k: "ring", x: 226, y: 190, r: 63.5, w: 1.6, color: "rgba(214, 178, 112, 0.55)" });
  out.push({ k: "ring", x: 226, y: 190, r: 60, w: 2.4, color: "rgba(36, 22, 12, 0.9)" });
  out.push({ k: "ring", x: 226, y: 190, r: 57, w: 3.4, color: "rgba(224, 190, 126, 0.78)" });
  out.push({ k: "circle", x: 226, y: 190, r: 54.5, fill: { rad: [226, 190, 54.5], stops: [[0, "#020101"], [0.8, "#080503"], [1, "#150d07"]] } });
  // Frets: nickel wire with a bright top edge, at equal-temperament positions.
  for (let n = 1; n <= 12; n++) {
    const x = X0 + L * (1 - Math.pow(2, -n / 12));
    out.push({ k: "line", x1: x, y1: 62, x2: x, y2: 318, w: 2.4, color: "#6c6a66" });
    out.push({ k: "line", x1: x - 0.5, y1: 62, x2: x - 0.5, y2: 318, w: 1, color: "#d4d2cc" });
  }
  // Pearl position dots between frets 3, 5, 7, 9 and the double dot at 12.
  const mid = (a: number, b: number) => X0 + (L * ((1 - Math.pow(2, -a / 12)) + (1 - Math.pow(2, -b / 12)))) / 2;
  for (const [a, b] of [[2, 3], [4, 5], [6, 7], [8, 9]]) out.push({ k: "circle", x: mid(a, b), y: 190, r: 3.6, fill: { rad: [mid(a, b) - 1, 189, 4], stops: [[0, "#f3efe6"], [1, "#a9a496"]] } });
  out.push({ k: "circle", x: mid(11, 12), y: 150, r: 3.6, fill: "#d9d4c6" });
  out.push({ k: "circle", x: mid(11, 12), y: 230, r: 3.6, fill: "#d9d4c6" });
  // Nut: bone, with a slot under each string.
  out.push({ k: "rect", x: X0 - 6, y: 66, w: 8, h: 248, r: 2, fill: { lin: [X0 - 6, 0, X0 + 2, 0], stops: [[0, "#cfc6af"], [0.5, "#efe8d4"], [1, "#b6ad96"]] } });
  for (const y of Y) out.push({ k: "rect", x: X0 - 6, y: y - 1.6, w: 8, h: 3.2, fill: "#6b604b" });
  // Bridge: rosewood plate, bone saddle and brass pins.
  out.push({ k: "rect", x: 284, y: 62, w: 26, h: 256, r: 6, fill: { lin: [284, 0, 310, 0], stops: [[0, "#2b160d"], [0.5, "#3a2013"], [1, "#22110a"]] } });
  out.push({ k: "rect", x: X1 - 1.6, y: 68, w: 3.4, h: 244, r: 1.5, fill: { lin: [X1 - 2, 0, X1 + 2, 0], stops: [[0, "#f1ead8"], [1, "#b9b09a"]] } });
  for (const y of Y) {
    out.push({ k: "circle", x: 303, y, r: 4, fill: { rad: [302, y - 1, 5], stops: [[0, "#f2d79a"], [0.6, "#b08a45"], [1, "#6b4f22"]] } });
    out.push({ k: "line", x1: X1, y1: y, x2: 303, y2: y, w: 1.2, color: "rgba(0, 0, 0, 0.35)" });
  }
  // Light from above-left across the whole top.
  out.push({ k: "rect", x: 6, y: 50, w: 308, h: 280, r: 18, fill: { rad: [90, 90, 300], stops: [[0, "rgba(255, 230, 190, 0.10)"], [1, "rgba(255, 230, 190, 0)"]] } });
  return out;
}
export const STR_SCENE: StrPrim[] = scene();

// Per string: line width, wound (copper winding over a core) or plain wire.
export const STR_WIDTH = [3.6, 3.1, 2.6, 1.7, 1.3];
export const STR_WOUND = [1, 1, 1, 0, 0];
export const STR_COPPER = "#b06a2c";
export const STR_COPPER_DARK = "#6a3a16";
export const STR_COPPER_LIGHT = "#f0b072";
export const STR_PLAIN = "#cf9560";
export const STR_PLAIN_LIGHT = "#fbd2a2";
export const STR_SHADOW = "rgba(0, 0, 0, 0.5)";
