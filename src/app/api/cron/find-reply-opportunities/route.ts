import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 120;

interface ReplySuggestion {
  id: string;
  platform: "youtube" | "facebook_group" | "linkedin" | "medium";
  postTitle: string;
  postUrl: string;
  authorName: string;
  suggestedReply: string;
  createdAt: string;
  status: "pending" | "used" | "skipped";
}

interface PostResult {
  postTitle: string;
  postUrl: string;
  authorName: string;
  platform: "facebook_group" | "linkedin" | "medium";
}

const SEARCH_QUERIES = [
  "ICT trading strategy",
  "day trading tutorial",
  "prop firm challenge strategy",
  "how to get funded trading",
  "trading psychology tips",
  "price action trading",
  "smart money concepts",
  "order blocks trading",
  "risk management trading",
  "forex market analysis",
  "swing trading strategy",
  "supply and demand trading",
  "trading mistakes to avoid",
  "scalping strategy",
  "FTMO challenge tips",
  "fair value gap trading",
  "liquidity sweep trading",
  "break of structure",
  "killzone trading strategy",
  "ICT concepts explained",
  "forex beginner tips",
  "prop trading tips",
  "smart money trading",
  "price action patterns",
  "funded trader tips",
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

// Characters/scripts that indicate non-English content
const NON_ENGLISH_PATTERNS = /[\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF\u0400-\u04FF\u0980-\u09FF\u0A00-\u0A7F]/;

function isLikelyEnglish(text: string): boolean {
  // Reject if title has any non-Latin script characters
  if (NON_ENGLISH_PATTERNS.test(text)) return false;
  // Strip emojis and special chars for ratio check
  const cleaned = text.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}#@&*|]/gu, "").trim();
  if (cleaned.length < 5) return false;
  // Require at least 50% ASCII letters (stricter than before)
  const asciiCount = (cleaned.match(/[a-zA-Z]/g) || []).length;
  return asciiCount > cleaned.length * 0.5;
}

interface VideoResult {
  videoId: string;
  title: string;
  channelTitle: string;
  viewCount?: number;
  subscriberCount?: number;
  commentCount?: number;
}

