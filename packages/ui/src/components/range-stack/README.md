# Range Stack

A date-range sheet with a live result strip. Tap a start day and an end day:
the end dot springs in while a band grows toward it, then the strip swaps the
old photo stack for a skeleton and, a beat later, the new home photos pop out
of the middle one after another and fan to their resting angles. The number of
photos follows the number of homes free for the range.

## Files

- `RangeStack.tsx` - the component (Skia canvas, Reanimated frame loop, Pressable day cells).
- `rangeMath.ts` - closed-form damped springs, the selection rules and the whole motion timeline as pure functions.
- `rangeDesign.ts` - colours, copy and the five original vector room illustrations.
- `Example.tsx` - demo with Pick dates for me and Slow motion.
- `LICENSE`

## Usage

```tsx
<RangeStack onSave={(range) => console.log(range)} />
```

Props: `slowMotion`, `reducedMotion` (defaults to the system setting),
`onFeedback("select" | "reset")`, `onSave({ start, end, homes } | null)`.
Ref: `pickDemo()`, `reset()`.

## Notes

The home counts are demo data from `rsHomes(start, end)`; replace that with
your own availability result and keep the animation. Every frame is a pure
function of one clock and one selection record, so slow motion is a slower
clock.
