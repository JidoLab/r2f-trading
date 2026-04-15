"use client";

import { useState } from "react";
import Link from "next/link";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1">
          <span className="text-3xl font-black tracking-tight text-navy" style={{ fontFamily: "var(--font-heading)" }}>
            R<span className="text-gold">2</span>F
          </span>
          <span className="text-[10px] font-bold tracking-[0.35em] uppercase text-navy ml-0.5 mt-2">
            Trading
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {["Home", "About", "Coaching", "Free Course", "Results", "Trading Insights", "Calculator"].map((item) => (
            <Link
              key={item}
              href={
                item === "Home" ? "/" :
                item === "Free Course" ? "/crash-course" :
                item === "Calculator" ? "/tools/risk-calculator" :
                `/${item.toLowerCase().replace(/\s+/g, "-")}`
              }
              className="text-xs font-bold tracking-[0.2em] uppercase text-navy/80 hover:text-gold transition-colors"
            >
              {item}
            </Link>
          ))}
          <Link
            href="/contact"
            className="bg-gold hover:bg-gold-light text-navy font-bold text-xs tracking-[0.15em] uppercase px-5 py-2.5 rounded-md transition-all hover:shadow-md hover:shadow-gold/20"
          >
            Book Free Call
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-navy"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen ? (
              <path d="M6 6l12 12M6 18L18 6" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Nav */}
      {menuOpen && (
        <nav className="md:hidden bg-white border-t border-gray-100 px-6 py-4 flex flex-col gap-4">
          {["Home", "About", "Coaching", "Free Course", "Results", "Trading Insights", "Calculator"].map((item) => (
            <Link
              key={item}
              href={
                item === "Home" ? "/" :
                item === "Free Course" ? "/crash-course" :
                item === "Calculator" ? "/tools/risk-calculator" :
                `/${item.toLowerCase().replace(/\s+/g, "-")}`
              }
              className="text-sm font-bold tracking-[0.15em] uppercase text-navy/80 hover:text-gold transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {item}
            </Link>
          ))}
          <Link
            href="/contact"
            className="bg-gold hover:bg-gold-light text-navy font-bold text-sm tracking-[0.15em] uppercase px-5 py-3 rounded-md transition-all text-center"
            onClick={() => setMenuOpen(false)}
          >
            Book Free Call
          </Link>
        </nav>
      )}
    </header>
  );
}
