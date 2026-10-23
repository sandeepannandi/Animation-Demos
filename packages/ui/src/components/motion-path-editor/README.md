# Motion Path Editor

An original Skia cubic-path editor. Anchors and linked or independent tangent handles edit the real path. Split uses de Casteljau, so inserting an anchor does not change the curve. The marker travels at 48 logical units per second by numerically integrated arc length, rather than by Bezier parameter. It follows live edits. Handle guides unfold, but geometry always follows the pointer directly.

Copy all source files, retain LICENSE, and install React Native and `@shopify/react-native-skia`. See Example.tsx for the minimal buttons and Geist typography.

```tsx
const editor = useRef<MotionPathHandle>(null);
<MotionPathEditor ref={editor} onChange={({anchors, svg, length}) => save(svg)} />
```

Props: `initialAnchors`, `onChange`, `onChangeEnd`, `onStatus`, `slowMotion`, `reducedMotion` (system by default). Callbacks return deep-copied real coordinates, SVG cubic path data, approximate path length. Handles are relative to the anchor. Supply 2–12 valid finite anchors. Initial anchors are read at mount/reset, not a controlled value. Ref actions: select, split (selected outgoing segment, or last incoming segment), mode, undo, zoom, play, reset, value.

Drag anchors/handles; drag empty canvas to pan. Buttons offer point selection, smooth/corner constraints, exact split, undo, zoom, pause and reset. Canvas is 340×320 logical units. Zoom is .75–2×. Open paths only, maximum12 anchors, no SVG import or closed-path editing. Undo stores up to30 geometry changes. Reduce Motion freezes automatic marker motion and removes handle reveal. Pause does not stop editing. Slow motion changes preview travel and guide reveal only, not drag responsiveness or exported geometry.

Web preview uses the same math/scene through Canvas2D; native uses Skia. Both animation loops currently run on the JS clock. Do not infer physical-device frame rate or iOS support from web/helper tests. Screen-reader coordinate editing and physical-device performance need separate coverage.
