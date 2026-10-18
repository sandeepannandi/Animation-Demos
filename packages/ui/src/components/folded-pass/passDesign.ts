// The boarding pass used by the Example and the website preview, as plain data in panel-local points.
// One description is drawn by Skia, by Canvas 2D and by React Native views, so all three agree.
export const PASS_W = 292;
export const PASS_H = 112;
export type Corners = "all" | "top" | "bottom" | "none";
export type RectItem = { k: "rect"; x: number; y: number; w: number; h: number; color: string; r?: number; corners?: Corners };
export type TextItem = { k: "text"; x: number; y: number; size: number; color: string; text: string; align?: "left" | "center" | "right" };
export type Item = RectItem | TextItem;
export type PassDesign = { fronts: Item[][]; backs: Item[][]; check: { x: number; y: number; w: number; h: number } };

const INK = "#1f3a2c", GREEN = "#315843", TAN = "#ae8655", MUTED = "#63705f", PAPER = "#f3efe4", PAPER2 = "#f7f3e8";
const bars = (seed: number, x0: number, x1: number, y: number, h: number): RectItem[] => {
  const out: RectItem[] = [];
  let s = seed, x = x0;
  while (x < x1 - 3) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const w = 1 + (s >> 8) % 3, gap = 1 + (s >> 12) % 3;
    if (x + w > x1) break;
    out.push({ k: "rect", x, y, w, h, color: INK });
    x += w + gap;
  }
  return out;
};
const dashes = (y: number): RectItem[] => {
  const out: RectItem[] = [];
  for (let x = 14; x < PASS_W - 14; x += 10) out.push({ k: "rect", x, y, w: 5, h: 1, color: "#c9c2ae" });
  return out;
};

export function passDesign(checkedIn = false): PassDesign {
  const W = PASS_W, H = PASS_H;
  const check = { x: 200, y: 62, w: 76, h: 30 };
  const field = (x: number, y: number, label: string, value: string): Item[] => [
    { k: "text", x, y, size: 8, color: MUTED, text: label },
    { k: "text", x, y: y + 24, size: 20, color: INK, text: value },
  ];
  const fronts: Item[][] = [
    [
      { k: "rect", x: 0, y: 0, w: W, h: H, color: PAPER, r: 18, corners: "top" },
      { k: "rect", x: 0, y: 0, w: W, h: 26, color: GREEN, r: 18, corners: "top" },
      { k: "text", x: 16, y: 17, size: 9, color: "#f3efe4", text: "NATIVELET AIR" },
      { k: "text", x: W - 16, y: 17, size: 9, color: "#f3efe4", text: "BOARDING PASS", align: "right" },
      { k: "text", x: 16, y: 70, size: 38, color: INK, text: "BLR" },
      { k: "text", x: W - 16, y: 70, size: 38, color: INK, text: "LHR", align: "right" },
      { k: "rect", x: 104, y: 56, w: 84, h: 2, color: TAN },
      { k: "rect", x: 100, y: 54, w: 6, h: 6, color: TAN, r: 3 },
      { k: "rect", x: 186, y: 54, w: 6, h: 6, color: TAN, r: 3 },
      { k: "text", x: W / 2, y: 49, size: 10, color: GREEN, text: "NL 219", align: "center" },
      { k: "text", x: W / 2, y: 76, size: 10, color: MUTED, text: "10h 25m", align: "center" },
      { k: "text", x: 16, y: 100, size: 9, color: MUTED, text: "BENGALURU" },
      { k: "text", x: W - 16, y: 100, size: 9, color: MUTED, text: "LONDON HEATHROW", align: "right" },
    ],
    [
      { k: "rect", x: 0, y: 0, w: W, h: H, color: PAPER2, corners: "none" },
      ...dashes(0),
      ...field(16, 28, "PASSENGER", "S. Nandi"),
      ...field(150, 28, "GATE", "B12"),
      ...field(228, 28, "SEAT", "14A"),
      ...field(16, 78, "BOARDS", "21:40"),
      ...field(100, 78, "DEPARTS", "22:10"),
      { k: "rect", x: check.x, y: check.y, w: check.w, h: check.h, color: checkedIn ? TAN : GREEN, r: 15 },
      { k: "text", x: check.x + check.w / 2, y: check.y + 19, size: 11, color: "#f3efe4", text: checkedIn ? "Checked in" : "Check in", align: "center" },
      ...dashes(H - 1),
    ],
    [
      { k: "rect", x: 0, y: 0, w: W, h: H, color: PAPER, r: 18, corners: "bottom" },
      ...bars(7, 20, W - 20, 16, 54),
      { k: "text", x: W / 2, y: 90, size: 10, color: INK, text: "NL219 · BLR-LHR · 14A", align: "center" },
      { k: "text", x: W / 2, y: 103, size: 8, color: MUTED, text: "Hold to the scanner at the gate", align: "center" },
    ],
  ];
  const back = (corners: Corners): Item[] => [
    { k: "rect", x: 0, y: 0, w: W, h: H, color: "#e6ddc7", r: 18, corners },
    { k: "rect", x: 10, y: 10, w: W - 20, h: 1, color: "#cfc4a8" },
    { k: "rect", x: 10, y: H - 11, w: W - 20, h: 1, color: "#cfc4a8" },
    { k: "rect", x: 10, y: 10, w: 1, h: H - 20, color: "#cfc4a8" },
    { k: "rect", x: W - 11, y: 10, w: 1, h: H - 20, color: "#cfc4a8" },
    { k: "text", x: W / 2, y: H / 2 + 3, size: 9, color: "#a99b78", text: "NATIVELET AIR", align: "center" },
  ];
  return { fronts, backs: [back("top"), back("none"), back("bottom")], check };
}
