const BRAND = {
  navy: "#0d2137",
  gold: "#c9a84c",
  cream: "#f5f0e8",
  url: "https://r2ftrading.com",
};

export function layout(title: string, body: string, cta?: { text: string; url: string }) {
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
      <p style="color:#555;line-height:1.7;">If you have 30 seconds, I'd really appreciate a quick testimonial:</p>
      <p style="text-align:center;margin-top:20px;">
        <a href="https://search.google.com/local/writereview?placeid=${process.env.GOOGLE_PLACE_ID || "GOOGLE_PLACE_ID"}" style="display:inline-block;background:#4285f4;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;">Leave a Google Review</a>
      </p>
      <p style="text-align:center;color:#aaa;font-size:11px;margin-top:8px;">Or review us directly on Google</p>`,
      { text: "Share Your Experience", url: `${BRAND.url}/review` }
    ),
  };
}

export function hotLeadFollowUpEmail(name: string): { subject: string; html: string } {
  const firstName = name.split(" ")[0] || "there";
  return {
    subject: "Quick question for you",
    html: layout(
      "Quick question for you",
      `<p style="color:#555;line-height:1.7;">Hey ${firstName},</p>
      <p style="color:#555;line-height:1.7;">I noticed you've been exploring our coaching options — that tells me you're serious about leveling up your trading.</p>
      <p style="color:#555;line-height:1.7;">I'd love to hear what you're working on. Whether it's getting funded, improving consistency, or just figuring out where to start with ICT concepts — I've been there.</p>
      <p style="color:#555;line-height:1.7;">If you have 15 minutes, let's jump on a quick call. No pitch, just a real conversation about your goals.</p>
      <p style="color:#555;line-height:1.7;">Talk soon,<br><strong style="color:${BRAND.navy};">Harvest</strong></p>`,
      { text: "Book a Quick Call", url: `${BRAND.url}/contact` }
    ),
  };
}

// --- Student onboarding templates (post-payment) ---

export function sessionPrepEmail(name: string): { subject: string; html: string } {
  const firstName = name.split(" ")[0] || "there";
  return {
    subject: "Getting Ready for Your First Session",
    html: layout(
      "Prep for Your First Session",
      `<p style="color:#555;line-height:1.7;">Hey ${firstName},</p>
      <p style="color:#555;line-height:1.7;">Your first coaching session is coming up — here's how to get the most out of it:</p>
      <div style="background:${BRAND.cream};padding:20px;border-radius:8px;margin:20px 0;">
        <p style="color:${BRAND.navy};font-weight:700;margin:0 0 12px;">Before your session:</p>
        <ul style="color:#555;line-height:2;margin:0;">
          <li>Have your trading platform open (demo or live account)</li>
          <li>Pull up a 15-minute and 1-hour chart on your favorite pair</li>
          <li>Write down 2-3 specific questions or areas you want help with</li>
          <li>Review your last 3-5 trades — we'll go through them together</li>
        </ul>
      </div>
      <div style="background:${BRAND.cream};padding:20px;border-radius:8px;margin:20px 0;">
        <p style="color:${BRAND.navy};font-weight:700;margin:0 0 12px;">What to expect:</p>
        <ul style="color:#555;line-height:2;margin:0;">
          <li>We'll start by understanding where you're at right now</li>
          <li>I'll walk you through the key ICT concepts for your level</li>
          <li>You'll get a personalized action plan for the week ahead</li>
          <li>Sessions are relaxed and judgment-free — every question is a good one</li>
        </ul>
      </div>
      <p style="color:#555;line-height:1.7;">If you haven't already, add me on Telegram (<a href="https://t.me/Road2Funded" style="color:${BRAND.gold};">@Road2Funded</a>) for quick communication between sessions.</p>
      <p style="color:#555;line-height:1.7;">See you soon,<br><strong style="color:${BRAND.navy};">Harvest Wright</strong><br>R2F Trading</p>`,
      { text: "Book Your First Session", url: `${BRAND.url}/contact` }
    ),
  };
}

export function checkInEmail(name: string): { subject: string; html: string } {
  const firstName = name.split(" ")[0] || "there";
  return {
    subject: `Hey ${firstName}, how's everything going?`,
    html: layout(
      "Quick Check-In",
      `<p style="color:#555;line-height:1.7;">Hey ${firstName},</p>
      <p style="color:#555;line-height:1.7;">Just wanted to check in — how are you feeling about everything so far?</p>
      <p style="color:#555;line-height:1.7;">A few things I hear from students early on:</p>
      <ul style="color:#555;line-height:2;">
        <li>"There's so much to learn — where do I even start?"</li>
        <li>"I'm not sure if I'm applying the concepts correctly"</li>
        <li>"I had a great trade but I'm not sure why it worked"</li>
      </ul>
      <p style="color:#555;line-height:1.7;">All totally normal. That's exactly what our sessions are for.</p>
      <p style="color:#555;line-height:1.7;">If you have any questions between sessions, don't hesitate to reach out on Telegram or reply to this email. There's no such thing as a dumb question — seriously.</p>
      <p style="color:#555;line-height:1.7;">Keep going,<br><strong style="color:${BRAND.navy};">Harvest</strong></p>`,
      { text: "Message Me on Telegram", url: "https://t.me/Road2Funded" }
    ),
  };
}

