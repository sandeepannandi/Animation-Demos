# Fogged Glass

A fogged window for React Native. The pane mists over a scene; a finger
wipes clear streaks, water beads gather at the rim of the wipe, run down
the glass with stick-slip and leave clear trails, and the fog slowly
creeps back, grain by grain.

- React Native Skia: one runtime shader composites the sharp scene, a
  blurred read of it, and a per-frame fog texture (fog level plus droplet
  domes) that the condensation simulation packs every frame. Beads refract
  the scene and catch a specular highlight.
- Real condensation physics on a fixed timestep: fog regrowth with
  per-cell grain, bead nucleation out of heavy fog, growth by absorbing
  the fog on a bead's path, stick-slip sliding that stalls when a bead
  sheds enough water, and bead merging.
- Deterministic: a seeded generator drives nucleation and rim beads, so
  web, native and tests agree frame for frame.
- Pass any prepared SkImage pair (sharp and blurred). The Example draws an
  original dusk scene with Skia (Geist, SIL OFL) and builds the blurred
  read by downscaling, no image filters.
- Slow motion runs the condensation clock about four times slower; Reduce
  Motion freezes the pane.

## Usage

Copy `FoggedGlass.tsx` and `fogMath.ts` together and keep the LICENSE
file. `sceneDesign.ts` is only needed if you want the Example's artwork.

```tsx
<FoggedGlass
  image={scene}
  blurred={blurred}
  width={340}
  height={460}
  onFeedback={(event) => { /* 'wipe' | 'release' - hook haptics here */ }}
/>
```

| Prop | Default | Notes |
| --- | --- | --- |
| `image` | required | Prepared SkImage of the scene, sharp. |
| `blurred` | required | The same scene, blurred (the foggy read). |
| `width` / `height` | `340` / `460` | Pane size. |
| `cols` / `rows` | `96` / `128` | Fog texture resolution. |
| `slowMotion` | `false` | ~4x slower condensation clock for demos. |
| `reducedMotion` | system | Frozen pane, no wiping. |
| `onFeedback` | - | `'wipe'` / `'release'` as the glass is wiped. |
| `label` | `'Fogged glass window'` | Accessibility label. |

The component is a single Skia canvas; the fog texture is re-uploaded each
frame at 96x128, and the simulation runs on the JS thread, which also
keeps the render pipeline awake on a quiet screen. Physical-device frame
rate unverified.
