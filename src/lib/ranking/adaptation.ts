import { repository } from "../storage/sqlite-repository";
import { INewsRepository } from "../storage/repository";
import {
  InterestProfile,
  InteractionEvent,
  Preference,
} from "../domain/types";

export const MIN_WEIGHT = 0.3;
export const MAX_WEIGHT = 2.0;
export const BASELINE_WEIGHT = 1.0;
export const DECAY_HALF_LIFE_DAYS = 14;

/**
 * Calculates exponential decay towards 1.0 using a 14-day half-life.
 * Weight moves asymptotically towards 1.0 as time passes.
 */
export function applyDecay(
  weight: number,
  daysElapsed: number,
  halfLifeDays = DECAY_HALF_LIFE_DAYS
): number {
  if (daysElapsed <= 0) return weight;
  const decayFactor = Math.pow(0.5, daysElapsed / halfLifeDays);
  const decayed = BASELINE_WEIGHT + (weight - BASELINE_WEIGHT) * decayFactor;
  return Math.round(decayed * 1000) / 1000;
}

/**
 * Clamps a weight within [MIN_WEIGHT, MAX_WEIGHT] rounded to 2 decimal places.
 */
export function clampWeight(val: number, min = MIN_WEIGHT, max = MAX_WEIGHT): number {
  const rounded = Math.round(val * 100) / 100;
  return Math.max(min, Math.min(max, rounded));
}

/**
 * Checks if a topic or source name matches any entry in a preference list.
 */
export function matchesPreference(val: string, list?: string[]): boolean {
  if (!list || list.length === 0) return false;
  const target = val.toLowerCase().trim();
  return list.some((item) => {
    const itemLower = item.toLowerCase().trim();
    return itemLower === target || target.includes(itemLower) || itemLower.includes(target);
  });
}

/**
 * Extracts target topics and source name for an interaction event.
 */
export async function extractEventTargets(
  event: InteractionEvent,
  repo: INewsRepository = repository
): Promise<{ topics: string[]; sourceName?: string }> {
  const topics: string[] = [];
  let sourceName: string | undefined = undefined;

  // 1. Direct metadata overrides or supplements
  if (event.metadata) {
    if (typeof event.metadata.topic === "string" && event.metadata.topic) {
      topics.push(event.metadata.topic.toLowerCase().trim());
    }
    if (Array.isArray(event.metadata.topics)) {
      for (const t of event.metadata.topics) {
        if (typeof t === "string" && t) {
          topics.push(t.toLowerCase().trim());
        }
      }
    }
    if (typeof event.metadata.sourceName === "string" && event.metadata.sourceName) {
      sourceName = event.metadata.sourceName.toLowerCase().trim();
    } else if (typeof event.metadata.source === "string" && event.metadata.source) {
      sourceName = event.metadata.source.toLowerCase().trim();
    }
  }

  // 2. From Story
  if (event.storyId) {
    const story = await repo.getStoryById(event.storyId);
    if (story) {
      if (story.primaryTopic) {
        topics.push(story.primaryTopic.toLowerCase().trim());
      }
      if (!sourceName && story.leadSourceName) {
        sourceName = story.leadSourceName.toLowerCase().trim();
      }

      // Collect topics from story articles
      for (const artId of story.articleIds || []) {
        const art = await repo.getArticleById(artId);
        if (art) {
          if (art.topics) {
            for (const t of art.topics) {
              if (t) topics.push(t.toLowerCase().trim());
            }
          }
          if (!sourceName && art.sourceName) {
            sourceName = art.sourceName.toLowerCase().trim();
          }
        }
      }
    }
  }

  // 3. From Article directly
  if (event.articleId) {
    const art = await repo.getArticleById(event.articleId);
    if (art) {
      if (art.topics) {
        for (const t of art.topics) {
          if (t) topics.push(t.toLowerCase().trim());
        }
      }
      if (!sourceName && art.sourceName) {
        sourceName = art.sourceName.toLowerCase().trim();
      }
    }
  }

  return {
    topics: Array.from(new Set(topics.filter(Boolean))),
    sourceName: sourceName ? sourceName.trim() : undefined,
  };
}

/**
 * Creates default baseline interest profile (version 1, neutral weights).
 */
