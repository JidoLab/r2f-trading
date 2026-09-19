# Handbook launch: "Between the Stop and the Target"

Source files: `D:\Projects\astute-trader-handbook\deliverables\`
(interior.pdf colour, interior_grey.pdf greyscale, cover.pdf, cover_front.jpg,
handbook.epub). 287 pages, 6 x 9 in, 137 chapters, 137 illustrations.

## The route

**Sell it through Amazon KDP (paperback + Kindle). Give the first five chapters
away on the site as a lead magnet.** Reasons:

- KDP takes the payment, prints, ships and handles refunds. Selling a PDF from
  the site needs PayPal verification, which is fail-closed until
  `PAYPAL_CLIENT_SECRET` is set on Vercel, and a 40 MB download to host.
- A paperback on Amazon is also a credibility asset: "author of" on the
  channel, the /live page, the coaching page.
- The free sample brings in a reader who already cares about the mental side,
  which is exactly who books coaching. They also get the ICT playbook.

Built on the site (19 Sep 2026): `/handbook` landing page (cover, what it is,
sample signup, buy buttons appear once the Amazon links are filled in
`src/lib/handbook.ts`), `/handbook/sample` download page, the sample PDF at
`public/downloads/between-the-stop-and-the-target-sample.pdf` (16 pages,
2.3 MB: cover, title, copyright, How to Use, chapters 1 to 5, end card).

## Before uploading to KDP (your part, about 30 minutes)

1. **Placeholders in the interior**: author name, bio page, ISBN line. KDP
   gives you a free ISBN; paste it into the copyright page and re-export, or
   leave the ISBN line out (KDP prints the barcode on the cover regardless).
2. **Which interior**: upload `interior_grey.pdf` for the paperback. Colour
   interior printing on 287 pages costs roughly $12 to $15 per copy, which
   forces a $30+ price. Greyscale prints for about $4.50, so a $17.99 book
   pays about $6 per copy at 60 percent royalty.
3. **Cover**: `cover.pdf` must be the full wrap (back, spine, front) sized for
   287 pages on white paper. Check it against KDP's cover calculator; the
   spine width changes with page count and paper colour. If it was built as
   front-only, use KDP's Cover Creator with `cover_front.jpg` for now.
4. **Kindle**: upload `handbook.epub`. Kindle Previewer will show the
   illustrations; if any come out tiny, that is the EPUB's image width setting
   and is a five-minute fix.

## Listing copy (paste into KDP)

**Title:** Between the Stop and the Target

**Subtitle:** A Trader's Affirmation Handbook: 137 Short Readings for the
Moments That Test Every Trader

**Author:** Harvest Wright

**Description** (KDP allows basic HTML):

<p><b>For the ten minutes after it happens.</b></p>
<p>Most trading psychology books explain why you feel what you feel. This one is for the moment itself: the morning you wake up to a move you were not in, the exit you took early and then watched run to target, the stop that was hit at the exact turn, the evaluation you failed for the second time.</p>
<p>Between the Stop and the Target holds 137 short readings, one for each of those moments. Every reading says when to open it, what is going on in your head, and the words to hold onto until the feeling passes. Open it to the chapter that matches the moment and read for two minutes.</p>
<p><b>Inside:</b></p>
<ul>
<li>Before the session: pre-open nerves, the morning after a bad day, big news days</li>
<li>During the trade: hesitation, revenge, moving the stop, adding to a loser</li>
<li>After the trade closes: the move that left without you, the win you cannot enjoy</li>
<li>Funded challenges: failing, failing again, breaching on a technicality, the payout that feels unreal</li>
<li>The people around you: partners, friends who think it is gambling, the full-time job</li>
<li>The long road: months of flat results, the urge to quit, the day it starts to work</li>
</ul>
<p>Illustrated throughout. Written by Harvest Wright, a trader and coach with over ten years in the markets who trades NQ live every weekday.</p>
<p>Not financial advice. Steady words for a difficult craft.</p>

**7 keywords:**
1. trading psychology
2. day trading mindset
3. trading affirmations
4. funded trader challenge
5. trading discipline book
6. trader mental game
7. prop firm trading

**Categories** (pick 3):
- Business & Money > Investing > Day Trading
- Business & Money > Investing > Stocks (or Futures if offered)
- Self-Help > Motivational

**Pricing:** paperback $17.99 (greyscale interior), Kindle $9.99 (top of the
70 percent royalty band). Enrol Kindle in KDP Select for the first 90 days:
Kindle Unlimited pages read pay out and the book is unknown, so reach beats
the exclusivity cost.

**Series field:** leave blank.

## After it is live

1. Paste both Amazon links into `src/lib/handbook.ts` (`amazonPaperback`,
   `amazonKindle`) and push. The buy buttons and the Book schema offer appear.
2. Add "Author of Between the Stop and the Target" to the YouTube channel
   description, the /coaching page bio and the stream description.
3. Say it once per stream when a chapter fits the moment ("that's chapter 32
   in the handbook, link in the description").
4. Ask the first ten buyers for an Amazon review by email; reviews are the
   whole game on Amazon.
