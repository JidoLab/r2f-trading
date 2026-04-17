/**
 * Guest Post Outreach — core library.
 *
 * Flow:
 *  1. Add target blog (name, URL, contact email if known)
 *  2. Scrape target: title, description, recent post titles → gives Claude context
 *  3. Claude drafts personalized pitch (subject + body + 3 topic ideas)
 *  4. Admin clicks "Send via Gmail" — opens Gmail compose prefilled
 *  5. Admin updates status as pitches progress (pitched → replied → accepted/rejected)
 *
 * No Gmail API integration — all sending is manual via prefilled URLs. Simpler,
 * no OAuth, user can review before send.
 */

import Anthropic from "@anthropic-ai/sdk";

export type OutreachStatus =
  | "untouched"
  | "researched"
  | "drafted"
  | "pitched"
  | "replied"
  | "accepted"
  | "rejected";

export interface BlogContext {
  blogTitle?: string;
  blogDescription?: string;
  recentPosts?: string[];
  scrapedAt?: string;
  scrapeError?: string;
}

export interface PitchTopic {
  title: string;
  angle: string; // short description of the angle
}

export interface PitchDraft {
  subject: string;
  body: string;
  topics: PitchTopic[];
  draftedAt: string;
  model: string;
}

export interface OutreachTarget {
  id: string;
  name: string;
  url: string;
  contactEmail?: string;
  guestPostUrl?: string;
  domainRating?: "low" | "low-medium" | "medium" | "medium-high" | "high";
  topics?: string[];
  status: OutreachStatus;
  context?: BlogContext;
  pitch?: PitchDraft;
  pitchedAt?: string;
  repliedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Scraping ──────────────────────────────────────────────────────────

/**
 * Fetch a blog homepage and extract useful context for pitch drafting.
 * Best-effort — returns partial context if scraping hits issues.
 */
export async function scrapeBlogContext(url: string): Promise<BlogContext> {
  try {
    // Normalize URL
    const normalized = url.startsWith("http") ? url : `https://${url}`;

    const res = await fetch(normalized, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; R2FTradingOutreach/1.0; +https://www.r2ftrading.com)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return { scrapedAt: new Date().toISOString(), scrapeError: `HTTP ${res.status}` };
    }

    const html = await res.text();

    // Extract <title>
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const blogTitle = titleMatch ? decodeHtml(titleMatch[1].trim()).slice(0, 200) : undefined;

    // Extract <meta name="description">
    const descMatch = html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    );
    const blogDescription = descMatch ? decodeHtml(descMatch[1]).slice(0, 300) : undefined;

    // Try to find recent post titles — very heuristic
    // Look for h2/h3 inside article tags first, then fall back to bare h2/h3
    const recentPosts: string[] = [];
    const articleHeadings = [
      ...html.matchAll(/<article[^>]*>[\s\S]*?<(h[12])[^>]*>([\s\S]*?)<\/\1>/gi),
    ];
    for (const m of articleHeadings.slice(0, 8)) {
      const text = stripTags(m[2]).trim();
      if (text.length > 15 && text.length < 200) recentPosts.push(decodeHtml(text));
    }
    if (recentPosts.length === 0) {
      // Fallback — any h2/h3 with anchor
      const linkedHeadings = [
        ...html.matchAll(/<(h[23])[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>\s*<\/\1>/gi),
      ];
      for (const m of linkedHeadings.slice(0, 8)) {
        const text = stripTags(m[2]).trim();
        if (text.length > 15 && text.length < 200) recentPosts.push(decodeHtml(text));
      }
    }

    return {
      blogTitle,
      blogDescription,
      recentPosts: [...new Set(recentPosts)].slice(0, 5), // dedupe + cap
      scrapedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      scrapedAt: new Date().toISOString(),
      scrapeError: err instanceof Error ? err.message : String(err),
    };
  }
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
}

function decodeHtml(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

// ─── Pitch Drafting ────────────────────────────────────────────────────

const HARVEST_BIO = `
Harvest Wright — founder of R2F Trading (r2ftrading.com). ICT (Inner Circle Trader) coach with 10+ years of experience teaching prop firm traders how to pass funded challenges and scale. Specializes in:
- ICT concepts: order blocks, fair value gaps, liquidity sweeps, killzones, market structure
- Prop firm challenge strategies (FTMO, MyForexFunds, etc.)
- Trading psychology + risk management for funded traders
- 1-on-1 mentorship program with personalized sessions

Proof: Active coaching business, published 40+ in-depth articles, growing YouTube channel (@R2F-Trading), TradingView Editors' Pick feature.
`.trim();

export async function draftPitch(target: OutreachTarget): Promise<PitchDraft> {
  const anthropic = new Anthropic();

  const ctx = target.context || {};
  const contextBlock = [
    ctx.blogTitle ? `Blog title: ${ctx.blogTitle}` : null,
    ctx.blogDescription ? `Description: ${ctx.blogDescription}` : null,
    ctx.recentPosts && ctx.recentPosts.length > 0
      ? `Recent posts on their blog:\n${ctx.recentPosts.map((p) => `  - ${p}`).join("\n")}`
      : null,
    target.topics && target.topics.length > 0
      ? `Stated topic focus: ${target.topics.join(", ")}`
      : null,
    target.domainRating ? `Domain tier: ${target.domainRating}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `You are drafting a cold guest-post pitch email for Harvest Wright to send to the editor of a trading blog.

TARGET BLOG: ${target.name} (${target.url})

${contextBlock || "No additional context available — write a slightly more general pitch."}

HARVEST'S BIO:
${HARVEST_BIO}

YOUR TASK — return ONLY valid JSON with this shape:
{
  "subject": "Concise subject line, under 60 chars, specific and intriguing (NOT 'Guest post submission')",
  "topics": [
    { "title": "Topic 1 headline", "angle": "One-sentence angle/hook that makes it compelling" },
    { "title": "Topic 2 headline", "angle": "One-sentence angle" },
    { "title": "Topic 3 headline", "angle": "One-sentence angle" }
  ],
  "body": "The full email body, markdown-free, ~180-250 words"
}

EMAIL BODY RULES:
- Open with a SPECIFIC observation about their recent content (use the recent posts above if available). Avoid generic flattery.
- State what value Harvest brings in ONE sentence (ICT coach, real students getting funded)
- List the 3 topic ideas as a bulleted list (use "- " prefix, one topic per line)
- Close with one light question inviting reply ("Open to any of these? Happy to send an outline.")
- Sign-off: "Harvest Wright\\nFounder, R2F Trading\\nr2ftrading.com"
- NO hype, NO fake urgency, NO emojis, NO excessive capitalization
- Casual-professional tone. Editors get 50 pitches a day — be human.
- Each topic must be DIRECTLY relevant to ${target.name}'s audience (not generic trading)
- DO NOT mention "guest post" in the first sentence — lead with value

TOPIC RULES:
- All 3 topics must be ICT/forex/prop-firm adjacent (Harvest's expertise)
- Topics must fit the blog's apparent focus (use recent posts as a signal)
- Specific headlines, not generic ("The 1-Hour Mistake Killing 9 Out of 10 FTMO Challenges" vs "Prop Firm Mistakes")`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Claude did not return valid JSON for pitch draft");
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    subject: string;
    topics: PitchTopic[];
    body: string;
  };

  return {
    subject: parsed.subject,
    body: parsed.body,
    topics: parsed.topics,
    draftedAt: new Date().toISOString(),
    model: "claude-sonnet-4-6",
  };
}

// ─── Gmail compose URL ─────────────────────────────────────────────────

/**
 * Build a Gmail compose URL that prefills to/subject/body.
 * Clicking opens Gmail in a new tab with the pitch ready — user hits Send.
 */
export function buildGmailComposeUrl(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({
    fs: "1",
    tf: "cm",
    to,
    su: subject,
    body,
  });
  return `https://mail.google.com/mail/u/0/?${params.toString()}`;
}

/**
 * Fallback mailto: URL — works even if user isn't logged into Gmail.
 */
export function buildMailtoUrl(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ─── Seed data (curated starter targets) ───────────────────────────────

export const SEED_TARGETS: Omit<OutreachTarget, "id" | "createdAt" | "updatedAt" | "status">[] = [
  {
    name: "Forex Crunch",
    url: "https://www.forexcrunch.com",
    contactEmail: "editor@forexcrunch.com",
    guestPostUrl: "https://www.forexcrunch.com/forex-blog-submit-post",
    domainRating: "medium",
    topics: ["forex", "broker-reviews", "strategies"],
  },
  {
    name: "Trading With Rayner",
    url: "https://www.tradingwithrayner.com",
    domainRating: "medium",
    topics: ["price-action", "psychology", "forex"],
  },
  {
    name: "FXStreet Insights",
    url: "https://www.fxstreet.com",
    contactEmail: "editor@fxstreet.com",
    domainRating: "high",
    topics: ["forex", "technical-analysis", "fundamentals"],
  },
  {
    name: "New Trader U",
    url: "https://www.newtraderu.com",
    domainRating: "medium",
    topics: ["psychology", "trend-following", "beginner"],
  },
  {
    name: "Forex Academy",
    url: "https://www.forex.academy",
    contactEmail: "contact@forex.academy",
    guestPostUrl: "https://www.forex.academy/write-for-us",
    domainRating: "medium",
    topics: ["forex-education", "technical", "fundamentals"],
  },
  {
    name: "The Lazy Trader",
    url: "https://thelazytrader.com",
    domainRating: "low-medium",
    topics: ["forex", "options", "swing-trading"],
  },
  {
    name: "My Trading Skills",
    url: "https://www.mytradingskills.com",
    domainRating: "medium",
    topics: ["forex", "cfds", "beginner"],
  },
  {
    name: "Orbex Blog",
    url: "https://www.orbex.com/blog",
    domainRating: "medium",
    topics: ["forex", "market-commentary"],
  },
  {
    name: "Trade That Swing",
    url: "https://tradethatswing.com",
    domainRating: "low-medium",
    topics: ["swing-trading", "day-trading", "forex"],
  },
  {
    name: "Asia Forex Mentor",
    url: "https://www.asiaforexmentor.com",
    domainRating: "medium",
    topics: ["forex", "prop-firms", "education"],
  },
  {
    name: "Trading Heroes",
    url: "https://www.tradingheroes.com",
    domainRating: "low-medium",
    topics: ["forex", "psychology", "systems"],
  },
  {
    name: "The 5%ers Blog",
    url: "https://the5ers.com/blog",
    domainRating: "medium",
    topics: ["prop-firm", "funded-trader", "forex"],
  },
  {
    name: "Daily Price Action",
    url: "https://dailypriceaction.com",
    domainRating: "medium",
    topics: ["price-action", "forex", "swing-trading"],
  },
  {
    name: "TradingSim Blog",
    url: "https://tradingsim.com/blog",
    domainRating: "medium-high",
    topics: ["day-trading", "technical-analysis"],
  },
  {
    name: "FXOpen Blog",
    url: "https://fxopen.com/blog",
    domainRating: "medium",
    topics: ["forex", "technical-analysis"],
  },
];
