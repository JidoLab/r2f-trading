"use client";

import { useEffect, useState, useCallback } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

interface Lesson {
  title: string;
  content: string;
  keyTakeaway: string;
}

interface Module {
  title: string;
  lessons: Lesson[];
}

export default function StarterKitAccessPage() {
  const [verified, setVerified] = useState<boolean | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [openModule, setOpenModule] = useState<number | null>(0);
  const [openLesson, setOpenLesson] = useState<string | null>(null);

  const verify = useCallback(async () => {
    // Check for token in URL query param (from email link) or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get("token");
    const token = urlToken || localStorage.getItem("starterKitToken");

    if (urlToken) {
      // Save to localStorage for future visits
      localStorage.setItem("starterKitToken", urlToken);
      // Clean the URL
      window.history.replaceState({}, "", "/starter-kit/access");
    }

    if (!token) {
      setVerified(false);
      return;
    }

    try {
      const res = await fetch("/api/starter-kit/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.valid) {
        setVerified(true);
        // Fetch content
        const contentRes = await fetch("/api/starter-kit/content", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (contentRes.ok) {
          const contentData = await contentRes.json();
          setModules(contentData.modules || []);
        }
      } else {
        setVerified(false);
      }
    } catch {
      setVerified(false);
    }
  }, []);

  useEffect(() => {
    verify();
  }, [verify]);

  // Loading state
  if (verified === null) {
    return (
      <main>
        <Header />
        <section className="py-24 bg-cream min-h-screen">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <div className="text-navy/40 text-lg">Verifying access...</div>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  // Not purchased
  if (!verified) {
    return (
      <main>
        <Header />
        <section className="py-24 bg-cream min-h-screen">
          <div className="max-w-lg mx-auto px-6 text-center">
            <div className="bg-white rounded-lg p-10 shadow-sm border border-gray-100">
              <div className="text-4xl mb-4">🔒</div>
              <h1
                className="text-2xl font-bold text-navy mb-3"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Purchase Required
              </h1>
              <p className="text-gray-500 text-sm mb-6">
                You need to purchase the ICT Trading Starter Kit to access this
                content.
              </p>
              <Link
                href="/starter-kit"
                className="inline-block bg-gold hover:bg-gold-light text-navy font-bold text-sm tracking-wide px-8 py-4 rounded-md transition-all uppercase"
              >
                Get the Starter Kit — $49
              </Link>
              <p className="text-gray-400 text-xs mt-4">
                Already purchased? Check your email for the access link, or
                contact us at{" "}
                <a
                  href="mailto:wrightharvest@gmail.com"
                  className="underline hover:text-gray-600"
                >
                  wrightharvest@gmail.com
                </a>
              </p>
            </div>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  // Course content
  return (
    <main>
      <Header />
      <section className="py-12 md:py-16 bg-navy">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="inline-block bg-gold/20 text-gold text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full mb-4">
            Your Course
          </span>
          <h1
            className="text-3xl md:text-4xl font-black text-white mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            ICT Trading <span className="text-gold">Starter Kit</span>
          </h1>
          <p className="text-white/50 text-sm">
            Work through each module at your own pace. Expand a lesson to read
            the full content.
          </p>
        </div>
      </section>

      {/* Download Checklist */}
      <section className="bg-gold py-4">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap justify-center items-center gap-4">
          <span className="text-navy font-bold text-sm">
            Download your ICT Trading Checklist:
          </span>
          <a
            href="/downloads/ict-trading-checklist.pdf"
            download
            className="bg-navy hover:bg-navy-light text-white font-bold text-xs tracking-wide px-5 py-2.5 rounded-md transition-all uppercase"
          >
            Download PDF
          </a>
        </div>
      </section>

      {/* Modules */}
      <section className="py-12 md:py-16 bg-cream min-h-screen">
        <div className="max-w-4xl mx-auto px-6">
          <div className="space-y-4">
            {modules.map((mod, mi) => (
              <div
                key={mi}
                className="bg-white rounded-lg border border-gray-100 overflow-hidden"
              >
                {/* Module Header */}
                <button
                  onClick={() =>
                    setOpenModule(openModule === mi ? null : mi)
                  }
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-navy rounded-full flex items-center justify-center">
                    <span
                      className="text-gold font-black text-sm"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {mi + 1}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-navy font-bold text-base">
                      {mod.title}
                    </h2>
                    <p className="text-gray-400 text-xs">
                      {mod.lessons.length} lessons
                    </p>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${openModule === mi ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Lessons */}
                {openModule === mi && (
                  <div className="border-t border-gray-100">
                    {mod.lessons.map((lesson, li) => {
                      const lessonKey = `${mi}-${li}`;
                      const isOpen = openLesson === lessonKey;
                      return (
                        <div
                          key={li}
                          className="border-b border-gray-50 last:border-0"
                        >
                          <button
                            onClick={() =>
                              setOpenLesson(isOpen ? null : lessonKey)
                            }
                            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-cream/50 transition-colors"
                          >
                            <span className="text-gold text-xs font-bold flex-shrink-0">
                              {mi + 1}.{li + 1}
                            </span>
                            <span className="text-navy/80 text-sm font-medium flex-1">
                              {lesson.title}
                            </span>
                            <svg
                              className={`w-4 h-4 text-gray-300 transition-transform ${isOpen ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                            >
                              <path d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {isOpen && (
                            <div className="px-5 pb-5 pl-12">
                              <div className="prose prose-sm max-w-none text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                                {lesson.content}
                              </div>
                              {lesson.keyTakeaway && (
                                <div className="mt-4 bg-gold/10 border border-gold/20 rounded-md p-4">
                                  <p className="text-navy text-xs font-bold mb-1">
                                    Key Takeaway
                                  </p>
                                  <p className="text-navy/70 text-sm">
                                    {lesson.keyTakeaway}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CTA to coaching */}
          <div className="mt-12 text-center bg-white rounded-lg p-10 border border-gray-100">
            <h3
              className="text-2xl font-bold text-navy mb-3"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Ready for Personalized Coaching?
            </h3>
            <p className="text-gray-500 text-sm mb-6 max-w-lg mx-auto">
              The Starter Kit gives you the foundation. 1-on-1 coaching with
              Harvest takes you from understanding ICT to consistently executing
              it live.
            </p>
            <Link
              href="/coaching"
              className="inline-block bg-gold hover:bg-gold-light text-navy font-bold text-sm tracking-wide px-8 py-4 rounded-md transition-all uppercase"
            >
              View Coaching Plans
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
