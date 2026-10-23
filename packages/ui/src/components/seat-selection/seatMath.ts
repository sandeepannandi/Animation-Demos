/** Venue units are abstract world coordinates supplied by the host app. Screen pixels never escape this model. */
export const VW = 340, VH = 300, SEAT = 22;
export type Tier = { name: string; price: number; color: string };
export type Seat = { id: string; section: string; row: string; number: number; x: number; y: number; tier: number; sold: boolean };
export type Section = { id: string; name: string; tier: number; x: number; y: number; w: number; h: number; pitch: number; seats: Seat[] };
export type Venue = { width: number; height: number; screen: { x: number; y: number; w: number; h: number; label: string }; tiers: readonly Tier[]; sections: Section[] };
export type FlowStep = 'venue' | 'section' | 'review';
export type Camera = { scale: number; cx: number; cy: number };
export type SelectedSeat = { id: string; section: string; row: string; number: number; tier: string; price: number };
export type SeatFlow = {
  venue: Venue; step: FlowStep; sectionId: string | null;
  cam: Camera; target: Camera; vx: number; vy: number;
  selected: Record<string, true>; pops: Record<string, { t: number; on: boolean }>;
  maxSeats: number; confirmed: boolean; confirmT: number; sheetT: number;
  notice: string; noticeT: number; panning: boolean;
};
export const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
export const fitCamera = (v: Venue): Camera => ({ scale: Math.min(VW / v.width, VH / v.height), cx: v.width / 2, cy: v.height / 2 });
export function sectionCamera(s: Section): Camera {
  const scale = Math.min(VW / (s.w + 70), VH / (s.h + 96), 1.7);
  return { scale, cx: s.x + s.w / 2, cy: s.y + s.h / 2 + 8 };
}
export function createSeatFlow(venue: Venue, maxSeats = 6, initial?: readonly string[]): SeatFlow {
  const cam = fitCamera(venue), selected: Record<string, true> = {};
  for (const id of initial ?? []) if (findSeat(venue, id) && !findSeat(venue, id)!.sold) selected[id] = true;
  return { venue, step: 'venue', sectionId: null, cam, target: { ...cam }, vx: 0, vy: 0, selected, pops: {}, maxSeats: Math.max(1, maxSeats), confirmed: false, confirmT: 0, sheetT: 0, notice: '', noticeT: 0, panning: false };
}
export const findSeat = (v: Venue, id: string): Seat | undefined => { for (const s of v.sections) { const hit = s.seats.find(seat => seat.id === id); if (hit) return hit; } };
export const findSection = (v: Venue, id: string | null): Section | undefined => v.sections.find(s => s.id === id);
export const screenX = (c: Camera, wx: number) => (wx - c.cx) * c.scale + VW / 2;
export const screenY = (c: Camera, wy: number) => (wy - c.cy) * c.scale + VH / 2;
export const worldX = (c: Camera, sx: number) => (sx - VW / 2) / c.scale + c.cx;
export const worldY = (c: Camera, sy: number) => (sy - VH / 2) / c.scale + c.cy;
export function clampCamera(f: SeatFlow) {
  const v = f.venue, M = 90, hw = VW / (2 * f.cam.scale), hh = VH / (2 * f.cam.scale);
  f.cam.cx = hw - M > v.width - hw + M ? v.width / 2 : clamp(f.cam.cx, hw - M, v.width - hw + M);
  f.cam.cy = hh - M > v.height - hh + M ? v.height / 2 : clamp(f.cam.cy, hh - M, v.height - hh + M);
}
export function zoomAt(f: SeatFlow, factor: number, sx: number, sy: number) {
  const wx = worldX(f.cam, sx), wy = worldY(f.cam, sy);
  f.cam.scale = clamp(f.cam.scale * factor, fitCamera(f.venue).scale * .92, 2.4);
  f.cam.cx = wx - (sx - VW / 2) / f.cam.scale; f.cam.cy = wy - (sy - VH / 2) / f.cam.scale;
  f.target = { ...f.cam }; f.vx = 0; f.vy = 0; clampCamera(f);
}
export function panBy(f: SeatFlow, dx: number, dy: number) {
  f.cam.cx -= dx / f.cam.scale; f.cam.cy -= dy / f.cam.scale;
  f.target = { ...f.cam }; clampCamera(f);
}
export function enterSection(f: SeatFlow, id: string) {
  const s = findSection(f.venue, id); if (!s) return;
  f.step = 'section'; f.sectionId = id; f.target = sectionCamera(s); f.vx = 0; f.vy = 0; f.confirmed = false;
}
export function exitToVenue(f: SeatFlow) {
  f.step = 'venue'; f.sectionId = null; f.target = fitCamera(f.venue); f.vx = 0; f.vy = 0; f.confirmed = false;
}
export function openReview(f: SeatFlow) { if (countSelected(f) > 0) { f.step = 'review'; f.confirmed = false; } }
export function closeReview(f: SeatFlow) { f.step = 'section'; f.confirmed = false; }
export function confirmHold(f: SeatFlow) { if (f.step === 'review' && countSelected(f) > 0) f.confirmed = true; }
export function resetFlow(f: SeatFlow) {
  const fresh = createSeatFlow(f.venue, f.maxSeats);
  f.step = fresh.step; f.sectionId = null; f.cam = fresh.cam; f.target = fresh.target; f.vx = 0; f.vy = 0;
  f.selected = {}; f.pops = {}; f.confirmed = false; f.confirmT = 0; f.sheetT = 0; f.notice = ''; f.noticeT = 0;
}
export type TapResult = 'section' | 'selected' | 'deselected' | 'sold' | 'full' | 'miss';
export function tapVenue(f: SeatFlow, sx: number, sy: number): { result: TapResult; section?: Section; seat?: Seat } {
  const wx = worldX(f.cam, sx), wy = worldY(f.cam, sy);
  if (f.step === 'venue') {
    const s = f.venue.sections.find(s => wx >= s.x - 8 && wx <= s.x + s.w + 8 && wy >= s.y - 8 && wy <= s.y + s.h + 8);
    if (s) { enterSection(f, s.id); return { result: 'section', section: s }; }
    return { result: 'miss' };
  }
  if (f.step === 'section') {
    const s = findSection(f.venue, f.sectionId); if (!s) return { result: 'miss' };
    const seat = s.seats.find(seat => Math.abs(wx - seat.x) <= s.pitch * .5 + 3 && Math.abs(wy - seat.y) <= s.pitch * .5 + 3);
    if (!seat) return { result: 'miss' };
    if (seat.sold) return { result: 'sold', seat };
    if (f.selected[seat.id]) { delete f.selected[seat.id]; f.pops[seat.id] = { t: 0, on: false }; return { result: 'deselected', seat }; }
    if (countSelected(f) >= f.maxSeats) { f.notice = `Maximum ${f.maxSeats} seats`; f.noticeT = 1; return { result: 'full', seat }; }
    f.selected[seat.id] = true; f.pops[seat.id] = { t: 0, on: true }; f.confirmed = false; return { result: 'selected', seat };
  }
  return { result: 'miss' };
}
export const countSelected = (f: SeatFlow) => Object.keys(f.selected).length;
export function selectionList(f: SeatFlow): SelectedSeat[] {
  const list: SelectedSeat[] = [];
  for (const s of f.venue.sections) for (const seat of s.seats) if (f.selected[seat.id]) list.push({ id: seat.id, section: s.name, row: seat.row, number: seat.number, tier: f.venue.tiers[seat.tier].name, price: f.venue.tiers[seat.tier].price });
  return list.sort((a, b) => a.tier.localeCompare(b.tier) || a.row.localeCompare(b.row) || a.number - b.number);
}
export const selectionTotal = (f: SeatFlow) => selectionList(f).reduce((sum, s) => sum + s.price, 0);
/** Indian digit grouping (1,50,000) without locale dependence. */
export function formatPrice(n: number, currency = '₹') {
  const s = String(Math.max(0, Math.round(n))), tail = s.slice(-3), head = s.slice(0, -3);
  const grouped = head ? head.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + tail : tail;
  return currency + grouped;
}
export const easeOutBack = (t: number) => { const c1 = 1.70158, c3 = c1 + 1, u = clamp(t, 0, 1) - 1; return 1 + c3 * u * u * u + c1 * u * u; };
export function stepSeatFlow(f: SeatFlow, dt: number, reduced = false) {
  dt = clamp(dt, 0, .05);
  const k = reduced ? 1 : 1 - Math.exp(-11 * dt);
  for (const key of ['scale', 'cx', 'cy'] as const) f.cam[key] += (f.target[key] - f.cam[key]) * k;
  clampCamera(f);
  if (!f.panning && (Math.abs(f.vx) > 2 || Math.abs(f.vy) > 2)) {
    if (reduced) { f.vx = 0; f.vy = 0; }
    else {
      f.cam.cx += f.vx * dt; f.cam.cy += f.vy * dt; f.target = { ...f.cam };
      const decay = Math.exp(-4.5 * dt); f.vx *= decay; f.vy *= decay; clampCamera(f);
    }
  }
  for (const id of Object.keys(f.pops)) { const p = f.pops[id]; p.t += dt / (reduced ? .01 : .22); if (p.t >= 1) { if (p.on) p.t = 1; else delete f.pops[id]; } }
  f.sheetT += ((f.step === 'review' ? 1 : 0) - f.sheetT) * (reduced ? 1 : 1 - Math.exp(-10 * dt));
  f.confirmT += ((f.confirmed ? 1 : 0) - f.confirmT) * (reduced ? 1 : 1 - Math.exp(-12 * dt));
  if (f.noticeT > 0) f.noticeT = Math.max(0, f.noticeT - dt / 1.6);
}
export type Shape = { x: number; y: number; w: number; h: number; color: string; opacity: number; r?: number; stroke?: string; strokeWidth?: number };
export type Label = { x: number; y: number; text: string; size: number; color: string; opacity: number; align?: 'left' | 'center' | 'right'; weight?: number };
export function seatScene(f: SeatFlow) {
  const shapes: Shape[] = [], labels: Label[] = [], c = f.cam, v = f.venue;
  const rect = (x: number, y: number, w: number, h: number, color: string, opacity = 1, r = 0, stroke?: string, strokeWidth?: number) => shapes.push({ x, y, w: Math.max(0, w), h, color, opacity, r, stroke, strokeWidth });
  const visible = (wx: number, wy: number, pad: number) => { const sx = screenX(c, wx), sy = screenY(c, wy); return sx > -pad && sx < VW + pad && sy > -pad && sy < VH + pad; };
  // Screen.
  const sc = v.screen, sx = screenX(c, sc.x), sy = screenY(c, sc.y), sw = sc.w * c.scale, sh = Math.max(3, sc.h * c.scale);
  rect(sx, sy, sw, sh, '#c3d2bd', .9, sh / 2);
  labels.push({ x: sx + sw / 2, y: sy + sh + 15, text: sc.label, size: 10, color: '#8b9885', opacity: clamp((c.scale - .2) * 4, .35, .9), align: 'center', weight: 600 });
  const venueLabels = clamp((.78 - c.scale) / .18, 0, 1), rowLabels = clamp((c.scale * 30 - 15) / 7, 0, 1);
  for (const s of v.sections) {
    const tier = v.tiers[s.tier];
    const bx = screenX(c, s.x), by = screenY(c, s.y), bw = s.w * c.scale, bh = s.h * c.scale;
    if (bx > VW || by > VH || bx + bw < 0 || by + bh < 0) continue;
    rect(bx, by, bw, bh, tier.color, .1 + venueLabels * .08, 10 * c.scale, tier.color, Math.max(1, 1.6 * c.scale));
    if (venueLabels > 0) {
      labels.push({ x: bx + bw / 2, y: by + bh / 2 - 4, text: s.name, size: 13, color: '#2e3a30', opacity: venueLabels, align: 'center', weight: 700 });
      labels.push({ x: bx + bw / 2, y: by + bh / 2 + 14, text: formatPrice(tier.price), size: 11, color: '#5f6f60', opacity: venueLabels, align: 'center' });
    }
    for (const seat of s.seats) {
      if (!visible(seat.x, seat.y, 40)) continue;
      const pop = f.pops[seat.id], on = !!f.selected[seat.id];
      const base = SEAT * c.scale, grow = pop ? (pop.on ? .55 + .45 * easeOutBack(pop.t) : 1 - .3 * easeOutBack(pop.t)) : 1;
      const size = base * grow, cx = screenX(c, seat.x), cy = screenY(c, seat.y);
      if (seat.sold) rect(cx - size / 2, cy - size / 2, size, size, '#cfd6ca', .95, size * .28);
      else if (on || (pop && !pop.on)) {
        const alpha = pop && !pop.on ? 1 - pop.t : 1;
        rect(cx - size / 2, cy - size / 2, size, size, tier.color, alpha, size * .3);
        if (on && c.scale * s.pitch > 15) rect(cx - size * .16, cy - size * .06, size * .32, size * .16, '#ffffff', alpha, size * .06);
      } else rect(cx - base / 2, cy - base / 2, base, base, '#ffffff', 1, base * .28, tier.color, Math.max(1, 1.4 * c.scale));
    }
    if (rowLabels > 0 && f.step !== 'venue') {
      const rows = Array.from(new Set(s.seats.map(seat => seat.row)));
      for (const row of rows) {
        const seat = s.seats.find(seat => seat.row === row)!;
        labels.push({ x: screenX(c, s.x) - 10, y: screenY(c, seat.y) + 4, text: row, size: 10, color: '#7b8a76', opacity: rowLabels, align: 'right' });
      }
    }
  }
  // Mini-map with viewport indicator.
  const mw = 74, mh = 60, mx = VW - mw - 10, my = 10, ms = Math.min(mw / v.width, mh / v.height);
  rect(mx, my, mw, mh, '#ffffff', .88, 7, '#c9d3c4', 1);
  for (const s of v.sections) rect(mx + s.x * ms, my + s.y * ms, s.w * ms, s.h * ms, v.tiers[s.tier].color, .3, 2);
  const vwx = VW / c.scale, vwy = VH / c.scale;
  rect(mx + (c.cx - vwx / 2) * ms, my + (c.cy - vwy / 2) * ms, vwx * ms, vwy * ms, '#31513b', .12, 2, '#31513b', 1.2);
  return { shapes, labels, step: f.step, count: countSelected(f), total: selectionTotal(f), sheetT: f.sheetT, confirmed: f.confirmed, confirmT: f.confirmT, notice: f.notice, noticeT: f.noticeT, sectionName: findSection(v, f.sectionId)?.name ?? null };
}
