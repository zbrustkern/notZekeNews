import { NextResponse } from "next/server";
import { runCollection } from "@/lib/ingestion/collector";
import { preseedSources } from "@/lib/ingestion/preseed";
import { repository } from "@/lib/storage/sqlite-repository";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const existingSources = await repository.getSources(true);

    let preseededCount = 0;
    // Auto-preseed if there are no or very few enabled sources
    if (existingSources.length < 2) {
      const preseedResult = await preseedSources(false);
      preseededCount = preseedResult.added.length;
    }

    // Run collection across all enabled sources
    const collectionResults = await runCollection();

    const totalArticles = collectionResults.reduce((sum, r) => sum + r.newArticles, 0);
    const totalStories = collectionResults.reduce((sum, r) => sum + r.newStories, 0);
    const totalFetched = collectionResults.reduce((sum, r) => sum + r.fetchedItems, 0);

    return NextResponse.json({
      success: true,
      sourcesPolled: collectionResults.length,
      preseededSourcesAdded: preseededCount,
      articlesFound: totalArticles,
      newStoriesCreated: totalStories,
      totalItemsFetched: totalFetched,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Feed refresh failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
