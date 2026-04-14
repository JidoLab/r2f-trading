import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHANNEL_ID = () => process.env.TELEGRAM_CHANNEL_ID || "";
const DISCORD_WEBHOOK_URL = () => process.env.DISCORD_WEBHOOK_URL || "";

async function sendToTelegram(message: string): Promise<{ ok: boolean; error?: string }> {
  const token = BOT_TOKEN();
  const chatId = TELEGRAM_CHANNEL_ID();
  if (!token || !chatId) return { ok: false, error: "Telegram not configured" };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });
    if (res.ok) return { ok: true };
    const err = await res.text();
    return { ok: false, error: err.slice(0, 200) };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function sendToDiscord(message: string): Promise<{ ok: boolean; error?: string }> {
  const webhookUrl = DISCORD_WEBHOOK_URL();
  if (!webhookUrl) return { ok: false, error: "Discord webhook not configured" };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "R2F Trading",
        content: message,
      }),
    });
    if (res.ok || res.status === 204) return { ok: true };
    const err = await res.text();
    return { ok: false, error: err.slice(0, 200) };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { platform, message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const results: { platform: string; ok: boolean; error?: string }[] = [];

    if (platform === "telegram" || platform === "both") {
      const telegramResult = await sendToTelegram(message);
      results.push({ platform: "telegram", ...telegramResult });
    }

    if (platform === "discord" || platform === "both") {
      const discordResult = await sendToDiscord(message);
      results.push({ platform: "discord", ...discordResult });
    }

    if (results.length === 0) {
      return NextResponse.json({ error: "Invalid platform. Use: telegram, discord, or both" }, { status: 400 });
    }

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
