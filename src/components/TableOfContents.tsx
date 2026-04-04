"use client";

import { useState } from "react";

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

export default function TableOfContents({ content }: { content: string }) {
  const [open, setOpen] = useState(false);

  // Extract H2 and H3 headers from markdown content
  const headers: TOCItem[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/\*\*/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      headers.push({ id, text, level });
    }
  }

  if (headers.length < 3) return null; // Don't show TOC for short articles

  return (
    <div className="bg-cream rounded-lg p-5 mb-8">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-sm font-bold text-navy uppercase tracking-wider">
          Table of Contents
        </span>
        <span className="text-navy/40 text-xs">{open ? "Hide" : `${headers.length} sections`}</span>
      </button>
      {open && (
        <nav className="mt-3 space-y-1.5">
          {headers.map((h) => (
            <a
              key={h.id}
              href={`#${h.id}`}
              className={`block text-sm text-gray-600 hover:text-gold transition-colors ${
                h.level === 3 ? "pl-4 text-xs" : ""
              }`}
            >
              {h.text}
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
