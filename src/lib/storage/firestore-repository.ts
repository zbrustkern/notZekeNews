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
import { firestore, sanitizeDoc } from "./firestore";

export const DEFAULT_PRESEED_SOURCES: Source[] = [
  {
    id: "src_marginalrev",
    name: "Marginal Revolution",
    feedUrl: "https://marginalrevolution.com/feed",
    siteUrl: "https://marginalrevolution.com",
    category: "SYSTEMS",
    isEnabled: true,
    healthStatus: "healthy",
    consecutiveFailures: 0,
    articlesCount: 0,
  },
  {
    id: "src_techcrunch",
    name: "TechCrunch",
    feedUrl: "https://techcrunch.com/feed/",
    siteUrl: "https://techcrunch.com",
    category: "ENGINEERING",
    isEnabled: true,
    healthStatus: "healthy",
    consecutiveFailures: 0,
    articlesCount: 0,
  },
  {
    id: "src_mittechreview",
    name: "MIT Technology Review",
    feedUrl: "https://www.technologyreview.com/feed/",
    siteUrl: "https://www.technologyreview.com",
    category: "SCIENCE",
    isEnabled: true,
    healthStatus: "healthy",
    consecutiveFailures: 0,
    articlesCount: 0,
  },
  {
    id: "src_hn",
    name: "Hacker News",
    feedUrl: "https://hnrss.org/frontpage",
    siteUrl: "https://news.ycombinator.com",
    category: "SYSTEMS",
    isEnabled: true,
    healthStatus: "healthy",
    consecutiveFailures: 0,
    articlesCount: 0,
  },
  {
    id: "src_danluu",
    name: "Dan Luu",
    feedUrl: "https://danluu.com/atom.xml",
    siteUrl: "https://danluu.com",
    category: "SYSTEMS",
    isEnabled: true,
    healthStatus: "healthy",
    consecutiveFailures: 0,
    articlesCount: 0,
  },
  {
    id: "src_simon",
    name: "Simon Willison",
    feedUrl: "https://simonwillison.net/atom/entries/",
    siteUrl: "https://simonwillison.net",
    category: "ENGINEERING",
    isEnabled: true,
    healthStatus: "healthy",
    consecutiveFailures: 0,
    articlesCount: 0,
  },
  {
    id: "src_ars",
    name: "Ars Technica",
    feedUrl: "https://feeds.arstechnica.com/arstechnica/index",
    siteUrl: "https://arstechnica.com",
    category: "SCIENCE",
    isEnabled: true,
    healthStatus: "healthy",
    consecutiveFailures: 0,
    articlesCount: 0,
  },
];

export class FirestoreNewsRepository implements INewsRepository {
  private db = firestore;
  private hasEnsuredSources = false;

  private async ensureSourcesSeeded(): Promise<void> {
    if (this.hasEnsuredSources) return;
    try {
      const snap = await this.db.collection("sources").limit(1).get();
      if (snap.empty) {
        const batch = this.db.batch();
        for (const src of DEFAULT_PRESEED_SOURCES) {
          const ref = this.db.collection("sources").doc(src.id);
          batch.set(ref, sanitizeDoc(src));
        }
        await batch.commit();
      }
      this.hasEnsuredSources = true;
    } catch (err) {
      console.warn("Could not ensure sources seeded:", err);
    }
  }

