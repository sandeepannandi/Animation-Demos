import {
  RS_CELL_X, RS_CELL_Y, RS_COLS, RS_DAYS, RS_DOT_R, RS_H, RS_STRIP_H, RS_STRIP_W, RS_STRIP_X, RS_STRIP_Y, RS_TILE, RS_W, RS_X0, RS_Y0,
  rsCellX, rsCellY, type RsModel, type RsSel, type RsTile,
} from "../../packages/ui/src/components/range-stack/rangeMath";
import {
  RS_BAND, RS_DOT, RS_INK, RS_MUTED, RS_ROOMS, RS_SHEET, RS_SHEET_EDGE, RS_SKELETON, RS_SKELETON_HI, RS_STRIP, RS_WEEKDAYS, rsLabel,
  type RsFill,
} from "../../packages/ui/src/components/range-stack/rangeDesign";

const FONT = "Geist, system-ui, -apple-system, sans-serif";

function fillStyle(ctx: CanvasRenderingContext2D, f: RsFill): string | CanvasGradient {
  if (typeof f === "string") return f;
  if ("lin" in f) {
    const g = ctx.createLinearGradient(f.lin[0], f.lin[1], f.lin[2], f.lin[3]);
    for (const [t, c] of f.stops) g.addColorStop(t, c);
    return g;
  }
  const g = ctx.createRadialGradient(f.rad[0], f.rad[1], 0, f.rad[0], f.rad[1], f.rad[2]);
  for (const [t, c] of f.stops) g.addColorStop(t, c);
  return g;
}

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, weight: number, color: string, alpha: number, align: CanvasTextAlign = "center") {
  if (alpha <= 0.002) return;
  ctx.globalAlpha = alpha;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(s, x, y);
  ctx.globalAlpha = 1;
}

const mix = (a: number[], b: number[], t: number) => `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)}, ${Math.round(a[1] + (b[1] - a[1]) * t)}, ${Math.round(a[2] + (b[2] - a[2]) * t)})`;

