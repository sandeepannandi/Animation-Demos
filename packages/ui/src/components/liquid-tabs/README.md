# Liquid Tabs

A controlled floating bottom navigation bar with a spring-sliding selection lens.
Copy LiquidTabs.tsx and keep LICENSE. Install SDK-matched modules with:

```sh
npx expo install expo-glass-effect expo-blur
```

Use 3-5 short, uniquely identified tabs. Supply your own icon renderer and change the screen from `onTabChange`. This is a visual navigation control, not a router. `activeId` is controlled by your app; an unknown id leaves every tab unselected. Disabled tabs cannot be pressed. Labels stay visible and tabs report selected/disabled accessibility state.

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

Render the bar after the content it overlays. Reserve its height so it never hides screen content. Keyboard avoidance and navigation/back handling belong to the host app. Use `onFeedback` for optional app-owned haptics.

## What actually renders

- iOS 26+: Expo GlassView, only when both isGlassEffectAPIAvailable() and isLiquidGlassAvailable() pass.
- Earlier iOS or unavailable glass: expo-blur BlurView, not native liquid glass.
- Android and web: an opaque tinted surface. No Android native glass or Android blur is claimed. Current Expo supports Android blur via BlurTargetView; this self-contained component deliberately avoids that extra host integration.
- Reduce Transparency: opaque surface, even on supported iOS. Reduce Motion: selection changes without a spring. Both preferences follow system changes; props can override them. Initial rendering is opaque until preferences resolve.

Do not animate the opacity of the native glass or its parent to zero. Glass and blur are decorative backgrounds; the accessible tab controls remain separate.

## Verification

Designed for Expo SDK 57. Type-checked with SDK-matched modules. Website preview is a separate DOM/CSS adapter, not native glass. Not yet tested on an iOS or Android device. Native glass appearance, accessibility behavior, RTL, safe areas and haptics need real-device checks before shipping.

Sources checked October 12, 2026:
- https://docs.expo.dev/versions/latest/sdk/glass-effect/
- https://docs.expo.dev/versions/latest/sdk/blur-view/
