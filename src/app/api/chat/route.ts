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
- After 3+ messages, if they haven't booked yet, gently ask: "Would you like me to help you find a time for a free call with Harvest?"`;


export async function POST(req: NextRequest) {
  try {
    const { messages, sessionId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: messages.slice(-6).map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const reply = response.content[0].type === "text" ? response.content[0].text : "I couldn't process that. Try asking another question!";

    // Save transcript to GitHub (fire-and-forget)
    saveTranscript(sessionId || "unknown", messages, reply).catch(() => {});

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ reply: "I'm having trouble connecting. Please try again or message us on WhatsApp!" }, { status: 200 });
  }
}

async function saveTranscript(sessionId: string, messages: { role: string; content: string }[], latestReply: string) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const path = `data/chat-transcripts/${today}.json`;

    let transcripts: Record<string, { messages: { role: string; content: string; timestamp: string }[]; startedAt: string; lastActive: string }> = {};
    try {
      transcripts = JSON.parse(await readFile(path));
    } catch {} // File doesn't exist yet

    // Get or create session
    if (!transcripts[sessionId]) {
      transcripts[sessionId] = {
        messages: [],
        startedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      };
    }

    const session = transcripts[sessionId];

    // Add the latest user message + assistant reply
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg && lastUserMsg.role === "user") {
      session.messages.push({
        role: "user",
        content: lastUserMsg.content,
        timestamp: new Date().toISOString(),
      });
    }
    session.messages.push({
      role: "assistant",
      content: latestReply,
      timestamp: new Date().toISOString(),
    });
    session.lastActive = new Date().toISOString();

    // Keep max 50 sessions per day file
    const sessionKeys = Object.keys(transcripts);
    if (sessionKeys.length > 50) {
      delete transcripts[sessionKeys[0]];
    }

    await commitFile(path, JSON.stringify(transcripts, null, 2), `Chat: ${sessionId.slice(0, 8)}`);

    // Send email notification for new conversations (first message only)
    if (session.messages.filter(m => m.role === "user").length === 1) {
      try {
        const { sendEmail } = await import("@/lib/resend");
        await sendEmail(
          "road2funded@gmail.com",
          `New chatbot conversation on R2F Trading`,
          `<div style="font-family:Arial,sans-serif;max-width:600px;">
            <h2 style="color:#0d2137;">New Chatbot Conversation</h2>
            <p style="color:#555;">Someone just started chatting on your website.</p>
            <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
              <p style="color:#0d2137;margin:0 0 8px;"><strong>Visitor asked:</strong></p>
              <p style="color:#555;margin:0;">"${lastUserMsg?.content?.slice(0, 200) || "..."}"</p>
            </div>
            <div style="background:#f0f8ff;padding:16px;border-radius:8px;margin:16px 0;">
              <p style="color:#0d2137;margin:0 0 8px;"><strong>AI replied:</strong></p>
              <p style="color:#555;margin:0;">"${latestReply.slice(0, 200)}"</p>
            </div>
            <p style="color:#888;font-size:12px;">View all transcripts in your admin dashboard under Chat Logs.</p>
          </div>`
        );
      } catch {}
    }
  } catch {}
}
