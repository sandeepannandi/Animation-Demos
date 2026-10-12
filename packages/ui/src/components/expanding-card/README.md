# Expanding Card

An App Store "Today" style card. Tap it and it grows from where it sits into a full detail screen. The hero, title and card colour are the same elements before and after, so nothing cross-fades. Drag down to shrink it back. Plain React Native: core `Animated`, `PanResponder`, `ScrollView` and `measureInWindow`, no animation or navigation dependency. Copy `ExpandingCard.tsx`, `expandingLogic.ts` and `LICENSE` together. See `Example.tsx`.

```tsx
<ExpandingCardHost insets={insets} onFeedback={haptics}>     // give it the whole screen
  <ScrollView>
    <ExpandingCard eyebrow="The Daily List" title="Slow mornings" color="#d9892b" art={<Sun />}
      cardHeight={260} heroHeight={420}>
      <Heading />   // each child of a card is one block of the detail view
      <Paragraph />
    </ExpandingCard>
  </ScrollView>
</ExpandingCardHost>
```

- Opening: the card measures itself (`measureInWindow`, relative to the host), the host draws a copy at exactly that rectangle and above everything, hides the original, then springs one `progress` value from 0 to 1. Position, size, corner radius, hero height, title size and top padding are all interpolated from that one value. Detail content has a fixed full width and is clipped by the growing frame, so text does not re-wrap mid animation.
- Content: after a short delay each child of the card fades and rises in turn (70 ms apart). Each is its own spring.
- Background: the screen behind scales down to 93% and a dim layer fades in, both tied to `progress`, so they also follow your finger while dragging.
- Drag to dismiss: when the detail is scrolled to the top, a downward drag takes the touch from the scroll view. The same `progress` value follows the finger, so the card shrinks back toward where it came from and slides sideways with you. Release past 140 px, or with a fast fling, and it springs home. Otherwise it springs back open. `onFeedback('threshold')` fires when the drag crosses the dismiss point.
- Safe area: pass `insets` from your app (`useSafeAreaInsets`). The hero's title and the close button sit below the top inset and the content clears the bottom inset.
- Accessibility: the card is a button with a label and hint. The open view is modal (`accessibilityViewIsModal`), the background is hidden from screen readers, focus moves to the title and an announcement is made, a labelled Close button is the first control, the standard `escape` action and iOS two finger scrub close it, Android back and the Escape key (web) close it, and focus returns to the card. Reduce Motion (system, or the `reducedMotion` prop) swaps the springs for a short fade-speed resize, with no background scale and no stagger.
- Optional `onFeedback` callback can run expo-haptics in your app: `open`, `threshold`, `close`. Core imports no haptics.
- Limits: the animation is JavaScript driven, because the frame resizes. It has not been profiled on low end devices. One card open at a time. Card art must be plain views or images (it is rendered twice). The open card is drawn inside the host, so it cannot cover a native tab bar or navigation header outside the host. Android pre-API 30 edge-to-edge measuring quirks are untested. No RTL mirroring.

Verification: helper tests (`node --test expandingLogic.test.mjs`), TypeScript, Expo dependency check, lint and React Native Web rendering with scripted pointer drags (open, stagger, drag to shrink, release to restore, release to close, Escape). Not yet tested on iOS/Android devices, with a native screen reader, or with haptics.
