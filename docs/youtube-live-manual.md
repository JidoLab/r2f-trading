# Going live by hand (no scripts)

Session: **London**. Go live 1:45 PM Bangkok (7:45 AM London) until 25 Oct 2026,
then 2:45 PM Bangkok when UK clocks go back. Run through the London AM, roughly
8 to 11 AM London (2 to 5 PM Bangkok).

Scene images live in `public/stream/`: starting-soon, break, ending (Gemini, matched to the ChatGPT thumbnail), starting-soon-face (variant with the redrawn face), badge (lower third), thumbnail.jpg (1280x720, ready for Studio). Plain fallbacks: `python scripts/stream-scenes.py` writes to `public/stream/plain/`.

Stream key is already in XSplit. Thumbnail is made. This is the whole routine.

## One-time: make the persistent key the default in Studio

1. studio.youtube.com > **Go live** (camera icon top right) > **Manage** tab.
2. Click **Schedule stream**. Choose **Create new**.
3. In the details window, set the title, description, category (Education),
   thumbnail, audience (not made for kids), visibility Public, date and time.
4. Under **Stream settings** in the left rail, in the **Select stream key**
   dropdown pick **R2F XSplit persistent**. Set:
   - Stream latency: **Low latency**
   - Enable DVR: on
   - 360 video: off
   - Enable auto-start: on
   - Enable auto-stop: on
5. Click **Done** / **Save**. Under **Manage** you now have tomorrow's stream.

Every day after that: **Manage > Schedule stream > Reuse settings** and pick
yesterday's stream. It copies the key, latency, DVR, auto-start and auto-stop.
Only the title, date and thumbnail change.

## Daily (10 minutes, morning)

1. Studio > Go live > Manage > **Schedule stream** > **Reuse settings** > pick
   yesterday's stream.
2. Title (change the date, optionally swap the hook):

   NQ Live Trading ICT | London Session | 12 Sep

   If you have an angle: `CPI Day: Who Gets Swept? | NQ Live Trading | ICT | 12 Sep`

3. Description: paste the block at the bottom of this file.
4. Thumbnail: upload today's stamped image.
5. Date: today. Time: 1:45 PM (Bangkok) until 25 Oct 2026, then 2:45 PM.
6. Done. Copy the watch link and post it to Telegram: "Live today 2 PM
   Bangkok / 8 AM London. <link>".

## Daily (afternoon)

- 1:45 PM: open XSplit, **Broadcast > YouTube**. Auto-start takes the stream
  live within about 30 seconds. Studio shows "Live" on the Manage tab.
- End: stop the XSplit output. Auto-stop ends the broadcast after about a
  minute of no signal.

## Tags (paste into the Tags field, comma separated)

nq live trading, live day trading, nasdaq futures, ict live trading, ict concepts, day trading live, futures trading live, smart money concepts, london session, nq futures, live trading, r2f trading

## Description (paste as is)

Same shape as the channels that monetise live audiences: who you are, what the
channel does, subscribe ask, one free thing, community, coaching, socials,
disclosures. When you have prop-firm affiliate codes (Apex, Topstep, Tradeify,
FundedNext, TradeZella all run programs), add a section titled
"PROP FIRM DISCOUNTS" between the coaching block and the socials, one line per
firm: "Code HARVEST at Apex: <link>". Do not add the section until the codes exist.

My name is Harvest and I trade NQ futures. On this channel I stream live every weekday at the London open using ICT concepts: real entries, real stops, reasoning said out loud. Subscribe and hit the bell so you get the link when I go live.

Stream starts at the 8 AM London open (2 PM Bangkok, 3 AM New York) and runs through the London morning.

FREE: The ICT Funded-Trader Playbook
The 3 setups used on this stream, the pre-trade checklist, and the risk rules that pass funded challenges. Instant download.
https://www.r2ftrading.com/free-class

Discord community: https://discord.gg/mgYKZ7qdBA
Telegram stream links: https://t.me/r2fchannel
Schedule in your time zone: https://www.r2ftrading.com/live

1-ON-1 ICT COACHING
10+ years trading ICT concepts. Book a free 15-minute discovery call, no pitch:
https://www.r2ftrading.com/contact

TradingView: https://www.tradingview.com/u/Road_2_Funded/
Instagram: https://instagram.com/road2funded
X: https://twitter.com/Road2Funded
Site: https://www.r2ftrading.com

