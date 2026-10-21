import {
  STRING_COUNT, STR_DX, STR_NODES, STR_W, STR_H, STR_X0, STR_LENGTH,
  stringPoseAlpha, stringY, type StringsState,
} from "../../packages/ui/src/components/plucked-strings/stringMath";
import {
  STR_BACKGROUND, STR_COPPER, STR_COPPER_LIGHT, STR_PLAIN, STR_PLAIN_LIGHT, STR_SCENE, STR_SHADOW, STR_WIDTH, STR_WOUND,
  type StrFill,
} from "../../packages/ui/src/components/plucked-strings/stringDesign";

function fillStyle(ctx: CanvasRenderingContext2D, f: StrFill): string | CanvasGradient {
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

export function drawScene(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = STR_BACKGROUND;
  ctx.fillRect(0, 0, STR_W, STR_H);
  for (const p of STR_SCENE) {
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
    } else if (p.k === "ring") {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.w;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.stroke();
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

function tracePose(ctx: CanvasRenderingContext2D, ys: ArrayLike<number>, base: number, y0: number, dy: number, dx: number) {
  ctx.beginPath();
  ctx.moveTo(STR_X0 + dx, y0 + ys[base] + dy);
  for (let i = 1; i < STR_NODES - 1; i++) {
    const x = STR_X0 + i * STR_DX + dx;
    const y = y0 + ys[base + i] + dy;
    const xn = STR_X0 + (i + 1) * STR_DX + dx;
    const yn = y0 + ys[base + i + 1] + dy;
    ctx.quadraticCurveTo(x, y, (x + xn) / 2, (y + yn) / 2);
  }
  ctx.lineTo(STR_X0 + (STR_NODES - 1) * STR_DX + dx, y0 + ys[base + STR_NODES - 1] + dy);
}

/** Draw the scene and every string the way a camera shutter sees it. */
export function drawStrings(ctx: CanvasRenderingContext2D, s: StringsState) {
  drawScene(ctx);
  const P = s.poseN;
  const alpha = stringPoseAlpha(s);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let k = 0; k < STRING_COUNT; k++) {
    const y0 = stringY(k);
    const w = STR_WIDTH[k];
    const wound = STR_WOUND[k] === 1;
    const base = wound ? STR_COPPER : STR_PLAIN;
    const light = wound ? STR_COPPER_LIGHT : STR_PLAIN_LIGHT;
    // Shadow on the wood: the string's blur falls on the board too.
    ctx.strokeStyle = STR_SHADOW;
    ctx.lineWidth = w * 1.5;
    for (let p = 0; p < P; p += 3) {
      ctx.globalAlpha = (P === 1 ? 1 : 1 - Math.pow(0.05, 1 / Math.ceil(P / 3))) * 0.55;
      tracePose(ctx, s.fy, (p * STRING_COUNT + k) * STR_NODES, y0, 4, 1.5);
      ctx.stroke();
    }
    // Band: the envelope the string sweeps, filled lightly.
    if (s.blur[k] > 0.8) {
      ctx.globalAlpha = Math.min(0.2, s.blur[k] * 0.012);
      ctx.fillStyle = base;
      ctx.beginPath();
      const lo = k * STR_NODES;
      ctx.moveTo(STR_X0, y0 + s.hi[lo] - w / 2);
      for (let i = 1; i < STR_NODES; i++) ctx.lineTo(STR_X0 + i * STR_DX, y0 + s.hi[lo + i] - w / 2);
      for (let i = STR_NODES - 1; i >= 0; i--) ctx.lineTo(STR_X0 + i * STR_DX, y0 + s.lo[lo + i] + w / 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = base;
    ctx.lineWidth = w;
    for (let p = 0; p < P; p++) {
      ctx.globalAlpha = alpha;
      tracePose(ctx, s.fy, (p * STRING_COUNT + k) * STR_NODES, y0, 0, 0);
      ctx.stroke();
    }
    ctx.strokeStyle = light;
    ctx.lineWidth = Math.max(0.7, w * 0.34);
    for (let p = 0; p < P; p++) {
      ctx.globalAlpha = alpha * 0.9;
      tracePose(ctx, s.fy, (p * STRING_COUNT + k) * STR_NODES, y0, -w * 0.2, 0);
      ctx.stroke();
    }
    // Winding: only readable while the string is nearly still.
    if (wound) {
      const a = Math.max(0, 1 - s.blur[k] / 0.9) * 0.55;
      if (a > 0.01) {
        ctx.globalAlpha = a;
        ctx.strokeStyle = "#3d1e08";
        ctx.lineWidth = w * 0.95;
        ctx.setLineDash([0.7, 1.7]);
        tracePose(ctx, s.fy, k * STR_NODES, y0, 0, 0);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }
  ctx.globalAlpha = 1;
  if (s.grabString >= 0) {
    const gx = STR_X0 + s.grabBeta * STR_LENGTH;
    const gy = stringY(s.grabString) + s.grabD;
    ctx.fillStyle = "rgba(255, 240, 225, 0.10)";
    ctx.beginPath();
    ctx.arc(gx, gy, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 240, 225, 0.14)";
    ctx.beginPath();
    ctx.arc(gx, gy, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}
