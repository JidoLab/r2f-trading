"use client";

import { useRef, useState } from "react";

// --- Brand Data ---
const BRAND_COLORS = [
  { name: "Navy", hex: "#0d2137", usage: "Primary background, headings" },
  { name: "Gold", hex: "#c9a84c", usage: "Accents, CTAs, highlights" },
  { name: "Cream", hex: "#f5f0e8", usage: "Light backgrounds, cards" },
  { name: "White", hex: "#ffffff", usage: "Text on dark, clean backgrounds" },
  { name: "Dark Navy", hex: "#091a2b", usage: "Footer, admin dashboard" },
  { name: "Gold Light", hex: "#d4b65c", usage: "Hover states" },
];

const FONTS = [
  { name: "Bebas Neue", usage: "Headings, display text", css: "var(--font-heading)", weight: "400" },
  { name: "Open Sans", usage: "Body text, UI elements", css: "var(--font-body)", weight: "300, 400, 600, 700, 800" },
  { name: "Merriweather", usage: "Serif headings, blog titles", css: "var(--font-serif)", weight: "300, 400, 700" },
];

const SHORT_BIO = `Harvest Wright is a professional ICT trading coach with 10+ years of market experience. TradingView Editors' Pick winner, Top 1% competitor, and FTMO Challenge passer. He runs R2F Trading, offering personalized 1-on-1 mentorship for traders at all levels.`;

const FULL_BIO = `Harvest Wright is the founder of R2F Trading (Road to Funded), a professional trading mentorship and coaching program built on ICT (Inner Circle Trader) concepts.

With over 10 years of trading experience, Harvest has earned a TradingView Editors' Pick award, placed in the Top 1% of trading competitions, and successfully passed the FTMO Challenge. His approach combines technical precision with psychological coaching, helping traders build the discipline and structure needed for consistent profitability.

R2F Trading offers personalized 1-on-1 coaching through three tiers: Lite ($150/week), Pro ($200/week), and Full Mentorship ($1,000/4 months). Students receive hands-on guidance including live market walkthroughs, custom trading plans, and direct access via Telegram and WhatsApp.`;

const BOILERPLATE = `R2F Trading (Road to Funded) is a professional ICT trading coaching program founded by Harvest Wright. Specializing in Inner Circle Trader concepts and personalized mentorship, R2F Trading helps aspiring and intermediate traders develop the skills, psychology, and discipline needed to achieve funded account status and consistent profitability. With a proven track record including TradingView recognition and top-tier competition placements, R2F Trading offers Lite, Pro, and Full Mentorship plans tailored to each trader's goals. Learn more at r2ftrading.com.`;

const SOCIAL_LINKS = [
  { platform: "Website", url: "https://r2ftrading.com", icon: "🌐" },
  { platform: "YouTube", url: "https://youtube.com/@R2F-Trading", icon: "📺" },
  { platform: "Twitter/X", url: "https://x.com/Road2Funded", icon: "𝕏" },
  { platform: "Telegram", url: "https://t.me/Road2Funded", icon: "✈️" },
  { platform: "WhatsApp", url: "https://wa.me/66935754757", icon: "📱" },
  { platform: "LinkedIn", url: "https://linkedin.com/in/harvest-wright", icon: "💼" },
  { platform: "Reddit", url: "https://reddit.com/user/Road2Funded", icon: "🔴" },
  { platform: "Discord", url: "https://discord.gg/r2ftrading", icon: "💬" },
  { platform: "Facebook", url: "https://facebook.com/R2FTrading", icon: "📘" },
];

const KEY_URLS = [
  { label: "Homepage", url: "https://r2ftrading.com" },
  { label: "Coaching Plans", url: "https://r2ftrading.com/coaching" },
  { label: "Book Free Call", url: "https://r2ftrading.com/contact" },
  { label: "Free ICT Class", url: "https://r2ftrading.com/free-class" },
  { label: "Student Results", url: "https://r2ftrading.com/results" },
  { label: "Trading Blog", url: "https://r2ftrading.com/trading-insights" },
  { label: "About", url: "https://r2ftrading.com/about" },
  { label: "Lead Magnet PDF", url: "https://r2ftrading.com/downloads/ict-trading-checklist.pdf" },
];

const HASHTAG_SETS: Record<string, string[]> = {
  "YouTube/General": ["#ICTTrading", "#ForexTrading", "#SmartMoneyConcepts", "#FundedTrader", "#TradingMentorship", "#R2FTrading", "#OrderBlocks", "#PropFirm"],
  "Twitter/X": ["#ICT", "#Forex", "#SmartMoney", "#FundedTrader", "#Trading", "#R2F", "#FTMO", "#PropFirm"],
  "Instagram": ["#icttrading", "#forextrading", "#smartmoneyconcepts", "#fundedtrader", "#tradingpsychology", "#r2ftrading", "#forexmentor", "#tradingcoach", "#propfirmchallenge", "#orderblocks"],
  "LinkedIn": ["#Trading", "#FinancialMarkets", "#Mentorship", "#TradingCoach", "#ICTConcepts", "#ForexTrading"],
};

