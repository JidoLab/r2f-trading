import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { isGBPConfigured, replyToGBPReview } from "@/lib/gbp";
import { readFile, commitFile } from "@/lib/github";

export const dynamic = "force-dynamic";

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

async function loadJSON<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path);
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const configured = isGBPConfigured();
  const reviews = await loadJSON<StoredReview[]>("data/google-reviews.json", []);
  const posts = await loadJSON<Record<string, unknown>[]>("data/gbp-log.json", []);
  const drafts = await loadJSON<DraftReply[]>("data/gbp-review-drafts.json", []);

  return NextResponse.json({ configured, reviews, posts, drafts });
}

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { action, id, editedReply } = await req.json();

    if (!action || !id) {
      return NextResponse.json(
        { error: "action and id are required" },
        { status: 400 }
      );
    }

    const drafts = await loadJSON<DraftReply[]>(
      "data/gbp-review-drafts.json",
      []
    );
    const draftIndex = drafts.findIndex((d) => d.id === id);

    if (draftIndex === -1) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const draft = drafts[draftIndex];

    if (action === "approveDraft") {
      const replyText = editedReply || draft.draftReply;

      // Send reply to Google
      await replyToGBPReview(draft.reviewName, replyText);

      // Move to google-reviews.json
      const reviews = await loadJSON<StoredReview[]>(
        "data/google-reviews.json",
        []
      );
      const existingIndex = reviews.findIndex(
        (r) => r.reviewId === draft.reviewId
      );
      if (existingIndex >= 0) {
        reviews[existingIndex].replied = true;
        reviews[existingIndex].replyText = replyText;
      } else {
        reviews.push({
          reviewId: draft.reviewId,
          name: draft.reviewerName,
          rating: draft.rating,
          comment: draft.comment,
          createTime: draft.createTime,
          replied: true,
          replyText,
        });
      }

      // Remove from drafts
      drafts.splice(draftIndex, 1);

      await commitFile(
        "data/google-reviews.json",
        JSON.stringify(reviews, null, 2),
        `Approved GBP review reply for ${draft.reviewerName}`
      );
      await commitFile(
        "data/gbp-review-drafts.json",
        JSON.stringify(drafts, null, 2),
        `Removed draft for ${draft.reviewerName}`
      );

      return NextResponse.json({ success: true, action: "approved" });
    }

    if (action === "rejectDraft") {
      drafts.splice(draftIndex, 1);
      await commitFile(
        "data/gbp-review-drafts.json",
        JSON.stringify(drafts, null, 2),
        `Rejected draft for ${draft.reviewerName}`
      );
      return NextResponse.json({ success: true, action: "rejected" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to process";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
