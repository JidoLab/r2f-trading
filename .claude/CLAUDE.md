# R2F Trading — Project Memory

## Owner
Harvest Wright (wrightharvest@gmail.com) — ICT trading coach, based in Thailand (Bangkok timezone)

## What This Is
Fully automated digital trading coaching business at r2ftrading.com. Built with Next.js on Vercel, using GitHub API for all data storage (Vercel filesystem is read-only).

## Tech Stack
- **Framework**: Next.js (App Router) + TypeScript + Tailwind CSS
- **Hosting**: Vercel (Hobby plan)
- **Storage**: GitHub API (JidoLab/r2f-trading repo) — all writes go through src/lib/github.ts
- **AI**: Anthropic Claude (content), Google Gemini (images), ElevenLabs (voice), OpenAI Whisper (captions)
- **Video**: Creatomate (rendering), Pexels (stock clips)
- **Email**: Resend (marketing + drips)
- **Payments**: PayPal (wrightharvest@gmail.com) — no Stripe

## Daily Automation Schedule (all times UTC, Bangkok = UTC+7)
- 0200 UTC (9AM BKK): Generate 3 short videos
- 0400 UTC (11AM BKK): Text social post #1
- 0500 UTC (12PM BKK): Publish short #1
- 0600 UTC (1PM BKK): Blog post #1
- 1100 UTC (6PM BKK): Publish short #2
- 1200 UTC (7PM BKK): Text social post #2
- 1400 UTC (9PM BKK): Daily report to Telegram
- 1600 UTC (11PM BKK): Blog post #2
- 1700 UTC (12AM BKK): Publish short #3

## Coaching Plans
- Lite: $150/week (1 session/week)
- Pro: $200/week (2 sessions/week)
- Full Mentorship: $1,000/4 months (2 sessions/week + FTMO challenge)

## Key Pages
- / — Homepage (JSON-LD ProfessionalService schema)
- /trading-insights — Blog (NOT /blog — /blog redirects here)
- /coaching — Plans & pricing + PayPal buttons (JSON-LD Service schema)
- /contact — Calendly booking
- /results — Testimonials (JSON-LD AggregateRating + Review schemas)
- /free-class — Lead magnet landing page (JSON-LD Course schema)
- /about — FAQ page (JSON-LD FAQPage schema)
- /thank-you — Post-signup with Calendly embed
- /admin — Dashboard (password protected)
- /admin/payments — PayPal transaction history
- /admin/image-library — Tagged chart image management
- /admin/shorts — Video automation hub
- /admin/chat-logs — Chatbot transcripts
- /admin/trends — Market context

## Social Platforms
Working: Twitter/X, LinkedIn, Reddit, Telegram, Discord, YouTube, Facebook
Manual only: TikTok, Instagram (no API — use copy caption + download video)

## Lead Magnet
PDF exists at public/downloads/ict-trading-checklist.pdf — already integrated into email signup flow

