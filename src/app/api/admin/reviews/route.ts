import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile, commitFile } from "@/lib/github";
import { postToAll } from "@/lib/social";
import { sendTelegramReport } from "@/lib/telegram-report";

export const dynamic = "force-dynamic";

interface Review {
  id: string;
  name: string;
  quote: string;
  category: string;
  rating: number;
  date: string;
  status: "pending" | "approved" | "rejected";
}

async function getPending(): Promise<Review[]> {
  try {
    const raw = await readFile("data/reviews-pending.json");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function getApproved(): Promise<Review[]> {
  try {
    const raw = await readFile("data/reviews-approved.json");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pending = await getPending();
  const approved = await getApproved();

  return NextResponse.json({ pending, approved });
}

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { action, id } = await req.json();

    if (!action || !id) {
      return NextResponse.json({ error: "action and id are required" }, { status: 400 });
    }

    const pending = await getPending();
    const reviewIndex = pending.findIndex((r) => r.id === id);

    if (reviewIndex === -1) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const review = pending[reviewIndex];

    if (action === "approve") {
      // Remove from pending
      pending.splice(reviewIndex, 1);

      // Add to approved
      const approved = await getApproved();
      review.status = "approved";
      approved.push(review);

      // Save both files
      await commitFile(
        "data/reviews-pending.json",
        JSON.stringify(pending, null, 2),
        `Approved testimonial from ${review.name}`
      );
      await commitFile(
        "data/reviews-approved.json",
        JSON.stringify(approved, null, 2),
        `Approved testimonial from ${review.name}`
      );

      // Quality gate: auto-post to socials if meets criteria
      const passesQualityGate =
        review.rating >= 4 &&
        review.quote.length >= 20 &&
        !review.quote.match(/https?:\/\//) &&
        !review.quote.toLowerCase().includes("test");

      if (passesQualityGate) {
        const quoteCardUrl = `/quote-card/${review.id}?name=${encodeURIComponent(review.name)}&quote=${encodeURIComponent(review.quote.slice(0, 200))}&rating=${review.rating}`;
        postToAll({
          title: review.quote.slice(0, 80),
          excerpt: `"${review.quote}" — ${review.name} ${"⭐".repeat(review.rating)}`,
          slug: `testimonial-${review.id}`,
          coverImage: quoteCardUrl,
          tags: ["testimonial", "student-results", review.category],
        }).catch(() => {});
      }

      // If review has photoUrl, add to image library
      if ((review as unknown as Record<string, unknown>).photoUrl) {
        try {
          let imageLibrary: Record<string, unknown>[] = [];
          try {
            const raw = await readFile("data/image-library-full.json");
            imageLibrary = JSON.parse(raw);
          } catch {
            /* file may not exist */
          }

          imageLibrary.push({
            id: `img-review-${review.id}`,
            src: (review as unknown as Record<string, unknown>).photoUrl,
            tags: ["student-result", "testimonial", review.category],
            category: "result",
            description: `${review.name} trading result`,
            addedAt: new Date().toISOString(),
          });

          await commitFile(
            "data/image-library-full.json",
            JSON.stringify(imageLibrary, null, 2),
            `Added review image from ${review.name}`
          );
        } catch {
          /* image library update is best-effort */
        }
      }

      // Send Telegram notification
      sendTelegramReport("✅ Review approved and shared to socials!").catch(() => {});

      return NextResponse.json({ success: true, action: "approved", review });
    }

    if (action === "reject") {
      // Remove from pending
      pending.splice(reviewIndex, 1);

      await commitFile(
        "data/reviews-pending.json",
        JSON.stringify(pending, null, 2),
        `Rejected testimonial from ${review.name}`
      );

      return NextResponse.json({ success: true, action: "rejected" });
    }

    return NextResponse.json({ error: "Invalid action. Use 'approve' or 'reject'." }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to process review";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
