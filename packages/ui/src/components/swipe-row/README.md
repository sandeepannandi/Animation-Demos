# Swipe Row

A list row with swipe-to-reveal actions, like Mail and Messages. Plain React Native: core `Animated`, `PanResponder` and `Pressable`, no gesture or animation dependency. Copy `SwipeRow.tsx`, `swipeLogic.ts` and `LICENSE` together. See `Example.tsx`.

```tsx
<SwipeRowGroup>
  <FlatList onScrollBeginDrag={closeAll /* from useCloseSwipeRows() */} ... renderItem={({ item }) =>
    <SwipeRow
      leadingActions={[pin]}               // swipe right; first action is outermost
      trailingActions={[archive, del]}     // swipe left; last action is outermost
      onFeedback={event => haptics(event)} // 'open' | 'threshold' | 'commit' | 'undo'
      onPress={() => openItem(item)}>
      <ItemContent item={item} />
    </SwipeRow>} />
</SwipeRowGroup>
// An action:
{ id: 'delete', label: 'Delete', completedLabel: 'Deleted', backgroundColor: '#b84a4a',
  removesRow: true, onPress: () => removeFromYourData(item.id) }
```

- The row content moves; the action layers stay put behind it and grow with the drag. Content needs an opaque `rowBackground` (default white).
- Drag follows the finger one to one while the actions are revealed. Past them, a side with a full-swipe action keeps moving with light resistance, a side without one is rubber-banded.
- Release snaps open or closed from distance and fling speed. Past the commit point (half the row width, or a fast fling once the actions are open) the outermost action runs. A haptic `threshold` event fires when the drag crosses that point.
- Actions with `removesRow` slide the row away, show an undo strip for `undoDuration` ms (default 4000, 0 for none), collapse the row, then call `onPress`. Undo slides the row back and calls `onUndo`. Your data is changed only when `onPress` runs. If the row unmounts while an undo is pending, the action is committed. After a removal the row stays collapsed until its key unmounts. Other actions run `onPress` right away and the row closes.
- Tapping an open row closes it. Opening or dragging a row inside `SwipeRowGroup` closes the others; call the function from `useCloseSwipeRows()` on scroll start to close all. Horizontal intent is detected first, so vertical list scrolling still works.
- Accessibility: every action is exposed through the screen reader actions menu (`accessibilityActions`) and hidden action buttons are removed from the accessibility tree until revealed. The undo strip is a live region with an Undo button. Reduce Motion (system, or the `reducedMotion` prop) replaces springs with a short timing and drops the collapse animation.
- Animation is JavaScript driven, because the action layers resize with the drag. That is fine for a screen of rows. It has not been profiled on a long list.
- Optional `onFeedback` callback can run expo-haptics in your app. Core imports no haptics.
- Limits: left to right layout only (no RTL mirroring yet), no keyboard gesture on native (use the actions menu or buttons), fixed 76 px action width, one outermost full-swipe action per side.

Verification: helper tests (`node --test swipeLogic.test.mjs`), TypeScript, Expo dependency check, lint and React Native Web rendering with a scripted mouse drag (open, close others, full swipe, undo, pin, vertical drag ignored). The website preview is a DOM adapter that shares `swipeLogic.ts`, not this native render.