## New Features (Latest)
- Blog → Twitter/X thread auto-repurposing (src/lib/twitter-threads.ts)
- Image library with rich tagging (src/lib/image-library.ts, /admin/image-library)
- PayPal payments on coaching page (NEXT_PUBLIC_PAYPAL_CLIENT_ID env var)
- Health checks in daily Telegram report (Facebook token, stuck renders, cron status)
- JSON-LD structured data on all pages
- Batch blog generation with 8 diverse topics (/api/admin/batch-generate)
- Payments dashboard (/admin/payments)
- Chatbot with objection handling + conversion triggers
- Dynamic SEO landing pages (/learn/[slug]) with admin management
- Testimonial collection system (/review) with admin approval (/admin/reviews)
- Daily voice market brief (/market-brief) with podcast RSS feed
- Auto review request emails 14 days after payment
- Reddit auto-commenting (2x/day, 5 subreddits, references "my students" for curiosity)
- Twitter auto-reply (1x/day, accepts platform risk)
- Suggested replies dashboard for YouTube (/admin/reply-suggestions) with copy+open
- Revenue Tracker (/admin/revenue) with CSS bar charts, conversion rate
- Lead Pipeline funnel (/admin/pipeline) subscribers>cold>warm>hot>booked>paid
- Social Calendar (/admin/social-calendar) weekly grid by platform
- Notification Center (/admin/notifications) unified event feed
- Content Performance (/admin/performance) rankings by social reach
- Competitor Spy (/admin/competitors) tracks 4 YouTube channels + content gaps
- AI Content Planner (/admin/content-planner) health score + smart suggestions
- Audience Insights (/admin/audience) growth chart, score distribution, engagement heatmap
- AI Daily Briefing (/admin/briefing) personalized morning briefing with Claude
- A/B Test Tracker (/admin/ab-tests) email template performance
- Branding Kit (/admin/signature) bios, colors, fonts, hashtags, CTAs, assets
- Sidebar organized into 7 categories, mobile responsive with hamburger menu
- ICT Trading Starter Kit ($49 digital product at /starter-kit with gated /starter-kit/access)
- Referral system: unique codes per subscriber, /refer?ref=CODE landing page
- Student onboarding automation: Day 1/3/7/30 email sequence after payment
- Smart hot lead follow-up: auto-email + Telegram alert when score hits 50
- Weekly newsletter auto-generation via Claude with admin page at /admin/newsletters
- GA4 analytics integration (/admin/analytics-dashboard, needs service account setup)

## Admin Sidebar Categories
- Overview: Dashboard, AI Briefing, Notifications
- Content: Blog Posts, Shorts, AI Planner, Content Calendar, Social Calendar, Landing Pages, Image Library
- Engagement: Reply Suggestions, Chat Logs, Reviews, Quick Share
- Growth: Subscribers, Lead Pipeline, Audience Insights
- Revenue: Payments, Revenue Tracker, A/B Tests
- Intelligence: Performance, Competitor Spy, Market Trends
- Tools: Branding Kit, Analytics

## Known Recurring Issues
- Facebook Page Access Token expires every ~60 days — refresh via Graph Explorer or /api/admin/facebook-token
- LinkedIn Access Token expires every ~60 days — re-auth via OAuth
- Blog titles tend to be too long if not constrained — prompt enforces <60 chars
- Blog topics drift toward CPI/NFP if market context is strong — prompt now diversifies with 7 category rotation
- Shorts calendar topics must be marked as `used: true` or they repeat (FIXED in generate-short cron)
- NEXT_PUBLIC_ env vars are inlined at build time — if added after deploy, they need a rebuild to take effect

## Important Architecture Decisions
- All writes go through GitHub API (not filesystem)
- Videos generate as "ready", publish via separate staggered cron
- Lead scoring stored in data/subscribers.json on GitHub
- Drip emails are segment-based (cold/warm/hot)
- Content calendar generates in 30-day chunks up to 90 days

## Environment Variables (all set on Vercel)
ANTHROPIC_API_KEY, GEMINI_API_KEY, GITHUB_TOKEN, GITHUB_REPO, CRON_SECRET,
RESEND_API_KEY, RESEND_AUDIENCE_ID, INDEXNOW_KEY,
TWITTER_API_KEY/SECRET, TWITTER_ACCESS_TOKEN/SECRET,
FACEBOOK_PAGE_ID, FACEBOOK_PAGE_ACCESS_TOKEN,
LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_URN,
REDDIT_CLIENT_ID/SECRET, REDDIT_REFRESH_TOKEN, REDDIT_SUBREDDIT, REDDIT_USERNAME,
TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID, TELEGRAM_OWNER_CHAT_ID,
DISCORD_WEBHOOK_URL, PINTEREST_ACCESS_TOKEN, PINTEREST_BOARD_ID,
YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN,
OPENAI_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID,
CREATOMATE_API_KEY, PEXELS_API_KEY, ADMIN_PASSWORD,
YOUTUBE_API_KEY, NEXT_PUBLIC_PAYPAL_CLIENT_ID

## Framework Document
Full reusable automation framework at: C:\Users\User\Desktop\AI Business Automation Framework.md
