"use client";

import { useState } from "react";

const achievements = [
  {
    image: "/achievements/tradingview-editors-pick.jpg",
    alt: "TradingView Editors' Pick Award",
    caption: "TradingView Editors' Pick",
  },
  {
    image: "/achievements/tradingview-competition.jpg",
    alt: "TradingView Paper Trading Competition - Top 1%",
    caption: "Top 1% in Trading Competition",
  },
  {
    image: "/achievements/ftmo-challenge.jpg",
    alt: "Passed FTMO Challenge Certificate",
    caption: "FTMO Challenge Passed",
  },
];

export default function Achievements() {
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <>
      <section className="py-16 md:py-24 bg-navy">
        <div className="max-w-5xl mx-auto px-6">
          <h2
            className="text-3xl md:text-4xl font-bold text-white text-center mb-3"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Proven Track Record
          </h2>
          <p className="text-white/60 text-center mb-12 max-w-2xl mx-auto">
            Results speak louder than words. Here are some highlights from my trading journey. Click to enlarge.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {achievements.map((item) => (
              <button
                key={item.alt}
                onClick={() => setLightbox(item.image)}
                className="rounded-lg overflow-hidden bg-white/5 border border-white/10 hover:border-gold/40 transition-colors group text-left cursor-pointer"
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4">
                  <p className="text-white/80 text-sm font-semibold text-center">
                    {item.caption}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-6 right-6 text-white/80 hover:text-white text-4xl font-light leading-none cursor-pointer"
            aria-label="Close"
          >
            &times;
          </button>
          <img
            src={lightbox}
            alt="Achievement detail"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
