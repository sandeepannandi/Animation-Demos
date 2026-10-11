import { readFileSync } from "node:fs";
import { join } from "node:path";
import NativeletSite from "./components/nativelet-site";

export default function Home() {
  const dir = "packages/ui/src/components/preview-rail";
  const names = [
    `${dir}/PreviewRail.tsx`,
    `${dir}/selection.ts`,
    `${dir}/Example.tsx`,
    `${dir}/README.md`,
    `${dir}/LICENSE`,
  ];
  const sources = names.map((name) => ({
    name,
    code: readFileSync(join(process.cwd(), name), "utf8"),
  }));
  return <NativeletSite sources={sources} />;
}