Risk disclosure: Futures and forex trading carry substantial risk and are not suitable for every investor. You could lose all or more than your initial investment. Only risk capital should be used for trading. Past performance is not necessarily indicative of future results. Nothing on this stream is financial advice.

Hypothetical performance disclosure: Any results shown from backtesting, replay or demo accounts have inherent limitations. They are prepared with the benefit of hindsight and do not involve financial risk, so no such record can fully account for the impact of real trading. No representation is made that any account will achieve profits or losses similar to those shown.

#nq #livetrading #ict #daytrading #futures

## Scoreboard overlay (trades, W/L, net R)

Add once to the Live scene: **Add Source > Webpage**, URL
`https://www.r2ftrading.com/live/overlay`, width 900, height 560. The page is
transparent, so the empty space below the cards costs nothing. Drag it to the
top right of the chart. The page is transparent apart from the card.

Log trades from your phone at `https://www.r2ftrading.com/admin/live-session`
(admin login). Tap New session when you go live. Tap LONG or SHORT when you
enter, then WIN, LOSS or B/E with the R multiple when you exit. The overlay
updates within about 5 seconds and shows a Last Trade card for 45 seconds.
If you are still in a trade from yesterday, New session asks whether to carry
it; a carried trade counts in the day it closes. Everything is in R, never
dollars. Every tap is a git commit to data/live-session.json, so the history
is your stream journal.

Plan bar: the same page has three fields, Bias, Target and Waiting for. Fill
them before going live and update them on the second monitor as the story
changes. They render as a second bar under the scoreboard. Keep each under
60 characters and write them as the viewer reads them: "SHORT under 20,150",
"Asia low 20,080", "5m FVG to fill". New session keeps the plan.

Below the plan bar the overlay shows two more cards: **Account rules** (risk,
target, optional extra rule, footnote; edit on the same admin page, New session
keeps them) and **USD news this week** (High and Medium impact events from the
ForexFactory feed, with a countdown inside two hours, red under 15 minutes).
The news card hides itself when nothing is left this week, so it is normal for
it to be gone on Friday afternoon and back on Monday.

## XSplit scenes (final layout)

Canvas: top bar of XSplit set to 1920x1080, 30 fps. Transition: Settings >
Transition > Fade, 300 ms. Mic is one global source in the audio mixer; mute
it with F8 rather than per scene.

1. **Starting Soon** (F1). Media File: `public/stream/generic-starting-soon.png`,
   fit to screen. Optional Text source "back at :00" or the built-in countdown
   under the ribbon. Optional music: one YouTube Audio Library track, volume
   at about 20 percent. Mic muted.
2. **Live** (F2). Screen Capture > Window: the chart window only. Media File:
   `badge.png` bottom left, 640 px wide, 40 px from the edges. Mask: a solid
   dark rectangle over any account ID or balance, locked. Optional Webcam:
   bottom right, about 380 px wide, 2 px gold border. Optional Webpage:
   YouTube popout chat, 380 px column on the right, only if the chart still
   reads at that size. Mic on.
3. **Break** (F3). Media File: `generic-break.png`, fit to screen. Mic muted.
4. **Ending** (F4). Media File: `generic-ending.png`, fit to screen. Mic on,
   say goodbye, hold 30 to 60 seconds, then stop the output.

Copy the Live scene as a fifth "Talk" scene later (webcam large, chart small)
for the pre-market bias walkthrough. Not needed for launch.

## Automatic reminder (the only automation in this flow)

Every weekday at 1:00 PM Bangkok a cron checks the channel for a PUBLIC stream scheduled in the next 4 hours. If you scheduled one in Studio that morning, it posts the watch link to the Telegram channel and X once. If nothing is scheduled, it posts nothing. Off switch: set `LIVE_REMINDER_ENABLED=false` on Vercel. Log: `data/live-reminder-log.json`.

## What runs by itself

- 1:00 PM weekdays: going-live post to Telegram, X, Discord (if a public stream is scheduled inside 4 hours).
- Plan bar Update: "Today's plan" to Discord when it changes.
- 5:30 PM weekdays: replay link + session result to Telegram, X, Discord; chapters and a result title written onto the replay; replay added to the playlist "NQ Live Trading ICT | London Session Replays".
- 6:00 PM Friday: the week's stream numbers to your own Telegram.
- /live page: latest replays from the playlist, refreshed hourly.

