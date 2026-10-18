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
- Optional planet toggle. A small gas giant sits in the source plane, so
  the lens map bends its image for free: drag the hole close and the
  planet smears into arcs with a secondary image inside the Einstein
  radius. The planet feels the exact leading-order tide: its stretch
  follows the ratio eta = (d_R/d)^3, where d_R = R(2M/m)^(1/3) is the
  rigid-body Roche limit built from the Schwarzschild mass M = rs/2.
  Cross the limit and the planet sheds a debris stream with the tidal
  velocity dispersion R*sqrt(GM/d^3); the debris integrates Newtonian
  point-mass gravity at a 48x time warp, with a stylized drag inside the
  disk that pulls each grain toward the local Keplerian speed and lets
  it spiral in. Grains that cross the shadow feed the disk, which
  burns brighter for a few seconds. Dragging the hole back out recovers
  the planet only if it has not crossed the Roche limit yet; a
  disrupted planet never comes back. The unit tests check the Roche
  limit, the tide-versus-self-gravity invariant at the limit, the
  d^-3 scaling, the kick scaling, irreversibility, and capture.
- Approximations, honestly: the deflection law is the weak-field form
  2rs/b applied across the whole screen; surface brightness of the
  lensed background is not boosted by magnification; and the disk's
  far-side image (the halo bent over the top and under the bottom of the
  shadow) is a mirrored, attenuated copy of the disk rather than a
  geodesic trace. The disk itself is emissive and is not bent by the
  background lensing map. For the planet: the Roche limit is the
  rigid-body form (a fluid body disrupts about 2.44x farther out), the
  planet's mass ratio is chosen for scene scale, the planet is held at a
  fixed point rather than orbiting, and the debris uses Newtonian
  gravity with a time warp and a phenomenological disk-capture drag, not
  a geodesic integrator.
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
| `planet` | `false` | Adds the tidal-disruption planet to the source plane. |
| `onFeedback` | - | `'grab'` / `'release'` as the hole is dragged. |
| `label` | `'Black hole lens'` | Accessibility label. |

Physical-device frame rate unverified.
