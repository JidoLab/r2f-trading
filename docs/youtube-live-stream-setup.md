# R2F live streaming: the complete setup

Written 2026-09-11. Modelled on Tipsy Trader (9,940 subs, 312k views, 93% of
views from daily NQ live streams using ICT) and built around what her data says
actually compounds.

---

## The plan in one paragraph

Stream NQ live at the New York open every weekday, 2 to 2.5 hours, from XSplit
to a permanent YouTube stream key, with the day's broadcast created by a script
so the title, description, category and thumbnail are always right. Show the
losses and put them in the title. Cut one short from every session. Do it daily
for five months before judging it, because her 2025 sporadic streams sat at 1-2k
views and it was the daily cadence from April 2026 that took her to 10k.

Your channel already has live streaming enabled. You have five past broadcasts.
The problem was never access, it was frequency.

---

## The slot

**New York open.** Go live at **8:00 PM Bangkok**, 30 minutes before the 9:30 ET
open, run to about 10:30 PM. That is the NY AM killzone, the highest-volume NQ
session and the one ICT traders care about most.

Reasons over London (her slot, 1 PM Bangkok):
- US retail is awake and watching. Her 2 AM ET slot reaches Europe and Asia.
- Less head-to-head with her and the other London streamers.
- NQ does its real business in the NY AM session, so the trades are better content.

**US clocks change 1 Nov 2026.** After that the open is 9:30 EST = 14:30 UTC, so
go live at **9:00 PM Bangkok** and change `DEFAULT_START_HOUR_UTC` in
`scripts/schedule-stream.ts` from 13 to 14.

If evenings are impossible, London at 1 PM Bangkok is the fallback and every
part of this plan still applies.

---

## Before the first stream

- [ ] **Upload speed.** Run fast.com and read the UPLOAD figure. 1080p at 6 Mbps
      needs roughly 9 Mbps upload with headroom. Under 6 Mbps, drop to 720p.
- [ ] **Mask account details.** Anything showing an account number, login, or
      broker ID gets covered. Add a solid rectangle source in XSplit over that
      region and lock it. Showing P&L is fine and is part of the draw. Showing
      identifiers is not.
- [ ] **Decide on the webcam.** Not required. Recommended. A stream with a face
      is a person; a stream without one is a screen recording. Your call.
- [ ] **Make the base thumbnail** (prompt further down). One image, reused daily.
- [ ] **Create a Streamlabs account** at streamlabs.com using the R2F YouTube
      login (for the chat bot, below).
- [ ] **Run the scheduler once for real** to create the persistent stream key
      (commands further down).

---

## XSplit Broadcaster Pro

### Scenes

Set up four scenes. Switch between them with hotkeys.

**1. Starting Soon** (5 to 10 minutes before you trade)
- Media source: a static 1920x1080 image. Navy background, "NQ LIVE | LONDON
  SESSION" in large type, "starting shortly" underneath, your Telegram and site.
- Text source: countdown timer. XSplit has a built-in countdown; set it to the
  open time.
- Audio: one royalty-free track from the YouTube Audio Library on loop, low
  volume. Nothing else. Copyrighted music on a VOD gets it claimed or muted.

**2. Live** (the main scene)
- Screen Capture: your charting window, full frame. Capture the specific window
  rather than the whole monitor so notifications and other windows never leak.
- Camera (optional): bottom right, about 22% of frame width, thin gold border.
- Mask rectangle over any account identifier, locked.
- Text source, bottom left, small: "Free playbook: r2ftrading.com/free-class".
  Static. Do not scroll it; scrolling text is distracting and looks cheap.
- Webpage source (optional): YouTube popout chat, narrow column on the right,
  so viewers see their own messages on stream. Get the URL from Studio:
  the chat panel's popout button. This is for them; you read chat on a second
  screen or your phone.

**3. Break** (bathroom, phone call, nothing happening)
- Static image: "back in a few minutes", same branding.
- Mic muted automatically on switch (set the mic to mute in this scene).

**4. Ending**
- Static image with three lines: the playbook link, "book a free call" with the
  contact link, and "same time tomorrow".
- Hold it for 30 to 60 seconds so the last frame of the VOD is the CTA.

### Output

Use **Custom RTMP**, not the built-in YouTube login. Reason: the scheduler
script binds each day's broadcast to a permanent stream key, and with auto-start
enabled YouTube goes live the moment XSplit starts sending. You set the key
once and never touch it again.