async function searchYouTube(
  query: string,
  accessTokenOrApiKey: string,
  useApiKey: boolean = false
): Promise<VideoResult[]> {
  // Only find videos from the last 14 days (fresher = more engagement opportunity)
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    order: "date",
    maxResults: "25",
    relevanceLanguage: "en",
    publishedAfter: fourteenDaysAgo,
    ...(useApiKey ? { key: accessTokenOrApiKey } : {}),
  });
  const headers: Record<string, string> = useApiKey ? {} : { Authorization: `Bearer ${accessTokenOrApiKey}` };
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params}`,
    { headers }
  );
  if (!res.ok) {
    console.error(`[reply-opps] YouTube search failed: ${res.status} ${await res.text().catch(() => "")}`);
    return [];
  }
  const data = await res.json();
  const rawVideos = (data.items || []).map(
    (item: { id: { videoId: string }; snippet: { title: string; channelTitle: string } }) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
    })
  );

  // Filter out non-English titles
  const englishVideos = rawVideos.filter((v: VideoResult) => isLikelyEnglish(v.title));

  // Get video stats + content details (duration) + channel stats (subscribers) to filter by quality
  if (englishVideos.length === 0) return [];
  const videoIds = englishVideos.map((v: VideoResult) => v.videoId).join(",");
  const statsParams = new URLSearchParams({
    part: "statistics,contentDetails",
    id: videoIds,
    ...(useApiKey ? { key: accessTokenOrApiKey } : {}),
  });
  const statsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${statsParams}`,
    { headers }
  );

  if (statsRes.ok) {
    const statsData = await statsRes.json();
    const statsMap = new Map<string, { viewCount: number; commentCount: number; durationSeconds: number; channelId: string }>();
    for (const item of statsData.items || []) {
      // Parse ISO 8601 duration (PT1M30S, PT5M, PT1H2M3S)
      const dur = item.contentDetails?.duration || "PT0S";
      const hMatch = dur.match(/(\d+)H/);
      const mMatch = dur.match(/(\d+)M/);
      const sMatch = dur.match(/(\d+)S/);
      const seconds = (parseInt(hMatch?.[1] || "0") * 3600) + (parseInt(mMatch?.[1] || "0") * 60) + parseInt(sMatch?.[1] || "0");

      statsMap.set(item.id, {
        viewCount: parseInt(item.statistics?.viewCount || "0"),
        commentCount: parseInt(item.statistics?.commentCount || "0"),
        durationSeconds: seconds,
        channelId: item.snippet?.channelId || "",
      });
    }

    // Get channel subscriber counts for all unique channels
    const channelIds = [...new Set([...statsMap.values()].map(s => s.channelId).filter(Boolean))];
    const channelSubMap = new Map<string, number>();
    if (channelIds.length > 0) {
      try {
        const chParams = new URLSearchParams({
          part: "statistics",
          id: channelIds.join(","),
          ...(useApiKey ? { key: accessTokenOrApiKey } : {}),
        });
        const chRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?${chParams}`, { headers });
        if (chRes.ok) {
          const chData = await chRes.json();
          for (const ch of chData.items || []) {
            channelSubMap.set(ch.id, parseInt(ch.statistics?.subscriberCount || "0"));
          }
        }
      } catch {}
    }

    // Enrich videos with stats and filter strictly
    return englishVideos
      .map((v: VideoResult) => {
        const stats = statsMap.get(v.videoId);
        const subs = stats?.channelId ? (channelSubMap.get(stats.channelId) || 0) : 0;
        return { ...v, viewCount: stats?.viewCount || 0, commentCount: stats?.commentCount || 0, subscriberCount: subs, durationSeconds: stats?.durationSeconds || 0 };
      })
      .filter((v: VideoResult & { durationSeconds?: number }) => {
        // Skip shorts and very short videos (under 90 seconds)
        if ((v.durationSeconds || 0) < 90) return false;
        // Skip channels with fewer than 1,000 subscribers (was 3,000 — too strict)
        if ((v.subscriberCount || 0) < 1000) return false;
        // Skip videos with very low views
        if ((v.viewCount || 0) < 50) return false;
        // Skip videos with 800+ comments (comment gets buried)
        if ((v.commentCount || 0) > 800) return false;
        return true;
      });
  }

  return englishVideos;
}

// --- Facebook Groups search ---

const FACEBOOK_GROUP_IDS = [
  "1234134567041121",
  "1569903603479499",
  "573002290876745",
  "1425449218412630",
  "724343444931953",
  "564040462277033",
  "3435895479958334",
];

const SPAM_KEYWORDS = [
  "signal",
  "telegram group",
  "join my",
  "free signals",
  "vip",
  "\u{1F4B0}\u{1F4B0}\u{1F4B0}",
];

const SPAM_LINK_PATTERNS = /t\.me\/|discord\.gg\//i;
const TRIPLE_EMOJI_PATTERN = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]{3,}/u;

function isFacebookSpam(message: string): boolean {
  const lower = message.toLowerCase();
  if (SPAM_KEYWORDS.some((kw) => lower.includes(kw))) return true;
  if (SPAM_LINK_PATTERNS.test(message)) return true;
  if (TRIPLE_EMOJI_PATTERN.test(message)) return true;
  return false;
}

async function searchFacebookGroups(): Promise<PostResult[]> {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!token) {
    console.error("[reply-opps] No FACEBOOK_PAGE_ACCESS_TOKEN");
    return [];
  }

  const results: PostResult[] = [];
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  for (const groupId of FACEBOOK_GROUP_IDS) {
    try {
      const params = new URLSearchParams({
        fields: "id,message,from,created_time,permalink_url",
        limit: "5",
        access_token: token,
      });
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${groupId}/feed?${params}`
      );
      if (!res.ok) {
        console.error(`[reply-opps] FB group ${groupId} failed: ${res.status}`);
        continue;
      }
      const data = await res.json();
      for (const post of data.data || []) {
        if (!post.message) continue;
        const createdAt = new Date(post.created_time);
        if (createdAt < twentyFourHoursAgo) continue;
        if (isFacebookSpam(post.message)) continue;
        if (!isLikelyEnglish(post.message)) continue;

        const title =
          post.message.length > 120
            ? post.message.slice(0, 117) + "..."
            : post.message;
        results.push({
          postTitle: title,
          postUrl: post.permalink_url || `https://www.facebook.com/${post.id}`,
          authorName: post.from?.name || "Unknown",
          platform: "facebook_group",
        });
      }
    } catch {
      // Skip this group on error
    }
  }
  return results;
}

