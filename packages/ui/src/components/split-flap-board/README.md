# Split-Flap Board

A departure-board row of flipping letter flaps for React Native. Tap the
board and every cell cycles forward through the charset to spell the next
word, columns starting in a left-to-right cascade. Long runs flip faster,
so a far-away letter arrives as the classic rapid clatter, and each landing
gets a small impact bounce.

- React Native Skia + Reanimated; the flip clock runs on the UI thread.
- Pure Skia geometry: rounded flap halves, a scaleY hinge fake, shading
  overlays and a hinge line. No shaders, no mesh, no images.
- Glyphs are an original stroke set (A-Z, 0-9, blank) drawn as Skia paths,
  so there is no font to load on any platform.
- Controlled or uncontrolled word index; tap anywhere on the board to
  advance.
- Slow motion runs the clock about four times slower; Reduce Motion swaps
  instantly with no flip.

## Usage

Copy `SplitFlapBoard.tsx` and `splitFlapMath.ts` together and keep the
LICENSE file.

```tsx
<SplitFlapBoard
  words={['DEPARTURES', 'BOARDING', 'ON TIME']}
  index={index}
  onIndexChange={setIndex}
  onFeedback={(event, i) => { /* 'flip' */ }}
  label="Departure board"
/>
```

| Prop | Default | Notes |
| --- | --- | --- |
| `words` | seven airport words | Uppercased; unknown glyphs render blank. Longest word sets the column count. |
| `index` / `defaultIndex` | `0` | Controlled or uncontrolled word. |
| `onIndexChange` | - | Called when the board advances. |
| `onFeedback` | - | `'flip'` when a transition starts (hook haptics here). |
| `width` | `340` | Cell size and board height derive from the width. |
| `label` | `'Split-flap board'` | Accessibility label prefix. |
| `reducedMotion` | system | Instant swaps, no flip. |
| `slowMotion` | `false` | ~4x slower clock for demos. |

The `words` array should stay stable (identity is part of the layout memo).
The board is a single Skia canvas; per-cell flip state lives in one shared
array stepped by a frame callback. Physical-device frame rate unverified.

## How it looks

Each cell is a dark rounded flap split at the hinge. During a step the
current glyph's upper half rotates down toward the hinge (accelerating,
darkening as it turns), revealing the next glyph's upper half behind it;
then the next glyph's lower half unfolds over the old one, brightening as
it faces you. A soft shadow under the hinge follows the leaf, and a thin
hinge line with a highlight keeps the split readable at rest.
