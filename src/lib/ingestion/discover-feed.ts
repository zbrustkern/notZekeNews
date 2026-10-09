import Parser from "rss-parser";
import * as cheerio from "cheerio";
import { safeFetchText, normalizeUrl } from "./fetcher";
import { TopicCategory } from "../domain/types";

const rssParser = new Parser({
  timeout: 8000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (compatible; NotZekeNews/1.0)",
    Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html",
  },
});

export interface DiscoveredFeed {
  title: string;
  feedUrl: string;
  siteUrl: string;
  description?: string;
  suggestedCategory: TopicCategory;
  sampleArticles: Array<{
    title: string;
    link: string;
    publishedAt?: string;
  }>;
}

export async function discoverFeed(inputUrl: string): Promise<DiscoveredFeed> {
  let targetUrl = inputUrl.trim();
  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    targetUrl = `https://${targetUrl}`;
  }
  targetUrl = normalizeUrl(targetUrl);

  const parsedUrl = new URL(targetUrl);
  const origin = parsedUrl.origin;

  // 1. Try direct RSS parse first (in case it is already an RSS/Atom endpoint)
  try {
    const feed = await rssParser.parseURL(targetUrl);
    if (feed && feed.items && feed.items.length > 0) {
      return {
        title: feed.title || parsedUrl.hostname,
        feedUrl: targetUrl,
        siteUrl: feed.link || origin,
        description: feed.description,
        suggestedCategory: inferCategoryFromText(feed.title || "", feed.description || ""),
        sampleArticles: (feed.items || []).slice(0, 5).map((item) => ({
          title: item.title || "Untitled",
          link: item.link || targetUrl,
          publishedAt: item.isoDate || item.pubDate,
        })),
      };
    }
  } catch {
    // Not a direct feed or direct parse failed; proceed to HTML discovery
  }

  // 2. Fetch HTML content and look for auto-discovery links
  const html = await safeFetchText(targetUrl, 8000, 1024 * 1024);
  const $ = cheerio.load(html);

  const pageTitle = $("title").text().trim() || $('meta[property="og:site_name"]').attr("content") || parsedUrl.hostname;
  const pageDesc = $('meta[name="description"]').attr("content") || $('meta[property="og:description"]').attr("content") || "";

  const candidateUrls: string[] = [];

  // Look for standard <link rel="alternate" type="..."> tags
  $('link[rel="alternate"]').each((_, el) => {
    const type = $(el).attr("type") || "";
    const href = $(el).attr("href");
    if (href && (type.includes("rss") || type.includes("atom") || type.includes("xml"))) {
      try {
        candidateUrls.push(new URL(href, origin).toString());
      } catch {}
    }
  });

  // Look for obvious anchor tags
  $('a[href*="rss"], a[href*="feed"], a[href*="atom"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      try {
        candidateUrls.push(new URL(href, origin).toString());
      } catch {}
    }
  });

  // Standard path fallbacks
  const fallbackPaths = ["/rss", "/feed", "/atom.xml", "/rss.xml", "/feed.xml", "/index.xml"];
  for (const path of fallbackPaths) {
    candidateUrls.push(`${origin}${path}`);
  }

  // Deduplicate candidates
  const uniqueCandidates = Array.from(new Set(candidateUrls));

  // Test candidates sequentially
  for (const candidate of uniqueCandidates) {
    try {
      const feed = await rssParser.parseURL(candidate);
      if (feed && feed.items && feed.items.length > 0) {
        return {
          title: feed.title || pageTitle,
          feedUrl: candidate,
          siteUrl: feed.link || origin,
          description: feed.description || pageDesc,
          suggestedCategory: inferCategoryFromText(feed.title || pageTitle, feed.description || pageDesc),
          sampleArticles: (feed.items || []).slice(0, 5).map((item) => ({
            title: item.title || "Untitled",
            link: item.link || origin,
            publishedAt: item.isoDate || item.pubDate,
          })),
        };
      }
    } catch {
      // Continue searching next candidate
    }
  }

  throw new Error(`Could not discover an active RSS or Atom feed at ${inputUrl}. Please provide the direct feed XML URL.`);
}

function inferCategoryFromText(title: string, description: string): TopicCategory {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes("science") || text.includes("biology") || text.includes("physics") || text.includes("chem")) {
    return "SCIENCE";
  }
  if (text.includes("system") || text.includes("linux") || text.includes("kernel") || text.includes("infrastructure") || text.includes("cloud")) {
    return "SYSTEMS";
  }
  if (text.includes("making") || text.includes("diy") || text.includes("hardware") || text.includes("build") || text.includes("craft")) {
    return "MAKING";
  }
  if (text.includes("essay") || text.includes("thought") || text.includes("philosoph") || text.includes("writing")) {
    return "ESSAYS";
  }
  return "ENGINEERING";
}
