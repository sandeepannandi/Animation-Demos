# Liquid Tabs

A controlled floating bottom navigation bar with a spring-sliding selection lens.
Tap to switch tabs, or hold the active tab: the selection lens expands with a
bouncy spring and you slide it left or right, then release to settle. The bar itself does not change size.
Copy LiquidTabs.tsx and keep LICENSE. Install SDK-matched modules with:

```sh
npx expo install expo-glass-effect expo-blur
```

Use 3-5 short, uniquely identified tabs. Supply your own icon renderer and change the screen from `onTabChange`. This is a visual navigation control, not a router. `activeId` is controlled by your app; an unknown id leaves every tab unselected. Disabled tabs cannot be pressed and are skipped by the slide. Labels stay visible and tabs report selected/disabled accessibility state.

```tsx
const [activeId, setActiveId] = useState('home');
const insets = useSafeAreaInsets(); // react-native-safe-area-context, in your app
<View style={{ flex: 1 }}>
  <View style={{ flex: 1, paddingBottom: 92 + insets.bottom }}>
    {/* Render the active screen here */}
  </View>
  <LiquidTabs
    tabs={[
      { id: 'home', label: 'Home', icon: selected => <Text>{selected ? '●' : '○'}</Text> },
      { id: 'saved', label: 'Saved', icon: () => <Text>♡</Text> },
      { id: 'profile', label: 'You', icon: () => <Text>☺</Text> },
    ]}
    activeId={activeId} onTabChange={setActiveId} bottomInset={insets.bottom}
  />
</View>
```

Render the bar after the content it overlays. Reserve its height so it never hides screen content. Keyboard avoidance and navigation/back handling belong to the host app. Use `onFeedback` for optional app-owned haptics; it fires when the hold starts and each time the slide lands on a new tab.

## Hold and slide

Hold the active tab for `holdDelay` milliseconds (default 280) and only the selection lens grows, with a bouncy spring (the bar container stays the same size). Keep holding and slide left or right: the lens follows your finger, clamped inside the track, and `onTabChange` fires live as you cross each tab. Release and the lens settles into the tab where it stopped with a small bounce. The gesture is core React Native only (Pressable + PanResponder + Animated), so it adds no dependencies. It never replaces the tap path: taps, keyboard focus and screen-reader activation keep working, the active tab carries an accessibility hint for the gesture, and iOS/Android announce "Slide left or right to choose a tab." when the hold starts. Disabled tabs are skipped while sliding.

## What actually renders

- iOS 26+: Expo GlassView, only when both isGlassEffectAPIAvailable() and isLiquidGlassAvailable() pass.
- Earlier iOS or unavailable glass: expo-blur BlurView, not native liquid glass.
- Android and web: an opaque tinted surface. No Android native glass or Android blur is claimed. Current Expo supports Android blur via BlurTargetView; this self-contained component deliberately avoids that extra host integration.
- Reduce Transparency: opaque surface, even on supported iOS. Reduce Motion: the expand and settle springs (and the bounce) are skipped, but the hold-and-slide gesture still works because it directly follows your finger. Both preferences follow system changes; props can override them. Initial rendering is opaque until preferences resolve.

Do not animate the opacity of the native glass or its parent to zero. Glass and blur are decorative backgrounds; the accessible tab controls remain separate.

## Verification

Designed for Expo SDK 57. Type-checked with SDK-matched modules and rendered through Expo's web export. Website preview is a separate DOM/CSS adapter, not native glass.

Sources checked October 12, 2026:
- https://docs.expo.dev/versions/latest/sdk/glass-effect/
- https://docs.expo.dev/versions/latest/sdk/blur-view/
- https://reactnative.dev/docs/panresponder
- https://reactnative.dev/docs/pressable
