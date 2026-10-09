import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const articlesTable = sqliteTable("articles", {
  id: text("id").primaryKey(),
  canonicalUrl: text("canonical_url").notNull().unique(),
  originalUrl: text("original_url").notNull(),
  title: text("title").notNull(),
  sourceName: text("source_name").notNull(),
  sourceId: text("source_id"),
  author: text("author"),
  publishedAt: text("published_at"),
  discoveredAt: text("discovered_at").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  topicsJson: text("topics_json").notNull().default("[]"),
});

export const storiesTable = sqliteTable("stories", {
  id: text("id").primaryKey(),
  headline: text("headline").notNull(),
  primaryTopic: text("primary_topic").notNull(),
  leadArticleId: text("lead_article_id").notNull(),
  leadSourceName: text("lead_source_name").notNull(),
  leadPublishedAt: text("lead_published_at"),
  leadDiscoveredAt: text("lead_discovered_at").notNull(),
  readOriginalUrl: text("read_original_url").notNull(),
  relatedCoverageJson: text("related_coverage_json").notNull().default("[]"),
  isUserSubmitted: integer("is_user_submitted", { mode: "boolean" }).notNull().default(false),
  userSubmissionNote: text("user_submission_note"),
  rankingScore: integer("ranking_score").default(0),
  updatedAt: text("updated_at").notNull(),
});

export const storyArticlesTable = sqliteTable("story_articles", {
  id: text("id").primaryKey(),
  storyId: text("story_id").notNull(),
  articleId: text("article_id").notNull(),
  isLead: integer("is_lead", { mode: "boolean" }).notNull().default(false),
});

export const summaryRevisionsTable = sqliteTable("summary_revisions", {
  id: text("id").primaryKey(),
  storyId: text("story_id").notNull(),
  version: integer("version").notNull().default(1),
  markdownText: text("markdown_text").notNull(),
  whyItMatters: text("why_it_matters"),
  citationsJson: text("citations_json").notNull().default("[]"),
  evidenceFingerprint: text("evidence_fingerprint").notNull(),
  modelVersion: text("model_version").notNull(),
  revisionReason: text("revision_reason"),
  status: text("status").notNull().default("ready"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const sourcesTable = sqliteTable("sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  feedUrl: text("feed_url").notNull().unique(),
  siteUrl: text("site_url").notNull(),
  category: text("category").notNull(),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  lastPolledAt: text("last_polled_at"),
  lastHttpEtag: text("last_http_etag"),
  lastHttpModified: text("last_http_modified"),
  healthStatus: text("health_status").notNull().default("healthy"),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  articlesCount: integer("articles_count").notNull().default(0),
});

export const submissionsTable = sqliteTable("submissions", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  note: text("note"),
  status: text("status").notNull().default("pending"),
  errorReason: text("error_reason"),
  createdAt: text("created_at").notNull(),
  processedAt: text("processed_at"),
});

export const preferencesTable = sqliteTable("preferences", {
  id: text("id").primaryKey(),
  readerId: text("reader_id").notNull().unique(),
  allowTopicsJson: text("allow_topics_json").notNull().default("[]"),
  blockTopicsJson: text("block_topics_json").notNull().default("[]"),
  preferredSourcesJson: text("preferred_sources_json").notNull().default("[]"),
  blockedSourcesJson: text("blocked_sources_json").notNull().default("[]"),
  steeredTopicsJson: text("steered_topics_json").notNull().default("{}"),
  steeredSourcesJson: text("steered_sources_json").notNull().default("{}"),
  pauseLearning: integer("pause_learning", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull(),
});

export const interactionEventsTable = sqliteTable("interaction_events", {
  id: text("id").primaryKey(),
  readerId: text("reader_id").notNull(),
  sessionId: text("session_id").notNull(),
  eventType: text("event_type").notNull(),
  storyId: text("story_id"),
  articleId: text("article_id"),
  summaryRevisionId: text("summary_revision_id"),
  dwellTimeMs: integer("dwell_time_ms"),
  feedbackReason: text("feedback_reason"),
  metadataJson: text("metadata_json"),
  createdAt: text("created_at").notNull(),
});

export const interestProfilesTable = sqliteTable("interest_profiles", {
  version: integer("version").primaryKey(),
  readerId: text("reader_id").notNull(),
  topicWeightsJson: text("topic_weights_json").notNull().default("{}"),
  sourceAffinitiesJson: text("source_affinities_json").notNull().default("{}"),
  explorationFactor: integer("exploration_factor").notNull().default(10), // stored as integer percentage 10 = 10%
  confidenceScore: integer("confidence_score").notNull().default(50),
  updatedAt: text("updated_at").notNull(),
});

export const collectionRunsTable = sqliteTable("collection_runs", {
  id: text("id").primaryKey(),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
  sourcesPolled: integer("sources_polled").notNull().default(0),
  articlesFound: integer("articles_found").notNull().default(0),
  newStoriesCreated: integer("new_stories_created").notNull().default(0),
  summariesGenerated: integer("summaries_generated").notNull().default(0),
  errorsJson: text("errors_json").notNull().default("[]"),
});
