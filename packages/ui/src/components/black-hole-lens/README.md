# Black Hole Lens

A black hole for React Native. Drag it across a starfield and the
background bends around it with real gravitational lensing: an Einstein
ring forms where the hole passes in front of a star, and a glowing
accretion disk spins with one side Doppler-brightened.

- React Native Skia + Reanimated; one runtime shader composites the
  lensed background, the shadow, the photon ring and the disk, and a
  per-frame paint keeps the render pipeline awake on a quiet screen.
- Real physics where it counts. The background bends with the exact
  point-lens map: a pixel at angle theta samples the source plane at
  beta = theta - theta_E^2/theta, the analytic inverse of the two-image
  lens equation, so a source directly behind the hole appears as a ring
  at exactly theta_E. The shadow is drawn at the exact Schwarzschild
  critical impact parameter (3*sqrt(3)/2)*rs, the disk starts at the
  ISCO (3*rs), the disk temperature follows the Page-Thorne profile
  (peaking at 49/36 of the inner edge), and the disk brightness uses the
  relativistic Doppler factor with gravitational redshift at the
  Keplerian orbital speed sqrt(rs/(2r)) (exactly c*sqrt(1/6) at the
  ISCO). The disk winds differentially with the Keplerian r^-3/2
  profile. The unit tests check all of these against their analytic
  values.
- Approximations, honestly: the deflection law is the weak-field form
  2rs/b applied across the whole screen; surface brightness of the
  lensed background is not boosted by magnification; and the disk's
  far-side image (the halo bent over the top and under the bottom of the
  shadow) is a mirrored, attenuated copy of the disk rather than a
  geodesic trace. The disk itself is emissive and is not bent by the
  background lensing map.
- Slow motion runs the spin clock about four times slower. Reduce Motion
  freezes the disk and moves the hole without springs.

## Usage

Copy `BlackHoleLens.tsx`, `holeMath.ts` and `holeDesign.ts` together and
keep the LICENSE file. `Example.tsx` is optional; it shows how to draw
the background texture once with Skia.

```tsx
<BlackHoleLens
  background={spaceImage}
  slowMotion={false}
  onFeedback={(event) => { /* 'grab' | 'release' - hook haptics here */ }}
/>
```

| Prop | Default | Notes |
| --- | --- | --- |
| `background` | required | Any prepared `SkImage`; it is lensed as the distant source plane. |
| `width` / `height` | `340` / `380` | Layout size of the canvas. |
| `slowMotion` | `false` | ~4x slower spin clock for demos. |
| `reducedMotion` | system | Static disk, no springs. |
| `onFeedback` | - | `'grab'` / `'release'` as the hole is dragged. |
| `label` | `'Black hole lens'` | Accessibility label. |

Physical-device frame rate unverified.
