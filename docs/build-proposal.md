# NotZeke News — build proposal

Status: proposed; implementation has not started.

## Purpose

Build a news site for one reader: Zeke. The site should surface articles he would otherwise miss and improve as he reads, provides feedback, and submits examples of things he wishes had appeared in the feed.

Start with an intentionally small product: a fast, text-first feed with Techmeme-inspired story groups and source links, a way to add interesting links, and a collection and ranking pipeline that can learn from use. Keep Hacker News's content breadth as the editorial inspiration, including technical writing, projects, science, and thoughtful essays alongside current news. Headline clicks expand agent-written summaries inline. Host it later, once the local workflow is useful.

## Initial experience

### Read the feed

The home page shows compact story groups: a prominent headline, lead source attribution, publication/update time, and a short row of related coverage links. Use a warm ivory background, dark ink serif headlines, dark teal source links, quiet separators, and clean sans-serif metadata. A restrained burnt-orange brand accent and pale sage summary inset add visual character; see the revised visual concepts in the interaction design. The unit of the feed is a story, which can contain one or several articles. Rank stories by personal relevance with freshness and diversity components. Older technical articles and essays remain eligible when useful; distinguish original publication date from discovery date.

Clicking a headline or its chevron expands the story directly beneath it, without leaving the feed. The expansion contains an agent-written summary, linked citations, relevant context, and an update timestamp. A second click collapses it. Source names and “Read original” remain ordinary outbound links. The headline is an accessible disclosure button, visually distinct from source links, so one action never both expands and navigates. See [the interaction design](interaction-design.md) for the layout, states, and behavior.

A dedicated summary-agent role writes and revises these summaries from retrieved evidence. Start with a short, cited account of what happened; later versions incorporate meaningful new reporting, corrections, and explicit feedback on summary quality. Personalization may adjust depth and context, but must not change the underlying facts.

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
- Persist stories, their source articles, seed examples, sources, explicit feedback, and versioned summaries.
- Accept a handful of manually supplied links and RSS/Atom feeds.
- Normalize URLs, deduplicate articles, and handle unavailable pages gracefully. Begin with one article per story; group additional coverage only when evidence supports the same event or subject, preserving distinct developments.
- Rank with explicit interests, example similarity, and freshness; begin with transparent rules.
- Add headline disclosure, source links, and a cached, cited summary for each eligible story. Summary generation is part of this milestone; choose a model provider and budget before implementing it.
- Record feed visibility, summary expansion/collapse, outbound clicks, submissions, and separate relevance and summary-quality feedback.

Acceptance: Zeke can add examples and sources, collect articles on demand, read a ranked story feed, expand a cited summary with one click, follow its source links, submit a missed article, and inspect stored feedback. Summary failures leave the original links usable. Everything works locally with persistent data. No hosting is required.

### Milestone 2: scheduled collection and bounded learning

- Run the collection worker on a configurable schedule.
- Add article enrichment and semantic similarity when enough examples make it useful.
- Recompute a versioned interest profile from explicit seeds and recent behavior.
- Adjust ranking and collection priorities using that profile.
- Include a small configurable exploration allocation so the feed can introduce related interests.
- Show collection health and recommendation explanations.
- Improve story grouping and revise summaries when source evidence materially changes. Track summary-quality feedback independently of topic preference.

Acceptance: newly collected stories appear without manual action; feedback changes subsequent recommendations; new reporting updates the correct story and its cited summary; duplicate runs do not create duplicate entries or revisions; failures are visible and retryable; profile and summary changes can be inspected and reversed.

### Milestone 3: deploy and expand carefully

- Choose hosting, scheduling, and production storage based on observed usage.
- Add private access before exposing preferences, history, submissions, or worker controls online.
- Add selected source adapters or bounded search discovery beyond the configured feeds.
- Improve ranking from accumulated feedback and compare it with the initial baseline.
- Consider saved articles, browser shortcuts, and source discussion links if they help daily use.

