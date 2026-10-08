# NotZeke News — Subagent Engineering Build Plan

**Version:** 1.0.0  
**Date:** October 8, 2026  
**Status:** Approved for Subagent Execution  
**Target Repository:** `https://github.com/zbrustkern/notZekeNews`  
**Hosting Target:** Google Firebase (App Hosting + Firebase Auth + Cloud Firestore / SQLite Local abstraction)

---

## 1. Executive Summary & Design Review

### 1.1 Product & Architectural Intent
NotZeke News is a personalized news briefing platform tailored for a single reader (Zeke). It synthesizes:
- **Techmeme’s editorial structure**: compact story clusters, primary source attribution, and related coverage links.
- **Hacker News’s topic breadth**: deep software engineering, system architecture, natural science, thoughtful essays, and unexpected niche discoveries.
- **One-click inline disclosure**: clicking any story headline instantly expands an **agent-written, cited summary** directly within the feed, without navigating away.
- **Continuous learning loop**: dual feedback mechanisms (story relevance vs. summary writing quality) and an explicit “Add a link” (“I wish I had seen this”) submission workflow that refines a versioned interest profile.

### 1.2 Design Mockup Review (`feed-v2.png` & `expanded-summary-v2.png`)
The visual language establishes a high-density, text-first editorial aesthetic:
- **Palette**:
  - Canvas / Background: Warm Ivory (`#F7F5EF`)
  - Headlines & Dark Ink: Deep Navy Ink (`#182B33`)
  - Source & Outbound Links: Dark Teal (`#21665D`)
  - Brand Accents & Topic Labels: Burnt Orange (`#C9633F`)
  - Expanded Summary Inset: Pale Sage (`#EDF2EB`) with a subtle teal accent bar
- **Typography & Components**:
  - Masthead: Burnt-orange square monogram `[N]` + Serif “NotZeke News” + Tagline *“A personal briefing, with a wider lens.”* + Header actions: `+ Add a link` pill button and `Preferences` link.
  - Feed Header: Bold serif `For you` + Live collection badge (*“● Collected 12 minutes ago”*) + Instruction: *“Click a headline for a summary. Follow a source to read more.”*
  - Story Rows: Burnt-orange topic badge (e.g. `ENGINEERING`, `SCIENCE`, `SYSTEMS`), serif headline, disclosure indicator (circle chevron: right when collapsed, rotated 90° down when expanded), lead source metadata (*“Lead: [Source] · 2 hours ago · Read original ↗”*), and inline related coverage links (*“More coverage: Project notes ↗ · Independent benchmark ↗”*).
  - Expanded Card: “AGENT BRIEF” label with sparkle icon, update timestamp, 80–150 word grounded text with bracketed citations `[1]`, `[2]`, “Why it matters” synthesis, citation chips, and dual feedback footers (*“More like this · Less like this”* | *“Summary: Helpful · Needs improvement”*).

---

## 2. System Architecture & Technology Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js 15 (App Router)                         │
│  ┌───────────────────────┐  ┌────────────────────────────────────────┐ │
│  │   Frontend (React 19) │  │          API & Cron Routes             │ │
│  │ - Feed & Disclosure   │  │ - /api/feed                            │ │
│  │ - Add a Link Modal    │  │ - /api/stories/:id/feedback            │ │
│  │ - Preferences Page    │  │ - /api/submissions                     │ │
│  │ - Ops Health Monitor  │  │ - /api/cron/collect (Cloud Scheduler)  │ │
│  └───────────────────────┘  └────────────────────────────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
             ┌──────────────────────┴──────────────────────┐
             ▼                                             ▼
