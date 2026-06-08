import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile, listFiles } from "@/lib/github";
import { sendTelegramReport } from "@/lib/telegram-report";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 300;

// Programmatic-SEO glossary generator.
//
// Drips a few genuinely-substantive long-tail ICT concept pages per day from
// a finite seed list, skipping anything already published. Each page targets
// a distinct "what is / how to" query traders actually search, ships an
// FAQ block (FAQPage schema) and internal links to sibling terms. Bounded
// cost: once the seed list is exhausted the cron no-ops, so it can't run up
// an open-ended Claude bill.
//
// Pages render via the existing /learn/[slug] route and are auto-added to the
// sitemap. We drip (not bulk-dump) to avoid the mass-thin-content footprint
// Google penalizes.

const PAGES_PER_RUN = 3;
const MODEL = "claude-sonnet-4-6";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Long-tail ICT / smart-money seed topics. Each becomes /learn/<slug-of-keyword>.
// Curated to NOT duplicate the existing 26 landing pages (question-form intent,
// distinct concepts). Add more any time — the cron will pick up new ones.
const GLOSSARY_TOPICS: { topic: string; targetKeyword: string }[] = [
  { topic: "Displacement in ICT trading — strong directional candles that signal institutional intent", targetKeyword: "what is displacement in ICT" },
  { topic: "The ICT Silver Bullet strategy — a 1-hour window setup for high-probability entries", targetKeyword: "ICT silver bullet strategy" },
  { topic: "Judas Swing — the false move at session open that traps retail traders", targetKeyword: "what is a judas swing" },
  { topic: "SMT divergence — smart money technique using correlated pairs to confirm reversals", targetKeyword: "what is SMT divergence" },
  { topic: "The Power of Three — accumulation, manipulation, distribution in price delivery", targetKeyword: "ICT power of three explained" },
  { topic: "Premium and discount in ICT — using the dealing range to buy low and sell high", targetKeyword: "premium and discount in ICT" },
  { topic: "Break of structure (BOS) — confirming trend continuation in market structure", targetKeyword: "what is a break of structure" },
  { topic: "Change of character (CHoCH) — the first sign of a potential trend reversal", targetKeyword: "what is change of character in trading" },
  { topic: "Mitigation block — an order block that price returns to before continuing", targetKeyword: "what is a mitigation block" },
  { topic: "Liquidity void / imbalance — inefficient price delivery that tends to get filled", targetKeyword: "what is a liquidity void" },
  { topic: "Stop hunt — how institutions sweep stops before the real move", targetKeyword: "what is a stop hunt in trading" },
  { topic: "Equal highs and equal lows as liquidity targets in ICT", targetKeyword: "equal highs and equal lows ICT" },
  { topic: "The Asian session range and how ICT traders use it for bias", targetKeyword: "asian session range trading" },
  { topic: "PD arrays — the premium/discount array hierarchy in ICT", targetKeyword: "what are PD arrays in ICT" },
  { topic: "Consequent encroachment — the 50% level of a fair value gap", targetKeyword: "what is consequent encroachment" },
  { topic: "Daily bias in ICT — how to decide whether to be a buyer or seller today", targetKeyword: "how to find daily bias in ICT" },
  { topic: "The ICT 2022 mentorship model setup explained step by step", targetKeyword: "ICT 2022 model explained" },
  { topic: "Inversion fair value gap — when a failed FVG flips to support or resistance", targetKeyword: "what is an inversion fair value gap" },
  { topic: "Turtle soup setup — fading a false breakout of recent highs or lows", targetKeyword: "what is a turtle soup setup" },
  { topic: "Market maker buy and sell models in ICT", targetKeyword: "ICT market maker models" },
  { topic: "How to identify order blocks on a chart, step by step", targetKeyword: "how to identify order blocks" },
  { topic: "How to trade fair value gaps with entries, stops and targets", targetKeyword: "how to trade fair value gaps" },
  { topic: "How to trade liquidity sweeps for high-probability reversals", targetKeyword: "how to trade liquidity sweeps" },
  { topic: "Best timeframes for ICT trading and how to combine them", targetKeyword: "best timeframes for ICT trading" },
  { topic: "ICT trading for complete beginners — a starting roadmap", targetKeyword: "ICT trading for beginners" },
  { topic: "Is ICT trading actually profitable, and what it really takes", targetKeyword: "is ICT trading profitable" },
  { topic: "ICT vs SMC — the real difference between ICT and smart money concepts", targetKeyword: "ICT vs SMC difference" },
  { topic: "ICT versus classic price action trading compared", targetKeyword: "ICT vs price action trading" },
  { topic: "Dealing range in ICT and how to mark it correctly", targetKeyword: "what is a dealing range in ICT" },
  { topic: "High and low resistance liquidity runs explained", targetKeyword: "high resistance liquidity run" },
  { topic: "How to set a stop loss using order blocks", targetKeyword: "stop loss with order blocks" },
  { topic: "How to manage risk during a prop firm challenge", targetKeyword: "prop firm challenge risk management" },
  { topic: "Overtrading — why it happens and how to actually stop", targetKeyword: "how to stop overtrading" },
  { topic: "The London open killzone and how to trade it", targetKeyword: "london open killzone strategy" },
  { topic: "The New York killzone and the AM session setup", targetKeyword: "new york killzone trading" },
  { topic: "ICT macros — the specific intraday minutes algorithms run", targetKeyword: "what are ICT macros" },
  { topic: "Central bank dealers range (CBDR) and how ICT uses it", targetKeyword: "what is the CBDR in ICT" },
  { topic: "Rejection block — a refinement of the order block concept", targetKeyword: "what is a rejection block" },
  { topic: "Liquidity in trading — buy-side and sell-side explained simply", targetKeyword: "what is liquidity in trading" },
  { topic: "How long it really takes to learn ICT and become consistent", targetKeyword: "how long to learn ICT trading" },
];

