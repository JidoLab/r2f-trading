import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import Anthropic from "@anthropic-ai/sdk";

const IDEAS_PATH = "data/content-ideas-from-comments.json";

interface ContentIdea {
  id: string;
  source: "reddit";
  postTitle: string;
  ourComment: string;
  score: number;
  suggestedTopic: string;
  suggestedAngle: string;
  date: string;
  subreddit: string;
  permalink?: string;
  generated?: boolean;
}

export async function GET() {
  try {
    const raw = await readFile(IDEAS_PATH);
    const ideas: ContentIdea[] = JSON.parse(raw);
    return NextResponse.json({ ideas: ideas.reverse() });
  } catch {
    return NextResponse.json({ ideas: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id } = body;

    if (action !== "generate" || !id) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Load ideas
    const raw = await readFile(IDEAS_PATH);
    const ideas: ContentIdea[] = JSON.parse(raw);
    const idea = ideas.find((i) => i.id === id);

    if (!idea) {
      return NextResponse.json({ error: "Idea not found" }, { status: 404 });
    }

    // Call the generate-post logic inline
    const anthropic = new Anthropic();
    const date = new Date().toISOString().split("T")[0];

    // Get existing titles
    let existingTitles: string[] = [];
    try {
      const { listFiles } = await import("@/lib/github");
      const files = await listFiles("content/blog", ".mdx");
      existingTitles = files.map((f) =>
        f.replace(/^content\/blog\//, "").replace(/\.mdx$/, "")
      );
    } catch {
      /* no posts yet */
    }

    const articleResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 5000,
      messages: [
        {
          role: "user",
          content: `Write a blog article for R2F Trading (r2ftrading.com).
AUTHOR: Harvest Wright — sole mentor, 10+ years ICT trading experience, TradingView Editors' Pick, Top 1% in competitions, FTMO Challenge passer.
TOPIC: "${idea.suggestedTopic}"
ANGLE: ${idea.suggestedAngle}
CONTEXT: This topic was inspired by a high-performing Reddit comment (${idea.score} upvotes) on r/${idea.subreddit}. Original post: "${idea.postTitle}". Our comment that resonated: "${idea.ourComment.slice(0, 300)}"
DATE: ${date}
COACHING: Lite $150/week, Pro $200/week, Full Mentorship $1,000/4 months.
INTERNAL LINKS (use 2-4 naturally):
- [coaching plans](/coaching)
- [book a free discovery call](/contact)
- [trading insights](/trading-insights)
- [student results](/results)
${existingTitles.length > 0 ? `RELATED POSTS:\n${existingTitles.slice(0, 10).map((t) => `- [${t.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " ")}](/trading-insights/${t})`).join("\n")}` : ""}
Write 1200-1800 words, first person as Harvest.
TITLE RULES: Under 60 characters, short and punchy.
SEO: Target keyword must appear in first paragraph, first ## header, and 3-5 times naturally.
Return ONLY JSON: { "title": "...", "seoTitle": "...", "excerpt": "...", "seoDescription": "...", "seoKeywords": [...], "tags": [...], "postType": "...", "body": "..." }`,
        },
      ],
    });

    let articleText =
      articleResponse.content[0].type === "text"
        ? articleResponse.content[0].text
        : "";
    articleText = articleText
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "")
      .trim();
    const article = JSON.parse(articleText);

    const slugify = (text: string) =>
      text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    const slug = `${date}-${slugify(article.title)}`;

    // Commit MDX
    const mdxContent = `export const metadata = {
  title: ${JSON.stringify(article.title)},
  seoTitle: ${JSON.stringify(article.seoTitle)},
  date: "${date}",
  excerpt: ${JSON.stringify(article.excerpt)},
  seoDescription: ${JSON.stringify(article.seoDescription)},
  seoKeywords: ${JSON.stringify(article.seoKeywords)},
  coverImage: "",
  tags: ${JSON.stringify(article.tags)},
  postType: ${JSON.stringify(article.postType || "how-to")},
  sourceComment: ${JSON.stringify({ subreddit: idea.subreddit, score: idea.score, postTitle: idea.postTitle })},
}

${article.body}
`;

    await commitFile(
      `content/blog/${slug}.mdx`,
      mdxContent,
      `Blog from comment idea: ${article.title}`
    );

    // Mark idea as generated
    idea.generated = true;
    await commitFile(
      IDEAS_PATH,
      JSON.stringify(ideas, null, 2),
      "Mark content idea as generated"
    );

    return NextResponse.json({
      success: true,
      title: article.title,
      slug,
    });
  } catch (err: unknown) {
    console.error("[content-ideas] Generate error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
