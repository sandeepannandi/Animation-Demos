# Motion Blur

An independently authored, gesture-driven image pager for React Native Skia: pages streak along the
swipe direction, and the streak grows with speed, the way a camera shutter records fast motion. Copy
MotionBlurPager.tsx, motionMath.ts and blurShader.ts together and keep LICENSE. scenes.ts and
Example.tsx are the demo gallery. Requires React Native, Skia and Reanimated, with the worklets
setup for your installed versions.

```tsx
<MotionBlurPager pages={images} width={340} height={340}
  index={index} onIndexChange={setIndex} />
```

## How it works

- Every page is a prepared SkImage drawn through a directional blur runtime shader: twelve taps along
  the motion vector with tent weights, plus a red/blue split along the same vector that widens with
  speed. At rest the shader short-circuits to a single tap, so a still page costs one sample.
- Blur follows real content speed, not the finger: the scroll position is differentiated every frame
  and smoothed (~80ms), so flicking hard streaks far, and the picture sharpens as the spring lands.
- Drag maps straight to scroll, with rubber-band resistance past the ends. Release hands the finger's
  speed to the snap spring: a fast flick moves one page in its direction, a slow release settles to
  the nearest page. Touch the pager mid-flight and it stops under your finger and drags from there.
- A tap on a peeking neighbour walks one page that way. Screen readers get an adjustable control with
  the page name and position, and increment/decrement actions.

## Pages

`pages` are prepared SkImage textures. The Example draws five original procedural landscapes with an
offscreen Skia surface at 2x. Snapshotting live Views with makeImageFromView is possible on native but
is not implemented here, and pages are frozen textures while swiping: put live text and controls
outside the pager, as the Example does with its caption, dots and buttons. Finite, short galleries;
every page draws every frame (no virtualization).

## Motion and access

`slowMotion` stretches the same spring four times (and so slows the blur with it). `reducedMotion`
(and the system Reduce Motion setting) removes the blur and fringe and snaps pages instantly.
Set `index` from buttons or dots for explicit controls; every state change goes through the same
controlled prop. `onFeedback("snap")` fires when a new page settles; wire expo-haptics there.

## Limits

The blur is a 12-tap approximation along the dominant axis of the pager (horizontal), not a full
motion-vector convolution, and pages do not skew. The fringe splits red and blue only. Blur length
maps from a fixed speed range (150-3400 px/s) to maxBlur. Native view capture, physical-device
behaviour and frame rate are unverified; the shader runs 36 texture samples per pixel while streaking,
which is untested on low-end GPUs. The website preview shares the maths and draws the same shader
idea with WebGL, not Skia. No third-party demo source or artwork is used.
