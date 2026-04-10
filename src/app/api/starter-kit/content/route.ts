import { NextRequest, NextResponse } from "next/server";
import { readFile } from "@/lib/github";

const COURSE_CONTENT = {
  modules: [
    {
      title: "ICT Foundations",
      lessons: [
        {
          title: "What Is ICT Trading?",
          content: `ICT (Inner Circle Trader) is a methodology that focuses on understanding how institutional traders — banks, hedge funds, and market makers — actually move price. Unlike retail strategies that rely on lagging indicators, ICT teaches you to read the footprints that smart money leaves on the chart.

The core idea is simple: markets are not random. Large institutions need liquidity to fill their massive orders, and they engineer price movements to access that liquidity. Once you learn to see this, you stop trading against the big players and start trading alongside them.

ICT is not a single setup or indicator. It is a framework for understanding price action through the lens of institutional order flow. The key concepts you will learn include order blocks, fair value gaps, liquidity pools, and market structure — all of which we cover in this course.

The goal is not to memorize patterns. It is to develop the skill of reading what price is doing right now and why. That skill is what separates consistently funded traders from everyone else.`,
          keyTakeaway:
            "ICT is a framework for reading institutional footprints in price action — not a set of indicators or mechanical rules.",
        },
        {
          title: "Order Blocks Explained",
          content: `An order block is the last candle (or group of candles) before a strong impulsive move. It represents the zone where institutional traders placed their orders before driving price in a specific direction.

Think of it this way: a bank wants to buy 500 million euros. They cannot do that in one click — it would move the market against them. So they accumulate their position quietly, and when they are done, price explodes in their direction. The zone where they accumulated is the order block.

How to identify a bullish order block:
- Look for the last bearish candle before a strong bullish move
- The candle body (open to close) defines the zone
- Price should break structure to the upside after the order block forms
- The move away from the order block should be impulsive (strong, fast candles)

How to identify a bearish order block:
- Look for the last bullish candle before a strong bearish move
- Same principles apply in reverse

Trading order blocks:
1. Mark the order block zone on your chart
2. Wait for price to return (retrace) to the zone
3. Look for a reaction — a rejection candle, a shift in lower timeframe structure
4. Enter in the direction of the original impulsive move
5. Place your stop loss beyond the order block

Not every order block will hold. The best ones are those that caused a break of structure and have not been revisited yet (unmitigated). Order blocks that have already been tested once are weaker.`,
          keyTakeaway:
            "Order blocks mark where institutions placed their orders. Trade the retracement back into unmitigated order blocks for high-probability entries.",
        },
        {
          title: "Fair Value Gaps (FVGs)",
          content: `A fair value gap (FVG) is a three-candle pattern where the middle candle is so impulsive that it leaves a gap between the first and third candles. Specifically, the wick of candle 1 does not overlap with the wick of candle 3 — that gap is the FVG.

Why do FVGs matter? They represent imbalance in the market. When price moves so fast that it skips over a price range, there are unfilled orders in that zone. The market tends to return to fill those gaps before continuing in the original direction.

Bullish FVG:
- Three-candle sequence moving up
- The high of candle 1 is lower than the low of candle 3
- The gap between those two wicks is your bullish FVG
- Expect price to retrace down into this gap before continuing higher

Bearish FVG:
- Three-candle sequence moving down
- The low of candle 1 is higher than the high of candle 3
- The gap between those two wicks is your bearish FVG

How to trade FVGs:
1. Identify the FVG on a higher timeframe (1H or 4H)
2. Wait for price to retrace into the gap
3. Drop to a lower timeframe (5M or 15M) for entry confirmation
4. Look for a market structure shift on the lower timeframe within the FVG
5. Enter with your stop below/above the FVG

FVGs work best when they align with the overall market structure trend and sit inside or near an order block. When an FVG and an order block overlap, you have a very high-probability zone.`,
          keyTakeaway:
            "Fair value gaps are imbalances where price skipped over a range. They act as magnets — price tends to return and fill them before continuing.",
        },
        {
          title: "Liquidity: The Fuel for Every Move",
          content: `Liquidity is the single most important concept in ICT trading. It is the reason price moves the way it does. Every swing high, swing low, and equal level on your chart is a pool of orders — stop losses and pending orders placed by retail traders.

Institutions need these orders to fill their own positions. They cannot buy without someone selling to them, and they cannot sell without someone buying. So they engineer moves to trigger those clusters of orders — this is called a liquidity sweep or a liquidity grab.

Types of liquidity:
- Buy-side liquidity (BSL): Stop losses above swing highs. When price sweeps above a high, it triggers buy stops, giving institutions the sell-side orders they need.
- Sell-side liquidity (SSL): Stop losses below swing lows. When price sweeps below a low, it triggers sell stops, giving institutions buy orders.
- Equal highs/lows: When price forms two or more highs/lows at the same level, a massive cluster of stops accumulates. These are premium liquidity targets.

How to use liquidity in your trading:
1. Mark the obvious swing highs and lows on your chart
2. Identify equal highs/lows — these are magnets for price
3. Wait for price to sweep (take out) a liquidity level
4. After the sweep, look for a reversal — an order block forming, an FVG, a market structure shift
5. Enter in the direction opposite to the sweep

The key insight: when everyone can see a level, it will be swept. Institutions hunt the obvious stops first, then reverse. This is why breakout trading fails for most retail traders — the breakout is the liquidity sweep, not the start of a trend.`,
          keyTakeaway:
            "Every obvious high, low, and equal level is a liquidity target. Institutions sweep these levels to fill orders, then reverse. Trade the reversal, not the breakout.",
        },
      ],
    },
    {
      title: "Market Structure",
      lessons: [
        {
          title: "Break of Structure (BOS)",
          content: `Market structure is the backbone of all ICT analysis. It tells you the current trend direction and helps you decide whether to look for buys or sells. A break of structure (BOS) is the confirmation that the current trend is continuing.

In a bullish trend:
- Price makes higher highs (HH) and higher lows (HL)
- A BOS occurs when price breaks above the most recent swing high
- This confirms buyers are still in control
- After a bullish BOS, look for buy setups on pullbacks to order blocks or FVGs

In a bearish trend:
- Price makes lower highs (LH) and lower lows (LL)
- A BOS occurs when price breaks below the most recent swing low
- This confirms sellers are still in control
- After a bearish BOS, look for sell setups on pullbacks

How to mark structure:
1. Start on a higher timeframe (4H or Daily)
2. Identify the most recent swing points (highs and lows)
3. Draw horizontal lines at each swing point
4. When price closes beyond a swing point, mark it as BOS
5. The direction of the BOS tells you the trend

Important: use candle closes, not wicks, for BOS confirmation. A wick above a high is a liquidity sweep, not a BOS. A body close above is the real break.

Multi-timeframe alignment is critical. If the daily chart shows a bullish BOS and the 1H chart also shows a bullish BOS, you have confluence. If they conflict, stay out or trade the higher timeframe direction.`,
          keyTakeaway:
            "Break of structure confirms trend continuation. Always use candle body closes — not wicks — to confirm BOS. Align multiple timeframes for higher probability.",
        },
        {
          title: "Change of Character (CHOCH)",
          content: `A change of character (CHOCH) is the first sign that the trend may be reversing. It occurs when price breaks a key structural level in the opposite direction of the prevailing trend.

In a bullish trend becoming bearish:
- Price has been making higher highs and higher lows
- Then price breaks below the most recent higher low
- This is a bearish CHOCH — the first lower low in the sequence
- It signals that sellers may be taking control

In a bearish trend becoming bullish:
- Price has been making lower lows and lower highs
- Then price breaks above the most recent lower high
- This is a bullish CHOCH — the first higher high in the sequence

CHOCH vs BOS:
- BOS = trend continuation (break in the same direction as the trend)
- CHOCH = potential trend reversal (break against the trend direction)
- A CHOCH does not guarantee a reversal — it is the first warning sign
- Wait for a BOS in the new direction to confirm the reversal

How to trade CHOCH:
1. Identify the prevailing trend on a higher timeframe
2. Watch for price to break a key swing point against the trend
3. After the CHOCH, look for an order block or FVG that caused the break
4. Wait for price to retrace to that zone
5. Enter in the new direction with a stop beyond the CHOCH candle

The best CHOCH setups occur after a liquidity sweep. For example: price sweeps above equal highs (taking buy-side liquidity), then immediately breaks below the most recent higher low (CHOCH). This sequence — liquidity sweep followed by CHOCH — is one of the highest-probability reversal patterns in ICT trading.`,
          keyTakeaway:
            "CHOCH is the first sign of a trend reversal — a structural break against the current trend. The highest-probability CHOCH setups happen right after a liquidity sweep.",
        },
        {
          title: "Displacement and Institutional Candles",
          content: `Displacement is a powerful, impulsive move in one direction characterized by large-bodied candles with minimal wicks. It is the market's way of showing you where institutional money is flowing aggressively.

Characteristics of displacement:
- Multiple large-bodied candles in sequence (2-4 candles)
- Very small or no wicks on the candles
- Creates fair value gaps (FVGs) in the process
- Often follows a liquidity sweep
- Volume typically spikes during displacement

Why displacement matters:
Displacement tells you that institutions are moving price with conviction. It is not random volatility — it is directed, aggressive order flow. The FVGs left behind during displacement become your entry zones when price retraces.

How to use displacement:
1. Wait for a clear displacement move (2+ large impulsive candles)
2. Mark the FVGs created during the move
3. Identify any order blocks at the base of the displacement
4. Wait for price to retrace into the FVG or order block
5. Enter in the direction of the displacement

Displacement also confirms market structure changes. When a CHOCH happens with displacement (strong, impulsive candles), it is much more significant than a weak, grinding CHOCH. Displacement behind a structural break gives you confidence that the move is real.

Avoid trading into displacement. If you see strong bearish candles displacing lower, do not try to buy. Wait for the displacement to complete, mark your zones, and trade the pullback.`,
          keyTakeaway:
            "Displacement is aggressive institutional order flow shown by large-bodied candles. It confirms the validity of structural breaks and creates high-probability FVG entry zones.",
        },
        {
          title: "Premium and Discount Zones",
          content: `Every trading range has a premium zone (expensive) and a discount zone (cheap). Understanding where price is within the range helps you take trades with better risk-to-reward ratios.

How to define the range:
1. Identify a significant swing high and swing low
2. Use the Fibonacci retracement tool from the swing low to the swing high
3. The 50% level (equilibrium) divides the range into two halves
4. Above 50% = premium zone (expensive)
5. Below 50% = discount zone (cheap)

The rule is simple:
- Buy in discount (below 50%), sell in premium (above 50%)
- In a bullish trend, wait for price to pull back into discount before buying
- In a bearish trend, wait for price to rally into premium before selling

This concept filters out bad trades. Even if you find a valid order block or FVG, if it is in the wrong zone (buying in premium or selling in discount), the probability drops significantly.

Optimal trade location (OTE):
The ICT optimal trade entry sits between the 62% and 79% Fibonacci retracement levels. This is the sweet spot where institutions typically re-enter after a pullback. When an order block or FVG aligns with the OTE zone, you have a very high-probability setup.

Combining with other concepts:
1. Identify trend direction via market structure (BOS/CHOCH)
2. Wait for price to retrace into the correct zone (discount for buys, premium for sells)
3. Look for an order block or FVG within the OTE zone
4. Enter with confirmation on a lower timeframe
5. Target the opposing liquidity pool`,
          keyTakeaway:
            "Buy in discount, sell in premium. The optimal trade entry (OTE) zone between the 62%-79% Fibonacci levels is where institutions re-enter positions.",
        },
      ],
    },
    {
      title: "Killzone Trading",
      lessons: [
        {
          title: "Understanding ICT Killzones",
          content: `Not all hours of the trading day are equal. ICT killzones are specific time windows when institutional traders are most active, creating the highest-probability setups. Trading outside of killzones dramatically reduces your edge.

The three main killzones (in New York time / EST):

1. Asian Killzone: 8:00 PM - 12:00 AM EST
   - Generally a ranging, low-volatility session
   - Used to identify the Asian range (high and low)
   - The Asian range high and low become liquidity targets for London and New York
   - Rarely the best session for directional trades

2. London Killzone: 2:00 AM - 5:00 AM EST
   - The first major liquidity injection of the day
   - Often sweeps the Asian session high or low (or both)
   - High-probability setups when London takes out Asian liquidity and reverses
   - Best for forex pairs involving EUR, GBP, CHF

3. New York Killzone: 8:30 AM - 11:00 AM EST
   - The most volatile and highest-volume session
   - Major economic news releases happen here
   - Often continues the London move or reverses it
   - Best for all USD pairs, indices (ES, NQ), and commodities

Why killzones work:
Institutional traders operate during specific business hours. When London banks open, they bring massive order flow. When New York opens, even more liquidity enters. These overlapping sessions create the conditions for displacement, liquidity sweeps, and clean setups.

Rule: If you only trade during killzones, you eliminate 80% of losing trades that come from choppy, low-volume conditions.`,
          keyTakeaway:
            "Trade only during killzones — London (2-5 AM EST) and New York (8:30-11 AM EST). These windows have the highest institutional activity and the cleanest setups.",
        },
        {
          title: "The London-to-New-York Playbook",
          content: `The most reliable daily sequence in ICT trading follows a predictable pattern across the London and New York sessions. Understanding this sequence gives you a roadmap for each trading day.

The typical daily sequence:

Step 1 — Asian Range Formation (8 PM - 12 AM EST)
Price consolidates and forms a range. Mark the high and the low. These become the first targets.

Step 2 — London Sweep (2 AM - 5 AM EST)
London opens and sweeps one side of the Asian range. For example, price drops below the Asian low (sweeping sell-side liquidity), then reverses.

Step 3 — London Continuation or Reversal (5 AM - 8 AM EST)
After the initial sweep, price either continues in the new direction or consolidates. Mark any FVGs or order blocks created.

Step 4 — New York Entry (8:30 AM - 11 AM EST)
New York either continues the London move (most common) or engineers a reversal. If London established a bullish bias, look for a pullback into a discount FVG/OB during New York for your entry.

Step 5 — New York Afternoon (12 PM - 2 PM EST)
The most dangerous time to trade. Low volume, choppy price action. Close or manage existing trades — do not open new ones.

How to implement this playbook:
1. Before London opens, mark the Asian high and low
2. During London, watch which side gets swept
3. After the sweep, identify the displacement and mark FVGs/OBs
4. During New York open, wait for a pullback to those zones
5. Enter with your stop beyond the London swing point
6. Target the next liquidity pool (often the other side of the Asian range or the previous day high/low)

This is not a rigid script — it is a framework. Some days, London and New York align perfectly. Other days, they conflict. When in doubt, sit out.`,
          keyTakeaway:
            "Follow the daily sequence: mark the Asian range, observe the London sweep, then enter during New York in the direction established by London. If sessions conflict, sit out.",
        },
        {
          title: "Session Timing and Optimal Entries",
          content: `Knowing the killzones is step one. Knowing exactly when within those killzones to enter is what separates average ICT traders from consistently profitable ones.

The first 30 minutes of each killzone are observation time. Do not trade during the first 30 minutes. Instead:
- Watch which direction price is being pushed
- Identify liquidity sweeps happening
- Mark any FVGs or order blocks forming
- Establish your bias for the session

The entry window:
After the first 30 minutes, you have approximately 90 minutes for optimal entries. This is when displacement has occurred, structure has been established, and retracements begin.

For London: best entries between 2:30 AM - 4:00 AM EST
For New York: best entries between 9:00 AM - 10:30 AM EST

Entry checklist:
1. Higher timeframe bias is clear (daily/4H structure)
2. You are within a killzone
3. Liquidity has been swept (a high or low was taken)
4. Displacement occurred after the sweep
5. Price is retracing into a discount/premium zone
6. An order block or FVG is present at the retracement level
7. Lower timeframe (1M-5M) shows a CHOCH or BOS confirming the entry

If all 7 criteria are met, you have a high-conviction trade. If fewer than 5 are met, reduce your position size or skip the trade entirely.

Time-based stop: if your trade has not moved in your favor within 1-2 hours of entry, consider closing it. Good ICT setups typically work quickly because you are entering at the point of institutional interest.`,
          keyTakeaway:
            "Wait 30 minutes into each killzone before entering. Use a 7-point checklist for high-conviction trades. If the trade does not move in your favor within 1-2 hours, it is likely wrong.",
        },
      ],
    },
    {
      title: "Risk Management Blueprint",
      lessons: [
        {
          title: "Position Sizing Rules",
          content: `Risk management is not optional — it is the single factor that determines whether you survive long enough to become profitable. No strategy, no matter how good, can overcome poor risk management.

The 1% rule:
Never risk more than 1% of your account on a single trade. This is non-negotiable, especially for prop firm challenges.

Example: $100,000 account = $1,000 maximum risk per trade.

How to calculate position size:
1. Determine your stop loss distance in pips or points
2. Divide your dollar risk by the stop loss distance
3. The result is your position size

Formula: Position size = Dollar risk / (Stop loss in pips x pip value)

Example:
- Account: $100,000
- Risk per trade: $1,000 (1%)
- Stop loss: 20 pips
- Pip value for 1 lot EUR/USD: $10
- Position size: $1,000 / (20 x $10) = 0.5 lots

Scaling for prop firm challenges:
During a challenge, consider reducing risk to 0.5% per trade. The goal is not to maximize returns — it is to pass the challenge without hitting the drawdown limit.

Risk-to-reward minimums:
Never take a trade with less than 1:2 risk-to-reward ratio. Ideally, aim for 1:3 or higher. With ICT entries at order blocks and FVGs in the OTE zone, 1:3+ is realistic because your stop loss is tight and your target is the next liquidity pool.

The math: if you risk 1% per trade and average 1:3 RR, you need to win only 30% of your trades to be profitable. With proper ICT setups, most traders achieve 40-60% win rates, which makes the math overwhelmingly in your favor.`,
          keyTakeaway:
            "Never risk more than 1% per trade. Calculate position size based on your stop loss distance. Aim for minimum 1:3 risk-to-reward — the math works heavily in your favor.",
        },
        {
          title: "Drawdown Rules and Account Protection",
          content: `Every prop firm has drawdown limits — typically 5% daily and 10% total. Even on personal accounts, you need hard rules to prevent emotional blowups from destroying weeks of progress.

Daily drawdown rules:
- Set a daily loss limit of 2% of your account
- After 2 losses in a row, stop trading for the day (regardless of how much you have lost)
- After hitting your daily limit, close your trading platform entirely
- Do not revenge trade — this is the number one account killer

Weekly drawdown rules:
- Maximum 4% weekly drawdown
- If you hit 4% loss for the week, take the rest of the week off
- Use the time to review your trades, journal, and analyze what went wrong

How to recover from drawdown:
1. Reduce position size by 50% until you have recovered half the drawdown
2. Focus on only the highest-probability setups (full 7-point checklist)
3. Trade only during the New York killzone (highest success rate)
4. Do not try to make it all back in one trade
5. Return to normal size only when your equity is back above the drawdown midpoint

The emotional cycle of drawdown:
Loss → frustration → size increase → bigger loss → panic → emotional trading → account blown. Break this cycle by having pre-defined rules that you follow mechanically.

Journal every trade: date, time, setup type, entry/exit, result, screenshot, and one sentence about your emotional state. Patterns in your journal reveal patterns in your losses.`,
          keyTakeaway:
            "Set a 2% daily and 4% weekly drawdown limit. After 2 consecutive losses, stop trading for the day. Reduce size during drawdowns — do not increase it.",
        },
        {
          title: "Building Your Risk Framework",
          content: `A risk framework is a written document that defines your rules before you trade. It removes emotion from decision-making because every scenario is pre-planned.

Your risk framework template:

1. Account Details
   - Account size: $___
   - Maximum risk per trade: ___% (recommended: 0.5-1%)
   - Dollar risk per trade: $___

2. Daily Rules
   - Maximum trades per day: 2-3
   - Maximum daily loss: 2%
   - Stop trading after: 2 consecutive losses
   - Trading hours: killzones only

3. Weekly Rules
   - Maximum weekly loss: 4%
   - Review day: every Friday
   - Minimum trades for the week: 0 (sitting out is a valid week)

4. Entry Criteria (the 7-point checklist)
   - Higher timeframe trend alignment
   - Active killzone
   - Liquidity swept
   - Displacement present
   - Correct premium/discount zone
   - Order block or FVG present
   - Lower timeframe confirmation

5. Trade Management
   - Move stop to breakeven after 1:1 RR is reached
   - Take partial profits at 1:2 RR (close 50%)
   - Let remaining position run to 1:3 or the next liquidity target
   - Time stop: close if no movement after 2 hours

6. Recovery Protocol
   - After hitting daily limit: stop, journal, review
   - After hitting weekly limit: take remaining week off
   - After recovery: return to trading at 50% size for 3 days

Print this framework. Put it next to your screen. Read it before every session. The traders who get funded are not the ones with the best setups — they are the ones who follow their rules consistently.`,
          keyTakeaway:
            "Write your risk framework before you trade. Print it. Follow it mechanically. Consistency in risk management matters more than the quality of your setups.",
        },
      ],
    },
    {
      title: "The Funded Account Roadmap",
      lessons: [
        {
          title: "Choosing the Right Prop Firm",
          content: `Not all prop firms are created equal. The firm you choose significantly impacts your chance of getting funded. Here is what to look for:

Top firms to consider:
- FTMO: the gold standard. Strict rules but excellent reputation and payouts
- MyForexFunds (or successor firms): lower cost, flexible rules
- The Funded Trader: multiple challenge types, generous drawdown
- True Forex Funds: straightforward rules, good for beginners

What to evaluate:
1. Profit target: most firms require 8-10% in Phase 1, 5% in Phase 2. Lower targets are easier.
2. Drawdown limits: daily (usually 5%) and total (usually 10%). Higher limits give you more room.
3. Time limit: some firms give 30 days, others are unlimited. Unlimited time reduces pressure.
4. Cost: challenges range from $100-$500 for a $100K account. Do not overspend on challenges.
5. Payout split: most firms offer 80/20 in your favor. Some go up to 90/10.
6. Rules on holds: some firms require you to close positions by Friday. Others allow swing trading.

Strategy for choosing:
Start with a smaller account size ($25K-$50K) to build confidence and proof of concept. Once you pass your first challenge, scale up to $100K-$200K. Many firms allow you to hold multiple funded accounts.

Account sizing math:
A $50K funded account with 1% risk per trade = $500 per trade. At 1:3 RR, each winner nets $1,500. Four winners per month = $6,000. At 80% payout = $4,800 per month from a single $50K account. The numbers scale linearly.`,
          keyTakeaway:
            "Start with a smaller challenge size ($25-50K) to build confidence. Evaluate firms on drawdown limits, time limits, and payout splits. The math works even at small account sizes.",
        },
        {
          title: "The Challenge Phase Strategy",
          content: `Passing a prop firm challenge is not about trading aggressively — it is about surviving. The firms profit from failed challenges, so your job is to be boring, disciplined, and consistent.

Phase 1 strategy (8-10% profit target):

Week 1: Observation and small trades
- Trade at 0.5% risk per trade (half your normal risk)
- Take only the cleanest setups (full checklist)
- Goal: end the week green, even if only 1-2% up
- This builds confidence and prevents early drawdown

Week 2: Normal trading
- Increase to 0.75% risk per trade
- Take 1-2 trades per day maximum during NY killzone
- Target 3-4% progress for the week
- If you hit 5% for the challenge, reduce risk back to 0.5%

Week 3-4: Close it out
- Once you are at 6-7%, you need only 1-3 more good trades
- Reduce risk to 0.5% and be very selective
- Do not rush — you have time
- A single 1:3 trade at 0.75% risk = 2.25% account gain

Phase 2 strategy (5% profit target):
Follow the same approach but at reduced risk. Phase 2 is designed to test consistency, not aggression. Trade at 0.5% risk maximum throughout.

Critical rules during challenges:
- Never move your stop loss further from entry (widening stops)
- Always take the trade off before news events if you are nervous
- Never trade on Fridays during challenge Phase 1 (lower volume, chop)
- Journal every trade — the journal saves your future challenges
- If you fail, review the journal before starting another challenge`,
          keyTakeaway:
            "Treat prop firm challenges as a survival game, not a speed race. Start at half risk, scale up only when ahead, and reduce risk once you are close to the target.",
        },
        {
          title: "Trading Psychology for Challenges",
          content: `The biggest threat to passing a challenge is not your strategy — it is your mind. Understanding and managing trading psychology is what separates the 15% who pass from the 85% who fail.

The three psychological killers:

1. Fear of missing out (FOMO)
You see a move happening without you and jump in late. The entry is bad, the stop is too wide, and you lose. FOMO trades have the lowest win rate of any trade type.
Solution: if you missed the setup, it is gone. Another one will come tomorrow. There are 250+ trading days per year. You need roughly 15-20 good trades to pass a challenge.

2. Revenge trading
You take a loss and immediately look for another trade to make it back. Your analysis is rushed, emotional, and biased. The second loss hits harder.
Solution: after every loss, walk away for at least 30 minutes. Better yet, follow the 2-loss daily rule and stop for the day.

3. Overconfidence after wins
You hit three winners in a row and feel invincible. You increase size, trade outside killzones, and take marginal setups. The streak ends with a bigger loss than necessary.
Solution: your position size should never change based on recent results. The rules are the rules, whether you are up 8% or down 2%.

Pre-session routine:
Before every trading session, spend 5 minutes on this:
1. Review your risk framework rules
2. Check the economic calendar — avoid high-impact news
3. Mark the Asian range (if trading London or NY)
4. Write down your bias and the setups you are looking for
5. State your maximum risk for the session out loud

Post-session routine:
After every session, spend 10 minutes:
1. Journal each trade taken (or note why you sat out)
2. Rate your execution 1-10 (did you follow the rules?)
3. Identify one thing you did well and one thing to improve
4. Close the charts — do not watch price outside killzones`,
          keyTakeaway:
            "FOMO, revenge trading, and overconfidence are the three psychological killers. Build a pre-session and post-session routine that keeps emotion out of your trading.",
        },
        {
          title: "After Getting Funded: Staying Funded",
          content: `Getting funded is only half the battle. Staying funded and consistently withdrawing profits is the real goal. Many traders pass challenges only to blow funded accounts within the first month.

The funded account mindset shift:
In the challenge, you have a clear goal (hit the profit target). Once funded, there is no finish line. This shift causes many traders to lose discipline. You must create your own structure.

Monthly targets for funded accounts:
- Minimum goal: 3-5% per month (conservative, sustainable)
- Stretch goal: 5-8% per month (for experienced traders)
- Never aim for more than 10% in a single month — this forces overtrading

Withdrawal strategy:
- Withdraw profits monthly. Do not let profits compound in the funded account
- Withdrawn money is guaranteed. Money in the account can be lost
- Most firms have bi-weekly or monthly payout schedules
- Keep a spreadsheet tracking your payouts — seeing consistent income builds confidence

Scaling plan:
Phase 1: Pass one $50K challenge → trade for 3 months → build proof of concept
Phase 2: Add a second funded account ($50-100K) from a different firm
Phase 3: Scale to $200K-$400K across 2-3 firms
Phase 4: Maintain $300K-$500K total funded capital

At $300K funded with a 4% monthly return and 80% payout: $9,600/month take-home. This is a realistic, achievable target within 6-12 months of starting your funded journey.

Protecting your funded account:
1. Use the same risk framework you used in the challenge
2. Never increase risk because you are funded
3. Take the first 2 weeks of funded trading at 0.5% risk
4. If you hit 50% of the maximum drawdown, stop trading for a week
5. Treat every funded day as day 1 of a new challenge

The goal is to make trading boring and profitable. Excitement in trading usually means you are about to do something risky. Boring consistency is what generates sustainable income.`,
          keyTakeaway:
            "Withdraw profits monthly — money in the account can be lost. Scale across multiple firms to reach $300-500K in funded capital. Target 3-5% monthly with the same discipline used to pass the challenge.",
        },
      ],
    },
  ],
};

export async function GET(req: NextRequest) {
  // Verify token from Authorization header
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json(
      { error: "Authorization required" },
      { status: 401 }
    );
  }

  // Verify token against purchases
  try {
    const raw = await readFile("data/starter-kit-purchases.json");
    const purchases: { token: string }[] = JSON.parse(raw);
    const valid = purchases.some((p) => p.token === token);

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Unable to verify access" },
      { status: 500 }
    );
  }

  return NextResponse.json(COURSE_CONTENT);
}
