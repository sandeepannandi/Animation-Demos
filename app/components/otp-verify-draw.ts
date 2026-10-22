import {
  OTP_BOX_H, OTP_BOX_W, OTP_CX, OTP_CY, OTP_H, OTP_W, type OtpModel,
} from "../../packages/ui/src/components/otp-verify/otpMath";
import {
  OTP_ACCENT, OTP_BOX_EDGE, OTP_BOX_FILL, OTP_BOX_RADIUS, OTP_CHECK_PATH, OTP_ERROR, OTP_INK, OTP_MUTED, OTP_RESEND, OTP_RESEND_LEAD,
  OTP_RESEND_Y, OTP_SHEET, OTP_SHEET_EDGE, OTP_SHEET_RADIUS, OTP_SUB1, OTP_SUB1_Y, OTP_SUB2, OTP_SUB2_Y, OTP_TITLE, OTP_TITLE_DONE,
  OTP_TITLE_DONE_Y, OTP_TITLE_Y,
} from "../../packages/ui/src/components/otp-verify/otpDesign";

const FONT = "Geist, system-ui, -apple-system, sans-serif";
const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`;
};

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, weight: number, color: string, alpha: number) {
  if (alpha <= 0.002) return;
  ctx.globalAlpha = alpha;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(s, x, y);
  ctx.globalAlpha = 1;
}

export function drawOtp(ctx: CanvasRenderingContext2D, m: OtpModel, digits: string[]) {
  ctx.clearRect(0, 0, OTP_W, OTP_H);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, OTP_W - 1, OTP_H - 1, OTP_SHEET_RADIUS);
  ctx.fillStyle = OTP_SHEET;
  ctx.fill();
  ctx.strokeStyle = OTP_SHEET_EDGE;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.clip();

  text(ctx, OTP_TITLE, OTP_CX, OTP_TITLE_Y, 22, 600, OTP_INK, m.titleOld);
  text(ctx, OTP_SUB1, OTP_CX, OTP_SUB1_Y, 13, 400, OTP_MUTED, m.titleOld);
  text(ctx, OTP_SUB2, OTP_CX, OTP_SUB2_Y, 13, 400, OTP_MUTED, m.titleOld);
  text(ctx, OTP_TITLE_DONE, OTP_CX, OTP_TITLE_DONE_Y + m.titleNewY, 22, 600, OTP_INK, m.titleNew);
  if (m.titleOld > 0.002) {
    ctx.globalAlpha = m.titleOld;
    ctx.font = `400 13px ${FONT}`;
    const lead = ctx.measureText(OTP_RESEND_LEAD).width;
    ctx.font = `600 13px ${FONT}`;
    const link = ctx.measureText(OTP_RESEND).width;
    const x0 = OTP_CX - (lead + link) / 2;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = `400 13px ${FONT}`;
    ctx.fillStyle = OTP_MUTED;
    ctx.fillText(OTP_RESEND_LEAD, x0, OTP_RESEND_Y);
    ctx.font = `600 13px ${FONT}`;
    ctx.fillStyle = OTP_INK;
    ctx.fillText(OTP_RESEND, x0 + lead, OTP_RESEND_Y);
    ctx.globalAlpha = 1;
  }

  if (m.halo > 0.002) {
    const g = ctx.createRadialGradient(OTP_CX, OTP_CY, 0, OTP_CX, OTP_CY, 120);
    g.addColorStop(0, rgba(OTP_ACCENT, 0.2 * m.halo));
    g.addColorStop(1, rgba(OTP_ACCENT, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, OTP_W, OTP_H);
  }
  if (m.rippleA > 0.002) {
    ctx.strokeStyle = rgba(OTP_ACCENT, m.rippleA);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(OTP_CX, OTP_CY, m.rippleR, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = 0; i < m.boxes.length; i++) {
    const b = m.boxes[i];
    if (b.alpha <= 0.002) continue;
    ctx.save();
    ctx.translate(OTP_CX + b.x, OTP_CY + b.y);
    ctx.rotate((b.rot * Math.PI) / 180);
    ctx.scale(b.sx, b.sy);
    ctx.globalAlpha = b.alpha;
    const x = -OTP_BOX_W / 2, y = -OTP_BOX_H / 2;
    const edge = b.err > 0.5 ? OTP_ERROR : OTP_ACCENT;
    if (b.glow > 0.002) {
      ctx.shadowColor = rgba(OTP_ACCENT, 0.7 * b.glow);
      ctx.shadowBlur = 26 * b.glow;
      ctx.fillStyle = OTP_BOX_FILL;
      ctx.beginPath();
      ctx.roundRect(x, y, OTP_BOX_W, OTP_BOX_H, OTP_BOX_RADIUS);
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }
    ctx.beginPath();
    ctx.roundRect(x, y, OTP_BOX_W, OTP_BOX_H, OTP_BOX_RADIUS);
    ctx.fillStyle = OTP_BOX_FILL;
    ctx.fill();
    if (b.glow > 0.002) {
      ctx.fillStyle = rgba(OTP_ACCENT, 0.1 * b.glow);
      ctx.fill();
    }
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = OTP_BOX_EDGE;
    ctx.stroke();
    if (b.ring > 0.002) {
      ctx.strokeStyle = rgba(edge, b.ring);
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
    ctx.restore();
    if (b.digitAlpha > 0.002 && digits[i]) {
      ctx.save();
      ctx.translate(OTP_CX + b.x, OTP_CY + b.y);
      ctx.rotate((b.rot * Math.PI) / 180);
      ctx.scale(b.digitScale * b.sx, b.digitScale * b.sy);
      text(ctx, digits[i], 0, 1, 26, 600, OTP_INK, b.digitAlpha * b.alpha);
      ctx.restore();
    }
  }

  if (m.check > 0.002) {
    const last = m.boxes[m.boxes.length - 1];
    const pts = OTP_CHECK_PATH;
    const seg = [Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1])];
    let left = (seg[0] + seg[1]) * m.check;
    ctx.save();
    ctx.translate(OTP_CX + last.x, OTP_CY + last.y);
    ctx.strokeStyle = OTP_ACCENT;
    ctx.lineWidth = 3.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = rgba(OTP_ACCENT, 0.45);
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let s = 0; s < 2; s++) {
      const f = Math.min(1, left / seg[s]);
      ctx.lineTo(pts[s][0] + (pts[s + 1][0] - pts[s][0]) * f, pts[s][1] + (pts[s + 1][1] - pts[s][1]) * f);
      left -= seg[s];
      if (left <= 0) break;
    }
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
