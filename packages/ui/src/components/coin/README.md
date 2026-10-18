# Coin

A metal coin floating in space, for React Native. Grab it anywhere and flick
it: it tumbles, precesses and wobbles, and the lighting moves across the face
and the reeded edge as it turns.

- React Native Skia + Reanimated. The simulation steps on the UI thread at a
  fixed 1/480 s timestep, so motion is independent of frame rate.
- Real physics: a free rigid body. The coin is a solid disc (radius 1, 0.2
  thick), so its axial moment of inertia is mR^2/2 and its transverse moment
  is mR^2/4 + m*h^2/12. The angular velocity follows Euler's equations in the
  body frame and the orientation is a unit quaternion, both integrated with
  classical fourth-order Runge-Kutta. A disc spins more easily about its axis
  than about a diameter, which is why a tilted spin wobbles.
- With `damping: 0` the coin is torque-free. The unit tests measure kinetic
  energy and world-frame angular momentum drift of about 3e-11 (relative) over
  120 simulated seconds (asserted below 1e-9), check that the symmetry axis
  keeps a constant angle to the angular momentum, check the body-frame
  precession rate against (I3 - I1) * w3 / I1 and the space-frame precession
  of the axis about the angular momentum against |L| / I1 (both to 1e-6), and
  check that halving the step cuts the error about twenty-fold.
- Default damping is 0.2 per second on the angular velocity, so a flicked coin
  slowly calms down. It is a simple viscous torque, not a model of air.
- Holding the coin: your finger grabs one point on the face. A spring and
  damper pull that point toward your finger in the screen plane, and the
  resulting torque is applied to the body. This is a model of a grip, not
  exact friction. Angular speed is capped at 26 rad/s.
- Rendering is a ray-marched runtime shader (the same source runs in SkSL and
  in the web preview): a rounded-cylinder signed distance field with a raised
  rim, a recessed field, a six-petal emblem and a reeded edge, shaded with
  Fresnel reflection of a procedural studio environment. The environment is
  not an image-based light, and there are no inter-reflections or cast
  shadows. The camera is a simple perspective; touch positions are mapped
  with an orthographic approximation.
- Reduce Motion shows the coin still, tilted, with no gestures.

## Usage

Copy `Coin.tsx`, `coinMath.ts`, `coinShader.ts` and `coinDesign.ts` together
and keep the LICENSE file. `Example.tsx` is optional.

```tsx
<Coin
  slowMotion={false}
  onFeedback={(event) => { /* 'grab' | 'release' - hook haptics here */ }}
/>
```

| Prop | Default | Notes |
| --- | --- | --- |
| `slowMotion` | `false` | ~4x slower clock for demos. |
| `reducedMotion` | system | Still coin, no gestures. |
| `onFeedback` | - | `'grab'` / `'release'` as the coin is held. |
| `label` | `'Metal coin'` | Accessibility label. |

Physical-device frame rate unverified.
