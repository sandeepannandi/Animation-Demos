# Orbit QR

Original Skia component for React Native / Expo. Copy OrbitQR.tsx, orbitMath.ts and
LICENSE. Install Skia, Reanimated and Worklets with expo install. Tested build
versions are in the registry. No physical-device testing yet.

Pass `modules` (a boolean matrix from any QR encoder), `size`, and `showCode`.
The Example uses qrcode-generator (MIT). The component has no QR dependency.

Tiles sit on a sphere that spins and follows a finger drag (core PanResponder, JS
thread). Set showCode and a top-down wave lands each tile on its module. Rotation
and perspective unwind to zero per tile, so the last frame is an exact flat grid
on a light card with a 4-module quiet zone. Flip showCode mid-morph to reverse
from the current progress. Rows of the code map to latitude bands of the sphere
and columns to longitude, so the picture unfolds in order.

Tests (orbitMath.test.cjs) rasterize the end frame and decode it with jsQR at
several sizes and error-correction levels; sphere and mid-morph frames do not
decode. That checks the layout maths. It is not a camera scan on a phone.

Reduced motion (system setting or reducedMotion) swaps the wave for a short fade
and stops the spin. Screen readers get `label` once the code is shown.
Performance is not profiled. There is no 60fps claim.

The site preview draws the same maths with Canvas 2D. The Expo web route uses
Skia CanvasKit. Neither replaces a native device test.
