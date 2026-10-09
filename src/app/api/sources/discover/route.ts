import { NextRequest, NextResponse } from "next/server";
import { discoverFeed } from "@/lib/ingestion/discover-feed";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required." }, { status: 400 });
    }

    const discovered = await discoverFeed(url);
    return NextResponse.json({ success: true, feed: discovered });
  } catch (err: any) {
    console.error("Feed discovery failed:", err);
    return NextResponse.json({ error: err.message || "Failed to discover feed." }, { status: 400 });
  }
}