// --- LinkedIn suggestions ---

const LINKEDIN_TOPICS = [
  "ICT trading concepts every trader should learn",
  "order blocks and liquidity sweeps in forex",
  "smart money concepts for prop firm traders",
  "trading psychology and discipline for funded accounts",
  "break of structure and market structure shift",
  "fair value gaps and imbalance trading",
  "risk management for FTMO challenge",
];

async function searchLinkedIn(): Promise<PostResult[]> {
  // LinkedIn API doesn't allow searching other people's posts easily.
  // Instead, generate topic-based suggestions that Harvest can use
  // when he finds relevant posts on LinkedIn himself.
  const results: PostResult[] = [];
  const shuffled = [...LINKEDIN_TOPICS].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 4);

  for (const topic of selected) {
    const searchUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(topic)}`;
    results.push({
      postTitle: topic,
      postUrl: searchUrl,
      authorName: "LinkedIn Search",
      platform: "linkedin",
    });
  }
  return results;
}

// --- Medium search ---

const MEDIUM_RSS_TAGS = ["forex-trading", "trading", "day-trading"];

function parseRssItems(
  xml: string
): Array<{ title: string; link: string; creator: string }> {
  const items: Array<{ title: string; link: string; creator: string }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const titleMatch = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    const linkMatch = block.match(/<link>(.*?)<\/link>/);
    const creatorMatch = block.match(
      /<dc:creator><!\[CDATA\[(.*?)\]\]><\/dc:creator>/
    );
    if (titleMatch && linkMatch) {
      items.push({
        title: titleMatch[1],
        link: linkMatch[1],
        creator: creatorMatch ? creatorMatch[1] : "Unknown",
      });
    }
  }
  return items;
}

async function searchMedium(): Promise<PostResult[]> {
  const results: PostResult[] = [];
  const seen = new Set<string>();

  for (const tag of MEDIUM_RSS_TAGS) {
    try {
      const res = await fetch(`https://medium.com/feed/tag/${tag}`, {
        headers: { Accept: "application/xml, text/xml, */*" },
      });
      if (!res.ok) {
        console.error(`[reply-opps] Medium RSS tag/${tag} failed: ${res.status}`);
        continue;
      }
      const xml = await res.text();
      const items = parseRssItems(xml);
      for (const item of items.slice(0, 5)) {
        if (seen.has(item.link)) continue;
        seen.add(item.link);
        if (!isLikelyEnglish(item.title)) continue;
        results.push({
          postTitle: item.title,
          postUrl: item.link,
          authorName: item.creator,
          platform: "medium",
        });
      }
    } catch {
      // Skip this tag on error
    }
  }

  // Shuffle and limit to 5
  return results.sort(() => Math.random() - 0.5).slice(0, 5);
}

// --- Reply generation ---

