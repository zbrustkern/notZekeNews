import { repository } from "../storage/sqlite-repository";
import { Source, TopicCategory } from "../domain/types";
import { pollSource } from "./collector";

export interface PreseedSourceDefinition {
  id: string;
  name: string;
  feedUrl: string;
  siteUrl: string;
  category: TopicCategory;
}

export const PRESEED_SOURCES: PreseedSourceDefinition[] = [
  {
    id: "src_marginalrev",
    name: "Marginal Revolution",
    feedUrl: "https://marginalrevolution.com/feed",
    siteUrl: "https://marginalrevolution.com",
    category: "SYSTEMS",
  },
  {
    id: "src_techcrunch",
    name: "TechCrunch",
    feedUrl: "https://techcrunch.com/feed/",
    siteUrl: "https://techcrunch.com",
    category: "ENGINEERING",
  },
  {
    id: "src_mittechreview",
    name: "MIT Technology Review",
    feedUrl: "https://www.technologyreview.com/feed/",
    siteUrl: "https://www.technologyreview.com",
    category: "SCIENCE",
  },
  {
    id: "src_hn",
    name: "Hacker News",
    feedUrl: "https://news.ycombinator.com/rss",
    siteUrl: "https://news.ycombinator.com",
    category: "SYSTEMS",
  },
  {
    id: "src_danluu",
    name: "Dan Luu",
    feedUrl: "https://danluu.com/atom.xml",
    siteUrl: "https://danluu.com",
    category: "SYSTEMS",
  },
  {
    id: "src_simon",
    name: "Simon Willison's Weblog",
    feedUrl: "https://simonwillison.net/atom/entries/",
    siteUrl: "https://simonwillison.net",
    category: "ENGINEERING",
  },
  {
    id: "src_ars",
    name: "Ars Technica",
    feedUrl: "https://feeds.arstechnica.com/arstechnica/index",
    siteUrl: "https://arstechnica.com",
    category: "SCIENCE",
  },
];

export async function preseedSources(pollImmediately = true): Promise<{
  added: Source[];
  existing: Source[];
}> {
  const existingSources = await repository.getSources(false);
  const existingUrls = new Set(existingSources.map((s) => s.feedUrl.toLowerCase().trim()));
  const existingNames = new Set(existingSources.map((s) => s.name.toLowerCase().trim()));

  const added: Source[] = [];

  for (const item of PRESEED_SOURCES) {
    const isExisting =
      existingUrls.has(item.feedUrl.toLowerCase().trim()) ||
      existingNames.has(item.name.toLowerCase().trim());

    if (isExisting) {
      continue;
    }

    const newSource: Source = {
      id: item.id,
      name: item.name,
      feedUrl: item.feedUrl,
      siteUrl: item.siteUrl,
      category: item.category,
      isEnabled: true,
      healthStatus: "healthy",
      consecutiveFailures: 0,
      articlesCount: 0,
    };

    await repository.saveSource(newSource);
    added.push(newSource);

    if (pollImmediately) {
      try {
        await pollSource(newSource);
      } catch (err) {
        console.warn(`Initial poll warning for ${newSource.name}:`, err);
      }
    }
  }

  return { added, existing: existingSources };
}
