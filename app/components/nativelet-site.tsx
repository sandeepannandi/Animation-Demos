"use client";

import { useState, useRef, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  MotionConfig,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowUpRight,
  Github,
  Play,
  Pause,
  Check,
  Copy,
  Code2,
  Layers,
  Star,
} from "lucide-react";
import { HeroShowcase } from "./hero-showcase";
import { WhatYouGet } from "./what-you-get";
import { Faq } from "./faq";
import { Sponsor, SPONSOR_URL } from "./sponsor";
import { PreviewRail } from "./preview-rail";
import { MorphCapsule, CAPSULE_STATES, type CapsuleState } from "./morph-capsule";
import { LiquidTabsPreview } from "./liquid-tabs";
import { ToastStackPreview } from "./toast-stack";
import { SwipeRowPreview } from "./swipe-row";
import { StackedCarouselPreview } from "./stacked-carousel";
import { GooeyMenuPreview } from "./gooey-menu";
import { RippleRevealPreview } from "./ripple-reveal";
import { ScrubChartPreview } from "./scrub-chart";
import { GlassLensPreview } from "./glass-lens";
import { DragToSortPreview } from "./drag-to-sort";
import { ExpandingCardPreview } from "./expanding-card";
import { PageCurlPreview } from "./page-curl";
import { OrbitQRPreview } from "./orbit-qr";
import { BlossomQRPreview } from "./blossom-qr";
import { LightPaintingPreview } from "./light-painting";
import { GenieDismissPreview } from "./genie-dismiss";
import { FoldedPassPreview } from "./folded-pass";
import { GLTransitionsPreview } from "./gl-transitions";
import { BubblePickerPreview } from "./bubble-picker";
import { MosaicGalleryPreview } from "./mosaic-gallery";
import { ClothBannerPreview } from "./cloth-banner";
import { FoggedGlassPreview } from "./fogged-glass";
import { CoinPreview } from "./coin";
import { CodeRevealPreview } from "./code-reveal";
import { BlackHoleLensPreview } from "./black-hole-lens";
import { ChaosPendulumPreview } from "./chaos-pendulum";
import { SplitFlapBoardPreview } from "./split-flap-board";
import { TextMorphPreview } from "./text-morph";
import { PinchGalleryPreview } from "./pinch-gallery";
import { SourceDropdown } from "./source-dropdown";
import styles from "../page.module.css";
import gallery from "./component-gallery.module.css";