async function generatePlatformReply(
  title: string,
  author: string,
  platform: string,
  anthropic: Anthropic
): Promise<string> {
  const platformLabel =
    platform === "facebook_group"
      ? "Facebook Group post"
      : platform === "linkedin"
        ? "LinkedIn post"
        : platform === "medium"
          ? "Medium article"
          : "post";

  // Platform-specific tone adjustments
  const platformTone: Record<string, string> = {
    facebook_group: "Casual and helpful. Facebook groups reward genuine helpfulness. Can be slightly longer and more conversational.",
    linkedin: "Professional but not corporate. LinkedIn rewards thoughtful takes. Lead with an insight or opinion, not agreement.",
    medium: "Thoughtful and articulate. Medium comments that get claps are substantive. Add real value or a counter-perspective.",
  };

  const approaches = [
    "Share a specific technique or insight the post didn't mention",
    "Add a real trading example from your experience",
    "Respectfully add nuance or a caveat to the main point",
    "Ask a thoughtful follow-up question that shows expertise",
  ];
  const approach = approaches[Math.floor(Math.random() * approaches.length)];

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `You are Harvest, a confident ICT trader with 10+ years experience. Write a ${platformLabel} comment in English.

Post/Article title: "${title}"
Author: "${author}"

PLATFORM TONE: ${platformTone[platform] || "Casual and helpful."}
APPROACH: ${approach}

QUALITY RULES:
- 2-4 sentences. Under 400 characters.
- Reference something SPECIFIC from the title. No generic comments.
- Include at least ONE specific trading detail (concept, pair, timeframe, or number).
- Sound like a peer, not a fan. Confident, experienced.
- Occasionally (1 in 3) reference "my students" naturally, if the approach fits.
- NEVER use dashes, hashtags, bullet points.
- NEVER start with generic praise ("Solid post", "Great content", "Love this").
- MUST be in English.

Write ONLY the comment text.`,
      },
    ],
  });
  const block = msg.content[0];
  return block.type === "text" ? block.text.trim() : "";
}

