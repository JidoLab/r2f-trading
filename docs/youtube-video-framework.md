# R2F YouTube: how to pick and make videos that get views

Written 2026-08-10 from a full audit of all 217 videos plus YouTube Analytics.
Every number here is measured from the channel, not borrowed from generic advice.

---

## What your own data already proved

**Format decides everything.** Views by content type across the whole channel:

| Type | Videos | Total views | Mean |
|---|---|---|---|
| Named-concept explainer | 113 | 16,405 (82%) | 145 |
| Dated / weekly analysis | 52 | 2,497 (13%) | 48 |
| "Trade Like A Sniper" episodes | 52 | 1,024 (5%) | 20 |

**Length decides retention.** Average view percentage by video:

| Video | Length | AVP |
|---|---|---|
| VOLATILITY DRAG | 11:18 | **34.9%** |
| PD Array Matrix | 10:36 | 18.6% |
| ICT Venom Model | 16:55 | 13.0% |
| This Week's Market Setup | 20:54 | 11.3% |
| Weekly Market Analysis | 21:23 | **5.0%** |

Every ~11 minute concept video lands at 18-35%. Every 20+ minute video lands at 5-11%.

**The first 25 seconds is where you lose people.** On the 20:54 weekly video, 99.3% are watching at the start and 26.6% remain by the 2% mark. That is 73% gone in 25 seconds. On VOLATILITY DRAG at the same relative point, 74.1% are still there, and 44% are still there at the halfway mark.

**Low retention is why the algorithm ignores you.** Traffic sources over 90 days: Advertising 32.8%, channel page 17.5%, external links 17.2%, search 14.4%, suggested video **1.6%**, home feed **absent entirely**. Suggested and Browse are where growth comes from. YouTube will not show you to strangers while the data says people leave.

---

## The rule set

1. **One named concept per video.** Your winners all name a thing: Venom Model, Volatility Drag, PD Array Matrix, Breakaway Gap. Your losers name a date or an episode number. People search concept names. Nobody searches "Episode 52".

2. **Target 11 minutes.** Not 20. If the material runs longer, it is two videos.

3. **No intro, no logo, no "welcome back".** Open on the chart and the problem. Your best-retained video does this; your worst spends the first 25 seconds on throat-clearing.

4. **Drop the "ICT" prefix from titles when a generic term exists.** Measured search demand, median views of the top 10 results for each term:

   | Concept | Autocomplete phrases | Median views of top 10 |
   |---|---|---|
   | smart money concepts | 219 | 465,904 |
   | break of structure | 175 | 295,564 |
   | order flow trading | 172 | 263,709 |
   | liquidity sweep | 208 | 109,669 |
   | change of character | 172 | 79,124 |
   | ict killzone | 69 | 69,296 |

   The generic phrasings carry roughly three times the search surface. Say "ICT" inside the video, not in the title.

5. **Never make a dated analysis video again as a standalone upload.** Use the week's chart as the *example inside* a concept video. Same filming effort, permanent shelf life.

6. **Keep making Shorts.** Your shorts median 46 views against 21 for long-form. They are your better format. The claim that mixing shorts and long-form breaks the algorithm does not hold on your channel.

---

## The research loop

```bash
npm run yt-research              # free, uses no API quota
npm run yt-research -- --validate  # adds real view data, 100 quota units per topic
```

What it does and why each step matters:

- **Expands seed concepts through YouTube autocomplete**, including an A-Z sweep and "how to / what is / why" prefixes. Autocomplete only returns phrases people actually type, so the count of distinct completions is a live demand signal that costs nothing.
- **Checks each concept against your existing 217 videos** so you stop competing with yourself. The website had exactly this problem: three URLs splitting one query, 21 impressions, zero clicks.
- **With `--validate`, measures the median views of the top 10 real results** for the term, plus how old the newest one is. High median means the topic reliably earns views for other channels. High age means nobody has refreshed it and a current take can rank.

Output lands in `data/youtube-topic-research.json`.

---

## What to make next, in order

Ranked by the tool on 2026-08-10. All uncovered by your existing catalogue.

1. **Break of structure.** 295,564 median views, 175 phrases, and the newest top-10 result is **252 days old**. A high-demand topic with a stale front page is the single best opening you have. It is also your top non-ICT query on the website (position 64), so one video plus the matching page compounds.
2. **Smart money concepts.** 465,904 median views, the largest surface of any term measured. Broad and competitive, so make it a definitive guide rather than a quick take.
3. **Change of character.** 79,124 median, newest result 126 days old. Pairs naturally with break of structure, so film them together and cross-link.
4. **Order flow trading.** 263,709 median, but the newest result is 0 days old, meaning the topic is actively contested right now. Worth doing, expect to fight for it.
5. **Funded account rules.** 143,174 median and directly upstream of what you sell. The commercial fit is better than any other item on this list.

Concepts you have already covered: silver bullet, order block, breaker block, market maker model, fair value gap, liquidity. Do not make these again. If one deserves more traffic, improve the existing video's title and hook rather than uploading a competitor to yourself.

---

## Production checklist

Before filming:
- [ ] One named concept, and the generic phrasing is in the title
- [ ] Title front-loads the search term, no episode number, no date, no "R2F" prefix
- [ ] You can deliver it in 11 minutes

First 25 seconds:
- [ ] Opens on the chart or the problem, no intro or greeting
- [ ] States the specific thing the viewer will be able to do by the end
- [ ] Shows the payoff visually before explaining it

After publishing:
- [ ] Description carries the standard CTA block (`npm run fix-yt-descriptions` maintains this)
- [ ] Check retention at the 25 second mark in Studio. If under 60% still watching, the hook is the problem, not the topic.

---

## Known measurement limits

- **CTR is not available through the API.** `impressions` and `impressionsClickThroughRate` are rejected as unknown identifiers by the YouTube Analytics API. They exist only in YouTube Studio under Reach. Read them there manually.
- **A third of your recent views are paid** (TrueView in-stream plus Homepage Video Ad, 416 of 1,269 over 90 days). Organic is ~853. Keep that in mind when judging whether a change worked.
- `search.list` costs 100 quota units against 10,000 per day, so `--validate` only runs on the shortlist.
