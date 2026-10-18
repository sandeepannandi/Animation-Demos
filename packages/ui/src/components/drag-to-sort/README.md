# Drag to Sort

An original fixed-height reorderable list. Core React Native `Animated`, `PanResponder` and `ScrollView`. No new dependencies. Copy `DragToSort.tsx`, `sortLogic.ts` and `LICENSE` together. See `Example.tsx`.

```tsx
<DragToSort items={tasks} keyExtractor={task => task.id}
  labelExtractor={task => task.title} renderItem={task => <Task task={task} />}
  onOrderChange={setTasks} rowHeight={72} gap={10} height={350}
  onFeedback={event => haptics(event)} />
```

- Grab the handle to lift a row. The handle owns the touch from its start; dragging anywhere else scrolls normally. No long press is required. The viewport and content height stay fixed. Only rows translate. The lifted row scales and stays above its neighbors through z-order. Scale is the only visual lift cue: no row shadows (including Android elevation), border or tint change; neighbors spring into new slots as it crosses their midpoint.
- Within 64px of a viewport edge, auto-scroll accelerates quadratically, capped at 520px/sec. The dragged row includes scroll displacement so it stays under the finger. Release springs to the destination and commits once after settling. Cancel button, Android back, responder termination, or Escape on a web handle restores the initial order without calling `onOrderChange`.
- `onFeedback`: `lift`, `cross` (per changed destination), `drop`, `cancel`, `move` (accessible/keyboard). Optional haptics belong in the host app. No haptics dependency here.
- Screen reader handle has Move up/Move down actions (decrement/increment). Focus the handle on web and use ArrowUp/ArrowDown. Position announcements follow completed moves. System Reduce Motion or `reducedMotion` replaces springs with 100ms timing and removes lift scale.
- Items must have unique stable keys. `onOrderChange` receives the complete reordered array; update your controlled items promptly. External key/order changes cancel an active drag. Item content updates with unchanged keys remain live.
- Fixed row height, single vertical column, non-virtualized. Intended for short queues, playlists and priority lists, not thousands of rows. Rendered content must fit `rowHeight`. Do not wrap it in another vertical scroller. No RTL-specific adaptation or native hardware-keyboard support yet.
- Animation and auto-scroll are JS-driven. Not profiled on low-end devices.

Website: a DOM/Framer Motion adapter sharing the reorder and edge-scroll rules, not the native render. It includes pointer cancel, Escape, keyboard moves and a Reduce Motion switch. The real RN source is in Code view.
