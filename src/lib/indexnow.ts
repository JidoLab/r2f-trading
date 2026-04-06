const SITE_URL = "https://www.r2ftrading.com";

export async function notifyIndexNow(urls: string[]) {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return;

  const fullUrls = urls.map((u) => u.startsWith("http") ? u : `${SITE_URL}${u}`);

  try {
    // IndexNow — instant notification to Bing, Yandex, etc.
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: "www.r2ftrading.com",
        key,
        keyLocation: `${SITE_URL}/${key}.txt`,
        urlList: fullUrls,
      }),
    });
  } catch {}

  // Ping Google to re-crawl sitemap (triggers re-indexing of new URLs)
  try {
    await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(`${SITE_URL}/sitemap.xml`)}`);
  } catch {}

  // Ping Google for each individual URL via the informal indexing endpoint
  for (const url of fullUrls) {
    try {
      await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(url)}`);
    } catch {}
  }
}

/**
 * Submit URL to Google Search Console Indexing API
 * Requires a Google Service Account with Indexing API access
 * For now, uses the sitemap ping approach above as it requires no additional setup
 */
export async function requestGoogleIndexing(url: string) {
  // Sitemap ping is already handled in notifyIndexNow
  // If you later set up a Google Service Account, add the official API call here:
  // POST https://indexing.googleapis.com/v3/urlNotifications:publish
  // { "url": url, "type": "URL_UPDATED" }
}
