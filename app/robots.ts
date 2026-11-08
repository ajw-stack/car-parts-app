import type { MetadataRoute } from "next";

const SITE = "https://elroco.com.au";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/capture", "/api/", "/account", "/reset-password", "/auth/"],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
