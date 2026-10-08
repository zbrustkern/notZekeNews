# NotZeke News — revised interaction design

Status: proposed UX; documentation only.

## Design direction

Use Techmeme as the reference for compact headline-led story groups with attributed source links and related coverage. Keep Hacker News as the inspiration for breadth: software, science, engineering, projects, essays, and unexpected discoveries based on Zeke's interests. Topic diversity is an editorial requirement, not a requirement to reproduce Hacker News's interface.

Reference: [Techmeme](https://techmeme.com/) groups lead stories with additional coverage links. The inline generated-summary interaction below is a proposed NotZeke News behavior.

### Visual refinement

Use a warm ivory canvas (`#F7F5EF`), deep ink headlines (`#182B33`), dark teal source links (`#21665D`), and a restrained burnt-orange brand accent (`#C9633F`). Pair editorial serif headlines with clean sans-serif metadata and controls. Align the masthead and feed to the same reading column; use fine rules and small topic labels to establish hierarchy without making every story a card.

Give “Add a link” a clear header button. Headline disclosure controls remain distinct from outbound links. Expanded summaries use a pale sage inset (`#EDF2EB`), a slim teal rule, readable text, citations, and separate relevance and writing-quality feedback. “Agent brief” is a display label for the agent summary, not a different feature. Check actual text contrast, keyboard focus, and mobile spacing during implementation; mockups are visual references, not accessibility verification.

Revised visual concepts: [feed](mockups/feed-v2.png) and [expanded summary](mockups/expanded-summary-v2.png). Original concepts remain available for comparison. All stories shown are sample content.

## Page layout

A small header contains NotZeke News, “Add a link,” and “Preferences.” Under it, show collection freshness and a compact “For you” feed. Use a readable main column on desktop and a single column on mobile. Avoid image grids, oversized cards, and numbered voting rows. Keep story headlines visually stronger than secondary metadata, with enough space to distinguish neighboring stories.

The following is an illustrative wireframe with placeholder content, not a factual news report:

```text
NotZeke News                          Add a link · Preferences
For you                              Collected 12 minutes ago

▸ A new database engine makes local analytics faster
  Lead: Example Engineering · Published 2 hours ago · Read original ↗
  More coverage: Project notes ↗ · Independent benchmark ↗

▾ Researchers demonstrate a new battery recycling process
  Lead: Example Science · Published 4 hours ago · Read original ↗
  More coverage: Paper ↗ · Independent reporting ↗
  ┌ Agent summary · Updated 10 minutes ago
  │ A short account of the finding and its limits. [1]
  │ Context: why the result matters and what is still unknown. [2]
  │ Sources: [1] Reporting ↗  [2] Paper ↗
  │ More like this · Less like this
  │ Summary feedback: Helpful · Needs improvement
  └

▸ An illustrated guide to building a small compiler
  Lead: Example Blog · Published earlier · Found today · Read original ↗
```

Show a few related source links when available; “All sources” reveals a longer list inside the story. A one-source essay or project is a complete feed entry. Coverage volume must not crowd out niche discoveries or determine ranking by itself.

## Headline and source behavior

- The headline and chevron are one disclosure button: one click opens the inline summary, another closes it. There is no hover-only requirement or intermediate screen.
- Source names, citation links, and “Read original” navigate directly to the named source. Give them normal link behavior, including opening in another tab.
- Allow several stories to remain expanded. Opening one must not unexpectedly close another or move the reader's position.
- Support Enter/Space, visible focus, `aria-expanded`, and a named summary region. Respect reduced motion. Keep outbound links separate from the disclosure control.
- Preserve open stories and scroll position for the current session when returning from an article. Announce status changes without stealing keyboard focus.

## Expanded summary

Default to roughly 80–150 words: what happened or what the article explains, useful context, and limitations when relevant. Adjust to the story rather than forcing every essay into a breaking-news template. Prefer a short paragraph and at most a few key points. Link factual claims to the retrieved source evidence and show “Agent summary” with its update time.

Keep a single-source account clearly attributed. When coverage differs, explain the disagreement instead of blending incompatible claims. Context about why Zeke might care may be personalized; facts and uncertainty stay grounded in sources. Keep recommendation explanations distinct from factual reporting.

The summary agent improves two things through separate mechanisms: the current story gets factual updates from new evidence and corrections; future summaries improve in length, clarity, and context from explicit feedback. Reading behavior is a weak signal about presentation, not permission to embellish facts.

## Summary states

| State | What the reader sees |
| --- | --- |
| Ready | Stored, cited summary opens immediately |
| Preparing | Inline “Preparing summary” status and usable source links; opening does not block navigation |
| Unavailable | A short reason, such as missing source text or temporary generation failure, plus source links and a retry action when appropriate |
| New evidence pending | Last usable summary retains its timestamp; label says additional coverage is awaiting a summary update |
| Revised while open | “Updated summary available”; reader chooses when to replace the visible revision |
| Revised before opening | Latest published revision opens, with an updated timestamp and a short revision reason for material changes |

Do not show an invented summary as a fallback. Keep previously published revisions for inspection and rollback. Bound retries and generation costs in the worker.

## Feedback and learning

Keep “More like this” and “Less like this” about story relevance. “Helpful” and “Needs improvement” refer to the summary. The latter can collect “Too vague,” “Too long,” “Incorrect/missing context,” and an optional note. A summary complaint must not teach the collector to avoid a topic the reader likes.

Record visible story exposures, expansion/collapse, summary revision shown, active on-site summary time if useful, and specific outbound source clicks. Link them to the feed/profile version and position. Repeated opens are not multiple strong positive votes. A reader who expands a useful summary and never leaves the site may still have had a successful session.

“Add a link” remains a prominent action. Submitted examples join the appropriate story or create a standalone entry and teach topic preference. A submission may also supply missing evidence for a revised summary.

## First implementation boundary

Ship the compact story layout, independent source links, one-click summaries, explicit feedback, and submission flow together. Start with single-source stories and conservative grouping. Automated multi-source grouping and more sophisticated summary improvement follow in the second milestone. No application implementation is included in this revision.