interface LandingPageData {
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  headline: string;
  subheadline: string;
  keyPoints: { icon: string; title: string; text: string }[];
  relatedTags: string[];
  testimonialIndex: number;
  createdAt: string;
  targetKeyword: string;
  intro?: string;
  faqs?: { q: string; a: string }[];
  relatedTerms?: { slug: string; label: string }[];
}

interface ExistingPage {
  slug: string;
  title: string;
  tags: string[];
}

async function loadExistingPages(): Promise<{
  slugs: Set<string>;
  pages: ExistingPage[];
}> {
  const slugs = new Set<string>();
  const pages: ExistingPage[] = [];
  try {
    const files = await listFiles("data/landing-pages", ".json");
    await Promise.all(
      files.map(async (f) => {
        try {
          const raw = await readFile(f);
          const d = JSON.parse(raw);
          if (d.slug) {
            slugs.add(d.slug);
            pages.push({
              slug: d.slug,
              title: d.title || d.slug,
              tags: (d.relatedTags || []).map((t: string) => t.toLowerCase()),
            });
          }
        } catch {
          // skip unreadable
        }
      })
    );
  } catch {
    // dir may not exist
  }
  return { slugs, pages };
}

// Pick up to 4 sibling pages that share the most tags, for internal linking.
function pickRelatedTerms(
  newTags: string[],
  pool: ExistingPage[],
  selfSlug: string
): { slug: string; label: string }[] {
  const tagSet = new Set(newTags.map((t) => t.toLowerCase()));
  return pool
    .filter((p) => p.slug !== selfSlug)
    .map((p) => ({
      page: p,
      score: p.tags.filter((t) => tagSet.has(t)).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => ({ slug: x.page.slug, label: x.page.title }));
}

async function generatePage(
  topic: string,
  targetKeyword: string
): Promise<Omit<LandingPageData, "slug" | "testimonialIndex" | "createdAt" | "targetKeyword" | "relatedTerms">> {
  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2500,
    messages: [
      {
        role: "user",
        content: `You are a content strategist for R2F Trading (r2ftrading.com), an ICT trading coaching brand run by a trader with 10+ years of experience.

Write a genuinely useful glossary/explainer page for this topic: "${topic}"
Target search keyword: "${targetKeyword}"

Return ONLY a JSON object (no markdown fences) with these fields:
{
  "title": "Short page title, under 38 chars",
  "seoTitle": "SEO title UNDER 60 chars, includes the target keyword naturally",
  "seoDescription": "Meta description 130-155 chars. Lead with a specific number, a contrarian flip, or a credibility hook. End with a concrete takeaway. Do NOT open with Discover/Learn/Master/Find out/Complete guide.",
  "headline": "Benefit-driven H1 under 70 chars that answers the searcher's intent",
  "subheadline": "1-2 supporting sentences",
  "intro": "2-3 sentence direct answer to the query, written so it could be quoted as a featured snippet. Define the concept clearly in the first sentence.",
  "keyPoints": [
    { "icon": "relevant emoji", "title": "Point title under 40 chars", "text": "2-3 specific sentences" }
  ],
  "faqs": [
    { "q": "A real question a trader googles about this topic", "a": "A direct 40-60 word answer" }
  ],
  "relatedTags": ["lowercase-hyphenated", "tags", "matching-blog-topics"]
}

Requirements:
- Exactly 5 keyPoints covering: what it is, why it matters, how to use it, a common mistake, and next steps.
- Exactly 5 faqs with concrete, specific answers (include a real example: pair, timeframe, or concept where it helps).
- Include the target keyword naturally in seoTitle, seoDescription, headline, and the first sentence of intro.
- Speak to forex and futures traders learning the ICT methodology.
- Be specific and practical. Reference real ICT concepts (FVG, order block, BOS, killzone, liquidity) where relevant.

STRICT STYLE RULES:
- Do NOT use em dashes anywhere. Use periods, commas, or colons instead.
- Do NOT use the "not X, but Y" construction, and do NOT use repeated negation patterns like "Not this. Not that." Just state what the thing is.
- Do NOT invent student names, anecdotes, or say "my students" / "a student of mine" / "in my coaching". Describe trader patterns generally instead.
- Do NOT ask the reader to DM, message, or contact privately. Any call to action stays on-site.
- Sound like an experienced human practitioner, not a marketing bot.`,
      },
    ],
  });

  let text = response.content[0].type === "text" ? response.content[0].text : "";
  text = text
    .replace(/^```(?:json)?\s*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();
  return JSON.parse(text);
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slugs: existingSlugs, pages: existingPages } =
      await loadExistingPages();

    // Find the next unpublished seed topics
    const pending = GLOSSARY_TOPICS.filter(
      (t) => !existingSlugs.has(slugify(t.targetKeyword))
    ).slice(0, PAGES_PER_RUN);

    if (pending.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Glossary seed list fully published — nothing to generate",
        published: existingSlugs.size,
      });
    }

    const created: string[] = [];
    const errors: { keyword: string; error: string }[] = [];
    // Grows as we create pages this run, so later pages in the same run can
    // link back to earlier ones.
    const linkPool: ExistingPage[] = [...existingPages];

    for (const { topic, targetKeyword } of pending) {
      const slug = slugify(targetKeyword);
      try {
        const gen = await generatePage(topic, targetKeyword);
        const relatedTerms = pickRelatedTerms(
          gen.relatedTags || [],
          linkPool,
          slug
        );

        const pageData: LandingPageData = {
          slug,
          title: gen.title,
          seoTitle: gen.seoTitle,
          seoDescription: gen.seoDescription,
          headline: gen.headline,
          subheadline: gen.subheadline,
          intro: gen.intro,
          keyPoints: gen.keyPoints,
          faqs: gen.faqs,
          relatedTags: gen.relatedTags || [],
          relatedTerms,
          testimonialIndex: Math.floor(Math.random() * 4),
          createdAt: new Date().toISOString(),
          targetKeyword,
        };

        await commitFile(
          `data/landing-pages/${slug}.json`,
          JSON.stringify(pageData, null, 2),
          `Add glossary page: ${gen.title}`
        );

        // Make this page linkable from subsequent pages in this run
        linkPool.push({
          slug,
          title: gen.title,
          tags: (gen.relatedTags || []).map((t) => t.toLowerCase()),
        });

        created.push(slug);

        try {
          const { notifyIndexNow } = await import("@/lib/indexnow");
          await notifyIndexNow([`/learn/${slug}`, `/learn`, `/sitemap.xml`]);
        } catch {
          // optional
        }
      } catch (err) {
        errors.push({
          keyword: targetKeyword,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (created.length > 0) {
      const remaining = GLOSSARY_TOPICS.filter(
        (t) =>
          !existingSlugs.has(slugify(t.targetKeyword)) &&
          !created.includes(slugify(t.targetKeyword))
      ).length;

      await sendTelegramReport(
        [
          `📚 *Glossary Pages Published*`,
          ``,
          ...created.map((s) => `• /learn/${s}`),
          ``,
          `_${remaining} topics left in the seed list_`,
        ].join("\n")
      );
    }

    return NextResponse.json({
      success: true,
      created,
      errors,
    });
  } catch (err: unknown) {
    console.error("[generate-glossary] Fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
