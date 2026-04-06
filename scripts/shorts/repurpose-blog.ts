import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

/**
 * Phase 11: Blog-to-Shorts Repurposing
 * Takes a blog post and generates 2-3 Short scripts from it.
 */
async function repurposeBlog(blogSlug: string) {
  console.log(`📝 Repurposing blog post: ${blogSlug}\n`);

  // Read blog content
  const blogPath = path.join(process.cwd(), "content", "blog", `${blogSlug}.mdx`);
  let blogContent = "";

  if (fs.existsSync(blogPath)) {
    blogContent = fs.readFileSync(blogPath, "utf-8");
  } else {
    try {
      const { readFile } = await import("../../src/lib/github.js");
      blogContent = await readFile(`content/blog/${blogSlug}.mdx`);
    } catch {
      console.error("Blog post not found:", blogSlug);
      process.exit(1);
    }
  }

  // Extract title and body
  const titleMatch = blogContent.match(/title:\s*"([^"]*)"/);
  const title = titleMatch ? titleMatch[1] : blogSlug;

  // Strip metadata
  const body = blogContent.replace(/export\s+const\s+metadata[\s\S]*?\n\}/, "").trim();

  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: `Given this blog post, generate 3 YouTube Shorts topic ideas from different angles.

BLOG TITLE: "${title}"
BLOG CONTENT (first 1000 chars): ${body.slice(0, 1000)}

For each Short, provide:
1. A specific angle/hook (not just summarizing the blog)
2. Which content type works best (listicle, chart-breakdown, myth-buster, pov, quiz, etc.)

Return ONLY JSON (no code fences):
[
  {"topic": "specific short topic", "contentType": "type_id", "angle": "how this differs from the blog"},
  {"topic": "...", "contentType": "...", "angle": "..."},
  {"topic": "...", "contentType": "...", "angle": "..."}
]`,
    }],
  });

  let text = response.content[0].type === "text" ? response.content[0].text : "";
  text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
  const ideas = JSON.parse(text);

  console.log(`Generated ${ideas.length} Short ideas:\n`);
  ideas.forEach((idea: any, i: number) => {
    console.log(`${i + 1}. [${idea.contentType}] ${idea.topic}`);
    console.log(`   Angle: ${idea.angle}\n`);
  });

  // Save ideas
  const outputPath = path.join(process.cwd(), "scripts", "shorts", "repurpose-ideas.json");
  fs.writeFileSync(outputPath, JSON.stringify({ blogSlug, blogTitle: title, ideas, generatedAt: new Date().toISOString() }, null, 2));
  console.log(`Saved to: ${outputPath}`);
  console.log(`\nTo create a Short from idea #1: npm run create-short "${ideas[0].topic}" ${ideas[0].contentType}`);
}

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: npx tsx scripts/shorts/repurpose-blog.ts <blog-slug>");
  process.exit(1);
}
repurposeBlog(slug).catch(console.error);