- Broadcast > Set up a new output > Custom RTMP
- Server: `rtmp://a.rtmp.youtube.com/live2`
- Stream key: printed by the scheduler the first time you run it with `--live`
  (also visible in Studio > Go Live > Stream). Treat it like a password.

### Encoding

Charts are mostly static, so you do not need 60 fps or a huge bitrate. Spend the
budget on sharpness instead.

| Setting | Value |
|---|---|
| Resolution | 1920x1080 (top bar of the main window) |
| Frame rate | 30 fps |
| Codec | NVENC H.264 if you have an NVIDIA card, otherwise x264 at preset "veryfast" |
| Bitrate | 6000 kbps, CBR |
| Keyframe interval | 2 seconds (YouTube requires this) |
| Profile | High |
| Audio | AAC, 160 kbps, 48 kHz, stereo |

If XSplit shows dropped frames in the top status bar during a stream, drop
bitrate to 4500 before you drop resolution.

### Audio

- Mic as its own source. In its settings turn on **Noise Gate** (so keyboard and
  room noise vanish between sentences) and **Noise Suppression**.
- Set the mic to peak around -12 dB on the meter. Loud enough to hear, never
  clipping.
- Mute the chart platform's alert sounds or route them through the mix
  deliberately. Surprise alert noises at full volume are the most common
  complaint on trading streams.
- Test with a 2 minute unlisted stream first and listen back on your phone.

### Hotkeys

Settings > Hotkeys. Suggested:

- F1 Starting Soon, F2 Live, F3 Break, F4 Ending
- F8 mute mic
- F9 start/stop stream

Sticky note on the monitor for the first week.

---

## YouTube settings

Most of this is set by the scheduler script on every broadcast it creates. The
items below are channel-level and you set them once in Studio.

### Studio > Settings > Channel

- Country: Thailand. Keywords: NQ live trading, ICT concepts, futures day trading.
- Audience: "No, it's not made for kids" as the channel default.

### Studio > Go Live > Stream settings (persistent stream defaults)

- **Latency: Low latency.** Not ultra-low. Ultra-low disables DVR and drops
  quality options; low latency keeps chat responsive enough for Q&A and keeps
  DVR so people joining late can rewind.
- **DVR: On.**
- **Auto-start and auto-stop: On.** This is what makes "press Stream in XSplit"
  the whole workflow.
- 360 video: Off.

### Live chat

- Live chat: On. **Chat replay: On.** Replay makes the VOD feel alive and holds
  retention on the replay.
- Slow mode: 3 seconds. Stops walls of spam without killing conversation.
- Subscribers-only mode: **Off** for now. You want new people talking. Revisit
  at 5k.
- Block links from viewers who are not moderators: On. The chat bot and you can
  post links; nobody else needs to.

### Category, audience, visibility

Set per broadcast by the script: Education, public, not made for kids.

### Notifications

A public broadcast scheduled ahead of time shows an "Upcoming" badge on the
channel page and sends a notification to subscribers who have the bell on.
Scheduling it the night before, or first thing in the morning, is worth doing
for that alone. That is what the script is for.

### After each stream

The VOD publishes automatically with the same title, description and thumbnail.
Two edits in Studio, 60 seconds:

1. **Title:** replace the generic front half with what happened. Keep the tail.
   `Stopped out twice, then this | NQ Live Trading | ICT | 12 Sep`
2. **Trim** the first minute if it was dead air, using the built-in editor.

Then `npm run fix-yt-descriptions` keeps the CTA block consistent across every
video including VODs (it already does this; nothing to change).

---

## The chat bot (the @streamlabs thing)

What you saw in her chat is **Streamlabs Cloudbot** posting timed messages. It
runs on Streamlabs' servers, needs no software on your machine, and works with
XSplit because it talks to YouTube directly. You do not need Streamlabs Desktop.

### Setup

1. streamlabs.com > log in with the R2F YouTube account.
2. Left menu > **Cloudbot** > enable for YouTube. It will ask permission to
   post in your chat.
3. Test it while live with `!test` or by triggering a timer.

### Timers (messages the bot posts on its own)

Cloudbot > Timers. Each one has a message, an interval in minutes, and a minimum
number of chat lines between posts so it stays quiet when chat is dead.