type ComponentId = "reveal" | "coin" | "blackhole" | "pendulum" | "fog" | "banner" | "flap" | "mosaic" | "bubbles" | "transitions" | "fold" | "genie" | "rail" | "capsule" | "toast" | "glass" | "swipe" | "expand" | "sort" | "carousel" | "gooey" | "ripple" | "lens" | "chart" | "pinch" | "curl" | "orbit" | "blossom" | "light" | "morph";
const META = {
  reveal: { title: "Code Reveal", number: "30", folder: "code-reveal", note: "Original React Native Skia component. Copy CodeReveal.tsx, revealMath.ts, revealShader.ts and revealDesign.ts together and keep LICENSE. Drag across a picture and a soft-edged patch of text glyphs appears under your finger; brighter parts of the picture become denser characters, and the patch fades back after you let go. One runtime shader draws the whole thing. The picture is an original procedural dusk landscape, so there is no image to load. The screen is a grid of 9 px cells; for each cell the shader averages four samples of the picture, turns them into luminance and picks one of ten glyph levels from blank through . : - = + x * # to @. The brush is a ring of 40 stamps with a position, radius and strength: moving the finger adds stamps along the stroke, a faster finger gives a larger radius (26 to 64 px), each stamp has a solid core with a soft falloff, and the patch under a held finger stays on. Decay is exponential with a 0.7 s time constant and uses the frame time, capped at 48 ms per frame, so it is independent of frame rate down to about 20 fps and slows below that; the unit tests check the decay rate, step-size independence, radius bounds and the stamp ring. Color glyphs mode tints each glyph with the picture color. Honest limits: the glyphs are drawn analytically in the shader (bars, dots and rings), not from a font or a texture atlas, so they resemble those characters rather than being a typeface; the picture is procedural, not a photo; and the unit tests cover the brush math, not the shader pixels.", footer: "Preview: React \u00b7 WebGL adapter. Source: React Native \u00b7 Skia \u00b7 Reanimated" },
  coin: { title: "Coin", number: "29", folder: "coin", note: "Original React Native Skia component. Copy Coin.tsx, coinMath.ts, coinShader.ts and coinDesign.ts together and keep LICENSE. A metal coin floating in space. Grab it anywhere and flick it: it tumbles with real rigid-body dynamics, precessing and wobbling because a disc spins more easily about its axis than about a diameter. The motion integrates Euler's equations for a solid disc (axial inertia mR^2/2, transverse inertia mR^2/4 + m*h^2/12) with fourth-order Runge-Kutta and a quaternion for orientation. With damping off the unit tests measure energy and world-frame angular momentum drift of about 3e-11 over 120 simulated seconds, check the precession rate against the analytic (I3 - I1) w3 / I1 and the space-frame rate |L| / I1, and check the fourth-order step scaling. The finger grabs one point on the face and pulls it with a spring and damper, which is a model of a grip, not exact friction. The look is a ray-marched shader: a rounded-cylinder signed distance field with a raised rim, a recessed field, a six-petal emblem and a reeded edge, lit by a studio environment through Fresnel reflection. Approximations, honestly: the environment is procedural, not an image-based light; there are no inter-reflections or real shadows; the camera is a simple perspective and finger positions are mapped with an orthographic approximation; and a small default damping of 0.2 per second makes the spin calm down slowly.", footer: "Preview: React \u00b7 WebGL adapter. Source: React Native \u00b7 Skia \u00b7 Reanimated" },
  blackhole: { title: "Black Hole Lens", number: "28", folder: "black-hole-lens", note: "Original React Native Skia component. Copy BlackHoleLens.tsx, holeMath.ts and holeDesign.ts together and keep LICENSE. Drag a black hole across a starfield and the background bends around it: an Einstein ring forms where the hole crosses a star, and a glowing accretion disk spins with the left side Doppler-brightened. The background bends with the exact point-lens map, the analytic inverse of the two-image lens equation, so a source directly behind the hole appears as a ring at exactly the Einstein radius. The shadow sits at the exact Schwarzschild critical impact parameter (3*sqrt(3)/2)*rs, the disk starts at the ISCO (3*rs), its temperature follows the Page-Thorne profile, and its brightness uses the relativistic Doppler factor with gravitational redshift at the Keplerian orbital speed (c*sqrt(1/6) at the ISCO), winding differentially with the Keplerian r^-3/2 profile. The unit tests check all of these against analytic values. Approximations, honestly: the deflection law is the weak-field form 2rs/b applied across the whole screen, lensed surface brightness is not boosted, and the disk halo bent over the shadow is a mirrored copy of the disk, not a geodesic trace. A planet toggle drops a gas giant into the source plane: its image smears into arcs as the hole nears, the planet falls in under a Paczynski-Wiita pseudo-Newtonian potential (whose ISCO sits at exactly 3rs), the real tidal tensor stretches it along the hole direction and squeezes it across into a visible strand, and at the fluid-body Roche limit 2.44 R (M/m)^(1/3) it sheds a tidal tail whose grains free-fly on their own orbits with conserved angular momentum and energy, the inner edge pulling ahead as they wrap the hole; grains crossing the shadow brighten the disk. Grazing passes strip mass for good, deep dives fully disrupt, and backing off early lets it relax. Approximations: PW potential instead of geodesics, test-particle planet, fixed shedding budget, no grain collisions. Slow motion runs the spin clock about four times slower; Reduce Motion freezes the disk. Physical-device frame rate unverified. Web preview shares the physics module and draws with Canvas2D, not Skia.", footer: "Preview: React \u00b7 Canvas2D adapter. Source: React Native \u00b7 Skia \u00b7 Reanimated" },
  pendulum: { title: "Chaos Pendulum", number: "27", folder: "chaos-pendulum", note: "Original React Native Skia component. Copy ChaosPendulum.tsx and pendulumMath.ts together and keep LICENSE. A double pendulum swinging under gravity. Grab it anywhere and the tip follows your finger; let go and it keeps your fling and swings chaotically, drawing two long glowing trails that fade over about four seconds. The motion is the exact Lagrangian double-pendulum equations of motion, integrated with fourth-order Runge-Kutta at a fixed 1/960 s timestep on the UI thread, with no drag by default. The unit tests measure total energy drift of about 1.3e-8 of the energy scale over 120 simulated seconds (asserted below 1e-7), and the small-oscillation period matches the analytic normal mode. While you hold it the tip is driven kinematically with two-link inverse kinematics; physics resumes on release. Trails are polylines in fading buckets drawn with Skia, no per-vertex colors. Slow motion steps the clock about four times slower; Reduce Motion hangs the pendulum still. Physical-device frame rate unverified. Web preview shares the physics module and draws with Canvas2D, not Skia.", footer: "Preview: React \u00b7 Canvas2D adapter. Source: React Native \u00b7 Skia \u00b7 Reanimated" },
  fog: { title: "Fogged Glass", number: "26", folder: "fogged-glass", note: "Original React Native Skia component. Copy FoggedGlass.tsx and fogMath.ts together and keep LICENSE. A window that mists over a dusk scene. Wipe the glass with your finger and the streaks clear; water beads gather at the rim of the wipe, run down with stick-slip, swallow smaller beads and leave clear trails, and the fog creeps back grain by grain. One runtime shader composites the sharp scene, a blurred read of it, and a per-frame fog texture (fog level plus droplet domes) packed by the condensation simulation; beads refract the scene with a specular highlight. The sim runs on a fixed timestep with a seeded generator, so web, native and tests agree. Pass any prepared SkImage pair; the Example draws an original Nilgiris dusk with Skia (Geist, SIL OFL) and builds the blurred read by downscaling, no image filters. Slow motion runs the condensation clock about four times slower; Reduce Motion freezes the pane. Physical-device frame rate unverified. Web preview shares the physics module and draws with Canvas2D, not Skia.", footer: "Preview: React \u00b7 Canvas2D adapter. Source: React Native \u00b7 Skia" },
  banner: { title: "Cloth Banner", number: "25", folder: "cloth-banner", note: "Original React Native Skia component. Copy ClothBanner.tsx and clothMath.ts together and keep LICENSE. A banner pinned at its two top corners, swaying in a light breeze. Grab any point of the fabric and it ripples and folds around your finger, lit fold shading from real cloth normals, and on release it keeps your fling and settles under gravity and wind. The cloth is a 3D Verlet grid with structural and shear constraints, stepped on the UI thread at a fixed 120 Hz timestep, so motion is identical on web and native. Artwork is one image texture on a triangle mesh with weak-perspective projection; the back of the cloth reads darker. Pass any prepared SkImage; the Example draws an original flower-show banner with Skia (Geist, SIL OFL). Slow motion steps the cloth about four times slower; Reduce Motion hangs it flat and still. Shading arrives through a one-pixel alpha ramp texture, not per-vertex colors. Physical-device frame rate unverified. Web preview shares the physics module and draws with Canvas2D, not Skia.", footer: "Preview: React \u00b7 Canvas2D adapter. Source: React Native \u00b7 Skia \u00b7 Reanimated" },
  flap: { title: "Split-Flap Board", number: "24", folder: "split-flap-board", note: "Original React Native Skia component. Copy SplitFlapBoard.tsx, splitFlapMath.ts and flapWords.ts together and keep LICENSE. A departure-board row of letter flaps: tap and every cell cycles forward through the charset to the next word, columns cascading left to right, long runs flipping faster into the classic rapid clatter, with a small impact bounce on each landing. Pure Skia geometry - rounded flap halves, a scaleY hinge fake and shading overlays; no shaders, no mesh, no fonts. The glyphs are an original stroke set drawn as Skia paths, so there is nothing to load on any platform. Slow motion runs the clock about four times slower; Reduce Motion swaps instantly. The words array must stay stable. Physical-device frame rate unverified. Web preview shares the math module and draws with Canvas2D, not Skia. Inspired by the feel of Reactiive's split-flap video; no code or assets are copied.", footer: "Preview: React \u00b7 Canvas2D adapter. Source: React Native \u00b7 Skia \u00b7 Reanimated" },
  mosaic: { title: "Mosaic Gallery", number: "23", folder: "mosaic-gallery", note: "Original React Native Skia component. Copy MosaicGallery.tsx, mosaicMath.ts and mosaic-data.ts together and keep LICENSE. Five public-domain paintings - Van Gogh, Hokusai, Vermeer, Klimt, Monet - rendered as a living mosaic of 2,816 beveled color tiles. Tap the field and the tiles fly to shuffled slots in a wave that ripples out from your tap point, growing and scattering mid-flight, then land exactly as the next painting. Pinch to zoom, drag to pan, double-tap for 2x. Each painting is a base64 color grid averaged from the source at build time, so there is no image download, no WebGPU and no native module - one Skia Vertices draw per frame, all transition math in a shared worklet module. Slow motion runs the ripple about four times slower; Reduce Motion swaps the flight for a quick in-place crossfade. The paintings array must stay stable (changing it rebuilds the field). Physical-device frame rate unverified. Web preview shares the math module and draws with Canvas2D, not Skia. Inspired by the feel of Reactiive's Art Gallery; no code, shaders or assets are copied.", footer: "Preview: React \u00b7 Canvas2D adapter. Source: React Native \u00b7 Skia \u00b7 Reanimated" },
  bubbles: { title: "Bubble Picker", number: "22", folder: "bubble-picker", note: "Original React Native Skia component. Copy BubblePicker.tsx and physicsMath.ts together and keep LICENSE. A physics-driven picker: glossy bubbles drift in a bounded field, you drag and fling them, and tap to pop-select. A small impulse solver runs the collisions on the UI thread - circle-circle with restitution, wall bounces, a spring grab joint that hands your fling its velocity, impact wobble and a selection pop spring. Slow motion steps the simulation about four times slower so you can watch the collisions; Reduce Motion removes drift, wobble and pop. The field simulates every frame while mounted, and the items array must stay stable (changing it respawns the field). Physical-device frame rate unverified. Web preview shares the physics module and draws with SVG, not Skia.", footer: "Preview: React · SVG adapter. Source: React Native · Skia · Reanimated" },
  transitions: { title: "GL Transitions", number: "21", folder: "gl-transitions", note: "Original React Native Skia component. Copy GLTransitionPager.tsx, transitionMath.ts and transitionShaders.ts together and keep LICENSE. A photo pager where the drag itself scrubs the transition between pages: the scroll position between two pages is the effect's progress, followed one to one, and a flick completes or reverses the hop. Six original runtime shaders cycle per hop - Ripple grows a wavefront from where you touched, Slices slides seven bands in behind the drag, Zoom trades the pages through a zoom with a radial channel split, Melt lets columns of the old page go in a fixed shuffled order, Vortex twists the outgoing page down a whirlpool while the incoming one untwists, and Wave rips the page along a traveling wavy front. Each is exact at both ends, so a resting page is pixel-clean. Rubber-band ends, mid-flight catch, tap the left or right third to walk a page. Slow motion and Reduce Motion (instant snap) are built in. Pages are prepared SkImage textures, so live text and controls sit outside the pager. Only the active hop draws. Physical-device frame rate unverified. Web preview shares the maths and draws the same shaders in WebGL GLSL, not Skia. No third-party shader collection or artwork is used.", footer: "Preview: React · WebGL adapter. Source: React Native · Skia · Reanimated" },
  fold: { title: "Folded Pass", number: "20", folder: "folded-pass", note: "Original React Native Skia component. Copy FoldedPass.tsx, foldMath.ts and passDesign.ts (Example only) together and keep LICENSE. A three-panel paper pass joined by two creases. Drag it down and the panels unfold through a perspective camera: each one is a textured mesh, the free middle panel bows, the paper back shows when a panel turns over, and crease shading follows the fold angle. Release hands the finger's speed to a spring; touch it mid-flight to catch it and reverse. Frozen paper while it moves, real RN content at rest. Slow motion and Reduce Motion (no fold, instant swap) are built in. Perspective comes from a dense mesh with affine triangles, not per-pixel projection. Not device-tested beyond the Android emulator. Web preview shares the geometry and shading and draws with WebGL, not Skia.", footer: "Preview: React · WebGL adapter. Source: React Native · Skia · Reanimated" },
  genie: { title: "Genie Dismiss", number: "19", folder: "genie-dismiss", note: "Original React Native Skia textured triangle mesh. Copy GenieDismiss.tsx and genieMath.ts together and keep LICENSE. A frozen card narrows from the bottom, bends toward a target, and tucks into it. Drag down/up to scrub, release to settle, or tap to reverse. Includes slow motion and system Reduce Motion crossfade. Pass a prepared SkImage; native snapshot helper must be called explicitly after layout. Frozen content during the warp, not live controls. Native capture and physical-device performance remain unverified. Website uses a WebGL texture adapter sharing the maths, not Skia.", footer: "Preview: React · WebGL adapter. Source: React Native · Skia · Reanimated" },
  orbit: { title: "Orbit QR", number: "15", folder: "orbit-qr", note: "Original React Native Skia component. Copy OrbitQR.tsx and orbitMath.ts together and keep LICENSE. Pass any QR matrix; the Example uses the MIT-licensed qrcode-generator. Tiles on a sphere rotate under your finger, then a top-down wave lands each one on its module while rotation and perspective unwind to zero. The final frame is a flat code with a quiet zone; tests decode it with jsQR at several sizes. Toggle again to reverse from wherever it is. Not device-tested. Web preview shares the maths and draws with Canvas 2D, not Skia.", footer: "Preview: React · Canvas 2D adapter. Source: React Native · Skia · Reanimated" },
  morph: { title: "Text Morph", number: "18", folder: "text-morph", note: "Original React Native Skia component. Copy TextMorph.tsx and textMorphMath.ts together and keep LICENSE. Give it a paragraph, RGBA pixels and a loaded Skia font. Every non-space character is laid out on a page, then flies on its own curved, staggered path to one point of the picture, sampled by brightness and spread apart so letters do not pile up. Tap toggles, drag scrubs, release settles, and both end frames are exact. A slow-motion switch stretches the flight four times so you can watch each letter travel. Latin text only: one advance per character, no kerning or shaping. The Example and website offer three original procedural pictures (lighthouse, rocket, mountains) and bundle Geist (SIL OFL). Drawn with one drawText per glyph per frame, not profiled, and not tested on a device. Web preview shares the maths and draws with Canvas 2D, not Skia.", footer: "Preview: React · Canvas 2D adapter. Source: React Native · Skia · Reanimated" },
  light: { title: "Light on Painting", number: "17", folder: "light-painting", note: "Original React Native Skia component. Copy LightPainting.tsx, lightMath.ts and paintings.ts together and keep LICENSE. A bulb hangs from a cord in front of a painting in a dark room; drag the bulb and the scene relights from its position, with raised brushwork throwing shadows through a depth map. Swing is a fixed-timestep Verlet rope, so motion is identical on web and native. Swipe across the painting for the next one. Both paintings are original procedural scenes with authored depth - no third-party artwork. Not device-tested, and no frame-rate claim. Web preview shares the maths and shades per pixel with WebGL (Canvas 2D fallback), not Skia.", footer: "Preview: React · WebGL adapter (Canvas 2D fallback). Source: React Native · Skia · Reanimated" },
  blossom: { title: "Blossom QR", number: "16", folder: "blossom-qr", note: "Original React Native Skia component. Copy BlossomQR.tsx and blossomMath.ts together and keep LICENSE. Pass any QR matrix; the Example uses the MIT-licensed qrcode-generator. Every module is a column in an isometric scene: a blossom canopy on a trunk, with the code's dark modules as grass around it. The camera tilts to top-down while the columns sink, and the last frame is a flat code with a quiet zone that tests decode with jsQR. Drag turns the tree. Toggle again to reverse from wherever it is. Drawn per frame as one Skia vertex mesh. Not device-tested, and no frame-rate claim. Web preview shares the maths and draws triangles with Canvas 2D, not Skia.", footer: "Preview: React · Canvas 2D adapter. Source: React Native · Skia · Reanimated" },
  curl: { title: "Page Curl", number: "14", folder: "page-curl", note: "Original React Native Skia pager. Copy PageCurl.tsx and curlMath.ts together and keep LICENSE. Prepared page textures wrap around a cylinder with a visible back and moving shadow. Drag either edge, then release to advance or return. Snapshot helper captures RN Views before gestures; frozen content, not live controls. Not device-tested. Web preview shares the shader maths, not the native render.", footer: "Preview: React · WebGL adapter. Source: React Native · Skia · Reanimated" },
  chart: { title: "Scrub Chart", number: "12", folder: "scrub-chart", note: "Original React Native source. Copy ScrubChart.tsx and chartMath.ts together and keep LICENSE. Real Skia paths, gradient fill and draw-in, driven by Reanimated. Drag to explore readings, or use arrow keys and screen reader actions. Reduce Motion removes draw-in and spring. Sample data, equal-spaced categories, fitted vertical domain (not zero baseline). The web preview is a separate SVG adapter, not Skia.", footer: "Preview: React · SVG adapter. Source: React Native · Skia · Reanimated" },
  pinch: { title: "Pinch Gallery", number: "13", folder: "pinch-gallery", note: "Original React Native source. Copy PinchGallery.tsx and pinchLogic.ts together and keep LICENSE. Core RN only. Pinch with two fingers to change between 2, 3 and 5 columns while the photo under your fingers stays put. Hold a tile, then drag across others to select a range, with auto-scroll near the edges and spring-in checkmarks. Fixed-height, non-virtualized grid. The web preview shares the layout, anchoring and selection rules and adds trackpad pinch, not the native render.", footer: "Preview: React · DOM adapter. Source: React Native" },
  gooey: { title: "Gooey Menu", number: "09", folder: "gooey-menu", note: "Real React Native source. Copy GooeyMenu.tsx and gooeyMath.ts together and keep LICENSE. Needs @shopify/react-native-skia, react-native-reanimated and react-native-worklets. Tap the plus and the actions pull out of it like drops of liquid, then merge back in. Slow motion plays the spring about four times slower so you can watch the goo form. Reduce Motion swaps the spring for a short timing. The web preview shares the geometry and uses an SVG blur and colour matrix instead of Skia, so it is not the native render.", footer: "Preview: React · Framer Motion · SVG filter. Source: React Native · Skia" },
  carousel: { title: "Stacked Carousel", number: "08", folder: "stacked-carousel", note: "Real React Native source. Copy StackedCarousel.tsx and carouselLogic.ts together and keep LICENSE. Core RN only. Drag with velocity snap, tap a side card, or use next/previous actions and keyboard arrows. Finite, short collections, no autoplay. The web preview shares the math, not the native render.", footer: "Preview: React · Framer Motion. Source: React Native" },
  lens: { title: "Glass Lens", number: "11", folder: "glass-lens", note: "Real React Native source. Copy GlassLens.tsx and lensMath.ts together and keep LICENSE. Needs @shopify/react-native-skia, react-native-reanimated and react-native-worklets. Drag the lens and it trails your finger on a spring, stretches the way it moves and bends the scene under it, with a colour fringe and a lit rim, all in one Skia runtime shader. Arrow keys and screen reader actions nudge it. Reduce Motion removes the lag, stretch and fringe. The web preview runs the same maths on a 2D canvas instead of Skia, so it is not the native render.", footer: "Preview: React · Canvas 2D. Source: React Native · Skia" },
  ripple: { title: "Theme Reveal", number: "10", folder: "ripple-reveal", note: "A theme-switch transition. Real React Native source (exported as RippleReveal). Copy RippleReveal.tsx and rippleMath.ts together and keep LICENSE. Needs @shopify/react-native-skia, react-native-reanimated and react-native-worklets. Tap the card and a second theme spreads out from your finger as a Skia runtime shader, with a wave that rides the front and fades out. Reduce Motion swaps the wave for a short cross-fade. The web preview runs the same maths on a 2D canvas instead of Skia, so it is not the native render.", footer: "Preview: React · Canvas 2D. Source: React Native · Skia" },
  sort: { title: "Drag to Sort", number: "07", folder: "drag-to-sort", note: "Real React Native source. Copy DragToSort.tsx and sortLogic.ts together and keep LICENSE. Core RN only. Grab a handle to lift a row, move past a neighbor to open a gap, hold near an edge to scroll, then release to settle. Cancel restores the starting order. Screen reader Move up/down actions and web keyboard arrows are included. Fixed-height, non-virtualized list. The web preview shares reorder and edge-scroll rules, not the native render.", footer: "Preview: React · Framer Motion. Source: React Native" },
  expand: { title: "Expanding Card", number: "06", folder: "expanding-card", note: "Real React Native source. Copy ExpandingCard.tsx and expandingLogic.ts together and keep the LICENSE. No animation or navigation dependency, only measureInWindow and Animated. Tap a card to grow it into a detail view, then drag down to shrink it back. Pass safe-area insets from your app. The web adapter shares the geometry and gesture rules, not the native render. See README for accessibility and limits.", footer: "Preview: React · Framer Motion. Source: React Native" },
  swipe: { title: "Swipe Row", number: "05", folder: "swipe-row", note: "Real React Native source. Copy SwipeRow.tsx and swipeLogic.ts together and keep the LICENSE. No gesture or animation dependency. Swipe right to pin, left to archive or delete, past the line to commit, then undo. The web adapter shares the gesture rules, not the native render. See README for accessibility and limits.", footer: "Preview: React · Framer Motion. Source: React Native" },
  glass: { title: "Liquid Tabs", number: "04", folder: "liquid-tabs", note: "Real React Native source. Install expo-glass-effect and expo-blur with expo install. Keep LICENSE. iOS native glass needs availability checks; Android uses an opaque fallback. Hold the active tab, then slide to switch. See README for integration and limits.", footer: "Preview: CSS glass study. Source: React Native · Expo" },
  toast: { title: "Toast Stack", number: "03", folder: "toast-stack", note: "React Native source for Expo. Copy ToastStack.tsx and toastLogic.ts together and keep the LICENSE. The web adapter shares the queue, timer and gesture helpers, not the native render. Pass safe-area insets from your app.", footer: "Preview: React · Framer Motion. Source: React Native" },
  rail: {
    title: "Preview Rail",
    number: "01",
    folder: "preview-rail",
    note: "React Native source for Expo. Copy PreviewRail.tsx and selection.ts together and keep the LICENSE. The preview shows a web version, not this code. Scroll to read more; focus the code to scroll with arrow keys.",
    footer: "Preview: React · Framer Motion · Tailwind CSS. Source: React Native",
  },
  capsule: {
    title: "Morph Capsule",
    number: "02",
    folder: "morph-capsule",
    note: "React Native source for Expo. Copy MorphCapsule.tsx and morphMath.ts together and keep the LICENSE. The preview shows a web version that shares morphMath.ts, not the native component. Scroll to read more; focus the code to scroll with arrow keys.",
    footer: "Preview: React · Framer Motion. Source: React Native",
  },
} as const;
const capsuleDescriptions: Record<CapsuleState, string> = {
  idle: "No session running.",
  compact: "24 minutes left.",
  expanded: "24 minutes and 10 seconds left.",
};
const capsuleContent: Record<CapsuleState, React.ReactNode> = {
  idle: <span style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600 }}>Ready</span>,
  compact: <span style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "space-between", padding: "0 20px", fontSize: 13, fontWeight: 600 }}><span>Focus session</span><span>24:10</span></span>,
  expanded: <span style={{ display: "flex", height: "100%", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}><span style={{ fontSize: 10, letterSpacing: 1.5, fontWeight: 700, color: "#9fc7b0" }}>FOCUS SESSION</span><span style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1.5, lineHeight: 1 }}>24:10</span><span style={{ fontSize: 12, color: "#9fc7b0" }}>Tap or drag to collapse</span></span>,
};
const REPO = "https://github.com/sandeepannandi/Nativelet";

