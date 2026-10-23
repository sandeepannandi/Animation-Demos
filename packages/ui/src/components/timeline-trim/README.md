# Timeline Trim

A reusable React Native Skia time-range selector. Values are source seconds, independent of zoom. Pinch around a fixed source point, pan with friction, drag either trim edge, scrub the playhead and hold near an edge to auto-scroll. Ruler levels crossfade during zoom. Release snaps to the current ruler subdivision. System reduced motion removes inertia and settling.

Copy `TimelineTrim.tsx`, `timelineMath.ts`, `timelineGesture.ts` and `LICENSE`. Requires React, React Native and `@shopify/react-native-skia`.

```tsx
const trim = useRef<TimelineTrimHandle>(null);
<TimelineTrim
  ref={trim}
  duration={120}
  initialRange={{ start: 24, end: 84, playhead: 48 }}
  waveform={normalizedAmplitudes}
  thumbnails={[{ time: 0, uri: firstFrameUri }, { time: 20, uri: nextFrameUri }]}
  onChange={({start, end, playhead}) => setSelection({start, end, playhead})}
  onChangeEnd={saveSelection}
  fontFamily="Geist"
/>
```

`thumbnails` is a sorted array of source-time/URI pairs. Images cover their interval to the next timestamp (the last covers to the source duration), moving and scaling with the same time transform as the ruler and waveform. Generate these with your media decoder. The Example uses an original generated landscape sequence, not decoded footage.

`waveform` is an array of normalized amplitudes (0 to 1) evenly spaced over the source duration. No decoding, playback or file export is included. The Example's waveform is generated fixture data, not a recording. Re-mount with a new key for a different source with the same duration; `initialRange` is an initial value, not a controlled prop. `duration` changes reset the model. Minimum selected duration is 0.25 s. The imperative handle exposes `zoom(factor)`, `reset()`, and `adjust('start' | 'end', deltaSeconds)` for non-gesture alternatives. Provide labeled buttons for keyboard/screen reader use, as in Example. `onFeedback` can connect optional haptics. `slowMotion` slows the settle clock, not direct finger tracking.

Web preview uses Canvas2D and the exact same scene/model. Native uses Skia shapes with RN Geist labels. This version renders via a JS animation clock, not UI-thread worklets; physical-device FPS and haptics are unverified. The fixed logical canvas is 340 × 300. Long sources are supported but the ruler zoom cap is 180 px/s. It is a thumbnail/waveform range control, not a full video editor.

Run helper tests with `bash scripts/test-timeline.sh` on Node 22+.
