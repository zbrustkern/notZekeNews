import { NextResponse } from "next/server";
import { repository } from "@/lib/storage/sqlite-repository";
import { scoreStory } from "@/lib/ranking/scorer";

export async function GET() {
  try {
    const rawStories = await repository.getStories(60);
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
