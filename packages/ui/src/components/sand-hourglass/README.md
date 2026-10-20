# Sand Hourglass

A glass hourglass you can tilt and flip. About 1,400 grains run a real
granular simulation: position-based dynamics with Coulomb friction, so the
sand heaps at its angle of repose, funnels through the neck, avalanches when
you tilt it, and pours the other way when you turn the glass over.

## Files

- `SandHourglass.tsx` — Skia/Reanimated component (glass, plates, grain buckets).
- `sandMath.ts` — the simulation: pure worklets, no imports, seeded and
  deterministic so web, native and the unit tests agree.
- `sandDesign.ts` — colors, card size and grain stroke widths.
- `Example.tsx` — demo wiring (Flip button, slow-motion switch, haptics hook).

## Use

```tsx
import { SandHourglass } from "./SandHourglass";

<SandHourglass slowMotion={false} onFeedback={(e) => {}} />
```

Props: `slowMotion`, `reducedMotion`, `flipSignal` (bump a counter to flip),
`onFeedback("touch" | "release" | "flip")`, `label`, `style`.

## Physics

Position-based dynamics (Müller et al.) at a fixed 120 Hz substep on the UI
thread. Grains integrate under a gravity vector, then overlaps resolve
positionally through a spatial hash; friction is a tangential position
correction capped by the normal correction (Coulomb cone), which is what lets
a heap hold its angle of repose instead of spreading flat. Velocities are
re-derived from accepted displacements, so contacts are inelastic like real
sand. Glass walls are capsule segments with inward normals plus a Euclidean
reach gate: grains far behind a wall are ignored (the other bulb is far), and
a fast grain that tunnels up to one substep of travel is still restored.

Drag tilts the gravity vector toward your finger (a spring gives the turn
inertia); release springs back to vertical; a fling or the Flip button rotates
down 180 degrees. Slow motion steps the clock about four times slower. Reduce
Motion spawns the sand already settled, no animation.

Honest limits: grains are discs of two visual sizes; there is no grain spin or
air entrainment of the stream; the drain is faster than a real hourglass;
physical-device frame rate is unverified (Android emulator CI only). The web
preview shares this physics module and draws with Canvas2D, not Skia.

## License

MIT — see LICENSE. Keep the license with the files when you copy them.