export function createBaselineProfile(readerId: string): InterestProfile {
  return {
    version: 1,
    readerId,
    topicWeights: {},
    sourceAffinities: {},
    explorationFactor: 0.1,
    confidenceScore: 50,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Recomputes the reader's adaptive interest profile based on telemetry events,
 * decay kinetics, and explicit preference overrides.
 */
export async function recomputeInterestProfile(
  readerId: string,
  repo: INewsRepository = repository
): Promise<InterestProfile> {
  const existing = await repo.getLatestProfile(readerId);
  const preferences = await repo.getPreferences(readerId);

  // If learning is paused in user preferences, do not adapt
  if (preferences?.pauseLearning) {
    if (existing) return existing;
    const baseline = createBaselineProfile(readerId);
    await repo.saveProfile(baseline);
    return baseline;
  }

  let nextVersion = 1;
  let topicWeights: Record<string, number> = {};
  let sourceAffinities: Record<string, number> = {};
  let baseConfidence = 50;
  let lastUpdatedAt: string | undefined = undefined;

  if (existing) {
    nextVersion = existing.version + 1;
    topicWeights = { ...existing.topicWeights };
    sourceAffinities = { ...existing.sourceAffinities };
    baseConfidence = existing.confidenceScore;
    lastUpdatedAt = existing.updatedAt;

    // Apply 14-day exponential decay towards 1.0 for older inferred weights
    if (lastUpdatedAt) {
      const elapsedMs = Math.max(0, Date.now() - new Date(lastUpdatedAt).getTime());
      const daysElapsed = elapsedMs / (1000 * 3600 * 24);

      if (daysElapsed > 0) {
        for (const [topic, w] of Object.entries(topicWeights)) {
          // Explicit preferences are NEVER decayed
          if (!matchesPreference(topic, preferences?.allowTopics)) {
            topicWeights[topic] = applyDecay(w, daysElapsed, DECAY_HALF_LIFE_DAYS);
          }
        }

        for (const [src, w] of Object.entries(sourceAffinities)) {
          // Explicit preferences are NEVER decayed
          if (!matchesPreference(src, preferences?.preferredSources)) {
            sourceAffinities[src] = applyDecay(w, daysElapsed, DECAY_HALF_LIFE_DAYS);
          }
        }
      }
    }
  }

  // Fetch recent interaction events since last profile update
  const events = repo.getEventsForReader
    ? await repo.getEventsForReader(readerId, lastUpdatedAt)
    : (await repo.getEvents(200)).filter(
        (e) =>
          e.readerId === readerId &&
          (!lastUpdatedAt || new Date(e.createdAt) > new Date(lastUpdatedAt))
      );

  let relevantEventsCount = 0;

  for (const event of events) {
    // Separate relevance votes and reading clicks from summary quality feedback
    if (
      event.eventType === "summary_helpful" ||
      event.eventType === "summary_needs_improvement" ||
      event.eventType === "feed_served" ||
      event.eventType === "story_exposed" ||
      event.eventType === "headline_expanded" ||
      event.eventType === "headline_collapsed" ||
      event.eventType === "summary_active_read"
    ) {
      // Summary quality and exposure telemetry do NOT alter topic or source interest weights
      continue;
    }

    const targets = await extractEventTargets(event, repo);
    const { topics, sourceName } = targets;

    if (event.eventType === "relevance_positive") {
      relevantEventsCount++;

      // Boost associated topics (+0.15), capped at 2.0
      for (const t of topics) {
        if (matchesPreference(t, preferences?.blockTopics)) continue;
        const current = topicWeights[t] ?? BASELINE_WEIGHT;
        topicWeights[t] = clampWeight(current + 0.15);
      }

      // Boost source (+0.10), capped at 2.0
      if (sourceName && !matchesPreference(sourceName, preferences?.blockedSources)) {
        const current = sourceAffinities[sourceName] ?? BASELINE_WEIGHT;
        sourceAffinities[sourceName] = clampWeight(current + 0.1);
      }
    } else if (event.eventType === "relevance_negative") {
      relevantEventsCount++;

      // Reduce associated topics (-0.20), capped at 0.3 minimum
      for (const t of topics) {
        // Explicit preferences take precedence (never overridden by negative feedback)
        if (matchesPreference(t, preferences?.allowTopics)) continue;
        const current = topicWeights[t] ?? BASELINE_WEIGHT;
        topicWeights[t] = clampWeight(current - 0.2);
      }

      // Reduce source (-0.15), capped at 0.3 minimum
      if (sourceName) {
        // Explicit preferences take precedence (never overridden)
        if (matchesPreference(sourceName, preferences?.preferredSources)) continue;
        const current = sourceAffinities[sourceName] ?? BASELINE_WEIGHT;
        sourceAffinities[sourceName] = clampWeight(current - 0.15);
      }
    } else if (event.eventType === "outbound_click") {
      relevantEventsCount++;

      // Weak positive signal (+0.03)
      for (const t of topics) {
        if (matchesPreference(t, preferences?.blockTopics)) continue;
        const current = topicWeights[t] ?? BASELINE_WEIGHT;
        topicWeights[t] = clampWeight(current + 0.03);
      }

      if (sourceName && !matchesPreference(sourceName, preferences?.blockedSources)) {
        const current = sourceAffinities[sourceName] ?? BASELINE_WEIGHT;
        sourceAffinities[sourceName] = clampWeight(current + 0.03);
      }
    }
  }

  // Explicit preferences take precedence: never overridden
  if (preferences) {
    for (const allowed of preferences.allowTopics) {
      const lower = allowed.toLowerCase().trim();
      if (topicWeights[lower] !== undefined && topicWeights[lower] < BASELINE_WEIGHT) {
        topicWeights[lower] = BASELINE_WEIGHT;
      }
    }

    for (const prefSrc of preferences.preferredSources) {
      const lower = prefSrc.toLowerCase().trim();
      if (sourceAffinities[lower] !== undefined && sourceAffinities[lower] < BASELINE_WEIGHT) {
        sourceAffinities[lower] = BASELINE_WEIGHT;
      }
    }

    for (const blocked of preferences.blockTopics) {
      const lower = blocked.toLowerCase().trim();
      topicWeights[lower] = MIN_WEIGHT;
    }

    for (const blkSrc of preferences.blockedSources) {
      const lower = blkSrc.toLowerCase().trim();
      sourceAffinities[lower] = MIN_WEIGHT;
    }
  }

  // Update confidence score based on accumulated feedback
  const updatedConfidence = Math.min(100, Math.max(10, baseConfidence + relevantEventsCount * 2));

  const updatedProfile: InterestProfile = {
    version: nextVersion,
    readerId,
    topicWeights,
    sourceAffinities,
    explorationFactor: 0.1,
    confidenceScore: updatedConfidence,
    updatedAt: new Date().toISOString(),
  };

  await repo.saveProfile(updatedProfile);
  return updatedProfile;
}
