import { NextResponse } from "next/server";
import { preseedSources } from "@/lib/ingestion/preseed";

export async function POST() {
  try {
    const result = await preseedSources(true);
    return NextResponse.json({
      success: true,
      addedCount: result.added.length,
      addedSources: result.added.map((s) => ({ name: s.name, feedUrl: s.feedUrl, category: s.category })),
      existingSources: result.existing.map((s) => s.name),
    });
  } catch (err: any) {
    console.error("Failed to run preseed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
