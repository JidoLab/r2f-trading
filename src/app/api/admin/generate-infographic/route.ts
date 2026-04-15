import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, commitFile } from "@/lib/github";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const SITE_URL = "https://r2ftrading.com";

function extractBody(content: string): string {
  return content.replace(/export\s+const\s+metadata\s*=\s*\{[\s\S]*?\n\}\s*\n*/, "").trim();
}

function extractTitle(content: string): string {
  const match = content.match(/title:\s*(?:"([^"]+)"|'([^']+)'|`([^`]+)`)/);
  return match?.[1] || match?.[2] || match?.[3] || "Trading Insights";
}

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { blogSlug, topic, stats } = body as {
      blogSlug?: string;
      topic?: string;
      stats?: string[];
    };

    let title = topic || "Trading Insights";
    let points: string[] = stats || [];

    // If blogSlug provided, extract content from blog post
    if (blogSlug) {
      const content = await readFile(`content/blog/${blogSlug}.mdx`);
      title = extractTitle(content);
      const articleBody = extractBody(content);

      // Use Claude to extract key takeaways
      const anthropic = new Anthropic();
      const res = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `Extract 3-5 key takeaways from this trading article. Each should be a concise, actionable insight (under 80 characters each). Return ONLY a JSON array of strings.

TITLE: ${title}

ARTICLE:
${articleBody.slice(0, 3000)}`,
          },
        ],
      });

      let takeawayText = res.content[0].type === "text" ? res.content[0].text : "[]";
      takeawayText = takeawayText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
      points = JSON.parse(takeawayText);
    }

    if (points.length === 0) {
      return NextResponse.json(
        { error: "No stats/points provided and no blog slug given" },
        { status: 400 }
      );
    }

    // Generate infographic by fetching the dynamic route
    const slug = blogSlug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const params = new URLSearchParams({
      title,
      points: points.join("|"),
    });
    const infographicUrl = `${SITE_URL}/infographic/${slug}?${params.toString()}`;

    // Fetch the image from our own OG endpoint
    const imgRes = await fetch(infographicUrl);
    if (!imgRes.ok) {
      return NextResponse.json(
        { error: `Infographic render failed: ${imgRes.status}` },
        { status: 500 }
      );
    }

    const imgBuffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(imgBuffer).toString("base64");

    // Save to GitHub
    const filePath = `public/infographics/${slug}.png`;
    await commitFile(filePath, base64, `Add infographic: ${slug}`, true);

    const publicUrl = `${SITE_URL}/infographics/${slug}.png`;

    return NextResponse.json({
      success: true,
      slug,
      url: publicUrl,
      infographicUrl,
      points,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Infographic generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