Acceptance: the deployed site is private, scheduled collection is reliable, stored data is backed up, and the deployment has defined operating and model-spend limits.

## Proposed architecture

Use one repository with a web application, an independently runnable worker, and shared storage. Within the worker, separate the collection/ranking role from the summary-agent role. They can initially share one process and model provider; no separate agent service is necessary. Collection supplies retrieved evidence and story membership; summarization returns cited, versioned text. This keeps the initial build simple while allowing background work outside web requests.

Proposed starting stack: TypeScript, a Next.js web interface, and SQLite for local persistence. Keep database access behind a small shared layer; revisit production storage when choosing a host. Summarization and optional embeddings should sit behind provider interfaces. Initial ranking can use rules, while generated summaries require a configured model provider. These are design proposals, not installed dependencies or commitments to specific versions.

Conceptual structure for the implementation phase:

```text
web/                 Feed, submissions, preferences, private admin views
worker/              Collection and summary jobs, scheduled entry point
core/                Extraction, story grouping, scoring, profiles, summaries
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
7. Assign candidates to stories using event/topic evidence, keeping standalone articles as their own stories. Related topics alone do not justify merging distinct events.
8. Score stories for relevance, freshness, novelty, and source diversity; persist membership and provenance.
9. Queue summary generation for eligible stories within the run budget, then publish the ranked feed. Source links are usable while a summary is pending.

### Summary generation and improvement

Give the summary agent retrieved source text, metadata, story membership, and optional presentation preferences. Require a concise factual summary with claim-level source citations, relevant context, and explicit uncertainty when sources disagree. One available source is enough for a clearly attributed single-source summary. If only a headline or inaccessible page is available, show “Summary unavailable — source text could not be retrieved”; do not fabricate a full account from the title.

Cache summaries by evidence fingerprint and generation configuration. Precompute likely feed entries so expanding a headline usually displays stored text immediately; missing summaries enter an idempotent background job with a visible preparing state. Avoid repeated model calls from repeated clicks.

Revise when added coverage, changed source content, corrections, or summary-specific feedback warrants it. Each published revision records its evidence, model/prompt version, timestamp, and reason. Check citation support and attribution before publication; uncertain output remains unpublished with source links available. Failed revisions retain the last usable summary with its original timestamp and a status indicating new coverage is awaiting review. Never silently replace the text while the reader has it open; offer an “Updated summary available” action.

Feedback such as “Too vague,” “Too long,” or “Incorrect/missing context” guides summary revisions and future presentation defaults. A reported factual error triggers review against sources rather than treating the feedback as verified evidence. Changes to shared summary instructions should be versioned and evaluated against representative stories before use. This is an evidence-and-feedback revision loop, not a promise of autonomous model retraining.

Start with RSS/Atom and submitted links. General web discovery is a later adapter, not an unrestricted browser agent. Keep source-specific checkpoints so collection requests only what has changed. A failed source must not stop other sources in the run.

Respect source access rules, robots policies where applicable, and rate limits. Do not bypass paywalls or logins. Keep links and metadata when article content cannot be fetched. Treat fetched page text as untrusted material for extraction, never as instructions for the agent. URL fetches must block local/private network destinations, including redirects, and cap response size and processing time.

### Durable records

| Record | Purpose |
| --- | --- |
| Article | Canonical URL, original URL, headline, source, publication/fetch dates, extracted metadata, topics, optional embedding reference |
| Story | Stable ID, display headline, member articles, lead source, topics, discovery/update times, grouping version |
| Summary revision | Story ID, text, claim-to-source citations, evidence fingerprint, model/prompt version, revision reason, publication status and timestamp |
| Source | Feed or adapter configuration, enabled status, fetch checkpoint, health, limits |
| Example | Submitted URL/article, optional note, explicit labels, creation date |
| Preference | Reader-entered interests, exclusions, and source choices |
| Interaction event | Event ID, story ID, optional article/summary revision ID, session ID, event type, timestamp, relevant exposure context |
| Feed exposure | Served story list and ordering, profile/ranker version, position, visibility evidence |
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
| Summary expanded / collapsed | Weak engagement context; identifies story and summary revision, not proof of satisfaction |
| Summary visible active time | Optional on-site reading proxy; exclude hidden-tab time and do not assume comprehension |
| Outbound click | Weak positive interest; it does not prove the article was read or enjoyed |
| Return to feed / feed active time | Optional engagement context; exclude hidden-tab time and do not treat elapsed time as article reading time |
| More like this / less like this | Strong explicit relevance signal |
| Summary-quality feedback | Guides writing and evidence review, independently of topic preference |
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

The main outcome is whether Zeke finds more stories he considers worth reading, with less effort finding them elsewhere. Inspect explicit positive/negative feedback, discovered versus submitted stories, repeated-topic complaints, and source diversity alongside summary use and source clicks per visible exposure. A useful summary may answer the reader's question without an outbound click. Evaluate citation support, correction frequency, and explicit summary usefulness separately from feed relevance. Click rate alone is insufficient and can reward sensational headlines.

For the cold start, use a suggested handful of sources and roughly 10–20 examples if available; fewer are enough to begin. Use a short manual review of the top feed results before introducing complex optimization. Larger statistical experiments are unnecessary until there is enough feedback to support them.

## Data controls and operations

Store personalization data locally first. Before deployment, add authentication and authorization for the feed, submissions, profile, events, and operational endpoints. Avoid logging secret URLs or tokens, and keep credentials outside the repository.

Proposed retention: keep raw interaction events for 90 days and longer-lived aggregates/profile versions until deleted. Make the period configurable. Submitted examples and explicit preferences remain until removed. Provide export, history deletion, and profile reset; deletion must also remove or recompute affected derived profile data.

For the summary model service, document which article text and preference context leave the application. Send the minimum needed for the task. Do not send raw click history by default.

Set collection, extraction, and model budgets per run. Prevent overlapping runs; use idempotent writes and recoverable job states. A small operational view shows last successful collection, source failures, pending submissions, profile version, and model usage. Failed fetching should preserve a submitted URL and its note. Failed enrichment should fall back to basic ranking.

## Validation during implementation

- Verify the complete path from adding a seed to collecting, ranking, clicking, and adapting the next feed.
- Verify headline expansion/collapse with pointer and keyboard, source-link navigation, and cached/pending/unavailable/updated summary states.
- Verify cited claims against retrieved text, single-source attribution, conflicting reports, corrections, and retention of usable summaries after failed revisions.
- Verify story grouping does not collapse unrelated developments and that one source's syndication is not counted as independent corroboration.
- Verify summary-quality feedback does not become negative topic feedback and repeated expansion does not create repeated generation jobs.
- Check normalization and duplicate handling, including tracking parameters and multiple source references.
- Check that retries do not duplicate articles or feedback, and that overlapping runs are prevented.
- Verify explicit exclusions override inferred interest and sparse/no-click feedback does not create false dislikes.
- Verify stale/hidden feed tabs do not generate misleading exposure or engagement events.
- Verify pause, reset, deletion, and profile rollback affect later recommendations as intended.
- Verify source timeouts, malformed feeds, hostile page text, redirects to private networks, and enrichment failures are contained.
- Inspect the feed on desktop and mobile for the intended compact, readable style.

## Decisions to resolve before their implementation milestone

The proposal assumes a private, single-reader product with inline story summaries and outbound source links. Before Milestone 1, collect initial interests, exclusions, example links, and sources; choose a summary model provider with understood data handling and a capped budget. During Milestone 2, tune collection frequency, freshness expectations, summary depth, and exploration from actual use. Before Milestone 3, choose the host, access method, backups, and operating budget.

The next implementation step, once this proposal is approved, is Milestone 1. This repository currently provides the documentation foundation only.
