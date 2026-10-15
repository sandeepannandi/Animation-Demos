# Light on Painting

A bulb hangs from a cord in front of a painting in a dark room. Drag the bulb
and the painting relights from its position: lambert shading, distance
falloff, and shadows marched through an authored depth map. Release the bulb
and it swings on a fixed-timestep Verlet rope. Swipe across the painting to
switch scenes. Both bundled paintings (Night Window, Still Life) are original
procedural scenes with hand-authored depth maps - no third-party artwork.

## Files

- `LightPainting.tsx` - the React Native Skia component (Canvas 2D-style
  pixel image + Skia primitives for the cord, bulb and glow).
- `lightMath.ts` - pure rope + shading maths, shared with the web adapter and
  covered by `lightMath.test.cjs` (run with plain `node`).
- `paintings.ts` - shape-list paintings and the albedo+depth rasterizer.
  Albedo and depth come from the same silhouettes, so geometry edges match
  color edges.
- `Example.tsx` - drop-in usage.

## Notes

Shading runs in a SkSL runtime shader (`shaders.ts`): albedo and depth are
uploaded once per painting as 256px textures, then every frame each pixel is
lit on the GPU - lambert from the depth-gradient normal, distance falloff,
and a 3-tap penumbra of occlusion marches. The same lighting model is
implemented by `shadeBuffer()` in `lightMath.ts`, which the Node tests pin
and which serves as the CPU fallback when a runtime effect cannot compile
(160px buffer at ~30fps, upscaled by Skia). The web adapter shades with
WebGL using the same model and falls back to Canvas 2D the same way.
Verified through the Expo web CanvasKit build; not device-tested, no
frame-rate claim. Reduced-motion users get a static bulb with the scene
still lit from it.

MIT licensed - see LICENSE.

## Caption

`showCaption` (default `false`) draws the current painting name above the art
inside the same Skia canvas. The example enables it so the caption and art
are presented together. It adds 29 layout units above the square painting;
without it the component keeps its original square size. The example exposes
an image label with the current name to native accessibility.

The Android API 34 x86_64 emulator regression checked eight painting changes
in both directions and a bulb drag with no title/art mismatch in 276 captured
frames. This is emulator evidence, not a physical-device or frame-rate claim.
`onPaintingChange` remains available for external consumers; a separate native
text caption supplied by a consumer can still present independently of Skia.
