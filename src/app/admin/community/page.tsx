"use client";

import { useState } from "react";

const TIPS = [
  "Always wait for confirmation before entering a trade. Patience is key in ICT trading.",
  "Your risk management is more important than your win rate. Focus on protecting capital first.",
  "Study the daily bias before the session opens. Know where liquidity is sitting.",
  "Mark your premium and discount zones on the higher timeframes first, then zoom in.",
  "ICT Order Blocks are institutional footprints. Learn to read them, not just draw them.",
  "The best trades come from confluences — don't trade a single signal in isolation.",
  "Focus on one kill zone at a time. Master it before moving to the next session.",
  "Your journal is your edge. Track setups, emotions, and outcomes religiously.",
];

export default function CommunityPage() {
  const [message, setMessage] = useState("");
  const [platform, setPlatform] = useState<"both" | "telegram" | "discord">("both");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ platform: string; ok: boolean; error?: string }[] | null>(null);

  async function sendMessage(text?: string) {
    const msg = text || message;
    if (!msg.trim()) return;
    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, message: msg }),
      });
      const data = await res.json();
      setResult(data.results || [{ platform: "error", ok: false, error: data.error }]);
      if (data.results?.every((r: { ok: boolean }) => r.ok)) {
        if (!text) setMessage("");
      }
    } catch {
      setResult([{ platform: "error", ok: false, error: "Network error" }]);
    }
    setSending(false);
  }

  function sendRandomTip() {
    const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    const formatted = `💡 *ICT Trading Tip*\n\n${tip}\n\n— R2F Trading | r2ftrading.com/free-class`;
    sendMessage(formatted);
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Community Manager</h1>
        <p className="text-white/50 text-sm">Post announcements and tips to Telegram & Discord</p>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Quick Post</h2>

        {/* Platform selector */}
        <div className="flex gap-2">
          {(["both", "telegram", "discord"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                platform === p
                  ? "bg-gold text-navy"
                  : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              {p === "both" ? "Both Platforms" : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* Message input */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your announcement or tip... (Markdown supported)"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 text-sm resize-y min-h-[100px] focus:outline-none focus:ring-1 focus:ring-gold/50"
          rows={4}
        />

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => sendMessage()}
            disabled={sending || !message.trim()}
            className="px-6 py-2.5 bg-gold text-navy font-bold rounded-lg text-sm hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? "Sending..." : "Send Message"}
          </button>

          <button
            onClick={sendRandomTip}
            disabled={sending}
            className="px-6 py-2.5 bg-white/10 text-white font-medium rounded-lg text-sm hover:bg-white/15 transition-colors disabled:opacity-50"
          >
            Send Random Tip
          </button>
        </div>

        {/* Result feedback */}
        {result && (
          <div className="space-y-1">
            {result.map((r, i) => (
              <div key={i} className={`text-sm ${r.ok ? "text-green-400" : "text-red-400"}`}>
                {r.platform}: {r.ok ? "Sent successfully" : `Failed — ${r.error}`}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Setup Instructions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Telegram Setup */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold">Telegram Group Bot</h3>
              <p className="text-white/40 text-xs">AI chatbot in your Telegram group</p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-white/60">
            <p className="font-medium text-white/80">Setup Steps:</p>
            <ol className="list-decimal list-inside space-y-1.5 text-white/50">
              <li>Add your bot to the Telegram group</li>
              <li>Make the bot an admin (needs &quot;Read Messages&quot; permission)</li>
              <li>Disable privacy mode via @BotFather: /mybots &rarr; Bot Settings &rarr; Group Privacy &rarr; Turn Off</li>
              <li>Set the webhook:</li>
            </ol>
            <div className="bg-black/30 rounded-lg p-3 font-mono text-xs text-white/70 overflow-x-auto">
              <div>POST https://api.telegram.org/bot&#123;TOKEN&#125;/setWebhook</div>
              <div className="mt-1 text-white/50">Body: &#123; &quot;url&quot;: &quot;https://r2ftrading.com/api/telegram/webhook&quot; &#125;</div>
            </div>
            <p className="text-white/40 text-xs mt-2">Users @mention the bot or reply to it to get AI responses about ICT trading and R2F coaching.</p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <div className={`w-2 h-2 rounded-full ${process.env.NEXT_PUBLIC_TELEGRAM_CONFIGURED ? "bg-green-400" : "bg-yellow-400"}`} />
            <span className="text-xs text-white/40">
              {process.env.NEXT_PUBLIC_TELEGRAM_CONFIGURED ? "Connected" : "Check env vars: TELEGRAM_BOT_TOKEN"}
            </span>
          </div>
        </div>

        {/* Discord Setup */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400">
                <path d="M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0" />
                <path d="M20.3 10.6c-.2-1.5-.7-2.8-1.5-4L17 5.2a10 10 0 0 0-10 0L5.2 6.5c-.8 1.3-1.3 2.6-1.5 4.1a10 10 0 0 0 0 4.8c.2 1.5.7 2.8 1.5 4l1.8 1.4a10 10 0 0 0 10 0l1.8-1.4c.8-1.2 1.3-2.5 1.5-4a10 10 0 0 0 0-4.8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold">Discord Server</h3>
              <p className="text-white/40 text-xs">Auto-post content via webhook</p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-white/60">
            <p className="font-medium text-white/80">Setup Steps:</p>
            <ol className="list-decimal list-inside space-y-1.5 text-white/50">
              <li>Create a Discord server for R2F Trading</li>
              <li>Go to Server Settings &rarr; Integrations &rarr; Webhooks</li>
              <li>Create a webhook in your #announcements channel</li>
              <li>Copy the webhook URL and add to Vercel env vars as DISCORD_WEBHOOK_URL</li>
              <li>Blog posts and tips will auto-post to Discord</li>
            </ol>
            <p className="text-white/40 text-xs mt-2">For interactive Q&A, add a note in your Discord pointing members to the website chatbot at r2ftrading.com or the Telegram group.</p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <div className={`w-2 h-2 rounded-full ${process.env.NEXT_PUBLIC_DISCORD_CONFIGURED ? "bg-green-400" : "bg-yellow-400"}`} />
            <span className="text-xs text-white/40">
              {process.env.NEXT_PUBLIC_DISCORD_CONFIGURED ? "Connected" : "Check env vars: DISCORD_WEBHOOK_URL"}
            </span>
          </div>
        </div>
      </div>

      {/* Tips Template */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Message Templates</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { label: "Free Class Promo", text: "🎓 *Free ICT Trading Class Available*\n\nLearn the foundations of ICT trading concepts with our free starter class.\n\n👉 r2ftrading.com/free-class\n\nLimited spots available — start your journey today!" },
            { label: "Coaching CTA", text: "📈 *Ready to Level Up Your Trading?*\n\nR2F Trading offers personalized 1-on-1 ICT coaching:\n\n• Lite Plan: $150/week\n• Pro Plan: $200/week\n• Full Mentorship: $1,000/4 months\n\nBook a FREE discovery call:\n👉 r2ftrading.com/contact" },
            { label: "Results Showcase", text: "🏆 *Student Results*\n\n\"I went from blowing accounts to passing FTMO within 2 months of coaching.\" — M.R.\n\nSee more results at r2ftrading.com/results\n\nReady to be next? Book a free call 👉 r2ftrading.com/contact" },
            { label: "Starter Kit Promo", text: "📦 *ICT Trading Starter Kit — $49*\n\nEverything you need to start trading ICT concepts:\n• Complete checklist\n• Entry models\n• Risk templates\n• Session guides\n\nGet yours: r2ftrading.com/starter-kit" },
          ].map((template) => (
            <button
              key={template.label}
              onClick={() => setMessage(template.text)}
              className="text-left p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors group"
            >
              <span className="text-sm font-medium text-white/70 group-hover:text-white">{template.label}</span>
              <p className="text-xs text-white/30 mt-1 line-clamp-2">{template.text.slice(0, 80)}...</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
