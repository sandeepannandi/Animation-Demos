# Genie Dismiss

An independently authored, reversible textured triangle-mesh funnel for React Native Skia. Pass a prepared SkImage, card rectangle and target point in the same local canvas coordinates. Copy GenieDismiss.tsx and genieMath.ts and keep LICENSE. Requires React Native, Skia and Reanimated, with the worklets setup for your installed versions.

```tsx
<GenieDismiss image={image} width={320} height={410}
  card={{ x: 24, y: 20, width: 272, height: 280 }}
  target={{ x: 270, y: 365 }} minimized={minimized}
  onMinimizedChange={setMinimized} />
```

The bottom narrows first; the card then travels into the target. Drag down/up to scrub directly, release uses vertical velocity or midpoint. Tap and accessibility activation toggle. Controlled prop changes reverse an in-flight animation from its current progress. Slow motion takes 4x longer; system Reduce Motion always wins and uses a short crossfade instead of warping. Gesture cancellation returns to the controlled state. Changing content or geometry resets to that state.

`image` must contain the whole card. Texture coordinates use its pixel size, so high-resolution captures work. Canvas coordinates are layout points. Keep the target and card inside the canvas bounds. A zero-area mesh ends at the target; the caller draws the target icon separately. The component does not delete data or manage navigation. `onMinimizedChange` fires after a user-triggered settle finishes.

## Capturing native content

`snapshotCard(ref)` calls Skia's native makeImageFromView. Use a mounted RN View with `collapsable={false}` after layout, fonts and images are ready. Capture deliberately before hiding the original view. Only switch from the live view to this image when capture succeeds. Handle rejection and retain the original view on failure. Hide the original from touch and accessibility while the snapshot is displayed. The caller owns the SkImage and must dispose it only after all canvases using it unmount. Captured content is frozen, not live or interactive during the warp. Recapture when content changes.

The helper is native-only; Skia web capture requires a separate DOM capture callback and is not implemented here. The Example uses an original offscreen Skia illustration to verify textured rendering without pretending to capture arbitrary RN controls. Native view snapshot correctness, physical-device/Expo Go behavior, and hardware performance have not been verified. Tested against the pinned showcase dependencies, not every Expo/Skia version. Mesh is 325 vertices / 576 triangles; no FPS claim.

The website uses an independently authored WebGL adapter sharing the mesh maths, not the native render. No third-party demo source or artwork is used.