const CTA_TEMPLATES = [
  { label: "Book a Call", text: "Book a free discovery call with Harvest to discuss your trading goals. No commitment, just a real conversation.\nhttps://r2ftrading.com/contact" },
  { label: "Free Class", text: "Join our free ICT trading class. Learn the 3 setups that actually work and the funded account blueprint.\nhttps://r2ftrading.com/free-class" },
  { label: "Free Checklist", text: "Grab the free ICT Trading Checklist. It's the exact checklist I use before every single trade.\nhttps://r2ftrading.com" },
  { label: "Results", text: "See what our students are achieving with ICT coaching.\nhttps://r2ftrading.com/results" },
  { label: "Blog", text: "Check out our latest trading insights and strategies.\nhttps://r2ftrading.com/trading-insights" },
];

// --- Components ---
function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`text-xs font-bold px-3 py-1.5 rounded transition-all ${
        copied ? "bg-green-500/20 text-green-400" : "bg-white/10 hover:bg-white/20 text-white/60 hover:text-white"
      }`}
    >
      {copied ? "Copied!" : label || "Copy"}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-lg font-semibold text-white mb-4 border-b border-white/10 pb-2">{title}</h2>
      {children}
    </div>
  );
}

export default function BrandingKitPage() {
  const sigRef = useRef<HTMLDivElement>(null);

  function copySignature() {
    if (!sigRef.current) return;
    const range = document.createRange();
    range.selectNodeContents(sigRef.current);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    document.execCommand("copy");
    sel?.removeAllRanges();
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Branding Kit</h1>
        <p className="text-white/50 text-sm mt-1">Everything you need to represent R2F Trading. Copy anything with one click.</p>
      </div>

      {/* Email Signature */}
      <Section title="📧 Email Signature">
        <div className="bg-white rounded-lg p-8 mb-4">
          <div ref={sigRef}>
            <table cellPadding="0" cellSpacing="0" style={{ fontFamily: "Arial, sans-serif", fontSize: "14px", color: "#333" }}>
              <tbody>
                <tr>
                  <td style={{ paddingRight: "16px", borderRight: "3px solid #c9a84c", verticalAlign: "top" }}>
                    <img src="https://r2ftrading.com/mentor.png" alt="Harvest Wright" width="80" height="80" style={{ borderRadius: "50%", display: "block" }} />
                  </td>
                  <td style={{ paddingLeft: "16px", verticalAlign: "top" }}>
                    <div style={{ fontWeight: 700, fontSize: "16px", color: "#0d2137", marginBottom: "2px" }}>Harvest Wright</div>
                    <div style={{ color: "#c9a84c", fontSize: "12px", fontWeight: 600, marginBottom: "8px", textTransform: "uppercase" as const, letterSpacing: "1px" }}>ICT Trading Mentor · R2F Trading</div>
                    <div style={{ fontSize: "12px", color: "#888", lineHeight: "1.8" }}>
                      🌐 <a href="https://r2ftrading.com" style={{ color: "#c9a84c", textDecoration: "none" }}>r2ftrading.com</a>{" · "}
                      📧 <a href="mailto:road2funded@gmail.com" style={{ color: "#c9a84c", textDecoration: "none" }}>road2funded@gmail.com</a><br />
                      📱 <a href="https://wa.me/66935754757" style={{ color: "#c9a84c", textDecoration: "none" }}>WhatsApp</a>{" · "}
                      ✈️ <a href="https://t.me/Road2Funded" style={{ color: "#c9a84c", textDecoration: "none" }}>Telegram</a>{" · "}
                      📺 <a href="https://youtube.com/@R2F-Trading" style={{ color: "#c9a84c", textDecoration: "none" }}>YouTube</a>
                    </div>
                    <div style={{ marginTop: "8px", fontSize: "11px", color: "#c9a84c", fontStyle: "italic" }}>
                      📊 Book a free discovery call → <a href="https://r2ftrading.com/contact" style={{ color: "#c9a84c", fontWeight: 700, textDecoration: "none" }}>r2ftrading.com/contact</a>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <button onClick={copySignature} className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-6 py-2.5 rounded-md transition-all">
          Copy Signature
        </button>
      </Section>

      {/* Bios */}
      <Section title="👤 Bios">
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-lg p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/40 text-xs font-bold uppercase tracking-wider">Short Bio (1 paragraph)</span>
              <CopyButton text={SHORT_BIO} />
            </div>
            <p className="text-white/70 text-sm leading-relaxed">{SHORT_BIO}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/40 text-xs font-bold uppercase tracking-wider">Full Bio (3 paragraphs)</span>
              <CopyButton text={FULL_BIO} />
            </div>
            <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line">{FULL_BIO}</p>
          </div>
        </div>
      </Section>

      {/* Boilerplate */}
      <Section title="📄 Boilerplate (About R2F Trading)">
        <div className="bg-white/5 border border-white/10 rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/40 text-xs font-bold uppercase tracking-wider">Press / Partnership / Guest Post</span>
            <CopyButton text={BOILERPLATE} />
          </div>
          <p className="text-white/70 text-sm leading-relaxed">{BOILERPLATE}</p>
        </div>
      </Section>

      {/* Brand Colors */}
      <Section title="🎨 Brand Colors">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {BRAND_COLORS.map(c => (
            <div key={c.hex} className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg shrink-0 border border-white/10" style={{ backgroundColor: c.hex }} />
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-semibold">{c.name}</div>
                <div className="text-white/40 text-xs">{c.usage}</div>
              </div>
              <CopyButton text={c.hex} label={c.hex} />
            </div>
          ))}
        </div>
      </Section>

      {/* Typography */}
      <Section title="🔤 Typography">
        <div className="space-y-3">
          {FONTS.map(f => (
            <div key={f.name} className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between">
              <div>
                <div className="text-white text-sm font-semibold">{f.name}</div>
                <div className="text-white/40 text-xs">{f.usage} · Weights: {f.weight}</div>
              </div>
              <CopyButton text={f.name} label="Copy Name" />
            </div>
          ))}
        </div>
      </Section>

      {/* Logo / Assets */}
      <Section title="🖼️ Logo & Assets">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a href="/favicon.png" download className="bg-white/5 border border-white/10 rounded-lg p-6 text-center hover:border-gold/30 transition-colors">
            <img src="/favicon.png" alt="R2F Logo" className="w-16 h-16 mx-auto mb-3" />
            <span className="text-white/60 text-xs">favicon.png</span>
          </a>
          <a href="/mentor.png" download className="bg-white/5 border border-white/10 rounded-lg p-6 text-center hover:border-gold/30 transition-colors">
            <img src="/mentor.png" alt="Harvest Wright" className="w-16 h-16 mx-auto mb-3 rounded-full object-cover" />
            <span className="text-white/60 text-xs">mentor.png</span>
          </a>
          <a href="/og-image.jpg" className="bg-white/5 border border-white/10 rounded-lg p-6 text-center hover:border-gold/30 transition-colors">
            <div className="w-16 h-10 mx-auto mb-3 bg-navy rounded flex items-center justify-center text-gold text-xs font-bold">OG</div>
            <span className="text-white/60 text-xs">og-image.jpg</span>
          </a>
        </div>
      </Section>

      {/* Social Links */}
      <Section title="🔗 Social Links">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {SOCIAL_LINKS.map(s => (
            <div key={s.platform} className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">{s.icon}</span>
                <div>
                  <div className="text-white text-sm font-semibold">{s.platform}</div>
                  <div className="text-white/40 text-xs truncate max-w-[200px]">{s.url}</div>
                </div>
              </div>
              <CopyButton text={s.url} />
            </div>
          ))}
        </div>
      </Section>

      {/* Key URLs */}
      <Section title="🔑 Key URLs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {KEY_URLS.map(u => (
            <div key={u.label} className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-white text-sm font-semibold">{u.label}</div>
                <div className="text-white/40 text-xs">{u.url}</div>
              </div>
              <CopyButton text={u.url} />
            </div>
          ))}
        </div>
      </Section>

      {/* Hashtag Sets */}
      <Section title="# Hashtag Sets">
        <div className="space-y-3">
          {Object.entries(HASHTAG_SETS).map(([platform, tags]) => (
            <div key={platform} className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm font-semibold">{platform}</span>
                <CopyButton text={tags.join(" ")} label="Copy All" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => navigator.clipboard.writeText(tag)}
                    className="bg-white/5 hover:bg-gold/20 text-white/50 hover:text-gold text-xs px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* CTA Templates */}
      <Section title="📣 CTA Templates">
        <div className="space-y-3">
          {CTA_TEMPLATES.map(cta => (
            <div key={cta.label} className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gold text-xs font-bold uppercase tracking-wider">{cta.label}</span>
                <CopyButton text={cta.text} />
              </div>
              <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line">{cta.text}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
