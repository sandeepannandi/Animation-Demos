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

Shading runs on the JS thread into a 160px buffer at ~30fps and is upscaled
by Skia with linear sampling. That keeps one tested maths implementation
across web and native instead of an unverified shader port. Not device-tested;
no frame-rate claim. Reduced-motion users get a static bulb with the scene
still lit from it.

MIT licensed - see LICENSE.
