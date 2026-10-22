// Look of Range Stack, light mode. Plain data shared by the Skia component and
// the web preview. The room pictures are original vector illustrations drawn
// on a 100 x 100 square, so they are crisp at any size and need no assets.
export const RS_INK = "#1c1a17";
export const RS_MUTED = "#8a867c";
export const RS_SHEET = "#ffffff";
export const RS_SHEET_EDGE = "#ebe7df";
export const RS_BAND = "#efede8";
export const RS_STRIP = "#efede8";
export const RS_SKELETON = "#dcd9d2";
export const RS_SKELETON_HI = "#ece9e3";
export const RS_DOT = "#1c1a17";
export const RS_WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
export const RS_IDLE_LABEL = "Select your dates";

export function rsLabel(homes: number) {
  return homes <= 0 ? RS_IDLE_LABEL : homes === 1 ? "1 home available" : `${homes} homes available`;
}

export type RsFill =
  | string
  | { lin: [number, number, number, number]; stops: [number, string][] }
  | { rad: [number, number, number]; stops: [number, string][] };
export type RsPrim =
  | { k: "rect"; x: number; y: number; w: number; h: number; r?: number; fill: RsFill }
  | { k: "circle"; x: number; y: number; r: number; fill: RsFill }
  | { k: "line"; x1: number; y1: number; x2: number; y2: number; w: number; color: string };

const sky = (a: string, b: string): RsFill => ({ lin: [0, 0, 0, 100], stops: [[0, a], [1, b]] });