┌─────────────────────────┐                   ┌─────────────────────────┐
│     Collection Engine   │                   │   Summary Agent Role    │
│ - RSS/Atom Feed Ingest  │                   │ - Gemini 2.5 Flash SDK  │
│ - SSRF-safe URL Fetch   │                   │ - Grounded Citations    │
│ - HTML Content Extract  │                   │ - Fingerprint Caching   │
│ - Deduplication & Group │                   │ - Revision Controller   │
└────────────┬────────────┘                   └────────────┬────────────┘
             │                                             │
             └──────────────────────┬──────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  Storage Layer (Repository Interface)                  │
│  ┌─────────────────────────────────┐ ┌───────────────────────────────┐ │
│  │  Local Dev: SQLite (Drizzle ORM)│ │ Production: Cloud Firestore   │ │
│  └─────────────────────────────────┘ └───────────────────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴────────────────────────────────────┐
│                    Google Firebase & GitHub CI/CD                      │
│ - Firebase App Hosting (Server-side Next.js runtime)                   │
│ - Firebase Authentication (Private single-user gate)                   │
│ - Google Cloud Secret Manager (GEMINI_API_KEY)                         │
│ - GitHub Actions (Automated build, test, and push-to-deploy)           │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Core Stack Specifications
1. **Application Framework**: Next.js 15 (App Router), React 19, TypeScript 5.x.
2. **Styling & UI**: Tailwind CSS v3/v4 configured with design tokens matching the mockups, Lucide icons (customized to match minimalist chevrons), Accessible UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`).
3. **Database & Storage Abstraction**: Repository Pattern separating business domain logic from data persistence:
   - **Interface**: `INewsRepository` exposing articles, stories, summaries, sources, submissions, profiles, and telemetry.
   - **Local Implementation**: SQLite via `better-sqlite3` and `drizzle-orm` for fast, zero-dependency local development and unit tests.
   - **Production Implementation**: Google Cloud Firestore adapter using Firebase Admin SDK.
4. **AI / Model Provider**: Google Gemini API via `@google/genai` (Gemini 2.5 Flash) with structured JSON schemas and strict temperature (0.1–0.2) for grounded factual accuracy.
5. **Collection & Ingestion**: `rss-parser` + `cheerio` + safe fetcher with private IP blocking (preventing SSRF to `127.0.0.1`, `169.254.169.254`, `10.0.0.0/8`, etc.).
6. **Hosting & DevOps**:
   - Google Firebase App Hosting (native Next.js SSR/ISR hosting).
   - Firebase Auth (restricted to Zeke's Google OAuth identity).
   - GitHub Actions CI/CD pipeline deploying on merge to `main`.

---

## 3. Subagent Roster & Responsibilities

To execute this build effectively and concurrently, work is divided across 6 specialized subagents:

```
  ┌────────────────────────────────────────────────────────┐
  │         Subagent 1: Firebase & DevOps Specialist       │
  │         (Repo, Firebase App Hosting, Auth, CI/CD)      │
  └───────────────────────────┬────────────────────────────┘
                              │ sets up environment & config
  ┌───────────────────────────┴────────────────────────────┐
  │         Subagent 2: Core Data & Domain Architect       │
  │         (Data Models, Drizzle SQLite, Repository API)  │
  └─────────────┬────────────────────────────┬─────────────┘
                │                            │
        provides contracts           provides contracts
                ▼                            ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│ Subagent 3: Ingestion Worker  │   │ Subagent 4: Summary Agent     │
