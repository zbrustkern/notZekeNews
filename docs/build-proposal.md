# NotZeke News — build proposal

Status: proposed; implementation has not started.

## Purpose

Build a news site for one reader: Zeke. The site should surface articles he would otherwise miss and improve as he reads, provides feedback, and submits examples of things he wishes had appeared in the feed.

Start with an intentionally small product: a fast, text-first feed inspired by Hacker News, a way to add interesting links, and a collection and ranking pipeline that can learn from use. Host it later, once the local workflow is useful.

## Initial experience

### Read the feed

The home page shows a compact numbered list with an orange header, restrained typography, and minimal decoration. Each entry has a linked headline, source domain, publication time when available, and a short optional reason it was selected. The list is ordered by personal relevance with a freshness component. The layout remains readable on a phone.

Provide simple explicit feedback: “More like this” and “Less like this.” An optional “Why this?” explanation can expose the topics or examples that influenced a recommendation. Do not invent public vote counts or community activity for a single-reader site.

There are no native comments, social profiles, public voting, or community moderation in the first version. Store the original source URL; source discussion links can be added later without building a comment system.

### Teach the system with a link

An “Add a link” action accepts a URL and an optional note, such as “I wish I had seen this” or “I like the technical depth, not the company.” It should take only a few seconds.

Save the submission immediately, even if fetching the page fails. Resolve metadata asynchronously, allow corrections, and mark it as an explicit positive example. Extract suggested topics and source preferences for review. A single submitted link should influence the profile without automatically subscribing to every page on that domain.

The submitted article can appear in the feed with an “Added by you” label. Keep it out of discovery-success measurements: the reader already found it elsewhere. Preserve the example even after its feed entry is archived.

### Set interests and sources

A small preferences page supports adding, editing, and removing topics, keywords, source feeds, and exclusions. Initial sources and examples are supplied by Zeke; no interests are assumed in advance. Explicit preferences take precedence over inferred preferences.

Support “Pause learning,” profile reset, and deletion of examples or interaction history. Profile reset should rebuild from the explicitly retained seeds rather than immediately relearning from old events.

## Scope and staged delivery

### Milestone 1: a useful local foundation

- Build the feed, link submission, and preferences views.
- Persist articles, seed examples, sources, and explicit feedback.
- Accept a handful of manually supplied links and RSS/Atom feeds.
- Normalize URLs, deduplicate articles, and handle unavailable pages gracefully.
- Rank with explicit interests, example similarity, and freshness; begin with transparent rules.
- Record feed visibility, outbound clicks, submissions, and explicit feedback.

Acceptance: Zeke can add examples and sources, collect articles on demand, read a ranked feed, submit a missed article, and inspect the stored feedback. Everything works locally with persistent data. No hosting is required.

### Milestone 2: scheduled collection and bounded learning

- Run the collection worker on a configurable schedule.
- Add article enrichment and semantic similarity when enough examples make it useful.
- Recompute a versioned interest profile from explicit seeds and recent behavior.
- Adjust ranking and collection priorities using that profile.
- Include a small configurable exploration allocation so the feed can introduce related interests.
- Show collection health and recommendation explanations.

Acceptance: newly collected articles appear without manual action; feedback changes subsequent recommendations; duplicate runs do not create duplicate entries; failures are visible and retryable; profile changes can be inspected and reversed.

### Milestone 3: deploy and expand carefully

- Choose hosting, scheduling, and production storage based on observed usage.
- Add private access before exposing preferences, history, submissions, or worker controls online.
- Add selected source adapters or bounded search discovery beyond the configured feeds.
- Improve ranking from accumulated feedback and compare it with the initial baseline.
- Consider saved articles, browser shortcuts, and source discussion links if they help daily use.

Acceptance: the deployed site is private, scheduled collection is reliable, stored data is backed up, and the deployment has defined operating and model-spend limits.

## Proposed architecture

