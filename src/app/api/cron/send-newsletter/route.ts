import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { readFile, commitFile, listFiles } from "@/lib/github";
import { sendEmail } from "@/lib/resend";
import { getAllPosts } from "@/lib/blog";
import { buildMarketContext, getUpcomingEvents } from "@/lib/market-trends";
import { weeklyNewsletterEmail, type NewsletterContent } from "@/lib/email-templates";
import { sendTelegramReport } from "@/lib/telegram-report";

export const maxDuration = 120;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Get subscribers
    let subscribers: { email: string; name?: string; date: string; dripsSent: number }[] = [];
    try {
      const raw = await readFile("data/subscribers.json");
      subscribers = JSON.parse(raw);
    } catch {
      return NextResponse.json({ sent: 0, message: "No subscribers" });
    }

    if (subscribers.length === 0) {
      return NextResponse.json({ sent: 0, message: "No subscribers" });
    }

    // 2. Gather this week's blog posts
    const posts = getAllPosts();
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const recentPosts = posts.filter((p) => p.date >= oneWeekAgo).slice(0, 5);

    // 3. Gather this week's shorts
    let recentShorts: { title: string; youtubeUrl?: string; slug: string; createdAt: string }[] = [];
    try {
      const shortFiles = await listFiles("data/shorts/renders", ".json");
      for (const file of shortFiles.slice(-20)) {
        try {
          const raw = await readFile(file);
          const data = JSON.parse(raw);
          if (data.createdAt && data.createdAt >= oneWeekAgo) {
            recentShorts.push({
              title: data.title || data.slug,
              youtubeUrl: data.youtubeUrl,
              slug: data.slug,
              createdAt: data.createdAt,
            });
          }
        } catch { /* skip malformed */ }
      }
    } catch { /* no shorts */ }

    // Pick best short (one with YouTube URL preferred)
    const bestShort = recentShorts.find((s) => s.youtubeUrl) || recentShorts[0];

    // 4. Get market context
    let marketContext = "";
    try {
      marketContext = await buildMarketContext();
    } catch { /* fallback empty */ }

    // 5. Get upcoming events for "Coming Up" section
    const upcomingEvents = getUpcomingEvents(14);

    // 6. Use Claude to generate newsletter content
    const anthropic = new Anthropic();

    const articleSummary = recentPosts.length > 0
      ? recentPosts.map((p) => `- "${p.title}" (slug: ${p.slug}) — ${p.excerpt}`).join("\n")
      : "No new articles this week.";

    const shortSummary = bestShort
      ? `Best short: "${bestShort.title}"${bestShort.youtubeUrl ? ` — YouTube: ${bestShort.youtubeUrl}` : ""}`
      : "No shorts this week.";

    const eventSummary = upcomingEvents.length > 0
      ? upcomingEvents.map((e) => `- ${e.name} (${e.impact} impact)`).join("\n")
      : "No major events scheduled.";

    const prompt = `You are Harvest Wright, an ICT trading coach writing a weekly newsletter for R2F Trading subscribers.

Generate a weekly newsletter digest in JSON format. Be personable, knowledgeable, and concise.

THIS WEEK'S DATA:
- Blog posts published: ${recentPosts.length}
${articleSummary}

- Shorts published: ${recentShorts.length}
${shortSummary}

- Upcoming economic events (next 1-2 weeks):
${eventSummary}

${marketContext}

Return ONLY valid JSON with these fields:
{
  "subject": "curiosity-driven subject line, under 50 characters, no emojis",
  "marketRecap": "2-3 sentences summarizing this week's market action and what it means for ICT traders",
  "tipOfTheWeek": "one specific, actionable ICT trading tip (2-3 sentences). Reference a specific concept like order blocks, FVGs, liquidity sweeps, killzones, etc.",
  "comingUp": "brief summary of notable economic events next week and how traders should prepare (2-3 sentences)",
  "ctaType": "call" or "kit"
}

Rules:
- Subject line: curiosity-driven, under 50 chars, no emojis, makes traders want to open it
- Market recap: reference real market dynamics, be specific but not overly technical
- Tip: must be actionable and reference a specific ICT concept
- Coming up: mention specific events if available, otherwise general weekly prep advice
- ctaType: alternate between "call" (book discovery call) and "kit" (check out starter kit)`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Claude did not return valid JSON");
    }

    const generated = JSON.parse(jsonMatch[0]);

    // 7. Build newsletter content
    const newsletterContent: NewsletterContent = {
      subject: generated.subject || "Your Weekly Trading Edge",
      greeting: `Hey trader,`,
      marketRecap: generated.marketRecap || "Markets continue to present opportunities for disciplined ICT traders.",
      articles: recentPosts.slice(0, 3).map((p) => ({
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt || "Read the full article for actionable trading insights.",
      })),
      videoOfTheWeek: bestShort?.youtubeUrl
        ? { title: bestShort.title, url: bestShort.youtubeUrl }
        : undefined,
      tipOfTheWeek: generated.tipOfTheWeek || "Always wait for displacement before entering a trade. A strong impulse candle through an order block confirms institutional intent.",
      comingUp: generated.comingUp || "Review your higher timeframe charts this weekend and set your weekly bias before Monday's London open.",
      ctaText: generated.ctaType === "kit" ? "Check Out the Starter Kit" : "Book a Free Discovery Call",
      ctaUrl: generated.ctaType === "kit" ? "https://r2ftrading.com/coaching" : "https://r2ftrading.com/contact",
    };

    // 8. Generate the email
    const { subject, html } = weeklyNewsletterEmail(newsletterContent);

    // 9. Send in batches of 10 with 1s delay (Resend free tier = 100/day)
    let sent = 0;
    let failed = 0;
    const maxSend = 90; // Leave buffer for other emails

    for (let i = 0; i < subscribers.length && sent < maxSend; i += 10) {
      const batch = subscribers.slice(i, i + 10);
      const results = await Promise.allSettled(
        batch.map((sub) => {
          if (sent >= maxSend) return Promise.resolve();
          return sendEmail(sub.email, subject, html);
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          sent++;
        } else {
          failed++;
        }
      }

      // Wait 1 second between batches
      if (i + 10 < subscribers.length && sent < maxSend) {
        await sleep(1000);
      }
    }

    // 10. Save newsletter copy to GitHub
    const dateStr = new Date().toISOString().split("T")[0];
    const newsletterRecord = {
      date: dateStr,
      sentAt: new Date().toISOString(),
      subject,
      recipientCount: sent,
      failedCount: failed,
      totalSubscribers: subscribers.length,
      content: newsletterContent,
    };

    try {
      await commitFile(
        `data/newsletters/${dateStr}.json`,
        JSON.stringify(newsletterRecord, null, 2),
        `Weekly newsletter: ${dateStr} — sent to ${sent} subscribers`
      );
    } catch (err) {
      console.error("[newsletter] Failed to save copy to GitHub:", err);
    }

    // 11. Notify Harvest via Telegram
    try {
      await sendTelegramReport(
        `*Weekly Newsletter Sent*\n` +
        `Subject: ${subject}\n` +
        `Sent to: ${sent}/${subscribers.length} subscribers\n` +
        `Failed: ${failed}\n` +
        `Articles: ${newsletterContent.articles.length}\n` +
        `Video: ${newsletterContent.videoOfTheWeek ? "Yes" : "No"}`
      );
    } catch { /* telegram optional */ }

    return NextResponse.json({
      sent,
      failed,
      total: subscribers.length,
      subject,
      articles: newsletterContent.articles.length,
      video: !!newsletterContent.videoOfTheWeek,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Newsletter failed";
    console.error("[newsletter] Error:", msg);

    try {
      await sendTelegramReport(`*Newsletter Failed*\nError: ${msg}`);
    } catch { /* best effort */ }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
