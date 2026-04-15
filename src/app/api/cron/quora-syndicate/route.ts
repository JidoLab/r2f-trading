import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile, listFiles } from "@/lib/github";
import { sendTelegramReport } from "@/lib/telegram-report";
import Anthropic from "@anthropic-ai/sdk";
import { HttpsProxyAgent } from "https-proxy-agent";

export const maxDuration = 120;

const QUORA_LOG_PATH = "data/quora-syndication-log.json";
const REPLY_SUGGESTIONS_PATH = "data/reply-suggestions.json";

interface QuoraLogEntry {
  slug: string;
  title: string;
  quoraQuery: string;
  quoraUrl: string | null;
  answerGenerated: boolean;
  date: string;
}

interface ReplySuggestion {
  id: string;
  platform: "quora";
  postTitle: string;
  postUrl: string;
  authorName: string;
  suggestedReply: string;
  createdAt: string;
  status: "pending" | "used" | "skipped";
}

async function loadQuoraLog(): Promise<QuoraLogEntry[]> {
  try {
    const raw = await readFile(QUORA_LOG_PATH);
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveQuoraLog(log: QuoraLogEntry[]): Promise<void> {
  await commitFile(
    QUORA_LOG_PATH,
    JSON.stringify(log, null, 2),
    "Quora syndication: update log"
  );
}

async function loadReplySuggestions(): Promise<ReplySuggestion[]> {
  try {
    const raw = await readFile(REPLY_SUGGESTIONS_PATH);
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveReplySuggestions(suggestions: ReplySuggestion[]): Promise<void> {
  await commitFile(
    REPLY_SUGGESTIONS_PATH,
    JSON.stringify(suggestions, null, 2),
    "Quora syndication: add reply suggestions"
  );
}

function extractFrontmatter(
  content: string
): { title: string; excerpt: string; date: string } | null {
  const match = content.match(
    /export\s+const\s+metadata\s*=\s*\{([\s\S]*?)\n\}/
  );
  if (!match) return null;

  const block = match[1];
  const titleMatch = block.match(
    /title:\s*(?:"([^"]+)"|'([^']+)'|`([^`]+)`)/
  );
  const excerptMatch = block.match(
    /excerpt:\s*(?:"([^"]+)"|'([^']+)'|`([^`]+)`)/
  );
  const dateMatch = block.match(/date:\s*"([^"]+)"/);

  if (!titleMatch || !dateMatch) return null;

  return {
    title: titleMatch[1] || titleMatch[2] || titleMatch[3] || "",
    excerpt:
      excerptMatch?.[1] || excerptMatch?.[2] || excerptMatch?.[3] || "",
    date: dateMatch[1],
  };
}

function extractBody(content: string): string {
  return content
    .replace(/export\s+const\s+metadata\s*=\s*\{[\s\S]*?\n\}\s*\n*/, "")
    .trim();
}

function buildProxyUrl(): string | null {
  const username = process.env.PROXY_USERNAME;
  const password = process.env.PROXY_PASSWORD;
  if (!username || !password) return null;
  return `http://${username}:${password}@gate.smartproxy.com:7000`;
}

async function searchGoogleForQuora(
  query: string,
  proxyUrl: string | null
): Promise<string | null> {
  const searchQuery = `site:quora.com ${query}`;
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=3`;

  const fetchOptions: RequestInit & { agent?: unknown } = {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  };

  // Use proxy if available
  if (proxyUrl) {
    try {
      const agent = new HttpsProxyAgent(proxyUrl);
      (fetchOptions as Record<string, unknown>).agent = agent;
    } catch {
      console.error("[quora-syndicate] Failed to create proxy agent");
    }
  }

  try {
    const res = await fetch(googleUrl, fetchOptions);
    if (!res.ok) {
      console.error(
        `[quora-syndicate] Google search failed: ${res.status}`
      );
      return null;
    }

    const html = await res.text();

    // Extract Quora URLs from Google results
    const quoraUrls = html.match(
      /https?:\/\/(?:www\.)?quora\.com\/[^\s"<>]+/g
    );
    if (quoraUrls && quoraUrls.length > 0) {
      // Clean up the URL — remove tracking parameters
      const cleanUrl = quoraUrls[0].split("&")[0].split("?sa=")[0];
      return cleanUrl;
    }

    return null;
  } catch (err) {
    console.error("[quora-syndicate] Google search error:", err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Load existing logs
    const quoraLog = await loadQuoraLog();
    const syndicatedSlugs = new Set(quoraLog.map((e) => e.slug));

    // Get all blog files
    const files = await listFiles("content/blog", ".mdx");

    // Find posts not yet syndicated to Quora
    const candidates: {
      slug: string;
      title: string;
      excerpt: string;
      body: string;
    }[] = [];

    for (const filePath of files) {
      const slug = filePath
        .replace(/^content\/blog\//, "")
        .replace(/\.mdx$/, "");

      if (syndicatedSlugs.has(slug)) continue;

      try {
        const content = await readFile(filePath);
        const meta = extractFrontmatter(content);
        if (!meta) continue;

        const body = extractBody(content);
        candidates.push({
          slug,
          title: meta.title,
          excerpt: meta.excerpt,
          body,
        });
      } catch {
        continue;
      }
    }

    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No blog posts left to syndicate to Quora",
      });
    }

    // Process 2 blog posts per run
    const toProcess = candidates.slice(0, 2);
    const anthropic = new Anthropic();
    const proxyUrl = buildProxyUrl();
    const newLogEntries: QuoraLogEntry[] = [];
    const newSuggestions: ReplySuggestion[] = [];

    for (const post of toProcess) {
      try {
        // Step 1: Generate a search query to find matching Quora questions
        const queryResponse = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 100,
          messages: [
            {
              role: "user",
              content: `Generate a short Google search query (5-8 words) that would find a Quora question matching this blog post topic. The query should target questions people actually ask about this subject.

Blog title: "${post.title}"
Blog excerpt: "${post.excerpt}"

Return ONLY the search query text, nothing else.`,
            },
          ],
        });

        const searchQuery =
          queryResponse.content[0].type === "text"
            ? queryResponse.content[0].text.trim().replace(/^["']|["']$/g, "")
            : "";

        if (!searchQuery) {
          newLogEntries.push({
            slug: post.slug,
            title: post.title,
            quoraQuery: "",
            quoraUrl: null,
            answerGenerated: false,
            date: new Date().toISOString(),
          });
          continue;
        }

        // Step 2: Search Google for matching Quora question
        const quoraUrl = await searchGoogleForQuora(searchQuery, proxyUrl);

        if (!quoraUrl) {
          newLogEntries.push({
            slug: post.slug,
            title: post.title,
            quoraQuery: searchQuery,
            quoraUrl: null,
            answerGenerated: false,
            date: new Date().toISOString(),
          });
          continue;
        }

        // Step 3: Generate Quora-style answer from blog post
        const answerResponse = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 800,
          messages: [
            {
              role: "user",
              content: `Shorten this blog post into a Quora-style answer. Write as Harvest Wright, an experienced ICT trader and coach.

BLOG TITLE: ${post.title}
BLOG CONTENT:
${post.body.slice(0, 4000)}

RULES:
- 300-500 words, conversational Quora tone
- Helpful and educational, no hard sell
- Include personal experience/credibility naturally
- Use short paragraphs (2-3 sentences each)
- Include 1-2 specific, actionable tips
- Sound like an expert answering genuinely, not promoting
- Do NOT mention R2F Trading in the body
- End the answer naturally (do NOT add the attribution link, it will be added separately)

Return ONLY the answer text, nothing else.`,
            },
          ],
        });

        let answer =
          answerResponse.content[0].type === "text"
            ? answerResponse.content[0].text.trim()
            : "";

        if (!answer) {
          newLogEntries.push({
            slug: post.slug,
            title: post.title,
            quoraQuery: searchQuery,
            quoraUrl: quoraUrl,
            answerGenerated: false,
            date: new Date().toISOString(),
          });
          continue;
        }

        // Add attribution link at the bottom
        answer += `\n\nI wrote a more detailed breakdown here: r2ftrading.com/trading-insights/${post.slug}`;

        // Save as reply suggestion
        const suggestion: ReplySuggestion = {
          id: `quora-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          platform: "quora",
          postTitle: post.title,
          postUrl: quoraUrl,
          authorName: "Quora Question",
          suggestedReply: answer,
          createdAt: new Date().toISOString(),
          status: "pending",
        };
        newSuggestions.push(suggestion);

        newLogEntries.push({
          slug: post.slug,
          title: post.title,
          quoraQuery: searchQuery,
          quoraUrl: quoraUrl,
          answerGenerated: true,
          date: new Date().toISOString(),
        });

        console.log(
          `[quora-syndicate] Generated answer for: ${post.title} -> ${quoraUrl}`
        );
      } catch (err) {
        console.error(
          `[quora-syndicate] Error processing ${post.slug}:`,
          err
        );
        newLogEntries.push({
          slug: post.slug,
          title: post.title,
          quoraQuery: "",
          quoraUrl: null,
          answerGenerated: false,
          date: new Date().toISOString(),
        });
      }
    }

    // Save all updates
    if (newLogEntries.length > 0) {
      await saveQuoraLog([...quoraLog, ...newLogEntries]);
    }

    if (newSuggestions.length > 0) {
      const existingSuggestions = await loadReplySuggestions();
      await saveReplySuggestions([...newSuggestions, ...existingSuggestions]);

      // Notify via Telegram
      await sendTelegramReport(
        `📝 *Quora Syndication*: Generated ${newSuggestions.length} answer(s) ready for posting.\n\n${newSuggestions.map((s) => `• ${s.postTitle}\n  ${s.postUrl}`).join("\n\n")}\n\nCheck: r2ftrading.com/admin/reply-suggestions`
      );
    }

    return NextResponse.json({
      success: true,
      processed: toProcess.length,
      answersGenerated: newSuggestions.length,
      results: newLogEntries.map((e) => ({
        slug: e.slug,
        quoraUrl: e.quoraUrl,
        answerGenerated: e.answerGenerated,
      })),
    });
  } catch (err: unknown) {
    console.error("[quora-syndicate] Fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
