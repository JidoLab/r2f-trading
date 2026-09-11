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

   NQ Live Trading: London Session | ICT Concepts | 12 Sep

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

Live NQ futures trading through the London session, every weekday, using ICT concepts. Real entries, real stops, wins and losses on the chart as they happen. No hindsight replays.

Stream starts at the 8 AM London open (2 PM Bangkok, 3 AM New York) and runs through the London AM session.

What I cover live:
- Higher timeframe bias and the levels that matter today
- Where the liquidity is resting and which side I expect to get taken
- Live entries with the reasoning said out loud, and the ones I skip
- Risk per trade, stop placement, and why

Ask questions in chat. I answer between setups.

Telegram: https://t.me/Road2Funded
TradingView: https://www.tradingview.com/u/Road_2_Funded/
Site: https://www.r2ftrading.com

==============================
FREE: The ICT Funded-Trader Playbook
The 3 setups that actually work, the pre-trade checklist, and the risk rules that pass funded challenges. Instant download.
https://www.r2ftrading.com/free-class

1-on-1 ICT COACHING WITH HARVEST WRIGHT
10+ years trading ICT concepts. Book a free 15-minute discovery call, no pitch:
https://www.r2ftrading.com/contact

More free guides and breakdowns:
https://www.r2ftrading.com/learn

Risk disclosure: Futures and forex trading carry substantial risk and are not suitable for every investor. You can lose more than your initial deposit. Nothing on this stream is financial advice. Past performance does not indicate future results. Trade only with risk capital.

#nq #livetrading #ict #daytrading #futures

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
