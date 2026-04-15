import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, commitFile } from "@/lib/github";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

interface ReplySuggestion {
  id: string;
  platform: "youtube" | "facebook_group" | "linkedin" | "medium" | "quora" | "tradingview" | "forexfactory" | "babypips";
  postTitle: string;
  postUrl: string;
  authorName: string;
  suggestedReply: string;
  createdAt: string;
  status: "pending" | "used" | "skipped";
}

async function loadSuggestions(): Promise<ReplySuggestion[]> {
  try {
    const raw = await readFile("data/reply-suggestions.json");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Count-only mode: return pending suggestion count
  const countPending = req.nextUrl.searchParams.get("countPending") === "true";
  if (countPending) {
    const all = await loadSuggestions();
    const pendingCount = all.filter((s) => s.status === "pending").length;
    return NextResponse.json({ pendingCount });
  }

  const platform = req.nextUrl.searchParams.get("platform");

  let suggestions = await loadSuggestions();
  // newest first
  suggestions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (platform) {
    suggestions = suggestions.filter((s) => s.platform === platform);
  }

  return NextResponse.json({ suggestions });
}

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { action, id } = await req.json();
    if (!action || !id) {
      return NextResponse.json(
        { error: "action and id are required" },
        { status: 400 }
      );
    }

    const suggestions = await loadSuggestions();
    const index = suggestions.findIndex((s) => s.id === id);
    if (index === -1) {
      return NextResponse.json(
        { error: "Suggestion not found" },
        { status: 404 }
      );
    }

    if (action === "markUsed") {
      suggestions[index].status = "used";
      await commitFile(
        "data/reply-suggestions.json",
        JSON.stringify(suggestions, null, 2),
        `Marked reply suggestion as used: ${suggestions[index].postTitle.slice(0, 30)}`
      );
      return NextResponse.json({ success: true, status: "used" });
    }

    if (action === "skip") {
      suggestions[index].status = "skipped";
      await commitFile(
        "data/reply-suggestions.json",
        JSON.stringify(suggestions, null, 2),
        `Skipped reply suggestion: ${suggestions[index].postTitle.slice(0, 30)}`
      );
      return NextResponse.json({ success: true, status: "skipped" });
    }

    if (action === "regenerate") {
      const suggestion = suggestions[index];
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `You are Harvest, an ICT trading coach at R2F Trading (r2ftrading.com). Write a thoughtful YouTube comment (3-5 sentences) for this video.

Video title: "${suggestion.postTitle}"
Channel: "${suggestion.authorName}"

Rules:
- Be genuinely helpful and add value (share a tip, personal experience, or insight)
- Sound natural and conversational, not promotional
- Reference something specific from the video title
- End with something that encourages discussion
- Do NOT include links or direct self-promotion
- Do NOT use hashtags
- Keep it under 500 characters
- Write something DIFFERENT from this previous reply: "${suggestion.suggestedReply.slice(0, 100)}..."

Write ONLY the comment text, nothing else.`,
          },
        ],
      });

      const block = msg.content[0];
      const newReply = block.type === "text" ? block.text.trim() : "";
      if (!newReply) {
        return NextResponse.json(
          { error: "Failed to generate new reply" },
          { status: 500 }
        );
      }

      suggestions[index].suggestedReply = newReply;
      suggestions[index].status = "pending";
      await commitFile(
        "data/reply-suggestions.json",
        JSON.stringify(suggestions, null, 2),
        `Regenerated reply for: ${suggestion.postTitle.slice(0, 30)}`
      );

      return NextResponse.json({
        success: true,
        suggestedReply: newReply,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'markUsed', 'skip', or 'regenerate'." },
      { status: 400 }
    );
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to process suggestion";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
