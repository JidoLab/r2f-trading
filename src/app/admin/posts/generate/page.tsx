"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GeneratePostPage() {
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<{ slug: string; title: string } | null>(null);
  const router = useRouter();

  async function handleGenerate() {
    setStatus("generating");
    setLog(["Starting post generation..."]);

    try {
      const res = await fetch("/api/admin/posts", {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Generation failed");
      }

      const data = await res.json();
      setLog((prev) => [
        ...prev,
        `Topic: ${data.topic}`,
        `Category: ${data.category}`,
        `Title: ${data.title}`,
        `Generated ${data.imageCount} images`,
        `Saved to: content/blog/${data.slug}.mdx`,
        "",
        "Done! The post is now live. You can edit it from the posts list.",
      ]);
      setResult({ slug: data.slug, title: data.title });
      setStatus("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setLog((prev) => [...prev, `Error: ${msg}`]);
      setStatus("error");
    }
  }

  return (
    <div>
      <button
        onClick={() => router.push("/admin/posts")}
        className="text-white/40 hover:text-white text-sm mb-4 transition-colors"
      >
        ← Back to Posts
      </button>

      <h1 className="text-2xl font-bold text-white mb-2">Generate New Post</h1>
      <p className="text-white/50 text-sm mb-8">
        AI will generate a full blog article with cover image and in-article images using Claude and Gemini.
      </p>

      {status === "idle" && (
        <button
          onClick={handleGenerate}
          className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-8 py-3 rounded-md transition-all uppercase tracking-wide"
        >
          Generate Post
        </button>
      )}

      {status === "generating" && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            <p className="text-gold text-sm font-semibold">Generating article...</p>
          </div>
          <p className="text-white/40 text-xs">This may take 30-60 seconds.</p>
        </div>
      )}

      {log.length > 0 && (
        <div className="mt-6 bg-[#0d1825] border border-white/10 rounded-lg p-6 font-mono text-sm">
          {log.map((line, i) => (
            <p key={i} className={`${line.startsWith("Error") ? "text-red-400" : "text-white/70"} mb-1`}>
              {line || "\u00A0"}
            </p>
          ))}
        </div>
      )}

      {status === "done" && result && (
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => router.push(`/admin/posts/${result.slug}/edit`)}
            className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-6 py-2.5 rounded-md transition-all"
          >
            Edit Post
          </button>
          <a
            href={`/trading-insights/${result.slug}`}
            target="_blank"
            className="border border-white/10 text-white/70 hover:text-white text-sm px-6 py-2.5 rounded-md transition-colors"
          >
            Preview ↗
          </a>
          <button
            onClick={() => { setStatus("idle"); setLog([]); setResult(null); }}
            className="border border-white/10 text-white/70 hover:text-white text-sm px-6 py-2.5 rounded-md transition-colors"
          >
            Generate Another
          </button>
        </div>
      )}

      {status === "error" && (
        <button
          onClick={() => { setStatus("idle"); setLog([]); }}
          className="mt-4 border border-white/10 text-white/70 hover:text-white text-sm px-6 py-2.5 rounded-md transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
