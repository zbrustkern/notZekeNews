import { NextResponse } from "next/server";
import { preseedSources } from "@/lib/ingestion/preseed";
import { pollSource } from "@/lib/ingestion/collector";

export async function POST() {
  try {
    const result = await preseedSources(false);

    if (result.added.length > 0) {
      Promise.allSettled(result.added.map((s) => pollSource(s))).catch((err) => {
        console.warn("Background poll error during preseed:", err);
      });
    }

    return NextResponse.json({
      success: true,
      addedCount: result.added.length,
      addedSources: result.added.map((s) => ({ name: s.name, feedUrl: s.feedUrl, category: s.category })),
      existingSources: result.existing.map((s) => s.name),
      message: "Preseed sources registered. Background collection started.",
    });
  } catch (err: any) {
    console.error("Failed to run preseed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
