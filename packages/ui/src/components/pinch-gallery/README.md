# Pinch Gallery

An original photo-style grid that changes density under your fingers. Core React Native `Animated`, `Pressable` and `ScrollView`. No new dependencies. Copy `PinchGallery.tsx`, `pinchLogic.ts` and `LICENSE` together. See `Example.tsx`.

```tsx
<PinchGallery items={photos} keyExtractor={p => p.id} labelExtractor={p => p.title}
  columns={columns} onColumnsChange={setColumns}
  selectedIds={selected} onSelectionChange={setSelected}
  renderItem={(p, { selected }) => <Image source={p.source} style={{ flex: 1 }} />}
  gap={6} height={460} onFeedback={event => haptics(event)} />
```

- Pinch with two fingers. Spread for fewer, larger tiles; pinch in for more, smaller ones (steps default to 2, 3 and 5 columns, `columnSteps` changes them). Tiles blend between the two layouts as your fingers move, and the scroll offset is adjusted every frame so the photo under your fingers stays under them, including while the focal point moves. Release past 40% of the size change to snap to the new density, otherwise it eases back.
- Hold a tile for about 320ms to start selecting. Drag across other tiles to paint a range (Photos style): the first tile decides whether the range selects or deselects. Within 56px of the top or bottom edge the grid auto-scrolls, accelerating quadratically up to 640px/sec. Once anything is selected, tapping a tile toggles it. Selected tiles shrink slightly and show a spring-in checkmark.
- `columns` and `selectedIds` are controlled when given (update them in `onColumnsChange` / `onSelectionChange`); otherwise the gallery keeps its own state. Changing `columns` from outside, for example a 2 / 3 / 5 control, blends the same way around the viewport center.
- `onFeedback`: `pinch-start`, `snap`, `select-start`, `select-change` (per new tile under the finger), `select-end`, `cancel`. Haptics belong in the host app. No haptics dependency here.
- `renderItem` must fill its tile (`flex: 1`, or width/height 100%), because the tile size is animated. Items need unique stable keys. The grid is non-virtualized, intended for a few hundred tiles at most, in a fixed-height viewport. Do not nest it in another vertical scroller.
- Accessibility: each tile is a button with a selected state and a Select/Deselect action. The segmented control in the example is the non-gesture way to change density. System Reduce Motion or `reducedMotion` swaps springs for 100ms timing and removes the shrink on selection.
- Known limits: animation and scroll anchoring are JS-driven and not profiled on low-end devices, no RTL adaptation, no drag-to-reorder, pinch needs a touch screen (the web preview adds trackpad pinch and a column control). Touch coordinates assume the gallery sits in an unscaled view.

Website: a DOM adapter sharing `pinchLogic.ts` (layout, anchoring, range selection, edge scroll). It supports two-finger touch, trackpad pinch (ctrl + wheel or pinch gesture), mouse hold-and-drag selection and a column control. It is not the native render. The real RN source is in Code view.
