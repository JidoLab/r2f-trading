import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile, listFiles } from "@/lib/github";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const SITE_URL = "https://www.r2ftrading.com";

interface SyndicationEntry {
  slug: string;
  platform: string;
  date: string;
  url?: string;
}

async function getSyndicationLog(): Promise<SyndicationEntry[]> {
  try {
    const raw = await readFile("data/syndication-log.json");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveSyndicationLog(log: SyndicationEntry[]): Promise<void> {
  await commitFile(
    "data/syndication-log.json",
    JSON.stringify(log, null, 2),
    "Update syndication log"
  );
}

function extractFrontmatter(content: string): { title: string; excerpt: string; date: string } | null {
  // Parse the export const metadata = { ... } block
  const match = content.match(/export\s+const\s+metadata\s*=\s*\{([\s\S]*?)\n\}/);
  if (!match) return null;

  const block = match[1];
  const titleMatch = block.match(/title:\s*(?:"([^"]+)"|'([^']+)'|`([^`]+)`)/);
  const excerptMatch = block.match(/excerpt:\s*(?:"([^"]+)"|'([^']+)'|`([^`]+)`)/);
  const dateMatch = block.match(/date:\s*"([^"]+)"/);

  if (!titleMatch || !dateMatch) return null;

  return {
    title: titleMatch[1] || titleMatch[2] || titleMatch[3] || "",
    excerpt: excerptMatch?.[1] || excerptMatch?.[2] || excerptMatch?.[3] || "",
    date: dateMatch[1],
  };
}

function extractBody(content: string): string {
  // Remove the metadata export block, return remaining markdown
  return content.replace(/export\s+const\s+metadata\s*=\s*\{[\s\S]*?\n\}\s*\n*/, "").trim();
}

async function syndicateToMedium(
  title: string,
  markdown: string,
  canonicalUrl: string
): Promise<{ url?: string; error?: string }> {
  const token = process.env.MEDIUM_TOKEN;
  if (!token) return { error: "MEDIUM_TOKEN not set" };

  try {
    // Get user ID
    const userRes = await fetch("https://api.medium.com/v1/me", {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!userRes.ok) return { error: `Medium user fetch failed: ${userRes.status}` };
    const userData = await userRes.json();
    const userId = userData.data?.id;
    if (!userId) return { error: "Could not get Medium user ID" };

    // Create post
    const postRes = await fetch(`https://api.medium.com/v1/users/${userId}/posts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        contentFormat: "markdown",
        content: markdown,
        publishStatus: "public",
        canonicalUrl,
      }),
    });

    if (!postRes.ok) {
      const errBody = await postRes.text();
      return { error: `Medium post failed: ${postRes.status} — ${errBody}` };
    }

    const postData = await postRes.json();
    return { url: postData.data?.url };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Medium API error" };
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all blog files
    const files = await listFiles("content/blog", ".mdx");
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Load syndication log
    const log = await getSyndicationLog();
    const syndicatedSlugs = new Set(log.map((e) => `${e.slug}:${e.platform}`));

    // Find recent posts not yet syndicated
    const candidates: { slug: string; title: string; excerpt: string; body: string }[] = [];

    for (const filePath of files) {
      const slug = filePath.replace(/^content\/blog\//, "").replace(/\.mdx$/, "");

      // Check if already syndicated to Medium
      if (syndicatedSlugs.has(`${slug}:medium`)) continue;

      try {
        const content = await readFile(filePath);
        const meta = extractFrontmatter(content);
        if (!meta) continue;

        // Only syndicate posts from last 24 hours
        const postDate = new Date(meta.date);
        if (postDate < oneDayAgo) continue;

        const body = extractBody(content);
        candidates.push({ slug, title: meta.title, excerpt: meta.excerpt, body });
      } catch {
        continue;
      }
    }

    if (candidates.length === 0) {
      return NextResponse.json({ success: true, message: "No new posts to syndicate" });
    }

    // Max 2 syndications per run
    const toSyndicate = candidates.slice(0, 2);
    const results: { slug: string; platform: string; status: string; url?: string }[] = [];

    const anthropic = new Anthropic();

    for (const post of toSyndicate) {
      // Generate shortened version with Claude
      const shortenRes = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: `Shorten this blog article to 500-800 words for Medium syndication. Keep the core value and insights, maintain first-person voice as an R2F Trading coach. Remove internal links and image references. End with:

---

*Originally published at [r2ftrading.com](${SITE_URL}/trading-insights/${post.slug}). Follow R2F Trading for daily ICT trading insights.*

TITLE: ${post.title}

ARTICLE:
${post.body}

Return ONLY the shortened markdown article (no JSON wrapper, no code blocks). Start with the article text directly.`,
          },
        ],
      });

      const shortened =
        shortenRes.content[0].type === "text" ? shortenRes.content[0].text.trim() : "";
      if (!shortened) {
        results.push({ slug: post.slug, platform: "medium", status: "error — empty Claude response" });
        continue;
      }

      // Post to Medium
      const canonicalUrl = `${SITE_URL}/trading-insights/${post.slug}`;
      const mediumResult = await syndicateToMedium(post.title, shortened, canonicalUrl);

      if (mediumResult.url) {
        log.push({
          slug: post.slug,
          platform: "medium",
          date: new Date().toISOString(),
          url: mediumResult.url,
        });
        results.push({ slug: post.slug, platform: "medium", status: "success", url: mediumResult.url });
      } else {
        // Log the attempt even on failure so we don't retry indefinitely
        log.push({
          slug: post.slug,
          platform: "medium",
          date: new Date().toISOString(),
        });
        results.push({ slug: post.slug, platform: "medium", status: `error — ${mediumResult.error}` });
      }
    }

    // Save updated log
    await saveSyndicationLog(log);

    return NextResponse.json({ success: true, results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Syndication failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