/* Live star count from the public GitHub API, fetched fresh on every page load
   (no cache). Returns null until a real number arrives, and stays null if the
   request fails or is rate limited, so no number is ever invented. */
function useGithubStars() {
  const [stars, setStars] = useState<number | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("https://api.github.com/repos/sandeepannandi/Nativelet", {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const count = data?.stargazers_count;
        if (Number.isInteger(count) && count >= 0) setStars(count);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return stars;
}

function StarCount({ count }: { count: number }) {
  return (
    <span className={styles.stars} aria-hidden="true">
      <Star size={13} />
      {new Intl.NumberFormat("en", { notation: "compact" }).format(count)}
    </span>
  );
}

const footerItem = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};
const footerLetter = {
  hidden: { y: "105%" },
  shown: { y: "0%", transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};
const studies = ["Focus", "Listen", "Move"] as const;
const sections = [
  {
    id: "focus",
    label: "Focus",
    description: "A quiet place to start.",
    href: "#rail-detail",
  },
  {
    id: "listen",
    label: "Listen",
    description: "A little rhythm in your day.",
    href: "#rail-detail",
  },
  {
    id: "move",
    label: "Move",
    description: "Room for a fresh perspective.",
    href: "#rail-detail",
  },
];

const COMPONENT_NAMES: [string, string][] = [
  ["Code Reveal", "Drag across a picture · it turns into glyphs under your finger"],
  ["Coin", "Flick a floating metal coin · it tumbles with exact rigid-body physics"],
  ["Black Hole Lens", "Drag a black hole across a starfield \u00b7 real gravitational lensing"],
  ["Chaos Pendulum", "Grab and fling a double pendulum · glowing trails, exact physics"],
  ["Fogged Glass", "Wipe the misted window · beads run, fog creeps back"],
  ["Cloth Banner", "A banner in the breeze · drag the fabric and let go"],
  ["Split-Flap Board", "Letter flaps clatter to the next word · tap to flip"],
  ["Mosaic Gallery", "Paintings as 2,816 flying tiles · tap to ripple to the next"],
  ["Bubble Picker", "Fling, bounce and pop-select topics · a real physics solver"],
  ["GL Transitions", "Drag scrubs a shader transition · flick to fly"],
  ["Folded Pass", "A paper pass that unfolds under your finger · drag to fold"],
  ["Genie Dismiss", "A textured card funnels into a target · drag to reverse"],
  ["Preview Rail", "Vertical and horizontal navigation · switch inside"],
  ["Morph Capsule", "Idle, compact and expanded · tap or drag inside"],
  ["Toast Stack", "Queue, swipe, pause and undo · feedback that feels right"],
  ["Liquid Tabs", "A floating tab bar · native iOS glass with fallbacks"],
  ["Swipe Row", "Swipe to reveal actions · full-swipe commit with undo"],
  ["Expanding Card", "Tap to expand into a detail view · drag down to dismiss"],
  ["Drag to Sort", "Lift, make a gap, scroll the edge · drop to settle"],
  ["Stacked Carousel", "Depth, tilt and a spring settle · swipe or focus a card"],
  ["Gooey Menu", "Actions pull out like liquid · tap the plus"],
  ["Theme Reveal", "A theme switch that spreads from your tap"],
  ["Glass Lens", "A lens that trails your finger"],
  ["Scrub Chart", "A smooth trend, a reading under your finger"],
  ["Pinch Gallery", "Pinch to change density · hold and drag to select"],
  ["Page Curl", "A curved fold, a paper back, a turn that follows your finger"],
  ["Orbit QR", "A sphere of tiles that lands as a scannable code"],
  ["Blossom QR", "A voxel blossom tree that flattens into a scannable code"],
  ["Light on Painting", "A bulb on a cord relights the scene as you drag it"],
  ["Text Morph", "A paragraph whose letters fly into a picture and back"],
];

export default function NativeletSite({
  sources,
}: {
  sources: Record<ComponentId, { name: string; code: string }[]>;
}) {
  const reduce = useReducedMotion();
  const stars = useGithubStars();
  const slide = { type: "spring", stiffness: 300, damping: 30, mass: 0.9 } as const;
  const [active, setActive] = useState("focus");
  const [panel, setPanel] = useState<"preview" | "code">("preview");
  const [source, setSource] = useState(0);
  const [which, setWhich] = useState<ComponentId>("rail");
  const [capsule, setCapsule] = useState<CapsuleState>("idle");
  const list = sources[which];
  const meta = META[which];
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [paused, setPaused] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const matches = (name: string, description: string) =>
    !normalizedQuery ||
    normalizedQuery
      .split(/\s+/)
      .every((word) => `${name} ${description}`.toLowerCase().includes(word));
  const visibleCount = COMPONENT_NAMES.filter(([name, description]) => matches(name, description)).length;
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">("vertical");
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const savedOverflow = useRef("");
  const closing = useRef(false);
  function openComponent(event: React.MouseEvent<HTMLButtonElement>, id: ComponentId, layout: "vertical" | "horizontal" = "vertical") {
    opener.current = event.currentTarget;
    setWhich(id);
    setSource(0);
    setCapsule("idle");
    setOrientation(layout);
    setPanel("preview");
    setActive("focus");
    setCopied(false);
    setCopyError(false);
    savedOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const modal = dialog.current;
    if (!modal) return;
    modal.showModal();
    const from = originTransform();
    if (from && modal.animate) {
      modal.animate(
        [{ transform: from, opacity: 0.2 }, { transform: "none", opacity: 1 }],
        { duration: 320, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
      );
    }
  }
  function originTransform() {
    const modal = dialog.current;
    const source = opener.current;
    if (!modal || !source) return null;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
    const card = source.getBoundingClientRect();
    const box = modal.open ? modal.getBoundingClientRect() : null;
    const width = box?.width || Math.min(960, window.innerWidth - 32);
    const height = box?.height || Math.min(720, window.innerHeight - 32);
    const left = box ? box.left : (window.innerWidth - width) / 2;
    const top = box ? box.top : (window.innerHeight - height) / 2;
    const dx = card.left + card.width / 2 - (left + width / 2);
    const dy = card.top + card.height / 2 - (top + height / 2);
    return `translate(${dx}px, ${dy}px) scale(${card.width / width}, ${card.height / height})`;
  }
  function closeComponent() {
    const modal = dialog.current;
    if (!modal || !modal.open || closing.current) return;
    const to = originTransform();
    if (!to || !modal.animate) {
      modal.close();
      return;
    }
    closing.current = true;
    modal.dataset.closing = "true";
    const animation = modal.animate(
      [{ transform: "none", opacity: 1 }, { transform: to, opacity: 0.2 }],
      { duration: 240, easing: "cubic-bezier(0.4, 0, 0.6, 1)", fill: "forwards" },
    );
    const done = () => {
      closing.current = false;
      delete modal.dataset.closing;
      animation.cancel();
      modal.close();
    };
    animation.onfinish = done;
    animation.oncancel = () => {
      closing.current = false;
      delete modal.dataset.closing;
    };
  }
  function afterClose() {
    document.body.style.overflow = savedOverflow.current;
    opener.current?.focus();
  }
  useEffect(() => () => {
    if (dialog.current?.open) document.body.style.overflow = savedOverflow.current;
  }, []);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  async function copy() {
    try {
      await navigator.clipboard.writeText(list[source].code);
      setCopied(true);
      setCopyError(false);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  }
  return (
    <MotionConfig reducedMotion="user">
      <div className={styles.site}>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <header className={styles.header}>
          <a href="#" className={styles.wordmark} aria-label="Nativelet home">
            <span className={styles.mark}>n.</span> nativelet
          </a>
          <nav aria-label="Main navigation">
            <a href="#components">Components</a>
            <a href="/sponsor" className={styles.sponsorLink}>
              Sponsor
            </a>
            <a
              href={REPO}
              className={styles.github}
              aria-label={
                stars === null
                  ? "Nativelet on GitHub"
                  : `Nativelet on GitHub, ${stars} ${stars === 1 ? "star" : "stars"}`
              }
            >
              <Github size={17} />
              <span>GitHub</span>
              {stars !== null && <StarCount count={stars} />}
              <ArrowUpRight size={14} />
            </a>
          </nav>
        </header>
        <main id="main">
          <section className={styles.hero} aria-labelledby="hero-title">
            <motion.div
              className={styles.heroCopy}
              initial={false}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className={styles.eyebrow}>
                <span className={styles.dot} /> OPEN-SOURCE REACT NATIVE
                INTERACTION COMPONENTS
              </p>
              <h1 id="hero-title">
                Small interactions.
                <br />
                <span>A little more</span>
                <br />
                <em>feeling.</em>
                <span className={styles.asterisk} aria-hidden="true">
                  ✳
                </span>
              </h1>
              <p className={styles.intro}>
                Exploring the details that make an interface feel alive. React
                Native components with source code you can copy and use.
              </p>
              <div className={styles.actions}>
                <a href="#components" className={styles.primary}>
                  Explore the components <ArrowUpRight size={19} />
                </a>
              </div>
              <p className={styles.status}>
                <Code2 size={15} /> Web previews of real React Native source.
              </p>
            </motion.div>
            <div className={styles.heroVisual}>
              <span className={styles.visualLabel}>
                LIVE WEB PREVIEWS
              </span>
              <HeroShowcase paused={paused} />
              <div className={styles.visualCaption}>
                <span>
                  <span className={styles.dot} /> Looping web previews, not the native
                  Skia render
                </span>
                <button
                  onClick={() => setPaused(!paused)}
                  aria-pressed={paused}
                  aria-label={
                    paused
                      ? "Resume decorative motion"
                      : "Pause decorative motion"
                  }
                >
                  {paused ? <Play size={14} /> : <Pause size={14} />}
                </button>
              </div>
            </div>
          </section>
          <div className={styles.strip}>
            <span>
              <Layers size={17} /> Start with the interaction
            </span>
            <span>
              <Code2 size={17} /> Explore the source
            </span>
          </div>
          <section
            id="components"
            className={styles.components}
            aria-labelledby="component-title"
          >
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>THE COMPONENTS</p>
                <h2 id="component-title">
                  A small start.
                  <br />
                  Plenty to play with.
                </h2>
              </div>
              <p>
                React Native components with interactive web previews.
                <br />
                Open one to try it and copy its React Native source.
              </p>
            </div>
            <div className={gallery.searchRow}>
              <label htmlFor="component-search" className={gallery.searchLabel}>Search components</label>
              <input
                id="component-search"
                type="search"
                className={gallery.search}
                placeholder="Search components, e.g. swipe, tabs, toast"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoComplete="off"
              />
              <p className={gallery.searchCount} role="status" aria-live="polite">
                {normalizedQuery ? `${visibleCount} of ${COMPONENT_NAMES.length} components` : `${COMPONENT_NAMES.length} components`}
              </p>
            </div>
            {visibleCount === 0 ? (
              <div className={gallery.empty}>
                <p>No components match &ldquo;{query.trim()}&rdquo;.</p>
                <button type="button" onClick={() => setQuery("")}>Clear search</button>
              </div>
            ) : null}
            <div className={gallery.grid}>
              <button className={gallery.tile} hidden={!matches("Preview Rail", "Vertical and horizontal navigation · switch inside")} onClick={(event) => openComponent(event, "rail")} aria-haspopup="dialog" aria-label="Open Preview Rail web preview">
                <div className={gallery.study} aria-hidden="true">
                  <div className={gallery.miniRail}>
                    {[0, 1, 2].map((tick) => <span key={tick} className={gallery.tick} />)}
                  </div>
                  <div className={gallery.miniCard}><span>A LITTLE CLARITY</span><strong>One thing at a time.</strong></div>
                </div>
                <div className={gallery.caption}>
                  <div><span className={gallery.label}>WEB PREVIEW · 01</span><strong>Preview Rail</strong><small>Vertical and horizontal navigation · switch inside</small></div>
                  <ArrowUpRight size={20} aria-hidden="true" />
                </div>
              </button>
              <button className={gallery.tile} hidden={!matches("Morph Capsule", "Idle, compact and expanded · tap or drag inside")} onClick={(event) => openComponent(event, "capsule")} aria-haspopup="dialog" aria-label="Open Morph Capsule web preview">
                <div className={gallery.study} aria-hidden="true">
                  <div className={gallery.miniCapsule}><span>Focus session</span><strong>24:10</strong></div>
                </div>
                <div className={gallery.caption}>
                  <div><span className={gallery.label}>WEB PREVIEW · 02</span><strong>Morph Capsule</strong><small>Idle, compact and expanded · tap or drag inside</small></div>
                  <ArrowUpRight size={20} aria-hidden="true" />
                </div>
              </button>
              <button className={gallery.tile} hidden={!matches("Toast Stack", "Queue, swipe, pause and undo · feedback that feels right")} onClick={(event) => openComponent(event, "toast")} aria-haspopup="dialog" aria-label="Open Toast Stack web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniToasts}><span>✓ Saved to collection <b>Undo</b></span><span>A little less to carry.</span></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 03</span><strong>Toast Stack</strong><small>Queue, swipe, pause and undo · feedback that feels right</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("Liquid Tabs", "A floating tab bar · native iOS glass with fallbacks")} onClick={(event) => openComponent(event, "glass")} aria-haspopup="dialog" aria-label="Open Liquid Tabs web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniGlass}><span>⌂<small>Home</small></span><span>◇<small>Explore</small></span><span>♡<small>Saved</small></span><span>○<small>You</small></span></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 04</span><strong>Liquid Tabs</strong><small>A floating tab bar · native iOS glass with fallbacks</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("Swipe Row", "Swipe to reveal actions · full-swipe commit with undo")} onClick={(event) => openComponent(event, "swipe")} aria-haspopup="dialog" aria-label="Open Swipe Row web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniSwipe}><span className={gallery.miniSwipeAction}>Delete</span><span className={gallery.miniSwipeRow}><b>Asha Rao</b><small>Lunch on Thursday?</small></span></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 05</span><strong>Swipe Row</strong><small>Swipe to reveal actions · full-swipe commit with undo</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("Expanding Card", "Tap to expand into a detail view · drag down to dismiss")} onClick={(event) => openComponent(event, "expand")} aria-haspopup="dialog" aria-label="Open Expanding Card web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniExpand}><span className={gallery.miniExpandBack} /><span className={gallery.miniExpandCard}><small>THE DAILY LIST</small><b>Slow mornings</b></span></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 06</span><strong>Expanding Card</strong><small>Tap to expand into a detail view · drag down to dismiss</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("Drag to Sort", "Lift, make a gap, scroll the edge · drop to settle")} onClick={(event) => openComponent(event, "sort")} aria-haspopup="dialog" aria-label="Open Drag to Sort web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniSort}><span>01 · Sketch the idea <b>⠿</b></span><span>02 · Pick a direction <b>⠿</b></span><span>03 · Build the prototype <b>⠿</b></span></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 07</span><strong>Drag to Sort</strong><small>Lift, make a gap, scroll the edge · drop to settle</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("Stacked Carousel", "Depth, tilt and a spring settle · swipe or focus a card")} onClick={(event) => openComponent(event, "carousel")} aria-haspopup="dialog" aria-label="Open Stacked Carousel web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniCarousel}><span>≋</span><span>↗<small>Take the long way</small></span><span>☾</span></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 08</span><strong>Stacked Carousel</strong><small>Depth, tilt and a spring settle · swipe or focus a card</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("Gooey Menu", "Actions pull out like liquid · tap the plus")} onClick={(event) => openComponent(event, "gooey")} aria-haspopup="dialog" aria-label="Open Gooey Menu web preview">
                <div className={gallery.study} aria-hidden="true"><svg width="0" height="0" style={{ position: "absolute" }}><filter id="nativelet-mini-goo" colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation="6" /><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 24 -11" /></filter></svg><div className={gallery.miniGooeyWrap}><div className={gallery.miniGooey}><i /><i /><i /><i /><b /></div><em className={gallery.miniGooeyPlus}>+</em></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 09</span><strong>Gooey Menu</strong><small>Actions pull out like liquid · tap the plus</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("Theme Reveal", "A theme switch that spreads from your tap")} onClick={(event) => openComponent(event, "ripple")} aria-haspopup="dialog" aria-label="Open Theme Reveal web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniRipple}><i /><b /></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 10</span><strong>Theme Reveal</strong><small>A theme switch that spreads from your tap</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("Glass Lens", "A lens that trails your finger")} onClick={(event) => openComponent(event, "lens")} aria-haspopup="dialog" aria-label="Open Glass Lens web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniLens}><i /><b /></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 11</span><strong>Glass Lens</strong><small>A lens that trails your finger</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("Scrub Chart", "A smooth trend, a reading under your finger")} onClick={(event) => openComponent(event, "chart")} aria-haspopup="dialog" aria-label="Open Scrub Chart web preview">
                <div className={gallery.study} aria-hidden="true"><svg width="240" height="150" viewBox="0 0 240 150"><rect width="240" height="150" rx="20" fill="#132d2b"/><path d="M 20 115 C 40 115 40 84 62 84 S 80 100 97 100 S 117 49 139 49 S 155 65 171 65 S 199 27 220 27 L 220 132 L 20 132 Z" fill="#57dfb622"/><path d="M 20 115 C 40 115 40 84 62 84 S 80 100 97 100 S 117 49 139 49 S 155 65 171 65 S 199 27 220 27" fill="none" stroke="#57dfb6" strokeWidth="3"/><line x1="139" x2="139" y1="22" y2="132" stroke="#accec3"/><circle cx="139" cy="49" r="5" fill="#57dfb6"/></svg></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 12</span><strong>Scrub Chart</strong><small>A smooth trend, a reading under your finger</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("Pinch Gallery", "Pinch to change density · hold and drag to select")} onClick={(event) => openComponent(event, "pinch")} aria-haspopup="dialog" aria-label="Open Pinch Gallery web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniPinch}><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 13</span><strong>Pinch Gallery</strong><small>Pinch to change density · hold and drag to select</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("Page Curl", "A curved fold, a paper back, a turn that follows your finger")} onClick={(event) => openComponent(event, "curl")} aria-haspopup="dialog" aria-label="Open Page Curl web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniCurl}><span>FIELD NOTES</span><strong>Into the green.</strong><i /><b /></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 14</span><strong>Page Curl</strong><small>A curved fold, a paper back, a turn that follows your finger</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("Orbit QR", "A sphere of tiles that lands as a scannable code")} onClick={(event) => openComponent(event, "orbit")} aria-haspopup="dialog" aria-label="Open Orbit QR web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniOrbit}>{Array.from({ length: 36 }, (_, i) => <i key={i} />)}</div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 15</span><strong>Orbit QR</strong><small>A sphere of tiles that lands as a scannable code</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("Blossom QR", "A voxel blossom tree that flattens into a scannable code")} onClick={(event) => openComponent(event, "blossom")} aria-haspopup="dialog" aria-label="Open Blossom QR web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniBlossom}><i /><b /></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 16</span><strong>Blossom QR</strong><small>A voxel blossom tree that flattens into a scannable code</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("Light on Painting", "A bulb on a cord relights the scene as you drag it")} onClick={(event) => openComponent(event, "light")} aria-haspopup="dialog" aria-label="Open Light on Painting web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniLight}><i /></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 17</span><strong>Light on Painting</strong><small>A bulb on a cord relights the scene as you drag it</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("Text Morph", "A paragraph whose letters fly into a picture and back")} onClick={(event) => openComponent(event, "morph")} aria-haspopup="dialog" aria-label="Open Text Morph web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniMorph}>{"lighthouse keeper wiped the glass".split("").map((c, i) => <i key={i}>{c}</i>)}</div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 18</span><strong>Text Morph</strong><small>A paragraph whose letters fly into a picture and back</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("Genie Dismiss", "A textured card funnels into a target · drag to reverse")} onClick={(event) => openComponent(event, "genie")} aria-haspopup="dialog" aria-label="Open Genie Dismiss web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniGenie}><span>FIELD NOTES</span><strong>A little room<br />to wander.</strong><i /><b /></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 19</span><strong>Genie Dismiss</strong><small>A textured card funnels into a target · drag to reverse</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("GL Transitions", "Drag scrubs a shader transition · flick to fly")} onClick={(event) => openComponent(event, "transitions")} aria-haspopup="dialog" aria-label="Open GL Transitions web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniTransitions}><i /><b /></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 21</span><strong>GL Transitions</strong><small>Drag scrubs a shader transition · flick to fly</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("Folded Pass", "A paper pass that unfolds under your finger · drag to fold")} onClick={(event) => openComponent(event, "fold")} aria-haspopup="dialog" aria-label="Open Folded Pass web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniFold}><span>BLR → LHR</span><i /><b /></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 20</span><strong>Folded Pass</strong><small>A paper pass that unfolds under your finger · drag to fold</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("Split-Flap Board", "Letter flaps clatter to the next word \u00b7 tap to flip")} onClick={(event) => openComponent(event, "flap")} aria-haspopup="dialog" aria-label="Open Split-Flap Board web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniFlap}><i /><i /><i /><i /><i /><i /><i /><i /></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW \u00b7 24</span><strong>Split-Flap Board</strong><small>Letter flaps clatter to the next word \u00b7 tap to flip</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("Mosaic Gallery", "Paintings as 2,816 flying tiles · tap to ripple to the next")} onClick={(event) => openComponent(event, "mosaic")} aria-haspopup="dialog" aria-label="Open Mosaic Gallery web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniMosaic}><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 23</span><strong>Mosaic Gallery</strong><small>Paintings as 2,816 flying tiles · tap to ripple to the next</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("Bubble Picker", "Fling, bounce and pop-select topics · a real physics solver")} onClick={(event) => openComponent(event, "bubbles")} aria-haspopup="dialog" aria-label="Open Bubble Picker web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniBubbles}><i style={{ left: 24, top: 62, width: 54, height: 54, background: "#e2725b" }} /><i style={{ left: 88, top: 18, width: 44, height: 44, background: "#5ca4a9" }} /><i style={{ left: 96, top: 84, width: 40, height: 40, background: "#f2a65a" }} /><i style={{ left: 152, top: 44, width: 58, height: 58, background: "#8e7cc3" }} /></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 22</span><strong>Bubble Picker</strong><small>Fling, bounce and pop-select topics · a real physics solver</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("Fogged Glass", "Wipe the misted window · beads run, fog creeps back")} onClick={(event) => openComponent(event, "fog")} aria-haspopup="dialog" aria-label="Open Fogged Glass web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniFog}><i /><b /></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 26</span><strong>Fogged Glass</strong><small>Wipe the misted window · beads run, fog creeps back</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("Cloth Banner", "A banner in the breeze · drag the fabric and let go")} onClick={(event) => openComponent(event, "banner")} aria-haspopup="dialog" aria-label="Open Cloth Banner web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniCloth}><i /><b>FLOWER SHOW</b></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 25</span><strong>Cloth Banner</strong><small>A banner in the breeze · drag the fabric and let go</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("Code Reveal", "Drag across a picture · it turns into glyphs under your finger")} onClick={(event) => openComponent(event, "reveal")} aria-haspopup="dialog" aria-label="Open Code Reveal web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniReveal}><i /><b>@#x+=:.</b></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 30</span><strong>Code Reveal</strong><small>Drag across a picture · it turns into glyphs under your finger</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("Coin", "Flick a floating metal coin · it tumbles with exact rigid-body physics")} onClick={(event) => openComponent(event, "coin")} aria-haspopup="dialog" aria-label="Open Coin web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniCoin}><i /></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 29</span><strong>Coin</strong><small>Flick a floating metal coin · it tumbles with exact rigid-body physics</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("Black Hole Lens", "Drag a black hole across a starfield \u00b7 real gravitational lensing")} onClick={(event) => openComponent(event, "blackhole")} aria-haspopup="dialog" aria-label="Open Black Hole Lens web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniBlackHole}><i /><b /><u /></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 28</span><strong>Black Hole Lens</strong><small>Drag a black hole across a starfield \u00b7 real gravitational lensing</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
              <button className={gallery.tile} hidden={!matches("Chaos Pendulum", "Grab and fling a double pendulum · glowing trails, exact physics")} onClick={(event) => openComponent(event, "pendulum")} aria-haspopup="dialog" aria-label="Open Chaos Pendulum web preview">
                <div className={gallery.study} aria-hidden="true"><div className={gallery.miniPendulum}><i /><b /><u /></div></div>
                <div className={gallery.caption}><div><span className={gallery.label}>WEB PREVIEW · 27</span><strong>Chaos Pendulum</strong><small>Grab and fling a double pendulum · glowing trails, exact physics</small></div><ArrowUpRight size={20} aria-hidden="true" /></div>
              </button>
            </div>
            <dialog ref={dialog} className={gallery.dialog} aria-labelledby="preview-dialog-title" aria-describedby="preview-dialog-description" onClose={afterClose} onCancel={(event) => { event.preventDefault(); closeComponent(); }} onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              const elements = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], select, [tabindex="0"]')).filter((element) => element.getClientRects().length > 0);
              const first = elements[0];
              const last = elements[elements.length - 1];
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }} onClick={(event) => {
              if (event.target !== event.currentTarget) return;
              const box = event.currentTarget.getBoundingClientRect();
              if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeComponent();
            }}>
              <p id="preview-dialog-description" className={gallery.srOnly}>Web preview of the React Native {meta.title}. Press Escape or tap outside the dialog to close it.</p>
              <div className={gallery.dialogBody}>
            <div className={styles.workbench}>
              <div className={styles.workbenchHead}>
                <div>
                  <span className={styles.live}>REACT NATIVE · WEB PREVIEW</span>
                  <h3 id="preview-dialog-title">
                    {meta.title} <span>{meta.number}</span>
                  </h3>
                </div>
                <div
                  className={styles.viewTabs}
                  role="group"
                  aria-label={`${meta.title} view`}
                >
                  <button
                    aria-pressed={panel === "preview"}
                    onClick={() => setPanel("preview")}
                  >
                    {panel === "preview" && (
                      <motion.span layoutId="view-pill" className={styles.viewPill} transition={slide} />
                    )}
                    <span className={styles.toggleLabel}>Preview</span>
                  </button>
                  <button
                    aria-pressed={panel === "code"}
                    onClick={() => setPanel("code")}
                  >
                    {panel === "code" && (
                      <motion.span layoutId="view-pill" className={styles.viewPill} transition={slide} />
                    )}
                    <span className={styles.toggleLabel}><Code2 size={14} /> Code</span>
                  </button>
                </div>
              </div>
              {panel === "preview" ? (
                <>
                {which === "reveal" ? <CodeRevealPreview /> : which === "coin" ? <CoinPreview /> : which === "blackhole" ? <BlackHoleLensPreview /> : which === "pendulum" ? <ChaosPendulumPreview /> : which === "fog" ? <FoggedGlassPreview /> : which === "banner" ? <ClothBannerPreview /> : which === "flap" ? <SplitFlapBoardPreview /> : which === "mosaic" ? <MosaicGalleryPreview /> : which === "bubbles" ? <BubblePickerPreview /> : which === "transitions" ? <GLTransitionsPreview /> : which === "fold" ? <FoldedPassPreview /> : which === "genie" ? <GenieDismissPreview /> : which === "morph" ? <TextMorphPreview /> : which === "light" ? <LightPaintingPreview /> : which === "blossom" ? <BlossomQRPreview /> : which === "orbit" ? <OrbitQRPreview /> : which === "curl" ? <PageCurlPreview /> : which === "pinch" ? <PinchGalleryPreview /> : which === "chart" ? <ScrubChartPreview /> : which === "lens" ? <GlassLensPreview /> : which === "ripple" ? <RippleRevealPreview /> : which === "gooey" ? <GooeyMenuPreview /> : which === "carousel" ? <StackedCarouselPreview /> : which === "sort" ? <DragToSortPreview /> : which === "expand" ? <ExpandingCardPreview /> : which === "swipe" ? <SwipeRowPreview /> : which === "glass" ? <LiquidTabsPreview /> : which === "toast" ? <ToastStackPreview /> : which === "capsule" ? (
                  <>
                    <div className={gallery.orientation} role="group" aria-label="Capsule state">
                      {CAPSULE_STATES.map((name) => (
                        <button key={name} type="button" aria-pressed={capsule === name} onClick={() => setCapsule(name)}>
                          {capsule === name && <motion.span layoutId="capsule-pill" className={gallery.orientationPill} transition={slide} />}
                          <span className={gallery.toggleLabel}>{name[0].toUpperCase() + name.slice(1)}</span>
                        </button>
                      ))}
                    </div>
                    <div className={gallery.capsuleStage}>
                      <MorphCapsule state={capsule} onStateChange={setCapsule} content={capsuleContent} label="Focus session" descriptions={capsuleDescriptions} />
                      <p>Tap to step up. Drag down to expand and up to collapse. Grab it mid-morph.</p>
                    </div>
                  </>
                ) : (
                  <>
                <div className={gallery.orientation} role="group" aria-label="Rail orientation">
                  {(["vertical", "horizontal"] as const).map((layout) => (
                    <button key={layout} type="button" aria-pressed={orientation === layout} onClick={() => setOrientation(layout)}>
                      {orientation === layout && <motion.span layoutId="orientation-pill" className={gallery.orientationPill} transition={slide} />}
                      <span className={gallery.toggleLabel}>{layout === "vertical" ? "Vertical" : "Horizontal"}</span>
                    </button>
                  ))}
                </div>
                <div className={styles.demo}>
                  <div className={styles.demoNavigation}>
                    <PreviewRail
                      items={sections}
                      orientation={orientation}
                      activeId={active}
                      onActiveChange={setActive}
                      className="!min-h-44"
                      renderPreview={(item) => (
                        <div className={styles.railTooltip}>
                          <strong>{item.label}</strong>
                          <p>{item.description}</p>
                        </div>
                      )}
                    />
                    <p>
                      Hover or focus the rail.
                      <br />
                      Use the buttons to explore on touch.
                    </p>
                  </div>
                  <div className={styles.demoDetail} id="rail-detail">
                    <div
                      className={styles.demoButtons}
                      role="group"
                      aria-label="Select preview"
                    >
                      {sections.map((s) => (
                        <button
                          aria-pressed={active === s.id}
                          onClick={() => setActive(s.id)}
                          key={s.id}
                        >
                          {active === s.id && (
                            <motion.span layoutId="detail-pill" className={styles.detailPill} transition={slide} />
                          )}
                          <span className={styles.toggleLabel}>{s.label}</span>
                        </button>
                      ))}
                    </div>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={active}
                        initial={reduce ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={styles.detailCard}
                      >
                        <span
                          className={styles.detailSymbol}
                          aria-hidden="true"
                        >
                          {active === "focus"
                            ? "✳"
                            : active === "listen"
                              ? "≈"
                              : "↗"}
                        </span>
                        <div>
                          <p className={styles.smallLabel}>
                            A LITTLE{" "}
                            {active === "focus"
                              ? "CLARITY"
                              : active === "listen"
                                ? "RHYTHM"
                                : "MOMENTUM"}
                          </p>
                          <h4>
                            {active === "focus"
                              ? "Give the next thing your full attention."
                              : active === "listen"
                                ? "Find a rhythm that feels like you."
                                : "Make space for something different."}
                          </h4>
                          <p>Demo content for the web Preview Rail.</p>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
                  </>
                )}
                </>
              ) : (
                <div className={styles.sourcePanel}>
                  <div className={styles.sourceToolbar}>
                    <label id="source-file-label" htmlFor="source-file">Source file</label>
                    <SourceDropdown
                      id="source-file"
                      labelId="source-file-label"
                      options={list.map((s) => s.name)}
                      value={source}
                      onChange={(value) => {
                        setSource(value);
                        setCopied(false);
                        setCopyError(false);
                      }}
                    />
                    <button onClick={copy}>
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p role="status">
                    {copyError
                      ? "Clipboard unavailable. Select the source below and copy it manually."
                      : meta.note}
                  </p>
                  <pre tabIndex={0} aria-label={list[source].name}>
                    <code>{list[source].code}</code>
                  </pre>
                </div>
              )}
              <div className={styles.demoFooter}>
                <span>{meta.footer}</span>
                <a href={`${REPO}/tree/main/packages/ui/src/components/${meta.folder}`}>
                  View in repository <ArrowUpRight size={15} />
                </a>
              </div>
            </div>
              </div>
            </dialog>
          </section>
          <WhatYouGet />
          <Faq />
          <Sponsor />
          <section className={styles.endnote}>
            <span aria-hidden="true">✳</span>
            <h2>
              Make the ordinary
              <br />
              feel considered.
            </h2>
            <a href={REPO}>
              Build along with Nativelet <ArrowUpRight size={18} />
            </a>
          </section>
        </main>
        <motion.footer
          className={styles.footer}
          initial="hidden"
          whileInView="shown"
          viewport={{ once: true, amount: 0.25 }}
          transition={{ staggerChildren: 0.07 }}
        >
          <div className={styles.footerTop}>
            <motion.div className={styles.footerBrand} variants={footerItem}>
              <a className={styles.wordmark} href="#">
                <span className={styles.mark}>n.</span> nativelet
              </a>
              <p>Open-source React Native interaction components by Sandeepan Nandi.</p>
            </motion.div>
            <motion.nav
              className={styles.footerCol}
              aria-label="Explore"
              variants={footerItem}
            >
              <h3>Explore</h3>
              <a href="#components">Components</a>
              <a href={`${REPO}/tree/main/packages/ui/src/components`}>
                Source <ArrowUpRight size={14} />
              </a>
            </motion.nav>
            <motion.nav
              className={styles.footerCol}
              aria-label="Project"
              variants={footerItem}
            >
              <h3>Project</h3>
              <a href={REPO}>
                <Github size={15} /> GitHub <ArrowUpRight size={14} />
              </a>
              <a href={`${REPO}/issues`}>
                Issues <ArrowUpRight size={14} />
              </a>
              <a href={`${REPO}/blob/main/LICENSE`}>
                MIT license <ArrowUpRight size={14} />
              </a>
              <a href="/sponsor">Sponsor</a>
              <a href="/terms">Terms of Service</a>
              <a href="/privacy">Privacy Policy</a>
            </motion.nav>
          </div>
          <div className={styles.footerWord} aria-hidden="true">
            {"nativelet".split("").map((letter, index) => (
              <span key={index} className={styles.footerMask}>
                <motion.span variants={footerLetter}>{letter}</motion.span>
              </span>
            ))}
          </div>
        </motion.footer>
      </div>
    </MotionConfig>
  );
}
