"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

interface LibraryImage {
  id: string;
  filename: string;
  url: string;
  tags: string[];
  patterns: string[];
  category: string;
  description: string;
  pair?: string;
  timeframe?: string;
  addedAt: string;
  usageCount: number;
}

const CATEGORIES = [
  { id: "chart-pattern", label: "Chart Pattern" },
  { id: "setup", label: "Trade Setup" },
  { id: "result", label: "Trade Result" },
  { id: "concept", label: "ICT Concept" },
  { id: "comparison", label: "Before/After" },
  { id: "educational", label: "Educational" },
];

const COMMON_PATTERNS = [
  "order block", "fair value gap", "FVG", "breaker block", "liquidity sweep",
  "killzone", "market structure shift", "BOS", "CHOCH", "OTE",
  "premium array", "discount array", "inducement", "displacement",
  "bullish", "bearish", "supply zone", "demand zone",
];

const TIMEFRAMES = ["1M", "5M", "15M", "30M", "1H", "4H", "D", "W"];
const PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "NAS100", "US30", "SPX500", "BTCUSD"];

export default function ImageLibraryPage() {
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [filters, setFilters] = useState<{ tags: string[]; patterns: string[]; categories: string[] }>({ tags: [], patterns: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Single upload form state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadData, setUploadData] = useState({
    description: "",
    tags: [] as string[],
    patterns: [] as string[],
    category: "chart-pattern",
    pair: "",
    timeframe: "",
    tagInput: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");

  // Bulk upload state
  const [showBulk, setShowBulk] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<{ file: File; preview: string; description: string }[]>([]);
  const [bulkShared, setBulkShared] = useState({
    patterns: [] as string[],
    category: "chart-pattern",
    pair: "",
    timeframe: "",
    tags: [] as string[],
    tagInput: "",
  });
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [dragOver, setDragOver] = useState(false);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  async function fetchImages() {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (filterCategory) params.set("category", filterCategory);
    const res = await fetch(`/api/admin/image-library?${params}`);
    if (res.ok) {
      const data = await res.json();
      setImages(data.images);
      setFilters(data.filters);
    }
    setLoading(false);
  }

  useEffect(() => { fetchImages(); }, [search, filterCategory]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
    setShowUpload(true);
    setShowBulk(false);
  }

  function handleBulkFiles(files: FileList | File[]) {
    const fileArray = Array.from(files).filter(f => f.type.startsWith("image/")).slice(0, 20);
    if (fileArray.length === 0) return;
    const newFiles: typeof bulkFiles = [];
    let loaded = 0;
    for (const file of fileArray) {
      const reader = new FileReader();
      reader.onload = () => {
        newFiles.push({ file, preview: reader.result as string, description: "" });
        loaded++;
        if (loaded === fileArray.length) {
          setBulkFiles(prev => [...prev, ...newFiles]);
          setShowBulk(true);
          setShowUpload(false);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleBulkFiles(e.dataTransfer.files);
  }

  async function handleBulkUpload() {
    if (bulkFiles.length === 0) return;
    setBulkUploading(true);
    setBulkProgress({ done: 0, total: bulkFiles.length });

    for (let i = 0; i < bulkFiles.length; i++) {
      const item = bulkFiles[i];
      const base64 = item.preview.split(",")[1];
      try {
        await fetch("/api/admin/image-library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64,
            filename: item.file.name,
            description: item.description || `Chart ${i + 1}`,
            tags: bulkShared.tags,
            patterns: bulkShared.patterns,
            category: bulkShared.category,
            pair: bulkShared.pair || undefined,
            timeframe: bulkShared.timeframe || undefined,
          }),
        });
      } catch {}
      setBulkProgress({ done: i + 1, total: bulkFiles.length });
    }

    setBulkUploading(false);
    setBulkFiles([]);
    setShowBulk(false);
    setBulkShared({ patterns: [], category: "chart-pattern", pair: "", timeframe: "", tags: [], tagInput: "" });
    fetchImages();
  }

  function toggleBulkPattern(pattern: string) {
    setBulkShared(d => ({
      ...d,
      patterns: d.patterns.includes(pattern) ? d.patterns.filter(p => p !== pattern) : [...d.patterns, pattern],
    }));
  }

  function addBulkTag() {
    const tag = bulkShared.tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (tag && !bulkShared.tags.includes(tag)) {
      setBulkShared(d => ({ ...d, tags: [...d.tags, tag], tagInput: "" }));
    }
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const res = await fetch("/api/admin/image-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          filename: selectedFile.name,
          tags: uploadData.tags,
          patterns: uploadData.patterns,
          category: uploadData.category,
          description: uploadData.description,
          pair: uploadData.pair || undefined,
          timeframe: uploadData.timeframe || undefined,
        }),
      });

      if (res.ok) {
        setShowUpload(false);
        setSelectedFile(null);
        setPreview("");
        setUploadData({ description: "", tags: [], patterns: [], category: "chart-pattern", pair: "", timeframe: "", tagInput: "" });
        fetchImages();
      } else {
        alert("Upload failed. Try again.");
      }
      setUploading(false);
    };
    reader.readAsDataURL(selectedFile);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this image?")) return;
    await fetch("/api/admin/image-library", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchImages();
  }

  function addTag() {
    const tag = uploadData.tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (tag && !uploadData.tags.includes(tag)) {
      setUploadData(d => ({ ...d, tags: [...d.tags, tag], tagInput: "" }));
    }
  }

  function togglePattern(pattern: string) {
    setUploadData(d => ({
      ...d,
      patterns: d.patterns.includes(pattern)
        ? d.patterns.filter(p => p !== pattern)
        : [...d.patterns, pattern],
    }));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Image Library</h1>
          <p className="text-white/40 text-sm mt-1">{images.length} images &middot; Used in blogs, shorts, and social posts</p>
        </div>
        <div className="flex gap-3">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          <input ref={bulkInputRef} type="file" accept="image/*" multiple onChange={e => e.target.files && handleBulkFiles(e.target.files)} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-white/10 hover:bg-white/20 text-white font-semibold text-sm px-4 py-2.5 rounded-md transition-all"
          >
            + Single
          </button>
          <button
            onClick={() => bulkInputRef.current?.click()}
            className="bg-gold hover:bg-gold-light text-navy font-bold text-sm px-5 py-2.5 rounded-md transition-all"
          >
            + Bulk Upload
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search images..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-md px-4 py-2 text-white text-sm placeholder-white/30 w-64"
        />
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-md px-4 py-2 text-white text-sm"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <div className="bg-white/5 border border-gold/30 rounded-lg p-6 mb-8">
          <h2 className="text-white font-semibold mb-4">Upload New Image</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Preview */}
            <div>
              {preview && (
                <img src={preview} alt="Preview" className="rounded-lg max-h-64 w-full object-contain bg-black/30" />
              )}
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="text-white/60 text-xs font-bold uppercase block mb-1">Description *</label>
                <input
                  type="text"
                  placeholder="e.g. Bullish order block on EUR/USD 4H"
                  value={uploadData.description}
                  onChange={e => setUploadData(d => ({ ...d, description: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm"
                />
              </div>

              <div>
                <label className="text-white/60 text-xs font-bold uppercase block mb-1">Category</label>
                <select
                  value={uploadData.category}
                  onChange={e => setUploadData(d => ({ ...d, category: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm"
                >
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/60 text-xs font-bold uppercase block mb-1">Pair</label>
                  <select
                    value={uploadData.pair}
                    onChange={e => setUploadData(d => ({ ...d, pair: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm"
                  >
                    <option value="">None</option>
                    {PAIRS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-white/60 text-xs font-bold uppercase block mb-1">Timeframe</label>
                  <select
                    value={uploadData.timeframe}
                    onChange={e => setUploadData(d => ({ ...d, timeframe: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm"
                  >
                    <option value="">None</option>
                    {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* ICT Patterns (toggle chips) */}
              <div>
                <label className="text-white/60 text-xs font-bold uppercase block mb-2">ICT Patterns</label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_PATTERNS.map(p => (
                    <button
                      key={p}
                      onClick={() => togglePattern(p)}
                      className={`text-xs px-2.5 py-1 rounded-full transition-all ${
                        uploadData.patterns.includes(p)
                          ? "bg-gold text-navy font-bold"
                          : "bg-white/5 text-white/50 hover:text-white/80"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Tags */}
              <div>
                <label className="text-white/60 text-xs font-bold uppercase block mb-1">Custom Tags</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add tag..."
                    value={uploadData.tagInput}
                    onChange={e => setUploadData(d => ({ ...d, tagInput: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
                    className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm"
                  />
                  <button onClick={addTag} className="bg-white/10 hover:bg-white/20 text-white text-sm px-3 py-2 rounded-md">Add</button>
                </div>
                {uploadData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {uploadData.tags.map(t => (
                      <span key={t} className="bg-white/10 text-white/70 text-xs px-2 py-0.5 rounded-full">
                        {t}
                        <button onClick={() => setUploadData(d => ({ ...d, tags: d.tags.filter(x => x !== t) }))} className="ml-1 text-white/30 hover:text-red-400">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading || !uploadData.description}
                className="w-full bg-gold hover:bg-gold-light disabled:opacity-50 text-navy font-bold text-sm py-3 rounded-md transition-all"
              >
                {uploading ? "Uploading..." : "Save to Library"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drag & Drop Zone (always visible when no form is open) */}
      {!showUpload && !showBulk && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center transition-colors ${
            dragOver ? "border-gold bg-gold/5" : "border-white/10 hover:border-white/20"
          }`}
        >
          <p className={`text-sm ${dragOver ? "text-gold" : "text-white/30"}`}>
            {dragOver ? "Drop images here..." : "Drag & drop chart images here for bulk upload"}
          </p>
        </div>
      )}

      {/* Bulk Upload Form */}
      {showBulk && bulkFiles.length > 0 && (
        <div className="bg-white/5 border border-gold/30 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Bulk Upload ({bulkFiles.length} images)</h2>
            <button onClick={() => { setShowBulk(false); setBulkFiles([]); }} className="text-white/30 hover:text-white/60 text-sm">Cancel</button>
          </div>

          {/* Shared settings for all images */}
          <div className="bg-white/5 rounded-lg p-4 mb-4">
            <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-3">Shared Settings (apply to all)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <select value={bulkShared.category} onChange={e => setBulkShared(d => ({ ...d, category: e.target.value }))} className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm">
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <select value={bulkShared.pair} onChange={e => setBulkShared(d => ({ ...d, pair: e.target.value }))} className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm">
                <option value="">Pair</option>
                {PAIRS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={bulkShared.timeframe} onChange={e => setBulkShared(d => ({ ...d, timeframe: e.target.value }))} className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm">
                <option value="">Timeframe</option>
                {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="flex gap-2">
                <input type="text" placeholder="Add tag..." value={bulkShared.tagInput} onChange={e => setBulkShared(d => ({ ...d, tagInput: e.target.value }))} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addBulkTag())} className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm" />
                <button onClick={addBulkTag} className="bg-white/10 hover:bg-white/20 text-white text-sm px-2 py-2 rounded-md">+</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_PATTERNS.map(p => (
                <button key={p} onClick={() => toggleBulkPattern(p)} className={`text-xs px-2 py-0.5 rounded-full transition-all ${bulkShared.patterns.includes(p) ? "bg-gold text-navy font-bold" : "bg-white/5 text-white/40 hover:text-white/60"}`}>{p}</button>
              ))}
            </div>
            {bulkShared.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {bulkShared.tags.map(t => (
                  <span key={t} className="bg-white/10 text-white/70 text-xs px-2 py-0.5 rounded-full">{t} <button onClick={() => setBulkShared(d => ({ ...d, tags: d.tags.filter(x => x !== t) }))} className="text-white/30 hover:text-red-400">&times;</button></span>
                ))}
              </div>
            )}
          </div>

          {/* Individual image descriptions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {bulkFiles.map((item, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                <img src={item.preview} alt="" className="w-full aspect-video object-cover" />
                <div className="p-2">
                  <input
                    type="text"
                    placeholder={`Description for image ${i + 1}...`}
                    value={item.description}
                    onChange={e => {
                      const updated = [...bulkFiles];
                      updated[i] = { ...updated[i], description: e.target.value };
                      setBulkFiles(updated);
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-xs"
                  />
                  <button onClick={() => setBulkFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400/50 hover:text-red-400 text-[10px] mt-1">Remove</button>
                </div>
              </div>
            ))}
          </div>

          {/* Upload button with progress */}
          <button
            onClick={handleBulkUpload}
            disabled={bulkUploading}
            className="w-full bg-gold hover:bg-gold-light disabled:opacity-50 text-navy font-bold text-sm py-3 rounded-md transition-all"
          >
            {bulkUploading
              ? `Uploading ${bulkProgress.done}/${bulkProgress.total}...`
              : `Upload All ${bulkFiles.length} Images`}
          </button>
          {bulkUploading && (
            <div className="mt-2 bg-white/10 rounded-full h-2 overflow-hidden">
              <div className="bg-gold h-full transition-all" style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Image Grid */}
      {loading ? (
        <p className="text-white/50 text-sm">Loading library...</p>
      ) : images.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
          <p className="text-white/40 text-lg mb-2">No images yet</p>
          <p className="text-white/30 text-sm">Upload chart screenshots, trade setups, and ICT concept diagrams.</p>
          <p className="text-white/30 text-sm mt-1">They&apos;ll be automatically matched to blog posts and video content.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map(img => (
            <div key={img.id} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden group">
              <div className="aspect-video bg-black/30 relative">
                <img src={img.url} alt={img.description} className="w-full h-full object-cover" />
                <button
                  onClick={() => handleDelete(img.id)}
                  className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white text-xs w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  &times;
                </button>
                {img.usageCount > 0 && (
                  <div className="absolute bottom-2 right-2 bg-green-500/80 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    Used {img.usageCount}x
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-white/80 text-xs font-medium truncate">{img.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-gold text-[10px] font-bold uppercase">{img.category}</span>
                  {img.pair && <span className="text-white/40 text-[10px]">{img.pair}</span>}
                  {img.timeframe && <span className="text-white/40 text-[10px]">{img.timeframe}</span>}
                </div>
                {img.patterns.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {img.patterns.slice(0, 3).map(p => (
                      <span key={p} className="bg-white/5 text-white/40 text-[10px] px-1.5 py-0.5 rounded">{p}</span>
                    ))}
                    {img.patterns.length > 3 && (
                      <span className="text-white/30 text-[10px]">+{img.patterns.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
