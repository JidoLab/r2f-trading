import { NextRequest, NextResponse } from "next/server";
import {
  isGBPConfigured,
  getGBPReviews,
  replyToGBPReview,
  starRatingToNumber,
  GoogleReview,
} from "@/lib/gbp";
import { readFile, commitFile } from "@/lib/github";
import { sendTelegramReport } from "@/lib/telegram-report";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 120;

interface StoredReview {
  reviewId: string;
  name: string;
  rating: number;
  comment: string;
  createTime: string;
  replied: boolean;
  replyText?: string;
}

interface DraftReply {
  id: string;
  reviewId: string;
  reviewName: string;
  reviewerName: string;
  rating: number;
  comment: string;
  draftReply: string;
  createTime: string;
  savedAt: string;
}

async function generateReply(
  review: GoogleReview,
  tone: "warm" | "careful"
): Promise<string> {
  const anthropic = new Anthropic();
  const prompt =
    tone === "warm"
      ? `Write a warm, grateful reply to this Google review. Thank the reviewer by name, reference something specific they said, use an encouraging educator tone. No dashes or bullet points. Keep it 2-3 sentences. Reviewer: ${review.reviewer.displayName}. Review: "${review.comment}"`
      : `Write a professional, empathetic reply to this negative Google review. Acknowledge their experience, express genuine desire to help, offer to connect directly. No dashes or bullet points. Keep it 2-3 sentences. Reviewer: ${review.reviewer.displayName}. Review: "${review.comment}"`;

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = msg.content.find((b) => b.type === "text");
  return (
    textBlock?.text ||
    "Thank you for your feedback! We appreciate you taking the time to share your experience."
  );
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGBPConfigured()) {
    return NextResponse.json({ skipped: true });
  }

  try {
    const reviews = await getGBPReviews();

    // Load existing review log
    let existingReviews: StoredReview[] = [];
    try {
      const raw = await readFile("data/google-reviews.json");
      existingReviews = JSON.parse(raw);
    } catch {
      /* file may not exist */
    }

    // Load existing drafts
    let drafts: DraftReply[] = [];
    try {
      const raw = await readFile("data/gbp-review-drafts.json");
      drafts = JSON.parse(raw);
    } catch {
      /* file may not exist */
    }

    const existingIds = new Set(existingReviews.map((r) => r.reviewId));
    let newCount = 0;
    let repliedCount = 0;
    let draftCount = 0;

    for (const review of reviews) {
      if (existingIds.has(review.reviewId)) continue;

      newCount++;
      const rating = starRatingToNumber(review.starRating);
      const displayName = review.reviewer.displayName || "Anonymous";
      const commentExcerpt = (review.comment || "").slice(0, 80);

      // Save to google-reviews.json
      const stored: StoredReview = {
        reviewId: review.reviewId,
        name: displayName,
        rating,
        comment: review.comment || "",
        createTime: review.createTime,
        replied: false,
      };

      // Send Telegram alert
      await sendTelegramReport(
        `⭐ New Google Review from ${displayName}: "${commentExcerpt}${
          (review.comment || "").length > 80 ? "..." : ""
        }" (${rating}/5)`
      );

      if (rating >= 4) {
        // Auto-reply to positive reviews
        const reply = await generateReply(review, "warm");
        const success = await replyToGBPReview(review.name, reply);
        stored.replied = success;
        stored.replyText = reply;
        if (success) repliedCount++;
      } else {
        // Draft reply for negative reviews (don't auto-send)
        const draftReply = await generateReply(review, "careful");
        drafts.push({
          id: `draft-${review.reviewId}`,
          reviewId: review.reviewId,
          reviewName: review.name,
          reviewerName: displayName,
          rating,
          comment: review.comment || "",
          draftReply,
          createTime: review.createTime,
          savedAt: new Date().toISOString(),
        });
        draftCount++;

        await sendTelegramReport(
          `⚠️ Negative review needs attention from ${displayName} (${rating}/5): "${commentExcerpt}"`
        );
      }

      existingReviews.push(stored);
    }

    // Save updated files
    if (newCount > 0) {
      await commitFile(
        "data/google-reviews.json",
        JSON.stringify(existingReviews, null, 2),
        `Google reviews update: ${newCount} new`
      );
    }

    if (draftCount > 0) {
      await commitFile(
        "data/gbp-review-drafts.json",
        JSON.stringify(drafts, null, 2),
        `GBP review drafts: ${draftCount} new`
      );
    }

    return NextResponse.json({
      newReviews: newCount,
      replied: repliedCount,
      drafts: draftCount,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GBP reviews check failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
