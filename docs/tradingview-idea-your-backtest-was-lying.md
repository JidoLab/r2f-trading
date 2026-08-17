# TradingView Idea: "Your Backtest Was Lying to You"

Third in the series, after "You Are the Liquidity" and "Phase 1 Was the Easy Part".

---

## Why this topic

Almost nobody covers this properly. Trading content teaches people to backtest
and then stops, so the audience has the habit without any of the ways it goes
wrong. That makes it a genuinely differentiated post rather than another take
on a saturated concept.

It also suits the format. The two posts that performed for BlueNyraFx made the
reader uncomfortable about their own behaviour, and this one tells someone that
the evidence they trust was manufactured by their own testing process.

Post under **Education**, tagged to **BTCUSD** or **NQ1!**.

**Formatting:** `[b]` and `[i]` only. `[u]` does not render. Tags take no spaces.

**One thing to confirm before posting:** the section on intrabar resolution
cites the roughly 5.6 ticks per trade you measured on NQ in your own testing
work. It is the strongest credibility marker in the post. Cut the number if you
would rather not share it, and the section still stands without it.

---

## The post

**Title:** Your Backtest Was Lying to You

---

```
The backtest said 68 percent win rate.

Live, the same strategy is barely breaking even, and you have quietly decided the problem is your psychology.

Sometimes it is. Often it is not. The backtest was overstating the strategy before you ever placed a trade, and the gap you are feeling is the size of that overstatement.

I want to go through the specific ways a test comes out better than reality, because once you can name them you can measure them, and a corrected expectation is worth more than an inflated one.

[b]1. THE CANDLE DOES NOT TELL YOU THE ORDER THINGS HAPPENED IN[/b]

This is the biggest one and it is almost never mentioned.

Take a trade with a stop and a target. Now find a candle whose range covers both of them. High enough to hit your target, low enough to hit your stop.

Which one happened first?

The candle cannot tell you. It stores four numbers: open, high, low, close. The sequence inside it is gone.

So the backtester has to guess, and most of them guess in your favour. Some assume the target filled. Some use a rule like "if the open is closer to the target, assume target first". Either way, every candle that could have gone both ways gets resolved as a win far more often than reality would allow.

This inflates any strategy where the stop and target both sit inside normal bar range. The tighter your stop relative to the candle size, the worse it gets, which is exactly why tight-stop systems look so good in testing and fall apart live.

When I measured this properly on NQ, the difference was worth roughly 5.6 ticks per trade. That number sounds small until you multiply it across a few hundred trades and notice it is larger than the edge the strategy claimed to have.

[i]How to check it:[/i] run the same test on a much lower timeframe so fewer candles contain both levels. If the results collapse, the original number was mostly this.

[b]2. YOU TESTED UNTIL IT WORKED[/b]

Here is the part that is uncomfortable, because everybody does it and almost nobody counts it.

You test the strategy. It is mediocre. So you try a different stop distance. Then a different session filter. Then you exclude Mondays because Mondays look bad. Then a different moving average length.

Eventually a version looks great and you stop testing.

That version is not your best strategy. It is your luckiest one.

Some arithmetic makes it concrete. Take a coin flip over 100 trades. The standard deviation of the win rate is about 5 percent. Now test 100 variations of that coin flip and keep the best.

The best of 100 will typically land around two and a half standard deviations above the middle. That is a win rate near 62 percent.

Sixty two percent, from a coin, purely because you looked a hundred times.

Now consider that a real optimisation run tests hundreds or thousands of combinations, and that a bad one gets thrown away without you thinking of it as a test. That is the mechanism, and it does not care how good your idea was.

[i]How to check it:[/i] count the variations you tried, including the ones you abandoned after ten minutes. If the honest answer is more than about five, your final number is inflated and you do not know by how much.

[b]3. THE COSTS ARE NEVER WHAT YOU PUT IN[/b]

Most people either leave costs out or plug in a flat number that flatters them.

Three things get understated.

Spread is not fixed. It widens exactly when you most want to trade, which is the open, the release and the breakout. Your test used the average spread. Your fills happened at the wide one.

Slippage is not symmetrical. When a move goes against you, you get filled. When it goes for you, you sometimes do not. That asymmetry does not show up anywhere in a standard backtest.

And commission compounds with frequency. A cost that looks trivial per trade becomes the entire edge on a strategy that trades often. Scalping systems die here more than anywhere else.

[i]How to check it:[/i] rerun with double the costs you assumed. If the strategy stops working, it was never a strategy. It was a cost estimate.

[b]4. YOUR SAMPLE IS SMALLER THAN YOU THINK[/b]

Thirty trades tells you very little. A hundred is a start. It still is not much.

Two things make it worse than the raw count suggests.

Trades cluster. Twenty trades taken in one trending month are not twenty independent pieces of evidence. They are closer to one piece of evidence about one market condition, repeated twenty times. Your strategy has been tested against a single environment and you have counted it twenty times.

And averaging hides it. If you average your win rate per day rather than pooling all trades together, quiet days with two trades count the same as busy days with twenty. Small clusters get enormous weight and can manufacture an effect that is not there. I have watched that alone create a several percent improvement out of nothing.

[i]How to check it:[/i] compute your win rate both ways, pooled across all trades and averaged per day. If the two numbers disagree meaningfully, the flattering one is an artefact.

[b]5. YOU USED INFORMATION YOU DID NOT HAVE AT THE TIME[/b]

Look-ahead bias sounds like an academic problem. It is not, and it hides in ordinary places.

The obvious version is repainting. An indicator that adjusts its past signals once more bars arrive will look extraordinary in testing, because on the chart you are staring at it has already corrected itself. Live, it gives you the signal and then changes its mind. Zigzag style tools and anything that marks a swing high only after price has moved away both do this.

The subtle version is timeframe leakage. You decide an intraday trade using the daily close, or you filter by whether the session ended bullish. At the time you would actually have been clicking, that candle had not closed and you did not know how it would end. The test does, because it is reading finished data.

There is a third version that catches people using higher timeframe bias. If your rule is "only long when the 4 hour is bullish", check what "bullish" means at the moment of entry rather than at the end of the 4 hour candle. Those are different rules and only one of them is tradeable.

[i]How to check it:[/i] for every condition in your strategy, ask whether that value was final at the moment of entry. If it could still have changed, the test knew something you would not have.

[b]6. YOU ALREADY KNEW WHAT THE CHART DID[/b]

This one is specific to manual replay testing, which is how most people on this platform test, and it is the hardest to control.

You pick a market and a date, roll the bars forward, and take trades as they appear. It feels honest. But you have almost certainly seen this chart before. You know roughly where the big move was. You know this pair spent the autumn trending.

That knowledge leaks into every decision without ever announcing itself. You hold a winner slightly longer because something in you knows the move continued. You skip an entry that felt wrong in a way you cannot articulate, on a day that happened to be choppy.

The other half of the problem is that you decide when to stop. Nobody ends a replay session on a losing streak and records it. You take a break, come back tomorrow, and the sample quietly loses its worst stretch.

[i]How to check it:[/i] replay on a market you do not follow, with the symbol name hidden if your platform allows it, and commit to a fixed number of trades before you start. Write the number down first. Then trade all of them, including the ones after three losses in a row.

[b]7. THE BACKTEST NEVER HAD TO BE YOU[/b]

The version of you in the backtest is a machine with no memory.

It never skipped a setup because the last two lost. It never sized up to make back a bad morning. It never moved a stop because the trade was nearly there. It never went to sleep, missed London, and took a worse trade at lunch instead.

Your live results include all of that, and none of it is in the test.

This is why comparing your live performance to your backtest and concluding you have a discipline problem is often the wrong diagnosis, and sometimes a very expensive one. The backtest was never a realistic ceiling. It was an inflated number, and you have been measuring yourself against it.

[b]HOW TO TEST SOMETHING PROPERLY[/b]

None of this means testing is pointless. It means a test needs guardrails.

[b]Split the data before you start.[/b] Take the most recent third and do not look at it. Build and optimise on the older two thirds. When you are finished and have stopped fiddling, run it once on the part you held back. That single run is your real estimate. If you go back and adjust after seeing it, you have burned it and you need fresh data.

[b]Walk it forward.[/b] Optimise on six months, test on the next one, roll the window, repeat. What you want to see is whether the parameters that won in one window keep winning in the next. Usually they do not, and that tells you the parameters were noise.

[b]Run the null.[/b] This is the one almost nobody does and it is the most informative. Take your data, shuffle the returns or generate random series with similar characteristics, then run your whole process on it exactly as you normally would. Including the fiddling.

If your method finds a profitable strategy in random data, and it usually will, you now know what your process produces from nothing. Anything real has to beat that, not zero.

[b]Count everything you tried.[/b] Keep a log of every variation, including abandoned ones. The count is the correction factor. Ten variations means a much higher bar than one.

[b]WHAT THE CORRECTION ACTUALLY LOOKS LIKE[/b]

Worth walking through with the number from the top, because the individual effects sound small and the combination does not.

Start at the claimed 68 percent win rate.

Resolve the ambiguous candles honestly instead of favourably and a chunk of those wins become losses. On a tight stop system this alone can take several points off the win rate.

Apply real costs, the wide spread rather than the average, and the trades that were marginal winners become scratches or small losses.

Correct for the fact that you tried eleven variations and kept the best. There is no clean formula for that at home, but the honest adjustment is downward and it is not small.

Then account for the sample being one trending quarter rather than a range of conditions.

You do not end up at 68 percent. You end up somewhere in the fifties at best, on a system whose reward to risk determines whether that is even profitable.

That is not a disaster. A system in the fifties with a decent reward to risk is a real edge and plenty of people make a living on less. The disaster is planning your position sizing, your income expectations and your prop firm timeline around 68.

[b]WHAT A REAL RESULT ACTUALLY LOOKS LIKE[/b]

Worth calibrating, because inflated tests have skewed what people expect.

A genuine edge is usually small. A win rate in the forties with a reward larger than the risk. A profit factor somewhere between 1.1 and 1.4. Drawdowns that are uncomfortable and last longer than you would like.

If your test shows a 70 percent win rate, a profit factor of 3 and a smooth equity curve, the most likely explanation is not that you found something extraordinary. It is one of the five things above.

The small ugly result that survives an untouched out-of-sample run is worth more than the beautiful one that does not.

[b]WHEN BACKTESTING IS STILL WORTH DOING[/b]

Being fair about it, because the answer is not to stop.

It is very good at killing bad ideas. If something loses on ten years of data, you do not need to risk money finding that out. Rejection is the most reliable thing a backtest does.

It is good for understanding behaviour. How long are the drawdowns, how many losses in a row should you expect, which conditions hurt. That is preparation you cannot get any other way, and it matters more than the headline number.

It is good for building familiarity with a setup, which is why manual replay testing is worth the hours even though it proves nothing statistically.

What it is not good at is telling you how much money you will make. Treat it as a filter, not a forecast.

[b]THE CHECK TO RUN ON YOUR CURRENT STRATEGY[/b]

Three questions. Be honest, nobody is watching.

How many variations did I try before I settled on this one?

Did I ever run it on data I had not already looked at, without changing anything afterwards?

If I double the costs, does it still work?

If the answers are "a lot", "no", and "no", then the strategy has not failed you yet. It has never actually been tested.

Ten years in, the biggest change in my own results came from getting far more sceptical about my own evidence. Not a better setup. Just refusing to believe a good-looking number until it survived something it could have failed.

What is the best backtest result you have ever gotten that fell apart live? Post the numbers, I am genuinely curious how big the gap usually is.
```

