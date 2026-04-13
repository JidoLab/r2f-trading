"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTracker from "@/components/PageTracker";
import Script from "next/script";

const DAYS = [
  {
    day: 1,
    title: "The ICT Foundation",
    topics: "Order blocks, fair value gaps, liquidity pools",
    icon: "\u{1F4CA}",
  },
  {
    day: 2,
    title: "Market Structure Decoded",
    topics: "BOS, CHOCH, displacement",
    icon: "\u{1F4C8}",
  },
  {
    day: 3,
    title: "Killzone Mastery",
    topics: "Session timing, optimal entries",
    icon: "\u23F0",
  },
  {
    day: 4,
    title: "Risk Management That Actually Works",
    topics: "Position sizing, drawdown rules",
    icon: "\u{1F6E1}\uFE0F",
  },
  {
    day: 5,
    title: "The Funded Account Blueprint",
    topics: "Prop firm strategy + challenge tips",
    icon: "\u{1F3AF}",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: "5-Day ICT Trading Crash Course",
  description:
    "A free 5-day email course covering ICT trading fundamentals: order blocks, FVGs, market structure, killzones, risk management, and the funded account blueprint.",
  provider: {
    "@type": "Organization",
    name: "R2F Trading",
    url: "https://r2ftrading.com",
  },
  isAccessibleForFree: true,
  courseMode: "online",
  numberOfCredits: 0,
  hasCourseInstance: {
    "@type": "CourseInstance",
    courseMode: "online",
    courseWorkload: "PT30M",
  },
  instructor: {
    "@type": "Person",
    name: "Harvest Wright",
  },
};

export default function CrashCoursePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/crash-course/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      if (res.ok) {
        setStatus("success");
        router.push("/thank-you?source=crash-course");
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Something went wrong");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <main>
      <Script
        id="json-ld-crash-course"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <PageTracker event="crash_course_page_view" />

      {/* Hero */}
      <section className="bg-navy py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="inline-block bg-gold/20 text-gold text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full mb-6">
            Free 5-Day Email Course
          </span>
          <h1
            className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Free 5-Day ICT Trading{" "}
            <span className="text-gold">Crash Course</span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-10">
            Learn the exact ICT framework that helped our students get funded
            in under 60 days. One lesson a day, straight to your inbox.
          </p>

          {/* Signup Form */}
          <div className="max-w-md mx-auto bg-white/5 border border-white/10 rounded-xl p-6">
            {status === "success" ? (
              <div className="text-center py-4">
                <p className="text-gold font-bold text-lg mb-2">
                  You&apos;re in! Check your inbox.
                </p>
                <p className="text-white/50 text-sm">
                  Day 1 is on its way. See you there.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="text"
                  placeholder="Your first name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-gold"
                />
                <input
                  type="email"
                  placeholder="Your best email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-gold"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full bg-gold text-navy font-bold text-sm uppercase tracking-wider py-3 rounded-lg hover:bg-gold-light transition-colors disabled:opacity-50"
                >
                  {status === "loading" ? "Enrolling..." : "Start the Free Course"}
                </button>
                {errorMsg && (
                  <p className="text-red-400 text-xs text-center">{errorMsg}</p>
                )}
              </form>
            )}
            <p className="text-white/30 text-xs mt-3 text-center">
              No spam. Unsubscribe anytime. Your email is safe with us.
            </p>
          </div>
        </div>
      </section>

      {/* What You'll Learn */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-2xl md:text-3xl font-black text-navy text-center mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            What You&apos;ll Learn in 5 Days
          </h2>
          <p className="text-center text-gray-500 mb-12 max-w-xl mx-auto">
            Each day, you&apos;ll receive a focused lesson with actionable tips
            you can apply to your charts immediately.
          </p>
          <div className="space-y-4">
            {DAYS.map((d) => (
              <div
                key={d.day}
                className="flex items-start gap-4 p-5 rounded-xl border border-gray-100 hover:border-gold/30 transition-colors"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-navy rounded-lg flex items-center justify-center">
                  <span className="text-xl">{d.icon}</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-gold uppercase tracking-wider mb-1">
                    Day {d.day}
                  </p>
                  <h3 className="text-navy font-bold text-lg mb-1">
                    {d.title}
                  </h3>
                  <p className="text-gray-500 text-sm">{d.topics}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 md:py-20 bg-cream">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm font-bold text-navy/60 uppercase tracking-wider mb-8">
            Join 50+ traders who completed this course
          </p>
          <blockquote className="max-w-2xl mx-auto">
            <p className="text-xl md:text-2xl text-navy font-medium italic leading-relaxed mb-4">
              &ldquo;I&apos;ve watched hundreds of hours of ICT content on
              YouTube. This 5-day course organized everything in my head better
              than all of it combined. Got funded 6 weeks later.&rdquo;
            </p>
            <cite className="text-gold font-bold text-sm not-italic">
              &mdash; A.S., FTMO Funded Trader
            </cite>
          </blockquote>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 md:py-20 bg-navy">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2
            className="text-2xl md:text-3xl font-black text-white mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Start Learning <span className="text-gold">Today</span>
          </h2>
          <p className="text-white/50 mb-8">
            Day 1 arrives in your inbox within minutes of signing up. No
            credit card. No fluff. Just actionable ICT knowledge.
          </p>
          <div className="max-w-sm mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="email"
                placeholder="Your email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-gold"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="bg-gold text-navy font-bold text-sm uppercase tracking-wider px-6 py-3 rounded-lg hover:bg-gold-light transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                Enroll Free
              </button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
