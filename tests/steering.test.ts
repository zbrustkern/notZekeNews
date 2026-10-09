import { describe, it, expect } from "vitest";
import { scoreStory } from "@/lib/ranking/scorer";
import { Story, Preference } from "@/lib/domain/types";

describe("4-Tier Steering Engine", () => {
  const sampleStory: Story = {
    id: "story_steer_1",
    headline: "High-performance Vector Compilers",
    primaryTopic: "ENGINEERING",
    leadArticleId: "art_1",
    leadSourceName: "Dan Luu",
    leadDiscoveredAt: new Date().toISOString(),
    readOriginalUrl: "https://example.com/compilers",
    relatedCoverage: [],
    articleIds: ["art_1"],
  };

  const basePreference: Preference = {
    id: "pref_zeke",
    readerId: "zeke",
    allowTopics: [],
    blockTopics: [],
    preferredSources: [],
    blockedSources: [],
    steeredTopics: {},
    steeredSources: {},
    pauseLearning: false,
    updatedAt: new Date().toISOString(),
  };

  it("applies +40 boost when topic is over-indexed", () => {
    const prefs: Preference = {
      ...basePreference,
      steeredTopics: { ENGINEERING: "over_index" },
    };
    const res = scoreStory(sampleStory, prefs);
    expect(res.isBlocked).toBe(false);
    expect(res.topicScore).toBe(40);
    expect(res.explanation).toContain("Over-indexed topic (ENGINEERING: +40)");
  });

  it("applies -40 penalty when topic is under-indexed", () => {
    const prefs: Preference = {
      ...basePreference,
      steeredTopics: { ENGINEERING: "under_index" },
    };
    const res = scoreStory(sampleStory, prefs);
    expect(res.isBlocked).toBe(false);
    expect(res.topicScore).toBe(-40);
    expect(res.explanation).toContain("Under-indexed topic (ENGINEERING: -40)");
  });

  it("strictly filters and excludes story when topic is banned", () => {
    const prefs: Preference = {
      ...basePreference,
      steeredTopics: { ENGINEERING: "banned" },
    };
    const res = scoreStory(sampleStory, prefs);
    expect(res.isBlocked).toBe(true);
    expect(res.total).toBe(-1000);
    expect(res.explanation).toContain("Muted topic: ENGINEERING");
  });

  it("applies +40 boost when source is over-indexed", () => {
    const prefs: Preference = {
      ...basePreference,
      steeredSources: { "Dan Luu": "over_index" },
    };
    const res = scoreStory(sampleStory, prefs);
    expect(res.isBlocked).toBe(false);
    expect(res.sourceScore).toBe(40);
    expect(res.explanation).toContain("Over-indexed source (Dan Luu: +40)");
  });

  it("strictly excludes story when source is banned", () => {
    const prefs: Preference = {
      ...basePreference,
      steeredSources: { "Dan Luu": "banned" },
    };
    const res = scoreStory(sampleStory, prefs);
    expect(res.isBlocked).toBe(true);
    expect(res.total).toBe(-1000);
    expect(res.explanation).toContain("Banned source: Dan Luu");
  });
});
