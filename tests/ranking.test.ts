import { describe, it, expect } from "vitest";
import { scoreStory } from "@/lib/ranking/scorer";
import { Story, Preference } from "@/lib/domain/types";

describe("Rule-Based Ranking Scorer", () => {
  const baseStory: Story = {
    id: "story_test_1",
    headline: "Modern SQLite Architectures",
    primaryTopic: "ENGINEERING",
    leadArticleId: "art_1",
    leadSourceName: "Dan Luu",
    leadDiscoveredAt: new Date().toISOString(),
    readOriginalUrl: "https://example.com/test",
    relatedCoverage: [],
    articleIds: ["art_1"],
  };

  const testPreferences: Preference = {
    id: "pref_test",
    readerId: "zeke",
    allowTopics: ["Engineering", "Compilers"],
    blockTopics: ["Celebrity", "Crypto"],
    preferredSources: ["Dan Luu"],
    blockedSources: ["BadBlog"],
    pauseLearning: false,
    updatedAt: new Date().toISOString(),
  };

  it("boosts stories matching explicit allowlist topics and preferred sources", () => {
    const result = scoreStory(baseStory, testPreferences);
    expect(result.isBlocked).toBe(false);
    expect(result.topicScore).toBeGreaterThanOrEqual(30);
    expect(result.sourceScore).toBeGreaterThanOrEqual(25);
    expect(result.total).toBeGreaterThan(100);
  });

  it("strictly filters out stories with blocked topics", () => {
    const blockedStory: Story = {
      ...baseStory,
      primaryTopic: "GENERAL",
      headline: "Latest Celebrity and Crypto News",
    };
    const result = scoreStory(blockedStory, testPreferences);
    expect(result.isBlocked).toBe(true);
    expect(result.total).toBeLessThan(0);
  });

  it("gives bonus points to user-submitted stories", () => {
    const submittedStory: Story = {
      ...baseStory,
      isUserSubmitted: true,
    };
    const result = scoreStory(submittedStory, testPreferences);
    expect(result.submissionBonus).toBe(50);
  });
});
