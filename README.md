# Animation Demos

A minimal React Native app demonstrating a lot of design and animations with the new SDK54, reanimated, gesture handling and skia.


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


## Troubleshooting
- Babel preset missing / runtime not ready:
  - Ensure `babel-preset-expo` is installed and present in `babel.config.js`.
- Missing assets in `app.json`:
  - Either add the referenced files under `assets/`, or remove `icon`/`splash` entries.
- Dependency mismatches:
  - Use `npx expo install` to align versions with Expo SDK 54.

## License
MIT
