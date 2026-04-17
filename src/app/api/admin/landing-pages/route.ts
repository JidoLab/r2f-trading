import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, commitFile, deleteFile, listFiles } from "@/lib/github";
import Anthropic from "@anthropic-ai/sdk";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// GET: list all landing pages
export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const files = await listFiles("data/landing-pages", ".json");
    const pages = await Promise.all(
      files.map(async (filePath) => {
        try {
          const raw = await readFile(filePath);
          const data = JSON.parse(raw);
          return {
            slug: data.slug,
            title: data.title,
            seoTitle: data.seoTitle,
            targetKeyword: data.targetKeyword,
            createdAt: data.createdAt,
          };
        } catch {
          return null;
        }
      })
    );

    return NextResponse.json({
      pages: pages.filter(Boolean),
    });
  } catch {
    return NextResponse.json({ pages: [] });
  }
}

// POST: generate a new landing page using Claude
export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { topic, targetKeyword } = await req.json();
    if (!topic || !targetKeyword) {
      return NextResponse.json(
        { error: "topic and targetKeyword are required" },
        { status: 400 }
      );
    }

    const slug = slugify(targetKeyword);

    // Check if page already exists
    try {
      await readFile(`data/landing-pages/${slug}.json`);
      return NextResponse.json(
        { error: `Landing page "${slug}" already exists` },
        { status: 409 }
      );
    } catch {
      // Doesn't exist, good
    }

    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `You are a content strategist for R2F Trading (r2ftrading.com), an ICT trading coaching business — a dedicated ICT coaching brand.

Generate a landing page for the topic: "${topic}"
Target keyword: "${targetKeyword}"

Return ONLY a JSON object with these fields:
{
  "title": "Short page title (under 40 chars)",
  "seoTitle": "SEO-optimized title (under 70 chars) including the target keyword",
  "seoDescription": "Meta description (under 160 chars) with target keyword, compelling and action-oriented",
  "headline": "Attention-grabbing headline that addresses a pain point (under 80 chars)",
  "subheadline": "Supporting text that expands on the headline benefit (1-2 sentences)",
  "keyPoints": [
    { "icon": "emoji", "title": "Point title (under 40 chars)", "text": "2-3 sentence explanation" }
  ],
  "relatedTags": ["tag1", "tag2", "tag3"]
}

Requirements:
- 5 key points covering: what it is, why it matters, how to use it, common mistakes, and next steps
- relatedTags should match likely blog post tags (lowercase, hyphenated)
- Headline should be benefit-driven, not feature-driven
- All copy should speak to forex/futures traders learning ICT methodology
- Include the target keyword naturally in the seoTitle, seoDescription, and headline
- Icons should be relevant emojis (not generic)`,
        },
      ],
    });

    let text =
      response.content[0].type === "text" ? response.content[0].text : "";
    text = text
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "")
      .trim();
    const generated = JSON.parse(text);

    const pageData = {
      slug,
      title: generated.title,
      seoTitle: generated.seoTitle,
      seoDescription: generated.seoDescription,
      headline: generated.headline,
      subheadline: generated.subheadline,
      keyPoints: generated.keyPoints,
      relatedTags: generated.relatedTags,
      testimonialIndex: Math.floor(Math.random() * 4),
      createdAt: new Date().toISOString(),
      targetKeyword,
    };

    await commitFile(
      `data/landing-pages/${slug}.json`,
      JSON.stringify(pageData, null, 2),
      `Add landing page: ${generated.title}`
    );

    // Notify IndexNow
    try {
      const { notifyIndexNow } = await import("@/lib/indexnow");
      await notifyIndexNow([`/learn/${slug}`, `/sitemap.xml`]);
    } catch {
      // IndexNow notification is optional
    }

    return NextResponse.json({ success: true, page: pageData });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE: remove a landing page
export async function DELETE(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await req.json();
    if (!slug) {
      return NextResponse.json(
        { error: "slug is required" },
        { status: 400 }
      );
    }

    await deleteFile(
      `data/landing-pages/${slug}.json`,
      `Remove landing page: ${slug}`
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
