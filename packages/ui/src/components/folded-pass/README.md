# Folded Pass

An independently authored, gesture-driven paper pass for React Native Skia: three panels joined by two creases that unfold under a finger. Copy FoldedPass.tsx and foldMath.ts and keep LICENSE. passDesign.ts and Example.tsx are the demo ticket. Requires React Native, Skia and Reanimated, with the worklets setup for your installed versions.

```tsx
<FoldedPass atlas={atlas} width={292} panelHeight={112}
  expanded={expanded} onExpandedChange={setExpanded}>
  {/* your live content, laid out at 292 x 336 */}
</FoldedPass>
```

## How it works

- Each panel is a small textured triangle mesh (5 x 13 vertices). Folding is real geometry: two hinges, a camera with perspective, a slight turn of the whole pass, and a gentle bow in the free middle panel.
- When a panel turns over, its paper back shows. The back is mapped upside down, because folding turns it about its crease. Draw backs upright, as they should read once folded over.
- Shading is computed per vertex from the surface normal and a fixed light, plus crease and contact shading that grows with the fold angle. Vertices are denser near the creases so the gradient has resolution.
- Drag scrubs the fold directly. Release hands the finger's speed to a spring, so it carries on rather than restarting. Touch it mid-flight and it stops under your finger and reverses from where it is. Cancelling returns to the controlled state.
- Panels are painted back to front. This order is always correct for a Z-fold, so there is no depth buffer or sort.

## Atlas

`atlas` is one SkImage: fronts in the left half, backs in the right half, three panels stacked top to bottom. Any resolution works (the Example draws it at 2x). The Example draws it with an offscreen Skia surface. Snapshotting live Views with makeImageFromView is possible on native but is not implemented here. Keep the atlas and the live children visually identical, because the hand-off between them is a hard cut. The caller owns the image and disposes it after the component unmounts.

## Live content at rest

Children are shown at rest and hidden while the paper moves. When folded, only the top panel's height is shown. The paper in motion is frozen: text and buttons are not live during a fold. A vertical drag takes over from children; plain taps still reach them. During motion any touch grabs the paper.

## Motion and access

`slowMotion` stretches the same spring four times. `reducedMotion` (and the system Reduce Motion setting) turns the fold off: the pass swaps between its folded and open layouts at once, with no canvas. Set `expanded` from a button for an explicit control. The Example has one, and every state change goes through the same controlled prop.

## Limits

Perspective is approximated by a dense mesh with affine triangles, not projected per pixel. There is no drop shadow under the pass, no self-shadowing between panels beyond the crease terms, and the paper has no thickness. Three panels only. Native view capture, physical-device behaviour and frame rate are unverified. The website preview shares foldMath.ts and draws with WebGL, not Skia. No third-party demo source or artwork is used.
