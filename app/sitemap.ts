import type { MetadataRoute } from "next";

const SITE = "https://elroco.com.au";

// Public pages while the site is gated to the VIN decoder.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE}/decode`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE}/install`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/refunds`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
