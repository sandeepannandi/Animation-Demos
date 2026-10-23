# Seat Selection

A reusable React Native Skia seat-picking flow: venue overview, tap a section to fly the camera in, pick seats on a zoomable seat map, then review and hold the selection in a bottom sheet. Pinch zooms around the gesture midpoint, one finger pans with inertia, and a mini-map tracks the viewport. Selection pops with a spring, totals roll odometer-style, and back navigation reverses every transition. System reduced motion removes coasting, pop springs and sheet slide.

Copy `SeatSelection.tsx`, `seatMath.ts`, `seatGesture.ts`, `RollingNumber.tsx` and `LICENSE`. Requires React, React Native and `@shopify/react-native-skia`.

```tsx
const flow = useRef<SeatSelectionHandle>(null);
<SeatSelection
  ref={flow}
  venue={myVenue}           // sections, rows, seat positions, sold flags, price tiers
  maxSeats={6}
  currency="₹"
  onSelectionChange={(seats, total) => setCart(seats)}
  onConfirm={(seats, total) => holdOnMyBackend(seats)}
  fontFamily="Geist"
/>
```

`venue` is fully controlled: supply your own sections, seat coordinates, sold flags and price tiers. Selection changes come through `onSelectionChange`; the review sheet's Hold button only fires `onConfirm` — it performs no payment, reservation or network call. The Example renders a generated 618-seat auditorium from `venueFixture.ts`, not a real venue or live availability.

Seat picking is canvas-based, like a real seat map; individual seats are not separate screen-reader focuses. Camera gestures, haptics, physical-device frame rate and iOS behaviour require native verification. Web uses the same geometry and interaction model with a Canvas2D adapter, not the native render.
