# Signature Ink

Draw with a finger, mouse or stylus and replay that actual handwriting stroke by stroke. Ink is smoothed with Catmull-Rom cubics; velocity and available stylus pressure affect width. Measured stroke timing is retained for replay, bounded to .1–4 seconds per stroke with .2-second pen-up gaps. Slow motion reduces replay speed, not drawing responsiveness. Reduced Motion reveals the complete signature immediately.

The existing Motion Path Editor card was revised at the user's request. Its earlier curve-editor helpers are historical source, not dependencies of this control. No path-data display, anchor editing or automatic marker in the revised demo.

Copy SignatureCanvas.tsx, signatureMath.ts and LICENSE. Dependencies: React, React Native, @shopify/react-native-skia. Example.tsx uses the showcase's Geist font.

```tsx
const ref = useRef<SignatureHandle>(null);
<SignatureCanvas ref={ref} onChange={({strokes, svg}) => keepLocally(strokes)} />
```

Ref: replay(), undo(), clear(), value(). Props: onChange(value), onStatus({count,replaying}), slowMotion, reducedMotion. Stroke output is deep copied. Coordinates are logical340×320 units. Limited to64 strokes and2400 points per stroke; no storage/network request. The caller owns any later storage or use. This does not sign documents, verify identity or apply a legal signature. Do not treat a demo drawing as signing authorization.

Canvas2D reference and Skia share the interpolation/replay model. JS animation clock; physical-device performance, pressure-capable stylus behavior, iOS and screen readers require separate tests. A single dot and multiple pen lifts work. Undo removes the last whole stroke. Clear removes the drawing. New drawing interrupts a replay.