---

## Tags

No spaces allowed.

```
backtesting
tradingstrategy
riskmanagement
tradingpsychology
tradingplan
overfitting
strategytesting
algotrading
tradingeducation
priceaction
trendanalysis
dataanalysis
```

---

## ChatGPT prompt for the thumbnail

This one is a scene rather than a chart panel. "The Chart Is the Crime Scene"
took 210 boosts on that approach, more than any of their clean infographics, so
the third post leans into it.

```
Create a 16:9 landscape image for a trading education post. Cinematic, photographic, dramatic. Do not add any text other than what I specify.

SCENE: A dark wooden desk lit by a single hard overhead lamp, everything else falling into deep shadow. Film noir interrogation mood. Shot at a slight three quarter angle, shallow depth of field, visible dust in the light beam.

ON THE DESK, centre: a vintage polygraph lie detector machine, brass and dark metal, with three thin needles scratching across a long strip of paper. The paper strip feeds out of the machine toward the camera and spills over the front edge of the desk in a curl.

THE PAPER STRIP: instead of normal polygraph squiggles, the ink line traced on it is a smooth, beautiful, steadily rising equity curve. Near the end of the strip the line breaks into a violent jagged spike and then crashes downward off the bottom of the paper.

WIRED TO THE MACHINE: two thin cables with metal clips run from the polygraph to a trading monitor standing at the back left of the desk. The monitor glows cold blue and shows a candlestick chart. The clips are attached to the edge of the screen like electrodes on a suspect.

A single small red indicator bulb on the polygraph is lit and glowing hot, casting a faint red pool on the desk surface.

PROPS, arranged naturally and slightly scattered: a printed spreadsheet page face up with rows of numbers, one row circled in red pen. A pen resting on it. A half full glass of water. A stopwatch. A few scattered index cards.

TEXT, upper left, large, bold condensed sans-serif, all caps, warm white, sitting in the dark negative space above the desk:
YOUR BACKTEST
WAS LYING

Set the word LYING in a hot red that matches the indicator bulb. Keep the rest warm white.

SMALL TEXT beneath the headline, uppercase, letter spaced, dim grey:
FIVE WAYS THE NUMBERS FLATTER YOU

COLOUR PALETTE: deep browns and near black, one warm lamp glow, one cold blue from the monitor, one hot red accent. Nothing else.

IMPORTANT: all text spelled exactly as written, crisp and legible. No watermarks, no logos, no extra words, no gibberish text anywhere in the image. The paper strip must clearly read as a rising line that collapses at the end.
```

