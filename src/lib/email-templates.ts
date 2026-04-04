const BRAND = {
  navy: "#0d2137",
  gold: "#c9a84c",
  cream: "#f5f0e8",
  url: "https://r2ftrading.com",
};

function layout(title: string, body: string, cta?: { text: string; url: string }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;">
  <div style="background:${BRAND.navy};padding:24px 32px;">
    <span style="font-size:24px;font-weight:900;color:#fff;">R<span style="color:${BRAND.gold}">2</span>F</span>
    <span style="font-size:10px;color:rgba(255,255,255,0.6);letter-spacing:3px;text-transform:uppercase;margin-left:6px;">Trading</span>
  </div>
  <div style="padding:32px;">
    <h1 style="color:${BRAND.navy};font-size:22px;margin:0 0 20px;">${title}</h1>
    ${body}
    ${cta ? `<div style="text-align:center;margin:32px 0 16px;">
      <a href="${cta.url}" style="display:inline-block;background:${BRAND.gold};color:${BRAND.navy};font-weight:700;font-size:14px;padding:14px 28px;text-decoration:none;border-radius:6px;text-transform:uppercase;letter-spacing:1px;">${cta.text}</a>
    </div>` : ""}
  </div>
  <div style="background:${BRAND.cream};padding:20px 32px;text-align:center;font-size:12px;color:#888;">
    <p>&copy; ${new Date().getFullYear()} R2F Trading · <a href="${BRAND.url}" style="color:${BRAND.gold};">r2ftrading.com</a></p>
    <p>You received this because you signed up at r2ftrading.com</p>
  </div>
</div>
</body></html>`;
}

export function welcomeEmail(): { subject: string; html: string } {
  return {
    subject: "Welcome to R2F Trading — Here's Your Free ICT Checklist",
    html: layout(
      "Welcome to R2F Trading!",
      `<p style="color:#555;line-height:1.7;">Hey there,</p>
      <p style="color:#555;line-height:1.7;">Thanks for joining the R2F community! I'm Harvest, and I'm excited to share my ICT trading knowledge with you.</p>
      <p style="color:#555;line-height:1.7;">Attached to this email is your <strong>ICT Trading Checklist</strong> — a practical guide I use before, during, and after every trade. Print it out, keep it next to your charts, and watch how much more disciplined your trading becomes.</p>
      <p style="color:#555;line-height:1.7;">Over the next couple of weeks, I'll be sending you some of my best insights on ICT trading. Keep an eye on your inbox!</p>
      <p style="color:#555;line-height:1.7;">Talk soon,<br><strong style="color:${BRAND.navy};">Harvest Wright</strong><br>R2F Trading</p>`,
      { text: "Explore Coaching Plans", url: `${BRAND.url}/coaching` }
    ),
  };
}

export function beginnerMistakesEmail(): { subject: string; html: string } {
  return {
    subject: "3 Mistakes Every Beginner ICT Trader Makes (And How to Fix Them)",
    html: layout(
      "3 Mistakes That Are Killing Your Trades",
      `<p style="color:#555;line-height:1.7;">Hey,</p>
      <p style="color:#555;line-height:1.7;">After coaching hundreds of traders, I see the same 3 mistakes over and over:</p>
      <p style="color:#555;line-height:1.7;"><strong style="color:${BRAND.navy};">1. Trading without a clear bias.</strong> Most beginners jump into trades based on patterns alone, without understanding the higher-timeframe narrative. Before every session, ask: "Where is price likely going today, and why?"</p>
      <p style="color:#555;line-height:1.7;"><strong style="color:${BRAND.navy};">2. Ignoring Killzones.</strong> 80% of the daily range happens during the London and New York opens. Trading outside these windows means lower probability and wider spreads.</p>
      <p style="color:#555;line-height:1.7;"><strong style="color:${BRAND.navy};">3. Moving stop losses.</strong> This is the #1 account killer. Set it, forget it. If your stop gets hit, the trade was wrong — accept it and move on.</p>
      <p style="color:#555;line-height:1.7;">Fix these three things and you'll already be ahead of 90% of retail traders.</p>`,
      { text: "Read More on Our Blog", url: `${BRAND.url}/trading-insights` }
    ),
  };
}

