# Stacked Carousel

Original, core React Native stacked card carousel. Copy `StackedCarousel.tsx` and `carouselLogic.ts` together; keep LICENSE. No new dependency and no copied demo code/assets.

```tsx
<StackedCarousel
  items={[{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }]}
  renderCard={item => <View><Text>{item.label}</Text></View>}
  onIndexChange={index => console.log(index)}
/>
```

Give it a bounded-width parent. Cards are 270px wide at most, shrink on small screens, and use `cardHeight` (300px default). IDs must be unique and stable. `initialIndex` is mount-only. This is an uncontrolled, finite carousel: no looping or autoplay. Keep it to short collections; every card is mounted. Data identity/order changes cancel the current animation/gesture and clamp selection. `onIndexChange` fires only after a completed settle; an interrupted animation cannot commit stale selection.

Horizontal drag is claimed after 7px and only when it beats the vertical gesture. One animated position drives perspective, side offset, vertical depth, scale, opacity and pagination. Release projects velocity for 180ms, then snaps at most one neighbor. Edges resist instead of wrapping. Tap an exposed neighbor or pagination dot, use Previous/Next, or use keyboard arrows on web. Gesture termination restores the committed selection; Escape cancels a web drag. `onFeedback` exposes select/settle hooks; the Expo example adapts them to optional haptics.

Accessibility: adjustable carousel next/previous actions, explicit navigation controls, selected dot states, selection value and announcements. Inactive cards are hidden from screen readers; only exposed neighbors are touchable. System Reduce Motion or the `reducedMotion` prop removes tilt, scale, depth and dot stretch and uses a short timing settle. Touch drag remains direct. Do not put scrolling/gesture-heavy interactive content inside cards without checking responder conflicts.

Verified: helper tests, TypeScript, Expo dependency check and web export, React Native Web and website gesture/keyboard rendering. NOT yet tested on a real iOS/Android device, native screen readers or haptics. JS-driven, not profiled on low-end phones. Fixed-size, non-virtualized, LTR only. The site preview is a separate React/Framer Motion adapter using the same math, not the native render.

API docs checked: https://reactnative.dev/docs/animated, https://reactnative.dev/docs/panresponder, https://reactnative.dev/docs/accessibility, https://reactnative.dev/docs/transforms
