# Live stream review: week 1 (15 to 19 Sep 2026)

Numbers pulled from the YouTube Data and Analytics APIs on 19 Sep. Analytics
lag about two days, so Thursday's retention is not in yet.

## Is it working

Yes, on the only measure that matters this early: the replays get more views
than anything the channel has posted in a year.

| Stream | Length | Replay views (19 Sep) | Avg view duration | Likes |
|---|---|---|---|---|
| Mon 15 Sep | 1h41 | 58 | 6 min 36 s (6.5%) | 2 |
| Wed 16 Sep | 1h45 | 58 | 1 min 21 s (1.3%) | 1 |
| Thu 18 Sep | 1h50 | 95 | not in yet | 2 |

The channel's median video before the pivot was 21 views. Three streams in,
every replay is at 3 to 4 times that, and Thursday, the first one with the
scoreboard and plan bar on screen, is the best.

Tuesday's scheduled stream never went live (the GitHub rate-limit day).
Consistency is the whole strategy, so that is the one miss to not repeat.

## Where the views came from

| Source | Views | Watch minutes |
|---|---|---|
| Subscriber feed | 74 | 25 |
| YouTube search | 7 | 6 |
| Channel page | 4 | 14 |
| Suggested video | 2 | 0 |
| Notification | 1 | 73 |

Subscribers are showing up, which is what a schedule buys. Discovery is close
to zero: 9 views from search and suggested combined. That is expected in week
one and it is what the next three changes are aimed at.

## What changed on 19 Sep

- Replays now get chapters from the scoreboard log and a result-based title,
  automatically, when the replay poster runs at 5:30 PM. Thursday's replay was
  done by hand with the same tool: "NQ London Session Live: 2 Wins, +2R | ICT |
  18 Sept" with chapters at each trade. Chapters are what let a searcher jump
  to the trade instead of leaving at minute one.
- A Shorts clipper exists (`python scripts/clip-short.py`). One command cuts
  45 seconds from the local XSplit recording, frames it 9:16 with the hook on
  top and the schedule at the bottom, and uploads it.

## Next week, in order

1. **Five streams, same time.** Nothing else compounds if this slips.
2. **One Short a day from the recording.** The clean entry, the loss handled
   calmly, or a two-minute concept. Shorts are the channel's best format and
   the only cheap route to viewers who are not already subscribed.
3. **Get the first comments.** Zero comments across three replays. In the first
   five minutes ask one direct question ("where are you watching from, and
   what's your bias?"), and say the name of anyone who answers.
4. **Log the plan in three fields**, one idea each: bias, target, waiting for.
   Thursday's plan was one long sentence in the bias field.
5. **Use Undo for misclicks.** A trade logged open and closed nine seconds apart
   went into Thursday's result as +0.5R. It is dropped from the chapters but it
   counts in the title.

## What to ignore

Retention percentages on two-hour replays will look terrible next to the
11-minute videos (1 to 7 percent against 18 to 35). Different format. The
number to watch is average view duration in minutes, week over week, and
whether search and suggested start showing up in the traffic table.