  // --- Stories ---
  async getStories(limit = 30): Promise<Story[]> {
    try {
      let snapshot;
      try {
        snapshot = await this.db
          .collection("stories")
          .orderBy("rankingScore", "desc")
          .orderBy("leadDiscoveredAt", "desc")
          .limit(limit)
          .get();
      } catch {
        // Fallback if composite index is being built
        snapshot = await this.db.collection("stories").limit(limit * 2).get();
      }

      const stories: Story[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as any;
        stories.push({
          id: data.id || doc.id,
          headline: data.headline,
          primaryTopic: data.primaryTopic as TopicCategory,
          leadArticleId: data.leadArticleId,
          leadSourceName: data.leadSourceName,
          leadPublishedAt: data.leadPublishedAt || undefined,
          leadDiscoveredAt: data.leadDiscoveredAt,
          readOriginalUrl: data.readOriginalUrl,
          relatedCoverage: data.relatedCoverage || [],
          articleIds: data.articleIds || [],
          summaryRevision: data.summaryRevision || undefined,
          isUserSubmitted: Boolean(data.isUserSubmitted),
          userSubmissionNote: data.userSubmissionNote || undefined,
          rankingScore: typeof data.rankingScore === "number" ? data.rankingScore : 0,
        });
      });

      // In-memory sort fallback to ensure proper order
      stories.sort((a, b) => {
        const scoreA = a.rankingScore ?? 0;
        const scoreB = b.rankingScore ?? 0;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        return new Date(b.leadDiscoveredAt).getTime() - new Date(a.leadDiscoveredAt).getTime();
      });

      return stories.slice(0, limit);
    } catch (err) {
      console.error("Failed to get stories from Firestore:", err);
      return [];
    }
  }

  async getStoryById(id: string): Promise<Story | null> {
    try {
      const doc = await this.db.collection("stories").doc(id).get();
      if (!doc.exists) return null;
      const data = doc.data() as any;
      return {
        id: data.id || doc.id,
        headline: data.headline,
        primaryTopic: data.primaryTopic as TopicCategory,
        leadArticleId: data.leadArticleId,
        leadSourceName: data.leadSourceName,
        leadPublishedAt: data.leadPublishedAt || undefined,
        leadDiscoveredAt: data.leadDiscoveredAt,
        readOriginalUrl: data.readOriginalUrl,
        relatedCoverage: data.relatedCoverage || [],
        articleIds: data.articleIds || [],
        summaryRevision: data.summaryRevision || undefined,
        isUserSubmitted: Boolean(data.isUserSubmitted),
        userSubmissionNote: data.userSubmissionNote || undefined,
        rankingScore: typeof data.rankingScore === "number" ? data.rankingScore : 0,
      };
    } catch (err) {
      console.error(`Failed to get story ${id}:`, err);
      return null;
    }
  }

  async saveStory(story: Story): Promise<void> {
    try {
      const storyRef = this.db.collection("stories").doc(story.id);
      const dataToSave = sanitizeDoc({
        ...story,
        updatedAt: new Date().toISOString(),
      });
      await storyRef.set(dataToSave, { merge: true });

      if (story.summaryRevision) {
        await this.saveSummaryRevision(story.summaryRevision);
      }
    } catch (err) {
      console.error(`Failed to save story ${story.id}:`, err);
      throw err;
    }
  }

  async updateStoryScore(id: string, score: number): Promise<void> {
    try {
      await this.db.collection("stories").doc(id).update({
        rankingScore: score,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn(`Could not update story score for ${id}:`, err);
    }
  }

  // --- Articles ---
  async saveArticle(article: Article): Promise<void> {
    try {
      const ref = this.db.collection("articles").doc(article.id);
      await ref.set(sanitizeDoc(article), { merge: true });
    } catch (err) {
      console.error(`Failed to save article ${article.id}:`, err);
      throw err;
    }
  }

  async getArticleById(id: string): Promise<Article | null> {
    try {
      const doc = await this.db.collection("articles").doc(id).get();
      if (!doc.exists) return null;
      return doc.data() as Article;
    } catch (err) {
      console.error(`Failed to get article ${id}:`, err);
      return null;
    }
  }

  async getArticleByCanonicalUrl(url: string): Promise<Article | null> {
    try {
      const snap = await this.db
        .collection("articles")
        .where("canonicalUrl", "==", url)
        .limit(1)
        .get();
      if (snap.empty) return null;
      return snap.docs[0].data() as Article;
    } catch (err) {
      console.error(`Failed to get article by canonical url:`, err);
      return null;
    }
  }

  // --- Summary Revisions ---
  async saveSummaryRevision(revision: SummaryRevision): Promise<void> {
    try {
      const ref = this.db.collection("summary_revisions").doc(revision.id);
      await ref.set(sanitizeDoc(revision), { merge: true });

      // Also update embedded summaryRevision on the story for fast feed rendering
      await this.db.collection("stories").doc(revision.storyId).set(
        sanitizeDoc({
          summaryRevision: revision,
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
    } catch (err) {
      console.error(`Failed to save summary revision ${revision.id}:`, err);
    }
  }

  async getSummaryRevisionByStoryId(storyId: string): Promise<SummaryRevision | null> {
    try {
      const snap = await this.db
        .collection("summary_revisions")
        .where("storyId", "==", storyId)
        .orderBy("version", "desc")
        .limit(1)
        .get();
      if (snap.empty) return null;
      return snap.docs[0].data() as SummaryRevision;
    } catch (err) {
      console.error(`Failed to get summary revision for story ${storyId}:`, err);
      return null;
    }
  }

  // --- Sources ---
  async getSources(onlyEnabled = true): Promise<Source[]> {
    await this.ensureSourcesSeeded();
    try {
      const snap = await this.db.collection("sources").get();
      const sources: Source[] = [];
      snap.forEach((doc) => {
        const data = doc.data() as Source;
        if (!onlyEnabled || data.isEnabled) {
          sources.push({
            id: data.id || doc.id,
            name: data.name,
            feedUrl: data.feedUrl,
            siteUrl: data.siteUrl,
            category: data.category as TopicCategory,
            isEnabled: Boolean(data.isEnabled),
            lastPolledAt: data.lastPolledAt || undefined,
            lastHttpEtag: data.lastHttpEtag || undefined,
            lastHttpModified: data.lastHttpModified || undefined,
            healthStatus: data.healthStatus as Source["healthStatus"],
            consecutiveFailures: typeof data.consecutiveFailures === "number" ? data.consecutiveFailures : 0,
            articlesCount: typeof data.articlesCount === "number" ? data.articlesCount : 0,
          });
        }
      });
      return sources;
    } catch (err) {
      console.error("Failed to get sources from Firestore:", err);
      return [];
    }
  }

  async getSourceById(id: string): Promise<Source | null> {
    try {
      const doc = await this.db.collection("sources").doc(id).get();
      if (!doc.exists) return null;
      return doc.data() as Source;
    } catch (err) {
      console.error(`Failed to get source ${id}:`, err);
      return null;
    }
  }

  async saveSource(source: Source): Promise<void> {
    try {
      const ref = this.db.collection("sources").doc(source.id);
      await ref.set(sanitizeDoc(source), { merge: true });
    } catch (err) {
      console.error(`Failed to save source ${source.id}:`, err);
      throw err;
    }
  }

  async deleteSource(id: string): Promise<void> {
    try {
      await this.db.collection("sources").doc(id).delete();
    } catch (err) {
      console.error(`Failed to delete source ${id}:`, err);
    }
  }

  async updateSourceStats(
    id: string,
    health: Source["healthStatus"],
    lastPolled: string,
    articlesDelta = 0
  ): Promise<void> {
    try {
      const ref = this.db.collection("sources").doc(id);
      const doc = await ref.get();
      if (!doc.exists) return;

      const data = doc.data() as any;
      const currentArticles = typeof data.articlesCount === "number" ? data.articlesCount : 0;
      const currentFailures = typeof data.consecutiveFailures === "number" ? data.consecutiveFailures : 0;

      await ref.update({
        healthStatus: health,
        lastPolledAt: lastPolled,
        articlesCount: currentArticles + (Number(articlesDelta) || 0),
        consecutiveFailures: health === "healthy" ? 0 : currentFailures + 1,
      });
    } catch (err) {
      console.warn(`Could not update source stats for ${id}:`, err);
    }
  }

  // --- Submissions ---
  async saveSubmission(submission: Submission): Promise<void> {
    try {
      const ref = this.db.collection("submissions").doc(submission.id);
      await ref.set(sanitizeDoc(submission));
    } catch (err) {
      console.error(`Failed to save submission ${submission.id}:`, err);
      throw err;
    }
  }

  async getSubmissions(): Promise<Submission[]> {
    try {
      const snap = await this.db.collection("submissions").orderBy("createdAt", "desc").get();
      const list: Submission[] = [];
      snap.forEach((doc) => list.push(doc.data() as Submission));
      return list;
    } catch (err) {
      console.error("Failed to get submissions:", err);
      return [];
    }
  }

  async updateSubmissionStatus(id: string, status: Submission["status"], error?: string): Promise<void> {
    try {
      await this.db.collection("submissions").doc(id).update(
        sanitizeDoc({
          status,
          errorReason: error,
          processedAt: new Date().toISOString(),
        })
      );
    } catch (err) {
      console.error(`Failed to update submission ${id}:`, err);
    }
  }

  // --- Preferences ---
  async getPreferences(readerId: string): Promise<Preference | null> {
    try {
      const doc = await this.db.collection("preferences").doc(readerId).get();
      if (!doc.exists) return null;
      return doc.data() as Preference;
    } catch (err) {
      console.error(`Failed to get preferences for ${readerId}:`, err);
      return null;
    }
  }

  async savePreferences(pref: Preference): Promise<void> {
    try {
      const ref = this.db.collection("preferences").doc(pref.readerId);
      await ref.set(
        sanitizeDoc({
          ...pref,
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
    } catch (err) {
      console.error(`Failed to save preferences for ${pref.readerId}:`, err);
      throw err;
    }
  }

  // --- Interaction Events ---
  async logEvent(event: InteractionEvent): Promise<void> {
    try {
      const ref = this.db.collection("interaction_events").doc(event.id);
      await ref.set(sanitizeDoc(event));
    } catch (err) {
      console.error(`Failed to log interaction event ${event.id}:`, err);
    }
  }

  async getEvents(limit = 100): Promise<InteractionEvent[]> {
    try {
      const snap = await this.db
        .collection("interaction_events")
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();
      const list: InteractionEvent[] = [];
      snap.forEach((doc) => list.push(doc.data() as InteractionEvent));
      return list;
    } catch (err) {
      console.error("Failed to get events:", err);
      return [];
    }
  }

  async getEventsForReader(readerId: string, since?: string): Promise<InteractionEvent[]> {
    try {
      let query = this.db
        .collection("interaction_events")
        .where("readerId", "==", readerId);

      if (since) {
        query = query.where("createdAt", ">", since);
      }

      const snap = await query.get();
      const list: InteractionEvent[] = [];
      snap.forEach((doc) => list.push(doc.data() as InteractionEvent));

      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return list;
    } catch (err) {
      console.error(`Failed to get events for reader ${readerId}:`, err);
      return [];
    }
  }

  // --- Interest Profiles ---
  async getLatestProfile(readerId: string): Promise<InterestProfile | null> {
    try {
      const snap = await this.db
        .collection("interest_profiles")
        .where("readerId", "==", readerId)
        .orderBy("version", "desc")
        .limit(1)
        .get();

      if (snap.empty) return null;
      return snap.docs[0].data() as InterestProfile;
    } catch (err) {
      console.error(`Failed to get latest profile for ${readerId}:`, err);
      return null;
    }
  }

  async saveProfile(profile: InterestProfile): Promise<void> {
    try {
      const docId = `${profile.readerId}_v${profile.version}`;
      const ref = this.db.collection("interest_profiles").doc(docId);
      await ref.set(
        sanitizeDoc({
          ...profile,
          updatedAt: profile.updatedAt || new Date().toISOString(),
        }),
        { merge: true }
      );
    } catch (err) {
      console.error(`Failed to save profile version ${profile.version}:`, err);
      throw err;
    }
  }

  // --- Telemetry & Collection Runs ---
  async recordCollectionRun(run: {
    id: string;
    startedAt: string;
    completedAt?: string;
    sourcesPolled: number;
    articlesFound: number;
    newStoriesCreated: number;
    summariesGenerated: number;
    errors: string[];
  }): Promise<void> {
    try {
      await this.db.collection("collection_runs").doc(run.id).set(sanitizeDoc(run));
    } catch (err) {
      console.warn("Failed to record collection run:", err);
    }
  }
}

import { InMemoryNewsRepository } from "./memory-repository";

export const firestoreRepository = new FirestoreNewsRepository();

export const repository: INewsRepository =
  process.env.NODE_ENV === "test"
    ? new InMemoryNewsRepository(true)
    : firestoreRepository;

