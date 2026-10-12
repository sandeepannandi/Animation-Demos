import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://nativelet.netlify.app/", changeFrequency: "weekly", priority: 1 },
    { url: "https://nativelet.netlify.app/sponsor", changeFrequency: "monthly", priority: 0.5 },
    { url: "https://nativelet.netlify.app/terms", changeFrequency: "yearly", priority: 0.3 },
    { url: "https://nativelet.netlify.app/privacy", changeFrequency: "yearly", priority: 0.3 },
  ];
}
