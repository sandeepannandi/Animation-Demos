# Scrub Chart

An original animated, scrubbable line chart for small categorical datasets, such as weekly activity or a short dashboard trend. A shape-preserving cubic curve draws in on a 1.45-second staged clock: the line leads, the gradient area follows with an eased fade, then the cursor and bubble settle in. Drag to select a reading: a crosshair and point follow on a Reanimated spring, while a value bubble stays inside the chart. The point rides the actual curve between samples, not a straight chord. Sample values in the demo are fictional.

Copy `ScrubChart.tsx` and `chartMath.ts` together and keep LICENSE.

```tsx
<ScrubChart
  width={300}
  height={220}
  data={[{ label: 'Mon', value: 42 }, { label: 'Tue', value: 58 }]}
  label="Weekly activity"
  formatValue={value => `${value} points`}
  onSelect={(datum, index) => console.log(datum, index)}
/>
```

Needs `@shopify/react-native-skia`, `react-native-reanimated`, and `react-native-worklets` (Reanimated 4). Install through `npx expo install`. The showcase uses Skia 2.6.2 and Reanimated 4.5.1. Web Skia needs CanvasKit. No new dependencies for this component.

Props: `data` (immutable array of `{label, value}`), `width` (at least 120), `height` (default 220, at least 100), `label`, `color`, `formatValue`, `onSelect`, `reducedMotion`, `animationKey` (change to replay). Labels and formatted values should be short enough for the 96-point bubble. Categories have equal spacing; this is not a timestamp scale. Finite values only; non-finite values are omitted. An empty set shows "No data", one point renders a dot, and constant or negative readings work. The vertical domain fits the readings with padding, not a zero baseline. Do not use the area as a magnitude-from-zero encoding. Intended for short datasets, not streaming or thousands of readings.

Geometry: harmonic-mean tangents flatten turning points and preserve each segment's range, so smoothing does not invent peaks. SVG path notation is rendered by real Skia `Path`; the line uses `end` trimming for draw-in. The area is revealed with a horizontal clip and smoothstep opacity. These progress at slightly different rates since trim follows curve length and clip follows x. A derived value evaluates the same cubic for the scrub point. Cursor and bubble position are Reanimated values. A lightly underdamped spring follows selections; the displayed cursor is clamped to the plot and the bubble stays bounded. Each new selection adds a single 550ms expanding ring and a small bubble compression/rebound, not a looping pulse. Interrupted animations are cancelled on replay, Reduce Motion changes and unmount. Selection and formatted text update only when the selected reading changes. Data changes reset selection and replay the draw-in; there is no data morph, since a new fitted domain or category set could suggest a misleading trend.

Accessibility: one adjustable element exposes the current category and formatted value. Screen reader increment/decrement actions and web Arrow keys select readings; Home/End select the endpoints. Reduce Motion removes all reveal, spring, bubble rebound and ring motion, showing the final state immediately. The demo has a forced Reduce Motion switch. The bubble is visual; the adjustable element carries the value for assistive technology.

Verification: helper tests, TypeScript, Expo lint/dependency check, web export, and real React Native source with Skia CanvasKit on React Native Web. The gallery is a separate SVG web adapter sharing the geometry, not Skia. It is labelled accordingly.

API references: https://shopify.github.io/react-native-skia/docs/shapes/path/ and https://shopify.github.io/react-native-skia/docs/animations/animations/