export function weekOneEmail(name: string): { subject: string; html: string } {
  const firstName = name.split(" ")[0] || "there";
  return {
    subject: "Your First Week — Let's Keep the Momentum",
    html: layout(
      "One Week In!",
      `<p style="color:#555;line-height:1.7;">Hey ${firstName},</p>
      <p style="color:#555;line-height:1.7;">You've just completed your first week with R2F Trading — that's a big deal.</p>
      <p style="color:#555;line-height:1.7;">Most traders never invest in real mentorship. The fact that you did puts you ahead of 95% of retail traders out there.</p>
      <div style="background:${BRAND.cream};padding:20px;border-radius:8px;margin:20px 0;">
        <p style="color:${BRAND.navy};font-weight:700;margin:0 0 12px;">This week, focus on:</p>
        <ul style="color:#555;line-height:2;margin:0;">
          <li>Reviewing your session notes and key takeaways</li>
          <li>Practicing the concepts we covered on demo charts</li>
          <li>Journaling at least 3 trades (winners and losers)</li>
          <li>Booking your next session if you haven't already</li>
        </ul>
      </div>
      <p style="color:#555;line-height:1.7;">Consistency beats intensity. Even 30 minutes of focused chart time each day will compound into real skill over time.</p>
      <p style="color:#555;line-height:1.7;">Let's make week two even better,<br><strong style="color:${BRAND.navy};">Harvest</strong></p>`,
      { text: "Book Your Next Session", url: `${BRAND.url}/contact` }
    ),
  };
}

export function milestoneEmail(name: string): { subject: string; html: string } {
  const firstName = name.split(" ")[0] || "there";
  return {
    subject: `${firstName}, One Month of Growth — Here's What's Next`,
    html: layout(
      "One Month Milestone!",
      `<p style="color:#555;line-height:1.7;">Hey ${firstName},</p>
      <p style="color:#555;line-height:1.7;">It's been one month since you started with R2F Trading. Take a second to appreciate how far you've come.</p>
      <p style="color:#555;line-height:1.7;">Think about where you were 30 days ago compared to now. The concepts that seemed confusing? You're starting to see them on the charts. The trades that used to feel random? You're developing a real edge.</p>
      <blockquote style="border-left:4px solid ${BRAND.gold};padding:12px 20px;margin:20px 0;background:${BRAND.cream};border-radius:4px;">
        <p style="color:${BRAND.navy};font-style:italic;margin:0;">"The market rewards patience and discipline — not speed. You're building something that lasts."</p>
        <p style="color:#888;font-size:13px;margin:8px 0 0;">— Harvest Wright</p>
      </blockquote>
      <p style="color:#555;line-height:1.7;">Here's what separates traders who make it from those who don't: <strong>they keep showing up.</strong> Month one is in the books. Let's make month two the one where everything starts clicking.</p>
      <p style="color:#555;line-height:1.7;">Proud of you,<br><strong style="color:${BRAND.navy};">Harvest</strong></p>`,
      { text: "Book Your Next Session", url: `${BRAND.url}/contact` }
    ),
  };
}

// --- Referral system templates ---

export function referralBonusEmail(name: string, referralLink: string): { subject: string; html: string } {
  const firstName = name || "there";
  return {
    subject: "Share R2F Trading & Earn Bonuses",
    html: layout(
      "Share R2F Trading With Friends!",
      `<p style="color:#555;line-height:1.7;">Hey ${firstName},</p>
      <p style="color:#555;line-height:1.7;">Welcome to R2F Trading! Here's something exciting: you now have your own personal referral link.</p>
      <p style="color:#555;line-height:1.7;">When a friend signs up using your link, <strong>you both get our exclusive Advanced ICT Playbook PDF</strong> — a comprehensive guide covering advanced order flow, institutional price delivery, and kill zone strategies.</p>
      <div style="background:${BRAND.cream};border:2px dashed ${BRAND.gold};border-radius:8px;padding:20px;margin:24px 0;text-align:center;">
        <p style="color:${BRAND.navy};font-weight:700;font-size:13px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Your Referral Link</p>
        <a href="${referralLink}" style="color:${BRAND.gold};font-weight:700;font-size:15px;word-break:break-all;">${referralLink}</a>
      </div>
      <p style="color:#555;line-height:1.7;">Share it with your trading friends — the more who join, the more bonuses you unlock!</p>
      <p style="color:#555;line-height:1.7;"><strong>Refer 3 friends</strong> to unlock our <em>Premium Trading Journal Template</em>.</p>
      <p style="color:#555;line-height:1.7;">Talk soon,<br><strong style="color:${BRAND.navy};">Harvest Wright</strong><br>R2F Trading</p>`,
      { text: "Share Your Link Now", url: referralLink }
    ),
  };
}

