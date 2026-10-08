import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/storage/sqlite-repository";
import { Submission, Story, Article } from "@/lib/domain/types";
import { normalizeUrl, safeFetchText } from "@/lib/ingestion/fetcher";
import { extractArticleContent } from "@/lib/ingestion/collector";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { url, note } = await request.json();

    if (!url || !url.startsWith("http")) {
      return NextResponse.json({ error: "A valid HTTP(S) URL is required." }, { status: 400 });
    }

    const canonicalUrl = normalizeUrl(url);
    const subId = `sub_${crypto.randomUUID()}`;

    // 1. Save submission record optimistically
    const submission: Submission = {
      id: subId,
      url: canonicalUrl,
      note,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    await repository.saveSubmission(submission);

    // 2. Fetch and extract metadata
    let title = "Submitted Link";
    let content = "";
    let excerpt = "";
    let hostname = "External Link";

    try {
      const parsedUrl = new URL(canonicalUrl);
      hostname = parsedUrl.hostname.replace("www.", "");
      const html = await safeFetchText(canonicalUrl, 6000, 1024 * 1024);
      const extracted = extractArticleContent(html, hostname);
      title = extracted.title || hostname;
      content = extracted.content;
      excerpt = extracted.excerpt;
    } catch (err: any) {
      console.warn("Could not fetch page body for submission, using URL:", err.message);
      title = `${hostname} submission`;
    }

    const articleId = `art_sub_${crypto.createHash("md5").update(canonicalUrl).digest("hex").slice(0, 12)}`;
    const article: Article = {
      id: articleId,
      canonicalUrl,
      originalUrl: url,
      title,
      sourceName: hostname,
      publishedAt: new Date().toISOString(),
      discoveredAt: new Date().toISOString(),
      content,
      excerpt,
      topics: ["ENGINEERING"],
    };
    await repository.saveArticle(article);

    // 3. Create Story labeled "Added by you"
    const storyId = `story_sub_${articleId.replace("art_sub_", "")}`;
    const newStory: Story = {
      id: storyId,
      headline: title,
      primaryTopic: "ENGINEERING",
      leadArticleId: articleId,
      leadSourceName: hostname,
      leadPublishedAt: new Date().toISOString(),
      leadDiscoveredAt: new Date().toISOString(),
      readOriginalUrl: canonicalUrl,
      relatedCoverage: [],
      articleIds: [articleId],
      isUserSubmitted: true,
      userSubmissionNote: note,
      rankingScore: 120, // High boost for user submissions
    };

    await repository.saveStory(newStory);
    await repository.updateSubmissionStatus(subId, "processed");

    return NextResponse.json({
      success: true,
      submission,
      story: newStory,
    });
  } catch (err: any) {
    console.error("Submission failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
