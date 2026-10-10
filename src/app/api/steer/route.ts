import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/storage/sqlite-repository";
import { SteeringTier, InteractionEvent } from "@/lib/domain/types";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { targetType, name, tier } = (await request.json()) as {
      targetType: "topic" | "source";
      name: string;
      tier: SteeringTier;
    };

    if (!targetType || !name || !tier) {
      return NextResponse.json({ error: "Missing targetType, name, or tier." }, { status: 400 });
    }

    const prefs = (await repository.getPreferences("zeke")) || {
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

    const trimmedName = name.trim();

    if (targetType === "topic") {
      const steeredTopics = { ...(prefs.steeredTopics || {}) };
      if (tier === "neutral") {
        delete steeredTopics[trimmedName];
      } else {
        steeredTopics[trimmedName] = tier;
      }
      prefs.steeredTopics = steeredTopics;
    } else if (targetType === "source") {
      const steeredSources = { ...(prefs.steeredSources || {}) };
      if (tier === "neutral") {
        delete steeredSources[trimmedName];
      } else {
        steeredSources[trimmedName] = tier;
      }
      prefs.steeredSources = steeredSources;
    }

    prefs.updatedAt = new Date().toISOString();
    await repository.savePreferences(prefs);

    // Log steering interaction event
    const event: InteractionEvent = {
      id: `evt_steer_${crypto.randomUUID()}`,
      readerId: "zeke",
      sessionId: "session_web",
      eventType: tier === "over_index" ? "relevance_positive" : "relevance_negative",
      feedbackReason: `Steered ${targetType} '${trimmedName}' to ${tier}`,
      metadata: { targetType, name: trimmedName, tier },
      createdAt: new Date().toISOString(),
    };
    await repository.logEvent(event);

    return NextResponse.json({
      success: true,
      preferences: prefs,
      message: `Successfully set ${targetType} "${trimmedName}" to ${tier}`,
    });
  } catch (err: any) {
    console.error("Steering failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
