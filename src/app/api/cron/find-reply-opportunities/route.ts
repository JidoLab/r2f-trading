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

// YouTube Data API v3 search.list costs 100 units each. Default daily quota
// is 10,000 units — so 25 queries × 100 = 2,500 units just for this cron.
// Combined with competitor-watch + any manual triggers, we hit the quota
// ceiling fast and silently-fail for the rest of the day.
//
// Trimmed to 10 high-signal queries (~1,000 units/run) to leave headroom
// for other consumers. Picked the ones most likely to surface relevant
// English-speaking trader videos with real engagement potential.
const SEARCH_QUERIES = [
  "ICT trading strategy",
  "smart money concepts",
  "order blocks trading",
  "fair value gap trading",
  "liquidity sweep trading",
  "prop firm challenge strategy",
  "FTMO challenge tips",
  "price action trading",
  "trading psychology tips",
  "break of structure",
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

// Module-level diag capture for YT API failures so the route handler can
// surface the exact HTTP status + body in the response. Populated by
// searchYouTube on the first non-2xx so we don't spam.
const ytApiFailure: { status?: number; text?: string } = {};

// Per-key outcome tracking — lets us see which keys are live/blown on any run.
// Reset at the start of each request handler.
const ytKeyStatus: Record<string, { ok: number; failed: number; lastStatus?: number; lastText?: string }> = {};

// Per-filter drop counters so we can see which filter eliminates the most
// candidates. Reset at the start of each request handler.
const ytFilterDrops = { rawTotal: 0, nonEnglish: 0, tooShort: 0, lowSubs: 0, lowViews: 0, highComments: 0, passed: 0 };

/**
 * Fetch a YouTube API endpoint with automatic key fallback. Tries each key
 * in order; on any non-2xx response (usually 403 quota-exceeded), falls back
 * to the next key. Captures the first failure into ytApiFailure for diag.
 *
 * For OAuth mode, only attempts once with the access token.
 */
async function ytFetchWithFallback(
  baseUrl: string,
  baseParams: URLSearchParams,
  apiKeys: string[],
  oauthToken?: string,
): Promise<Response | null> {
  if (oauthToken) {
    const res = await fetch(`${baseUrl}?${baseParams}`, {
      headers: { Authorization: `Bearer ${oauthToken}` },
    });
    if (!res.ok && !ytApiFailure.status) {
      const body = await res.clone().text().catch(() => "");
      ytApiFailure.status = res.status;
      ytApiFailure.text = body.slice(0, 300);
    }
    return res;
  }

  for (let i = 0; i < apiKeys.length; i++) {
    const key = apiKeys[i];
    const keyLabel = `key${i + 1}`;
    if (!ytKeyStatus[keyLabel]) ytKeyStatus[keyLabel] = { ok: 0, failed: 0 };

    const params = new URLSearchParams(baseParams);
    params.set("key", key);
    const res = await fetch(`${baseUrl}?${params}`);
    if (res.ok) {
      ytKeyStatus[keyLabel].ok++;
      return res;
    }
    // Non-2xx — record per-key outcome and try the next key
    const body = await res.clone().text().catch(() => "");
    ytKeyStatus[keyLabel].failed++;
    ytKeyStatus[keyLabel].lastStatus = res.status;
    ytKeyStatus[keyLabel].lastText = body.slice(0, 200);
    if (!ytApiFailure.status) {
      ytApiFailure.status = res.status;
      ytApiFailure.text = body.slice(0, 300);
    }
    console.error(`[reply-opps] YT ${keyLabel} failed: ${res.status} ${body.slice(0, 150)}`);
  }
  return null; // all keys exhausted
}

async function searchYouTube(
  query: string,
  apiKeysOrToken: string[] | string,
  useApiKey: boolean = false
): Promise<VideoResult[]> {
  const apiKeys = useApiKey ? (Array.isArray(apiKeysOrToken) ? apiKeysOrToken : [apiKeysOrToken]) : [];
  const oauthToken = useApiKey ? undefined : (apiKeysOrToken as string);

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
  });
  const res = await ytFetchWithFallback(
    "https://www.googleapis.com/youtube/v3/search",
    params,
    apiKeys,
    oauthToken,
  );
  if (!res || !res.ok) {
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
  ytFilterDrops.rawTotal += rawVideos.length;

  // Filter out non-English titles
  const englishVideos = rawVideos.filter((v: VideoResult) => {
    if (!isLikelyEnglish(v.title)) { ytFilterDrops.nonEnglish++; return false; }
    return true;
  });

  // Get video stats + content details (duration) + channel stats (subscribers) to filter by quality
  if (englishVideos.length === 0) return [];
  const videoIds = englishVideos.map((v: VideoResult) => v.videoId).join(",");
  const statsParams = new URLSearchParams({
    part: "statistics,contentDetails",
    id: videoIds,
  });
  const statsRes = await ytFetchWithFallback(
    "https://www.googleapis.com/youtube/v3/videos",
    statsParams,
    apiKeys,
    oauthToken,
  );

  if (statsRes && statsRes.ok) {
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
        });
        const chRes = await ytFetchWithFallback(
          "https://www.googleapis.com/youtube/v3/channels",
          chParams,
          apiKeys,
          oauthToken,
        );
        if (chRes && chRes.ok) {
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
        // Skip very short videos (under 60s). Shorts have chaotic,
        // low-signal comments — not worth Harvest's reply time.
        if ((v.durationSeconds || 0) < 60) { ytFilterDrops.tooShort++; return false; }
        // No subscriber filter. YT creators can hide their subscriber count
        // (public-facing privacy toggle) — channels.list then returns 0,
        // causing any "subs > N" filter to silently reject valid channels.
        // Skip videos with almost no views (under 20 — usually shadow-banned
        // or dead uploads after several hours)
        if ((v.viewCount || 0) < 20) { ytFilterDrops.lowViews++; return false; }
        // Skip oversaturated threads (1200+ comments → ours gets buried)
        if ((v.commentCount || 0) > 1200) { ytFilterDrops.highComments++; return false; }
        ytFilterDrops.passed++;
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
  "how to pass prop firm challenges",
  "day trading for beginners",
  "prop firm funded trader journey",
  "trading journal discipline",
  "NY session liquidity sweep setups",
  "London open breakout strategies",
  "XAUUSD price action trading",
  "Nasdaq futures trading strategy",
  "avoiding overtrading and revenge trading",
  "building a trading plan that survives drawdown",
  "reading price action without indicators",
  "position sizing for funded accounts",
  "how professional traders manage stops",
  "trading during high-impact news events",
  "ICT silver bullet entry model",
  "why most retail traders lose money",
  "choosing the right prop firm 2026",
  "moving from demo to live trading",
];

