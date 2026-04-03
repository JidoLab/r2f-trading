import { getAllPosts } from "@/lib/blog";

const BASE_URL = "https://www.r2ftrading.com";

export async function GET() {
  const posts = getAllPosts();

  const items = posts
    .map(
      (post) => `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${BASE_URL}/trading-insights/${post.slug}</link>
      <description><![CDATA[${post.seoDescription || post.excerpt}]]></description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <guid isPermaLink="true">${BASE_URL}/trading-insights/${post.slug}</guid>
      ${post.tags.map((t) => `<category>${t}</category>`).join("\n      ")}
    </item>`
    )
    .join("\n");

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>R2F Trading - Trading Insights</title>
    <link>${BASE_URL}/trading-insights</link>
    <description>Market analysis, ICT trading education, and strategies from R2F Trading mentor Harvest Wright.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(feed, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