│ (RSS, SSRF Fetch, Clustering) │   │ (Gemini LLM, Citations, Cache)│
└───────────────┬───────────────┘   └───────────────┬───────────────┘
                │                                   │
                └─────────────────┬─────────────────┘
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│ Subagent 5: Editorial Frontend & Interaction Engineer             │
│ (Next.js UI, Accordion Disclosure, Color Tokens, Modals, State)   │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │
┌─────────────────────────────────┴─────────────────────────────────┐
│ Subagent 6: Learning Loop, Telemetry & Quality Verification       │
│ (Ranking Engine, Signal Decay, E2E Tests, Accessibility Audit)    │
└───────────────────────────────────────────────────────────────────┘
```

---

## 4. Detailed Subagent Implementation Work Packages

### Work Package 1: Firebase Infrastructure, Auth & GitHub CI/CD
**Assigned Subagent:** `devops-firebase-agent`  
**Skills utilized:** `firebase-basics`, `firebase-app-hosting-basics`, `firebase-auth-basics`

#### Objectives
1. Initialize Firebase configuration files in the repository (`firebase.json`, `apphosting.yaml`, `.firebaserc`).
2. Establish Firebase App Hosting configuration for Next.js App Router.
3. Configure Google Secret Manager bindings for `GEMINI_API_KEY` and session secrets.
4. Establish Firebase Authentication rules ensuring single-user authorization (only Zeke’s verified email can access the dashboard, feed, and management APIs).
5. Configure GitHub Actions workflows (`.github/workflows/ci.yml` and `.github/workflows/deploy.yml`) for linting, testing, and deployment.

#### Deliverables & Acceptance Criteria
- [ ] `firebase.json` containing `apphosting` block with root dir `/`.
- [ ] `apphosting.yaml` configured with Node.js 20 runtime, environment variables, and secret references.
- [ ] Authentication middleware in Next.js verifying Firebase session cookies / tokens with graceful fallback for local development (`AUTH_DISABLED=true` in local `.env.local`).
- [ ] Working GitHub Actions workflow that executes `npm run lint`, `npm run test`, and `npm run build`.

---

### Work Package 2: Core Data Models & Storage Abstraction Layer
**Assigned Subagent:** `domain-storage-agent`  
**Dependencies:** None (Greenfield schema design)

#### Objectives
1. Define the TypeScript interfaces and database schemas for all domain entities:
   - `Article`: URL (canonicalized), title, source name, original URL, published timestamp, discovery timestamp, extracted text, metadata, topics.
   - `Story`: Stable ID, display headline, member article IDs, lead source ID, primary topic, discovery timestamp, update timestamp, grouping version.
   - `SummaryRevision`: Revision ID, story ID, markdown body, why_it_matters, citations array `[{ citation_id: 1, article_id, claim_text, source_name, url }]`, evidence_fingerprint, model_version, revision_reason, status (`ready`, `preparing`, `unavailable`, `stale`), updated_at.
   - `Source`: ID, title, feed_url, site_url, last_polled_at, fetch_checkpoint, health_status, failure_count, is_enabled.
   - `Submission`: ID, url, raw_note, submitter_id, status (`pending`, `processed`, `failed`), created_at.
   - `Preference`: ID, reader_id, topics_allowlist, topics_blocklist, keywords, source_weights, pause_learning, updated_at.
   - `InteractionEvent`: ID, reader_id, event_type (`feed_served`, `headline_expand`, `headline_collapse`, `summary_read_active`, `source_click`, `relevance_positive`, `relevance_negative`, `summary_helpful`, `summary_needs_improvement`), story_id, summary_revision_id, metadata, created_at.
   - `InterestProfile`: Version, reader_id, topic_weights, source_affinities, exploration_factor, confidence_score, updated_at.
   - `CollectionRun`: Run ID, started_at, completed_at, candidates_found, new_stories_count, errors_log, model_tokens_used.
2. Implement the `INewsRepository` interface.
3. Build the primary Local SQLite repository using `drizzle-orm` + `better-sqlite3` with automated migration runner.
4. Prepare the Firestore repository adapter adhering to the identical interface for cloud persistence.
5. Create seed fixtures with default sources (e.g. Hacker News Top, Simon Willison's Weblog, Dan Luu, ACM TechNews, Ars Technica) and sample topics.

#### Deliverables & Acceptance Criteria
- [ ] Fully typed domain schemas in `src/lib/domain/`.
- [ ] Clean SQLite database initialization in `src/lib/storage/sqlite/` with migrations.
- [ ] `INewsRepository` interface verified with unit tests.
- [ ] Database seeds executable via `npm run db:seed`.

---

### Work Package 3: Ingestion Worker, SSRF Protection & Story Clustering
**Assigned Subagent:** `collection-worker-agent`  
**Dependencies:** Work Package 2 (Storage interfaces)

#### Objectives
1. Build an RSS/Atom feed parser supporting feed checkpoints (`etag`, `last-modified`, latest `published_at`).
2. Build an SSRF-safe URL fetcher:
   - Validates hostname and resolves DNS before fetching.
   - Strictly blocks private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16`, `::1`, `fc00::/7`).
   - Caps HTTP response body to 2MB and enforces 10-second timeout.
   - Disables following redirects to unauthorized/internal schemes or IP addresses.
