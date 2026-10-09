import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  recomputeInterestProfile,
  applyDecay,
  clampWeight,
  matchesPreference,
  extractEventTargets,
  createBaselineProfile,
} from "@/lib/ranking/adaptation";
import { repository } from "@/lib/storage/sqlite-repository";
import { getSystemHealth } from "@/lib/ops/health";
import { db } from "@/lib/storage/db";
import {
  interactionEventsTable,
  interestProfilesTable,
  preferencesTable,
  storiesTable,
  articlesTable,
} from "@/lib/storage/schema";
import { eq } from "drizzle-orm";
import { Story, Article, InteractionEvent, Preference } from "@/lib/domain/types";

const TEST_READER = "test_reader_m2";
const TEST_STORY_ID = "story_test_m2";
const TEST_ARTICLE_ID = "art_test_m2";

describe("Milestone 2: Adaptive Profile Learning Engine & Telemetry Aggregator", () => {
  const sampleArticle: Article = {
    id: TEST_ARTICLE_ID,
    canonicalUrl: "https://example.com/test-article-m2",
    originalUrl: "https://example.com/test-article-m2",
    title: "Understanding Microkernel Architecture",
    sourceName: "Systems Weekly",
    discoveredAt: new Date().toISOString(),
    content: "Microkernel architectures minimize the in-kernel attack surface...",
    topics: ["SYSTEMS", "SOFTWARE"],
  };

  const sampleStory: Story = {
    id: TEST_STORY_ID,
    headline: "Understanding Microkernel Architecture",
    primaryTopic: "SYSTEMS",
    leadArticleId: TEST_ARTICLE_ID,
    leadSourceName: "Systems Weekly",
    leadDiscoveredAt: new Date().toISOString(),
    readOriginalUrl: "https://example.com/test-article-m2",
    relatedCoverage: [],
    articleIds: [TEST_ARTICLE_ID],
    rankingScore: 75,
  };

  beforeEach(async () => {
    // Clean up test data before each test
    db.delete(interactionEventsTable).where(eq(interactionEventsTable.readerId, TEST_READER)).run();
    db.delete(interestProfilesTable).run();
    db.delete(preferencesTable).where(eq(preferencesTable.readerId, TEST_READER)).run();
    db.delete(storiesTable).where(eq(storiesTable.id, TEST_STORY_ID)).run();
    db.delete(articlesTable).where(eq(articlesTable.id, TEST_ARTICLE_ID)).run();

    // Seed test story & article
    await repository.saveArticle(sampleArticle);
    await repository.saveStory(sampleStory);
  });

  afterEach(async () => {
    // Clean up test artifacts
    db.delete(interactionEventsTable).where(eq(interactionEventsTable.readerId, TEST_READER)).run();
    db.delete(interestProfilesTable).run();
    db.delete(preferencesTable).where(eq(preferencesTable.readerId, TEST_READER)).run();
    db.delete(storiesTable).where(eq(storiesTable.id, TEST_STORY_ID)).run();
    db.delete(articlesTable).where(eq(articlesTable.id, TEST_ARTICLE_ID)).run();
  });

  describe("1. Decay Mechanics Kinetics", () => {
    it("returns unchanged weight when 0 days have elapsed", () => {
      expect(applyDecay(1.4, 0)).toBe(1.4);
      expect(applyDecay(0.6, 0)).toBe(0.6);
      expect(applyDecay(1.0, 0)).toBe(1.0);
    });

    it("halves deviation from 1.0 after 14 days (half-life)", () => {
      // 1.0 + (1.4 - 1.0) * 0.5 = 1.2
      expect(applyDecay(1.4, 14)).toBe(1.2);

      // 1.0 + (0.6 - 1.0) * 0.5 = 0.8
      expect(applyDecay(0.6, 14)).toBe(0.8);

      // 1.0 + (1.0 - 1.0) * 0.5 = 1.0
      expect(applyDecay(1.0, 14)).toBe(1.0);
    });

    it("decays deviation by 75% after 28 days (two half-lives)", () => {
      // 1.0 + (1.4 - 1.0) * 0.25 = 1.1
      expect(applyDecay(1.4, 28)).toBe(1.1);

      // 1.0 + (0.6 - 1.0) * 0.25 = 0.9
      expect(applyDecay(0.6, 28)).toBe(0.9);
    });

    it("clamps weights properly within [0.3, 2.0]", () => {
      expect(clampWeight(2.3)).toBe(2.0);
      expect(clampWeight(0.1)).toBe(0.3);
      expect(clampWeight(1.456)).toBe(1.46);
    });
  });

  describe("2. Positive Relevance Feedback (relevance_positive)", () => {
    it("boosts associated topics by +0.15 and source by +0.10 from baseline 1.0", async () => {
      const event: InteractionEvent = {
        id: `evt_pos_${Date.now()}`,
        readerId: TEST_READER,
        sessionId: "sess_1",
        eventType: "relevance_positive",
        storyId: TEST_STORY_ID,
        createdAt: new Date().toISOString(),
      };
      await repository.logEvent(event);

      const profile = await recomputeInterestProfile(TEST_READER);

      expect(profile.version).toBe(1);
      expect(profile.topicWeights["systems"]).toBe(1.15);
      expect(profile.topicWeights["software"]).toBe(1.15);
      expect(profile.sourceAffinities["systems weekly"]).toBe(1.1);
      expect(profile.confidenceScore).toBeGreaterThan(50);
    });

    it("accumulates multiple positive votes and caps at 2.0", async () => {
      for (let i = 0; i < 15; i++) {
        await repository.logEvent({
          id: `evt_multi_pos_${i}`,
          readerId: TEST_READER,
          sessionId: "sess_1",
          eventType: "relevance_positive",
          storyId: TEST_STORY_ID,
          createdAt: new Date().toISOString(),
        });
      }

      const profile = await recomputeInterestProfile(TEST_READER);

      expect(profile.topicWeights["systems"]).toBe(2.0);
      expect(profile.sourceAffinities["systems weekly"]).toBe(2.0);
    });
  });

  describe("3. Negative Relevance Feedback (relevance_negative)", () => {
    it("reduces associated topics by -0.20 and source by -0.15 from baseline 1.0", async () => {
      const event: InteractionEvent = {
        id: `evt_neg_${Date.now()}`,
        readerId: TEST_READER,
        sessionId: "sess_1",
        eventType: "relevance_negative",
        storyId: TEST_STORY_ID,
        createdAt: new Date().toISOString(),
      };
      await repository.logEvent(event);

      const profile = await recomputeInterestProfile(TEST_READER);

      expect(profile.version).toBe(1);
      expect(profile.topicWeights["systems"]).toBe(0.8);
      expect(profile.topicWeights["software"]).toBe(0.8);
      expect(profile.sourceAffinities["systems weekly"]).toBe(0.85);
    });

    it("accumulates multiple negative votes and caps at 0.3 minimum", async () => {
      for (let i = 0; i < 10; i++) {
        await repository.logEvent({
          id: `evt_multi_neg_${i}`,
          readerId: TEST_READER,
          sessionId: "sess_1",
          eventType: "relevance_negative",
          storyId: TEST_STORY_ID,
          createdAt: new Date().toISOString(),
        });
      }

      const profile = await recomputeInterestProfile(TEST_READER);

      expect(profile.topicWeights["systems"]).toBe(0.3);
      expect(profile.sourceAffinities["systems weekly"]).toBe(0.3);
    });
  });

  describe("4. Outbound Click Feedback (outbound_click)", () => {
    it("provides weak positive signal (+0.03)", async () => {
      const event: InteractionEvent = {
        id: `evt_click_${Date.now()}`,
        readerId: TEST_READER,
        sessionId: "sess_1",
        eventType: "outbound_click",
        storyId: TEST_STORY_ID,
        createdAt: new Date().toISOString(),
      };
      await repository.logEvent(event);

      const profile = await recomputeInterestProfile(TEST_READER);

      expect(profile.topicWeights["systems"]).toBe(1.03);
      expect(profile.sourceAffinities["systems weekly"]).toBe(1.03);
    });
  });

  describe("5. Separation of Summary Feedback from Topic/Source Interest", () => {
    it("does NOT alter topic weights or source affinities on summary_helpful", async () => {
      await repository.logEvent({
        id: `evt_sum_h_${Date.now()}`,
        readerId: TEST_READER,
        sessionId: "sess_1",
        eventType: "summary_helpful",
        storyId: TEST_STORY_ID,
        createdAt: new Date().toISOString(),
      });

      const profile = await recomputeInterestProfile(TEST_READER);

      // Weights remain unmodified at baseline
      expect(profile.topicWeights["systems"]).toBeUndefined();
      expect(profile.sourceAffinities["systems weekly"]).toBeUndefined();
    });

    it("does NOT decrease topic weights or source affinities on summary_needs_improvement", async () => {
      await repository.logEvent({
        id: `evt_sum_ni_${Date.now()}`,
        readerId: TEST_READER,
        sessionId: "sess_1",
        eventType: "summary_needs_improvement",
        storyId: TEST_STORY_ID,
        feedbackReason: "Too vague",
        createdAt: new Date().toISOString(),
      });

      const profile = await recomputeInterestProfile(TEST_READER);

      expect(profile.topicWeights["systems"]).toBeUndefined();
      expect(profile.sourceAffinities["systems weekly"]).toBeUndefined();
    });

    it("applies relevance feedback while ignoring summary feedback in mixed event batches", async () => {
      // 1 summary_needs_improvement (should be ignored for interest weights)
      await repository.logEvent({
        id: `evt_mixed_1_${Date.now()}`,
        readerId: TEST_READER,
        sessionId: "sess_1",
        eventType: "summary_needs_improvement",
        storyId: TEST_STORY_ID,
        createdAt: new Date(Date.now() - 5000).toISOString(),
      });

      // 1 relevance_positive (should boost weights)
      await repository.logEvent({
        id: `evt_mixed_2_${Date.now()}`,
        readerId: TEST_READER,
        sessionId: "sess_1",
        eventType: "relevance_positive",
        storyId: TEST_STORY_ID,
        createdAt: new Date().toISOString(),
      });

      const profile = await recomputeInterestProfile(TEST_READER);

      // Only the +0.15 / +0.10 relevance boost was applied
      expect(profile.topicWeights["systems"]).toBe(1.15);
      expect(profile.sourceAffinities["systems weekly"]).toBe(1.1);
    });
  });

  describe("6. Explicit Preferences Precedence", () => {
    it("never decays explicitly allowed topics or preferred sources towards 1.0", async () => {
      // Configure explicit preferences
      const prefs: Preference = {
        id: `pref_${TEST_READER}`,
        readerId: TEST_READER,
        allowTopics: ["Systems"],
        blockTopics: [],
        preferredSources: ["Systems Weekly"],
        blockedSources: [],
        pauseLearning: false,
        updatedAt: new Date().toISOString(),
      };
      await repository.savePreferences(prefs);

      // Create an existing profile with updatedAt 14 days in the past and elevated weights
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
      await repository.saveProfile({
        version: 1,
        readerId: TEST_READER,
        topicWeights: {
          systems: 1.4, // Explicitly allowed: must NOT decay
          software: 1.4, // Inferred only: MUST decay to 1.2
        },
        sourceAffinities: {
          "systems weekly": 1.4, // Explicitly preferred: must NOT decay
          "other source": 1.4, // Inferred only: MUST decay to 1.2
        },
        explorationFactor: 0.1,
        confidenceScore: 60,
        updatedAt: fourteenDaysAgo,
      });

      const profile = await recomputeInterestProfile(TEST_READER);

      expect(profile.version).toBe(2);
      // Inferred weights decayed from 1.4 to 1.2
      expect(profile.topicWeights["software"]).toBe(1.2);
      expect(profile.sourceAffinities["other source"]).toBe(1.2);

      // Explicit preferences retained their original weights without decay
      expect(profile.topicWeights["systems"]).toBe(1.4);
      expect(profile.sourceAffinities["systems weekly"]).toBe(1.4);
    });

    it("never allows negative votes to override or reduce explicitly allowed topics below 1.0", async () => {
      const prefs: Preference = {
        id: `pref_${TEST_READER}`,
        readerId: TEST_READER,
        allowTopics: ["Systems"],
        blockTopics: [],
        preferredSources: ["Systems Weekly"],
        blockedSources: [],
        pauseLearning: false,
        updatedAt: new Date().toISOString(),
      };
      await repository.savePreferences(prefs);

      // Log negative feedback on this story
      await repository.logEvent({
        id: `evt_neg_override_${Date.now()}`,
        readerId: TEST_READER,
        sessionId: "sess_1",
        eventType: "relevance_negative",
        storyId: TEST_STORY_ID,
        createdAt: new Date().toISOString(),
      });

      const profile = await recomputeInterestProfile(TEST_READER);

      // "systems" and "systems weekly" are explicitly allowed/preferred:
      // they must not be reduced by negative feedback
      expect(profile.topicWeights["systems"]).toBeUndefined();
      expect(profile.sourceAffinities["systems weekly"]).toBeUndefined();

      // But the un-whitelisted "software" topic from the article was reduced
      expect(profile.topicWeights["software"]).toBe(0.8);
    });

    it("prevents boosting blocked topics with positive votes", async () => {
      const prefs: Preference = {
        id: `pref_${TEST_READER}`,
        readerId: TEST_READER,
        allowTopics: [],
        blockTopics: ["Systems"],
        preferredSources: [],
        blockedSources: [],
        pauseLearning: false,
        updatedAt: new Date().toISOString(),
      };
      await repository.savePreferences(prefs);

      await repository.logEvent({
        id: `evt_pos_blocked_${Date.now()}`,
        readerId: TEST_READER,
        sessionId: "sess_1",
        eventType: "relevance_positive",
        storyId: TEST_STORY_ID,
        createdAt: new Date().toISOString(),
      });

      const profile = await recomputeInterestProfile(TEST_READER);

      // "systems" is blocked: should not be boosted
      expect(profile.topicWeights["systems"]).toBe(0.3);
      // "software" wasn't blocked: boosted normally
      expect(profile.topicWeights["software"]).toBe(1.15);
    });

    it("respects pauseLearning flag without modifying profile weights", async () => {
      const prefs: Preference = {
        id: `pref_${TEST_READER}`,
        readerId: TEST_READER,
        allowTopics: [],
        blockTopics: [],
        preferredSources: [],
        blockedSources: [],
        pauseLearning: true, // Learning paused!
        updatedAt: new Date().toISOString(),
      };
      await repository.savePreferences(prefs);

      // Save initial profile
      await repository.saveProfile({
        version: 1,
        readerId: TEST_READER,
        topicWeights: { systems: 1.2 },
        sourceAffinities: {},
        explorationFactor: 0.1,
        confidenceScore: 50,
        updatedAt: new Date().toISOString(),
      });

      // Log positive event
      await repository.logEvent({
        id: `evt_pause_${Date.now()}`,
        readerId: TEST_READER,
        sessionId: "sess_1",
        eventType: "relevance_positive",
        storyId: TEST_STORY_ID,
        createdAt: new Date().toISOString(),
      });

      const profile = await recomputeInterestProfile(TEST_READER);

      // Profile remains untouched
      expect(profile.version).toBe(1);
      expect(profile.topicWeights["systems"]).toBe(1.2);
    });
  });

  describe("7. Profile Versioning Progression", () => {
    it("starts with baseline version 1 and increments sequentially on recomputations", async () => {
      // 1st recomputation: starts baseline version 1
      const p1 = await recomputeInterestProfile(TEST_READER);
      expect(p1.version).toBe(1);

      // Log event
      await repository.logEvent({
        id: `evt_v2_${Date.now()}`,
        readerId: TEST_READER,
        sessionId: "sess_1",
        eventType: "relevance_positive",
        storyId: TEST_STORY_ID,
        createdAt: new Date().toISOString(),
      });

      // 2nd recomputation: version 2
      const p2 = await recomputeInterestProfile(TEST_READER);
      expect(p2.version).toBe(2);

      // 3rd recomputation: version 3
      const p3 = await recomputeInterestProfile(TEST_READER);
      expect(p3.version).toBe(3);
    });
  });

  describe("8. Operational Health Telemetry (src/lib/ops/health.ts)", () => {
    it("aggregates sources, articles, stories, profile version, and event telemetry", async () => {
      await repository.saveSource({
        id: "src_health_test",
        name: "Health Test Source",
        feedUrl: "https://example.com/health-rss",
        siteUrl: "https://example.com",
        category: "SYSTEMS",
        isEnabled: true,
        healthStatus: "healthy",
        consecutiveFailures: 0,
        articlesCount: 1,
      });

      await repository.logEvent({
        id: `evt_health_1_${Date.now()}`,
        readerId: TEST_READER,
        sessionId: "sess_ops",
        eventType: "relevance_positive",
        storyId: TEST_STORY_ID,
        createdAt: new Date().toISOString(),
      });

      await repository.logEvent({
        id: `evt_health_2_${Date.now()}`,
        readerId: TEST_READER,
        sessionId: "sess_ops",
        eventType: "outbound_click",
        storyId: TEST_STORY_ID,
        createdAt: new Date().toISOString(),
      });

      await recomputeInterestProfile(TEST_READER);

      const health = await getSystemHealth(TEST_READER);

      expect(health.status).toBeDefined();
      expect(health.totalSources).toBeGreaterThanOrEqual(1);
      expect(health.sourcesStatus.healthy).toBeGreaterThanOrEqual(1);
      expect(health.totalArticles).toBeGreaterThanOrEqual(1);
      expect(health.totalStories).toBeGreaterThanOrEqual(1);
      expect(health.currentProfileVersion).toBeGreaterThanOrEqual(1);
      expect(health.eventCounts.total).toBeGreaterThanOrEqual(2);
      expect(health.eventCounts.byType["relevance_positive"]).toBeGreaterThanOrEqual(1);
      expect(health.eventCounts.byType["outbound_click"]).toBeGreaterThanOrEqual(1);
    });
  });
});
