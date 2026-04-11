"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const CATEGORIES = [
  { value: "consistency", label: "Consistency" },
  { value: "psychology", label: "Trading Psychology" },
  { value: "risk-management", label: "Risk Management" },
  { value: "funded-account", label: "Funded Account" },
  { value: "overall", label: "Overall Improvement" },
];

export default function ReviewPage() {
  const [name, setName] = useState("");
  const [quote, setQuote] = useState("");
  const [category, setCategory] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !quote.trim() || !category) {
      setError("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      let photoBase64 = "";
      let photoFilename = "";
      if (photoFile) {
        const reader = new FileReader();
        const b64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.readAsDataURL(photoFile);
        });
        photoBase64 = b64;
        photoFilename = photoFile.name;
      }

      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), quote: quote.trim(), category, rating, photoBase64, photoFilename }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main>
        <Header />
        <section className="bg-navy py-24 md:py-32 text-center min-h-[60vh] flex items-center">
          <div className="max-w-xl mx-auto px-6">
            <div className="w-16 h-16 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1
              className="text-3xl md:text-4xl font-black text-white mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Thank You<span className="text-gold">!</span>
            </h1>
            <p className="text-white/60 text-lg mb-2">
              Your testimonial has been received. It means a lot to hear how your trading has progressed.
            </p>
            <p className="text-white/40 text-sm">
              Once reviewed, your testimonial may be featured on our results page.
            </p>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main>
      <Header />

      {/* Hero */}
      <section className="bg-navy py-16 md:py-20 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h1
            className="text-3xl md:text-4xl font-black text-white mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Share Your <span className="text-gold">Experience</span>
          </h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto">
            Your journey matters. Tell us how R2F Trading coaching has impacted your trading &mdash; it only takes 30 seconds.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="bg-[#0a1628] py-12 md:py-16">
        <div className="max-w-lg mx-auto px-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-white/80 text-sm font-semibold mb-2">
                Name or Initials <span className="text-gold">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. T.W. or Thomas"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-colors"
                maxLength={50}
              />
            </div>

            {/* Quote */}
            <div>
              <label className="block text-white/80 text-sm font-semibold mb-2">
                Your Testimonial <span className="text-gold">*</span>
              </label>
              <textarea
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                placeholder="How has R2F Trading coaching helped your trading?"
                rows={5}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-colors resize-none"
                maxLength={1000}
              />
              <p className="text-white/30 text-xs mt-1 text-right">{quote.length}/1000</p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-white/80 text-sm font-semibold mb-2">
                What Improved Most <span className="text-gold">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-colors appearance-none"
              >
                <option value="" className="bg-navy">Select an area...</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value} className="bg-navy">
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-white/80 text-sm font-semibold mb-2">
                Rating
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <svg
                      className={`w-8 h-8 transition-colors ${
                        star <= (hoverRating || rating) ? "text-gold" : "text-white/20"
                      }`}
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-white/80 text-sm font-semibold mb-2">
                Photo <span className="text-white/40 font-normal">(optional)</span>
              </label>
              <p className="text-white/30 text-xs mb-3">
                Share a screenshot of your trading results, funded account, or achievements.
              </p>
              {photoPreview ? (
                <div className="relative inline-block">
                  <img src={photoPreview} alt="Preview" className="max-h-40 rounded-lg border border-white/10" />
                  <button
                    type="button"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(""); }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs font-bold hover:bg-red-400"
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <label className="block cursor-pointer bg-white/5 border border-dashed border-white/20 rounded-lg p-6 text-center hover:border-gold/30 transition-colors">
                  <span className="text-white/40 text-sm">Click to upload an image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setPhotoFile(file);
                      const reader = new FileReader();
                      reader.onload = () => setPhotoPreview(reader.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gold text-navy font-bold py-3.5 rounded-lg text-sm uppercase tracking-wider hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit Testimonial"}
            </button>

            <p className="text-white/30 text-xs text-center">
              Your testimonial will be reviewed before being published. We may use your initials and feedback on our website.
            </p>
          </form>
        </div>
      </section>

      <Footer />
    </main>
  );
}
