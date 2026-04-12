import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { readFile, commitFile } from "@/lib/github";
import { sendWhatsAppMessage, markAsRead, isWhatsAppConfigured } from "@/lib/whatsapp";
import { sendTelegramReport } from "@/lib/telegram-report";

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
- Be friendly, helpful, and concise (2-3 sentences max per response)
- Answer questions about ICT trading, coaching, and R2F services
- For detailed trading questions, give a brief helpful answer, then suggest booking a free discovery call
- Never give specific financial advice or trading signals
- If asked about pricing, share the plans and emphasize the FREE discovery call (no commitment)
- If asked something unrelated to trading/coaching, politely redirect
- ALWAYS end responses with a clear next step — prioritize: 1) Book a free call, 2) Check the free class, 3) Read an article
- Naturally weave in social proof (student quotes) when discussing results or handling doubts
- Create subtle urgency when appropriate: "Harvest only takes a limited number of students" or "Spots fill up fast"
- If someone seems interested but hesitant, suggest the FREE class at r2ftrading.com/free-class as a low-commitment first step
- Match the visitor's energy — if they're casual, be casual. If they're serious, be direct and professional.
- After 3+ messages, if they haven't booked yet, gently ask: "Would you like me to help you find a time for a free call with Harvest?"
- You are chatting on WhatsApp — keep responses short and conversational. Use line breaks instead of long paragraphs.`;

interface WhatsAppMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  name?: string;
}

interface ChatHistory {
  phoneNumber: string;
  name: string;
  messages: WhatsAppMessage[];
  firstContact: string;
  lastActive: string;
}

// GET: Webhook verification
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// POST: Incoming messages
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // WhatsApp sends webhook events in this structure
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // Ignore status updates (delivery receipts, read receipts)
    if (value?.statuses) {
      return NextResponse.json({ status: "ok" });
    }

    const message = value?.messages?.[0];
    if (!message) {
      return NextResponse.json({ status: "ok" });
    }

    const senderPhone = message.from;
    const messageId = message.id;
    const senderName = value?.contacts?.[0]?.profile?.name || "Unknown";

    // Mark as read immediately
    markAsRead(messageId).catch(() => {});

    // Handle non-text messages
    if (message.type !== "text" && message.type !== "button") {
      await sendWhatsAppMessage(
        senderPhone,
        "I can only process text messages right now. Feel free to type your question and I'll help you out! 😊"
      );
      return NextResponse.json({ status: "ok" });
    }

    // Extract message text
    let userText = "";
    if (message.type === "text") {
      userText = message.text?.body || "";
    } else if (message.type === "button") {
      userText = message.button?.text || message.button?.payload || "";
    }

    if (!userText) {
      return NextResponse.json({ status: "ok" });
    }

    // Load conversation history
    const chatPath = `data/whatsapp-chats/${senderPhone}.json`;
    let history: ChatHistory = {
      phoneNumber: senderPhone,
      name: senderName,
      messages: [],
      firstContact: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };
    let isFirstMessage = false;

    try {
      const raw = await readFile(chatPath);
      history = JSON.parse(raw);
    } catch {
      // New conversation
      isFirstMessage = true;
    }

    // Add user message to history
    history.messages.push({
      role: "user",
      content: userText,
      timestamp: new Date().toISOString(),
      name: senderName,
    });
    history.lastActive = new Date().toISOString();
    history.name = senderName;

    // Prepare messages for Claude (last 6 messages)
    const recentMessages = history.messages.slice(-6).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Send to Claude
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: recentMessages,
    });

    const reply =
      response.content[0].type === "text"
        ? response.content[0].text
        : "I couldn't process that. Try asking another question!";

    // Send reply via WhatsApp
    await sendWhatsAppMessage(senderPhone, reply);

    // Add assistant reply to history
    history.messages.push({
      role: "assistant",
      content: reply,
      timestamp: new Date().toISOString(),
    });

    // Save conversation to GitHub (fire-and-forget)
    commitFile(
      chatPath,
      JSON.stringify(history, null, 2),
      `WhatsApp: ${senderName} (${senderPhone.slice(-4)})`
    ).catch(() => {});

    // Send Telegram alert for first-time contacts
    if (isFirstMessage) {
      sendTelegramReport(
        `📱 New WhatsApp conversation from ${senderName}:\n"${userText.slice(0, 200)}"`
      ).catch(() => {});
    }

    return NextResponse.json({ status: "ok" });
  } catch {
    // Always return 200 to WhatsApp to avoid retries
    return NextResponse.json({ status: "ok" });
  }
}
