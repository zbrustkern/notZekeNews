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
import { db } from "./db";
import {
  articlesTable,
  storiesTable,
  storyArticlesTable,
  summaryRevisionsTable,
  sourcesTable,
  submissionsTable,
  preferencesTable,
  interactionEventsTable,
  interestProfilesTable,
} from "./schema";
import { eq, desc, and, gt, asc } from "drizzle-orm";

export class SqliteNewsRepository implements INewsRepository {
  async getStories(limit = 50): Promise<Story[]> {
    const rawStories = db
      .select()
      .from(storiesTable)
      .orderBy(desc(storiesTable.rankingScore), desc(storiesTable.leadDiscoveredAt))
      .limit(limit)
      .all();

    const stories: Story[] = [];

    for (const row of rawStories) {
      // Fetch associated articles
      const storyArticles = db
        .select()
        .from(storyArticlesTable)
        .where(eq(storyArticlesTable.storyId, row.id))
        .all();

      const articleIds = storyArticles.map((sa) => sa.articleId);

      // Fetch summary revision if exists
      const rawSummary = db
        .select()
        .from(summaryRevisionsTable)
        .where(eq(summaryRevisionsTable.storyId, row.id))
        .orderBy(desc(summaryRevisionsTable.version))
        .limit(1)
        .get();

      let summaryRevision: SummaryRevision | undefined = undefined;
      if (rawSummary) {
        summaryRevision = {
          id: rawSummary.id,
          storyId: rawSummary.storyId,
          version: rawSummary.version,
          markdownText: rawSummary.markdownText,
          whyItMatters: rawSummary.whyItMatters || undefined,
          citations: JSON.parse(rawSummary.citationsJson || "[]"),
          evidenceFingerprint: rawSummary.evidenceFingerprint,
          modelVersion: rawSummary.modelVersion,
          revisionReason: rawSummary.revisionReason || undefined,
          status: rawSummary.status as SummaryRevision["status"],
          createdAt: rawSummary.createdAt,
          updatedAt: rawSummary.updatedAt,
        };
      }

      stories.push({
        id: row.id,
        headline: row.headline,
        primaryTopic: row.primaryTopic as TopicCategory,
        leadArticleId: row.leadArticleId,
        leadSourceName: row.leadSourceName,
        leadPublishedAt: row.leadPublishedAt || undefined,
        leadDiscoveredAt: row.leadDiscoveredAt,
        readOriginalUrl: row.readOriginalUrl,
        relatedCoverage: JSON.parse(row.relatedCoverageJson || "[]"),
        articleIds,
        summaryRevision,
        isUserSubmitted: Boolean(row.isUserSubmitted),
        userSubmissionNote: row.userSubmissionNote || undefined,
        rankingScore: row.rankingScore || 0,
      });
    }

    return stories;
  }

  async getStoryById(id: string): Promise<Story | null> {
    const stories = await this.getStories(100);
    return stories.find((s) => s.id === id) || null;
  }

  async saveStory(story: Story): Promise<void> {
    db.insert(storiesTable)
      .values({
        id: story.id,
        headline: story.headline,
        primaryTopic: story.primaryTopic,
        leadArticleId: story.leadArticleId,
        leadSourceName: story.leadSourceName,
        leadPublishedAt: story.leadPublishedAt,
        leadDiscoveredAt: story.leadDiscoveredAt,
        readOriginalUrl: story.readOriginalUrl,
        relatedCoverageJson: JSON.stringify(story.relatedCoverage || []),
        isUserSubmitted: story.isUserSubmitted || false,
        userSubmissionNote: story.userSubmissionNote,
        rankingScore: story.rankingScore || 0,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: storiesTable.id,
        set: {
          headline: story.headline,
          primaryTopic: story.primaryTopic,
          relatedCoverageJson: JSON.stringify(story.relatedCoverage || []),
          rankingScore: story.rankingScore || 0,
          updatedAt: new Date().toISOString(),
        },
      })
      .run();

    // Insert article mappings
    for (const artId of story.articleIds) {
      db.insert(storyArticlesTable)
        .values({
          id: `${story.id}_${artId}`,
          storyId: story.id,
          articleId: artId,
          isLead: artId === story.leadArticleId,
        })
        .onConflictDoNothing()
        .run();
    }

    if (story.summaryRevision) {
      await this.saveSummaryRevision(story.summaryRevision);
    }
  }

  async updateStoryScore(id: string, score: number): Promise<void> {
    db.update(storiesTable)
      .set({ rankingScore: score, updatedAt: new Date().toISOString() })
      .where(eq(storiesTable.id, id))
      .run();
  }

