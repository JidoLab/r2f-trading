import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are the friendly AI assistant for R2F Trading (r2ftrading.com), a professional ICT trading coaching website run by Harvest Wright.

ABOUT R2F TRADING:
- Harvest Wright is the sole mentor with 10+ years of ICT trading experience
- Achievements: TradingView Editors' Pick winner, Top 1% in trading competitions, FTMO Challenge passer
- Specializes in ICT (Inner Circle Trader) concepts and personalized 1-on-1 coaching

COACHING PLANS:
- Lite Plan: $150/week — 1 session/week (60-90 min), templates, action plans, Telegram/WhatsApp support
- Pro Plan: $200/week — 2 sessions/week, live market walkthroughs, recorded sessions, advanced resources
- Full Mentorship: $1,000/4 months — 2 sessions/week for 6 months, psychological coaching, custom trading plan, free FTMO Challenge

KEY LINKS:
- Book a free discovery call: r2ftrading.com/contact
- View coaching plans: r2ftrading.com/coaching
- Read trading insights: r2ftrading.com/trading-insights
- WhatsApp: wa.me/66935754757
- Telegram: t.me/Road2Funded

YOUR RULES:
- Be friendly, helpful, and concise (2-3 sentences max per response)
- Answer questions about ICT trading, coaching, and R2F services
- For detailed trading questions, give a brief answer and suggest booking a free discovery call
- Never give specific financial advice or trading signals
- If asked about pricing, share the plans above
- If asked something unrelated to trading/coaching, politely redirect
- Always end responses with a helpful next step (book a call, read an article, check coaching plans)`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: messages.slice(-6).map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const reply = response.content[0].type === "text" ? response.content[0].text : "I couldn't process that. Try asking another question!";

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ reply: "I'm having trouble connecting. Please try again or message us on WhatsApp!" }, { status: 200 });
  }
}
