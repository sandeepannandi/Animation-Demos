# OTP Verify

A light-mode code entry sheet. Type four digits; the fourth one verifies by
itself. The boxes light up with a warm glow, tilt and slide into a loose pile on
an underdamped spring, the digits fade, the pile collapses into one box, a
ripple leaves it and a check mark draws itself. A wrong code (0000 in the demo)
shakes the boxes and clears them.

## Files

- `OtpVerify.tsx` - the component (Skia glow and check, Reanimated frame loop, hidden TextInput).
- `otpMath.ts` - closed-form damped springs and the whole motion timeline as a pure function of the clock.
- `otpState.ts` - input state machine (digits, landing times, auto-verify, wrong code).
- `otpDesign.ts` - colours and copy, light mode only.
- `Example.tsx` - demo with Type code for me and Slow motion.
- `LICENSE`

## Usage

```tsx
<OtpVerify rejectedCode="0000" onVerified={(code) => console.log(code)} />
```

Props: `slowMotion`, `reducedMotion` (defaults to the system setting),
`rejectedCode`, `onVerified`, `onFeedback("digit" | "verified" | "error")`.
Ref: `typeDemo()`, `reset()`.

## Notes

Every frame is a pure function of one clock, so slow motion is a slower clock.
Light mode only by design. Wire `onVerified` to your own check; the demo only
rejects the one code you give it.