export const RS_ROOMS: RsPrim[][] = [
  // 0 living room: terracotta sofa, window, floor lamp
  [
    { k: "rect", x: 0, y: 0, w: 100, h: 100, fill: sky("#f6e8d5", "#ecd3b3") },
    { k: "rect", x: 0, y: 72, w: 100, h: 28, fill: "#c9a37a" },
    { k: "rect", x: 58, y: 12, w: 32, h: 36, r: 3, fill: sky("#bfe3f5", "#eaf7fc") },
    { k: "line", x1: 74, y1: 12, x2: 74, y2: 48, w: 2, color: "#ffffff" },
    { k: "line", x1: 58, y1: 30, x2: 90, y2: 30, w: 2, color: "#ffffff" },
    { k: "rect", x: 10, y: 42, w: 50, h: 18, r: 8, fill: "#b5552f" },
    { k: "rect", x: 8, y: 54, w: 54, h: 22, r: 8, fill: "#c8643c" },
    { k: "rect", x: 16, y: 56, w: 14, h: 10, r: 5, fill: "#eaa56c" },
    { k: "line", x1: 82, y1: 52, x2: 82, y2: 84, w: 2.4, color: "#6b5a48" },
    { k: "circle", x: 82, y: 46, r: 7, fill: "#f6c75a" },
  ],
  // 1 bedroom: blue blanket, wooden headboard, framed sun
  [
    { k: "rect", x: 0, y: 0, w: 100, h: 100, fill: sky("#dce8f4", "#c4d7eb") },
    { k: "rect", x: 0, y: 78, w: 100, h: 22, fill: "#a68b6b" },
    { k: "rect", x: 50, y: 12, w: 30, h: 22, r: 2, fill: "#f2d58c" },
    { k: "circle", x: 65, y: 24, r: 5.5, fill: "#e87f3a" },
    { k: "rect", x: 8, y: 38, w: 14, h: 42, r: 4, fill: "#7a5a3b" },
    { k: "rect", x: 8, y: 54, w: 84, h: 26, r: 5, fill: "#f7f4ee" },
    { k: "rect", x: 24, y: 50, w: 22, h: 11, r: 5.5, fill: "#ffffff" },
    { k: "rect", x: 8, y: 62, w: 84, h: 18, r: 5, fill: "#5f8bc4" },
  ],
  // 2 kitchen: green cabinets, pendant light, potted plant
  [
    { k: "rect", x: 0, y: 0, w: 100, h: 100, fill: sky("#deecd8", "#c3dbbb") },
    { k: "rect", x: 6, y: 10, w: 42, h: 28, r: 3, fill: "#4f7a5a" },
    { k: "line", x1: 27, y1: 10, x2: 27, y2: 38, w: 1.4, color: "#3f6449" },
    { k: "circle", x: 22, y: 25, r: 1.6, fill: "#e9e2cf" },
    { k: "circle", x: 32, y: 25, r: 1.6, fill: "#e9e2cf" },
    { k: "line", x1: 72, y1: 0, x2: 72, y2: 24, w: 1.4, color: "#4a4a45" },
    { k: "circle", x: 72, y: 29, r: 8, fill: "#f2c250" },
    { k: "rect", x: 0, y: 62, w: 100, h: 38, fill: "#8a6a4d" },
    { k: "rect", x: 0, y: 59, w: 100, h: 6, fill: "#efe8da" },
    { k: "circle", x: 22, y: 48, r: 9, fill: "#3e8b4f" },
    { k: "circle", x: 30, y: 52, r: 6, fill: "#4a9a5b" },
    { k: "rect", x: 16, y: 52, w: 16, h: 8, r: 2, fill: "#d98f6a" },
  ],
  // 3 terrace at sunset: sun on the water, rail, plant
  [
    { k: "rect", x: 0, y: 0, w: 100, h: 100, fill: { lin: [0, 0, 0, 100], stops: [[0, "#ff9f6e"], [0.5, "#f9cf98"], [1, "#fdebc9"]] } },
    { k: "circle", x: 32, y: 52, r: 18, fill: { rad: [32, 52, 18], stops: [[0, "#ffe2a8"], [1, "#ff8a4c"]] } },
    { k: "rect", x: 0, y: 60, w: 100, h: 40, fill: { lin: [0, 60, 0, 100], stops: [[0, "#6d9fc0"], [1, "#4d7ea3"]] } },
    { k: "rect", x: 20, y: 62, w: 28, h: 3, r: 1.5, fill: "rgba(255, 226, 168, 0.75)" },
    { k: "rect", x: 26, y: 68, w: 16, h: 3, r: 1.5, fill: "rgba(255, 226, 168, 0.55)" },
    { k: "line", x1: 0, y1: 76, x2: 100, y2: 76, w: 3, color: "#3d3a38" },
    { k: "line", x1: 12, y1: 76, x2: 12, y2: 100, w: 3, color: "#3d3a38" },
    { k: "line", x1: 50, y1: 76, x2: 50, y2: 100, w: 3, color: "#3d3a38" },
    { k: "line", x1: 88, y1: 76, x2: 88, y2: 100, w: 3, color: "#3d3a38" },
    { k: "circle", x: 84, y: 66, r: 8, fill: "#3b7a4d" },
    { k: "circle", x: 77, y: 70, r: 5.5, fill: "#4a8c5b" },
  ],
  // 4 loft: arched window, charcoal chair, plant, rug
  [
    { k: "rect", x: 0, y: 0, w: 100, h: 100, fill: sky("#e9e9e6", "#dcdcd8") },
    { k: "rect", x: 0, y: 72, w: 100, h: 28, fill: "#b9b4ab" },
    { k: "rect", x: 34, y: 12, w: 32, h: 48, r: 16, fill: sky("#cfe4ee", "#eef7fa") },
    { k: "line", x1: 50, y1: 12, x2: 50, y2: 60, w: 1.6, color: "#ffffff" },
    { k: "rect", x: 38, y: 80, w: 52, h: 9, r: 4.5, fill: "#cdb89a" },
    { k: "rect", x: 12, y: 48, w: 24, h: 26, r: 7, fill: "#3f4a56" },
    { k: "rect", x: 14, y: 58, w: 20, h: 8, r: 4, fill: "#566371" },
    { k: "rect", x: 72, y: 60, w: 14, h: 14, r: 3, fill: "#e8ddd0" },
    { k: "circle", x: 79, y: 52, r: 9, fill: "#5f9a62" },
    { k: "circle", x: 73, y: 56, r: 6, fill: "#4c8a58" },
  ],
];
