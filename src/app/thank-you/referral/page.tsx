"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ReferralThankYouPage() {
  return (
    <Suspense fallback={<main><Header /><section className="bg-navy py-32 text-center"><p className="text-white/50">Loading...</p></section><Footer /></main>}>
      <ReferralThankYouContent />
    </Suspense>
  );
}

function ReferralThankYouContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "";
  const referralLink = code ? `https://r2ftrading.com/refer?ref=${code}` : "";
  const [copied, setCopied] = useState(false);
  const [storedCode, setStoredCode] = useState(code);

  useEffect(() => {
    // Fallback: try localStorage if no code in URL
    if (!storedCode && typeof window !== "undefined") {
      const saved = localStorage.getItem("r2f_referral_code");
      if (saved) setStoredCode(saved);
    }
  }, [storedCode]);

  const link = storedCode ? `https://r2ftrading.com/refer?ref=${storedCode}` : referralLink;

  function handleCopy() {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <main>
      <Header />

      {/* Hero */}
      <section className="bg-navy py-16 md:py-20 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <div className="w-16 h-16 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">&#10003;</span>
          </div>
          <h1
            className="text-3xl md:text-4xl font-black text-white mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Thanks for Joining R2F Trading!
          </h1>
          <p className="text-white/60 text-lg mb-2">
            Your <span className="text-gold font-semibold">Advanced ICT Playbook</span> is on its way to your inbox.
          </p>
          <p className="text-white/40 text-sm">
            Plus your free ICT Trading Checklist — check your email!
          </p>
        </div>
      </section>

      {/* Referral Share Section */}
      {link && (
        <section className="bg-[#0a1628] py-12">
          <div className="max-w-3xl mx-auto px-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
              <h2
                className="text-xl font-bold text-white mb-2"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Now It&apos;s Your Turn to Share!
              </h2>
              <p className="text-white/50 text-sm mb-6">
                Share R2F Trading with your friends. When they sign up, you <strong className="text-white">both</strong> get bonus content.
              </p>

              {/* Referral Link Box */}
              <div className="bg-white/10 border border-gold/30 rounded-lg p-4 mb-6">
                <p className="text-gold text-xs font-bold uppercase tracking-wider mb-2">Your Referral Link</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={link}
                    className="flex-1 bg-transparent text-white text-sm border-none outline-none text-center"
                  />
                  <button
                    onClick={handleCopy}
                    className="bg-gold hover:bg-gold-light text-navy font-bold px-4 py-2 rounded-md text-xs uppercase tracking-wide transition-all whitespace-nowrap"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Share Buttons */}
              <div className="flex flex-wrap justify-center gap-3 mb-6">
                <a
                  href={`https://twitter.com/intent/tweet?text=I%20just%20joined%20R2F%20Trading%20for%20ICT%20coaching%20%E2%80%94%20sign%20up%20and%20we%20both%20get%20a%20free%20Advanced%20ICT%20Playbook!&url=${encodeURIComponent(link)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-4 py-2.5 rounded-md transition-all"
                >
                  Share on X
                </a>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Check out R2F Trading — sign up and we both get a free Advanced ICT Playbook! ${link}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-4 py-2.5 rounded-md transition-all"
                >
                  Share on WhatsApp
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Check out R2F Trading — sign up and we both get a free Advanced ICT Playbook!")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-4 py-2.5 rounded-md transition-all"
                >
                  Share on Telegram
                </a>
              </div>

              {/* Milestone */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <p className="text-gold text-xs font-bold uppercase tracking-wider mb-1">Unlock More Bonuses</p>
                <p className="text-white/60 text-sm">
                  Share with <strong className="text-white">3 friends</strong> to unlock our{" "}
                  <span className="text-gold font-semibold">Premium Trading Journal Template</span>
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* What to Expect */}
      <section className="bg-navy py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-xl font-bold text-white text-center mb-8"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            What You&apos;ll Get Over The Next 2 Weeks
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                day: "Today",
                title: "ICT Playbook + Checklist",
                desc: "Your bonus PDF and trading checklist — check your inbox now.",
              },
              {
                day: "Day 2",
                title: "3 Beginner Mistakes",
                desc: "The costly errors every ICT trader makes — and how to avoid them.",
              },
              {
                day: "Day 5",
                title: "ICT Concepts Deep Dive",
                desc: "How smart money concepts changed everything for our students.",
              },
            ].map((item) => (
              <div
                key={item.day}
                className="bg-white/5 border border-white/10 rounded-lg p-5 text-center"
              >
                <span className="text-gold text-xs font-bold uppercase tracking-wider">
                  {item.day}
                </span>
                <h3 className="text-white font-bold mt-2 mb-1">{item.title}</h3>
                <p className="text-white/50 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="bg-[#0a1628] py-10">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-white/50 text-sm mb-1">
            Join <span className="text-gold font-bold">50+ traders</span> already leveling up with R2F Trading
          </p>
          <div className="flex justify-center gap-1 mt-3">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-gold text-lg">&#9733;</span>
            ))}
          </div>
          <p className="text-white/30 text-xs mt-2">
            &quot;Best coaching investment I&apos;ve made. Funded in 47 days.&quot;
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
