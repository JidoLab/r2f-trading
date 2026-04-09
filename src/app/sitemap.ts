import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { listFiles, readFile } from "@/lib/github";

const BASE_URL = "https://www.r2ftrading.com";

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
          return {
            url: `${BASE_URL}/learn/${data.slug}`,
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

  return [
    { url: BASE_URL, lastModified: new Date().toISOString(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/about`, lastModified: new Date().toISOString(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/coaching`, lastModified: new Date().toISOString(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/contact`, lastModified: new Date().toISOString(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/results`, lastModified: new Date().toISOString(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/free-class`, lastModified: new Date().toISOString(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/trading-insights`, lastModified: new Date().toISOString(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/market-brief`, lastModified: new Date().toISOString(), changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date().toISOString(), changeFrequency: "yearly", priority: 0.3 },
    ...blogEntries,
    ...landingPageEntries,
  ];
}
