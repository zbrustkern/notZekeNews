# NotZeke News — engineering build proposal

**Date:** October 7, 2026  
**Status:** Product proposal ready for engineering work planning; application implementation has not started.  
**Repository:** https://github.com/zbrustkern/notZekeNews  
**Initial audience:** One private reader, Zeke.  
**Requested next deliverable:** An implementation work plan with milestones, dependencies, estimates, decisions, and testable acceptance criteria. This proposal does not authorize deployment.

## 1. Product objective

Build a personalized news site that finds stories Zeke would otherwise miss and improves through explicit interests, example links, and observed use. Start locally with a small number of sources; host the site later.

The interaction model is inspired by Techmeme: compact story groups, source attribution, and related coverage links. The editorial breadth is inspired by Hacker News: engineering, software, science, projects, thoughtful essays, and unexpected discoveries, rather than exclusively mainstream technology news.

The defining interaction is **one headline click expands an agent-written story summary inline**. Source links independently open the original articles. A collection agent improves discovery and ranking; a dedicated summary-agent role improves factual coverage and writing quality.

Success means more personally useful discoveries with less manual searching. A reader who gets everything needed from a summary has had a successful visit even without an outbound click.

## 2. Scope boundaries

The first usable release includes a ranked feed, inline cited summaries, source links, link submissions, editable interests and sources, explicit feedback, persistent local data, and interaction telemetry.

Scheduled collection, automatic profile updates, improved story grouping, and evidence-driven summary revisions follow in the next milestone. Preserve the data and job boundaries needed for them from the beginning.

Native comments, public voting, social profiles, multi-user community features, unrestricted autonomous web browsing, foundation-model retraining, and deployment are outside the first release. External discussion links, saved articles, and browser shortcuts are later options.

## 3. Reader experience and visual direction

### Feed

- A compact, text-first “For you” feed, with a small masthead, collection freshness, “Add a link,” and “Preferences.”
- Each story displays a headline, lead source, publication/discovery information, “Read original,” and related coverage links when available.
- A story may contain one or multiple source articles. A single-source essay or project is a valid story.
- Rank by personal relevance, freshness, novelty, and diversity. Older useful articles remain eligible; discovery date must not masquerade as publication date.
- Avoid duplicate coverage dominating the feed or making mainstream stories inherently more important than niche discoveries.

### Headline expansion

- Clicking the headline or chevron opens the summary below that story; clicking again closes it. This action does not navigate away.
- Source and citation links retain ordinary outbound link behavior, including opening in another tab.
- Multiple stories may stay expanded. Preserve expanded state and scroll position within the session when returning from an article.
- Support keyboard disclosure, visible focus, appropriate accessibility semantics, mobile layouts, and reduced motion.
- Default summaries are approximately 80–150 words, adjusted for the material: what happened or what the article explains, useful context, and relevant uncertainty.
- Display agent authorship, update time, linked citations, and distinct controls for story relevance and summary quality.

### Visual treatment

Use an ivory canvas (`#F7F5EF`), deep ink headlines (`#182B33`), teal links (`#21665D`), restrained burnt-orange brand accents (`#C9633F`), and pale sage summary insets (`#EDF2EB`). Pair editorial serif headlines with clean sans-serif metadata and controls. Use fine separators, small topic labels, and a shared masthead/feed alignment. Keep the feed readable and compact without oversized cards or image grids.

The latest design mockups use fictional stories and are references, not implemented screens:

- [Feed concept](mockups/feed-v2.png)
- [Expanded-summary concept](mockups/expanded-summary-v2.png)

When sharing this Markdown file outside the repository, include these two images in a sibling `mockups/` folder or attach them separately. The proposal is understandable without them. The expanded mockup's chevron should point downward in implementation; its spacing should match the collapsed view.

### Teaching with links and preferences

“Add a link” accepts a URL and optional note, such as “I wish I had seen this” or “I like the technical depth, not the company.” Save the submission before fetching; preserve it if extraction fails. Resolve metadata asynchronously, allow corrections, and label the feed item “Added by you.” Treat it as a strong positive example, but do not automatically subscribe to its whole domain or count it as an agent discovery.

Preferences support topics, keywords, sources, and exclusions. Explicit instructions override inferred interests. Provide pause-learning, export, history/example deletion, and profile reset. Reset rebuilds from retained explicit seeds without replaying discarded history.

## 4. Architecture proposal

Use one repository with a web application, an independently runnable background worker, shared domain logic, and durable storage. Separate collection/ranking and summarization as roles with explicit inputs and outputs; they may share one worker process and provider initially.

