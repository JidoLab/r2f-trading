import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 120;

interface ReplySuggestion {
  id: string;
  platform: "youtube";
  postTitle: string;
  postUrl: string;
  authorName: string;
  suggestedReply: string;
  createdAt: string;
  status: "pending" | "used" | "skipped";
}

const SEARCH_QUERIES = [
  "ICT trading tutorial",
  "order blocks forex",
  "smart money concepts",
  "prop firm challenge",
];

async function getYouTubeAccessToken(): Promise<string | null> {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!tokenRes.ok) return null;
  const { access_token } = await tokenRes.json();
  return access_token;
}

async function searchYouTube(
  query: string,
  accessToken: string
): Promise<{ videoId: string; title: string; channelTitle: string }[]> {
  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    order: "date",
    maxResults: "5",
  });
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || []).map(
    (item: { id: { videoId: string }; snippet: { title: string; channelTitle: string } }) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
    })
  );
}

async function generateReply(
  title: string,
  author: string,
  anthropic: Anthropic
): Promise<string> {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `You are Harvest, an ICT trading coach at R2F Trading (r2ftrading.com). Write a thoughtful YouTube comment (3-5 sentences) for this video.

Video title: "${title}"
Channel: "${author}"

Rules:
- Be genuinely helpful and add value (share a tip, personal experience, or insight)
- Sound natural and conversational, not promotional
- Reference something specific from the video title
- End with something that encourages discussion
- Do NOT include links or direct self-promotion
- Do NOT use hashtags
- Keep it under 500 characters

Write ONLY the comment text, nothing else.`,
      },
    ],
  });
  const block = msg.content[0];
  return block.type === "text" ? block.text.trim() : "";
}

async function loadExistingSuggestions(): Promise<ReplySuggestion[]> {
  try {
    const raw = await readFile("data/reply-suggestions.json");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accessToken = await getYouTubeAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: "YouTube OAuth credentials not configured" },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const existing = await loadExistingSuggestions();
    const existingUrls = new Set(existing.map((s) => s.postUrl));
    const newSuggestions: ReplySuggestion[] = [];

    // Search YouTube for each query
    for (const query of SEARCH_QUERIES) {
      try {
        const videos = await searchYouTube(query, accessToken);
        for (const video of videos) {
          const url = `https://youtube.com/watch?v=${video.videoId}`;
          if (existingUrls.has(url)) continue;

          try {
            const reply = await generateReply(
              video.title,
              video.channelTitle,
              anthropic
            );
            if (reply) {
              newSuggestions.push({
                id: `sug-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                platform: "youtube",
                postTitle: video.title,
                postUrl: url,
                authorName: video.channelTitle,
                suggestedReply: reply,
                createdAt: new Date().toISOString(),
                status: "pending",
              });
              existingUrls.add(url);
            }
          } catch {
            // Skip this video if reply generation fails
          }
        }
      } catch {
        // Skip this query if search fails
      }
    }

    if (newSuggestions.length === 0) {
      return NextResponse.json({
        success: true,
        newCount: 0,
        message: "No new reply opportunities found",
      });
    }

    // Save all suggestions (existing + new)
    const allSuggestions = [...newSuggestions, ...existing];
    await commitFile(
      "data/reply-suggestions.json",
      JSON.stringify(allSuggestions, null, 2),
      `Added ${newSuggestions.length} reply suggestions`
    );

    // Notify via Telegram
    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_OWNER_CHAT_ID;
    if (tgToken && chatId) {
      const message = `🎯 Found ${newSuggestions.length} reply opportunit${newSuggestions.length === 1 ? "y" : "ies"} today!\n\nCheck your dashboard: r2ftrading.com/admin/reply-suggestions`;
      await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      newCount: newSuggestions.length,
      suggestions: newSuggestions.map((s) => ({
        id: s.id,
        title: s.postTitle,
        author: s.authorName,
      })),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
