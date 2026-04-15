import { NextRequest, NextResponse } from "next/server";
import { isGSCConfigured, getSearchQueries } from "@/lib/search-console";
import { commitFile, readFile } from "@/lib/github";
import { sendTelegramReport } from "@/lib/telegram-report";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Skip gracefully if GSC not configured
  if (!isGSCConfigured()) {
    return NextResponse.json({ skipped: true, reason: "GSC not configured" });
  }

  try {
    // Fetch last 28 days of search data
    const searchData = await getSearchQueries();
    if (!searchData) {
      return NextResponse.json({ error: "Failed to fetch search data" }, { status: 500 });
    }

    // Find content opportunities: high impressions, low CTR, position 8-20
    const opportunities = searchData.topQueries
      .filter((q) => q.position >= 8 && q.position <= 20 && q.impressions >= 10)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 20);

    if (opportunities.length === 0) {
      return NextResponse.json({ skipped: true, reason: "No content opportunities found" });
    }

    // Use Claude to generate blog topic suggestions
    const client = new Anthropic();
    const queryList = opportunities
      .map((q) => `- "${q.query}" (impressions: ${q.impressions}, position: ${q.position}, CTR: ${q.ctr}%)`)
      .join("\n");

    const aiResponse = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `You are an SEO content strategist for R2F Trading, an ICT/forex trading education brand.

Here are search queries where we rank on page 2 (positions 8-20) with high impressions but low CTR — these are content opportunities:

${queryList}

For each query (or group of related queries), suggest a blog post topic that could help us rank higher. Return a JSON array of objects with:
- "query": the original search query (or combined queries)
- "suggestedTitle": blog post title (<60 chars)
- "angle": brief description of the content angle (1-2 sentences)
- "priority": "high" or "medium" based on impression volume and position proximity to page 1
- "estimatedImpact": brief note on potential traffic gain

Return ONLY the JSON array, no markdown fencing.`,
        },
      ],
    });

    const aiText =
      aiResponse.content[0].type === "text" ? aiResponse.content[0].text : "";
    let suggestions: Array<{
      query: string;
      suggestedTitle: string;
      angle: string;
      priority: string;
      estimatedImpact: string;
    }> = [];

    try {
      suggestions = JSON.parse(aiText);
    } catch {
      // Try extracting JSON from response
      const match = aiText.match(/\[[\s\S]*\]/);
      if (match) {
        suggestions = JSON.parse(match[0]);
      }
    }

    // Load existing suggestions and merge
    let existing: typeof suggestions = [];
    try {
      const raw = await readFile("data/search-content-suggestions.json");
      existing = JSON.parse(raw);
    } catch {
      // First run
    }

    const result = {
      generatedAt: new Date().toISOString(),
      dateRange: searchData.dateRange,
      suggestions,
      searchStats: {
        totalClicks: searchData.totalClicks,
        totalImpressions: searchData.totalImpressions,
        avgCtr: searchData.avgCtr,
        avgPosition: searchData.avgPosition,
        opportunitiesFound: opportunities.length,
      },
      previousSuggestions: existing,
    };

    await commitFile(
      "data/search-content-suggestions.json",
      JSON.stringify(result, null, 2),
      `chore: update search content suggestions ${new Date().toISOString().split("T")[0]}`,
    );

    // Telegram notification with top 3
    const top3 = suggestions.slice(0, 3);
    if (top3.length > 0) {
      const tgMessage = [
        `🔍 *Search Content Opportunities*`,
        ``,
        `Found ${suggestions.length} content ideas from GSC data:`,
        ``,
        ...top3.map(
          (s, i) =>
            `${i + 1}. *${s.suggestedTitle}*\n   Query: "${s.query}"\n   Priority: ${s.priority}\n   ${s.estimatedImpact}`,
        ),
        ``,
        `📊 Last 28d: ${searchData.totalClicks} clicks, ${searchData.totalImpressions} impressions`,
        `View all: r2ftrading.com/admin/search-insights`,
      ].join("\n");

      await sendTelegramReport(tgMessage);
    }

    return NextResponse.json({
      success: true,
      suggestionsCount: suggestions.length,
      opportunitiesAnalyzed: opportunities.length,
    });
  } catch (err) {
    console.error("[content-from-search] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
