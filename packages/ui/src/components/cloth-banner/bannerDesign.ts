// The banner artwork used by the Example and the website preview, as plain
// data in banner-local points. One description is drawn by Skia and by
// Canvas 2D, so native and web agree.
export const BANNER_W = 300;
export const BANNER_H = 200;
export type RectItem = { k: "rect"; x: number; y: number; w: number; h: number; color: string; r?: number };
export type TextItem = { k: "text"; x: number; y: number; size: number; color: string; text: string; align?: "left" | "center" | "right" };
export type Item = RectItem | TextItem;

const CLOTH = "#20402c", CREAM = "#e9dfc8", TAN = "#c9a15f", SOFT = "#9dbf9f";

// A small eight-petal rosette built from rotated petal stand-ins (rounded
// rects fanned around a center) plus a dot.
function rosette(cx: number, cy: number): Item[] {
  const out: Item[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    out.push({ k: "rect", x: cx + Math.cos(a) * 13 - 3, y: cy + Math.sin(a) * 13 - 3, w: 6, h: 6, color: TAN, r: 3 });
  }
  out.push({ k: "rect", x: cx - 4, y: cy - 4, w: 8, h: 8, color: CREAM, r: 4 });
  return out;
}

export function bannerDesign(): Item[] {
  const W = BANNER_W, H = BANNER_H;
  return [
    { k: "rect", x: 0, y: 0, w: W, h: H, color: CLOTH },
    { k: "rect", x: 8, y: 8, w: W - 16, h: 2, color: CREAM },
    { k: "rect", x: 8, y: H - 10, w: W - 16, h: 2, color: CREAM },
    { k: "rect", x: 8, y: 8, w: 2, h: H - 16, color: CREAM },
    { k: "rect", x: W - 10, y: 8, w: 2, h: H - 16, color: CREAM },
    { k: "rect", x: 14, y: 14, w: W - 28, h: 1, color: TAN },
    { k: "rect", x: 14, y: H - 15, w: W - 28, h: 1, color: TAN },
    ...rosette(W / 2, 46),
    { k: "text", x: W / 2, y: 84, size: 10, color: SOFT, text: "LALBAGH BOTANICAL GARDEN", align: "center" },
    { k: "text", x: W / 2, y: 122, size: 34, color: CREAM, text: "FLOWER SHOW", align: "center" },
    { k: "text", x: W / 2, y: 146, size: 11, color: TAN, text: "BENGALURU", align: "center" },
    { k: "rect", x: W / 2 - 36, y: 158, w: 72, h: 1, color: TAN },
    { k: "text", x: W / 2, y: 176, size: 8, color: SOFT, text: "EST. 1760", align: "center" },
  ];
}