async function generateReply(
  title: string,
  author: string,
  anthropic: Anthropic
): Promise<string> {
  // Pick a random comment approach for maximum variety
  const approaches = [
    { style: "add_insight", instruction: "Add a complementary insight the video didn't cover. Start with the insight itself, not a reaction to the video." },
    { style: "personal_experience", instruction: "Share a brief personal experience related to the video topic. Include ONE specific detail (a pair, a number, a timeframe). Start with 'I' or a specific claim." },
    { style: "respectful_pushback", instruction: "Agree with the main point but add an important caveat or exception. 'This works great but watch out for...' or 'One thing I'd add...'" },
    { style: "student_anecdote", instruction: "Share what you've seen coaching students on this topic. 'One of my students struggled with this until we focused on [specific technique].' Keep it brief and genuine." },
    { style: "question_engage", instruction: "Make an observation and ask a follow-up question to start a conversation. 'I notice most traders get this wrong on the 15m timeframe. Do you see better results on higher TFs?'" },
    { style: "contrarian_take", instruction: "Offer a respectful alternative perspective. 'Interesting take. In my experience [different approach] works better because [specific reason].' Don't be disagreeable, be thoughtful." },
  ];
  const approach = approaches[Math.floor(Math.random() * approaches.length)];

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `You are Harvest, a confident ICT trader with 10+ years experience. Write a YouTube comment for this video.

Video title: "${title}"
Channel: "${author}"

APPROACH: ${approach.style} — ${approach.instruction}

QUALITY RULES:
- 2-4 sentences. Under 400 characters.
- Reference something SPECIFIC from the video title. Don't give a generic comment that could apply to any video.
- Include at least ONE specific ICT/trading detail (pair, timeframe, concept, number).
- Sound like a confident peer, not a fan or student.
- NEVER use dashes. Use periods or commas.
- NEVER mention R2F Trading, websites, or anything promotional.
- NEVER use hashtags.
- NEVER start with: "Solid breakdown", "Great breakdown", "Great content", "Nice work", "Love this", "Good stuff", "Spot on", "This is gold"

BAD EXAMPLE: "Solid breakdown! Order blocks are really important for ICT traders. Keep up the great content!"
WHY BAD: Generic praise opener, no specific insight, could apply to any video, reads like a bot.

GOOD EXAMPLE: "The FVG entry at London open is underrated. I've been filtering for displacement candles above 2x ATR on the 15m and it cuts false signals in half. Curious if you've tested that on gold too."
WHY GOOD: Specific technique, adds value, references the topic, asks engaging question, sounds human.

Write ONLY the comment text.`,
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
    // Prefer API key for search (doesn't need OAuth scopes), fall back to OAuth
    const apiKey = process.env.YOUTUBE_API_KEY || process.env.GEMINI_API_KEY;
    let authToken = "";
    let useApiKey = false;

    if (apiKey) {
      authToken = apiKey;
      useApiKey = true;
    } else {
      const accessToken = await getYouTubeAccessToken();
      if (!accessToken) {
        try {
          await commitFile(
            "data/reply-suggestions-debug.json",
            JSON.stringify({ error: "No API key and OAuth refresh failed", date: new Date().toISOString() }, null, 2),
            "Reply suggestions: auth failed"
          );
        } catch {}
        return NextResponse.json(
          { error: "No YouTube API key or OAuth token available" },
          { status: 500 }
        );
      }
      authToken = accessToken;
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const existing = await loadExistingSuggestions();
    const existingUrls = new Set(existing.map((s) => s.postUrl));
    const newSuggestions: ReplySuggestion[] = [];

    // Search YouTube for each query
    for (const query of SEARCH_QUERIES) {
      try {
        const videos = await searchYouTube(query, authToken, useApiKey);
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

    // Search Facebook Groups
    try {
      const fbPosts = await searchFacebookGroups();
      for (const post of fbPosts) {
        if (existingUrls.has(post.postUrl)) continue;
        try {
          const reply = await generatePlatformReply(
            post.postTitle,
            post.authorName,
            post.platform,
            anthropic
          );
          if (reply) {
            newSuggestions.push({
              id: `sug-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              platform: post.platform,
              postTitle: post.postTitle,
              postUrl: post.postUrl,
              authorName: post.authorName,
              suggestedReply: reply,
              createdAt: new Date().toISOString(),
              status: "pending",
            });
            existingUrls.add(post.postUrl);
          }
        } catch {
          // Skip this post if reply generation fails
        }
      }
    } catch {
      console.error("[reply-opps] Facebook Groups search failed");
    }

    // Search LinkedIn (topic-based suggestions)
    try {
      const linkedinPosts = await searchLinkedIn();
      for (const post of linkedinPosts) {
        if (existingUrls.has(post.postUrl)) continue;
        try {
          const reply = await generatePlatformReply(
            post.postTitle,
            post.authorName,
            post.platform,
            anthropic
          );
          if (reply) {
            newSuggestions.push({
              id: `sug-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              platform: post.platform,
              postTitle: post.postTitle,
              postUrl: post.postUrl,
              authorName: post.authorName,
              suggestedReply: reply,
              createdAt: new Date().toISOString(),
              status: "pending",
            });
            existingUrls.add(post.postUrl);
          }
        } catch {
          // Skip this post if reply generation fails
        }
      }
    } catch {
      console.error("[reply-opps] LinkedIn search failed");
    }

    // Search Medium
    try {
      const mediumPosts = await searchMedium();
      for (const post of mediumPosts) {
        if (existingUrls.has(post.postUrl)) continue;
        try {
          const reply = await generatePlatformReply(
            post.postTitle,
            post.authorName,
            post.platform,
            anthropic
          );
          if (reply) {
            newSuggestions.push({
              id: `sug-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              platform: post.platform,
              postTitle: post.postTitle,
              postUrl: post.postUrl,
              authorName: post.authorName,
              suggestedReply: reply,
              createdAt: new Date().toISOString(),
              status: "pending",
            });
            existingUrls.add(post.postUrl);
          }
        } catch {
          // Skip this post if reply generation fails
        }
      }
    } catch {
      console.error("[reply-opps] Medium search failed");
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
      const platformCounts = newSuggestions.reduce(
        (acc, s) => {
          acc[s.platform] = (acc[s.platform] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
      const breakdown = Object.entries(platformCounts)
        .map(([p, c]) => `${p}: ${c}`)
        .join(", ");
      const message = `🎯 Found ${newSuggestions.length} reply opportunit${newSuggestions.length === 1 ? "y" : "ies"} today!\n\n${breakdown}\n\nCheck your dashboard: r2ftrading.com/admin/reply-suggestions`;
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
