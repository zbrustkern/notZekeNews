export type TopicCategory =
  | "ENGINEERING"
  | "SCIENCE"
  | "SYSTEMS"
  | "MAKING"
  | "ESSAYS"
  | "SOFTWARE"
  | "HARDWARE"
  | "GENERAL";

export interface Article {
  id: string;
  canonicalUrl: string;
  originalUrl: string;
  title: string;
  sourceName: string;
  sourceId?: string;
  author?: string;
  publishedAt?: string;
  discoveredAt: string;
  content: string;
  excerpt?: string;
  topics: string[];
}

export interface Citation {
  index: number; // [1], [2], etc.
  articleId: string;
  sourceName: string;
  url: string;
  claimExcerpt: string;
}

export type SummaryStatus =
  | "ready"
  | "preparing"
  | "unavailable"
  | "new_evidence_pending"
  | "stale";

export interface SummaryRevision {
  id: string;
  storyId: string;
  version: number;
  markdownText: string;
  whyItMatters?: string;
  citations: Citation[];
  evidenceFingerprint: string;
  modelVersion: string;
  revisionReason?: string;
  status: SummaryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RelatedCoverage {
  label: string;
  url: string;
  sourceName: string;
}

export interface Story {
  id: string;
  headline: string;
  primaryTopic: TopicCategory;
  leadArticleId: string;
  leadSourceName: string;
  leadPublishedAt?: string;
  leadDiscoveredAt: string;
  readOriginalUrl: string;
  relatedCoverage: RelatedCoverage[];
  articleIds: string[];
  summaryRevision?: SummaryRevision;
  isUserSubmitted?: boolean;
  userSubmissionNote?: string;
  rankingScore?: number;
  discoverySource?: string;
}

export interface Source {
  id: string;
  name: string;
  feedUrl: string;
  siteUrl: string;
  category: TopicCategory;
  isEnabled: boolean;
  lastPolledAt?: string;
  lastHttpEtag?: string;
  lastHttpModified?: string;
  healthStatus: "healthy" | "failing" | "paused";
  consecutiveFailures: number;
  articlesCount: number;
}

export interface Submission {
  id: string;
  url: string;
  note?: string;
  status: "pending" | "processed" | "failed";
  errorReason?: string;
  createdAt: string;
  processedAt?: string;
}

export interface Preference {
  id: string;
  readerId: string;
  allowTopics: string[];
  blockTopics: string[];
  preferredSources: string[];
  blockedSources: string[];
  pauseLearning: boolean;
  updatedAt: string;
}

export type InteractionEventType =
  | "feed_served"
  | "story_exposed"
  | "headline_expanded"
  | "headline_collapsed"
  | "summary_active_read"
  | "outbound_click"
  | "relevance_positive"
  | "relevance_negative"
  | "summary_helpful"
  | "summary_needs_improvement";

export interface InteractionEvent {
  id: string;
  readerId: string;
  sessionId: string;
  eventType: InteractionEventType;
  storyId?: string;
  articleId?: string;
  summaryRevisionId?: string;
  dwellTimeMs?: number;
  feedbackReason?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface InterestProfile {
  version: number;
  readerId: string;
  topicWeights: Record<string, number>; // e.g. { "systems": 1.4, "ai": 0.8 }
  sourceAffinities: Record<string, number>;
  explorationFactor: number; // Default 0.10 (10%)
  confidenceScore: number;
  updatedAt: string;
}

export interface CollectionRun {
  id: string;
  startedAt: string;
  completedAt?: string;
  sourcesPolled: number;
  articlesFound: number;
  newStoriesCreated: number;
  summariesGenerated: number;
  errors: string[];
}
