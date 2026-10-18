# Code Reveal

A picture that turns into code under your finger, for React Native. Drag
across the image and a soft-edged patch of text glyphs appears where you
touch, with brighter parts of the picture drawn as denser characters. Release
and the patch fades back into the picture.

- React Native Skia + Reanimated. One runtime shader draws everything: the
  picture, the glyph grid and the reveal.
- The picture is procedural (a dusk landscape written in the shader), so there
  is no image to load. It is an original illustration, not a photo.
- Per-cell sampling: the screen is a grid of 9 px cells. For each cell the
  shader averages four samples of the picture, turns them into a luminance
  value and picks one of ten glyph levels, from blank through `.` `:` `-` `=`
  `+` `x` `*` `#` to `@`.
- The glyphs are drawn analytically in the shader (bars, dots and rings with
  anti-aliased edges). There is no font and no texture atlas, so nothing can
  fail to load. The glyph shapes are close to those characters, not a typeface.
- The brush is a ring of up to 40 stamps. Each stamp has a position, a radius
  and a strength. Moving the finger adds stamps along the stroke; the faster
  the finger moves (smoothed speed), the larger the radius, between 26 and 64
  px. A stamp has a solid core and a soft falloff, and a cell's glyph density
  scales with how strongly it is revealed, so the edge thins out into sparse
  dots. While the finger is held, the patch under it stays on.
- Decay is exponential per stamp with a time constant of 0.7 s, applied with
  the real frame time, so it looks the same at any frame rate. The unit tests
  check the decay rate, that splitting time into steps gives the same result,
  the radius bounds and the ring limits.
- Color glyphs mode tints each glyph with the picture's color under it.
  Slow motion makes the fade four times slower.
- Reduce Motion shows the picture with one fixed patch revealed and no
  gestures.

## Usage

Copy `CodeReveal.tsx`, `revealMath.ts`, `revealShader.ts` and `revealDesign.ts`
together and keep the LICENSE file. `Example.tsx` is optional.

```tsx
<CodeReveal
  colorGlyphs={false}
  slowMotion={false}
  onFeedback={(event) => { /* 'touch' | 'release' - hook haptics here */ }}
/>
```

| Prop | Default | Notes |
| --- | --- | --- |
| `colorGlyphs` | `false` | Glyphs take the picture's colors. |
| `slowMotion` | `false` | The fade runs about 4x slower. |
| `reducedMotion` | system | Still image with one revealed patch. |
| `onFeedback` | - | `'touch'` / `'release'`. |
| `label` | accessibility label | |

Not yet checked on a physical device.
