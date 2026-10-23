import { panBy, zoomAt, type SeatFlow } from './seatMath';
export type Point = { x: number; y: number };
/** Absolute local positions prevent coordinate drift; switching finger count rebases. Taps are reported on release. */
export function seatGesture(f: SeatFlow, onTap: (x: number, y: number) => void, enabled: () => boolean = () => true) {
  let count = 0, lastX = 0, lastY = 0, lastTime = 0, distance = 0, downX = 0, downY = 0, downTime = 0, travel = 0, vx = 0, vy = 0;
  const move = (points: Point[], now: number) => {
    const n = points.length;
    if (n >= 2) {
      const midX = (points[0].x + points[1].x) / 2, midY = (points[0].y + points[1].y) / 2;
      const dist = Math.max(12, Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y));
      if (count < 2) { distance = dist; f.vx = 0; f.vy = 0; f.panning = false; }
      else if (enabled()) {
        zoomAt(f, dist / distance, midX, midY);
        panBy(f, midX - lastX, midY - lastY);
        distance = dist; travel += Math.abs(midX - lastX) + Math.abs(midY - lastY);
      }
      count = n; lastX = midX; lastY = midY; lastTime = now; return;
    }
    const p = points[0];
    if (count !== 1) { count = 1; downX = p.x; downY = p.y; downTime = now; travel = 0; vx = 0; vy = 0; f.vx = 0; f.vy = 0; f.panning = true; }
    else if (enabled()) {
      const dt = Math.max(.008, Math.min(.1, (now - lastTime) / 1000));
      vx = .65 * vx + .35 * (-(p.x - lastX) / f.cam.scale / dt); vy = .65 * vy + .35 * (-(p.y - lastY) / f.cam.scale / dt);
      panBy(f, p.x - lastX, p.y - lastY);
      travel += Math.abs(p.x - lastX) + Math.abs(p.y - lastY);
    }
    lastX = p.x; lastY = p.y; lastTime = now;
  };
  const up = (now: number) => {
    if (count === 1 && enabled() && now - downTime < 350 && travel < 49) onTap(downX, downY);
    else if (count === 1 && travel > 49) { f.vx = vx; f.vy = vy; }
    count = 0; f.panning = false;
  };
  return { move, up, cancel: () => { count = 0; f.panning = false; f.vx = 0; f.vy = 0; } };
}
