import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import { sendTelegramReport } from "@/lib/telegram-report";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 120;

const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";

const COMPETITORS = [
  { name: "ICT (Inner Circle Trader)", channel: "@InnerCircleTrader" },
  { name: "The Trading Channel", channel: "@TheTradingChannel" },
  { name: "MentFX", channel: "@MentFX" },
  { name: "TradoVate", channel: "@Tradovate" },
];

const WATCH_LOG_PATH = "data/competitor-watch-log.json";
const IDEAS_PATH = "data/content-ideas-from-comments.json";

interface WatchLogEntry {
  channelName: string;
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  detectedAt: string;
  ideaGenerated: boolean;
}

interface ContentIdea {
  id: string;
  source: "competitor";
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

async function ytFetch(endpoint: string, params: Record<string, string>) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY not set");
  const url = new URL(`${YOUTUBE_API}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", apiKey);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
  return res.json();
}

async function loadWatchLog(): Promise<WatchLogEntry[]> {
  try {
    const raw = await readFile(WATCH_LOG_PATH);
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveWatchLog(log: WatchLogEntry[]): Promise<void> {
  await commitFile(
    WATCH_LOG_PATH,
    JSON.stringify(log, null, 2),
    "Competitor watch: update log"
  );
}

async function loadIdeas(): Promise<ContentIdea[]> {
  try {
    const raw = await readFile(IDEAS_PATH);
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveIdeas(ideas: ContentIdea[]): Promise<void> {
  await commitFile(
    IDEAS_PATH,
    JSON.stringify(ideas, null, 2),
    "Competitor watch: add content ideas"
  );
}

async function getChannelId(handle: string): Promise<string | null> {
  try {
    const result = await ytFetch("search", {
      part: "snippet",
      q: handle,
      type: "channel",
      maxResults: "1",
    });
    return result.items?.[0]?.id?.channelId || null;
  } catch {
    return null;
  }
}

async function getLatestVideo(
  channelId: string
): Promise<{ videoId: string; title: string; description: string; publishedAt: string } | null> {
  try {
    const result = await ytFetch("search", {
      part: "snippet",
      channelId,
      order: "date",
      maxResults: "1",
      type: "video",
    });
    const item = result.items?.[0];
    if (!item) return null;
    return {
      videoId: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description || "",
      publishedAt: item.snippet.publishedAt,
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.YOUTUBE_API_KEY) {
    return NextResponse.json({ error: "YOUTUBE_API_KEY not set" }, { status: 500 });
  }

  try {
    const watchLog = await loadWatchLog();
    const seenVideoIds = new Set(watchLog.map((e) => e.videoId));
    const ideas = await loadIdeas();

    const anthropic = new Anthropic();
    const newVideos: WatchLogEntry[] = [];
    const newIdeas: ContentIdea[] = [];

    // Check max 5 competitor channels per run
    const competitorsToCheck = COMPETITORS.slice(0, 5);

    for (const competitor of competitorsToCheck) {
      try {
        const channelId = await getChannelId(competitor.channel);
        if (!channelId) {
          console.error(`[competitor-watch] Could not find channel: ${competitor.channel}`);
          continue;
        }

        const latest = await getLatestVideo(channelId);
        if (!latest) continue;

        // Skip if already seen
        if (seenVideoIds.has(latest.videoId)) continue;

        // New video detected
        const logEntry: WatchLogEntry = {
          channelName: competitor.name,
          videoId: latest.videoId,
          title: latest.title,
          description: latest.description,
          publishedAt: latest.publishedAt,
          detectedAt: new Date().toISOString(),
          ideaGenerated: false,
        };

        // Use Claude to analyze and suggest counter-content
        try {
          const response = await anthropic.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 400,
            messages: [
              {
                role: "user",
                content: `You are a content strategist for R2F Trading, an ICT trading coaching brand — a dedicated ICT coaching brand.

A competitor just posted a new YouTube video. Suggest a counter-content idea that either:
- Covers the same topic from a better/different angle
- Fills a gap they missed
- Directly competes with a superior take

COMPETITOR: ${competitor.name}
VIDEO TITLE: ${latest.title}
VIDEO DESCRIPTION: ${latest.description.slice(0, 500)}

Return ONLY a JSON object:
{ "topic": "Blog title under 60 chars", "angle": "1-2 sentence description of how our content would be better or different" }`,
              },
            ],
          });

          let text =
            response.content[0].type === "text"
              ? response.content[0].text.trim()
              : "";
          text = text
            .replace(/^```(?:json)?\s*\n?/, "")
            .replace(/\n?```\s*$/, "")
            .trim();
          const ideaData = JSON.parse(text);

          const idea: ContentIdea = {
            id: `competitor-${latest.videoId}-${Date.now()}`,
            source: "competitor",
            postTitle: latest.title,
            ourComment: `Competitor: ${competitor.name}`,
            score: 0,
            suggestedTopic: ideaData.topic,
            suggestedAngle: ideaData.angle,
            date: new Date().toISOString(),
            subreddit: "",
            permalink: `https://youtube.com/watch?v=${latest.videoId}`,
          };

          newIdeas.push(idea);
          logEntry.ideaGenerated = true;

          // Send Telegram alert
          await sendTelegramReport(
            `🔍 *Competitor Alert*: ${competitor.name} just posted '${latest.title.slice(0, 80)}'\n\nContent idea: ${ideaData.topic}\nAngle: ${ideaData.angle}`
          );
        } catch (err) {
          console.error(
            `[competitor-watch] Failed to generate idea for ${competitor.name}:`,
            err
          );
          // Still log the video even if idea generation fails
          await sendTelegramReport(
            `🔍 *Competitor Alert*: ${competitor.name} just posted '${latest.title.slice(0, 100)}'`
          );
        }

        newVideos.push(logEntry);
        seenVideoIds.add(latest.videoId);
      } catch (err) {
        console.error(
          `[competitor-watch] Error checking ${competitor.name}:`,
          err
        );
      }
    }

    // Save updates
    if (newVideos.length > 0) {
      await saveWatchLog([...newVideos, ...watchLog]);
    }
    if (newIdeas.length > 0) {
      await saveIdeas([...ideas, ...newIdeas]);
    }

    return NextResponse.json({
      success: true,
      checked: competitorsToCheck.length,
      newVideos: newVideos.length,
      newIdeas: newIdeas.length,
      videos: newVideos.map((v) => ({
        channel: v.channelName,
        title: v.title,
      })),
    });
  } catch (err: unknown) {
    console.error("[competitor-watch] Fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