3. Build an HTML text and metadata extractor using `cheerio` (extracting OpenGraph title, description, publish date, canonical URL, and primary content).
4. Implement URL normalization:
   - Remove tracking parameters (`utm_*`, `fbclid`, `gclid`, `ref`, `source`, etc.).
   - Standardize protocol and trailing slashes.
5. Conservative Story Clustering:
   - By default, an ingested article creates its own independent story.
   - Merging into an existing story occurs only when:
     - Canonical URL matches, OR
     - High normalized title similarity (> 0.85 Jaro-Winkler) AND exact domain match, OR
     - Cross-source explicit story reference within a 24-hour freshness window.
6. Provide an isolated CLI runner (`npm run worker:collect`) and an authorized internal API endpoint (`POST /api/cron/collect`).

#### Deliverables & Acceptance Criteria
- [ ] Unit tests proving private network and loopback URLs are rejected.
- [ ] Working ingestion for RSS feeds with clean deduplication.
- [ ] Per-source error isolation: a single malformed feed never crashes the collection run.

---

### Work Package 4: Grounded Summary Agent & LLM Pipeline
**Assigned Subagent:** `summary-agent`  
**Dependencies:** Work Package 2 (Storage interfaces)

#### Objectives
1. Implement the Gemini 2.5 Flash integration using `@google/genai`.
2. Construct the system prompt enforcing editorial rigor:
   - Constraint: 80–150 words total.
   - Structure:
     1. Key development / finding.
     2. Context & significance (*“Why it matters”*).
     3. Known uncertainties or limitations.
   - Grounding: Every substantive assertion must include a numbered citation `[1]`, `[2]` pointing to a retrieved article ID.
   - Neutrality: Disagreements between sources must be explicitly noted rather than reconciled artificially.
   - Single-source disclosure: If only one source exists, explicitly attribute findings to that single source.
   - Fallback: If retrieved source text is empty or behind a paywall, return status `unavailable` with reason (*“Source content could not be extracted”*) rather than hallucinating from the headline.
3. Citation validation layer:
   - Verify that all cited numbers exist in the source payload.
   - Calculate claim text presence in source excerpts.
4. Summary Caching & Fingerprinting:
   - Compute SHA-256 fingerprint of concatenated source article bodies.
   - If the fingerprint matches existing cached summary, bypass model invocation.
5. Summary Revision Controller:
   - Store historical summary revisions with timestamps and revision reasons.
   - Support states: `ready`, `preparing`, `unavailable`, `new_evidence_pending`.

#### Deliverables & Acceptance Criteria
- [ ] Summary pipeline passes validation with structured output and verified citations.
- [ ] Evidence fingerprinting prevents duplicate API calls on repeated runs.
- [ ] Budget limiter capping daily/per-run token consumption.

---

### Work Package 5: Editorial Frontend, Accordion Disclosure & Interaction Design
**Assigned Subagent:** `frontend-ui-agent`  
**Skills utilized:** `modern-web-guidance`  
**Dependencies:** Work Packages 1, 2, 4 (UI consumes API and mock data)

