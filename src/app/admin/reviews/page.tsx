"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Review {
  id: string;
  name: string;
  quote: string;
  category: string;
  rating: number;
  date: string;
  status: "pending" | "approved" | "rejected";
}

const CATEGORY_LABELS: Record<string, string> = {
  consistency: "Consistency",
  psychology: "Trading Psychology",
  "risk-management": "Risk Management",
  "funded-account": "Funded Account",
  overall: "Overall Improvement",
};

export default function AdminReviewsPage() {
  const [pending, setPending] = useState<Review[]>([]);
  const [approved, setApproved] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  async function fetchReviews() {
    try {
      const res = await fetch("/api/admin/reviews");
      if (!res.ok) return;
      const data = await res.json();
      setPending(data.pending || []);
      setApproved(data.approved || []);
    } catch {
      // Failed to load
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: string, action: "approve" | "reject") {
    setActing(id);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id }),
      });
      if (res.ok) {
        await fetchReviews();
      }
    } catch {
      // Failed
    } finally {
      setActing(null);
    }
  }

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleDateString("en-GB", {
        timeZone: "Asia/Bangkok",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  function Stars({ count }: { count: number }) {
    return (
      <span className="text-gold text-sm">
        {"★".repeat(count)}
        {"☆".repeat(5 - count)}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Reviews & Testimonials</h1>
          <p className="text-white/50 text-sm">
            {pending.length} pending &middot; {approved.length} approved
          </p>
        </div>
        <Link
          href="/admin"
          className="text-white/40 hover:text-white text-sm transition-colors"
        >
          &larr; Dashboard
        </Link>
      </div>

      {/* Pending Reviews */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">
          Pending Reviews
          {pending.length > 0 && (
            <span className="ml-2 bg-gold/20 text-gold text-xs font-bold px-2 py-0.5 rounded-full">
              {pending.length}
            </span>
          )}
        </h2>

        {pending.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
            <p className="text-white/40 text-sm">No pending reviews.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((review) => (
              <div
                key={review.id}
                className="bg-white/5 border border-white/10 rounded-lg p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-white font-semibold">{review.name}</span>
                      <Stars count={review.rating} />
                      <span className="text-white/30 text-xs">
                        {formatDate(review.date)}
                      </span>
                    </div>
                    <span className="inline-block bg-gold/10 text-gold text-xs font-bold px-2 py-0.5 rounded-full mb-3">
                      {CATEGORY_LABELS[review.category] || review.category}
                    </span>
                    <p className="text-white/70 text-sm leading-relaxed">
                      &ldquo;{review.quote}&rdquo;
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleAction(review.id, "approve")}
                      disabled={acting === review.id}
                      className="bg-green-600/20 text-green-400 hover:bg-green-600/30 px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {acting === review.id ? "..." : "Approve"}
                    </button>
                    <button
                      onClick={() => handleAction(review.id, "reject")}
                      disabled={acting === review.id}
                      className="bg-red-600/20 text-red-400 hover:bg-red-600/30 px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved Reviews */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Approved Reviews</h2>

        {approved.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
            <p className="text-white/40 text-sm">No approved reviews yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {approved.map((review) => (
              <div
                key={review.id}
                className="bg-white/5 border border-white/10 rounded-lg p-5"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-white font-semibold text-sm">{review.name}</span>
                  <Stars count={review.rating} />
                  <span className="bg-green-500/10 text-green-400 text-xs font-bold px-2 py-0.5 rounded-full">
                    Approved
                  </span>
                  <span className="text-white/30 text-xs ml-auto">
                    {formatDate(review.date)}
                  </span>
                </div>
                <span className="inline-block bg-gold/10 text-gold text-xs px-2 py-0.5 rounded-full mb-2">
                  {CATEGORY_LABELS[review.category] || review.category}
                </span>
                <p className="text-white/60 text-sm leading-relaxed">
                  &ldquo;{review.quote}&rdquo;
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
