import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";

const BASE_URL = "https://www.r2ftrading.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();

  const blogEntries = posts.map((post) => ({
    url: `${BASE_URL}/trading-insights/${post.slug}`,
    lastModified: post.date || new Date().toISOString(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    { url: BASE_URL, lastModified: new Date().toISOString(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/about`, lastModified: new Date().toISOString(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/coaching`, lastModified: new Date().toISOString(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/contact`, lastModified: new Date().toISOString(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/trading-insights`, lastModified: new Date().toISOString(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date().toISOString(), changeFrequency: "yearly", priority: 0.3 },
    ...blogEntries,
  ];
}
