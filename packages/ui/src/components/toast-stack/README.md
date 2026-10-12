# Toast Stack

Plain React Native notifications, no animation or toast dependency. Copy `ToastStack.tsx`, `toastLogic.ts` and `LICENSE` together. See `Example.tsx`. Wrap your app in `ToastProvider` and call `const { toast, dismiss } = useToast()` from any descendant. This is a provider-scoped imperative API, not a process-global singleton.

```tsx
const insets = useSafeAreaInsets(); // optional app adapter
<ToastProvider position="bottom" maxVisible={3} insets={insets}>
  <App />
</ToastProvider>
// Inside App:
const id = toast({ message: 'Saved', variant: 'success', duration: 5000,
  action: { label: 'Undo', onPress: undoSave } });
dismiss(id); // dismiss() clears visible and queued messages
```

- Variants: default, success, error, info. Duration defaults to 5000 ms. Use 0 or Infinity for persistent messages. An existing id replaces that message and resets its timer; a queued update stays in its FIFO slot.
- Queue is FIFO, at most maxVisible cards mounted. A queued message gets its full lifetime after it becomes visible. Cards have fixed 98 px height, one-line titles and two-line descriptions. Keep messages short; long text is truncated. Put critical content in the app, not only in a toast.
- Springs animate stack repositioning; cards enter with a fade. Dismissal removes the card immediately, then remaining cards spring into place. Drag in any direction past 64 px, or flick after moving 12 px. Small drags spring back. Explicit close and action buttons are alternatives to gestures.
- Timer pauses during touch/drag and while the app is inactive. Screen readers get announcements on native and a polite live region on web. Auto-dismiss is disabled while a screen reader is enabled. RN Web always reports true, so it defaults to persistent toasts. The showcase opts out on web with pauseForScreenReader={false} for timer testing; keep the default for accessible apps. System reduced-motion setting is followed unless overridden.
- Provider overlay is inside its host, above its children. Mount it inside your safe-area provider, above your navigation content; pass current useSafeAreaInsets() output. Defaults are zero, not device-derived. Native Modal windows need their own provider. Ensure there is room for maxVisible * 106 px; use fewer visible cards on small screens.
- Optional onFeedback callback can run expo-haptics in your app. Core imports no haptics. Handle adapter errors in the callback.
- No persistent storage, networking or global toast API. Unmounting the provider discards its queue. Action runs once, then dismisses the message (also if the action throws).

Verification: helper tests, TypeScript, Expo dependency check and web rendering. The website preview is a DOM adapter sharing the pure queue/gesture/timer helpers, not this native render.