Proposed starting stack: TypeScript, Next.js, and SQLite for local use. Engineering may propose alternatives with rationale. Choose production storage and hosting later. Keep summarization and optional embeddings behind provider interfaces; initial ranking can use transparent rules without embeddings. Generated summaries require a model provider and capped budget in the first milestone.

| Component | Responsibility |
| --- | --- |
| Web interface | Feed, disclosure, source navigation, submissions, preferences, feedback, lightweight operational view |
| Collection worker | Source polling, safe retrieval, extraction, normalization, deduplication, provenance, checkpoints |
| Story/ranking logic | Article membership, story relevance, freshness, novelty, diversity, explanation evidence |
| Summary-agent role | Evidence-grounded drafts, citations, validation, cached publication, revisions |
| Learning logic | Event aggregation, bounded preference updates, profile versions, source-priority adjustments |
| Storage/job layer | Migrations, durable records, idempotency, recoverable jobs, concurrency control |

### Collection flow

1. Load enabled sources, explicit preferences, profile version, and run budget.
2. Poll configured RSS/Atom feeds and submitted URLs using source checkpoints and per-source limits.
3. Normalize URLs, deduplicate, extract permitted content/metadata, and preserve provenance.
4. Create standalone stories initially; merge coverage conservatively when evidence supports the same event. A related topic alone does not justify merging.
5. Rank stories and queue summaries for eligible candidates within budget.
6. Publish the feed while summaries are preparing; original source links remain usable.

Later discovery adapters may explore related sources or searches within explicit limits. One source failure must not stop other sources. Respect source access rules and rate limits; do not bypass logins or paywalls. Treat fetched text as untrusted evidence, never agent instructions. Block URL fetches to local/private networks, including redirects, and limit payload size and execution time.

## 5. Summary generation and continuous improvement

The summary role receives retrieved evidence, source metadata, story membership, and presentation preferences. It produces a concise summary with claim-to-source citations and clear attribution. A single-source summary is acceptable when identified as such. Disagreements must remain visible; syndicated copies do not constitute independent corroboration.

If only a headline or inaccessible page is available, retain links and report summary unavailability. Do not manufacture a full account from a title. Personalization may alter context or depth, never facts.

Precompute likely feed summaries and cache by evidence fingerprint and generation configuration. Repeated expansion must not create repeated model calls. Regenerate on meaningful evidence changes, corrections, or summary-quality feedback. Store evidence, generation version, time, reason, and publication status for each revision.

Validate citation support and attribution before publication. The work plan must specify how these checks work, their limits, and how uncertain drafts are handled. Failed revisions retain the last usable summary with its original timestamp. A factual-error report triggers review against evidence rather than being accepted as a new fact. Version and evaluate changes to summary instructions against representative examples.

| State | Required behavior |
| --- | --- |
| Ready | Display stored summary immediately on expansion |
| Preparing | Show inline status and usable source links |
| Unavailable | Explain briefly; preserve links; offer bounded retry when appropriate |
| New evidence pending | Keep the previous summary and its timestamp; disclose that new coverage awaits revision |
| Updated while open | Offer “Updated summary available”; do not silently replace visible text |
| Updated before opening | Display the latest published version, time, and material revision reason |

## 6. Personalization and telemetry

Maintain two separate feedback loops: **discovery relevance** and **summary quality**. “More like this” and “Less like this” adjust relevance; “Helpful,” “Too vague,” “Too long,” and “Incorrect/missing context” guide summarization. A poor summary must not become evidence that the reader dislikes its topic.

Record served feed ordering, visible story exposure, expansion/collapse, displayed summary revision, outbound source clicks, submissions, explicit feedback, and preference edits. Optional active summary-reading time must exclude hidden-tab time. Include event IDs, story/article IDs as applicable, session, position, and profile/ranker version. Deduplicate retries.

Clicks and expansion are weak signals; explicit feedback and submitted examples are strong signals. No click is not a dislike. This site cannot reliably observe reading time or scrolling on external articles. Collect no unrelated browsing history or detailed mouse movement.

Periodically aggregate signals into bounded, versioned profile updates. Decay old inferred preferences, cap repeated interactions, preserve explicit exclusions, and avoid strong updates from sparse evidence. Use profile changes for both story ranking and configured-source collection priorities. Reserve a small configurable exploration allocation and constrain source/topic domination. Keep a freshness-based baseline and support rollback.

“Self-learning” means updating profiles, retrieval priorities, ranking weights, and summary presentation from evidence. It does not require model retraining or an agent rewriting application code.

## 7. Data and operational requirements

Persist articles, sources/checkpoints, stories/article membership, examples/notes, explicit preferences, interaction events, feed exposures, profile versions, summary revisions/citations, and collection/job outcomes. Keep stable IDs and provenance. Publication, discovery, and summary-update timestamps are distinct.

