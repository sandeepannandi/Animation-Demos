# Mosaic Gallery

A gallery of famous paintings rendered as a living mosaic of 2,816 beveled
color tiles. Tap anywhere and the tiles fly to shuffled slots, rippling out
from your tap point as the field re-forms into the next painting. Pinch to
zoom, drag to pan, double-tap to zoom in and back out.

Original component inspired by the feel of Reactiive's Art Gallery. Nothing
is copied: Reactiive's demo is a WebGPU instanced renderer with an ASTC
texture atlas and Nitro C++ color matching; this is a pure Skia `Vertices`
renderer with a deterministic seeded shuffle and per-cell color math in a
shared worklet module. Expo Go compatible - no WebGPU, no native modules,
no texture atlas.

## Usage

```tsx
import { MosaicGallery } from './MosaicGallery';

<MosaicGallery onIndexChange={i => console.log(i)} />
```

Copy `MosaicGallery.tsx`, `mosaicMath.ts` and `mosaic-data.ts` together and
keep the LICENSE file.

## How it works

- Each painting ships as a base64 RGB888 grid (64 x 44 cells) averaged from
  the source image at build time - about 8.5 KB per painting.
- `mosaicMath.ts` owns everything: a worklet-safe base64 decoder, a seeded
  Fisher-Yates shuffle, radial stagger delays from the tap point, the
  per-frame flight evaluation (position, scale pop, RGB lerp) and the
  pinch/pan view math. `mosaicMath.test.mjs` covers it in Node.
- Rendering is a single Skia `Vertices` draw: 2,816 quads with per-corner
  colors, which gives every tile a light-from-the-top-left bevel.
- Gestures use PanResponder only - no react-native-gesture-handler
  dependency. One finger pans (when zoomed), two fingers pinch, a tap
  shuffles to the next painting, a double-tap toggles 2x zoom.
- Reduce Motion replaces the flight with a quick in-place crossfade.
- Slow motion runs the transition clock about four times slower.

## Paintings

Cell colors are derived from these public-domain works via Wikimedia
Commons (scripts/build-mosaic-data.py regenerates `mosaic-data.ts`):

- The Starry Night - Vincent van Gogh, 1889
- The Great Wave off Kanagawa - Katsushika Hokusai, c. 1831
- Girl with a Pearl Earring - Johannes Vermeer, c. 1665
- The Kiss - Gustav Klimt, 1908
- Water Lilies - Claude Monet, 1906

## Notes

- The paintings array must stay stable across renders (changing it rebuilds
  the field).
- Physical-device frame rate unverified; 2,816 quads recompute per frame on
  the UI thread.
