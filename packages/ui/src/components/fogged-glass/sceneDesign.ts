// The window scene used by the Example and the website preview, as plain
// data in pane-local points. One description is drawn by Skia and by
// Canvas 2D, so native and web agree: a dusk window over a still lake in
// the Nilgiris, with a lit cabin on the shore.
export const PANE_W = 340;
export const PANE_H = 460;

export type VGradItem = { k: "vgrad"; x: number; y: number; w: number; h: number; from: string; to: string };
export type RectItem = { k: "rect"; x: number; y: number; w: number; h: number; color: string; r?: number };
export type CircleItem = { k: "circle"; x: number; y: number; r: number; color: string };
export type PolyItem = { k: "poly"; points: number[]; color: string };
export type TextItem = { k: "text"; x: number; y: number; size: number; color: string; text: string; align?: "left" | "center" | "right" };
export type Item = VGradItem | RectItem | CircleItem | PolyItem | TextItem;

const STARS: CircleItem[] = [
  { k: "circle", x: 34, y: 30, r: 1.3, color: "#e8e4d8cc" },
  { k: "circle", x: 78, y: 58, r: 1, color: "#e8e4d899" },
  { k: "circle", x: 122, y: 26, r: 1.5, color: "#e8e4d8bb" },
  { k: "circle", x: 168, y: 66, r: 1, color: "#e8e4d888" },
  { k: "circle", x: 205, y: 34, r: 1.2, color: "#e8e4d8aa" },
  { k: "circle", x: 246, y: 22, r: 1, color: "#e8e4d899" },
  { k: "circle", x: 310, y: 40, r: 1.3, color: "#e8e4d8bb" },
  { k: "circle", x: 96, y: 96, r: 1, color: "#e8e4d877" },
  { k: "circle", x: 226, y: 102, r: 1, color: "#e8e4d866" },
  { k: "circle", x: 148, y: 118, r: 1.1, color: "#e8e4d877" },
];

function pines(startX: number, baseY: number, count: number, step: number, tall: number, color: string): PolyItem {
  const points: number[] = [startX, baseY];
  for (let i = 0; i < count; i++) {
    const x = startX + i * step;
    points.push(x + step * 0.5, baseY - tall - (i % 3) * 5, x + step, baseY);
  }
  return { k: "poly", points, color };
}

export function sceneDesign(): Item[] {
  const W = PANE_W, H = PANE_H;
  return [
    { k: "vgrad", x: 0, y: 0, w: W, h: 300, from: "#232a4a", to: "#d98a56" },
    ...STARS,
    { k: "circle", x: 274, y: 76, r: 19, color: "#f0e6c8" },
    { k: "circle", x: 267, y: 71, r: 3.2, color: "#e0d3ae" },
    { k: "circle", x: 280, y: 82, r: 2.1, color: "#e0d3ae" },
    { k: "poly", points: [0, 235, 60, 180, 110, 228, 170, 162, 230, 232, 290, 190, 340, 236, 340, 300, 0, 300], color: "#2c3350" },
    { k: "poly", points: [0, 268, 80, 224, 150, 262, 230, 220, 300, 266, 340, 244, 340, 300, 0, 300], color: "#232947" },
    { k: "vgrad", x: 0, y: 300, w: W, h: 130, from: "#c97e4e", to: "#1f2540" },
    { k: "rect", x: 250, y: 306, w: 48, h: 2.5, color: "#f0e6c855" },
    { k: "rect", x: 258, y: 316, w: 34, h: 2, color: "#f0e6c844" },
    { k: "rect", x: 264, y: 328, w: 24, h: 2, color: "#f0e6c833" },
    { k: "rect", x: 40, y: 340, w: 60, h: 1.6, color: "#ffffff14" },
    { k: "rect", x: 180, y: 360, w: 90, h: 1.6, color: "#ffffff10" },
    { k: "rect", x: 90, y: 386, w: 70, h: 1.4, color: "#ffffff0f" },
    { k: "rect", x: 36, y: 272, w: 34, h: 26, color: "#1a2038" },
    { k: "poly", points: [32, 272, 53, 254, 74, 272], color: "#141a30" },
    { k: "rect", x: 45, y: 280, w: 9, h: 8, color: "#ffd98a" },
    { k: "rect", x: 58, y: 280, w: 9, h: 8, color: "#ffcf70" },
    { k: "rect", x: 45, y: 296, w: 40, h: 1.5, color: "#ffd98a33" },
    pines(120, 302, 9, 16, 16, "#141a30"),
    pines(250, 302, 6, 16, 13, "#10152a"),
    { k: "vgrad", x: 0, y: 430, w: W, h: 30, from: "#131828", to: "#0d1120" },
    { k: "rect", x: 0, y: 430, w: W, h: 2, color: "#2a3352" },
    { k: "text", x: W - 14, y: 452, size: 9, color: "#7e90b8", text: "COONOOR · NILGIRIS", align: "right" },
    { k: "text", x: 14, y: 452, size: 9, color: "#57648a", text: "6:04 PM", align: "left" },
  ];
}
