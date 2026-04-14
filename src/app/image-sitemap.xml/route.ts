import { NextResponse } from "next/server";
import { readFile } from "@/lib/github";
import { getAllPosts } from "@/lib/blog";

const BASE_URL = "https://www.r2ftrading.com";
const REPO = "JidoLab/r2f-trading";

interface LibraryImage {
  id: string;
  filename: string;
  url: string;
  tags: string[];
  patterns: string[];
  category: string;
  description: string;
  pair?: string;
  timeframe?: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  // Collect all image entries
  const imageBlocks: string[] = [];

  // 1. Image library images
  try {
    const raw = await readFile("data/image-library-full.json");
    const images: LibraryImage[] = JSON.parse(raw);

    for (const img of images) {
      const title = img.description || img.filename;
      const caption = [
        img.description,
        img.pair ? `Pair: ${img.pair}` : "",
        img.timeframe ? `Timeframe: ${img.timeframe}` : "",
        img.patterns.length ? `Patterns: ${img.patterns.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      imageBlocks.push(`    <image:image>
      <image:loc>${escapeXml(img.url)}</image:loc>
      <image:title>${escapeXml(title)}</image:title>
      <image:caption>${escapeXml(caption)}</image:caption>
    </image:image>`);
    }
  } catch {
    // image library may not exist yet
  }

  // 2. Blog cover images
  try {
    const posts = getAllPosts();
    for (const post of posts) {
      if (!post.coverImage) continue;
      // coverImage is like "/blog/slug-cover.jpg" — resolve to raw GitHub URL
      const imgUrl = post.coverImage.startsWith("http")
        ? post.coverImage
        : `https://raw.githubusercontent.com/${REPO}/master/public${post.coverImage}`;

      imageBlocks.push(`    <image:image>
      <image:loc>${escapeXml(imgUrl)}</image:loc>
      <image:title>${escapeXml(post.seoTitle || post.title)}</image:title>
      <image:caption>${escapeXml(post.seoDescription || post.excerpt)}</image:caption>
    </image:image>`);
    }
  } catch {
    // blog may have issues
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${BASE_URL}</loc>
${imageBlocks.join("\n")}
  </url>
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
