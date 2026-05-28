"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

/**
 * Lite YouTube embed — replaces the always-loaded iframe with a clickable
 * thumbnail. The full YouTube player (~944 KiB of JS + 669ms main-thread
 * work per PSI) only loads when the user actually clicks play, not when
 * the homepage renders.
 *
 * Pattern is the established "lite-youtube-embed" approach. We use the
 * native YT thumbnail CDN (i.ytimg.com is already preconnected in the
 * head per the prior PSI report) so the thumbnail load is essentially free.
 */
const VIDEO_ID = "IazaFRwLMKo";

export default function YouTubePreview() {
  const [activated, setActivated] = useState(false);

  return (
    <section className="py-16 md:py-24 bg-white border-t border-gray-100">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1">
            <h2
              className="text-3xl md:text-4xl font-bold text-navy mb-4"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Watch &amp; Learn
            </h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              Get a taste of my teaching style and market insights on YouTube. Free educational content covering ICT concepts, live market breakdowns, and trading psychology.
            </p>
            <a
              href="https://www.youtube.com/@R2F-Trading"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-navy hover:bg-navy-light text-white font-bold text-sm tracking-wide px-6 py-3 rounded-md transition-all uppercase"
            >
              Subscribe on YouTube →
            </a>
          </div>
          <div className="w-full md:w-[420px] flex-shrink-0">
            <div className="aspect-video rounded-lg overflow-hidden shadow-lg relative bg-black">
              {activated ? (
                <iframe
                  src={`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1`}
                  title="R2F Trading YouTube"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setActivated(true)}
                  className="w-full h-full relative group cursor-pointer"
                  aria-label="Play R2F Trading intro video"
                >
                  <Image
                    src={`https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`}
                    alt="R2F Trading YouTube preview"
                    fill
                    sizes="(max-width: 768px) 100vw, 420px"
                    className="object-cover"
                  />
                  {/* Gradient overlay for play-button visibility */}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                  {/* YouTube-style play button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-14 bg-red-600/90 group-hover:bg-red-600 rounded-2xl flex items-center justify-center transition-colors shadow-2xl">
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="white"
                        aria-hidden="true"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
