"use client";

import { useEffect, useState } from "react";

export default function AutoGenerateToggle() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/auto-generate")
      .then((r) => r.json())
      .then((data) => {
        setEnabled(data.enabled || false);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleToggle() {
    const newValue = !enabled;
    setSaving(true);

    const res = await fetch("/api/admin/auto-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: newValue }),
    });

    if (res.ok) {
      setEnabled(newValue);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`Failed to update: ${data.error || "Unknown error"}`);
    }
    setSaving(false);
  }

  if (loading) return null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-semibold text-sm">Daily Auto-Generation</p>
          <p className="text-white/40 text-xs mt-1">
            {enabled
              ? "A new blog post will be generated and published every day at 8:00 AM UTC."
              : "Turn on to automatically generate and publish one blog post per day."}
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={saving}
          className={`relative w-14 h-7 rounded-full transition-colors duration-200 flex-shrink-0 ${
            enabled ? "bg-gold" : "bg-white/20"
          } ${saving ? "opacity-50" : ""}`}
        >
          <span
            className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
              enabled ? "translate-x-8" : "translate-x-1"
            }`}
          />
        </button>
      </div>
      {enabled && (
        <div className="mt-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-xs font-semibold">Active</span>
        </div>
      )}
    </div>
  );
}
