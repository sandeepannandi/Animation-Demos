# Gooey Menu

Original floating action menu. A main button opens a fan of actions that pull out of it like drops of liquid, then merge back in. The goo is drawn with `@shopify/react-native-skia`; motion runs on `react-native-reanimated`. No copied demo code or assets.

Copy `GooeyMenu.tsx` and `gooeyMath.ts` together and keep LICENSE.

```tsx
<GooeyMenu
  label="Create"
  items={[{ id: 'note', label: 'New note', glyph: '✎' }, { id: 'photo', label: 'Add photo', glyph: '◐' }]}
  onSelect={item => console.log(item.id)}
/>
```

Dependencies: `@shopify/react-native-skia`, `react-native-reanimated` and `react-native-worklets` (Reanimated 4). In an Expo app run `npx expo install @shopify/react-native-skia react-native-reanimated react-native-worklets`. Skia runs on iOS, Android and web; on web it needs CanvasKit, see the Skia docs. Optional: `expo-haptics`, used only by the demo adapter.

How it works: the main circle and every action circle are drawn into one Skia layer that is blurred and then alpha thresholded with a colour matrix. Circles that overlap rise past the threshold and fuse; separate ones keep a crisp edge. One spring `progress` value drives everything: each item's travel along the arc, its growth from a point inside the main circle, a small stagger, the plus turning into a cross and the icon buttons. Overshoot gives the wobble. The geometry lives in `gooeyMath.ts` as plain worklets, so it is unit tested without a device.

Props: `items`, `onSelect`, `onOpenChange`, `onFeedback` (`open`, `close`, `select`), `label`, `color`, `iconColor`, `mainRadius`, `itemRadius`, `distance`, `startAngle`/`endAngle` (degrees, -90 is straight up, limited to the upper half so the fan never leaves the bottom edge), `blur` (gooeyness, keep it near a third of `itemRadius`), `reducedMotion`, `slowMotion` (plays the open and close spring four times slower, same wobble, so you can watch the goo form; ignored while Reduce Motion is on). Item ids must be unique. Glyphs are plain text; swap in your own icon component by editing `ItemButton`. The menu is uncontrolled and sized by its own radii, so give it room above it. All circles share one colour, because the threshold step also merges colours.

Accessibility: the main button reports expanded state and announces open and close. Action buttons are hidden from screen readers and not tappable while closed. Escape closes the menu on web. Slow motion is a visual aid only and does not change what the menu announces. System Reduce Motion or `reducedMotion` replaces the spring and stagger with a short timing. Choosing an action closes the menu.

Verified: helper tests, TypeScript, Expo dependency check and web export, and the real source rendered with Skia CanvasKit on React Native Web. Fixed size, upper-half fan, LTR layout. The site preview is a separate React/Framer Motion adapter using an SVG blur and colour matrix with the same math, not Skia.

API docs checked: https://shopify.github.io/react-native-skia/docs/group/, https://shopify.github.io/react-native-skia/docs/animations/reanimated/, https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/
