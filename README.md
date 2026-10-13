<p align="center">
  <h1 align="center">🎨 Design Experiments</h1>
  <p align="center">
    A curated collection of high-fidelity UI experiments and fluid animations built with <strong>React Native</strong>, <strong>Expo SDK 54</strong>, <strong>Reanimated</strong>, and <strong>Skia</strong>.
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Expo-54-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo SDK 54" />
    <img src="https://img.shields.io/badge/React_Native-0.81-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React Native" />
    <img src="https://img.shields.io/badge/Reanimated-4.1-6C63FF?style=for-the-badge" alt="Reanimated" />
    <img src="https://img.shields.io/badge/Skia-2.2-FF6F61?style=for-the-badge" alt="Skia" />
    <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License" />
  </p>
</p>

---

## ✨ Overview

**Design Experiments** is a playground for exploring modern mobile UI patterns and interaction design. Each screen is a self-contained experiment that pushes the boundaries of what's possible with React Native — from gesture-driven carousels to Skia-powered graphics and spring-physics animations.

> **Built for learning, inspiration, and reuse.** Fork it, remix it, ship it.

---

## 🖼️ Experiments

| #   | Experiment            | Description                                                                                    |
| --- | --------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | **Vertical Carousel** | A smooth, gesture-driven vertical card carousel with parallax effects and spring animations    |
| 2   | **Call Interface**    | A polished phone call UI with animated wave visualizations and interaction states              |
| 3   | **Financial Summary** | A rich financial dashboard card with animated charts and real-time data visualization          |
| 4   | **Hamburger Menu**    | A fluid, animated side-menu with staggered item reveals and backdrop blur                      |
| 5   | **Transactions Page** | A production-grade transaction list UI featuring branded merchant icons and smooth transitions |

---

## 🛠️ Tech Stack

| Layer             | Technology                                                                            |
| ----------------- | ------------------------------------------------------------------------------------- |
| **Framework**     | [Expo SDK 54](https://docs.expo.dev/) + [React Native 0.81](https://reactnative.dev/) |
| **Animations**    | [React Native Reanimated 4](https://docs.swmansion.com/react-native-reanimated/)      |
| **Graphics**      | [Shopify React Native Skia](https://shopify.github.io/react-native-skia/)             |
| **Gradients**     | [Expo Linear Gradient](https://docs.expo.dev/versions/latest/sdk/linear-gradient/)    |
| **SVG**           | [React Native SVG](https://github.com/software-mansion/react-native-svg)              |
| **Language**      | [TypeScript 5.9](https://www.typescriptlang.org/)                                     |
| **Web Companion** | [Next.js](https://nextjs.org/) (in `/web`)                                            |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Expo CLI** — installed globally or via `npx`
- **Android Studio** / **Xcode** (for native builds) or **Expo Go** (for quick testing)

### Installation

```bash
# Clone the repository
git clone https://github.com/sandeepannandi/Design-Experiments-in-React-Native-Expo-SDK54.git
cd Design-Experiments-in-React-Native-Expo-SDK54

# Install dependencies
npm install
```

### Running the App

```bash
# Start the Expo dev server
npm start
```

Then choose your target:

| Key | Platform                                           |
| --- | -------------------------------------------------- |
| `a` | Android emulator                                   |
| `i` | iOS simulator (macOS only)                         |
| `w` | Web browser                                        |
| 📷  | Scan QR code with **Expo Go** on a physical device |

### Running the Web Companion

```bash
cd web
npm install
npm run dev
```

---

## 📁 Project Structure

```
DesignExperiments/
├── App.tsx                  # Entry point — renders the active experiment
├── src/
│   └── screens/
│       ├── VerticalCarouselScreen.tsx
│       ├── CallInterface.tsx
│       ├── CallInterfacePage.tsx
│       ├── FinancialSummary.tsx
│       ├── FinancialSummaryPage.tsx
│       ├── HamburgerMenuPage.tsx
│       └── TransactionsPage.tsx
├── assets/                  # Brand SVGs (Airtel, Amazon, Flipkart, etc.)
├── web/                     # Next.js web companion app
├── app.json                 # Expo configuration
├── babel.config.js
├── metro.config.js
├── tsconfig.json
└── package.json
```

---

## 🔧 Troubleshooting

<details>
<summary><strong>Babel preset missing / runtime not ready</strong></summary>

Ensure `babel-preset-expo` is installed and referenced in `babel.config.js`:

```bash
npm install --save-dev babel-preset-expo
```

</details>

<details>
<summary><strong>Missing assets referenced in app.json</strong></summary>

Either add the referenced files under `assets/`, or remove the `icon` / `splash` entries from `app.json`.

</details>

<details>
<summary><strong>Dependency version mismatches</strong></summary>

Use Expo's built-in version resolver to align all packages:

```bash
npx expo install --fix
```

</details>

---

## 🤝 Contributing

Contributions are welcome! If you have a cool UI experiment, feel free to open a PR.

1. **Fork** the repository
2. **Create** a feature branch — `git checkout -b experiment/my-cool-ui`
3. **Commit** your changes — `git commit -m "feat: add parallax card stack"`
4. **Push** to the branch — `git push origin experiment/my-cool-ui`
5. **Open** a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/sandeepannandi"><strong>Sandeepan Nandi</strong></a>
</p>

### Genie Dismiss

A reversible textured Skia mesh that funnels a prepared card image into a target. Drag-scrub, velocity settle, slow motion and Reduce Motion crossfade. Native snapshot helper is explicit; frozen during the warp. Hardware capture and performance remain unverified.