#### Objectives
1. Implement the complete editorial design matching mockups `feed-v2.png` and `expanded-summary-v2.png`:
   - Exact color variables:
     - `--bg-canvas`: `#F7F5EF`
     - `--text-ink`: `#182B33`
     - `--link-teal`: `#21665D`
     - `--accent-orange`: `#C9633F`
     - `--summary-sage`: `#EDF2EB`
   - Masthead: Monogram `[N]`, title, tagline, `+ Add a link` button, `Preferences` link.
   - Feed header: `For you` headline, freshness indicator with green status dot, explanation text.
2. Story List & Accordion Disclosure:
   - Clicking headline or circular chevron toggles inline disclosure.
   - Downward pointing chevron when open; rightward when closed.
   - Outbound links (*“Read original ↗”*, *“Project notes ↗”*) open in new tab (`target="_blank" rel="noopener noreferrer"`) and do NOT trigger headline expansion.
   - Support keyboard navigation (`Enter` / `Space` on headline triggers disclosure).
   - `aria-expanded` and semantic ARIA disclosure attributes.
   - Preserves open stories and scroll position during the session.
3. Expanded Summary Card Component:
   - Pale sage background (`#EDF2EB`), subtle teal border.
   - `AGENT BRIEF` uppercase badge with sparkle icon + update timestamp.
   - Formatted body text with hyperlinked citation numbers `[1]`, `[2]`.
   - “Why it matters” emphasized callout.
   - Citation pill buttons at the bottom.
   - Dual feedback footer:
     - Left: `More like this` · `Less like this`
     - Right: `Summary: Helpful` · `Needs improvement` (with modal dropdown for *Too vague*, *Too long*, *Incorrect/missing context*).
4. “Add a link” Modal:
   - Immediate optimistic save before content fetch.
   - Displays in feed as `Added by you`.
5. Preferences Screen:
   - View/edit topics, keywords, sources, exclusions.
   - “Pause learning” toggle.
   - “Reset profile” button with confirmation.
6. Responsive design:
   - Single clean column layout on mobile and desktop without horizontal scroll.

#### Deliverables & Acceptance Criteria
- [ ] Pixel-perfect visual alignment with `docs/mockups/feed-v2.png` and `expanded-summary-v2.png`.
- [ ] Complete keyboard accessibility and screen-reader compliant disclosure semantics.
- [ ] Story disclosure never navigates; source links always navigate.

---

### Work Package 6: Ranking Engine, Telemetry Loop & E2E Validation
**Assigned Subagent:** `learning-qa-agent`  
**Dependencies:** All previous work packages

#### Objectives
1. Implement the transparent rule-based ranking algorithm:
   $$\text{Score} = w_{\text{explicit}} \cdot S_{\text{topic}} + w_{\text{freshness}} \cdot e^{-\lambda \Delta t} + w_{\text{novelty}} \cdot S_{\text{novelty}} - w_{\text{div}} \cdot P_{\text{source\_domination}} + S_{\text{explore}}$$
   - Strict exclusions (blocked topics/domains) immediately filter stories out.
   - Submitted examples receive immediate high relevance boost.
   - Soft source diversity penalty prevents single-source takeover.
   - 10% bounded exploration allocation for serendipitous discoveries.
2. Interaction Telemetry Engine:
   - Intercept and batch client events: story exposures, headline expansions, outbound clicks, active reading time (ignoring inactive/hidden browser tabs).
   - Ensure explicit votes (“More like this”, “Less like this”) have 10x the weight of passive clicks.
   - Keep relevance feedback separate from summary quality feedback.
3. Profile Adaptation & Decay:
   - Background job aggregates feedback into versioned `InterestProfile`.
   - Inferred preferences decay with a half-life of 14 days, while explicit preferences remain permanent until edited.
4. Comprehensive Test Suite:
   - **Unit Tests**: RSS parsing, URL normalization, SSRF guard, citation validator, ranking scorer.
   - **Integration / E2E Tests**: Seed ingestion → Feed presentation → Headline expansion → Feedback submission → Subsequent profile update.
   - **Accessibility Audits**: axe-core checks on color contrast, tab navigation, ARIA states.

