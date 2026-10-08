# NotZeke News

A personal news feed that learns what Zeke wants to read: Techmeme-inspired story groups and source links, Hacker News-inspired topic breadth, and agent-written summaries that expand with one headline click.

## Documentation & Proposals

- [Engineering Build Proposal](docs/engineering-build-proposal.md): Consolidates the product requirements, UX behavior, agent roles, and acceptance milestones.
- [Subagent Build Plan](docs/build-plan.md): Concrete implementation work plan, data contracts, and subagent work breakdown.
- [Interaction Design](docs/interaction-design.md): The reading experience, headline disclosure rules, and summary states.
- [Design Mockups](docs/mockups/): Visual references for the feed ([`feed-v2.png`](docs/mockups/feed-v2.png)) and expanded summary ([`expanded-summary-v2.png`](docs/mockups/expanded-summary-v2.png)).

## Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Seed Database
Initialize local SQLite database with curated seed sources, mockup stories, and preferences:
```bash
npm run db:seed
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the briefing feed.

### 4. Background Ingestion Worker
Run the RSS collection worker on-demand:
```bash
npm run worker:collect
```

### 5. Run Test Suite
Execute the Vitest test suite (SSRF guards, URL normalizers, ranking scorer):
```bash
npm test
```

## Hosting & Cloud Infrastructure

- **Target**: Google Firebase App Hosting (`notzekenews`)
- **Authentication**: Firebase Authentication
- **Secrets**: Google Cloud Secret Manager (`GEMINI_API_KEY`)
- **CI/CD**: GitHub Actions (`.github/workflows/ci.yml`)