| Name | Interval | Min lines | Message |
|---|---|---|---|
| playbook | 15 min | 8 | Free ICT Funded-Trader Playbook: the 3 setups, the pre-trade checklist, the risk rules. https://www.r2ftrading.com/free-class |
| call | 30 min | 12 | Want help applying this to your own charts? Free 15 minute call, no pitch: https://www.r2ftrading.com/contact |
| telegram | 25 min | 10 | Daily setups and stream reminders in Telegram: https://t.me/Road2Funded |
| rules | 40 min | 15 | Chat rules: be decent, no signals, no promo. Questions welcome between setups. |

Four is plenty. More than that and the bot is the loudest voice in the room.

### Commands (viewers type these)

Cloudbot > Commands. Add:

- `!playbook` The free playbook: https://www.r2ftrading.com/free-class
- `!call` Free 15 minute call: https://www.r2ftrading.com/contact
- `!coaching` Plans: https://www.r2ftrading.com/coaching
- `!telegram` https://t.me/Road2Funded
- `!schedule` Live every weekday, 30 minutes before the NY open (8 PM Bangkok / 9 AM ET).
- `!risk` Nothing here is financial advice. Trade only with money you can afford to lose.

### Moderation

Cloudbot > Mod Tools. Turn on link protection (bot deletes links from
non-mods), caps filter, and symbol spam. Leave everything else off. Over-moderated
chats feel dead.

If Cloudbot misbehaves on YouTube, Nightbot (nightbot.tv) does the same job and
is arguably steadier there. Same concepts, same timers and commands.

---

## Titles and thumbnails

### Title formula

Before the stream (set by the script):

> NQ Live Trading: New York Open | ICT Concepts | 12 Sep

Leads with the searched phrase. Verified live in autocomplete: "nq live
trading", "nq live trading ict", "live day trading nasdaq futures".

After the stream, in Studio, swap the front half for what happened:

> Stopped out twice, then this | NQ Live Trading | ICT | 12 Sep
> Sat on my hands all session | NQ Live Trading | ICT | 12 Sep
> +120 points and one dumb trade | NQ Live Trading | ICT | 12 Sep

Her best titles name the loss. "The Trade that Got Away" is her top stream at
15k. "live day trading losing" is an autocomplete suggestion. People search for
the honest ones.

Rules: under 100 characters, no "R2F" prefix, no episode numbers, no em dashes.

### Thumbnail

One base image, stamped daily by the script with the hook and date. The base
lives at `public/stream-thumb-base.png`, 1280x720. If it is missing the script
draws a plain navy/gold fallback so nothing blocks day one.

ChatGPT prompt for the base:

```
Create a 16:9 image, 1280 by 720 pixels, for a live trading stream thumbnail. Add no text at all.

The LEFT 60 percent of the image must be clean dark negative space: a deep navy background (#0d2137) with a very subtle darker vignette toward the left edge. Nothing in this area. Text will be added later.

The RIGHT 40 percent: a slightly angled, softly lit candlestick chart on a dark screen, green and red candles, one clear upward move, shallow depth of field, a faint gold (#c9a84c) horizontal line across one level. A thin gold vertical divider where the chart meets the navy area, fading at the top and bottom.

A thin gold bar along the very bottom edge, full width, about 12 pixels tall.

Mood: premium financial, calm, high contrast, no clutter, no people, no logos, no watermarks, no text anywhere.
```

Save it as `public/stream-thumb-base.png`. The script puts the hook in white
Impact at the top left, a red LIVE NQ TRADING pill under it, and the date in
gold. Two lines maximum. Test it with the dry run and look at `.tmp/`.

---

## The daily routine

### Morning (or the night before): create the broadcast

```bash
npm run yt-schedule-stream -- --live
```

Creates today's public scheduled broadcast with the templated title,
description, Education category, tags and stamped thumbnail, bound to your
permanent stream key. Subscribers with the bell get the "upcoming" notification.

To preview without creating anything:

```bash
npm run yt-schedule-stream
```

Optional flags: `--hook "Fed day"` puts a hook in the title up front, `--at
2026-09-15T13:00:00Z` sets a specific start time.

### 7:45 PM Bangkok: go live

1. Open XSplit. Confirm the chart window and mic are picked up.
2. Switch to Starting Soon (F1), start the countdown.
3. Press Stream (F9). Auto-start attaches XSplit to today's broadcast within
   about 30 seconds. Studio will show "Live".
4. At 8:00, switch to Live (F2) and start talking.

