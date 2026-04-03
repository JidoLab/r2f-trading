"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function EditPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/posts/${slug}`)
      .then((r) => r.json())
      .then((data) => { setContent(data.content); setLoading(false); });
  }, [slug]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    const res = await fetch(`/api/admin/posts/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      alert("Failed to save");
    }
    setSaving(false);
  }

  if (loading) {
    return <p className="text-white/40">Loading post...</p>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => router.push("/admin/posts")}
            className="text-white/40 hover:text-white text-sm mb-2 transition-colors"
          >
            ← Back to Posts
          </button>
          <h1 className="text-xl font-bold text-white">Edit Post</h1>
          <p className="text-white/30 text-xs mt-1 font-mono">{slug}.mdx</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-green-400 text-sm">Saved ✓</span>}
          <a
            href={`/trading-insights/${slug}`}
            target="_blank"
            className="text-white/40 hover:text-white text-sm border border-white/10 px-4 py-2 rounded-md transition-colors"
          >
            Preview ↗
          </a>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-6 py-2 rounded-md transition-all disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 min-h-[500px] w-full bg-[#0d1825] border border-white/10 rounded-lg p-6 text-white/90 font-mono text-sm leading-relaxed focus:outline-none focus:border-gold/40 resize-none"
        spellCheck={false}
      />
    </div>
  );
}
