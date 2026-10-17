# Vinyl Player

A turntable for React Native. Tap the record and the tonearm swings in with
a damped spring (a whisper of overshoot as the needle drops); the platter
only powers up once the needle is nearly down, then eases up to 33⅓ rpm
with real inertia. Tap again and the power cuts - the platter drags to a
halt while the arm lifts and parks itself.

- React Native Skia; the clock runs on the JS thread, so the record keeps
  turning on a quiet screen on the new architecture.
- Pure Skia geometry: concentric groove rings, a fixed two-wedge sheen, a
  rotating shine mark and label, and a tonearm drawn from the same angles
  the physics uses. No shaders, no mesh, no images required.
- Optional `artwork` (a SkImage) is clipped to the label and rotates with
  the record.
- Controlled or uncontrolled playing state; tap anywhere on the deck to
  toggle. `onFeedback` fires 'play' / 'pause' for haptics.
- Slow motion runs the clock about four times slower; Reduce Motion drops
  the needle and jumps to speed instantly.

## Usage

Copy `VinylPlayer.tsx` and `vinylMath.ts` together and keep the LICENSE
file.

```tsx
<VinylPlayer
  playing={playing}
  onToggle={setPlaying}
  onFeedback={(event) => { /* 'play' | 'pause' */ }}
  label="Turntable"
  labelColor="#b8402e"
/>
```

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `playing` | `boolean` | - | Controlled state; omit for uncontrolled. |
| `defaultPlaying` | `boolean` | `false` | Initial state when uncontrolled. |
| `onToggle` | `(playing: boolean) => void` | - | Called after taps. |
| `onFeedback` | `(event: 'play' \| 'pause') => void` | - | Haptics hook. |
| `artwork` | `SkImage \| null` | `null` | Label artwork, clipped and rotated. |
| `labelColor` | `string` | `'#b8402e'` | Label base color. |
| `size` | `number` | `320` | Square deck side, px. |
| `rpm` | `number` | `33.333…` | Target platter speed. |
| `label` | `string` | `'Vinyl player'` | Accessibility label. |
| `reducedMotion` | `boolean` | system | Instant drop + jump to speed. |
| `slowMotion` | `boolean` | `false` | Clock runs about 4x slower. |

## Physics

`vinylMath.ts` is the shared worklet module: platter speed approaches its
target exponentially (`spinTauMs` inertia), the tonearm is a damped spring
(`armOmega`, `armZeta`) between two angles derived from the deck geometry
(`armAngles`), and the start/stop sequencing falls out of one coupling each
way - power is gated on the arm being down, and cut the moment you stop. A
small once-per-revolution speed wobble (`wow`) mimics a belt drive. `stepVinyl`
is pure and deterministic; tests run in node.