### During

- Say the bias out loud in the first three minutes. That is your hook for
  anyone who clicks in.
- Narrate the skips, not only the entries. Skipping is most of trading and
  nobody streams it.
- Read chat between setups, never during one. Say "I'll get to that after this
  candle closes" and mean it.
- Losses: do not cut to Break. Stay on, explain what you saw and what was
  wrong. That segment is the one people clip and share.

### End

1. Switch to Ending (F4), hold it 30 to 60 seconds while you say what happened
   and what tomorrow looks like.
2. Stop Stream (F9). Auto-stop ends the broadcast.
3. In Studio: retitle with the hook. Trim dead air if any.
4. Cut one short: the best 30 to 50 seconds, usually the loss explanation or
   the entry with the reasoning. Her shorts average 3.7k, better per video than
   her streams, and they feed the streams.
5. `npm run fix-yt-descriptions` if you touched the description.

Total time outside the stream itself: about 10 minutes.

---

## Links to have everywhere

Same set in the description (script does it), the chat bot, the Ending scene and
your channel About page:

- Playbook: https://www.r2ftrading.com/free-class
- Free call: https://www.r2ftrading.com/contact
- Coaching: https://www.r2ftrading.com/coaching
- Telegram: https://t.me/Road2Funded
- TradingView: https://www.tradingview.com/u/Road_2_Funded/
- Site: https://www.r2ftrading.com

Channel About page: add all six under Links so they show as chips under the
banner. Set the first one to the playbook.

---

## Monetisation

Two things her description makes obvious.

**She earns from affiliate codes, not YouTube.** At 10k subs she has no Super
Chat worth mentioning; her description is prop firm and tool affiliate links
with discount codes. You are an FTMO passer. FTMO, Apex and Topstep all run
affiliate programs. One or two of those in the description is on-brand and
costs nothing. Do not turn the description into a link farm; two is plenty.

**Your real product is already better than hers.** A stream is coaching in
public. Someone who watches you trade for two hours knows exactly what a
session with you is, which is the entire objection to buying coaching solved
before the call. The chat bot's `!call` timer is the funnel.

Super Chat needs the Partner Program (1,000 subs plus 4,000 watch hours or
10M Shorts views). Two hours a day of live watch time gets you to 4,000 hours
faster than any other format on the platform. Do not chase it, but it is
coming.

---

## What to expect, from her numbers

| Her phase | Cadence | Views per stream |
|---|---|---|
| Mar 2025 to Mar 2026 | 1 to 9 a month | 1,000 to 4,000 |
| Apr to Aug 2026 | 13 to 16 a month | 1,800 to 3,000 |
| Sep 2026 | daily | ~10,000 |

Your five past streams got 11 to 33 views. That is her 2025 pattern at your
channel's scale. Expect the first month to look like that. The compounding
showed up for her around month four of daily streaming. Judge this at 30
streams, not at 5.

---

## Things that will get you in trouble

- **Account identifiers on screen.** Mask them. Every session.
- **Copyrighted music** in the Starting Soon scene. YouTube Audio Library only.
- **"Buy here" or "this will go up" language.** Say what you see and what you
  are doing. The risk line in the description exists for a reason; do not
  contradict it on stream.
- **Streaming a prop firm eval that forbids it.** Some evaluation accounts
  prohibit broadcasting. Check your firm's terms before showing that account.
- **Reacting to chat while in a trade.** The one behaviour that costs money and
  makes the stream worse at the same time.

---

## What is built

- `scripts/schedule-stream.ts` (`npm run yt-schedule-stream`): creates the
  day's broadcast, binds it to the persistent key, sets category, tags,
  description and thumbnail. Dry run by default; `--live` to create.
- `scripts/stamp-thumbnail.py`: stamps hook and date onto the base image. The
  scheduler calls it; you never run it by hand.
- `scripts/fix-youtube-descriptions.ts`: already covers VODs, keeps the CTA
  block on every video.
- Persistent stream id is cached in `data/youtube-stream.json` after the first
  live run, so the (flaky) stream listing is never needed again.

### Next automation, once you have done a week by hand

A Vercel cron that runs the scheduler at 7 AM Bangkok on weekdays so the
broadcast exists before you wake up, with a cleanup step that deletes any
scheduled broadcast from a previous day that never went live. Not wired yet on
purpose: do a week manually first so the routine is real before it is automatic.
