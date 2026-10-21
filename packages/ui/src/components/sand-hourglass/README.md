# Sand Hourglass

A glass hourglass you can tilt and flip. About 1,250 grains run a real
granular simulation: position-based dynamics with Coulomb friction, so the
sand heaps at its angle of repose, avalanches when you tilt it, and pours the
other way when you turn the glass over. The glass is a blown-glass silhouette
(wide rounded bulbs, narrow pinch), and the neck meters the flow like a real
orifice: sand exits as a thin steady thread at a nearly constant rate, queues
above the pinch, and the falling stream contracts as it accelerates.

## Files

- `SandHourglass.tsx` — Skia/Reanimated component (shaded glass, wooden frame, grain layers, sheen).
- `sandMath.ts` — the simulation: pure worklets, no imports, seeded and
  deterministic so web, native and the unit tests agree.
- `sandDesign.ts` — scene data (frame, glass shading), colors and grain sizes.
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
sand. The glass walls are short capsule chords following a shared silhouette
profile (`hourProfile`), with inward normals plus a Euclidean reach gate:
grains far behind a wall are ignored (the other bulb is far), and a fast
grain that tunnels up to one substep of travel is still restored.

The neck is metered the way a real orifice meters sand. A wide open pinch
floods - pressure shoves grains through faster than any velocity cap can hold
- so inside the throat band each grain's accepted displacement along gravity
is capped (Beverloo-style metering) and its across-stream motion is damped
(collimation). The queue above the band behaves like sand pressing on a real
orifice, the flow rate comes out nearly constant (the unit tests check that),
and below the neck grains free-fall and the stream contracts like a real one.

Drag tilts the gravity vector toward your finger (a spring gives the turn
inertia); release springs back to vertical; a fling or the Flip button rotates
down 180 degrees. Slow motion steps the clock about four times slower. Reduce
Motion spawns the sand already settled, no animation.

Honest limits: grains are overlapping discs, not a continuum, drawn with a dark under-layer so the pile reads as one mass; there is no grain
spin or air entrainment of the stream; the drain is faster than a real
hourglass; the upper bulb drains funnel-flow style (a crater forms) where a
real tall bulb keeps a flatter sinking surface; physical-device frame rate is
unverified (Android emulator CI only). The web preview shares this physics
module and draws with Canvas2D, not Skia.

## License

MIT — see LICENSE. Keep the license with the files when you copy them.
