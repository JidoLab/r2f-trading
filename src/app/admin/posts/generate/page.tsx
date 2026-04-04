"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface GeneratedPost {
  slug: string;
  title: string;
  category: string;
  imageCount: number;
}

export default function GeneratePostPage() {
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [count, setCount] = useState(1);
  const [log, setLog] = useState<string[]>([]);
  const [results, setResults] = useState<GeneratedPost[]>([]);
  const [current, setCurrent] = useState(0);
  const router = useRouter();

  async function generateOne(index: number, total: number): Promise<GeneratedPost | null> {
    setLog((prev) => [...prev, ``, `--- Post ${index + 1} of ${total} ---`, "Generating..."]);

    try {
      const res = await fetch("/api/admin/posts", { method: "POST" });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Generation failed");
      }

      const data = await res.json();
      setLog((prev) => [
        ...prev,
        `✓ "${data.title}"`,
        `  Category: ${data.category}`,
        `  Images: ${data.imageCount}`,
      ]);
      return { slug: data.slug, title: data.title, category: data.category, imageCount: data.imageCount };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setLog((prev) => [...prev, `✗ Error: ${msg}`]);
      return null;
    }
  }

  async function handleGenerate() {
    setStatus("generating");
    setLog([`Starting batch generation of ${count} post${count > 1 ? "s" : ""}...`]);
    setResults([]);
    setCurrent(0);

    const generated: GeneratedPost[] = [];

    for (let i = 0; i < count; i++) {
      setCurrent(i + 1);
      const post = await generateOne(i, count);
      if (post) {
        generated.push(post);
        setResults([...generated]);
      }
    }

    setLog((prev) => [
      ...prev,
      "",
      `=== Complete: ${generated.length}/${count} posts saved as drafts ===`,
      "Go to Blog Posts to review and publish them.",
    ]);
    setResults(generated);
    setStatus(generated.length > 0 ? "done" : "error");
  }

  return (
    <div>
      <button
        onClick={() => router.push("/admin/posts")}
        className="text-white/40 hover:text-white text-sm mb-4 transition-colors"
      >
        ← Back to Posts
      </button>

      <h1 className="text-2xl font-bold text-white mb-2">Generate New Posts</h1>
      <p className="text-white/50 text-sm mb-8">
        AI will generate blog articles with cover images and in-article images using Claude and Gemini.
      </p>

      {status === "idle" && (
        <div className="flex items-end gap-4">
          <div>
            <label className="block text-white/50 text-xs font-semibold mb-2 uppercase tracking-wider">
              Number of posts
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`w-12 h-12 rounded-md font-bold text-sm transition-all ${
                    count === n
                      ? "bg-gold text-navy"
                      : "bg-white/5 border border-white/10 text-white/60 hover:border-gold/40 hover:text-white"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleGenerate}
            className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-8 py-3 rounded-md transition-all uppercase tracking-wide h-12"
          >
            Generate {count} Post{count > 1 ? "s" : ""}
          </button>
        </div>
      )}

      {status === "generating" && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            <p className="text-gold text-sm font-semibold">
              Generating post {current} of {count}...
            </p>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 mb-2">
            <div
              className="bg-gold h-2 rounded-full transition-all duration-500"
              style={{ width: `${(current / count) * 100}%` }}
            />
          </div>
          <p className="text-white/40 text-xs">Each post takes 30-60 seconds.</p>
        </div>
      )}

      {log.length > 0 && (
        <div className="mt-6 bg-[#0d1825] border border-white/10 rounded-lg p-6 font-mono text-sm max-h-[400px] overflow-y-auto">
          {log.map((line, i) => (
            <p
              key={i}
              className={`mb-1 ${
                line.startsWith("✗") ? "text-red-400" :
                line.startsWith("✓") ? "text-green-400" :
                line.startsWith("---") ? "text-gold" :
                line.startsWith("===") ? "text-gold font-bold" :
                "text-white/60"
              }`}
            >
              {line || "\u00A0"}
            </p>
          ))}
        </div>
      )}

      {status === "done" && results.length > 0 && (
        <div className="mt-6">
          <h3 className="text-white text-sm font-bold mb-3">Generated Posts:</h3>
          <div className="space-y-2 mb-6">
            {results.map((post) => (
              <div
                key={post.slug}
                className="flex items-center justify-between bg-white/5 border border-white/10 rounded-md px-4 py-3"
              >
                <div>
                  <p className="text-white/90 text-sm">{post.title}</p>
                  <p className="text-white/30 text-xs">{post.category} · {post.imageCount} images</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/admin/posts/${post.slug}/edit`)}
                    className="text-gold text-xs font-bold hover:text-gold-light transition-colors"
                  >
                    Edit
                  </button>
                  <a
                    href={`/trading-insights/${post.slug}`}
                    target="_blank"
                    className="text-white/40 text-xs hover:text-white transition-colors"
                  >
                    View ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/admin/posts")}
              className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-6 py-2.5 rounded-md transition-all"
            >
              View All Posts
            </button>
            <button
              onClick={() => { setStatus("idle"); setLog([]); setResults([]); }}
              className="border border-white/10 text-white/70 hover:text-white text-sm px-6 py-2.5 rounded-md transition-colors"
            >
              Generate More
            </button>
          </div>
        </div>
      )}

      {status === "error" && (
        <button
          onClick={() => { setStatus("idle"); setLog([]); setResults([]); }}
          className="mt-4 border border-white/10 text-white/70 hover:text-white text-sm px-6 py-2.5 rounded-md transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