  async saveArticle(article: Article): Promise<void> {
    db.insert(articlesTable)
      .values({
        id: article.id,
        canonicalUrl: article.canonicalUrl,
        originalUrl: article.originalUrl,
        title: article.title,
        sourceName: article.sourceName,
        sourceId: article.sourceId,
        author: article.author,
        publishedAt: article.publishedAt,
        discoveredAt: article.discoveredAt,
        content: article.content,
        excerpt: article.excerpt,
        topicsJson: JSON.stringify(article.topics || []),
      })
      .onConflictDoUpdate({
        target: articlesTable.canonicalUrl,
        set: {
          title: article.title,
          content: article.content,
          excerpt: article.excerpt,
        },
      })
      .run();
  }

  async getArticleById(id: string): Promise<Article | null> {
    const row = db.select().from(articlesTable).where(eq(articlesTable.id, id)).get();
    if (!row) return null;
    return {
      id: row.id,
      canonicalUrl: row.canonicalUrl,
      originalUrl: row.originalUrl,
      title: row.title,
      sourceName: row.sourceName,
      sourceId: row.sourceId || undefined,
      author: row.author || undefined,
      publishedAt: row.publishedAt || undefined,
      discoveredAt: row.discoveredAt,
      content: row.content,
      excerpt: row.excerpt || undefined,
      topics: JSON.parse(row.topicsJson || "[]"),
    };
  }

  async getArticleByCanonicalUrl(url: string): Promise<Article | null> {
    const row = db.select().from(articlesTable).where(eq(articlesTable.canonicalUrl, url)).get();
    if (!row) return null;
    return {
      id: row.id,
      canonicalUrl: row.canonicalUrl,
      originalUrl: row.originalUrl,
      title: row.title,
      sourceName: row.sourceName,
      sourceId: row.sourceId || undefined,
      author: row.author || undefined,
      publishedAt: row.publishedAt || undefined,
      discoveredAt: row.discoveredAt,
      content: row.content,
      excerpt: row.excerpt || undefined,
      topics: JSON.parse(row.topicsJson || "[]"),
    };
  }

  async saveSummaryRevision(revision: SummaryRevision): Promise<void> {
    db.insert(summaryRevisionsTable)
      .values({
        id: revision.id,
        storyId: revision.storyId,
        version: revision.version,
        markdownText: revision.markdownText,
        whyItMatters: revision.whyItMatters,
        citationsJson: JSON.stringify(revision.citations || []),
        evidenceFingerprint: revision.evidenceFingerprint,
        modelVersion: revision.modelVersion,
        revisionReason: revision.revisionReason,
        status: revision.status,
        createdAt: revision.createdAt,
        updatedAt: revision.updatedAt,
      })
      .onConflictDoUpdate({
        target: summaryRevisionsTable.id,
        set: {
          markdownText: revision.markdownText,
          whyItMatters: revision.whyItMatters,
          citationsJson: JSON.stringify(revision.citations || []),
          status: revision.status,
          updatedAt: revision.updatedAt,
        },
      })
      .run();
  }