Start with local storage and a stable reader ID. Before remote exposure, require authentication and authorization for personal data, submissions, events, and operational endpoints. Keep credentials out of the repository and avoid sensitive URLs/tokens in logs.

Proposed raw-event retention is 90 days, configurable. Retain explicit seeds/preferences until removed. Deletion must remove or recompute affected derived data. Define retention for fetched evidence and old summary/profile versions in the work plan, including what is necessary to audit citations and handle backups.

Document what source text and preference context are sent to model services; minimize it and exclude raw interaction history by default. Bound collection, extraction, and model usage per run. Prevent overlapping jobs and duplicate writes; use timeouts, backoff, bounded retries, and recoverable states.

A small operational view should show last successful collection, source health, pending submissions/summaries, failures, profile version, and model usage. Model failure must not prevent reading source links. Production planning must include backups and restore verification.

## 8. Proposed delivery milestones

| Milestone | Scope | Exit criteria |
| --- | --- | --- |
| 1 — Local foundation | Feed and refined styling; source ingestion on demand; standalone stories/conservative grouping; explicit interests and exclusions; URL submission; basic ranking; cached cited summaries; telemetry and explicit feedback; local data controls | From seed examples and a few feeds, Zeke can collect, read, expand summaries, open sources, submit a missed link, inspect feedback, and manage retained data. Failures preserve submissions and source links. Data survives restart. |
| 2 — Scheduled adaptation | Scheduled runs; versioned profile updates; improved grouping; collection-priority adaptation; limited exploration; meaningful summary revisions; explanations and operational health | Scheduled discovery works without manual action; feedback changes subsequent ranking/collection; new evidence revises the correct story; duplicate runs are harmless; profiles and summaries can be inspected and rolled back. |
| 3 — Private deployment and expansion | Hosting/storage decision; access control; backups/restore; operating limits; selected discovery adapters; ranking evaluation | Private deployment is reliable, recoverable, and budgeted. Broader discovery remains bounded. Deploy only after explicit approval. |

The engineering plan may split these into smaller increments but must retain the first-release headline-summary experience. Do not defer summaries to a future phase simply to ship a link list. Link submissions and explicit seeds support cold start; roughly 10–20 examples are useful if available, but fewer should be sufficient to begin.

## 9. Required verification and evaluation

- End-to-end: seed → ingest → rank → expand summary → feedback → changed subsequent feed.
- UX: desktop/mobile layout, keyboard controls, source navigation, preserved reading position, and all summary states.
- Evidence quality: supported claims, citation mappings, single-source attribution, conflicting coverage, factual corrections, and failed-revision fallback.
- Data integrity: URL normalization, duplicate/syndicated coverage, distinct-event grouping, event retry deduplication, and overlapping-job handling.
- Learning: explicit overrides, sparse signals, exposure/position context, feedback-loop separation, pause/reset/deletion, and rollback.
- Retrieval resilience: malformed feeds, timeouts, inaccessible sources, hostile text, and private-network redirects.
- Operations: bounded usage, visible failures, persistent jobs, and deployment access/restore checks when applicable.

Evaluate discoveries using explicit usefulness feedback, diversity, and missed-story submissions. Evaluate summaries separately using citation support, correction frequency, and usefulness/clarity feedback. Click rate alone is not a product success metric. Start with a small, representative manual review set; use larger statistical experiments only when there is enough feedback.

## 10. Requested engineering work plan

Produce a plan that maps requirements above to concrete tasks and milestone acceptance evidence. Include:

1. Recommended architecture and stack, including any departure from this proposal and its rationale.
2. Task sequencing, dependencies, owners/roles, estimates with assumptions, and a demonstrable outcome for each increment.
3. Data schema, migration approach, event contract, profile/summary versioning, and job lifecycle.
4. Model-provider choice, citation-validation approach, cost controls, evidence retention, and summary revision policy.
5. Ranking/learning baseline, signal weights and constraints, collection cadence, exploration policy, and evaluation fixtures.
6. Test strategy and explicit evidence required to close each milestone.
7. Risks, unresolved decisions, and which decisions block which tasks.
8. A separate deployment plan for later approval; no premature hosting dependency for the local release.

Resolve seed sources/interests, exclusions, and model-provider budget before their dependent work. Define measurable feed latency, collection freshness, failure recovery, and summary-quality targets rather than inventing unsupported performance promises.

The completed work plan will be reviewed against this proposal for scope fidelity, technical feasibility, dependency order, evidence quality, learning behavior, operating cost, and testable completion criteria before implementation begins.
