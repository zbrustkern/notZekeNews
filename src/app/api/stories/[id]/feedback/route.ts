import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/storage/sqlite-repository";
import { InteractionEvent } from "@/lib/domain/types";
import crypto from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storyId } = await params;
    const body = await request.json();
    const { feedbackType, reason, summaryRevisionId } = body;

    const event: InteractionEvent = {
      id: `evt_${crypto.randomUUID()}`,
      readerId: "zeke",
      sessionId: "session_web",
      eventType: feedbackType,
      storyId,
      summaryRevisionId,
      feedbackReason: reason,
      createdAt: new Date().toISOString(),
    };

    await repository.logEvent(event);

    // If relevance feedback, adjust story ranking score immediately
    if (feedbackType === "relevance_positive") {
      const story = await repository.getStoryById(storyId);
      if (story) {
        await repository.updateStoryScore(storyId, (story.rankingScore || 50) + 15);
      }
    } else if (feedbackType === "relevance_negative") {
      const story = await repository.getStoryById(storyId);
      if (story) {
        await repository.updateStoryScore(storyId, Math.max(0, (story.rankingScore || 50) - 20));
      }
    }

    return NextResponse.json({ success: true, eventId: event.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
