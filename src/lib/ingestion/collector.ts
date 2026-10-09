import Parser from "rss-parser";
import * as cheerio from "cheerio";
import { repository } from "../storage/sqlite-repository";
import { db } from "../storage/db";
import { collectionRunsTable } from "../storage/schema";
import { Article, Story, Source, TopicCategory } from "../domain/types";
import { normalizeUrl, safeFetchText } from "./fetcher";
import crypto from "crypto";

const rssParser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (compatible; NotZekeNews/1.0)",
    "Accept": "application/rss+xml, application/xml, application/atom+xml, text/xml, */*",
  },
});

export interface IngestionResult {
  sourceId: string;
  sourceName: string;
  fetchedItems: number;
  newArticles: number;
  newStories: number;
  errors: string[];
}

/**
 * Extracts readable article text and metadata from raw HTML.
 */
export function extractArticleContent(html: string, fallbackTitle = ""): {
  title: string;
  content: string;
  excerpt: string;
} {
  const $ = cheerio.load(html);

  // Remove scripts, styles, navs, footers, and ads
  $("script, style, noscript, nav, header, footer, svg, form, iframe, aside").remove();

  const ogTitle = $('meta[property="og:title"]').attr("content");
  const titleTag = $("title").text().trim();
  const title = ogTitle || titleTag || fallbackTitle;

  const ogDesc = $('meta[property="og:description"]').attr("content");
  const metaDesc = $('meta[name="description"]').attr("content");

  // Priority content containers
  let content = $("article").text().trim();
  if (!content || content.length < 150) {
    content = $("main").text().trim();
  }
  if (!content || content.length < 150) {
    content = $(".post-content, .entry-content, .content, #content").text().trim();
  }
  if (!content || content.length < 150) {
    content = $("body").text().trim();
  }

  // Collapse whitespace
  const cleanContent = content.replace(/\s+/g, " ").trim();
  const excerpt = ogDesc || metaDesc || cleanContent.slice(0, 280);

  return {
    title,
    content: cleanContent.slice(0, 20000), // Cap at 20k chars
    excerpt,
  };
}

/**
 * Polls a single configured source and stores new articles and conservative stories.
 */
export async function pollSource(source: Source): Promise<IngestionResult> {
  const result: IngestionResult = {
    sourceId: source.id,
    sourceName: source.name,
    fetchedItems: 0,
    newArticles: 0,
    newStories: 0,
    errors: [],
  };

  try {
    const feed = await rssParser.parseURL(source.feedUrl);
    result.fetchedItems = feed.items?.length || 0;

    for (const item of (feed.items || []).slice(0, 10)) {
      if (!item.link) continue;

      const canonicalUrl = normalizeUrl(item.link);

      // Check if article already exists
      const existing = await repository.getArticleByCanonicalUrl(canonicalUrl);
      if (existing) continue;

      const publishedAt = item.isoDate || item.pubDate;
      let rawText = item.contentSnippet || item.content || "";

      // Try fetching page content safely if RSS snippet is short
      if (rawText.length < 200) {
        try {
          const html = await safeFetchText(canonicalUrl, 5000, 1024 * 1024);
          const extracted = extractArticleContent(html, item.title || "");
          rawText = extracted.content || rawText;
        } catch (err: any) {
          // Fall back gracefully to snippet
          result.errors.push(`HTML fetch warning for ${canonicalUrl}: ${err.message}`);
        }
      }

      const articleId = `art_${crypto.createHash("md5").update(canonicalUrl).digest("hex").slice(0, 12)}`;
      const newArticle: Article = {
        id: articleId,
        canonicalUrl,
        originalUrl: item.link,
        title: item.title || "Untitled",
        sourceName: source.name,
        sourceId: source.id,
        author: item.creator,
        publishedAt: publishedAt ? new Date(publishedAt).toISOString() : undefined,
        discoveredAt: new Date().toISOString(),
        content: rawText,
        excerpt: item.contentSnippet?.slice(0, 250),
        topics: [source.category],
      };

      await repository.saveArticle(newArticle);
      result.newArticles++;

      // Conservative Story Creation:
      // In Milestone 1, each new distinct article becomes its own standalone Story
      const storyId = `story_${articleId.replace("art_", "")}`;
      const newStory: Story = {
        id: storyId,
        headline: newArticle.title,
        primaryTopic: source.category,
        leadArticleId: newArticle.id,
        leadSourceName: source.name,
        leadPublishedAt: newArticle.publishedAt,
        leadDiscoveredAt: newArticle.discoveredAt,
        readOriginalUrl: newArticle.originalUrl,
        relatedCoverage: [],
        articleIds: [newArticle.id],
        rankingScore: 70, // Baseline score
      };

      await repository.saveStory(newStory);
      result.newStories++;
    }

    await repository.updateSourceStats(source.id, "healthy", new Date().toISOString(), result.newArticles);
  } catch (err: any) {
    result.errors.push(`Failed to poll ${source.name}: ${err.message}`);
    await repository.updateSourceStats(source.id, "failing", new Date().toISOString());
  }

  return result;
}

/**
 * Runs collection across all enabled sources.
 */
export async function runCollection(): Promise<IngestionResult[]> {
  const startTime = new Date().toISOString();
  const sources = await repository.getSources(true);
  const results: IngestionResult[] = [];

  for (const src of sources) {
    const res = await pollSource(src);
    results.push(res);
  }

  // Record collection run
  const totalArticles = results.reduce((sum, r) => sum + r.newArticles, 0);
  const totalStories = results.reduce((sum, r) => sum + r.newStories, 0);
  const allErrors = results.flatMap((r) => r.errors);

  try {
    db.insert(collectionRunsTable)
      .values({
        id: `run_${Date.now()}`,
        startedAt: startTime,
        completedAt: new Date().toISOString(),
        sourcesPolled: sources.length,
        articlesFound: totalArticles,
        newStoriesCreated: totalStories,
        summariesGenerated: 0,
        errorsJson: JSON.stringify(allErrors),
      })
      .run();
  } catch (err) {
    console.error("Failed to record collection run:", err);
  }

  return results;
}
