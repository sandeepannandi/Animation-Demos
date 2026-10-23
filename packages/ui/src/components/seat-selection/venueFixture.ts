import type { Seat, Section, Venue } from './seatMath';
/** Original generated auditorium. Not a real venue or live availability. */
const ROWS = 'ABCDEFGHIJKLMNOPQRST';
function block(id: string, name: string, tier: number, x: number, y: number, rows: number, perRow: number, pitch: number, rowOffset: number, seed: number): Section {
  const seats: Seat[] = [], w = perRow * pitch + 20, h = rows * 30 + 20;
  for (let r = 0; r < rows; r++) for (let n = 0; n < perRow; n++) {
    const row = ROWS[rowOffset + r], index = seed * 131 + r * 17 + n * 7;
    const pseudo = Math.abs(Math.sin(index * 12.9898) * 43758.5453) % 1;
    seats.push({ id: `${id}-${row}${n + 1}`, section: id, row, number: n + 1, x: x + 10 + pitch / 2 + n * pitch, y: y + 10 + 15 + r * 30, tier, sold: pseudo < .27 });
  }
  return { id, name, tier, x, y, w, h, pitch, seats };
}
export function demoVenue(): Venue {
  const tiers = [
    { name: 'Premium', price: 750, color: '#8a6d2f' },
    { name: 'Executive', price: 450, color: '#3d7a5f' },
    { name: 'Classic', price: 250, color: '#5a6fa8' },
  ];
  const sections: Section[] = [];
  const columns = [['Left', 120], ['Centre', 440], ['Right', 760]] as const;
  columns.forEach(([side, x], ci) => {
    sections.push(block(`p${ci}`, `Premium ${side}`, 0, x, 150, 5, 8, 36, 0, ci + 1));
    sections.push(block(`e${ci}`, `Executive ${side}`, 1, x, 380, 7, 10, 30, 5, ci + 11));
    sections.push(block(`c${ci}`, `Classic ${side}`, 2, x, 660, 8, 12, 25, 12, ci + 21));
  });
  return { width: 1200, height: 980, screen: { x: 300, y: 46, w: 600, h: 30, label: 'SCREEN' }, tiers, sections };
}
