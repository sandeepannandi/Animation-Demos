# Bubble Picker

A physics-driven topic/tag picker for React Native + Expo. Glossy Skia bubbles
float in a bounded field; you drag and fling them (they collide, bounce and
settle), and tap to pop-select. Built on a small impulse-based 2D rigid-body
solver that runs on the UI thread in Reanimated worklets.

## Usage

```tsx
import { BubblePicker } from './BubblePicker';

<BubblePicker
  items={[
    { id: 'music', label: 'Music', color: '#e2725b' },
    { id: 'travel', label: 'Travel', color: '#5ca4a9' },
  ]}
  defaultSelectedIds={['music']}
  onSelectionChange={(ids) => console.log(ids)}
  onFeedback={(event, id) => { /* wire expo-haptics here */ }}
/>
```

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `items` | `{ id, label, color? }[]` | required | Keep the array stable; changing it respawns the field. |
| `selectedIds` | `string[]` | - | Controlled selection. |
| `defaultSelectedIds` | `string[]` | `[]` | Uncontrolled selection. |
| `onSelectionChange` | `(ids: string[]) => void` | - | Fires on every toggle. |
| `onFeedback` | `(event, id) => void` | - | `grab` \| `fling` \| `select` \| `deselect`; wire haptics here. |
| `multiSelect` | `boolean` | `true` | Single-select mode replaces the selection. |
| `width` / `height` | `number` | `340` / `380` | Field size in px. |
| `label` | `string` | `Choose topics` | Accessibility label for the field. |
| `reducedMotion` | `boolean` | system | Stops drift, wobble and pop; drag/collisions stay. |
| `slowMotion` | `boolean` | `false` | Steps the sim ~4x slower to watch the physics. |

## Dependencies

`@shopify/react-native-skia`, `react-native-reanimated` (+ `react-native-worklets` on Reanimated 4). No gesture-handler, no native modules: it works in Expo Go. Copy `BubblePicker.tsx` and `physicsMath.ts` together and keep `LICENSE`.

## Notes

- Water-balloon rendering: soft gradient body, rim light and a drop
  shadow per bubble - no moving highlights. Selection is shown as light:
  the bubble lights from within with a colored bloom and one expanding burst
  ring - no border, no permanent size change. Bubbles breathe (a slow,
  per-bubble phased pulsation), stretch along their velocity, and squash
  along the impact axis when they collide.
- The simulation runs every frame (idle drift keeps the field alive). On
  low-power screens prefer `reducedMotion`, which removes drift, wobble,
  breathing and stretch.
- Tap vs drag: drags are captured after a small movement threshold, taps pass
  through to the bubble's press target (also used by screen readers/keyboard).
- The physics module (`physicsMath.ts`) is pure and deterministic; the same
  file powers the web preview on nativelet.dev with an SVG renderer.
- Haptics and screen readers need a physical device for full verification.
