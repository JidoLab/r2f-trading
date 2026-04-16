import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      // Allow AI crawlers explicitly — enables citation in AI answers
      // (Google AI Overviews, ChatGPT, Claude, Perplexity)
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      // Throttle resource-heavy SEO crawlers
      {
        userAgent: "AhrefsBot",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      {
        userAgent: "SemrushBot",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
    ],
    sitemap: [
      "https://www.r2ftrading.com/sitemap.xml",
      "https://www.r2ftrading.com/image-sitemap.xml",
    ],
  };
}
