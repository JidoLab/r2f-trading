"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Notification {
  message: string;
}

export default function SocialProof() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [hidden, setHidden] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if we should show at all
  useEffect(() => {
    // Don't show on admin pages
    if (window.location.pathname.startsWith("/admin")) {
      setHidden(true);
      return;
    }
    // Don't show if already subscribed
    if (localStorage.getItem("r2f_subscriber_email")) {
      setHidden(true);
      return;
    }
    // Don't show if dismissed this session
    if (sessionStorage.getItem("r2f_social_proof_dismissed")) {
      setHidden(true);
      return;
    }
    setHidden(false);
  }, []);

  // Fetch notifications
  useEffect(() => {
    if (hidden) return;

    async function fetchNotifications() {
      try {
        const res = await fetch("/api/social-proof");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setNotifications(data.map((msg: string) => ({ message: msg })));
          }
        }
      } catch {
        // silently fail
      }
    }

    fetchNotifications();
  }, [hidden]);

  // Show notification cycle
  const showNext = useCallback(() => {
    if (dismissed || notifications.length === 0) return;
    setVisible(true);

    // Hide after 5 seconds
    timerRef.current = setTimeout(() => {
      setVisible(false);

      // Queue next notification after slide-out animation
      timerRef.current = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % notifications.length);
      }, 400);
    }, 5000);
  }, [dismissed, notifications.length]);

  useEffect(() => {
    if (hidden || dismissed || notifications.length === 0) return;

    // Initial delay before first notification (10 seconds)
    const initialDelay = setTimeout(() => {
      showNext();
    }, 10000);

    return () => clearTimeout(initialDelay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden, dismissed, notifications.length]);

  // Cycle: show a new one every 30 seconds after the first
  useEffect(() => {
    if (hidden || dismissed || notifications.length === 0) return;

    const interval = setInterval(() => {
      showNext();
    }, 30000);

    return () => {
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hidden, dismissed, notifications.length, showNext]);

  function handleDismiss() {
    setDismissed(true);
    setVisible(false);
    sessionStorage.setItem("r2f_social_proof_dismissed", "1");
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  if (hidden || dismissed || notifications.length === 0) return null;

  const current = notifications[currentIndex];
  if (!current) return null;

  return (
    <div
      className={`fixed bottom-4 left-4 z-40 max-w-xs transition-all duration-400 ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0 pointer-events-none"
      }`}
    >
      <div className="relative bg-navy/95 backdrop-blur-sm border border-gold/20 rounded-lg shadow-lg shadow-black/20 px-4 py-3 pr-8">
        {/* Gold accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gold/60 to-transparent rounded-t-lg" />

        <button
          onClick={handleDismiss}
          className="absolute top-1.5 right-2 text-gray-500 hover:text-gray-300 text-sm leading-none transition-colors"
          aria-label="Dismiss notifications"
        >
          &times;
        </button>

        <p className="text-gray-200 text-xs leading-relaxed">
          {current.message}
        </p>

        <p className="text-gray-500 text-[10px] mt-1">Just now</p>
      </div>
    </div>
  );
}
