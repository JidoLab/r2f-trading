import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import { sendEmail } from "@/lib/resend";
import { sendTelegramReport } from "@/lib/telegram-report";

export const dynamic = "force-dynamic";

interface PendingReview {
  id: string;
  name: string;
  quote: string;
  category: string;
  rating: number;
  date: string;
  status: "pending" | "approved" | "rejected";
  photoUrl?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, quote, category, rating, photoBase64, photoFilename } = body;

    // Validate
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!quote || typeof quote !== "string" || quote.trim().length < 10) {
      return NextResponse.json({ error: "Testimonial must be at least 10 characters" }, { status: 400 });
    }
    if (!category || typeof category !== "string") {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }
    const validCategories = ["consistency", "psychology", "risk-management", "funded-account", "overall"];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    const ratingNum = Number(rating) || 5;
    if (ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
    }

    // Load existing pending reviews
    let pending: PendingReview[] = [];
    try {
      const raw = await readFile("data/reviews-pending.json");
      pending = JSON.parse(raw);
    } catch {
      // File doesn't exist yet
    }

    // Create new review
    const review: PendingReview = {
      id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      quote: quote.trim(),
      category,
      rating: ratingNum,
      date: new Date().toISOString(),
      status: "pending",
    };

    // Upload photo if provided
    if (photoBase64 && photoFilename) {
      try {
        const ext = photoFilename.split(".").pop() || "jpg";
        const photoPath = `public/review-photos/${review.id}.${ext}`;
        await commitFile(photoPath, photoBase64, `Review photo: ${review.name}`, true);
        review.photoUrl = `/review-photos/${review.id}.${ext}`;
      } catch {}
    }

    pending.push(review);

    // Save to GitHub
    await commitFile(
      "data/reviews-pending.json",
      JSON.stringify(pending, null, 2),
      `New testimonial from ${review.name}`
    );

    // Send notification email to owner
    try {
      await sendEmail(
        "road2funded@gmail.com",
        `New testimonial from ${review.name}`,
        `<div style="font-family:Arial,sans-serif;max-width:500px;">
          <h2 style="color:#0d2137;">New Testimonial Submitted</h2>
          <p><strong>From:</strong> ${review.name}</p>
          <p><strong>Category:</strong> ${review.category}</p>
          <p><strong>Rating:</strong> ${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</p>
          <blockquote style="border-left:4px solid #c9a84c;padding:12px 20px;margin:16px 0;background:#f5f0e8;border-radius:4px;">
            <p style="color:#0d2137;font-style:italic;margin:0;">"${review.quote}"</p>
          </blockquote>
          <p><a href="https://r2ftrading.com/admin/reviews" style="color:#c9a84c;font-weight:bold;">Review & Approve →</a></p>
        </div>`
      );
    } catch {
      // Non-critical — don't fail the submission
    }

    // Send Telegram notification
    try {
      await sendTelegramReport(
        `⭐ *New Testimonial*\n\nFrom: ${review.name}\nCategory: ${review.category}\nRating: ${"★".repeat(review.rating)}\n\n"${review.quote.slice(0, 200)}${review.quote.length > 200 ? "..." : ""}"\n\n[Review in Admin](https://r2ftrading.com/admin/reviews)`
      );
    } catch {
      // Non-critical
    }

    return NextResponse.json({ success: true, id: review.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Submission failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
