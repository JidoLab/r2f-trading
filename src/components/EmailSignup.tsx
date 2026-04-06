"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/tracking";

export default function EmailSignup({ variant = "inline" }: { variant?: "inline" | "sidebar" | "popup" }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        // Save email for lead scoring tracking
        localStorage.setItem("r2f_subscriber_email", email);
        trackEvent("email_signup", { method: variant });
        setStatus("success");
        setEmail("");
        // Redirect to thank-you page with Calendly
        router.push("/thank-you");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className={`text-center ${variant === "popup" ? "py-4" : "py-6"}`}>
        <p className="text-green-500 font-bold text-lg mb-1">You&rsquo;re in!</p>
        <p className="text-gray-500 text-sm">Redirecting...</p>
      </div>
    );
  }

  if (variant === "popup") {
    return (
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          className="w-full px-4 py-3 rounded-md border border-gray-300 text-gray-800 focus:outline-none focus:border-gold text-sm"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full bg-gold hover:bg-gold-light text-navy font-bold py-3 rounded-md transition-all uppercase text-sm tracking-wide disabled:opacity-50"
        >
          {status === "loading" ? "Sending..." : "Get Free Checklist"}
        </button>
        {status === "error" && <p className="text-red-500 text-xs text-center">Something went wrong. Try again.</p>}
      </form>
    );
  }

  if (variant === "sidebar") {
    return (
      <div className="bg-cream rounded-lg p-6 mt-8">
        <p className="text-navy font-bold text-base mb-1" style={{ fontFamily: "var(--font-serif)" }}>
          Free ICT Trading Checklist
        </p>
        <p className="text-gray-500 text-sm mb-4">
          The exact checklist I use before every trade. Get it free.
        </p>
        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            required
            className="w-full px-3 py-2.5 rounded-md border border-gray-200 text-gray-800 text-sm focus:outline-none focus:border-gold"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full bg-gold hover:bg-gold-light text-navy font-bold py-2.5 rounded-md transition-all uppercase text-xs tracking-wide disabled:opacity-50"
          >
            {status === "loading" ? "Sending..." : "Download Free Checklist"}
          </button>
          {status === "error" && <p className="text-red-500 text-xs">Something went wrong. Try again.</p>}
        </form>
      </div>
    );
  }

  // inline variant (default)
  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
        className="flex-1 px-4 py-3 rounded-md border border-gray-200 text-gray-800 text-sm focus:outline-none focus:border-gold"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="bg-gold hover:bg-gold-light text-navy font-bold px-6 py-3 rounded-md transition-all uppercase text-sm tracking-wide whitespace-nowrap disabled:opacity-50"
      >
        {status === "loading" ? "Sending..." : "Get Free Checklist"}
      </button>
      {status === "error" && <p className="text-red-500 text-xs self-center">Try again.</p>}
    </form>
  );
}
