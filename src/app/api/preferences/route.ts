import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/storage/sqlite-repository";
import { Preference } from "@/lib/domain/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const prefs = await repository.getPreferences("zeke");
  return NextResponse.json(prefs);
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const existing = await repository.getPreferences("zeke");

    const updated: Preference = {
      id: existing?.id || "pref_zeke",
      readerId: "zeke",
      allowTopics: body.allowTopics ?? existing?.allowTopics ?? [],
      blockTopics: body.blockTopics ?? existing?.blockTopics ?? [],
      preferredSources: body.preferredSources ?? existing?.preferredSources ?? [],
      blockedSources: body.blockedSources ?? existing?.blockedSources ?? [],
      pauseLearning: Boolean(body.pauseLearning ?? existing?.pauseLearning ?? false),
      updatedAt: new Date().toISOString(),
    };

    await repository.savePreferences(updated);
    return NextResponse.json({ success: true, preferences: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
