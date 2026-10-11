import { repository } from "../storage/sqlite-repository";

export interface SourcesHealth {
  total: number;
  healthy: number;
  failing: number;
  paused: number;
}

export interface EventCounts {
  total: number;
  byType: Record<string, number>;
}

export interface SystemHealthMetrics {
  status: "healthy" | "degraded" | "failing";
  totalSources: number;
  healthySources: number;
  failingSources: number;
  pausedSources: number;
  sourcesStatus: SourcesHealth;
  totalArticles: number;
  totalStories: number;
  lastCollectionRun: string | null;
  lastCollectionRunTimestamp: string | null;
  currentProfileVersion: number;
  eventCounts: EventCounts;
  timestamp: string;
}

/**
 * Aggregates operational health telemetry and system performance metrics.
 */
export async function getSystemHealth(readerId = "zeke"): Promise<SystemHealthMetrics> {
  // 1. Sources metrics (include both enabled and disabled)
  const sources = await repository.getSources(false);
  const totalSources = sources.length;
  const healthySources = sources.filter((s) => s.healthStatus === "healthy").length;
  const failingSources = sources.filter((s) => s.healthStatus === "failing").length;
  const pausedSources = sources.filter((s) => s.healthStatus === "paused").length;

  const sourcesStatus: SourcesHealth = {
    total: totalSources,
    healthy: healthySources,
    failing: failingSources,
    paused: pausedSources,
  };

  // Determine aggregate system status
  let status: "healthy" | "degraded" | "failing" = "healthy";
  if (failingSources > 0) {
    status = failingSources === totalSources && totalSources > 0 ? "failing" : "degraded";
  }

  // 2. Stories and articles
  const stories = await repository.getStories(1000);
  const totalStories = stories.length;
  const distinctArticleIds = new Set(stories.flatMap((s) => s.articleIds));
  const totalArticles = Math.max(distinctArticleIds.size, totalStories);

  // 3. Last collection run timestamp
  let lastCollectionRun: string | null = null;
  const polledDates = sources
    .map((s) => s.lastPolledAt)
    .filter((d): d is string => Boolean(d));
  if (polledDates.length > 0) {
    polledDates.sort().reverse();
    lastCollectionRun = polledDates[0];
  }

  // 4. Current profile version
  const profile = await repository.getLatestProfile(readerId);
  const currentProfileVersion = profile?.version ?? 1;

  // 5. Interaction event counts
  const events = await repository.getEvents(1000);
  const totalEvents = events.length;
  const byType: Record<string, number> = {};
  for (const ev of events) {
    if (ev.eventType) {
      byType[ev.eventType] = (byType[ev.eventType] || 0) + 1;
    }
  }

  const eventCounts: EventCounts = {
    total: totalEvents,
    byType,
  };

  return {
    status,
    totalSources,
    healthySources,
    failingSources,
    pausedSources,
    sourcesStatus,
    totalArticles,
    totalStories,
    lastCollectionRun,
    lastCollectionRunTimestamp: lastCollectionRun,
    currentProfileVersion,
    eventCounts,
    timestamp: new Date().toISOString(),
  };
}
