import { NextRequest, NextResponse } from "next/server";
import { commitFile, readFile, listFiles } from "@/lib/github";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 120;

interface AutoLinkLogEntry {
  slug: string;
  date: string;
  linksAdded: number;
}

interface PostMeta {
  slug: string;
  title: string;
  path: string;
}

function extractFrontmatter(raw: string): { title: string; slug: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { title: "", slug: "" };
  const fm = match[1];
  const titleMatch = fm.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  const slugMatch = fm.match(/^slug:\s*["']?(.+?)["']?\s*$/m);
  return {
    title: titleMatch ? titleMatch[1] : "",
    slug: slugMatch ? slugMatch[1] : "",
  };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Read the auto-link log to know which posts have been processed
    let log: AutoLinkLogEntry[] = [];
    try {
      const logRaw = await readFile("data/auto-link-log.json");
      log = JSON.parse(logRaw);
    } catch {
      // File doesn't exist yet
    }
    const processedSlugs = new Set(log.map((e) => e.slug));

    // 2. List all blog posts
    const blogFiles = await listFiles("content/blog", ".mdx");
    if (blogFiles.length === 0) {
      return NextResponse.json({ message: "No blog posts found" });
    }

    // 3. Read all posts to get titles and slugs for the link catalog
    const allPosts: PostMeta[] = [];
    const postContents: Map<string, string> = new Map();

    for (const filePath of blogFiles) {
      try {
        const raw = await readFile(filePath);
        const { title, slug } = extractFrontmatter(raw);
        if (title && slug) {
          allPosts.push({ slug, title, path: filePath });
          postContents.set(slug, raw);
        }
      } catch {
        // Skip unreadable files
      }
    }

    // 4. Find posts that haven't been auto-linked yet (limit to 3 per run)
    const toProcess = allPosts
      .filter((p) => !processedSlugs.has(p.slug))
      .slice(0, 3);

    if (toProcess.length === 0) {
      return NextResponse.json({ message: "All posts have been auto-linked" });
    }

    // 5. Build the catalog of all posts for Claude to reference
    const postCatalog = allPosts
      .map((p) => `- "${p.title}" -> /trading-insights/${p.slug}`)
      .join("\n");

    const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const results: { slug: string; linksAdded: number }[] = [];

    for (const post of toProcess) {
      const rawContent = postContents.get(post.slug);
      if (!rawContent) continue;

      // Check if the post already has internal links
      const bodyAfterFrontmatter = rawContent.replace(/^---\n[\s\S]*?\n---\n?/, "");
      const existingInternalLinks = (bodyAfterFrontmatter.match(/\[.*?\]\(\/trading-insights\//g) || []).length;

      if (existingInternalLinks >= 2) {
        // Already has enough internal links, mark as done
        log.push({ slug: post.slug, date: new Date().toISOString(), linksAdded: 0 });
        results.push({ slug: post.slug, linksAdded: 0 });
        continue;
      }

      // 6. Ask Claude to add internal links
      const otherPosts = postCatalog
        .split("\n")
        .filter((line) => !line.includes(`/trading-insights/${post.slug}`))
        .join("\n");

      const response = await claude.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: `You are an SEO expert. I need you to add 2-3 internal links to this blog post, linking to other related articles on our site.

## Available articles to link to:
${otherPosts}

## Current blog post (MDX format):
${rawContent}

## Rules:
1. Pick 2-3 articles from the list above that are topically related to this post.
2. Insert markdown links naturally within existing sentences or at logical transition points.
3. Do NOT add a "Related Articles" section at the bottom - weave links into the existing text.
4. Do NOT modify the frontmatter (the --- section at the top).
5. Do NOT change any existing content except to insert the internal links.
6. Links must use the format: [anchor text](/trading-insights/slug)
7. The anchor text should flow naturally in the sentence.
8. Return ONLY the complete modified MDX file content, nothing else. No explanation, no code fences.`,
          },
        ],
      });

      const modifiedContent =
        response.content[0].type === "text" ? response.content[0].text.trim() : null;

      if (!modifiedContent) continue;

      // Verify the output still has frontmatter and isn't mangled
      if (!modifiedContent.startsWith("---")) continue;

      // Count how many new internal links were added
      const newBodyAfterFm = modifiedContent.replace(/^---\n[\s\S]*?\n---\n?/, "");
      const newInternalLinks = (newBodyAfterFm.match(/\[.*?\]\(\/trading-insights\//g) || []).length;
      const linksAdded = newInternalLinks - existingInternalLinks;

      if (linksAdded > 0) {
        // Commit the updated file
        await commitFile(
          post.path,
          modifiedContent,
          `Auto-link: added ${linksAdded} internal links to "${post.title.slice(0, 40)}"`
        );
      }

      log.push({
        slug: post.slug,
        date: new Date().toISOString(),
        linksAdded: Math.max(linksAdded, 0),
      });
      results.push({ slug: post.slug, linksAdded: Math.max(linksAdded, 0) });
    }

    // 7. Save updated log
    await commitFile(
      "data/auto-link-log.json",
      JSON.stringify(log, null, 2),
      `Auto-link log: processed ${results.length} posts`
    );

    return NextResponse.json({
      processed: results.length,
      results,
    });
  } catch (err) {
    console.error("[auto-link] Error:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
