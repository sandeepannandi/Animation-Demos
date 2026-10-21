# Plucked Strings

Five copper guitar strings over a neck, soundhole and bridge. Drag a string
sideways and let go, or swipe across the strings to strum. They ring at real
pitch (E2 A2 D3 G3 B3), blur the way a camera shutter sees a vibrating string,
and die away with the high partials first. Slow motion stretches time so you
can watch the plucked shape split into two pulses that run to the ends and
reflect.

## Files

- `PluckedStrings.tsx` - the component (Skia canvas, PanResponder, Reanimated frame loop).
- `stringMath.ts` - the physics: a shared worklet module, no React Native imports.
- `stringDesign.ts` - the static scene (neck, frets, soundhole, bridge) and string looks.
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

Each string is a sum of standing-wave modes, integrated exactly as damped
oscillators: u(x, t) = sum of a_n(t) sin(n pi x / L), with a'' + 2 s a' + w^2 a = 0.

- Pitch: w_n = 2 pi n f1 sqrt(1 + B n^2). B is the string's stiffness, so upper
  partials sit slightly sharp (inharmonicity), as on a steel string.
- Damping: s_n = s0 + s1 n^2. High partials die first, so the tone mellows as
  it rings.
- Pluck: the finger holds the string as a triangle with its peak under the
  finger, softened by the fingertip width. The partials fall as 1 / n^2 and
  depend on where you pluck: near the bridge is brighter than the middle, and
  plucking exactly at the middle removes the even partials.
- Slip: pull past 46 px and the string slips off the fingertip and rings. A
  swipe across the strings plucks each one it crosses.
- Bridge: the five strings share a bridge that is not perfectly rigid. The low
  modes of all strings are coupled through it, so a ringing string makes the
  strings tuned to its partials sing in sympathy (E2's third partial is B3's
  fundamental).
- Light: a string vibrates hundreds of times per frame, so each frame is drawn
  as 12 poses spread over the simulated time of that frame, jittered, plus the
  band they sweep. Slow motion (0.02x) shrinks that time, the blur collapses
  and the waves show.

The tests check the ring frequency against the tuned pitch, inharmonicity,
the 1 / n^2 pluck spectrum, pluck-position brightness, per-partial and overall
decay rates, that energy never grows, that the string settles, sympathetic
resonance, the held triangle, slip, strumming and the shutter blur.

## Honest limits

- No sound. The model would drive audio directly, but this component is visual.
- The string moves in one plane. Real strings also move in the plane
  perpendicular to the board, which couples to the top and gives the pluck its
  two-stage decay.
- Tension modulation (the brief pitch drop right after a hard pluck) is not
  modelled, and neither are frets: the strings are open.
- Blur uses 12 jittered poses per frame; at some frame rates a string can show
  faint grain instead of a perfectly smooth band.
- The fingertip is a soft circle, not a contact model. The pull limit makes
  the string slip rather than modelling skin friction.
- Physical-device frame rate is unverified; the web preview shares the physics
  module and draws with Canvas2D, not Skia.
