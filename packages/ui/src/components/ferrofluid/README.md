# Ferrofluid

A dish of black ferrofluid for React Native. Press and hold and a magnet under
the dish switches on: the flat, glossy surface breaks into a hexagonal lattice
of sharp spikes that lean toward the magnet and follow your finger. Let go and
the spikes sink back into a flat pool.

- React Native Skia + Reanimated. One runtime shader draws the lattice, ray
  marches the surface and shades it as glossy black metal in a small studio
  (a softbox, two strip lights and a rim band, which give the spikes their
  long highlights). There are no images.
- The spike spacing comes from the Rosensweig (normal-field) instability. The
  critical wavelength is `2 pi sqrt(sigma / (rho g))`, the capillary length
  times 2 pi. With sigma = 0.028 N/m and rho = 1190 kg/m3 that is 9.7 mm, and
  the hexagonal lattice spacing `2 lambda / sqrt(3)` is 11.2 mm. The dish is
  130 mm wide, so the spikes are 27.7 px apart.
- Onset follows Cowley-Rosensweig: `mu0 Mc^2 = 2 (1 + 1/mu_r) sqrt(rho g sigma)`,
  about 6.6 kA/m for mu_r = 2.
- The magnet is a point dipole 40 mm under the surface. The shader uses the
  exact field magnitude `sqrt(4 d^4 + 5 d^2 r^2 + r^4) / (r^2 + d^2)^(5/2)`.
  Spikes exist only where the field is above onset, so the cluster has a
  radius of about 85 px at full strength.
- Spike height grows like the square root of the distance above onset
  (`M^2/Mc^2 - 1`) and saturates at 42 px. This is a simplified amplitude law
  for the look of the effect, not a free-surface simulation, and it ignores the
  hysteresis real ferrofluid has between forming and losing spikes.
- The field ramps with an under-damped spring (omega 13 rad/s, damping 0.45),
  so spikes overshoot by about 20 percent and settle. The magnet follows the
  finger with a spring of its own, so the spikes sweep along behind it.
  Dynamics step at a fixed 1/240 s, so the result does not depend on the
  frame rate.
- Slow motion runs the dynamics four times slower. Reduce Motion shows the
  spikes standing under the middle of the dish and disables gestures.

## Usage

Copy `Ferrofluid.tsx`, `ferroMath.ts`, `ferroShader.ts` and `ferroDesign.ts`
together and keep the LICENSE file. `Example.tsx` is optional.

```tsx
<Ferrofluid
  slowMotion={false}
  onFeedback={(event) => { /* 'touch' | 'release' - hook haptics here */ }}
/>
```

| Prop | Default | Notes |
| --- | --- | --- |
| `slowMotion` | `false` | Dynamics run about 4x slower. |
| `reducedMotion` | system | Still picture with spikes standing. |
| `onFeedback` | - | `'touch'` / `'release'`. |
| `label` | accessibility label | |

The unit tests cover the physics formulas and the field dynamics, not the
shader pixels. A physical device is untested.
