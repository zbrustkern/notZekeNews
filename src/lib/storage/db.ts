import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

function resolveDbPath(): string {
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }

  const isServerless = Boolean(
    process.env.K_SERVICE ||
    process.env.K_REVISION ||
    process.env.FIREBASE_CONFIG ||
    process.env.NODE_ENV === "production"
  );

  if (isServerless) {
    const tmpDir = "/tmp/notzekenews";
    if (!fs.existsSync(tmpDir)) {
      try {
        fs.mkdirSync(tmpDir, { recursive: true });
      } catch {}
    }
    return path.join(tmpDir, "notzekenews.db");
  }

  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, "notzekenews.db");
}

const dbPath = resolveDbPath();
const sqlite = new Database(dbPath);

// Enable WAL mode and 10s busy timeout for concurrent read/write performance
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("busy_timeout = 10000");

export const db = drizzle(sqlite, { schema });

let hasInitialized = false;

// Auto-initialize schema tables if they do not exist
export function initializeDatabase() {
  if (hasInitialized) return;
  try {
    sqlite.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      canonical_url TEXT NOT NULL UNIQUE,
      original_url TEXT NOT NULL,
      title TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_id TEXT,
      author TEXT,
      published_at TEXT,
      discovered_at TEXT NOT NULL,
      content TEXT NOT NULL,
      excerpt TEXT,
      topics_json TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      headline TEXT NOT NULL,
      primary_topic TEXT NOT NULL,
      lead_article_id TEXT NOT NULL,
      lead_source_name TEXT NOT NULL,
      lead_published_at TEXT,
      lead_discovered_at TEXT NOT NULL,
      read_original_url TEXT NOT NULL,
      related_coverage_json TEXT NOT NULL DEFAULT '[]',
      is_user_submitted INTEGER NOT NULL DEFAULT 0,
      user_submission_note TEXT,
      ranking_score INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS story_articles (
      id TEXT PRIMARY KEY,
      story_id TEXT NOT NULL,
      article_id TEXT NOT NULL,
      is_lead INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS summary_revisions (
      id TEXT PRIMARY KEY,
      story_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      markdown_text TEXT NOT NULL,
      why_it_matters TEXT,
      citations_json TEXT NOT NULL DEFAULT '[]',
      evidence_fingerprint TEXT NOT NULL,
      model_version TEXT NOT NULL,
      revision_reason TEXT,
      status TEXT NOT NULL DEFAULT 'ready',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      feed_url TEXT NOT NULL UNIQUE,
      site_url TEXT NOT NULL,
      category TEXT NOT NULL,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      last_polled_at TEXT,
      last_http_etag TEXT,
      last_http_modified TEXT,
      health_status TEXT NOT NULL DEFAULT 'healthy',
      consecutive_failures INTEGER NOT NULL DEFAULT 0,
      articles_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      note TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      error_reason TEXT,
      created_at TEXT NOT NULL,
      processed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS preferences (
      id TEXT PRIMARY KEY,
      reader_id TEXT NOT NULL UNIQUE,
      allow_topics_json TEXT NOT NULL DEFAULT '[]',
      block_topics_json TEXT NOT NULL DEFAULT '[]',
      preferred_sources_json TEXT NOT NULL DEFAULT '[]',
      blocked_sources_json TEXT NOT NULL DEFAULT '[]',
      steered_topics_json TEXT NOT NULL DEFAULT '{}',
      steered_sources_json TEXT NOT NULL DEFAULT '{}',
      pause_learning INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS interaction_events (
      id TEXT PRIMARY KEY,
      reader_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      story_id TEXT,
      article_id TEXT,
      summary_revision_id TEXT,
      dwell_time_ms INTEGER,
      feedback_reason TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS interest_profiles (
      version INTEGER PRIMARY KEY,
      reader_id TEXT NOT NULL,
      topic_weights_json TEXT NOT NULL DEFAULT '{}',
      source_affinities_json TEXT NOT NULL DEFAULT '{}',
      exploration_factor INTEGER NOT NULL DEFAULT 10,
      confidence_score INTEGER NOT NULL DEFAULT 50,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS collection_runs (
      id TEXT PRIMARY KEY,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      sources_polled INTEGER NOT NULL DEFAULT 0,
      articles_found INTEGER NOT NULL DEFAULT 0,
      new_stories_created INTEGER NOT NULL DEFAULT 0,
      summaries_generated INTEGER NOT NULL DEFAULT 0,
      errors_json TEXT NOT NULL DEFAULT '[]'
    );
  `);

  // Safe migration for newly added columns on existing databases
  try {
    sqlite.exec("ALTER TABLE preferences ADD COLUMN steered_topics_json TEXT NOT NULL DEFAULT '{}';");
  } catch {}
  try {
    sqlite.exec("ALTER TABLE preferences ADD COLUMN steered_sources_json TEXT NOT NULL DEFAULT '{}';");
  } catch {}

  // Seed default sources if not present
  try {
    sqlite.exec(`
      INSERT OR IGNORE INTO sources (id, name, feed_url, site_url, category, is_enabled, health_status)
      VALUES
        ('src_marginalrev', 'Marginal Revolution', 'https://marginalrevolution.com/feed', 'https://marginalrevolution.com', 'SYSTEMS', 1, 'healthy'),
        ('src_techcrunch', 'TechCrunch', 'https://techcrunch.com/feed/', 'https://techcrunch.com', 'ENGINEERING', 1, 'healthy'),
        ('src_mittechreview', 'MIT Technology Review', 'https://www.technologyreview.com/feed/', 'https://www.technologyreview.com', 'SCIENCE', 1, 'healthy'),
        ('src_hn', 'Hacker News', 'https://news.ycombinator.com/rss', 'https://news.ycombinator.com', 'SYSTEMS', 1, 'healthy'),
        ('src_danluu', 'Dan Luu', 'https://danluu.com/atom.xml', 'https://danluu.com', 'SYSTEMS', 1, 'healthy'),
        ('src_simon', 'Simon Willison', 'https://simonwillison.net/atom/entries/', 'https://simonwillison.net', 'ENGINEERING', 1, 'healthy'),
        ('src_ars', 'Ars Technica', 'https://feeds.arstechnica.com/arstechnica/index', 'https://arstechnica.com', 'SCIENCE', 1, 'healthy');
    `);
  } catch {}

    hasInitialized = true;
  } catch (err: any) {
    if (err?.code !== "SQLITE_BUSY") {
      console.warn("Database init warning:", err);
    }
  }
}

// Run table creation on import
initializeDatabase();
