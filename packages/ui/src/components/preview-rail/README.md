# Preview Rail

A React Native press-and-drag preview selector. Core React Native only: no DOM, router, private aliases, Reanimated, Gesture Handler or font dependencies. Springs use core Animated's native driver for transforms; selection handling uses PanResponder on the JS thread. No frame-rate guarantee.

Copy **PreviewRail.tsx and selection.ts together** into one folder, and retain the accompanying LICENSE. Example.tsx is a minimal controlled example. Use `renderPreview` to supply any card, and `onActiveChange` to update your app; there are no URLs or built-in navigation.

## Props

- `items`: unique, stable non-empty `id`, `label`, optional string `description`. Keep the array stable during a drag.
- `activeId` / `onActiveChange`: controlled selection; otherwise use `defaultActiveId`.
- `renderPreview(item)`: optional preview node.
- `orientation`: vertical (default) or horizontal. Horizontal items each need 44px; choose vertical for long lists or narrow layouts. This is a short rail, not a virtualized list.
- `onSelectionFeedback`: optional haptic adapter, called when user selection/drag preview changes. Catch errors in your adapter. The core does not depend on Expo.
- `reducedMotion`: override the system reduce-motion setting. System detection defaults to reduced motion while loading.
- `accessibilityLabel`, `style`: container customization. Item labels, selected state, and previous/next buttons provide non-drag alternatives.

A drag previews items and commits on release; termination cancels it. Controlled values remain owned by the caller. Removed/unknown active IDs fall back to the first item. Empty arrays show an empty state. Selection callbacks only fire for a changed committed ID, not every pointer movement. Feedback fires at item boundaries, not every frame.

## Optional Expo haptics

```sh
npx expo install expo-haptics
```

```tsx
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
// Pass this as onSelectionFeedback. No promises about a user's device settings.
const feedback = () => {
  if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {});
};
```

Haptics may be unavailable or suppressed by the OS. The web demo deliberately does not claim to emulate native haptics.

## Verification scope

TypeScript, selection-helper tests and React Native Web production export/render are checkable here. Expo's existing dependency-audit caveat is in apps/showcase/README.md.
