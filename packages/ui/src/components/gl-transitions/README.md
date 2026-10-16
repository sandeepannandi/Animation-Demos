# GL Transitions

An independently authored, gesture-driven image pager for React Native Skia: a drag scrubs a shader
transition from the current page to the next - ripple, slices, zoom or melt - and a flick completes
or reverses it. Copy GLTransitionPager.tsx, transitionMath.ts and transitionShaders.ts together and
keep LICENSE. scenes.ts and Example.tsx are the demo gallery. Requires React Native, Skia and
Reanimated, with the worklets setup for your installed versions.

```tsx
<GLTransitionPager pages={images} width={304} height={340}
  index={index} onIndexChange={setIndex} />
```

## How it works

- Pages stack edge to edge; the scroll position between two pages is the transition's progress, so
  the effect follows the finger one to one. Release hands the finger's speed to the snap spring: a
  fast flick finishes the hop, a slow release settles to the nearest page. Touch mid-flight and the
  transition freezes under your finger and scrubs from there.
- Four original runtime shaders, one per hop in cycle: Ripple (a wavefront grows from where you
  touched, with a light catch riding it), Slices (seven bands slide in behind the drag direction),
  Zoom (the pages trade places through a zoom with a radial channel split that peaks mid-way), and
  Melt (columns of the old page let go in a fixed shuffled order). Each returns the first page
  untouched at progress 0 and the second at progress 1, so a resting page is pixel-clean.
- Rubber-band resistance past the ends. Directional effects follow the travel direction, including
  mid-drag reversals. A tap on the left or right third walks one page that way. Screen readers get
  an adjustable control with the page name and position, and increment/decrement actions.

## Pages

`pages` are prepared SkImage textures. The Example draws five original procedural landscapes with an
offscreen Skia surface at 2x. Snapshotting live Views with makeImageFromView is possible on native
but is not implemented here, and pages are frozen textures while swiping: put live text and controls
outside the pager, as the Example does with its caption, dots and buttons. Finite, short galleries;
every hop draws both textures every frame (no virtualization).

## Motion and access

`slowMotion` stretches the same spring four times (and so slows the scrub with it). `reducedMotion`
(and the system Reduce Motion setting) skips the transition and snaps pages instantly. Set `index`
from buttons or dots for explicit controls; every state change goes through the same controlled
prop. `onFeedback("snap")` fires when a new page settles; wire expo-haptics there.

## Limits

Only the active hop draws (the two textures it touches), which keeps cost flat in gallery length but
means no three-page peeks. The effects are stylized transitions, not physically based; Melt's column
order is fixed, not per-run random. Physical-device behaviour and frame rate are unverified; each
effect samples two to four texture reads per pixel while scrubbing, which is untested on low-end
GPUs. The website preview shares the maths and draws the same shaders in WebGL GLSL, not Skia. No
third-party demo source, shader collection or artwork is used.
