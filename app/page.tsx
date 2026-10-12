import { readFileSync } from "node:fs";
import { join } from "node:path";
import NativeletSite from "./components/nativelet-site";

const components = {
  sort: { dir: "packages/ui/src/components/drag-to-sort", files: ["DragToSort.tsx", "sortLogic.ts", "Example.tsx", "README.md", "LICENSE"] },
  glass: { dir: "packages/ui/src/components/liquid-tabs", files: ["LiquidTabs.tsx", "README.md", "LICENSE"] },
  expand: { dir: "packages/ui/src/components/expanding-card", files: ["ExpandingCard.tsx", "expandingLogic.ts", "Example.tsx", "README.md", "LICENSE"] },
  swipe: { dir: "packages/ui/src/components/swipe-row", files: ["SwipeRow.tsx", "swipeLogic.ts", "Example.tsx", "README.md", "LICENSE"] },
  toast: { dir: "packages/ui/src/components/toast-stack", files: ["ToastStack.tsx", "toastLogic.ts", "Example.tsx", "README.md", "LICENSE"] },
  rail: {
    dir: "packages/ui/src/components/preview-rail",
    files: ["PreviewRail.tsx", "selection.ts", "Example.tsx", "README.md", "LICENSE"],
  },
  capsule: {
    dir: "packages/ui/src/components/morph-capsule",
    files: ["MorphCapsule.tsx", "morphMath.ts", "Example.tsx", "README.md", "LICENSE"],
  },
} as const;

function read(dir: string, files: readonly string[]) {
  return files.map((file) => {
    const name = `${dir}/${file}`;
    return { name, code: readFileSync(join(process.cwd(), name), "utf8") };
  });
}

export default function Home() {
  const sources = {
    sort: read(components.sort.dir, components.sort.files),
    glass: read(components.glass.dir, components.glass.files),
    expand: read(components.expand.dir, components.expand.files),
    swipe: read(components.swipe.dir, components.swipe.files),
    toast: read(components.toast.dir, components.toast.files),
    rail: read(components.rail.dir, components.rail.files),
    capsule: read(components.capsule.dir, components.capsule.files),
  };
  return <NativeletSite sources={sources} />;
}
