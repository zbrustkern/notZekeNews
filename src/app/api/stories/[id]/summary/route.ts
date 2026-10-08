import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/storage/sqlite-repository";
import { generateStorySummary } from "@/lib/gemini/summary";
import { Article } from "@/lib/domain/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storyId } = await params;
    const story = await repository.getStoryById(storyId);

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    if (story.summaryRevision) {
      return NextResponse.json({ summary: story.summaryRevision });
    }

    // Retrieve member articles
    const articles: Article[] = [];
    for (const artId of story.articleIds) {
      const art = await repository.getArticleById(artId);
      if (art) articles.push(art);
    }

    const summary = await generateStorySummary(story, articles);
    return NextResponse.json({ summary });
  } catch (err: any) {
    console.error("Summary retrieval failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
