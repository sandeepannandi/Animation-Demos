# Glass Lens

Original touch-following glass lens. A round lens sits on a scene. Put a finger on it and drag: the lens grows a little, trails your finger on a spring, stretches along the way it moves, and bends the scene beneath it. The effect is one Skia runtime shader (SkSL) driven by Reanimated springs. No copied demo code or assets.

Copy `GlassLens.tsx` and `lensMath.ts` together and keep LICENSE.

```tsx
<GlassLens
  width={300}
  height={200}
  backdrop={({ width, height }) => <ImageShader image={image} fit="cover" rect={{ x: 0, y: 0, width, height }} />}
  overlay={<MyCaption />}
  radius={62}
  strength={0.45}
  aberration={0.03}
  onMove={point => console.log(point)}
/>
```

Dependencies: `@shopify/react-native-skia`, `react-native-reanimated` and `react-native-worklets` (Reanimated 4). In an Expo app run `npx expo install @shopify/react-native-skia react-native-reanimated react-native-worklets`. Skia runs on iOS, Android and web; on web it needs CanvasKit, see the Skia docs. Optional: `expo-haptics`, used only by the demo adapter.

How it works: the scene is a child shader of one runtime shader. For each pixel the shader measures the distance `n` from the lens centre, in units of the radius, after squeezing the space along the direction of travel. Inside the lens the scene is sampled at `center + offset * (1 - strength * (1 - n^2))`, which magnifies most at the middle and eases back to normal at the rim; a bevel near the rim bends the view back out. Red, green and blue are sampled at slightly different scales for the colour fringe. A light from the upper left adds a rim highlight and a soft gloss, and a short shadow falls outside. The lens position is a spring that chases the finger. The gap between the two sets the stretch. The geometry lives in `lensMath.ts` as plain worklets, so it is unit tested without a device.

Props: `width`, `height`, `backdrop` (a function returning a Skia shader node), `overlay` (RN content above the canvas, not bent by the lens), `radius`, `strength`, `aberration`, `label`, `onMove`, `onFeedback` (`grab`, `release`), `reducedMotion`. The backdrop is sampled by position, so it should fill the box.

Accessibility: the surface is one adjustable element with a label and hint. Screen reader actions (left, right, up, down) and the arrow keys on web nudge the lens by 24 points. System Reduce Motion or `reducedMotion` removes the spring lag, the stretch and the colour fringe, and the lens follows the finger with a very short ease.

Verified: helper tests, TypeScript, Expo dependency check and web export, and the real source rendered with Skia CanvasKit on React Native Web. The shader samples the scene three times per pixel on the GPU and has not been profiled on low-end hardware. The site preview is a separate canvas adapter that runs the same math in JavaScript, not Skia.

API docs checked: https://shopify.github.io/react-native-skia/docs/shaders/overview/, https://shopify.github.io/react-native-skia/docs/shaders/runtime-shader/, https://shopify.github.io/react-native-skia/docs/animations/reanimated/
