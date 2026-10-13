# Page Curl

Original cylinder-projection pager for React Native / Expo. Copy PageCurl.tsx,
curlMath.ts and LICENSE. Install Skia, Reanimated and Worklets with expo install.
Tested build versions are recorded in the registry; no physical-device testing.

Pass a stable array of `{ image: SkImage, backImage?: SkImage, label?: string }`,
width and height. Images stretch to the viewport; prepare matching aspect ratios.
Drag the right quarter to advance, the left quarter to go back. The fold follows
vertical drag as well as horizontal progress. Release commits above 38% or with
forward velocity above 0.45 px/ms, otherwise returns. Reverse velocity cancels.
Collection/size changes cancel a turn. This is a finite collection, not a loop.

The sheet wraps around a cylinder. Its front and returning back are sampled from
inverse angles, with cosine lighting and a moving contact shadow. This is not a
flat card rotation. A supplied backImage is tinted like paper, not drawn verbatim.

A PageCurlHandle ref exposes next() and previous() for external buttons.
Screen-reader increment/decrement actions turn pages. Reduced motion changes the
page immediately on release/action with no curl. Gestures use core PanResponder
on the JS thread; shader uniforms animate through Reanimated. This is not a
claim of UI-thread gesture arbitration, 60fps or low-end-phone performance.

## RN content

`snapshotPage(ref)` wraps Skia makeImageFromView. Set collapsable={false} on the
root View, wait for layout/fonts/images, and capture before mounting the pager.
Native snapshot support, nested native views and video need device testing.
Snapshots are frozen textures. They have no live controls or text selection.
Keep the source view's own accessible content outside this canvas where needed.
The caller owns images: keep them alive while mounted and dispose after unmount.
The component does not create or silently refresh snapshots during dragging.

Site preview is a WebGL adapter of the same projection shader, not native Skia.
Expo web route uses actual Skia CanvasKit. Neither is phone verification.
