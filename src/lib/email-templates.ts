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

// --- Segment-specific templates for lead scoring ---

export function socialProofEmail(): { subject: string; html: string } {
  return {
    subject: "How These Traders Went From Struggling to Funded",
    html: layout(
      "Results That Speak for Themselves",
      `<p style="color:#555;line-height:1.7;">Hey,</p>
      <p style="color:#555;line-height:1.7;">I want to show you what's possible when you have the right guidance:</p>
      <blockquote style="border-left:4px solid ${BRAND.gold};padding:12px 20px;margin:16px 0;background:${BRAND.cream};border-radius:4px;">
        <p style="color:${BRAND.navy};font-style:italic;margin:0;">"I got funded a couple of times but kept losing the accounts. R2F's mentorship on scaling and risk management was a game-changer. I'm not only keeping my account but steadily growing it."</p>
        <p style="color:#888;font-size:13px;margin:8px 0 0;">— A.S.</p>
      </blockquote>
      <blockquote style="border-left:4px solid ${BRAND.gold};padding:12px 20px;margin:16px 0;background:${BRAND.cream};border-radius:4px;">
        <p style="color:${BRAND.navy};font-style:italic;margin:0;">"The personalized approach changed everything. R2F focused on my specific weaknesses. The improvements in my trading psychology alone are incredible."</p>
        <p style="color:#888;font-size:13px;margin:8px 0 0;">— M.L.</p>
      </blockquote>
      <p style="color:#555;line-height:1.7;">These aren't overnight success stories. They're traders who committed to improvement and got the support they needed.</p>
      <p style="color:#555;line-height:1.7;">Want to see more results?</p>`,
      { text: "See Student Results", url: `${BRAND.url}/results` }
    ),
  };
}

export function bookCallSoftEmail(): { subject: string; html: string } {
  return {
    subject: "Quick Question About Your Trading Goals",
    html: layout(
      "Let's Chat About Your Trading",
      `<p style="color:#555;line-height:1.7;">Hey,</p>
      <p style="color:#555;line-height:1.7;">I noticed you've been checking out our coaching options — that tells me you're serious about improving your trading.</p>
      <p style="color:#555;line-height:1.7;">I'd love to hop on a <strong>free 15-minute call</strong> to hear about where you're at and what you're working toward. No pitch, no pressure — just a real conversation between traders.</p>
      <p style="color:#555;line-height:1.7;">Here's what we can cover:</p>
      <ul style="color:#555;line-height:2;">
        <li>Your current trading strategy and what's working (or not)</li>
        <li>Specific ICT concepts you're struggling with</li>
        <li>A personalized recommendation for your next steps</li>
      </ul>
      <p style="color:#555;line-height:1.7;">Even if coaching isn't the right fit, you'll walk away with actionable advice.</p>`,
      { text: "Book a Free 15-Min Call", url: `${BRAND.url}/contact` }
    ),
  };
}

export function bookCallUrgentEmail(): { subject: string; html: string } {
  return {
    subject: "I Have 3 Coaching Spots Left This Month",
    html: layout(
      "Limited Spots Available",
      `<p style="color:#555;line-height:1.7;">Hey,</p>
      <p style="color:#555;line-height:1.7;">I wanted to reach out directly because I can see you're actively exploring R2F coaching — and I respect that.</p>
      <p style="color:#555;line-height:1.7;">Quick heads up: I only take on a limited number of students at a time to ensure everyone gets the personalized attention they deserve. Right now, I have <strong style="color:${BRAND.gold};">3 spots remaining</strong> for this month.</p>
      <p style="color:#555;line-height:1.7;">If you've been thinking about it, now's the time to book a free discovery call. We'll figure out together if this is the right move for you.</p>
      <p style="color:#555;line-height:1.7;">No commitment required — just 15 minutes of your time.</p>`,
      { text: "Claim Your Free Call", url: `${BRAND.url}/contact` }
    ),
  };
}

export function reviewRequestEmail(name: string): { subject: string; html: string } {
  const firstName = name.split(" ")[0] || "there";
  return {
    subject: "Quick favor — how's your trading going?",
    html: layout(
      "How's Your Trading Journey Going?",
      `<p style="color:#555;line-height:1.7;">Hey ${firstName},</p>
      <p style="color:#555;line-height:1.7;">You've been with R2F Trading for a couple of weeks now, and I'd love to hear how it's going!</p>
      <p style="color:#555;line-height:1.7;">Whether you're seeing improvements in your consistency, psychology, risk management, or anything else — your feedback means the world to me. It helps me improve the coaching AND it helps other traders who are considering taking the same step you did.</p>
      <p style="color:#555;line-height:1.7;">If you have 30 seconds, I'd really appreciate a quick testimonial:</p>`,
      { text: "Share Your Experience", url: `${BRAND.url}/review` }
    ),
  };
}

export function limitedSpotsEmail(): { subject: string; html: string } {
  return {
    subject: "Last Chance: Coaching Applications Close Friday",
    html: layout(
      "Don't Miss This Window",
      `<p style="color:#555;line-height:1.7;">Hey,</p>
      <p style="color:#555;line-height:1.7;">This is the final reminder — coaching applications for this cycle close at the end of the week.</p>
      <p style="color:#555;line-height:1.7;">Here's what students who started this month are already saying:</p>
      <blockquote style="border-left:4px solid ${BRAND.gold};padding:12px 20px;margin:16px 0;background:${BRAND.cream};border-radius:4px;">
        <p style="color:${BRAND.navy};font-style:italic;margin:0;">"I finally feel confident in my trades. Harvest worked through all the aspects that were holding me back."</p>
        <p style="color:#888;font-size:13px;margin:8px 0 0;">— T.W.</p>
      </blockquote>
      <p style="color:#555;line-height:1.7;">Every week you wait is another week of trading without a plan. Let's change that.</p>
      <p style="color:#555;line-height:1.7;">Book your free call before spots fill up:</p>`,
      { text: "Book Before Friday", url: `${BRAND.url}/contact` }
    ),
  };
}
