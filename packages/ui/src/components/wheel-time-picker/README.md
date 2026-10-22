# Wheel Time Picker

A time picker with three curved glass drums: hour, minute and AM or PM. Drag
or fling a drum. It carries inertia, coasts, and a damped spring snaps it to
the nearest row. The row in the amber band lights up, rows fade and blur with
depth, and the tick marks sharpen as the drum slows down.

## Files

- `WheelTimePicker.tsx` - the component (Skia canvas, Reanimated frame loop, one PanResponder per drum).
- `wheelMath.ts` - the drum physics (friction, snap spring, rubber band, wrap) and the cylinder row geometry as pure functions.
- `wheelDesign.ts` - colours and layout constants.
- `Example.tsx` - demo with Spin for me and Slow motion.
- `LICENSE`

## Usage

```tsx
<WheelTimePicker onChange={({ hour, minute, period }) => console.log(hour, minute, period)} />
```

Props: `slowMotion`, `reducedMotion` (defaults to the system setting),
`onChange` (fires when all drums have settled), `onFeedback("tick" | "settle")`
for haptics. Ref: `spinDemo()`, `reset()`.

## Notes

Hour and minute wrap; AM or PM has hard ends with a rubber band. The depth blur
on rows is a text-shadow approximation on native. Physical-device frame rate
and haptics are not verified.