#### Deliverables & Acceptance Criteria
- [ ] Passing Vitest and Playwright test suites.
- [ ] Telemetry successfully triggers bounded profile updates.
- [ ] Verification report detailing performance, contrast ratios, and resilience against broken feeds.

---

## 5. Execution Timeline & Milestones

| Milestone | Scope | Responsible Subagents | Demonstrable Outcome |
| :--- | :--- | :--- | :--- |
| **Milestone 1: Foundations & Infrastructure** | Monorepo setup, Next.js scaffolding, Tailwind theme, Drizzle SQLite schema, Firebase App Hosting config | Subagent 1 & Subagent 2 | Clean repository builds locally and on Firebase App Hosting; database migrations and seed data operational. |
| **Milestone 2: Ingestion & LLM Summary Engine** | RSS crawler, SSRF protection, content extraction, Gemini summary generator, citation verification | Subagent 3 & Subagent 4 | On-demand ingestion fetches articles, clusters stories, generates grounded summaries with bracketed citations, and caches results. |
| **Milestone 3: Editorial Web Experience** | Masthead, story list, inline accordion disclosure, summary cards, Add a link modal, Preferences page | Subagent 5 | Interactive UI faithfully matches mockups; full keyboard accessibility; headline disclosure and outbound navigation behave independently. |
| **Milestone 4: Ranking, Telemetry & Adaptation** | Rule-based scoring, telemetry ingestion, profile versioning, dual feedback loops, operational health view | Subagent 6 | Reader actions adapt feed ranking; summary quality feedback logged separately; operational metrics visible. |
| **Milestone 5: Verification, CI/CD & Deployment** | End-to-end tests, accessibility audit, GitHub Actions workflow, Firebase deploy | All Subagents | Full automated test suite passes; production build deployed to Firebase project; GitHub repository synchronized. |

---

## 6. Risk Analysis & Mitigation Matrix

| Risk / Failure Mode | Probability | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **SSRF / Hostile Feed Exploit** | High | Critical | Validate all URLs against strict denylists; reject internal IP resolutions; restrict protocols to `http` and `https`; cap response sizes to 2MB; 10s fetch timeouts. |
| **LLM Hallucination / Unsupported Citations** | Medium | High | Deterministic citation verification step. Validate that cited numbers exist and claim sentences match retrieved text snippets. Fallback to `unavailable` if confidence is low. |
| **Unbounded Model Spend** | Medium | Medium | SHA-256 fingerprint caching prevents re-summarizing unchanged evidence. Hard per-run budget cap (e.g. max 15 summaries per collection run). |
| **Feedback Loop Distortions** | Low | Medium | Strict mathematical separation: summary complaints (“Too long”, “Too vague”) cannot decrease story topic relevance. Clicks decay quickly; explicit votes dominate. |
| **Overlapping Collection Runs** | Medium | Low | Database run lock with lease timeout; idempotent article insertion on canonical URL. |

---

## 7. Next Actions & Subagent Launch Sequence

1. **Phase 1 Launch**:
   - Launch **Subagent 1 (`devops-firebase-agent`)** to configure Firebase CLI, project bindings, and GitHub Actions templates.
   - Concurrently launch **Subagent 2 (`domain-storage-agent`)** to scaffold Next.js 15, Drizzle ORM, and TypeScript domain entities.
2. **Phase 2 Launch**:
   - Once data interfaces are established, launch **Subagent 3 (`collection-worker-agent`)** and **Subagent 4 (`summary-agent`)** in parallel.
   - Concurrently launch **Subagent 5 (`frontend-ui-agent`)** against mocked repository data.
3. **Phase 3 Launch**:
   - Launch **Subagent 6 (`learning-qa-agent`)** for full integration, ranking adaptation, and end-to-end test validation.