If the equity curve on the paper comes out as generic squiggles, add: "The line
on the polygraph paper must clearly be a financial chart line rising steadily
and then crashing at the end, not random polygraph waves."

Expect three or four passes on this one. It is a busier scene than the previous
two, which is the point, but busier scenes mangle text more often.

---

## Backup thumbnail concept if the polygraph does not land

A rear view mirror hanging in a dark car interior. Reflected in the mirror is a
perfect rising equity curve glowing green. Through the windscreen ahead, a red
crashing chart. Same headline placement. Simpler scene, easier for the model to
get right, still reads instantly.

---

## Posting checklist

- [ ] Category: **Education**
- [ ] Symbol: BTCUSD or NQ1!
- [ ] Title exactly: **Your Backtest Was Lying to You**
- [ ] Decide whether the 5.6 ticks figure stays in
- [ ] Paste the BBCode body, preview to confirm bold rendered
- [ ] Tags have no spaces
- [ ] Reply to every comment in the first 24 hours

---

## Series so far

1. You Are the Liquidity (where your stop sits and why)
2. Phase 1 Was the Easy Part (why the risk that passes step one fails step two)
3. Your Backtest Was Lying to You (why your evidence is inflated)

All three are the same underlying argument from different angles: the thing you
believe is working is usually measuring something else. That is a coherent
identity for the profile rather than three unrelated posts.

Natural fourth: **"You Don't Have a Discipline Problem"**, on why traders
misdiagnose a bad plan as a willpower failure. It follows directly from section
5 of this post.
