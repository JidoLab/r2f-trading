const SITE_URL = "https://r2ftrading.com";

export async function notifyIndexNow(urls: string[]) {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return;

  const fullUrls = urls.map((u) => u.startsWith("http") ? u : `${SITE_URL}${u}`);

  try {
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: "r2ftrading.com",
        key,
        keyLocation: `${SITE_URL}/${key}.txt`,
        urlList: fullUrls,
      }),
    });
  } catch {
    // Silent fail — don't block post generation
  }
}
