import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { listFiles, readFile } from "@/lib/github";

const BASE_URL = "https://www.r2ftrading.com";

// Regenerate hourly. Landing pages are added to data/landing-pages via the
// GitHub API (generate-glossary cron, admin UI), and the listing this route
// reads is fetched at build time. Without revalidation a page could be live at
// its URL while staying absent from the sitemap until some later build happened
// to pick it up, so newly generated pages risked never being discovered.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = getAllPosts();

  const blogEntries = posts.map((post) => ({
    url: `${BASE_URL}/trading-insights/${post.slug}`,
    lastModified: post.date || new Date().toISOString(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Fetch landing pages from GitHub
  let landingPageEntries: MetadataRoute.Sitemap = [];
  try {
    const files = await listFiles("data/landing-pages", ".json");
    const entries = await Promise.all(
      files.map(async (filePath) => {
        try {
          const raw = await readFile(filePath);
          const data = JSON.parse(raw);
          // Route by FILENAME, not data.slug. /learn/[slug] resolves a page by
          // reading data/landing-pages/<slug>.json, so the filename is the only
          // routable slug. Where the two disagree (position-sizing.json carries
          // slug "position-sizing-funded-accounts") the sitemap was advertising
          // a URL that 308-redirects, which Google reports as "Page with
          // redirect" and declines to index.
          const routeSlug =
            filePath.split("/").pop()?.replace(/\.json$/, "") || data.slug;
          return {
            url: `${BASE_URL}/learn/${routeSlug}`,
            lastModified: data.createdAt || new Date().toISOString(),
            changeFrequency: "monthly" as const,
            priority: 0.8,
          };
        } catch {
          return null;
        }
      })
    );
    landingPageEntries = entries.filter(
      (e): e is NonNullable<typeof e> => e !== null
    );
  } catch {
    // data/landing-pages directory might not exist yet
  }

  // Use the most recent blog post date for dynamic pages (trading-insights, homepage)
  // and realistic last-modified dates for static pages to avoid Google ignoring lastmod
  const latestPostDate = posts.length > 0
    ? posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0].date
    : "2026-04-01";

  return [
    { url: BASE_URL, lastModified: latestPostDate, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/about`, lastModified: "2026-04-15", changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/coaching`, lastModified: "2026-04-15", changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/contact`, lastModified: "2026-04-10", changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/results`, lastModified: "2026-04-15", changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/free-class`, lastModified: "2026-04-10", changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/crash-course`, lastModified: "2026-04-10", changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/starter-kit`, lastModified: "2026-04-10", changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/trading-insights`, lastModified: latestPostDate, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/learn`, lastModified: latestPostDate, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/tools/risk-calculator`, lastModified: "2026-04-15", changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/market-brief`, lastModified: latestPostDate, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/privacy`, lastModified: "2026-01-01", changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/image-license`, lastModified: "2026-04-19", changeFrequency: "yearly", priority: 0.3 },
    ...blogEntries,
    ...landingPageEntries,
  ];
}
