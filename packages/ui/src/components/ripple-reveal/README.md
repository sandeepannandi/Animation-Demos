# Theme Reveal

A theme-switch transition, like a dark and light mode change that spreads out from the tap. The component is exported as `RippleReveal` and lives in `ripple-reveal/`; only its display name is Theme Reveal. Original tap-to-reveal transition. Touch a themed surface and a second theme spreads out from your finger, with a wave that rides the front of the reveal and fades as it travels. The effect is a Skia runtime shader (SkSL) driven by one Reanimated value. No copied demo code or assets.

Copy `RippleReveal.tsx` and `rippleMath.ts` together and keep LICENSE.

```tsx
<RippleReveal
  width={300}
  height={200}
  themeA={({ width, height }) => <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={['#14173a', '#2a1a4d']} />}
  themeB={({ width, height }) => <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={['#fff0cc', '#fdcc9e']} />}
  overlay={showing => <MyTitle theme={showing} />}
  onChange={showing => console.log(showing)}
/>
```

Dependencies: `@shopify/react-native-skia`, `react-native-reanimated` and `react-native-worklets` (Reanimated 4). In an Expo app run `npx expo install @shopify/react-native-skia react-native-reanimated react-native-worklets`. Skia runs on iOS, Android and web; on web it needs CanvasKit, see the Skia docs. Optional: `expo-haptics`, used only by the demo adapter.

How it works: the two themes are child shaders of one runtime shader. For each pixel the shader measures the distance `d` from the tap and compares it with the front radius. Pixels behind the front show the new theme, pixels ahead show the old one, with a 3px soft edge. Around the front it samples both themes at a point pushed along the radius by `sin(edge / wavelength) * exp(-|edge| / ring) * amplitude`, which makes the ripple, and adds a faint highlight on the crest. One timed `progress` value moves the front out past the farthest corner and shrinks the amplitude to zero, so the settled state is flat and exact. The geometry lives in `rippleMath.ts` as plain worklets, so it is unit tested without a device.

Props: `width`, `height`, `themeA`, `themeB` (functions returning a Skia shader node, for example `LinearGradient`, `ImageShader` or your own `Shader`), `overlay` (RN content above the canvas, given the visible theme), `initial` (`a` or `b`), `label`, `durationMs`, `amplitude`, `wavelength`, `ringWidth`, `onChange`, `onFeedback` (`start`, `settle`), `reducedMotion`. A tap while a reveal is running is ignored. Themes are sampled by position, so they should fill the box.

Accessibility: the surface is one button with a label and hint, and it announces the theme it switched to. Keyboard Enter and Space on web start the reveal from the centre. System Reduce Motion or `reducedMotion` replaces the wave with a short cross-fade.

Verified: helper tests, TypeScript, Expo dependency check and web export, and the real source rendered with Skia CanvasKit on React Native Web. NOT yet tested on a real iOS/Android device, native screen readers, haptics or frame rate on low-end phones. The shader runs per pixel on the GPU, but it has not been profiled on low-end hardware. The site preview is a separate canvas adapter that runs the same math in JavaScript, not Skia.

API docs checked: https://shopify.github.io/react-native-skia/docs/shaders/overview/, https://shopify.github.io/react-native-skia/docs/shaders/runtime-shader/, https://shopify.github.io/react-native-skia/docs/animations/reanimated/
