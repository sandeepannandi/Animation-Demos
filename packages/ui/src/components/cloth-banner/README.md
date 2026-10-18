# Cloth Banner

A cloth banner for React Native, pinned at its two top corners and swaying
in a light breeze. Grab any point of the fabric and drag: the banner
ripples and folds around your finger with lit shading on the folds, and
when you let go it flings with your finger's velocity and settles back
under gravity and wind.

- React Native Skia + Reanimated; the cloth steps on the UI thread at a
  fixed 120 Hz timestep, so motion is identical on web and native and
  independent of frame rate.
- Real cloth physics: 3D Verlet integration with structural and shear
  constraint relaxation, a layered traveling wind with slow gusts, and a
  grab joint that pins one particle to the pointer.
- The artwork is one image texture on a triangle mesh (weak-perspective
  projection), with per-vertex fold shading from central-difference
  normals against a fixed light. The back of the cloth reads darker.
- Pass any prepared SkImage as the artwork. The Example draws an original
  banner with Skia (Geist, SIL OFL).
- Slow motion steps the cloth about four times slower so you can watch the
  folds travel. Reduce Motion hangs the banner flat and still.

## Usage

Copy `ClothBanner.tsx` and `clothMath.ts` together and keep the LICENSE
file. `bannerDesign.ts` is only needed if you want the Example's artwork.

```tsx
<ClothBanner
  image={banner}
  width={300}
  height={200}
  onFeedback={(event) => { /* 'grab' | 'release' - hook haptics here */ }}
/>
```

| Prop | Default | Notes |
| --- | --- | --- |
| `image` | required | Prepared SkImage, painted on both sides (mirrored on the back). |
| `width` / `height` | `300` / `200` | Banner size at rest; the canvas pads itself for the swing. |
| `cols` / `rows` | `25` / `17` | Cloth resolution. Denser meshes look smoother; keep the product modest for low-end phones. |
| `slowMotion` | `false` | ~4x slower cloth clock for demos. |
| `reducedMotion` | system | Flat, still banner. |
| `onFeedback` | - | `'grab'` / `'release'` as the cloth is tugged. |
| `label` | `'Cloth banner'` | Accessibility label. |

The component is a single Skia canvas; per-frame fold shading arrives
through a one-pixel alpha ramp texture (per-vertex colors are not used -
they do not combine with an image shader and render black on Android).
Physical-device frame rate unverified.
