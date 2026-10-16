// The Example gallery: five original procedural landscapes, described as data so the React Native
// demo (Skia) and the web preview (Canvas 2D) render the same scenes. No third-party artwork.
export type Ridge = { color: string; base: number; amp: number; seed: number };
export type Scene = {
  title: string;
  sky: [string, string];
  body: { x: number; y: number; r: number; color: string; halo: string };
  ridges: Ridge[];
};

// Deterministic ridge silhouette: three seeded sine waves summed. x and the result are in scene
// units (0..1); base is the ridge line's resting height, amp how far the peaks wander.
export function ridgeY(ridge: Ridge, x: number): number {
  const { seed, base, amp } = ridge;
  const a = Math.sin(x * 3.1 + seed * 12.9) * 0.5;
  const b = Math.sin(x * 6.7 + seed * 78.2) * 0.3;
  const c = Math.sin(x * 13.3 + seed * 37.7) * 0.2;
  return base - amp * (a + b + c);
}

// A ridge as a closed polygon: the silhouette across n stops, then down to the bottom corners.
export function ridgePath(ridge: Ridge, width: number, height: number, stops = 26): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= stops; i++) {
    const x = i / stops;
    pts.push({ x: x * width, y: ridgeY(ridge, x) * height });
  }
  pts.push({ x: width, y: height }, { x: 0, y: height });
  return pts;
}

export const SCENES: Scene[] = [
  {
    title: "Dune",
    sky: ["#f8dfae", "#eda873"],
    body: { x: 0.68, y: 0.3, r: 0.13, color: "#fff3d9", halo: "#ffe9bd55" },
    ridges: [
      { color: "#e9b478", base: 0.62, amp: 0.06, seed: 0.11 },
      { color: "#d69354", base: 0.74, amp: 0.07, seed: 0.43 },
      { color: "#b96f3c", base: 0.88, amp: 0.08, seed: 0.77 },
    ],
  },
  {
    title: "Ridge",
    sky: ["#dff0e2", "#a8cdb0"],
    body: { x: 0.3, y: 0.26, r: 0.11, color: "#fdfbe8", halo: "#f5f2cf55" },
    ridges: [
      { color: "#8fb894", base: 0.58, amp: 0.08, seed: 0.29 },
      { color: "#5f9468", base: 0.72, amp: 0.09, seed: 0.61 },
      { color: "#315843", base: 0.88, amp: 0.08, seed: 0.87 },
    ],
  },
  {
    title: "Harbor",
    sky: ["#c9def2", "#7fa8d4"],
    body: { x: 0.74, y: 0.34, r: 0.12, color: "#f4f0dc", halo: "#e9e4c455" },
    ridges: [
      { color: "#6e92bd", base: 0.6, amp: 0.05, seed: 0.19 },
      { color: "#44678f", base: 0.74, amp: 0.07, seed: 0.53 },
      { color: "#223d5c", base: 0.9, amp: 0.07, seed: 0.71 },
    ],
  },
  {
    title: "Valley",
    sky: ["#eeddf2", "#c19fd6"],
    body: { x: 0.24, y: 0.3, r: 0.12, color: "#fff1e4", halo: "#ffd9c455" },
    ridges: [
      { color: "#a97fbd", base: 0.6, amp: 0.07, seed: 0.37 },
      { color: "#7c539a", base: 0.75, amp: 0.08, seed: 0.59 },
      { color: "#452f5e", base: 0.9, amp: 0.07, seed: 0.83 },
    ],
  },
  {
    title: "Ember",
    sky: ["#f5c98f", "#d4694a"],
    body: { x: 0.3, y: 0.3, r: 0.12, color: "#ffe9c4", halo: "#ffb87744" },
    ridges: [
      { color: "#b4553c", base: 0.6, amp: 0.07, seed: 0.17 },
      { color: "#7d3527", base: 0.74, amp: 0.08, seed: 0.49 },
      { color: "#3d1c16", base: 0.9, amp: 0.07, seed: 0.71 },
    ],
  },
  {
    title: "Frost",
    sky: ["#eef4f8", "#bccfda"],
    body: { x: 0.72, y: 0.28, r: 0.11, color: "#ffffff", halo: "#e8f0f655" },
    ridges: [
      { color: "#9fb4c4", base: 0.6, amp: 0.06, seed: 0.33 },
      { color: "#64798c", base: 0.74, amp: 0.08, seed: 0.57 },
      { color: "#2e3d4c", base: 0.89, amp: 0.07, seed: 0.79 },
    ],
  },
  {
    title: "Night",
    sky: ["#27304d", "#0d1322"],
    body: { x: 0.7, y: 0.24, r: 0.1, color: "#f2efe2", halo: "#dfe3f055" },
    ridges: [
      { color: "#2c3757", base: 0.62, amp: 0.07, seed: 0.23 },
      { color: "#1b2440", base: 0.76, amp: 0.08, seed: 0.67 },
      { color: "#0a0f1e", base: 0.9, amp: 0.07, seed: 0.91 },
    ],
  },
];