Use one repository with a web application, an independently runnable collection worker, and shared storage. This keeps the initial build simple while allowing collection to run outside web requests.

Proposed starting stack: TypeScript, a Next.js web interface, and SQLite for local persistence. Keep database access behind a small shared layer; revisit production storage when choosing a host. Semantic enrichment and embeddings should sit behind provider interfaces so the pipeline works with basic metadata and rules before requiring model calls. These are design proposals, not installed dependencies or commitments to specific versions.

Conceptual structure for the implementation phase:

```text
web/                 Feed, submissions, preferences, private admin views
worker/              Collection runs and scheduled job entry point
core/                URL normalization, extraction, scoring, profile updates
storage/             Schema, migrations, queries
docs/                Product and architecture decisions
```

Only `docs/` exists in this planning pass. Final folder names can follow the framework selected during implementation.

### Collection pipeline

1. Load enabled sources and the current explicit and inferred interests.
2. Allocate the run budget across configured feeds and approved source adapters.
3. Fetch new candidates with per-source limits, timeouts, and backoff.
4. Normalize URLs and identify existing articles before enrichment.
5. Extract title, source, dates, description, and permitted content where available.
6. Derive topics and, optionally, embeddings; cache results to avoid repeated model work.
7. Score relevance, freshness, novelty, and source diversity.
8. Persist candidates and their provenance, then publish the ranked feed.

Start with RSS/Atom and submitted links. General web discovery is a later adapter, not an unrestricted browser agent. Keep source-specific checkpoints so collection requests only what has changed. A failed source must not stop other sources in the run.

Respect source access rules, robots policies where applicable, and rate limits. Do not bypass paywalls or logins. Keep links and metadata when article content cannot be fetched. Treat fetched page text as untrusted material for extraction, never as instructions for the agent. URL fetches must block local/private network destinations, including redirects, and cap response size and processing time.

### Durable records

| Record | Purpose |
| --- | --- |
| Article | Canonical URL, original URL, headline, source, publication/fetch dates, extracted metadata, topics, optional embedding reference |
| Source | Feed or adapter configuration, enabled status, fetch checkpoint, health, limits |
| Example | Submitted URL/article, optional note, explicit labels, creation date |
| Preference | Reader-entered interests, exclusions, and source choices |
| Interaction event | Event ID, article ID, session ID, event type, timestamp, relevant exposure context |
| Feed exposure | Served list and ordering, profile/ranker version, article position, visibility evidence |
| Interest profile | Versioned inferred topics and source affinities, confidence, update time, contributing evidence |
| Collection run | Inputs, profile version, candidates, outcomes, failures, retries, duration, model usage |

Use a stable reader ID from the start, while keeping the product single-user. Track discovery provenance so an article can belong to multiple sources without appearing multiple times. Begin with canonical URL matching; add content/title similarity for syndication and near duplicates as needed. Publication time and discovery time are distinct; an unknown publication date must remain unknown.

## Telemetry and the learning loop

Telemetry exists to personalize the feed and diagnose its behavior. Avoid collecting unrelated browsing history, page contents from other sites, or detailed mouse movement.

### Signals to record

| Signal | Interpretation and limit |
| --- | --- |
| Feed served | Records what the system offered; serving an item does not prove it was seen |
| Article visibly exposed | Records viewport visibility and position; apply a documented visibility-duration threshold |
| Outbound click | Weak positive interest; it does not prove the article was read or enjoyed |
| Return to feed / feed active time | Optional engagement context; exclude hidden-tab time and do not treat elapsed time as article reading time |
| More like this / less like this | Strong explicit relevance signal |
| Submitted example and note | Strong positive seed with context about what was interesting |
| Preference/source edit | Direct instruction that overrides inferred preference |

Opening an external article does not give this site visibility into reading behavior on that domain. Do not promise accurate external dwell time or scroll depth. A missed click is not a dislike, even if an article was visible. Record event IDs and deduplicate retries so repeated deliveries do not inflate interest.