  async getSummaryRevisionByStoryId(storyId: string): Promise<SummaryRevision | null> {
    const raw = db
      .select()
      .from(summaryRevisionsTable)
      .where(eq(summaryRevisionsTable.storyId, storyId))
      .orderBy(desc(summaryRevisionsTable.version))
      .limit(1)
      .get();
    if (!raw) return null;
    return {
      id: raw.id,
      storyId: raw.storyId,
      version: raw.version,
      markdownText: raw.markdownText,
      whyItMatters: raw.whyItMatters || undefined,
      citations: JSON.parse(raw.citationsJson || "[]"),
      evidenceFingerprint: raw.evidenceFingerprint,
      modelVersion: raw.modelVersion,
      revisionReason: raw.revisionReason || undefined,
      status: raw.status as SummaryRevision["status"],
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  async getSources(onlyEnabled = true): Promise<Source[]> {
    let rows = db.select().from(sourcesTable).all();
    if (onlyEnabled) {
      rows = rows.filter((r) => r.isEnabled);
    }
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      feedUrl: r.feedUrl,
      siteUrl: r.siteUrl,
      category: r.category as TopicCategory,
      isEnabled: Boolean(r.isEnabled),
      lastPolledAt: r.lastPolledAt || undefined,
      lastHttpEtag: r.lastHttpEtag || undefined,
      lastHttpModified: r.lastHttpModified || undefined,
      healthStatus: r.healthStatus as Source["healthStatus"],
      consecutiveFailures: r.consecutiveFailures,
      articlesCount: r.articlesCount,
    }));
  }

  async getSourceById(id: string): Promise<Source | null> {
    const r = db.select().from(sourcesTable).where(eq(sourcesTable.id, id)).get();
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      feedUrl: r.feedUrl,
      siteUrl: r.siteUrl,
      category: r.category as TopicCategory,
      isEnabled: Boolean(r.isEnabled),
      lastPolledAt: r.lastPolledAt || undefined,
      lastHttpEtag: r.lastHttpEtag || undefined,
      lastHttpModified: r.lastHttpModified || undefined,
      healthStatus: r.healthStatus as Source["healthStatus"],
      consecutiveFailures: r.consecutiveFailures,
      articlesCount: r.articlesCount,
    };
  }

  async saveSource(source: Source): Promise<void> {
    db.insert(sourcesTable)
      .values({
        id: source.id,
        name: source.name,
        feedUrl: source.feedUrl,
        siteUrl: source.siteUrl,
        category: source.category,
        isEnabled: source.isEnabled,
        lastPolledAt: source.lastPolledAt,
        healthStatus: source.healthStatus,
        consecutiveFailures: source.consecutiveFailures,
        articlesCount: source.articlesCount,
      })
      .onConflictDoUpdate({
        target: sourcesTable.feedUrl,
        set: {
          name: source.name,
          siteUrl: source.siteUrl,
          category: source.category,
          isEnabled: source.isEnabled,
        },
      })
      .run();
  }

  async deleteSource(id: string): Promise<void> {
    db.delete(sourcesTable).where(eq(sourcesTable.id, id)).run();
  }

  async updateSourceStats(
    id: string,
    health: Source["healthStatus"],
    lastPolled: string,
    articlesDelta = 0
  ): Promise<void> {
    const existing = db.select().from(sourcesTable).where(eq(sourcesTable.id, id)).get();
    if (!existing) return;

    db.update(sourcesTable)
      .set({
        healthStatus: health,
        lastPolledAt: lastPolled,
        articlesCount: existing.articlesCount + articlesDelta,
        consecutiveFailures: health === "healthy" ? 0 : existing.consecutiveFailures + 1,
      })
      .where(eq(sourcesTable.id, id))
      .run();
  }

  async saveSubmission(submission: Submission): Promise<void> {
    db.insert(submissionsTable)
      .values({
        id: submission.id,
        url: submission.url,
        note: submission.note,
        status: submission.status,
        errorReason: submission.errorReason,
        createdAt: submission.createdAt,
        processedAt: submission.processedAt,
      })
      .run();
  }

  async getSubmissions(): Promise<Submission[]> {
    const rows = db.select().from(submissionsTable).orderBy(desc(submissionsTable.createdAt)).all();
    return rows.map((r) => ({
      id: r.id,
      url: r.url,
      note: r.note || undefined,
      status: r.status as Submission["status"],
      errorReason: r.errorReason || undefined,
      createdAt: r.createdAt,
      processedAt: r.processedAt || undefined,
    }));
  }

  async updateSubmissionStatus(id: string, status: Submission["status"], error?: string): Promise<void> {
    db.update(submissionsTable)
      .set({
        status,
        errorReason: error,
        processedAt: new Date().toISOString(),
      })
      .where(eq(submissionsTable.id, id))
      .run();
  }

  async getPreferences(readerId: string): Promise<Preference | null> {
    const row = db.select().from(preferencesTable).where(eq(preferencesTable.readerId, readerId)).get();
    if (!row) return null;
    return {
      id: row.id,
      readerId: row.readerId,
      allowTopics: JSON.parse(row.allowTopicsJson || "[]"),
      blockTopics: JSON.parse(row.blockTopicsJson || "[]"),
      preferredSources: JSON.parse(row.preferredSourcesJson || "[]"),
      blockedSources: JSON.parse(row.blockedSourcesJson || "[]"),
      steeredTopics: JSON.parse(row.steeredTopicsJson || "{}"),
      steeredSources: JSON.parse(row.steeredSourcesJson || "{}"),
      pauseLearning: Boolean(row.pauseLearning),
      updatedAt: row.updatedAt,
    };
  }

  async savePreferences(pref: Preference): Promise<void> {
    db.insert(preferencesTable)
      .values({
        id: pref.id,
        readerId: pref.readerId,
        allowTopicsJson: JSON.stringify(pref.allowTopics || []),
        blockTopicsJson: JSON.stringify(pref.blockTopics || []),
        preferredSourcesJson: JSON.stringify(pref.preferredSources || []),
        blockedSourcesJson: JSON.stringify(pref.blockedSources || []),
        steeredTopicsJson: JSON.stringify(pref.steeredTopics || {}),
        steeredSourcesJson: JSON.stringify(pref.steeredSources || {}),
        pauseLearning: pref.pauseLearning,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: preferencesTable.readerId,
        set: {
          allowTopicsJson: JSON.stringify(pref.allowTopics || []),
          blockTopicsJson: JSON.stringify(pref.blockTopics || []),
          preferredSourcesJson: JSON.stringify(pref.preferredSources || []),
          blockedSourcesJson: JSON.stringify(pref.blockedSources || []),
          steeredTopicsJson: JSON.stringify(pref.steeredTopics || {}),
          steeredSourcesJson: JSON.stringify(pref.steeredSources || {}),
          pauseLearning: pref.pauseLearning,
          updatedAt: new Date().toISOString(),
        },
      })
      .run();
  }

  async logEvent(event: InteractionEvent): Promise<void> {
    db.insert(interactionEventsTable)
      .values({
        id: event.id,
        readerId: event.readerId,
        sessionId: event.sessionId,
        eventType: event.eventType,
        storyId: event.storyId,
        articleId: event.articleId,
        summaryRevisionId: event.summaryRevisionId,
        dwellTimeMs: event.dwellTimeMs,
        feedbackReason: event.feedbackReason,
        metadataJson: JSON.stringify(event.metadata || {}),
        createdAt: event.createdAt,
      })
      .run();
  }

  async getEvents(limit = 100): Promise<InteractionEvent[]> {
    const rows = db
      .select()
      .from(interactionEventsTable)
      .orderBy(desc(interactionEventsTable.createdAt))
      .limit(limit)
      .all();

    return rows.map((r) => ({
      id: r.id,
      readerId: r.readerId,
      sessionId: r.sessionId,
      eventType: r.eventType as InteractionEvent["eventType"],
      storyId: r.storyId || undefined,
      articleId: r.articleId || undefined,
      summaryRevisionId: r.summaryRevisionId || undefined,
      dwellTimeMs: r.dwellTimeMs || undefined,
      feedbackReason: r.feedbackReason || undefined,
      metadata: JSON.parse(r.metadataJson || "{}"),
      createdAt: r.createdAt,
    }));
  }

  async getEventsForReader(readerId: string, since?: string): Promise<InteractionEvent[]> {
    const conditions = [eq(interactionEventsTable.readerId, readerId)];
    if (since) {
      conditions.push(gt(interactionEventsTable.createdAt, since));
    }

    const rows = db
      .select()
      .from(interactionEventsTable)
      .where(and(...conditions))
      .orderBy(asc(interactionEventsTable.createdAt))
      .all();

    return rows.map((r) => ({
      id: r.id,
      readerId: r.readerId,
      sessionId: r.sessionId,
      eventType: r.eventType as InteractionEvent["eventType"],
      storyId: r.storyId || undefined,
      articleId: r.articleId || undefined,
      summaryRevisionId: r.summaryRevisionId || undefined,
      dwellTimeMs: r.dwellTimeMs || undefined,
      feedbackReason: r.feedbackReason || undefined,
      metadata: JSON.parse(r.metadataJson || "{}"),
      createdAt: r.createdAt,
    }));
  }

  async getLatestProfile(readerId: string): Promise<InterestProfile | null> {
    const row = db
      .select()
      .from(interestProfilesTable)
      .where(eq(interestProfilesTable.readerId, readerId))
      .orderBy(desc(interestProfilesTable.version))
      .limit(1)
      .get();
    if (!row) return null;
    return {
      version: row.version,
      readerId: row.readerId,
      topicWeights: JSON.parse(row.topicWeightsJson || "{}"),
      sourceAffinities: JSON.parse(row.sourceAffinitiesJson || "{}"),
      explorationFactor: row.explorationFactor / 100,
      confidenceScore: row.confidenceScore,
      updatedAt: row.updatedAt,
    };
  }

  async saveProfile(profile: InterestProfile): Promise<void> {
    const updatedAt = profile.updatedAt || new Date().toISOString();
    db.insert(interestProfilesTable)
      .values({
        version: profile.version,
        readerId: profile.readerId,
        topicWeightsJson: JSON.stringify(profile.topicWeights),
        sourceAffinitiesJson: JSON.stringify(profile.sourceAffinities),
        explorationFactor: Math.round(profile.explorationFactor * 100),
        confidenceScore: profile.confidenceScore,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: interestProfilesTable.version,
        set: {
          topicWeightsJson: JSON.stringify(profile.topicWeights),
          sourceAffinitiesJson: JSON.stringify(profile.sourceAffinities),
          explorationFactor: Math.round(profile.explorationFactor * 100),
          confidenceScore: profile.confidenceScore,
          updatedAt,
        },
      })
      .run();
  }
}

export const repository = new SqliteNewsRepository();
