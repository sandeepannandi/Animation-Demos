# Nativelet native showcase (scaffold)

This isolated Expo Router app leaves the root Next.js website in place during transition. It is private and is not an npm release. No component is shipped in this scaffold PR.

Requires Node 22.13 or newer (tested with 22.23.3). From a clean clone:

```sh
cd apps/showcase
npm ci
npm run start
```

Press `a` for Android, `i` for iOS (macOS required), or `w` for web. These commands start development tools; they do not create a release build. No EAS account or paid service is needed for web checks.

```sh
npm run typecheck
npm run lint
npm run check:dependencies
npx expo-doctor
npm run export:web
```

SDK 57 with its Expo-selected React/RN versions is pinned by this app's lockfile. Native device behavior is **unverified**. A React Native Web export does not verify iOS/Android builds, gestures, haptics or screen readers.

The approved target layout is `apps/showcase`, `packages/ui/src/components`, and `packages/registry`. The shared UI and registry will be added with actual component code, not empty placeholders. Root npm-workspace conversion is deferred to migration to avoid changing the legacy site's React 18 dependency resolution or README PR.

The root TypeScript config excludes `apps` and `packages`; this app has a separate TypeScript check. Root package and lockfile are unchanged. The repository's root MIT LICENSE applies to original showcase code. No third-party demo assets are used.

## Known dependency advisories

At scaffold validation, `npm audit --omit=dev` reported 28 affected package entries (18 high, 10 moderate). The underlying advisories include `braces`, `node-forge`, `uuid`, and `decode-uri-component` in Expo/Metro/Router tooling. Registry latest `braces` and `node-forge` were still in the affected range. Doctor checks dependency compatibility, not security. No forced downgrades, major transitive overrides or audit suppressions were applied. Recheck before deploying this prototype or accepting untrusted build inputs.

## Preview Rail development

The separate component PR adds `packages/ui/src/components/preview-rail` and a tiny generated source registry. It is a source folder, not a published package. In this transition, Metro watches `packages` and prefers this app's native dependencies; TypeScript points React typings at this app rather than the React 18 legacy site. `experiments.tsconfigPaths: false` prevents those type-only paths becoming runtime aliases.

From the repository root, regenerate/check the exact displayed files and run helper tests:

```sh
node scripts/generate-registry.mjs
node scripts/generate-registry.mjs --check
node --experimental-strip-types --test packages/ui/src/components/preview-rail/selection.test.mjs
```

The component uses core Animated/PanResponder, so no additional gesture/animation dependency is needed by copied source. The demo supplies optional `expo-haptics`. Copy `PreviewRail.tsx`, `selection.ts`, and `LICENSE` together; usage is `Example.tsx`. Source/clipboard tooling has a `.web.tsx` implementation and a null native fallback.