export function ictConceptsEmail(): { subject: string; html: string } {
  return {
    subject: "How ICT Concepts Changed Everything for Me",
    html: layout(
      "The Moment ICT Clicked for Me",
      `<p style="color:#555;line-height:1.7;">Hey,</p>
      <p style="color:#555;line-height:1.7;">I spent years losing money with traditional indicators — RSI, MACD, moving averages. Sound familiar?</p>
      <p style="color:#555;line-height:1.7;">The turning point was when I discovered <strong>ICT concepts</strong>. For the first time, I could see <em>why</em> price moved, not just <em>that</em> it moved. Order blocks, fair value gaps, liquidity sweeps — these aren't just fancy terms. They're the footprints institutional traders leave behind.</p>
      <p style="color:#555;line-height:1.7;">The problem? There's so much ICT content online that it's overwhelming. I wasted months trying to learn everything at once instead of mastering one concept at a time.</p>
      <p style="color:#555;line-height:1.7;">That's exactly why I created R2F — to give traders a clear, structured path through ICT concepts without the confusion. No fluff, no contradictions, just the stuff that actually makes you profitable.</p>`,
      { text: "See How Coaching Works", url: `${BRAND.url}/coaching` }
    ),
  };
}

export function successStoryEmail(): { subject: string; html: string } {
  return {
    subject: "From Breakeven to Funded: A Student's Journey",
    html: layout(
      "Real Results from a Real Trader",
      `<p style="color:#555;line-height:1.7;">Hey,</p>
      <p style="color:#555;line-height:1.7;">I wanted to share something one of my students said recently:</p>
      <blockquote style="border-left:4px solid ${BRAND.gold};padding:12px 20px;margin:20px 0;background:${BRAND.cream};border-radius:4px;">
        <p style="color:${BRAND.navy};font-style:italic;margin:0;">"Before working with R2F, I constantly second-guessed every decision. Now I can actually see consistent and gradual growth on my accounts!"</p>
        <p style="color:#888;font-size:13px;margin:8px 0 0;">— T.W.</p>
      </blockquote>
      <p style="color:#555;line-height:1.7;">T.W. came to me roughly breakeven. Within a few months of structured coaching, they completely transformed their approach — not just their strategy, but their mindset and discipline.</p>
      <p style="color:#555;line-height:1.7;">The difference? <strong>Personalized guidance.</strong> Generic courses give you theory. One-on-one coaching gives you accountability, real-time feedback, and a plan designed for YOUR strengths.</p>
      <p style="color:#555;line-height:1.7;">Every trader's journey is different. What does yours look like?</p>`,
      { text: "Book a Free Discovery Call", url: `${BRAND.url}/contact` }
    ),
  };
}

export function coachingCtaEmail(): { subject: string; html: string } {
  return {
    subject: "Ready to Get Serious About Trading? Let's Talk.",
    html: layout(
      "Your Next Step",
      `<p style="color:#555;line-height:1.7;">Hey,</p>
      <p style="color:#555;line-height:1.7;">Over the past two weeks, I've shared some of my best insights with you — common mistakes, ICT concepts, and real results from students.</p>
      <p style="color:#555;line-height:1.7;">But here's the truth: <strong>reading about trading isn't the same as doing it with guidance.</strong></p>
      <p style="color:#555;line-height:1.7;">If you're serious about becoming a consistently profitable trader, I'd love to chat. I offer a <strong>completely free discovery call</strong> where we can:</p>
      <ul style="color:#555;line-height:2;">
        <li>Discuss your current trading level and goals</li>
        <li>Identify what's holding you back</li>
        <li>Create a roadmap for your trading journey</li>
      </ul>
      <p style="color:#555;line-height:1.7;">No pressure, no hard sell. Just a conversation between traders.</p>
      <p style="color:#555;line-height:1.7;">Mentorship starts from just <strong style="color:${BRAND.gold};">$150/week</strong> — and the first call is on me.</p>`,
      { text: "Book Your Free Call Now", url: `${BRAND.url}/contact` }
    ),
  };
}
