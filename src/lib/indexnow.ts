const SITE_URL = "https://www.r2ftrading.com";

/**
 * Notify search engines that URLs are new or updated.
 *
 * IndexNow covers Bing, Yandex, Seznam, and Naver from a single POST.
 *
 * Google is deliberately not pinged here. The old
 * `google.com/ping?sitemap=` endpoint was retired in June 2023 and now
 * returns 404, so the previous version of this function burned one dead
 * round trip per URL on every publish. Google discovers new content via
 * the sitemap declared in robots.txt (and Search Console); its Indexing
 * API officially supports only JobPosting and BroadcastEvent pages, so it
 * does not apply to this site.
 */
export async function notifyIndexNow(urls: string[]) {
  const key = process.env.INDEXNOW_KEY;
  if (!key || urls.length === 0) return;

  const fullUrls = urls.map((u) => (u.startsWith("http") ? u : `${SITE_URL}${u}`));

  try {
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
  } catch {
    // Best effort: a failed ping must never break a publish.
  }
}
