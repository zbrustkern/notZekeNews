import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from "crypto";
import { Story, Article, SummaryRevision, Citation } from "../domain/types";
import { repository } from "../storage/sqlite-repository";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Computes an SHA-256 fingerprint from the combined texts of the story's articles.
 */
export function computeEvidenceFingerprint(articles: Article[]): string {
  const combined = articles.map((a) => `${a.id}:${a.title}:${a.content.slice(0, 5000)}`).join("||");
  return crypto.createHash("sha256").update(combined).digest("hex");
}

export interface SummaryGenerationResult {
  summaryText: string;
  whyItMatters: string;
  citations: Citation[];
}

/**
 * Generates an evidence-grounded summary with bracketed citations using Gemini.
 */
export async function generateStorySummary(
  story: Story,
  articles: Article[]
): Promise<SummaryRevision> {
  const fingerprint = computeEvidenceFingerprint(articles);

  // Check if an existing ready summary with the identical fingerprint exists
  const existingSummary = await repository.getSummaryRevisionByStoryId(story.id);
  if (
    existingSummary &&
    existingSummary.evidenceFingerprint === fingerprint &&
    existingSummary.status === "ready"
  ) {
    return existingSummary;
  }

  // If no source text is available or articles are empty
  const validArticles = articles.filter((a) => a.content && a.content.trim().length > 50);
  if (validArticles.length === 0) {
    const unavailableRevision: SummaryRevision = {
      id: `sum_${crypto.randomUUID()}`,
      storyId: story.id,
      version: (existingSummary?.version || 0) + 1,
      markdownText: "Summary unavailable — source text could not be extracted or is behind access controls.",
      citations: [],
      evidenceFingerprint: fingerprint,
      modelVersion: "system-fallback",
      revisionReason: "Insufficient source content",
      status: "unavailable",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await repository.saveSummaryRevision(unavailableRevision);
    return unavailableRevision;
  }

  // Offline / missing API key fallback mode
  if (!genAI) {
    const firstArticle = validArticles[0];
    const offlineRevision: SummaryRevision = {
      id: `sum_${crypto.randomUUID()}`,
      storyId: story.id,
      version: (existingSummary?.version || 0) + 1,
      markdownText: `${firstArticle.excerpt || firstArticle.content.slice(0, 180)}... [1]`,
      whyItMatters: "Local preview summary generated without GEMINI_API_KEY. Configure key for LLM briefs. [1]",
      citations: [
        {
          index: 1,
          articleId: firstArticle.id,
          sourceName: firstArticle.sourceName,
          url: firstArticle.canonicalUrl,
          claimExcerpt: firstArticle.title,
        },
      ],
      evidenceFingerprint: fingerprint,
      modelVersion: "offline-mock",
      revisionReason: "Local development fallback",
      status: "ready",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await repository.saveSummaryRevision(offlineRevision);
    return offlineRevision;
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.1, // Grounded, low hallucination
      maxOutputTokens: 500,
      responseMimeType: "application/json",
    },
  });

  const sourcesEvidence = validArticles
    .map((a, idx) => `[${idx + 1}] Title: ${a.title}\nSource: ${a.sourceName}\nURL: ${a.canonicalUrl}\nText:\n${a.content.slice(0, 3000)}`)
    .join("\n\n---\n\n");

  const prompt = `You are the lead technical editor for NotZeke News, an elite news briefing for an engineering leader.
Write a concise, factual summary (80-150 words) based STRICTLY on the retrieved sources below.

REQUIREMENTS:
1. State clearly what happened or what is explained.
2. Ground all facts with bracketed citations matching source indices (e.g. [1], [2]).
3. Provide a separate "why_it_matters" context explaining significance or key limitations/unknowns.
4. If sources disagree, describe the disagreement neutrally.
5. If only one source exists, attribute findings specifically to that source.
6. DO NOT invent facts not present in the provided evidence.

Output JSON matching this schema:
{
  "summary_text": "string with [1], [2] citations",
  "why_it_matters": "string explaining technical significance or caveats with [1] citations",
  "cited_sources": [
    {
      "index": 1,
      "source_name": "string",
      "url": "string",
      "claim_excerpt": "short quote supporting citation"
    }
  ]
}

SOURCES EVIDENCE:
${sourcesEvidence}
`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);

    const citations: Citation[] = (parsed.cited_sources || []).map((cs: any) => {
      const art = validArticles[cs.index - 1] || validArticles[0];
      return {
        index: cs.index,
        articleId: art.id,
        sourceName: cs.source_name || art.sourceName,
        url: cs.url || art.canonicalUrl,
        claimExcerpt: cs.claim_excerpt || art.title,
      };
    });

    const revision: SummaryRevision = {
      id: `sum_${crypto.randomUUID()}`,
      storyId: story.id,
      version: (existingSummary?.version || 0) + 1,
      markdownText: parsed.summary_text,
      whyItMatters: parsed.why_it_matters,
      citations,
      evidenceFingerprint: fingerprint,
      modelVersion: "gemini-2.5-flash",
      revisionReason: existingSummary ? "Updated with new evidence" : "Initial generation",
      status: "ready",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await repository.saveSummaryRevision(revision);
    return revision;
  } catch (err: any) {
    console.error("Gemini summary generation failed:", err);
    const failureRevision: SummaryRevision = {
      id: `sum_${crypto.randomUUID()}`,
      storyId: story.id,
      version: (existingSummary?.version || 0) + 1,
      markdownText: "Temporary generation issue. Please click retry or read original sources directly.",
      citations: [],
      evidenceFingerprint: fingerprint,
      modelVersion: "gemini-2.5-flash",
      revisionReason: `Generation error: ${err.message}`,
      status: "unavailable",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await repository.saveSummaryRevision(failureRevision);
    return failureRevision;
  }
}
