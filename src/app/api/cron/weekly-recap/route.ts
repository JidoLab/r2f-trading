import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import { postTweetWithImage } from "@/lib/social";
import { buildMarketContext } from "@/lib/market-trends";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const SITE_URL = "https://r2ftrading.com";

function getWeekLabel(): string {
  const now = new Date();
  const endDate = new Date(now);
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 6);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return `${fmt(startDate)} - ${fmt(endDate)}, ${now.getFullYear()}`;
}

function getWeekKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const weekLabel = getWeekLabel();
    const weekKey = getWeekKey();

    // Get market context
    let marketContext = "";
    try {
      marketContext = await buildMarketContext();
    } catch {
      // Continue without market context
    }

    // Generate recap items with Claude
    const anthropic = new Anthropic();
    const recapRes = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `Generate a weekly market recap for forex/index traders who follow ICT (Inner Circle Trader) methodology.

Week: ${weekLabel}

${marketContext ? `Market context:\n${marketContext}` : ""}

Create 4-6 bullet points summarizing the most important market events, key levels, and moves from this past week. Focus on:
- Major currency pair moves (EUR/USD, GBP/USD, USD/JPY, etc.)
- S&P 500 / NAS100 key levels
- Important economic data releases and their impact
- Liquidity sweeps, order block reactions, or market structure shifts
- Any notable institutional flow or smart money activity

Rules:
- Each bullet should be 8-15 words max
- Use specific prices/levels when possible (estimate realistic ones for this week)
- Write in present tense or past tense, concise
- No emojis, no hashtags
- Each item on its own line, no bullet characters

Return ONLY the bullet items, one per line, nothing else.`,
        },
      ],
    });

    const recapText =
      recapRes.content[0].type === "text" ? recapRes.content[0].text.trim() : "";

    if (!recapText) {
      return NextResponse.json({ error: "Failed to generate recap" }, { status: 500 });
    }

    const items = recapText
      .split("\n")
      .map((s) => s.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 6);

    // Fetch the recap card image
    const cardUrl = new URL("/recap-card", SITE_URL);
    cardUrl.searchParams.set("title", "WEEKLY MARKET RECAP");
    cardUrl.searchParams.set("items", items.join("|"));
    cardUrl.searchParams.set("week", weekLabel);

    const imgRes = await fetch(cardUrl.toString());
    if (!imgRes.ok) {
      return NextResponse.json(
        { error: `Image generation failed: ${imgRes.status}` },
        { status: 500 }
      );
    }

    const imgBuffer = await imgRes.arrayBuffer();
    const imgBase64 = Buffer.from(imgBuffer).toString("base64");

    // Save image to GitHub
    const imgPath = `public/recap-cards/week-${weekKey}.png`;
    await commitFile(imgPath, imgBase64, `Weekly recap: ${weekLabel}`, true);

    const imageUrl = `${SITE_URL}/recap-cards/week-${weekKey}.png`;

    // Post to social platforms
    const results: { platform: string; status: string; message?: string }[] = [];

    const caption = `Weekly Market Recap — ${weekLabel}\n\n${items.map((item) => `• ${item}`).join("\n")}\n\n#ICTTrading #MarketRecap #R2FTrading #ForexAnalysis #WeeklyRecap`;

    // Twitter — image + caption
    try {
      const twitterResult = await postTweetWithImage(
        caption.length > 280 ? caption.slice(0, 277) + "..." : caption,
        imageUrl
      );
      results.push(twitterResult);
    } catch (err) {
      results.push({ platform: "twitter", status: "error", message: String(err).slice(0, 200) });
    }

    // Facebook — photo post
    try {
      const fbPageId = process.env.FACEBOOK_PAGE_ID;
      const fbToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
      if (fbPageId && fbToken) {
        const fbRes = await fetch(
          `https://graph.facebook.com/v21.0/${fbPageId}/photos`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: imageUrl,
              message: caption,
              access_token: fbToken,
            }),
          }
        );
        results.push({
          platform: "facebook",
          status: fbRes.ok ? "success" : "error",
          message: fbRes.ok ? undefined : (await fbRes.text()).slice(0, 200),
        });
      } else {
        results.push({ platform: "facebook", status: "skipped", message: "No credentials" });
      }
    } catch (err) {
      results.push({ platform: "facebook", status: "error", message: String(err).slice(0, 200) });
    }

    // Instagram — photo post
    try {
      const igAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
      const igToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
      if (igAccountId && igToken) {
        const igCaption = `Weekly Market Recap — ${weekLabel}\n\n${items.map((item) => `• ${item}`).join("\n")}\n\nFollow for daily ICT analysis.\n\n#ICTTrading #MarketRecap #R2FTrading #ForexAnalysis #WeeklyRecap #SmartMoney #FundedTrader #TradingEducation`;
        const createRes = await fetch(
          `https://graph.facebook.com/v21.0/${igAccountId}/media`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image_url: imageUrl,
              caption: igCaption,
              access_token: igToken,
            }),
          }
        );
        if (createRes.ok) {
          const { id: containerId } = await createRes.json();
          const publishRes = await fetch(
            `https://graph.facebook.com/v21.0/${igAccountId}/media_publish`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                creation_id: containerId,
                access_token: igToken,
              }),
            }
          );
          results.push({
            platform: "instagram",
            status: publishRes.ok ? "success" : "error",
            message: publishRes.ok ? undefined : (await publishRes.text()).slice(0, 200),
          });
        } else {
          results.push({
            platform: "instagram",
            status: "error",
            message: (await createRes.text()).slice(0, 200),
          });
        }
      } else {
        results.push({ platform: "instagram", status: "skipped", message: "No credentials" });
      }
    } catch (err) {
      results.push({ platform: "instagram", status: "error", message: String(err).slice(0, 200) });
    }

    // Telegram — photo post
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHANNEL_ID || "@r2ftradinginsights";
      if (botToken) {
        const tgCaption = `📊 *Weekly Market Recap*\n${weekLabel}\n\n${items.map((item) => `• ${item}`).join("\n")}\n\n#ICTTrading #R2FTrading`;
        const tgRes = await fetch(
          `https://api.telegram.org/bot${botToken}/sendPhoto`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              photo: imageUrl,
              caption: tgCaption,
              parse_mode: "Markdown",
            }),
          }
        );
        results.push({
          platform: "telegram",
          status: tgRes.ok ? "success" : "error",
          message: tgRes.ok ? undefined : (await tgRes.text()).slice(0, 200),
        });
      } else {
        results.push({ platform: "telegram", status: "skipped", message: "No bot token" });
      }
    } catch (err) {
      results.push({ platform: "telegram", status: "error", message: String(err).slice(0, 200) });
    }

    // Discord — embed with image
    try {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      if (webhookUrl) {
        const dcRes = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "R2F Trading",
            embeds: [
              {
                title: `Weekly Market Recap — ${weekLabel}`,
                description: items.map((item) => `• ${item}`).join("\n"),
                color: 0xc9a84c,
                image: { url: imageUrl },
                footer: { text: "r2ftrading.com • Follow for daily analysis" },
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        });
        results.push({
          platform: "discord",
          status: dcRes.ok || dcRes.status === 204 ? "success" : "error",
          message: dcRes.ok || dcRes.status === 204 ? undefined : (await dcRes.text()).slice(0, 200),
        });
      } else {
        results.push({ platform: "discord", status: "skipped", message: "No webhook URL" });
      }
    } catch (err) {
      results.push({ platform: "discord", status: "error", message: String(err).slice(0, 200) });
    }

    // Save to recap log
    let log: Record<string, unknown>[] = [];
    try {
      const raw = await readFile("data/recap-log.json");
      log = JSON.parse(raw);
    } catch {
      // File doesn't exist yet
    }

    log.push({
      week: weekLabel,
      weekKey,
      items,
      imageUrl,
      date: new Date().toISOString(),
      results,
    });

    if (log.length > 50) log = log.slice(-50);

    await commitFile(
      "data/recap-log.json",
      JSON.stringify(log, null, 2),
      `Weekly recap log: ${weekLabel}`
    );

    // Console log
    for (const r of results) {
      if (r.status === "success") console.log(`[weekly-recap] ✓ ${r.platform}`);
      else if (r.status === "skipped") console.log(`[weekly-recap] - ${r.platform}: ${r.message}`);
      else console.error(`[weekly-recap] ✗ ${r.platform}: ${r.message}`);
    }

    return NextResponse.json({
      success: true,
      week: weekLabel,
      items,
      imageUrl,
      results,
    });
  } catch (err) {
    console.error("[weekly-recap] Error:", err);
    return NextResponse.json(
      { error: String(err).slice(0, 500) },
      { status: 500 }
    );
  }
}