export function friendJoinedEmail(name: string, friendName: string): { subject: string; html: string } {
  const firstName = name || "there";
  return {
    subject: "Your friend just joined R2F Trading!",
    html: layout(
      "Great News — Your Friend Joined!",
      `<p style="color:#555;line-height:1.7;">Hey ${firstName},</p>
      <p style="color:#555;line-height:1.7;">Your friend <strong>${friendName}</strong> just signed up for R2F Trading using your referral link!</p>
      <p style="color:#555;line-height:1.7;">As a thank you, you've both earned our <strong>Advanced ICT Playbook PDF</strong>. Check your inbox — it's on its way.</p>
      <div style="background:${BRAND.cream};border-radius:8px;padding:20px;margin:24px 0;text-align:center;">
        <p style="color:${BRAND.navy};font-size:32px;margin:0;">&#127881;</p>
        <p style="color:${BRAND.navy};font-weight:700;font-size:16px;margin:8px 0 4px;">Referral Successful!</p>
        <p style="color:#888;font-size:13px;margin:0;">Keep sharing to unlock even more bonuses.</p>
      </div>
      <p style="color:#555;line-height:1.7;">Keep spreading the word — <strong>refer 3 total friends</strong> to unlock our <em>Premium Trading Journal Template</em>!</p>`,
      { text: "Share With More Friends", url: `${BRAND.url}/refer` }
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

// --- Weekly Newsletter Template ---

export interface NewsletterContent {
  subject: string;
  greeting: string;
  marketRecap: string;
  articles: { title: string; slug: string; excerpt: string }[];
  videoOfTheWeek?: { title: string; url: string };
  tipOfTheWeek: string;
  comingUp: string;
  ctaText: string;
  ctaUrl: string;
}

export function weeklyNewsletterEmail(content: NewsletterContent): { subject: string; html: string } {
  const articleCards = content.articles.map((a) => `
    <tr><td style="padding:0 0 16px;">
      <a href="${BRAND.url}/trading-insights/${a.slug}" style="text-decoration:none;display:block;border:1px solid #e8e8e8;border-radius:8px;padding:16px;">
        <h3 style="margin:0 0 6px;color:${BRAND.navy};font-size:16px;font-weight:700;">${a.title}</h3>
        <p style="margin:0;color:#666;font-size:13px;line-height:1.5;">${a.excerpt}</p>
        <span style="display:inline-block;margin-top:8px;color:${BRAND.gold};font-weight:700;font-size:13px;">Read Article &#8594;</span>
      </a>
    </td></tr>
  `).join("");

  const videoSection = content.videoOfTheWeek ? `
    <tr><td style="padding:0 0 32px;">
      <h2 style="color:${BRAND.navy};font-size:18px;margin:0 0 12px;border-bottom:2px solid ${BRAND.gold};padding-bottom:8px;">Video of the Week</h2>
      <a href="${content.videoOfTheWeek.url}" style="text-decoration:none;display:block;background:${BRAND.cream};border-radius:8px;padding:16px;text-align:center;">
        <span style="font-size:32px;display:block;margin-bottom:8px;">&#9654;</span>
        <span style="color:${BRAND.navy};font-weight:700;font-size:15px;">${content.videoOfTheWeek.title}</span>
        <br><span style="color:${BRAND.gold};font-size:13px;font-weight:600;">Watch Now &#8594;</span>
      </a>
    </td></tr>
  ` : "";

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${content.subject}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;">
<tr><td align="center" style="padding:16px 8px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

  <tr><td style="background:${BRAND.navy};padding:28px 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td>
        <span style="font-size:28px;font-weight:900;color:#fff;font-family:Arial,sans-serif;">R<span style="color:${BRAND.gold}">2</span>F</span>
        <span style="font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:3px;text-transform:uppercase;margin-left:8px;">Weekly Digest</span>
      </td>
      <td style="text-align:right;">
        <span style="font-size:11px;color:rgba(255,255,255,0.4);">${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
      </td>
    </tr>
    </table>
  </td></tr>

  <tr><td style="padding:32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

      <tr><td style="padding:0 0 24px;">
        <p style="margin:0;color:#555;font-size:15px;line-height:1.7;">${content.greeting}</p>
      </td></tr>

      <tr><td style="padding:0 0 32px;">
        <h2 style="color:${BRAND.navy};font-size:18px;margin:0 0 12px;border-bottom:2px solid ${BRAND.gold};padding-bottom:8px;">This Week in Trading</h2>
        <p style="margin:0;color:#555;font-size:14px;line-height:1.7;">${content.marketRecap}</p>
      </td></tr>

      ${content.articles.length > 0 ? `
      <tr><td style="padding:0 0 32px;">
        <h2 style="color:${BRAND.navy};font-size:18px;margin:0 0 16px;border-bottom:2px solid ${BRAND.gold};padding-bottom:8px;">Top Articles</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${articleCards}
        </table>
      </td></tr>
      ` : ""}

      ${videoSection}

      <tr><td style="padding:0 0 32px;">
        <h2 style="color:${BRAND.navy};font-size:18px;margin:0 0 12px;border-bottom:2px solid ${BRAND.gold};padding-bottom:8px;">Tip of the Week</h2>
        <div style="background:${BRAND.cream};border-left:4px solid ${BRAND.gold};border-radius:0 8px 8px 0;padding:16px 20px;">
          <p style="margin:0;color:${BRAND.navy};font-size:14px;line-height:1.7;font-style:italic;">${content.tipOfTheWeek}</p>
        </div>
      </td></tr>

      <tr><td style="padding:0 0 32px;">
        <h2 style="color:${BRAND.navy};font-size:18px;margin:0 0 12px;border-bottom:2px solid ${BRAND.gold};padding-bottom:8px;">Coming Up</h2>
        <p style="margin:0;color:#555;font-size:14px;line-height:1.7;">${content.comingUp}</p>
      </td></tr>

      <tr><td style="padding:0 0 16px;text-align:center;">
        <a href="${content.ctaUrl}" style="display:inline-block;background:${BRAND.gold};color:${BRAND.navy};font-weight:700;font-size:14px;padding:14px 32px;text-decoration:none;border-radius:6px;text-transform:uppercase;letter-spacing:1px;">${content.ctaText}</a>
      </td></tr>

    </table>
  </td></tr>

  <tr><td style="background:${BRAND.cream};padding:24px 32px;text-align:center;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:0 0 12px;">
      <a href="https://youtube.com/@R2FTrading" style="text-decoration:none;color:${BRAND.navy};font-size:13px;margin:0 8px;">YouTube</a>
      <span style="color:#ccc;">|</span>
      <a href="https://twitter.com/R2FTrading" style="text-decoration:none;color:${BRAND.navy};font-size:13px;margin:0 8px;">Twitter</a>
      <span style="color:#ccc;">|</span>
      <a href="https://t.me/Road2Funded" style="text-decoration:none;color:${BRAND.navy};font-size:13px;margin:0 8px;">Telegram</a>
      <span style="color:#ccc;">|</span>
      <a href="${BRAND.url}/trading-insights" style="text-decoration:none;color:${BRAND.navy};font-size:13px;margin:0 8px;">Blog</a>
    </td></tr>
    <tr><td>
      <p style="margin:0 0 4px;font-size:12px;color:#888;">&copy; ${new Date().getFullYear()} R2F Trading &middot; <a href="${BRAND.url}" style="color:${BRAND.gold};">r2ftrading.com</a></p>
      <p style="margin:0;font-size:11px;color:#aaa;">You received this because you subscribed at r2ftrading.com</p>
      <p style="margin:6px 0 0;font-size:11px;"><a href="${BRAND.url}/unsubscribe" style="color:#aaa;text-decoration:underline;">Unsubscribe</a></p>
    </td></tr>
    </table>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;

  return { subject: content.subject, html };
}

export function instantWelcomeEmail(name: string): { subject: string; html: string } {
  const displayName = name || "there";
  return {
    subject: `Hey ${displayName}, just saw you joined`,
    html: layout(
      `Hey ${displayName}!`,
      `<p style="color:#555;line-height:1.7;">I just saw you signed up and wanted to personally say welcome. I'm Harvest, the founder of R2F Trading.</p>
      <p style="color:#555;line-height:1.7;">I've been trading ICT concepts for over 10 years, and I built this community to help traders like you skip the costly mistakes I made early on.</p>
      <p style="color:#555;line-height:1.7;">Quick question: <strong>what's your biggest challenge in trading right now?</strong> Hit reply and let me know. I read every response.</p>
      <p style="color:#555;line-height:1.7;">In the meantime, check out our free ICT class if you haven't already. It covers the 3 setups that actually work.</p>`,
      { text: "Watch the Free Class", url: `${BRAND.url}/free-class` }
    ),
  };
}

// --- Blog Post Notification ---

export function blogNotificationEmail(
  title: string,
  excerpt: string,
  slug: string
): { subject: string; html: string } {
  const postUrl = `${BRAND.url}/trading-insights/${slug}`;
  return {
    subject: `New: ${title}`,
    html: layout(
      title,
      `<p style="color:#555;line-height:1.7;">${excerpt}</p>
      <p style="color:#555;line-height:1.7;">Read the full breakdown on the blog — it's packed with actionable insights you can apply to your next session.</p>
      <p style="margin:8px 0 0;font-size:11px;color:#aaa;text-align:center;"><a href="${BRAND.url}/unsubscribe" style="color:#aaa;text-decoration:underline;">Unsubscribe</a></p>`,
      { text: "Read Now \u2192", url: postUrl }
    ),
  };
}

// --- Crash Course (5-Day ICT Email Course) ---

export function crashCourseDay1(name: string): { subject: string; html: string } {
  const firstName = name.split(" ")[0] || "there";
  return {
    subject: "Day 1: The ICT Foundation — Order Blocks, FVGs & Liquidity",
    html: layout(
      "Day 1: The ICT Foundation",
      `<p style="color:#555;line-height:1.7;">Hey ${firstName},</p>
      <p style="color:#555;line-height:1.7;">Welcome to Day 1 of the R2F 5-Day ICT Crash Course. Over the next 5 days, I'm going to break down the exact ICT framework I teach my funded students. Let's get into it.</p>
      <h2 style="color:${BRAND.navy};font-size:18px;margin:24px 0 12px;">What Are Order Blocks?</h2>
      <p style="color:#555;line-height:1.7;">An order block is the last candle before a strong move in the opposite direction. Think of it as the footprint of institutional money entering the market. Banks and hedge funds can't fill massive orders instantly — they leave traces. That trace is the order block.</p>
      <p style="color:#555;line-height:1.7;"><strong>Actionable tip:</strong> On a 1-hour chart, find the last bearish candle before a strong bullish push (or vice versa). Mark that zone. Price often returns to it before continuing.</p>
      <h2 style="color:${BRAND.navy};font-size:18px;margin:24px 0 12px;">Fair Value Gaps (FVGs)</h2>
      <p style="color:#555;line-height:1.7;">An FVG is a three-candle pattern where the wicks of candle 1 and candle 3 don't overlap, leaving a gap in price. This gap represents an imbalance — the market moved so fast that not all orders were filled. Price loves to come back and "fill" these gaps.</p>
      <p style="color:#555;line-height:1.7;"><strong>Actionable tip:</strong> When you spot an FVG on the 15-minute chart during a killzone, mark the gap. If price retraces into it, that's often a high-probability entry zone.</p>
      <h2 style="color:${BRAND.navy};font-size:18px;margin:24px 0 12px;">Liquidity Pools</h2>
      <p style="color:#555;line-height:1.7;">Liquidity sits above swing highs (buy-side) and below swing lows (sell-side). Equal highs and equal lows are magnets for price because that's where stop losses cluster. Smart money hunts these pools to fill their orders.</p>
      <p style="color:#555;line-height:1.7;"><strong>Actionable tip:</strong> Before every trade, ask yourself: "Where is the liquidity?" If price just swept a pool of liquidity, that's often the moment smart money reverses direction.</p>
      <div style="background:${BRAND.cream};border-left:4px solid ${BRAND.gold};padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
        <p style="color:${BRAND.navy};font-weight:700;margin:0 0 8px;">Tomorrow: Market Structure Decoded</p>
        <p style="color:#555;margin:0;font-size:14px;">I'll show you how to read BOS, CHOCH, and displacement — the backbone of every ICT trade.</p>
      </div>
      <p style="color:#555;line-height:1.7;">Talk soon,<br><strong style="color:${BRAND.navy};">Harvest Wright</strong><br>R2F Trading</p>
      <div style="border-top:1px solid #eee;margin-top:24px;padding-top:16px;text-align:center;">
        <p style="color:#aaa;font-size:12px;margin:0;">Know someone who'd love this course? <a href="${BRAND.url}/crash-course" style="color:${BRAND.gold};">Share it here</a></p>
      </div>`
    ),
  };
}

export function crashCourseDay2(name: string): { subject: string; html: string } {
  const firstName = name.split(" ")[0] || "there";
  return {
    subject: "Day 2: Market Structure Decoded — BOS, CHOCH & Displacement",
    html: layout(
      "Day 2: Market Structure Decoded",
      `<p style="color:#555;line-height:1.7;">Hey ${firstName},</p>
      <p style="color:#555;line-height:1.7;">Yesterday we covered the building blocks — order blocks, FVGs, and liquidity. Today, we're learning how to read the market's story through <strong>structure</strong>.</p>
      <h2 style="color:${BRAND.navy};font-size:18px;margin:24px 0 12px;">Break of Structure (BOS)</h2>
      <p style="color:#555;line-height:1.7;">A BOS happens when price breaks through a recent swing high (in a bullish trend) or swing low (in a bearish trend). It confirms that the current trend is continuing. Think of it as the market saying "I'm still going this way."</p>
      <p style="color:#555;line-height:1.7;"><strong>Actionable tip:</strong> In a bullish trend, wait for a BOS (higher high) then look for a pullback into an order block or FVG for your entry. Don't chase — let price come to you.</p>
      <h2 style="color:${BRAND.navy};font-size:18px;margin:24px 0 12px;">Change of Character (CHOCH)</h2>
      <p style="color:#555;line-height:1.7;">A CHOCH is the first sign that a trend might be reversing. In an uptrend, it's when price breaks below a recent swing low for the first time. It's the market's way of saying "something has shifted."</p>
      <p style="color:#555;line-height:1.7;"><strong>Actionable tip:</strong> Don't trade a CHOCH in isolation. Wait for confirmation — a CHOCH followed by a BOS in the new direction is a much stronger signal than a CHOCH alone.</p>
      <h2 style="color:${BRAND.navy};font-size:18px;margin:24px 0 12px;">Displacement</h2>
      <p style="color:#555;line-height:1.7;">Displacement is aggressive, one-sided price movement — big candles with little to no wicks. It shows institutional commitment. When you see displacement, smart money is making a move and they mean it.</p>
      <p style="color:#555;line-height:1.7;"><strong>Actionable tip:</strong> Look for displacement candles that leave FVGs behind. The combination of displacement + FVG = high-probability retracement zone.</p>
      <div style="background:${BRAND.cream};border-left:4px solid ${BRAND.gold};padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
        <p style="color:${BRAND.navy};font-weight:700;margin:0 0 8px;">Tomorrow: Killzone Mastery</p>
        <p style="color:#555;margin:0;font-size:14px;">I'll break down the exact session times where the highest-probability setups form — and when to stay away from the charts.</p>
      </div>
      <p style="color:#555;line-height:1.7;">Keep studying,<br><strong style="color:${BRAND.navy};">Harvest</strong></p>
      <div style="border-top:1px solid #eee;margin-top:24px;padding-top:16px;text-align:center;">
        <p style="color:#aaa;font-size:12px;margin:0;">Know someone who'd love this course? <a href="${BRAND.url}/crash-course" style="color:${BRAND.gold};">Share it here</a></p>
      </div>`
    ),
  };
}

export function crashCourseDay3(name: string): { subject: string; html: string } {
  const firstName = name.split(" ")[0] || "there";
  return {
    subject: "Day 3: Killzone Mastery — Session Timing & Optimal Entries",
    html: layout(
      "Day 3: Killzone Mastery",
      `<p style="color:#555;line-height:1.7;">Hey ${firstName},</p>
      <p style="color:#555;line-height:1.7;">Today's lesson might be the most impactful one in this entire course. I've seen traders improve their win rate by 20%+ just by filtering their trades by <strong>time</strong>.</p>
      <h2 style="color:${BRAND.navy};font-size:18px;margin:24px 0 12px;">The Three Killzones</h2>
      <div style="background:${BRAND.cream};padding:16px 20px;border-radius:8px;margin:16px 0;">
        <p style="color:${BRAND.navy};font-weight:700;margin:0 0 4px;">Asian Session: 8PM-12AM EST</p>
        <p style="color:#555;margin:0;font-size:14px;">The "accumulation" phase. Price often ranges here, building the liquidity pools that London and NY will target. Don't trade this — use it to identify where liquidity is building.</p>
      </div>
      <div style="background:${BRAND.cream};padding:16px 20px;border-radius:8px;margin:16px 0;">
        <p style="color:${BRAND.navy};font-weight:700;margin:0 0 4px;">London Open: 2AM-5AM EST</p>
        <p style="color:#555;margin:0;font-size:14px;">The manipulation phase. London often sweeps the Asian range highs or lows to grab liquidity before the real move. This is where your CHOCH signals and displacement happen.</p>
      </div>
      <div style="background:${BRAND.cream};padding:16px 20px;border-radius:8px;margin:16px 0;">
        <p style="color:${BRAND.navy};font-weight:700;margin:0 0 4px;">New York Open: 8:30AM-11AM EST</p>
        <p style="color:#555;margin:0;font-size:14px;">The highest-volume period. NY either continues London's move or reverses it. The 9:30-10AM window (NYSE open) is the most volatile 30 minutes of the day.</p>
      </div>
      <p style="color:#555;line-height:1.7;"><strong>Actionable tip:</strong> Before each session, mark the Asian range high and low. During the London or NY killzone, watch for price to sweep one of those levels, then look for your entry (order block + FVG + displacement) in the opposite direction.</p>
      <p style="color:#555;line-height:1.7;"><strong>Bonus tip:</strong> Avoid trading between 12PM-1PM EST (lunch hour) and after 2PM EST. Volume drops, spreads widen, and setups become unreliable.</p>
      <div style="background:${BRAND.cream};border-left:4px solid ${BRAND.gold};padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
        <p style="color:${BRAND.navy};font-weight:700;margin:0 0 8px;">Tomorrow: Risk Management That Actually Works</p>
        <p style="color:#555;margin:0;font-size:14px;">I'll share the exact position sizing and drawdown rules my funded students use — the stuff most courses skip.</p>
      </div>
      <p style="color:#555;line-height:1.7;">Stay disciplined,<br><strong style="color:${BRAND.navy};">Harvest</strong></p>
      <div style="border-top:1px solid #eee;margin-top:24px;padding-top:16px;text-align:center;">
        <p style="color:#aaa;font-size:12px;margin:0;">Know someone who'd love this course? <a href="${BRAND.url}/crash-course" style="color:${BRAND.gold};">Share it here</a></p>
      </div>`
    ),
  };
}

export function crashCourseDay4(name: string): { subject: string; html: string } {
  const firstName = name.split(" ")[0] || "there";
  return {
    subject: "Day 4: Risk Management That Actually Works",
    html: layout(
      "Day 4: Risk Management That Actually Works",
      `<p style="color:#555;line-height:1.7;">Hey ${firstName},</p>
      <p style="color:#555;line-height:1.7;">I'm going to be direct: <strong>strategy doesn't matter if your risk management is broken.</strong> I've seen traders with incredible analysis blow accounts because they ignored this lesson. Don't be that trader.</p>
      <h2 style="color:${BRAND.navy};font-size:18px;margin:24px 0 12px;">The 1% Rule</h2>
      <p style="color:#555;line-height:1.7;">Never risk more than 1% of your account on a single trade. On a $100K funded account, that's $1,000 max risk. This means if you take 10 losing trades in a row (it happens), you've only lost 10% of your account. You're still in the game.</p>
      <p style="color:#555;line-height:1.7;"><strong>Actionable tip:</strong> Calculate your position size BEFORE entering every trade. Formula: Position Size = (Account Balance x 0.01) / (Entry Price - Stop Loss in pips x Pip Value). No exceptions.</p>
      <h2 style="color:${BRAND.navy};font-size:18px;margin:24px 0 12px;">The Drawdown Rules</h2>
      <div style="background:${BRAND.cream};padding:16px 20px;border-radius:8px;margin:16px 0;">
        <ul style="color:#555;line-height:2;margin:0;padding-left:20px;">
          <li><strong>2 losses in a row:</strong> Walk away for the session. Come back tomorrow.</li>
          <li><strong>3% daily drawdown:</strong> Done for the day. No revenge trading.</li>
          <li><strong>5% weekly drawdown:</strong> Take a full day off and review your journal.</li>
          <li><strong>Max 2-3 trades per day:</strong> Quality over quantity. Always.</li>
        </ul>
      </div>
      <h2 style="color:${BRAND.navy};font-size:18px;margin:24px 0 12px;">Position Sizing in Practice</h2>
      <p style="color:#555;line-height:1.7;">Most prop firms have a 5% max daily drawdown and 10% max overall drawdown. If you're risking 1% per trade and capping at 2-3 trades per day, it's mathematically very difficult to violate these rules. That's the point.</p>
      <p style="color:#555;line-height:1.7;"><strong>Actionable tip:</strong> Use a position size calculator — don't do it in your head. One miscalculation can cost you a funded account. I recommend myfxbook's free calculator.</p>
      <div style="background:${BRAND.cream};border-left:4px solid ${BRAND.gold};padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
        <p style="color:${BRAND.navy};font-weight:700;margin:0 0 8px;">Tomorrow: The Funded Account Blueprint</p>
        <p style="color:#555;margin:0;font-size:14px;">The final lesson — I'll share the exact strategy and challenge tips my students use to pass FTMO and other prop firm challenges.</p>
      </div>
      <p style="color:#555;line-height:1.7;">Protect your capital,<br><strong style="color:${BRAND.navy};">Harvest</strong></p>
      <div style="border-top:1px solid #eee;margin-top:24px;padding-top:16px;text-align:center;">
        <p style="color:#aaa;font-size:12px;margin:0;">Know someone who'd love this course? <a href="${BRAND.url}/crash-course" style="color:${BRAND.gold};">Share it here</a></p>
      </div>`
    ),
  };
}

export function crashCourseDay5(name: string): { subject: string; html: string } {
  const firstName = name.split(" ")[0] || "there";
  return {
    subject: "Day 5: The Funded Account Blueprint",
    html: layout(
      "Day 5: The Funded Account Blueprint",
      `<p style="color:#555;line-height:1.7;">Hey ${firstName},</p>
      <p style="color:#555;line-height:1.7;">This is it — the final lesson. Over the past 4 days, you've learned order blocks, FVGs, liquidity, market structure, killzones, and risk management. Today, we put it all together into a strategy for getting funded.</p>
      <h2 style="color:${BRAND.navy};font-size:18px;margin:24px 0 12px;">The Prop Firm Challenge Strategy</h2>
      <p style="color:#555;line-height:1.7;">Most traders fail prop firm challenges because they try to hit the profit target too fast. Here's how my students approach it:</p>
      <div style="background:${BRAND.cream};padding:16px 20px;border-radius:8px;margin:16px 0;">
        <p style="color:${BRAND.navy};font-weight:700;margin:0 0 8px;">The Framework:</p>
        <ul style="color:#555;line-height:2;margin:0;padding-left:20px;">
          <li><strong>Trade only during killzones</strong> (London and NY opens)</li>
          <li><strong>1 pair, 1 session</strong> — master one pair before adding more</li>
          <li><strong>Wait for confluence</strong> — don't enter unless you have at least 3 confirmations (e.g., liquidity sweep + order block + FVG)</li>
          <li><strong>Risk 0.5-1% per trade</strong> during the challenge (conservative wins)</li>
          <li><strong>Aim for 1:3 RR minimum</strong> — this means you only need to win 30% of your trades to be profitable</li>
        </ul>
      </div>
      <h2 style="color:${BRAND.navy};font-size:18px;margin:24px 0 12px;">Challenge Tips That Most Courses Won't Tell You</h2>
      <p style="color:#555;line-height:1.7;"><strong>1. Trade the first 2 weeks conservatively.</strong> Build a buffer before pushing for the profit target. A 3% buffer means you can take more calculated risks later.</p>
      <p style="color:#555;line-height:1.7;"><strong>2. Avoid news events.</strong> NFP, CPI, FOMC — skip them entirely during the challenge. The risk-to-reward is terrible when spreads blow out.</p>
      <p style="color:#555;line-height:1.7;"><strong>3. Journal every trade.</strong> Screenshot your setup, write your reasoning, and grade yourself. After 2 weeks, patterns in your mistakes become obvious.</p>
      <div style="background:${BRAND.navy};padding:24px;border-radius:8px;margin:24px 0;text-align:center;">
        <p style="color:${BRAND.gold};font-weight:700;font-size:18px;margin:0 0 8px;">Ready for personalized coaching?</p>
        <p style="color:rgba(255,255,255,0.7);margin:0 0 16px;font-size:14px;">This crash course gave you the framework. One-on-one coaching gives you the accountability, feedback, and personalized plan to actually execute it.</p>
        <a href="${BRAND.url}/contact" style="display:inline-block;background:${BRAND.gold};color:${BRAND.navy};font-weight:700;font-size:14px;padding:14px 28px;text-decoration:none;border-radius:6px;text-transform:uppercase;letter-spacing:1px;">Book a Free Discovery Call</a>
      </div>
      <p style="color:#555;line-height:1.7;">It's been an honor teaching you this week. Whatever you decide, keep showing up to the charts. Consistency is the only shortcut in trading.</p>
      <p style="color:#555;line-height:1.7;">Your corner,<br><strong style="color:${BRAND.navy};">Harvest Wright</strong><br>R2F Trading</p>
      <div style="border-top:1px solid #eee;margin-top:24px;padding-top:16px;text-align:center;">
        <p style="color:#aaa;font-size:12px;margin:0;">Know someone who'd love this course? <a href="${BRAND.url}/crash-course" style="color:${BRAND.gold};">Share it here</a></p>
      </div>`
    ),
  };
}

export function crashCourseComplete(name: string): { subject: string; html: string } {
  const firstName = name.split(" ")[0] || "there";
  return {
    subject: "You completed the 5-Day ICT Crash Course!",
    html: layout(
      "Congratulations — You Did It!",
      `<p style="color:#555;line-height:1.7;">Hey ${firstName},</p>
      <p style="color:#555;line-height:1.7;">You just completed the R2F 5-Day ICT Trading Crash Course. Seriously — give yourself credit. Most people sign up for free courses and never finish. You showed up every day.</p>
      <h2 style="color:${BRAND.navy};font-size:18px;margin:24px 0 12px;">Here's What You've Learned:</h2>
      <div style="background:${BRAND.cream};padding:20px;border-radius:8px;margin:16px 0;">
        <ul style="color:#555;line-height:2.2;margin:0;padding-left:20px;">
          <li>Order blocks, FVGs, and liquidity pools (Day 1)</li>
          <li>Market structure — BOS, CHOCH, displacement (Day 2)</li>
          <li>Killzone timing and session-based trading (Day 3)</li>
          <li>Position sizing and drawdown rules (Day 4)</li>
          <li>The funded account blueprint (Day 5)</li>
        </ul>
      </div>
      <p style="color:#555;line-height:1.7;">That's more practical ICT knowledge than most $500 courses provide. But here's the thing — knowledge without application is just entertainment.</p>
      <h2 style="color:${BRAND.navy};font-size:18px;margin:24px 0 12px;">What To Do Next:</h2>
      <div style="background:${BRAND.cream};padding:16px 20px;border-radius:8px;margin:16px 0;">
        <p style="color:${BRAND.navy};font-weight:700;margin:0 0 4px;">Option 1: Self-Study</p>
        <p style="color:#555;margin:0;font-size:14px;">Grab our <a href="${BRAND.url}/starter-kit" style="color:${BRAND.gold};font-weight:600;">ICT Trading Starter Kit ($49)</a> — includes templates, checklists, and a trading journal to apply everything you learned.</p>
      </div>
      <div style="background:${BRAND.cream};padding:16px 20px;border-radius:8px;margin:16px 0;">
        <p style="color:${BRAND.navy};font-weight:700;margin:0 0 4px;">Option 2: Personalized Coaching</p>
        <p style="color:#555;margin:0;font-size:14px;"><a href="${BRAND.url}/contact" style="color:${BRAND.gold};font-weight:600;">Book a free discovery call</a> and let's build a personalized plan for your trading. Coaching starts at $150/week.</p>
      </div>
      <p style="color:#555;line-height:1.7;">Whichever path you choose, I'm here to help. Reply to this email anytime — I read every message.</p>
      <p style="color:#555;line-height:1.7;">Proud of you,<br><strong style="color:${BRAND.navy};">Harvest Wright</strong><br>R2F Trading</p>
      <div style="border-top:1px solid #eee;margin-top:24px;padding-top:16px;text-align:center;">
        <p style="color:#aaa;font-size:12px;margin:0;">Know someone who'd love this course? <a href="${BRAND.url}/crash-course" style="color:${BRAND.gold};">Share it here</a></p>
      </div>`,
      { text: "Book a Free Discovery Call", url: `${BRAND.url}/contact` }
    ),
  };
}

export function staleLeadReengageEmail(name: string): { subject: string; html: string } {
  const displayName = name || "there";
  return {
    subject: "Still thinking about it?",
    html: layout(
      `Hey ${displayName}, still thinking about it?`,
      `<p style="color:#555;line-height:1.7;">I noticed you signed up a while back but haven't had a chance to explore our coaching options yet. No pressure at all.</p>
      <p style="color:#555;line-height:1.7;">I just wanted to share that one of my students recently passed their FTMO challenge after just 6 weeks of coaching. The key? Getting personalized feedback on their specific mistakes.</p>
      <p style="color:#555;line-height:1.7;">If you're curious what that looks like, I'd love to chat. I do free 15 minute discovery calls where we look at your trading and figure out what's holding you back. No pitch, just real talk.</p>`,
      { text: "Book a Free Call", url: `${BRAND.url}/contact` }
    ),
  };
}

// --- Cart Abandonment Templates ---

export function coachingAbandonmentEmail(name: string): { subject: string; html: string } {
  const firstName = name.split(" ")[0] || "there";
  return {
    subject: `${firstName}, I noticed you checked out coaching`,
    html: layout(
      "Still Thinking About Coaching?",
      `<p style="color:#555;line-height:1.7;">Hey ${firstName},</p>
      <p style="color:#555;line-height:1.7;">I noticed you checked out our coaching plans recently. Totally get it — it's a big decision, and I want to make sure you have all the info you need.</p>
      <p style="color:#555;line-height:1.7;">Here's what a typical coaching experience looks like:</p>
      <ul style="color:#555;line-height:2;">
        <li>We start with a <strong>free discovery call</strong> — no commitment, just a conversation</li>
        <li>I review your current trading and identify your biggest gaps</li>
        <li>We build a personalized plan based on YOUR strengths and weaknesses</li>
        <li>Weekly sessions with real-time chart analysis and trade reviews</li>
      </ul>
      <p style="color:#555;line-height:1.7;">Most of my students see a noticeable improvement within the first 2-3 weeks. Not because I have some magic formula, but because having someone who's been there calling out your blind spots makes all the difference.</p>
      <p style="color:#555;line-height:1.7;">Have questions? Just hit reply — I read every message personally.</p>
      <p style="color:#555;line-height:1.7;">Talk soon,<br><strong style="color:${BRAND.navy};">Harvest</strong></p>`,
      { text: "Book a Free Discovery Call", url: `${BRAND.url}/contact` }
    ),
  };
}

export function starterKitAbandonmentEmail(name: string): { subject: string; html: string } {
  const firstName = name.split(" ")[0] || "there";
  return {
    subject: "Your ICT Trading Starter Kit is waiting",
    html: layout(
      "Your Starter Kit Is Waiting",
      `<p style="color:#555;line-height:1.7;">Hey ${firstName},</p>
      <p style="color:#555;line-height:1.7;">I saw you were checking out the ICT Trading Starter Kit — solid move. Here's a quick recap of what's inside:</p>
      <div style="background:${BRAND.cream};border-radius:8px;padding:20px;margin:20px 0;">
        <p style="color:${BRAND.navy};font-weight:700;margin:0 0 12px;">5 Self-Paced Modules:</p>
        <ul style="color:#555;line-height:2;margin:0;">
          <li><strong>ICT Foundations</strong> — Order blocks, FVGs, liquidity pools</li>
          <li><strong>Market Structure</strong> — BOS, CHOCH, displacement</li>
          <li><strong>Killzone Mastery</strong> — London, New York, Asian session setups</li>
          <li><strong>Risk Management</strong> — Position sizing, drawdown rules, psychology</li>
          <li><strong>Funded Account Roadmap</strong> — FTMO/MFF challenge blueprint</li>
        </ul>
      </div>
      <p style="color:#555;line-height:1.7;">All of this for a one-time payment of <strong style="color:${BRAND.gold};">$49</strong>. No subscriptions, no upsells — just the framework I used to get my students funded.</p>
      <p style="color:#555;line-height:1.7;">If you have any questions about the content, just reply to this email. I'm happy to help.</p>
      <p style="color:#555;line-height:1.7;">— <strong style="color:${BRAND.navy};">Harvest</strong></p>`,
      { text: "Get the Starter Kit — $49", url: `${BRAND.url}/starter-kit` }
    ),
  };
}

// --- Upsell Template (Starter Kit → Coaching) ---

export function coachingUpsellEmail(name: string): { subject: string; html: string } {
  const firstName = name.split(" ")[0] || "there";
  return {
    subject: `${firstName}, you've been crushing it — ready for the next level?`,
    html: layout(
      "Ready for Personalized Guidance?",
      `<p style="color:#555;line-height:1.7;">Hey ${firstName},</p>
      <p style="color:#555;line-height:1.7;">I've noticed you've been putting in the work since getting the Starter Kit — reading the blog, studying the concepts. That tells me you're serious about this.</p>
      <p style="color:#555;line-height:1.7;">Here's the thing: the Starter Kit gives you the <em>what</em>. Coaching gives you the <em>how</em> — applied to YOUR specific trading, YOUR mistakes, YOUR psychology.</p>
      <p style="color:#555;line-height:1.7;">That's why I want to offer you something special:</p>
      <div style="background:${BRAND.cream};border:2px solid ${BRAND.gold};border-radius:8px;padding:24px;margin:24px 0;text-align:center;">
        <p style="color:${BRAND.navy};font-weight:900;font-size:20px;margin:0 0 8px;">10% OFF Your First Month</p>
        <p style="color:#555;font-size:14px;margin:0;">Mention "STARTERKIT10" on your discovery call</p>
      </div>
      <p style="color:#555;line-height:1.7;">What coaching includes:</p>
      <ul style="color:#555;line-height:2;">
        <li>1-on-1 live sessions with personalized trade reviews</li>
        <li>Real-time chart analysis during killzones</li>
        <li>Custom action plans for your skill level</li>
        <li>Direct Telegram access for questions between sessions</li>
      </ul>
      <p style="color:#555;line-height:1.7;">No pressure — book a free 15-min call and we'll figure out if it's the right move for you.</p>
      <p style="color:#555;line-height:1.7;">Let's keep the momentum going,<br><strong style="color:${BRAND.navy};">Harvest</strong></p>`,
      { text: "Book a Free Call (10% Off)", url: `${BRAND.url}/contact` }
    ),
  };
}
