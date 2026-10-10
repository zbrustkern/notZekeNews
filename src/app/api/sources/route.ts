import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/storage/sqlite-repository";
import { Source, TopicCategory, SteeringTier } from "@/lib/domain/types";
import { pollSource } from "@/lib/ingestion/collector";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sources = await repository.getSources(false);
    const prefs = await repository.getPreferences("zeke");
    const steeredSources = prefs?.steeredSources || {};

    const enriched = sources.map((src) => ({
      ...src,
      steeringTier: (steeredSources[src.name] || "neutral") as SteeringTier,
    }));

    return NextResponse.json({ sources: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, feedUrl, siteUrl, category, initialTier } = body as {
      name: string;
      feedUrl: string;
      siteUrl?: string;
      category?: TopicCategory;
      initialTier?: SteeringTier;
    };

    if (!name || !feedUrl) {
      return NextResponse.json({ error: "Name and Feed URL are required." }, { status: 400 });
    }

    const sourceId = `src_${crypto.createHash("md5").update(feedUrl).digest("hex").slice(0, 10)}`;

    const newSource: Source = {
      id: sourceId,
      name: name.trim(),
      feedUrl: feedUrl.trim(),
      siteUrl: (siteUrl || feedUrl).trim(),
      category: category || "ENGINEERING",
      isEnabled: true,
      healthStatus: "healthy",
      consecutiveFailures: 0,
      articlesCount: 0,
    };

    await repository.saveSource(newSource);

    // Save initial steering tier if specified
    if (initialTier && initialTier !== "neutral") {
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
      prefs.steeredSources = {
        ...(prefs.steeredSources || {}),
        [newSource.name]: initialTier,
      };
      prefs.updatedAt = new Date().toISOString();
      await repository.savePreferences(prefs);
    }

    // Trigger initial poll in background
    pollSource(newSource).catch((err) => {
      console.warn("Initial poll for newly added source completed with warnings:", err);
    });

    return NextResponse.json({ success: true, source: newSource });
  } catch (err: any) {
    console.error("Save source failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Source ID is required." }, { status: 400 });
    }

    await repository.deleteSource(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
