import { readFileSync } from "node:fs";
import { join } from "node:path";
import NativeletSite from "./components/nativelet-site";

export default function Home() {
  const names = [
    "app/components/preview-rail.tsx",
    "lib/ease.ts",
    "lib/hooks/use-hover-capable.ts",
    "lib/utils.ts",
  ];
  const sources = names.map((name) => ({
    name,
    code: readFileSync(join(process.cwd(), name), "utf8"),
  }));
  return <NativeletSite sources={sources} />;
}
