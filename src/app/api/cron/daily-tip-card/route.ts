import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import { postTweetWithImage } from "@/lib/social";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const SITE_URL = "https://r2ftrading.com";

const CATEGORIES = [
  "ICT Concepts",
  "Risk Management",
  "Psychology",
  "Prop Firms",
  "Market Structure",
];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Read current tip count
    let tipCount = 0;
    try {
      const raw = await readFile("data/tip-count.json");
      tipCount = JSON.parse(raw).count || 0;
    } catch {
      // File doesn't exist yet
    }
    tipCount += 1;

    // Pick a random category
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

    // Generate tip with Claude
    const anthropic = new Anthropic();
    const tipRes = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Generate ONE killer trading tip for an ICT (Inner Circle Trader) focused audience.

Category: ${category}

Rules:
- 1-2 sentences max, punchy and actionable
- Use ICT terminology when relevant (order blocks, fair value gaps, liquidity sweeps, breaker blocks, market structure shifts, etc.)
- Must be immediately useful — something a trader can apply TODAY
- No fluff, no generic "be patient" advice
- Write in a direct, confident tone
- Do NOT use quotes or attribution — this is original advice
- Do NOT start with "Tip:" or any label

Return ONLY the tip text, nothing else.`,
        },
      ],
    });

    const tip =
      tipRes.content[0].type === "text" ? tipRes.content[0].text.trim() : "";

    if (!tip) {
      return NextResponse.json({ error: "Failed to generate tip" }, { status: 500 });
    }

    // Fetch the tip card image
    const cardUrl = new URL("/tip-card", SITE_URL);
    cardUrl.searchParams.set("tip", tip);
    cardUrl.searchParams.set("category", category);
    cardUrl.searchParams.set("number", String(tipCount));

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
    const imgPath = `public/tip-cards/tip-${tipCount}.png`;
    await commitFile(imgPath, imgBase64, `Tip card #${tipCount}: ${category}`, true);

    // Public URL for the saved image
    const imageUrl = `${SITE_URL}/tip-cards/tip-${tipCount}.png`;

    // Post to social platforms
    const results: { platform: string; status: string; message?: string }[] = [];

    const caption = `Trading Tip #${tipCount} — ${category}\n\n${tip}\n\n#ICTTrading #TradingTips #R2FTrading #ForexEducation #SmartMoney`;

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
        const igCaption = `Trading Tip #${tipCount} — ${category}\n\n${tip}\n\nSave this for your next session.\n\n#ICTTrading #TradingTips #R2FTrading #ForexEducation #SmartMoney #FundedTrader #OrderBlocks #FairValueGap #TradingPsychology #PropFirm`;
        // Step 1: Create media container
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
          // Step 2: Publish
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
        const tgCaption = `💡 *Trading Tip #${tipCount}* — ${category}\n\n${tip}\n\n#ICTTrading #R2FTrading`;
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
                title: `Trading Tip #${tipCount} — ${category}`,
                description: tip,
                color: 0xc9a84c,
                image: { url: imageUrl },
                footer: { text: "r2ftrading.com" },
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

    // Update tip count
    await commitFile(
      "data/tip-count.json",
      JSON.stringify({ count: tipCount, lastUpdated: new Date().toISOString() }, null, 2),
      `Update tip count to ${tipCount}`
    );

    // Save to tip cards log
    let log: Record<string, unknown>[] = [];
    try {
      const raw = await readFile("data/tip-cards-log.json");
      log = JSON.parse(raw);
    } catch {
      // File doesn't exist yet
    }

    log.push({
      number: tipCount,
      category,
      tip,
      imageUrl,
      date: new Date().toISOString(),
      results,
    });

    if (log.length > 100) log = log.slice(-100);

    await commitFile(
      "data/tip-cards-log.json",
      JSON.stringify(log, null, 2),
      `Tip card log #${tipCount}`
    );

    // Console log
    for (const r of results) {
      if (r.status === "success") console.log(`[tip-card] ✓ ${r.platform}`);
      else if (r.status === "skipped") console.log(`[tip-card] - ${r.platform}: ${r.message}`);
      else console.error(`[tip-card] ✗ ${r.platform}: ${r.message}`);
    }

    return NextResponse.json({
      success: true,
      tipNumber: tipCount,
      category,
      tip,
      imageUrl,
      results,
    });
  } catch (err) {
    console.error("[tip-card] Error:", err);
    return NextResponse.json(
      { error: String(err).slice(0, 500) },
      { status: 500 }
    );
  }
}
