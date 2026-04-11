"use client";

import { useState, useEffect } from "react";

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

interface GBPPost {
  date: string;
  type: string;
  summary: string;
  ctaUrl: string;
  posted: boolean;
}

interface GBPData {
  configured: boolean;
  reviews: StoredReview[];
  posts: GBPPost[];
  drafts: DraftReply[];
}

function Stars({ count }: { count: number }) {
  return (
    <span className="text-yellow-400">
      {"★".repeat(count)}
      {"☆".repeat(5 - count)}
    </span>
  );
}

function SetupInstructions() {
  const steps = [
    {
      num: 1,
      title: "Create a Google Business Profile",
      desc: "Go to business.google.com and create your business listing with accurate info (name, address, category, hours).",
    },
    {
      num: 2,
      title: "Verify your business",
      desc: "Video verification is recommended for businesses in Thailand. Follow Google's prompts to complete verification.",
    },
    {
      num: 3,
      title: "Enable Google My Business API",
      desc: "In Google Cloud Console, enable the 'Google My Business API' for your project.",
    },
    {
      num: 4,
      title: "Create OAuth 2.0 credentials",
      desc: "In Google Cloud Console > APIs & Services > Credentials, create OAuth 2.0 Client ID (Web application type).",
    },
    {
      num: 5,
      title: "Generate a refresh token",
      desc: "Use the OAuth Playground (developers.google.com/oauthplayground) with your client ID/secret to get a refresh token.",
    },
    {
      num: 6,
      title: "Add environment variables to Vercel",
      desc: "Set the following env vars: GBP_ACCOUNT_ID, GBP_LOCATION_ID, GBP_REFRESH_TOKEN, GBP_CLIENT_ID, GBP_CLIENT_SECRET, GOOGLE_PLACE_ID",
    },
  ];

  return (
    <div className="max-w-2xl">
      <h1
        className="text-2xl font-bold text-white mb-2"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        Google Business Profile
      </h1>
      <p className="text-white/50 mb-8">
        GBP is not configured yet. Follow these steps to set it up:
      </p>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
        {steps.map((step) => (
          <div key={step.num} className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold text-sm">
              {step.num}
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">{step.title}</h3>
              <p className="text-white/50 text-sm mt-1">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-4">
        <h3 className="text-gold text-sm font-semibold mb-2">
          Required Environment Variables
        </h3>
        <div className="grid grid-cols-1 gap-1">
          {[
            "GBP_ACCOUNT_ID",
            "GBP_LOCATION_ID",
            "GBP_REFRESH_TOKEN",
            "GBP_CLIENT_ID",
            "GBP_CLIENT_SECRET",
            "GOOGLE_PLACE_ID",
          ].map((v) => (
            <code
              key={v}
              className="text-xs text-white/60 bg-white/5 px-2 py-1 rounded"
            >
              {v}
            </code>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GBPPage() {
  const [data, setData] = useState<GBPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editedReplies, setEditedReplies] = useState<Record<string, string>>(
    {}
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/gbp")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDraftAction(
    draftId: string,
    action: "approveDraft" | "rejectDraft"
  ) {
    setActionLoading(draftId);
    try {
      const body: Record<string, string> = { action, id: draftId };
      if (action === "approveDraft" && editedReplies[draftId]) {
        body.editedReply = editedReplies[draftId];
      }
      const res = await fetch("/api/admin/gbp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok && data) {
        setData({
          ...data,
          drafts: data.drafts.filter((d) => d.id !== draftId),
        });
      }
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || !data.configured) {
    return <SetupInstructions />;
  }

  const avgRating =
    data.reviews.length > 0
      ? (
          data.reviews.reduce((s, r) => s + r.rating, 0) / data.reviews.length
        ).toFixed(1)
      : "N/A";
  const needsReply = data.reviews.filter((r) => !r.replied).length;

  return (
    <div>
      <h1
        className="text-2xl font-bold text-white mb-6"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        Google Business Profile
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-xs text-white/40 uppercase tracking-wider">
            Total Reviews
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {data.reviews.length}
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-xs text-white/40 uppercase tracking-wider">
            Avg Rating
          </div>
          <div className="text-2xl font-bold text-gold mt-1">{avgRating}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-xs text-white/40 uppercase tracking-wider">
            Needs Reply
          </div>
          <div className="text-2xl font-bold text-white mt-1">{needsReply}</div>
        </div>
      </div>

      {/* Pending Drafts */}
      {data.drafts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">
            Pending Reply Drafts
          </h2>
          <div className="space-y-4">
            {data.drafts.map((draft) => (
              <div
                key={draft.id}
                className="bg-white/5 border border-orange-500/30 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-white font-medium">
                      {draft.reviewerName}
                    </span>
                    <span className="ml-2">
                      <Stars count={draft.rating} />
                    </span>
                  </div>
                  <span className="text-xs text-white/40">
                    {new Date(draft.createTime).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-white/60 text-sm mb-3 italic">
                  &quot;{draft.comment}&quot;
                </p>
                <textarea
                  className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white text-sm resize-y min-h-[80px] focus:outline-none focus:border-gold/50"
                  defaultValue={draft.draftReply}
                  onChange={(e) =>
                    setEditedReplies((prev) => ({
                      ...prev,
                      [draft.id]: e.target.value,
                    }))
                  }
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleDraftAction(draft.id, "approveDraft")}
                    disabled={actionLoading === draft.id}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {actionLoading === draft.id ? "Sending..." : "Approve & Send"}
                  </button>
                  <button
                    onClick={() => handleDraftAction(draft.id, "rejectDraft")}
                    disabled={actionLoading === draft.id}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white/70 text-sm rounded-lg disabled:opacity-50 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Reviews */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">
          Recent Reviews
        </h2>
        {data.reviews.length === 0 ? (
          <p className="text-white/40 text-sm">No reviews yet.</p>
        ) : (
          <div className="space-y-3">
            {data.reviews
              .sort(
                (a, b) =>
                  new Date(b.createTime).getTime() -
                  new Date(a.createTime).getTime()
              )
              .slice(0, 20)
              .map((review) => (
                <div
                  key={review.reviewId}
                  className="bg-white/5 border border-white/10 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-white font-medium text-sm">
                        {review.name}
                      </span>
                      <span className="ml-2">
                        <Stars count={review.rating} />
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {review.replied ? (
                        <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded">
                          Replied
                        </span>
                      ) : (
                        <span className="text-xs text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded">
                          No reply
                        </span>
                      )}
                      <span className="text-xs text-white/40">
                        {new Date(review.createTime).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-white/50 text-sm mt-1">
                      {review.comment}
                    </p>
                  )}
                  {review.replyText && (
                    <p className="text-white/30 text-xs mt-2 pl-3 border-l-2 border-gold/30">
                      Reply: {review.replyText}
                    </p>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* GBP Post History */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          GBP Post History
        </h2>
        {data.posts.length === 0 ? (
          <p className="text-white/40 text-sm">No posts yet.</p>
        ) : (
          <div className="space-y-2">
            {(data.posts as GBPPost[])
              .sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime()
              )
              .slice(0, 20)
              .map((post, i) => (
                <div
                  key={i}
                  className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-gold uppercase font-semibold mr-2">
                      {post.type}
                    </span>
                    <span className="text-white/60 text-sm truncate">
                      {post.summary}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {post.posted ? (
                      <span className="text-xs text-green-400">Posted</span>
                    ) : (
                      <span className="text-xs text-red-400">Failed</span>
                    )}
                    <span className="text-xs text-white/30">
                      {new Date(post.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
