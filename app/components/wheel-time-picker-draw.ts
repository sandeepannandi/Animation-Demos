import {
  WHEEL_COLS, WHEEL_CY, WHEEL_H, WHEEL_SIZES, WHEEL_W, drumTicks, rowGeom, rowLabel, rowOffset, type WheelState,
} from "../../packages/ui/src/components/wheel-time-picker/wheelMath";
import {
  WHEEL_ACCENT, WHEEL_BAND, WHEEL_BAND_H, WHEEL_BAND_W, WHEEL_BAND_X, WHEEL_COLON_X, WHEEL_DRUM_MID, WHEEL_DRUM_TOP,
  WHEEL_FONT_SIZE, WHEEL_INK_DIM, WHEEL_INK_LIT, WHEEL_SHEET, WHEEL_SHEET_EDGE, WHEEL_TITLE, WHEEL_TITLE_Y,
} from "../../packages/ui/src/components/wheel-time-picker/wheelDesign";

import { siteFont } from "./site-font";
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a: string, b: string, t: number) => {
  const x = hex(a), y = hex(b);
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`;
};

export function drawWheel(ctx: CanvasRenderingContext2D, s: WheelState) {
  ctx.clearRect(0, 0, WHEEL_W, WHEEL_H);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, WHEEL_W - 1, WHEEL_H - 1, 26);
  ctx.fillStyle = WHEEL_SHEET;
  ctx.fill();
  ctx.strokeStyle = WHEEL_SHEET_EDGE;
  ctx.stroke();
  ctx.clip();

  const bg = ctx.createLinearGradient(0, 54, 0, WHEEL_H - 54);
  bg.addColorStop(0, WHEEL_DRUM_TOP);
  bg.addColorStop(0.5, WHEEL_DRUM_MID);
  bg.addColorStop(1, WHEEL_DRUM_TOP);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(12, 54, WHEEL_W - 24, WHEEL_H - 108, 18);
  ctx.fill();

  const top = WHEEL_CY - WHEEL_BAND_H / 2;
  ctx.save();
  ctx.filter = "blur(10px)";
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = WHEEL_ACCENT;
  ctx.beginPath();
  ctx.roundRect(WHEEL_BAND_X, top, WHEEL_BAND_W, WHEEL_BAND_H, 12);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = WHEEL_BAND;
  ctx.beginPath();
  ctx.roundRect(WHEEL_BAND_X, top, WHEEL_BAND_W, WHEEL_BAND_H, 12);
  ctx.fill();
  ctx.strokeStyle = WHEEL_ACCENT;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;

  for (let d = 0; d < 3; d++) {
    const m = s.drums[d];
    const speed = Math.abs(m.v);
    const { ticks, blur } = drumTicks(m.p, speed);
    ctx.save();
    ctx.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
    ctx.fillStyle = WHEEL_INK_LIT;
    const sharp = 0.25 + 0.75 * (1 - Math.min(1, blur / 2.6));
    for (const t of ticks) {
      ctx.globalAlpha = Math.min(1, t.a * 2) * sharp;
      ctx.fillRect(WHEEL_COLS[d] + 27, t.y - t.w / 2, t.len, t.w);
    }
    ctx.restore();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `400 13px ${siteFont()}`;
  ctx.fillStyle = WHEEL_INK_DIM;
  ctx.fillText(WHEEL_TITLE.split("").join("\u200a"), WHEEL_W / 2, WHEEL_TITLE_Y);

  for (let d = 0; d < 3; d++) {
    const m = s.drums[d];
    const speed = Math.abs(m.v);
    for (let i = 0; i < WHEEL_SIZES[d]; i++) {
      const g = rowGeom(rowOffset(m, d, i), speed);
      if (!g.visible) continue;
      ctx.save();
      ctx.translate(WHEEL_COLS[d], g.y);
      ctx.scale(0.92 + 0.08 * g.s, Math.max(0.02, g.s));
      ctx.globalAlpha = g.a;
      ctx.font = `500 ${WHEEL_FONT_SIZE}px ${siteFont()}`;
      ctx.filter = g.blur > 0.15 ? `blur(${(g.blur * 0.6).toFixed(2)}px)` : "none";
      if (g.lit > 0.05) {
        ctx.shadowColor = WHEEL_ACCENT;
        ctx.shadowBlur = 10 * g.lit;
      }
      ctx.fillStyle = mixHex(WHEEL_INK_DIM, WHEEL_INK_LIT, g.lit);
      ctx.fillText(rowLabel(d, i), 0, 1);
      ctx.restore();
    }
  }
  ctx.font = `400 ${WHEEL_FONT_SIZE}px ${siteFont()}`;
  ctx.fillStyle = WHEEL_ACCENT;
  ctx.fillText(":", WHEEL_COLON_X + 6, WHEEL_CY - 1);

  const fadeTop = ctx.createLinearGradient(0, 40, 0, 96);
  fadeTop.addColorStop(0, WHEEL_SHEET);
  fadeTop.addColorStop(1, "rgba(13,15,20,0)");
  ctx.fillStyle = fadeTop;
  ctx.fillRect(0, 40, WHEEL_W, 56);
  const fadeBot = ctx.createLinearGradient(0, WHEEL_H - 96, 0, WHEEL_H - 40);
  fadeBot.addColorStop(0, "rgba(13,15,20,0)");
  fadeBot.addColorStop(1, WHEEL_SHEET);
  ctx.fillStyle = fadeBot;
  ctx.fillRect(0, WHEEL_H - 96, WHEEL_W, 56);
  ctx.restore();
}
