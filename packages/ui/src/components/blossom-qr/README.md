# Blossom QR

Original Skia component for React Native / Expo. Copy BlossomQR.tsx, blossomMath.ts
and LICENSE. Install Skia, Reanimated and Worklets with expo install. Tested build
versions are in the registry. No physical-device testing yet.

Pass `modules` (a boolean matrix from any QR encoder), `size`, and `showCode`.
The Example uses qrcode-generator (MIT) and has a text field, so the code can be
retyped live. The component has no QR dependency.

Every module is one column in an isometric scene. The middle becomes a trunk,
a circle of modules around it rises into a blossom canopy, dark modules outside
it stay low as grass, and light modules outside are flat ground. Set showCode
and the camera tilts from isometric to top-down while the columns sink and
every module blends to its real colour. The last frame is flat: one square per
module on a light card with a 4-module quiet zone. Flip showCode mid-morph to
reverse from the current progress. Drag turns the tree (core PanResponder, JS
thread) while it is a tree.

The scene is drawn each frame as a single Skia vertex mesh, back to front, with
baked per-face shading and a soft shadow. Tests (blossomMath.test.cjs) rasterize
the end frame and decode it with jsQR at several sizes, levels and payloads,
and check that the tree frame does not decode. That checks the layout maths. It
is not a camera scan on a phone.

Reduced motion (system setting or reducedMotion) swaps the morph for a short
fade. Screen readers get `label` once the code is shown. Performance is not
profiled on a device. There is no 60fps claim.

The site preview draws the same maths with Canvas 2D triangles. The Expo web
route uses Skia CanvasKit. Neither replaces a native device test.
