# Plucked Strings

Five copper strings pinned at both ends on a dark board. Drag a string up or
down and let go: the pluck rings, waves travel along the string, reflect off
the fixed ends inverted, and fade with tension and damping. Thick strings
carry slower waves than bright ones, so the board settles into a calm strum.

## Files

- `PluckedStrings.tsx` - the component (Skia canvas, PanResponder, Reanimated frame loop).
- `stringMath.ts` - the physics: a shared worklet module, no React Native imports.
- `stringDesign.ts` - colors and sizes.
- `Example.tsx` - demo wiring with a slow-motion switch.
- `stringMath.test.mjs` - node:test physics tests (`node --test stringMath.test.mjs`).

## Usage

```tsx
import { PluckedStrings } from "./PluckedStrings";

<PluckedStrings slowMotion={false} onFeedback={(e) => { /* "touch" | "release" */ }} />
```

Dependencies: `react`, `react-native`, `@shopify/react-native-skia`,
`react-native-reanimated`. `Example.tsx` adds nothing else; the showcase wires
optional `expo-haptics` to `onFeedback`.

## The physics

The wave equation d2u/dt2 = c^2 d2u/dx2 on each string, stepped with an
explicit finite-difference (FDTD) scheme at a fixed 240 Hz substep. Each
string keeps its own Courant number r = c*dt/dx (0.96 down to 0.58), all below
the scheme's stability limit of one, so wave speed and pitch vary by string.
Ends are pinned, which inverts a reflected pulse; damping removes a fraction
of velocity per substep. The tests check pinned ends, inverted reflection,
the fundamental period against f1 = c / 2L, energy conservation without
damping (drift under 1% over 5 s), settling with damping, the drag constraint
and the pull clamp. Motion is slowed far below a real string so the waves are
visible.

## Honest limits

- Frequencies are slowed for watching; this is not a real-time instrument.
- The drag drives one node with a soft constraint (a finger model), not a
  distributed touch.
- Highlight shades follow node speed, not a physical string shimmer.
- Physical-device frame rate is unverified; web preview shares the physics
  module and draws with Canvas2D, not Skia.
