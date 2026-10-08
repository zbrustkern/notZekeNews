import { db } from "../storage/db";
import {
  articlesTable,
  storiesTable,
  collectionRunsTable,
  interactionEventsTable,
} from "../storage/schema";
import { repository } from "../storage/sqlite-repository";
import { sql, desc } from "drizzle-orm";

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

  // 2. Total articles
  const articleCountRow = db
    .select({ count: sql<number>`count(*)` })
    .from(articlesTable)
    .get();
  const totalArticles = articleCountRow?.count ?? 0;

  // 3. Total stories
  const storyCountRow = db
    .select({ count: sql<number>`count(*)` })
    .from(storiesTable)
    .get();
  const totalStories = storyCountRow?.count ?? 0;

  // 4. Last collection run timestamp
  const lastRun = db
    .select()
    .from(collectionRunsTable)
    .orderBy(desc(collectionRunsTable.startedAt))
    .limit(1)
    .get();

  let lastCollectionRun: string | null = null;
  if (lastRun) {
    lastCollectionRun = lastRun.completedAt || lastRun.startedAt;
  } else {
    // Fallback: check most recent source poll timestamp
    const polledDates = sources
      .map((s) => s.lastPolledAt)
      .filter((d): d is string => Boolean(d));
    if (polledDates.length > 0) {
      polledDates.sort().reverse();
      lastCollectionRun = polledDates[0];
    }
  }

  // 5. Current profile version
  const profile = await repository.getLatestProfile(readerId);
  const currentProfileVersion = profile?.version ?? 1;

  // 6. Interaction event counts
  const rawEvents = db
    .select({ eventType: interactionEventsTable.eventType })
    .from(interactionEventsTable)
    .all();
  const totalEvents = rawEvents.length;
  const byType: Record<string, number> = {};
  for (const ev of rawEvents) {
    byType[ev.eventType] = (byType[ev.eventType] || 0) + 1;
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
