import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://nativelet.netlify.app/", changeFrequency: "weekly", priority: 1 }];
}
