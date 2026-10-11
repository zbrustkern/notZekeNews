import { INewsRepository } from "./repository";
import {
  Story,
  Article,
  SummaryRevision,
  Source,
  Submission,
  Preference,
  InteractionEvent,
  InterestProfile,
  TopicCategory,
} from "../domain/types";
import { DEFAULT_PRESEED_SOURCES } from "./firestore-repository";

export class InMemoryNewsRepository implements INewsRepository {
  private stories = new Map<string, Story>();
  private articles = new Map<string, Article>();
  private summaryRevisions = new Map<string, SummaryRevision>();
  private sources = new Map<string, Source>();
  private submissions = new Map<string, Submission>();
  private preferences = new Map<string, Preference>();
  private events: InteractionEvent[] = [];
  private profiles: InterestProfile[] = [];

  constructor(seedDefaults = true) {
    if (seedDefaults) {
      for (const s of DEFAULT_PRESEED_SOURCES) {
        this.sources.set(s.id, { ...s });
      }
    }
  }

  clear(reseedSources = true): void {
    this.stories.clear();
    this.articles.clear();
    this.summaryRevisions.clear();
    this.sources.clear();
    if (reseedSources) {
      for (const s of DEFAULT_PRESEED_SOURCES) {
        this.sources.set(s.id, { ...s });
      }
    }
    this.submissions.clear();
    this.preferences.clear();
    this.events = [];
    this.profiles = [];
  }

  async getStories(limit = 30): Promise<Story[]> {
    const list = Array.from(this.stories.values());
    list.sort((a, b) => {
      if ((b.rankingScore || 0) !== (a.rankingScore || 0)) {
        return (b.rankingScore || 0) - (a.rankingScore || 0);
      }
      return new Date(b.leadDiscoveredAt).getTime() - new Date(a.leadDiscoveredAt).getTime();
    });
    return list.slice(0, limit);
  }

  async getStoryById(id: string): Promise<Story | null> {
    return this.stories.get(id) || null;
  }

  async saveStory(story: Story): Promise<void> {
    this.stories.set(story.id, { ...story });
    if (story.summaryRevision) {
      await this.saveSummaryRevision(story.summaryRevision);
    }
  }

  async updateStoryScore(id: string, score: number): Promise<void> {
    const s = this.stories.get(id);
    if (s) {
      s.rankingScore = score;
    }
  }

  async saveArticle(article: Article): Promise<void> {
    this.articles.set(article.id, { ...article });
  }

  async getArticleById(id: string): Promise<Article | null> {
    return this.articles.get(id) || null;
  }

  async getArticleByCanonicalUrl(url: string): Promise<Article | null> {
    for (const art of this.articles.values()) {
      if (art.canonicalUrl === url) return art;
    }
    return null;
  }

  async saveSummaryRevision(revision: SummaryRevision): Promise<void> {
    this.summaryRevisions.set(revision.id, { ...revision });
  }

  async getSummaryRevisionByStoryId(storyId: string): Promise<SummaryRevision | null> {
    const matching = Array.from(this.summaryRevisions.values()).filter(
      (r) => r.storyId === storyId
    );
    matching.sort((a, b) => b.version - a.version);
    return matching[0] || null;
  }

  async getSources(onlyEnabled = true): Promise<Source[]> {
    const list = Array.from(this.sources.values());
    if (onlyEnabled) {
      return list.filter((s) => s.isEnabled);
    }
    return list;
  }

  async getSourceById(id: string): Promise<Source | null> {
    return this.sources.get(id) || null;
  }

  async saveSource(source: Source): Promise<void> {
    this.sources.set(source.id, { ...source });
  }

  async deleteSource(id: string): Promise<void> {
    this.sources.delete(id);
  }

  async updateSourceStats(
    id: string,
    health: Source["healthStatus"],
    lastPolled: string,
    articlesDelta = 0
  ): Promise<void> {
    const s = this.sources.get(id);
    if (!s) return;
    s.healthStatus = health;
    s.lastPolledAt = lastPolled;
    s.articlesCount = (s.articlesCount || 0) + (articlesDelta || 0);
    s.consecutiveFailures = health === "healthy" ? 0 : (s.consecutiveFailures || 0) + 1;
  }

  async saveSubmission(submission: Submission): Promise<void> {
    this.submissions.set(submission.id, { ...submission });
  }

  async getSubmissions(): Promise<Submission[]> {
    const list = Array.from(this.submissions.values());
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }

  async updateSubmissionStatus(id: string, status: Submission["status"], error?: string): Promise<void> {
    const sub = this.submissions.get(id);
    if (sub) {
      sub.status = status;
      sub.errorReason = error;
      sub.processedAt = new Date().toISOString();
    }
  }

  async getPreferences(readerId: string): Promise<Preference | null> {
    return this.preferences.get(readerId) || null;
  }

  async savePreferences(pref: Preference): Promise<void> {
    this.preferences.set(pref.readerId, { ...pref });
  }

  async logEvent(event: InteractionEvent): Promise<void> {
    this.events.push({ ...event });
  }

  async getEvents(limit = 100): Promise<InteractionEvent[]> {
    const sorted = [...this.events].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return sorted.slice(0, limit);
  }

  async getEventsForReader(readerId: string, since?: string): Promise<InteractionEvent[]> {
    let filtered = this.events.filter((e) => e.readerId === readerId);
    if (since) {
      filtered = filtered.filter((e) => new Date(e.createdAt).getTime() > new Date(since).getTime());
    }
    filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return filtered;
  }

  async getLatestProfile(readerId: string): Promise<InterestProfile | null> {
    const matching = this.profiles.filter((p) => p.readerId === readerId);
    matching.sort((a, b) => b.version - a.version);
    return matching[0] || null;
  }

  async saveProfile(profile: InterestProfile): Promise<void> {
    this.profiles.push({ ...profile });
  }
}