### How adaptation works

1. Extract a starting profile from the reader's topics and positive examples, with editable suggestions.
2. Rank candidates using explicit constraints first, then similarity to examples, inferred interests, freshness, novelty, and diversity.
3. Aggregate feedback periodically into bounded topic and source adjustments. Weight explicit feedback much more strongly than clicks.
4. Decay old inferred signals so interests can change. Cap the effect of repeated clicks and retain explicit preferences until edited.
5. Persist a new profile version with its evidence and confidence; use it for the next feed ranking and collection run.
6. Increase fetch priority for useful configured sources and generate possible new source/search suggestions from supported interests.
7. In a later discovery phase, try a limited number of relevant new sources within the same run budget. Keep source additions inspectable and reversible.

“Self-learning” initially means updating the stored profile, retrieval priorities, and ranking weights. It does not require retraining a foundation model or letting an agent rewrite its own code. Early behavior should be explainable enough to debug when the feed gets worse.

Reserve a small exploration share and limit domination by one source or topic. Store rank position and exposure context so popularity caused by high placement is not mistaken for stronger preference. Avoid making strong changes from sparse data. Keep a freshness-based baseline for comparison, and allow rollback to earlier profile versions.

### What success looks like

The main outcome is whether Zeke finds more articles he considers worth reading, with less effort finding them elsewhere. Inspect explicit positive/negative feedback, discovered versus submitted articles, repeated-topic complaints, and source diversity alongside clicks per visible exposure. Click rate alone is insufficient and can reward sensational headlines.

For the cold start, use a suggested handful of sources and roughly 10–20 examples if available; fewer are enough to begin. Use a short manual review of the top feed results before introducing complex optimization. Larger statistical experiments are unnecessary until there is enough feedback to support them.

## Data controls and operations

Store personalization data locally first. Before deployment, add authentication and authorization for the feed, submissions, profile, events, and operational endpoints. Avoid logging secret URLs or tokens, and keep credentials outside the repository.

Proposed retention: keep raw interaction events for 90 days and longer-lived aggregates/profile versions until deleted. Make the period configurable. Submitted examples and explicit preferences remain until removed. Provide export, history deletion, and profile reset; deletion must also remove or recompute affected derived profile data.

If a model service is used, document which article text and preference context leave the application. Send the minimum needed for the task. Do not send raw click history by default.

Set collection, extraction, and model budgets per run. Prevent overlapping runs; use idempotent writes and recoverable job states. A small operational view shows last successful collection, source failures, pending submissions, profile version, and model usage. Failed fetching should preserve a submitted URL and its note. Failed enrichment should fall back to basic ranking.

## Validation during implementation

- Verify the complete path from adding a seed to collecting, ranking, clicking, and adapting the next feed.
- Check normalization and duplicate handling, including tracking parameters and multiple source references.
- Check that retries do not duplicate articles or feedback, and that overlapping runs are prevented.
- Verify explicit exclusions override inferred interest and sparse/no-click feedback does not create false dislikes.
- Verify stale/hidden feed tabs do not generate misleading exposure or engagement events.
- Verify pause, reset, deletion, and profile rollback affect later recommendations as intended.
- Verify source timeouts, malformed feeds, hostile page text, redirects to private networks, and enrichment failures are contained.
- Inspect the feed on desktop and mobile for the intended compact, readable style.

## Decisions to resolve before their implementation milestone

The proposal assumes a private, single-reader product with outbound article links. Before Milestone 1, collect the initial interests, exclusions, example links, and sources. During Milestone 2, tune collection frequency, freshness expectations, and exploration from actual use. Before Milestone 3, choose the host, access method, backups, and operating budget. Choose a model provider only when semantic enrichment is needed and its data handling and cost are understood.

The next implementation step, once this proposal is approved, is Milestone 1. This repository currently provides the documentation foundation only.
