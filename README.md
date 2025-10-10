# Design Experiments (Expo SDK 54)

A minimal Expo + React Native app demonstrating a lot of design experiments with the new SDK54.

## Features
- Vertical carousel with snap-to-item behavior
- Active card centered, scaled to 1.0, higher elevation, full opacity
- Neighboring cards peek and are scaled down with lower opacity
- Smooth `Animated.FlatList` with native driver

## Getting Started
1. Install dependencies:
```bash
npm install
```
2. Start the dev server:
```bash
npm start
```
3. Open the app:
- Press `a` for Android, `i` for iOS (Mac), or scan the QR with Expo Go.

## Project Structure
- `App.tsx`: wires the start screen
- `src/screens/VerticalCarouselScreen.tsx`: vertical carousel implementation
- `index.js`: Expo entry
- `babel.config.js`, `tsconfig.json`, `app.json`: configuration files

## Customize the Carousel
Edit `src/screens/VerticalCarouselScreen.tsx`:
- Active card height (center card size):
```ts
const ACTIVE_CARD_HEIGHT = Math.round(SCREEN_HEIGHT * 0.68);
```
- Neighbor scale/opacity (inactive look):
```ts
const scale = scrollY.interpolate({ inputRange, outputRange: [0.88, 1, 0.88] });
const opacity = scrollY.interpolate({ inputRange, outputRange: [0.55, 1, 0.55] });
```
- Vertical spacing between cards:
```ts
const CARD_SPACING = 16;
```

## Troubleshooting
- Babel preset missing / runtime not ready:
  - Ensure `babel-preset-expo` is installed and present in `babel.config.js`.
- Missing assets in `app.json`:
  - Either add the referenced files under `assets/`, or remove `icon`/`splash` entries.
- Dependency mismatches:
  - Use `npx expo install` to align versions with Expo SDK 54.

## License
MIT
