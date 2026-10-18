# Chaos Pendulum

A double pendulum for React Native. Grab it anywhere and the tip follows
your finger; let go and it keeps your fling and swings chaotically, drawing
two long glowing trails that fade over about four seconds.

- React Native Skia + Reanimated; the simulation steps on the UI thread at a
  fixed 1/960 s timestep, so motion is identical on web and native and
  independent of frame rate.
- Real physics: the exact Lagrangian equations of motion for two point
  masses on massless rods (angles from the downward vertical), integrated
  with classical fourth-order Runge-Kutta. Gravity is 9.81 m/s^2 and the
  rods are 1 m long at 70 px per metre, so the swing runs in real time.
- No drag by default (`drag: 0`): the system conserves energy, so it never
  settles. The unit tests measure total energy drift of about 1.3e-8 of the
  energy scale (m1+m2)g*l1 + m2*g*l2 over 120 simulated seconds of chaotic
  motion (asserted below 1e-7), check that halving the step cuts the error about sixteen-fold,
  and check the small-oscillation period against the analytic normal mode.
  Setting `drag` above zero adds a viscous torque on each joint, which is
  not exact air resistance.
- While you hold the tip, it is driven kinematically (two-link inverse
  kinematics toward your finger, clamped to the arms' reach). That motion
  is not physical; physics resumes on release with the joint velocities you
  were moving with, capped at 32 rad/s.
- Trails are 480 samples (4 s at the sampling rate) per bob, drawn as
  fading polyline buckets with three stroke layers for the glow. Shading
  uses no per-vertex colors.
- Slow motion steps the clock about four times slower. Reduce Motion
  hangs the pendulum still.

## Usage

Copy `ChaosPendulum.tsx` and `pendulumMath.ts` together and keep the
LICENSE file. `pendulumDesign.ts` holds the layout and trail palette and is
imported by the component, so copy it too. `Example.tsx` is optional.

```tsx
<ChaosPendulum
  slowMotion={false}
  onFeedback={(event) => { /* 'grab' | 'release' - hook haptics here */ }}
/>
```

| Prop | Default | Notes |
| --- | --- | --- |
| `slowMotion` | `false` | ~4x slower clock for demos. |
| `reducedMotion` | system | Still pendulum, no trails, no gestures. |
| `onFeedback` | - | `'grab'` / `'release'` as the pendulum is held. |
| `label` | `'Chaos pendulum'` | Accessibility label. |

Physical-device frame rate unverified.
