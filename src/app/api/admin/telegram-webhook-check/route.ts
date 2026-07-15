import { NextRequest, NextResponse } from "next/server";

// TEMPORARY diagnostic. Reports the bot's @username and webhook config so we can
// see why private /start isn't reaching the handler. With ?fix=1 it re-registers
// the webhook with allowed_updates that include private messages. Gated by a key.
// Never returns the bot token. Remove once the funnel is confirmed working.
const CHECK_KEY = "r2f-tgcheck-9k3xq7";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("key") !== CHECK_KEY) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN missing" }, { status: 500 });

  const api = (m: string) => `https://api.telegram.org/bot${token}/${m}`;

  // Fix mode: re-point the webhook at the www URL (the non-www URL 308-redirects,
  // which Telegram rejects) and ensure message updates are delivered.
  if (req.nextUrl.searchParams.get("fix") === "1") {
    const url = "https://www.r2ftrading.com/api/telegram/webhook";
    const set = await fetch(api("setWebhook"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        allowed_updates: ["message", "edited_message", "callback_query", "my_chat_member", "chat_member"],
        drop_pending_updates: false,
      }),
    }).then((r) => r.json()).catch((e) => ({ error: String(e) }));
    return NextResponse.json({ action: "setWebhook", url, result: set });
  }

  const [me, hook] = await Promise.all([
    fetch(api("getMe")).then((r) => r.json()).catch(() => null),
    fetch(api("getWebhookInfo")).then((r) => r.json()).catch(() => null),
  ]);

  return NextResponse.json({
    bot: me?.result
      ? { username: me.result.username, id: me.result.id, name: me.result.first_name, can_join_groups: me.result.can_join_groups }
      : me,
    webhook: hook?.result || hook,
  });
}
