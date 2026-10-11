import { readFileSync } from "node:fs";
import { join } from "node:path";
import NativeletSite from "./components/nativelet-site";

const components = {
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
    rail: read(components.rail.dir, components.rail.files),
    capsule: read(components.capsule.dir, components.capsule.files),
  };
  return <NativeletSite sources={sources} />;
}
