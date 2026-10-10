import { NextResponse } from "next/server";
import { repository } from "@/lib/storage/sqlite-repository";
import { scoreStory } from "@/lib/ranking/scorer";
import { preseedSources } from "@/lib/ingestion/preseed";

export async function GET() {
  try {
    let rawStories = await repository.getStories(60);
    if (rawStories.length === 0) {
      try {
        const { added } = await preseedSources(false);
        if (added.length > 0) {
          import("@/lib/ingestion/collector").then(({ pollSource }) => {
            Promise.allSettled(added.map((src) => pollSource(src))).catch((err) => {
              console.warn("Background preseed poll warning:", err);
            });
          });
        }
      } catch (err) {
        console.warn("Auto-preseed warning on empty feed:", err);
      }
    }

    const preferences = await repository.getPreferences("zeke");
    const profile = await repository.getLatestProfile("zeke");

    // Score and filter stories
    const scoredStories = rawStories
      .map((story) => {
        const breakdown = scoreStory(story, preferences, profile);
        return {
          ...story,
          rankingScore: breakdown.total,
          rankingExplanation: breakdown.explanation,
          isBlocked: breakdown.isBlocked,
        };
      })
      .filter((s) => !s.isBlocked)
      .sort((a, b) => (b.rankingScore || 0) - (a.rankingScore || 0));

    return NextResponse.json({
      stories: scoredStories,
      lastCollectedAt: scoredStories[0]?.leadDiscoveredAt || new Date().toISOString(),
      preferences,
    });
  } catch (err: any) {
    console.error("Failed to load feed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
