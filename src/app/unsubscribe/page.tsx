"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function UnsubscribePage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleUnsubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main>
      <Header />
      <section className="py-20 md:py-32 bg-white">
        <div className="max-w-lg mx-auto px-6 text-center">
          {status === "success" ? (
            <>
              <h1
                className="text-3xl font-bold text-navy mb-4"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                You&apos;ve Been Unsubscribed
              </h1>
              <p className="text-gray-500 mb-6">
                We&apos;ve removed your email from our mailing list. You won&apos;t receive any more emails from us.
              </p>
              <p className="text-gray-400 text-sm">
                Changed your mind? You can always re-subscribe at{" "}
                <a href="/free-class" className="text-gold hover:underline">r2ftrading.com/free-class</a>
              </p>
            </>
          ) : (
            <>
              <h1
                className="text-3xl font-bold text-navy mb-4"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Unsubscribe
              </h1>
              <p className="text-gray-500 mb-8">
                Enter your email below to unsubscribe from R2F Trading emails.
              </p>
              <form onSubmit={handleUnsubscribe} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="w-full px-4 py-3 rounded-md border border-gray-200 text-gray-800 text-sm focus:outline-none focus:border-gold"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full bg-navy hover:bg-navy-light text-white font-bold py-3 rounded-md transition-all text-sm disabled:opacity-50"
                >
                  {status === "loading" ? "Processing..." : "Unsubscribe"}
                </button>
                {status === "error" && (
                  <p className="text-red-500 text-xs">Something went wrong. Please try again or email road2funded@gmail.com</p>
                )}
              </form>
            </>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
