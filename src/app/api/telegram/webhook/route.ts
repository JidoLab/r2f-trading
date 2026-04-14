import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { readFile, commitFile } from "@/lib/github";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are the friendly AI assistant for R2F Trading (r2ftrading.com), a professional ICT trading coaching website run by Harvest Wright.

ABOUT R2F TRADING:
- Harvest Wright is the sole mentor with 10+ years of ICT trading experience
- Achievements: TradingView Editors' Pick winner, Top 1% in trading competitions, FTMO Challenge passer
- Specializes in ICT (Inner Circle Trader) concepts and personalized 1-on-1 coaching

COACHING PLANS:
- Lite Plan: $150/week — 1 session/week (60-90 min), templates, action plans, Telegram/WhatsApp support
- Pro Plan: $200/week — 2 sessions/week, live market walkthroughs, recorded sessions, advanced resources
- Full Mentorship: $1,000/4 months — 2 sessions/week, psychological coaching, custom trading plan, free FTMO Challenge

KEY LINKS:
- Book a free discovery call: r2ftrading.com/contact
- View coaching plans: r2ftrading.com/coaching
- Student results: r2ftrading.com/results
- Read trading insights: r2ftrading.com/trading-insights
- Free ICT class: r2ftrading.com/free-class
- WhatsApp: wa.me/66935754757
- Telegram: t.me/Road2Funded

STUDENT TESTIMONIALS (use these naturally when relevant):
- "I finally feel confident in my trades. R2F worked through all the aspects holding me back." — T.W.
- "The mentorship was so tailored. The improvements in my trading psychology are incredible." — A.K.
- "I went from blowing accounts to passing FTMO within 2 months of coaching." — M.R.
- "Harvest's approach to risk management alone was worth the investment." — D.L.

OBJECTION HANDLING:
- "Too expensive" → Point out that one funded payout covers months of coaching. Many students recoup their investment within weeks. Also mention the free discovery call is zero commitment.
- "I can learn on YouTube" → Free content teaches WHAT to do, but 1-on-1 coaching fixes YOUR specific mistakes. That's why people watch hundreds of videos but still lose money.
- "I'm not ready" → That's exactly when coaching helps most — before bad habits form. Ask what's holding them back.
- "I've tried coaching before" → R2F is different because it's personalized 1-on-1, not group sessions. Harvest tailors everything to your exact situation, schedule, and trading style.
- "Does it actually work?" → Direct them to r2ftrading.com/results for real student testimonials and results.

YOUR RULES:
- You are responding in a Telegram group chat. Keep answers concise (2-3 sentences max).
- Answer questions about ICT trading, coaching, and R2F services
- For detailed trading questions, give a brief helpful answer, then suggest booking a free discovery call
- Never give specific financial advice or trading signals
- If asked about pricing, share the plans and emphasize the FREE discovery call (no commitment)
- If asked something unrelated to trading/coaching, politely redirect
- ALWAYS end responses with a clear next step — prioritize: 1) Book a free call, 2) Check the free class, 3) Read an article
- Naturally weave in social proof (student quotes) when discussing results or handling doubts
- Match the visitor's energy — if they're casual, be casual. If they're serious, be direct and professional.`;

const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN || "";

