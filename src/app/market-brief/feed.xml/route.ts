import { listFiles, readFile } from "@/lib/github";

const BASE_URL = "https://www.r2ftrading.com";

export async function GET() {
  let items = "";

  try {
    const files = await listFiles("data/market-briefs", ".json");
    const sorted = files.sort().reverse().slice(0, 50);

    for (const filePath of sorted) {
      try {
        const raw = await readFile(filePath);
        const data = JSON.parse(raw);
        const pubDate = new Date(data.date + "T01:00:00Z").toUTCString();
        const audioUrl = `${BASE_URL}${data.audioUrl}`;
        // Estimate file size: ~16KB per second of audio at 128kbps
        const estimatedSize = (data.duration || 120) * 16000;

        items += `    <item>
      <title><![CDATA[${data.title}]]></title>
      <link>${BASE_URL}/market-brief</link>
      <description><![CDATA[${data.script?.slice(0, 300) || data.title}...]]></description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="false">market-brief-${data.date}</guid>
      <enclosure url="${audioUrl}" length="${estimatedSize}" type="audio/mpeg"/>
      <itunes:duration>${data.duration || 120}</itunes:duration>
      <itunes:author>Harvest Wright</itunes:author>
      <itunes:summary><![CDATA[${data.script?.slice(0, 300) || data.title}...]]></itunes:summary>
    </item>\n`;
      } catch {
        // Skip corrupted entries
      }
    }
  } catch {
    // No briefs yet — return empty feed
  }

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:itunes="http://www.itunes.apple.com/dtds/podcast-1.0.dtd"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>R2F Trading Daily Market Brief</title>
    <link>${BASE_URL}/market-brief</link>
    <description>Start your trading day with Harvest's 2-minute daily market brief. Key levels, economic events, and actionable ICT trading setups delivered every morning.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/market-brief/feed.xml" rel="self" type="application/rss+xml"/>
    <itunes:author>Harvest Wright</itunes:author>
    <itunes:owner>
      <itunes:name>Harvest Wright</itunes:name>
      <itunes:email>wrightharvest@gmail.com</itunes:email>
    </itunes:owner>
    <itunes:image href="${BASE_URL}/og-image.jpg"/>
    <itunes:category text="Business">
      <itunes:category text="Investing"/>
    </itunes:category>
    <itunes:explicit>false</itunes:explicit>
    <itunes:type>episodic</itunes:type>
    <image>
      <url>${BASE_URL}/og-image.jpg</url>
      <title>R2F Trading Daily Market Brief</title>
      <link>${BASE_URL}/market-brief</link>
    </image>
${items}  </channel>
</rss>`;

  return new Response(feed, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
