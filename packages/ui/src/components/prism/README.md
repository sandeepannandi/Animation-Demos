# Prism

A glass prism on a dark bench for React Native. A narrow beam of white light
crosses the room; drag the prism into the beam and it splits into a spectrum
that lands on a matte screen. Switch to a single sodium wavelength and the
beam only bends: no dispersion, because there is only one wavelength.

- React Native Skia + Reanimated. One runtime shader draws the bench, the
  glass triangle, the beams and the fan. There are no images.
- The refraction is real. Every wavelength is traced through the prism on its
  own with the vector form of Snell's law: entry refraction, the path through
  the glass, exit refraction, and total internal reflection with one internal
  bounce when the exit angle is past critical.
- Dispersion comes from Cauchy's equation `n = A + B / lambda^2` with
  A = 1.5046 and B = 0.0042 um^2, a crown glass close to BK7 (n = 1.5224 at
  486 nm, 1.5168 at 588 nm, 1.5143 at 656 nm). Violet bends about 4 degrees
  more than red at the resting angle.
- The rainbow is drawn as a continuous fan: the shader maps the angular
  position of each pixel between the red and violet exit directions back to a
  wavelength through an inverse lookup of the traced deviations, then colours
  it with the standard wavelength-to-RGB mapping. Sixteen traced samples make
  the lookup.
- At minimum deviation the unit tests check the trace against the textbook
  formula `delta = 2 asin(n sin(A/2)) - A` to four decimal places, check that
  the internal ray is parallel to the base, and check Snell's law, the
  critical angle, the reflection law and the colour mapping.
- The prism follows the finger with a spring and keeps the grab offset, so it
  never jumps. Dragging sideways leans it a few degrees, which really changes
  the incidence: the fan sweeps and, leaned far back, the violet end totally
  internally reflects and bounces inside the glass. Dynamics step at a fixed
  1/240 s, so the motion does not depend on the frame rate.
- Honest limits: beam brightness does not fall off with Fresnel coefficients,
  the fan is coloured from the reference ray's exit point rather than one
  point per wavelength (a sub-pixel difference here), and the unit tests cover
  the optics and the springs, not the shader pixels.
- Reduce Motion freezes the prism in the beam with the spectrum showing and
  disables gestures.

## Usage

Copy `Prism.tsx`, `prismMath.ts`, `prismShader.ts` and `prismDesign.ts`
together and keep the LICENSE file. `Example.tsx` is optional.

```tsx
<Prism
  monochromatic={false}
  onFeedback={(event) => { /* 'touch' | 'release' - hook haptics here */ }}
/>
```

| Prop | Default | Notes |
| --- | --- | --- |
| `monochromatic` | `false` | Single 589 nm beam: bends, does not split. |
| `reducedMotion` | system | Still picture with the spectrum showing. |
| `onFeedback` | - | `'touch'` / `'release'`. |
| `label` | accessibility label | |

The unit tests cover the optics and the spring dynamics, not the shader
pixels. A physical device is untested.