function tile(ctx: CanvasRenderingContext2D, t: RsTile, room: number | null) {
  if (t.alpha <= 0.002 || t.scale <= 0.002) return;
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate((t.rot * Math.PI) / 180);
  ctx.scale(t.scale, t.scale);
  ctx.globalAlpha = t.alpha;
  const b = RS_TILE + 6;
  ctx.shadowColor = "rgba(40, 32, 20, 0.28)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(-b / 2, -b / 2, b, b, 10);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.beginPath();
  ctx.roundRect(-RS_TILE / 2, -RS_TILE / 2, RS_TILE, RS_TILE, 8);
  if (room === null) {
    ctx.fillStyle = RS_SKELETON;
    ctx.fill();
  } else {
    ctx.clip();
    ctx.translate(-RS_TILE / 2, -RS_TILE / 2);
    ctx.scale(RS_TILE / 100, RS_TILE / 100);
    for (const p of RS_ROOMS[room % RS_ROOMS.length]) {
      if (p.k === "rect") {
        ctx.fillStyle = fillStyle(ctx, p.fill);
        ctx.beginPath();
        if (p.r) ctx.roundRect(p.x, p.y, p.w, p.h, p.r);
        else ctx.rect(p.x, p.y, p.w, p.h);
        ctx.fill();
      } else if (p.k === "circle") {
        ctx.fillStyle = fillStyle(ctx, p.fill);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.w;
        ctx.beginPath();
        ctx.moveTo(p.x1, p.y1);
        ctx.lineTo(p.x2, p.y2);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

export function drawRange(ctx: CanvasRenderingContext2D, m: RsModel, s: RsSel) {
  ctx.clearRect(0, 0, RS_W, RS_H);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, RS_W - 1, RS_H - 1, 28);
  ctx.fillStyle = RS_SHEET;
  ctx.fill();
  ctx.strokeStyle = RS_SHEET_EDGE;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.clip();

  for (let c = 0; c < RS_COLS; c++) text(ctx, RS_WEEKDAYS[c], RS_X0 + c * RS_CELL_X, 40, 12, 500, RS_MUTED, 1);
  for (const b of m.bands) {
    ctx.globalAlpha = b.alpha;
    ctx.fillStyle = RS_BAND;
    ctx.beginPath();
    ctx.roundRect(b.x0, b.y - RS_DOT_R, b.x1 - b.x0, RS_DOT_R * 2, RS_DOT_R);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  for (const d of m.dots) {
    if (d.scale <= 0.002) continue;
    ctx.fillStyle = RS_DOT;
    ctx.beginPath();
    ctx.arc(rsCellX(d.day), rsCellY(d.day), RS_DOT_R * Math.max(0, d.scale), 0, Math.PI * 2);
    ctx.fill();
  }
  for (let d = 1; d <= RS_DAYS; d++) text(ctx, String(d), rsCellX(d), rsCellY(d) + 0.5, 15, 500, mix([28, 26, 23], [255, 255, 255], m.ink[d]), 1);

  // Footer strip.
  ctx.fillStyle = RS_STRIP;
  ctx.beginPath();
  ctx.roundRect(RS_STRIP_X, RS_STRIP_Y, RS_STRIP_W, RS_STRIP_H, 16);
  ctx.fill();
  const cy = RS_STRIP_Y + RS_STRIP_H / 2;
  const ghost = Math.max(m.skeleton, m.idleGhost * 0.7);
  if (ghost > 0.002) for (const t of m.skelTiles) tile(ctx, { ...t, alpha: ghost }, null);
  if (m.skeleton > 0.002) {
    const g = ctx.createLinearGradient(32 + m.shimmer * 190 - 60, 0, 32 + m.shimmer * 190 + 60, 0);
    g.addColorStop(0, RS_SKELETON);
    g.addColorStop(0.5, RS_SKELETON_HI);
    g.addColorStop(1, RS_SKELETON);
    ctx.globalAlpha = m.skeleton;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(32, cy - 6, 92, 12, 6);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  text(ctx, rsLabel(s.fFrom), 32, cy, 14, 500, RS_INK, m.labelOld, "left");
  text(ctx, rsLabel(s.homes), 32, cy + m.labelNewY, 14, 500, s.homes > 0 ? RS_INK : RS_MUTED, m.labelNew, "left");
  for (let i = 0; i < m.oldTiles.length; i++) tile(ctx, m.oldTiles[i], i);
  for (let i = 0; i < m.newTiles.length; i++) tile(ctx, m.newTiles[i], i);

  // Footer buttons.
  ctx.strokeStyle = RS_SHEET_EDGE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 318);
  ctx.lineTo(RS_W, 318);
  ctx.stroke();
  text(ctx, "Reset", 24, 339, 14, 500, RS_INK, 1, "left");
  ctx.fillStyle = RS_INK;
  ctx.fillRect(24, 349, 38, 1);
  ctx.fillStyle = RS_DOT;
  ctx.beginPath();
  ctx.roundRect(220, 322, 80, 34, 12);
  ctx.fill();
  text(ctx, "Save", 260, 339, 14, 600, "#ffffff", 1);
  ctx.restore();
}

// Which day (1..28) a point in sheet coordinates hits, or 0.
export function hitDay(x: number, y: number) {
  const col = Math.round((x - RS_X0) / RS_CELL_X);
  const row = Math.round((y - RS_Y0) / RS_CELL_Y);
  if (col < 0 || col >= RS_COLS || row < 0 || row >= 4) return 0;
  if (Math.abs(x - (RS_X0 + col * RS_CELL_X)) > RS_CELL_X / 2 || Math.abs(y - (RS_Y0 + row * RS_CELL_Y)) > RS_CELL_Y / 2) return 0;
  return row * RS_COLS + col + 1;
}
