# Morph Capsule

A pill that spring-morphs between idle, compact and expanded. Tap to step up (and wrap), or drag vertically: the capsule follows the finger, then settles on the nearest state, and a quick flick moves at least one state. Grabbing it mid-animation continues from where it is.

Plain React Native: `Animated`, `PanResponder`, `Pressable`. No extra dependencies.

## Copy

Copy `MorphCapsule.tsx` and `morphMath.ts` together into your app, and keep `LICENSE`. `Example.tsx` is a usage sample and `morphMath.test.mjs` tests the pure helpers (`node --test morphMath.test.mjs`).

## Use

```tsx
<MorphCapsule
  state={state}               // omit for uncontrolled; defaultState sets the start
  onStateChange={setState}
  content={{ idle, compact, expanded }}
  accessibilityLabel="Focus session"
/>
```

- `content` has one layer per state. Layers are sized to their state and crossfade while the capsule morphs.
- `sizes` overrides the default width and height of any state.
- `onFeedback` fires when a user moves to a different state. Wire haptics there (for example `expo-haptics` in your app). The component itself has no haptics dependency, and your adapter should swallow its own errors.
- `reducedMotion` omitted follows the system setting. When reduced, the capsule jumps with no animation.
- The slot reserves the expanded height, so surrounding layout does not shift while morphing.

## Accessibility

The capsule is one button. Its label is `accessibilityLabel` plus the current state and an optional `stateDescriptions` sentence. It reports `expanded`, and offers Expand and Collapse actions, so drag is never required. Only the current state's layer is visible to screen readers, and content layers are presentational: put interactive controls outside the capsule.

## Status

Not tested on a device. Checked: TypeScript, the helper tests and a React Native Web render. Not verified: iOS, Android, screen readers and haptics. The drag range (120 px per state) and spring values are starting points to tune on a device.
