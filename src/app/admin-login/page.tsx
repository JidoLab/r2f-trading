"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      setError("Invalid password");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1
            className="text-4xl font-black text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            R<span className="text-gold">2</span>F
          </h1>
          <p className="text-white/50 text-sm mt-2">Admin Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-lg p-8">
          <label className="block text-white/70 text-sm font-semibold mb-2">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-md bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors"
            placeholder="Enter admin password"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-gold hover:bg-gold-light text-navy font-bold py-3 rounded-md transition-all uppercase text-sm tracking-wide disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