interface TelegramMessage {
  message_id: number;
  from?: { id: number; first_name: string; username?: string; is_bot?: boolean };
  chat: { id: number; type: string; title?: string };
  text?: string;
  reply_to_message?: TelegramMessage;
  entities?: { type: string; offset: number; length: number; user?: { id: number; is_bot?: boolean } }[];
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

function isBotMentioned(msg: TelegramMessage, botUsername?: string): boolean {
  // Check if message is a reply to the bot
  if (msg.reply_to_message?.from?.is_bot) {
    return true;
  }

  // Check for @mention in entities
  if (msg.entities) {
    for (const entity of msg.entities) {
      if (entity.type === "mention" && msg.text) {
        const mentionText = msg.text.substring(entity.offset, entity.offset + entity.length);
        if (botUsername && mentionText.toLowerCase() === `@${botUsername.toLowerCase()}`) {
          return true;
        }
      }
      // Also handle text_mention (for bots without usernames)
      if (entity.type === "text_mention" && entity.user?.is_bot) {
        return true;
      }
    }
  }

  return false;
}

async function loadConversation(userId: number): Promise<{ role: string; content: string }[]> {
  try {
    const path = `data/telegram-group-chats/${userId}.json`;
    const data = JSON.parse(await readFile(path));
    return data.messages || [];
  } catch {
    return [];
  }
}

async function saveConversation(userId: number, messages: { role: string; content: string }[]) {
  try {
    const path = `data/telegram-group-chats/${userId}.json`;
    // Keep only last 4 messages
    const trimmed = messages.slice(-4);
    await commitFile(
      path,
      JSON.stringify({ userId, messages: trimmed, updatedAt: new Date().toISOString() }, null, 2),
      `Telegram group chat: ${userId}`
    );
  } catch {
    // Non-critical, ignore
  }
}

async function sendTelegramMessage(chatId: number, text: string, replyToMessageId: number) {
  const token = BOT_TOKEN();
  if (!token) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_to_message_id: replyToMessageId,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    }),
  });
}

async function getBotInfo(): Promise<{ username?: string }> {
  const token = BOT_TOKEN();
  if (!token) return {};
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    if (res.ok) {
      const data = await res.json();
      return { username: data.result?.username };
    }
  } catch {
    // ignore
  }
  return {};
}

// Cache bot username in module scope
let cachedBotUsername: string | undefined;

export async function GET() {
  return NextResponse.json({
    status: "Telegram webhook endpoint",
    setup: [
      "To set up the webhook, send a POST request:",
      "",
      `POST https://api.telegram.org/bot{TOKEN}/setWebhook`,
      `Body: { "url": "https://r2ftrading.com/api/telegram/webhook" }`,
      "",
      "To verify: GET https://api.telegram.org/bot{TOKEN}/getWebhookInfo",
      "",
      "Make sure the bot is added to your Telegram group as an admin (or at least with read messages permission).",
      "Group privacy mode should be disabled for the bot to read all messages, OR users must @mention the bot.",
    ],
  });
}

export async function POST(req: NextRequest) {
  try {
    const update: TelegramUpdate = await req.json();
    const msg = update.message;

    // Always respond 200 to acknowledge webhook
    if (!msg || !msg.text || !msg.from || msg.from.is_bot) {
      return NextResponse.json({ ok: true });
    }

    // Only respond in group/supergroup chats
    if (msg.chat.type !== "group" && msg.chat.type !== "supergroup") {
      return NextResponse.json({ ok: true });
    }

    // Get bot username (cached)
    if (!cachedBotUsername) {
      const info = await getBotInfo();
      cachedBotUsername = info.username;
    }

    // Only respond when bot is mentioned or replied to
    if (!isBotMentioned(msg, cachedBotUsername)) {
      return NextResponse.json({ ok: true });
    }

    // Strip the @mention from the message text
    let userText = msg.text;
    if (cachedBotUsername) {
      userText = userText.replace(new RegExp(`@${cachedBotUsername}`, "gi"), "").trim();
    }

    if (!userText) {
      return NextResponse.json({ ok: true });
    }

    // Load conversation history for this user
    const history = await loadConversation(msg.from.id);
    history.push({ role: "user", content: userText });

    // Generate response with Claude
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: history.slice(-4).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const reply =
      response.content[0].type === "text"
        ? response.content[0].text
        : "I couldn't process that. Try asking another question!";

    // Save conversation
    history.push({ role: "assistant", content: reply });
    saveConversation(msg.from.id, history).catch(() => {});

    // Send reply in the group
    await sendTelegramMessage(msg.chat.id, reply, msg.message_id);

    return NextResponse.json({ ok: true });
  } catch {
    // Always return 200 to prevent Telegram from retrying
    return NextResponse.json({ ok: true });
  }
}