async function searchLinkedIn(): Promise<PostResult[]> {
  // LinkedIn API doesn't allow searching other people's posts easily.
  // Instead, generate topic-based suggestions that Harvest can use
  // when he finds relevant posts on LinkedIn himself.
  //
  // The URL includes today's date so dedup by URL doesn't kill us — every
  // day produces fresh, unique "suggestion URLs" for the admin UI even
  // when we loop back to a prior topic from the pool.
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const results: PostResult[] = [];
  const shuffled = [...LINKEDIN_TOPICS].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 4);

  for (const topic of selected) {
    const searchUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(topic)}&datePosted=past-24h&d=${today}`;
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
- NEVER mention "students", "my students", "coaching", "my coaching", "mentees", R2F Trading, r2ftrading.com, or any website. Zero promotional language.
- NEVER ask the reader to DM / message / PM / contact you, or say you're "open to chat" / "inbox is open". No contact solicitation.
- If a claim could need clarification, you may offer to clarify IN THE THREAD only (never privately).
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
    { style: "technique_deepdive", instruction: "Pick one specific technique from the video and add a non-obvious detail about how to apply it. 'The FVG entry is solid. The underrated part is how you marked the displacement candle — most people skip that and enter too early.'" },
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
    // Reset module-level YT API failure capture for this run
    delete ytApiFailure.status;
    delete ytApiFailure.text;
    for (const k of Object.keys(ytKeyStatus)) delete ytKeyStatus[k];
    ytFilterDrops.rawTotal = 0;
    ytFilterDrops.nonEnglish = 0;
    ytFilterDrops.tooShort = 0;
    ytFilterDrops.lowSubs = 0;
    ytFilterDrops.lowViews = 0;
    ytFilterDrops.highComments = 0;
    ytFilterDrops.passed = 0;

    // Collect all available YouTube API keys (each has its own 10K/day quota).
    // Stacking keys across GCP projects effectively multiplies the daily budget.
    // Order matters: primary first, fallbacks after. Add more as YOUTUBE_API_KEY_3
    // etc. if needed.
    const apiKeys = [
      process.env.YOUTUBE_API_KEY,
      process.env.YOUTUBE_API_KEY_2,
      process.env.YOUTUBE_API_KEY_3,
    ].filter((k): k is string => !!k);

    let authPayload: string[] | string = "";
    let useApiKey = false;

    if (apiKeys.length > 0) {
      authPayload = apiKeys;
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
      authPayload = accessToken;
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const existing = await loadExistingSuggestions();
    const existingUrls = new Set(existing.map((s) => s.postUrl));
    const newSuggestions: ReplySuggestion[] = [];

    // Per-platform diagnostics so we can see silent zero-result states in the response
    const diag: {
      youtube: { searched: number; returned: number; duped: number; added: number; errors: number; authMode: string; apiFailure?: { status?: number; text?: string } };
      facebook_group: { returned: number; duped: number; added: number };
      linkedin: { returned: number; duped: number; added: number };
      medium: { returned: number; duped: number; added: number };
    } = {
      youtube: { searched: 0, returned: 0, duped: 0, added: 0, errors: 0, authMode: useApiKey ? `api_key (${apiKeys.length} key${apiKeys.length === 1 ? "" : "s"})` : "oauth" },
      facebook_group: { returned: 0, duped: 0, added: 0 },
      linkedin: { returned: 0, duped: 0, added: 0 },
      medium: { returned: 0, duped: 0, added: 0 },
    };

    // Search YouTube for each query
    for (const query of SEARCH_QUERIES) {
      diag.youtube.searched++;
      try {
        const videos = await searchYouTube(query, authPayload, useApiKey);
        diag.youtube.returned += videos.length;
        for (const video of videos) {
          const url = `https://youtube.com/watch?v=${video.videoId}`;
          if (existingUrls.has(url)) { diag.youtube.duped++; continue; }

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
              diag.youtube.added++;
            }
          } catch {
            diag.youtube.errors++;
          }
        }
      } catch (err) {
        diag.youtube.errors++;
        console.error(`[reply-opps] YT query "${query}" failed:`, err instanceof Error ? err.message : String(err));
      }
    }

    // If the first YT API call returned non-2xx, surface it so the cause is visible
    if (ytApiFailure.status) {
      diag.youtube.apiFailure = { status: ytApiFailure.status, text: ytApiFailure.text };
    }
    // Per-key health — lets us see which of the stacked keys are working
    if (Object.keys(ytKeyStatus).length > 0) {
      (diag.youtube as Record<string, unknown>).keyStatus = ytKeyStatus;
    }
    // Per-filter drop counts — shows which filter rejects the most candidates
    (diag.youtube as Record<string, unknown>).filterDrops = { ...ytFilterDrops };

    // Search Facebook Groups
    try {
      const fbPosts = await searchFacebookGroups();
      diag.facebook_group.returned = fbPosts.length;
      for (const post of fbPosts) {
        if (existingUrls.has(post.postUrl)) { diag.facebook_group.duped++; continue; }
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
            diag.facebook_group.added++;
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
      diag.linkedin.returned = linkedinPosts.length;
      for (const post of linkedinPosts) {
        if (existingUrls.has(post.postUrl)) { diag.linkedin.duped++; continue; }
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
            diag.linkedin.added++;
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
      diag.medium.returned = mediumPosts.length;
      for (const post of mediumPosts) {
        if (existingUrls.has(post.postUrl)) { diag.medium.duped++; continue; }
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
            diag.medium.added++;
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
        diag,
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
      diag,
      suggestions: newSuggestions.map((s) => ({
        id: s.id,
        platform: s.platform,
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
