import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/storage/sqlite-repository";
import { recomputeInterestProfile, createBaselineProfile } from "@/lib/ranking/adaptation";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const readerId = searchParams.get("readerId") || "zeke";

    const profile = await repository.getLatestProfile(readerId);
    if (!profile) {
      const baseline = createBaselineProfile(readerId);
      return NextResponse.json({
        version: baseline.version,
        weights: baseline.topicWeights,
        topicWeights: baseline.topicWeights,
        sourceAffinities: baseline.sourceAffinities,
        confidenceScore: baseline.confidenceScore,
        explorationFactor: baseline.explorationFactor,
        updatedAt: baseline.updatedAt,
      });
    }

    return NextResponse.json({
      version: profile.version,
      weights: profile.topicWeights,
      topicWeights: profile.topicWeights,
      sourceAffinities: profile.sourceAffinities,
      confidenceScore: profile.confidenceScore,
      explorationFactor: profile.explorationFactor,
      updatedAt: profile.updatedAt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let readerId = "zeke";
    try {
      const body = await request.json();
      if (body?.readerId) {
        readerId = body.readerId;
      }
    } catch {
      // Body is optional; fallback to default reader "zeke"
    }

    const updatedProfile = await recomputeInterestProfile(readerId);

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      version: updatedProfile.version,
      weights: updatedProfile.topicWeights,
      topicWeights: updatedProfile.topicWeights,
      sourceAffinities: updatedProfile.sourceAffinities,
      confidenceScore: updatedProfile.confidenceScore,
      updatedAt: updatedProfile.updatedAt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
