# Text Morph

Original Skia component for React Native / Expo. Copy TextMorph.tsx,
textMorphMath.ts and LICENSE. Install Skia, Reanimated and Worklets with
`expo install`. No physical-device testing yet.

```tsx
const font = useFont(require("./fonts/Geist-Regular.ttf"), 12);
<TextMorph text={paragraph} image={pixels} size={320} font={font}
  morphed={morphed} onMorphedChange={setMorphed} />
```

Props: `text`, `image` (RGBA pixels: `{ width, height, data }`), `size` (width in
points, height is 1.25x), `font` (a loaded Skia font), `morphed`,
`onMorphedChange`, `reducedMotion`, `slowMotion`, `label`.

Every non-space character is laid out on a word-wrapped page, then flies to one
point of the picture. Points are sampled where the picture is bright and opaque,
then pushed apart so letters do not pile up; letters leave in reading order, on a
curved path with their own delay and spin, and land with no rotation. Both end
frames are exact. Tap toggles; drag sideways scrubs and release settles to the
nearer end. Reduced motion shortens the flight to a quick fade. `slowMotion`
stretches the same flight about four times so you can watch each letter travel;
Reduce Motion still wins. Dragging always stays 1:1 with your finger. The Example
and the website include a Slow motion switch.

`scene.ts` draws three original procedural pictures: Lighthouse, Rocket and
Mountains. The Example and website offer these three choices; changing a choice
returns to the page before the next flight. No upload or photo decoder is included.
The Example needs no image file. Any RGBA pixels work, for example from a Skia image's `readPixels()`.

Limits, stated plainly:

- Latin text only. Each character uses one advance width, with no kerning,
  shaping, or right-to-left support. Layout runs when the text, picture, size
  or font changes.
- One `drawText` call per glyph per frame. Not profiled, no frame-rate claim.
  Very long paragraphs will cost more, and text that does not fit the card shrinks the type until it does.
- The picture is only as readable as the glyph budget: roughly 900 letters
  resolves a bold, simple scene. Fine detail is lost.
- The font is passed in. The Example bundles Geist (SIL Open Font License) in
  `fonts/`; replace it with any .ttf. Fonts are not part of the copied files.
- Verified in Expo web (Skia CanvasKit) in a desktop browser. Not run on iOS or
  Android hardware, and not tried in Expo Go.
- The site preview shares the maths and draws with Canvas 2D, not Skia.

Tests (textMorph.test.cjs) cover wrapping, one-to-one glyph assignment,
exact end frames and picture coverage.
