import { repository } from "./sqlite-repository";
import { Story, Source, Preference, TopicCategory } from "../domain/types";

export async function runSeed() {
  console.log("Seeding NotZeke News initial sources, stories, and preferences...");

  // 1. Seed Sources
  const seedSources: Source[] = [
    {
      id: "src_hn",
      name: "Hacker News Top",
      feedUrl: "https://news.ycombinator.com/rss",
      siteUrl: "https://news.ycombinator.com",
      category: "SYSTEMS",
      isEnabled: true,
      healthStatus: "healthy",
      consecutiveFailures: 0,
      articlesCount: 30,
    },
    {
      id: "src_simon",
      name: "Simon Willison's Weblog",
      feedUrl: "https://simonwillison.net/atom/entries/",
      siteUrl: "https://simonwillison.net",
      category: "ENGINEERING",
      isEnabled: true,
      healthStatus: "healthy",
      consecutiveFailures: 0,
      articlesCount: 15,
    },
    {
      id: "src_danluu",
      name: "Dan Luu",
      feedUrl: "https://danluu.com/atom.xml",
      siteUrl: "https://danluu.com",
      category: "SYSTEMS",
      isEnabled: true,
      healthStatus: "healthy",
      consecutiveFailures: 0,
      articlesCount: 5,
    },
    {
      id: "src_ars",
      name: "Ars Technica",
      feedUrl: "https://feeds.arstechnica.com/arstechnica/index",
      siteUrl: "https://arstechnica.com",
      category: "SCIENCE",
      isEnabled: true,
      healthStatus: "healthy",
      consecutiveFailures: 0,
      articlesCount: 20,
    },
  ];

  for (const src of seedSources) {
    await repository.saveSource(src);
  }

  // 2. Seed Initial Stories (matching visual mockups feed-v2 and expanded-summary-v2)
  const initialStories: Story[] = [
    {
      id: "story_1",
      headline: "A small database engine brings fast analytics to your laptop",
      primaryTopic: "ENGINEERING",
      leadArticleId: "art_db_lead",
      leadSourceName: "Example Engineering",
      leadPublishedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      leadDiscoveredAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      readOriginalUrl: "https://example.com/engineering/local-analytics-engine",
      relatedCoverage: [
        {
          label: "Project notes",
          url: "https://example.com/project-notes",
          sourceName: "Project notes",
        },
        {
          label: "Independent benchmark",
          url: "https://example.com/benchmark",
          sourceName: "Independent benchmark",
        },
      ],
      articleIds: ["art_db_lead", "art_db_notes", "art_db_bench"],
      summaryRevision: {
        id: "sum_rev_1",
        storyId: "story_1",
        version: 1,
        markdownText:
          "The project combines a small local footprint with column-oriented execution to make analytical queries practical on a laptop. Its early benchmarks look promising, but independent testing is still limited. [1]",
        whyItMatters:
          "this could simplify local data exploration without running a separate analytics service. The trade-offs are still worth checking against your own workload. [2]",
        citations: [
          {
            index: 1,
            articleId: "art_db_notes",
            sourceName: "Project notes",
            url: "https://example.com/project-notes",
            claimExcerpt: "Early benchmarks show fast vectorized execution locally.",
          },
          {
            index: 2,
            articleId: "art_db_bench",
            sourceName: "Independent benchmark",
            url: "https://example.com/benchmark",
            claimExcerpt: "Memory overhead remains low compared to full analytical engines.",
          },
        ],
        evidenceFingerprint: "fp_db_story_v1",
        modelVersion: "gemini-2.5-flash",
        status: "ready",
        createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      },
      rankingScore: 98,
    },
    {
      id: "story_2",
      headline: "A new recycling process could recover more battery materials",
      primaryTopic: "SCIENCE",
      leadArticleId: "art_battery_lead",
      leadSourceName: "Example Science",
      leadPublishedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      leadDiscoveredAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      readOriginalUrl: "https://example.com/science/battery-recycling",
      relatedCoverage: [
        {
          label: "Research paper",
          url: "https://example.com/paper",
          sourceName: "Research paper",
        },
        {
          label: "Independent reporting",
          url: "https://example.com/reporting",
          sourceName: "Independent reporting",
        },
      ],
      articleIds: ["art_battery_lead"],
      summaryRevision: {
        id: "sum_rev_2",
        storyId: "story_2",
        version: 1,
        markdownText:
          "Researchers demonstrated an electrochemical separation method that reclaims high-purity cathode salts at lower temperatures than conventional smelting. [1]",
        whyItMatters:
          "Reduces the energy intensity and acidic byproduct of domestic battery recycling pipelines, though industrial scaling remains untested. [2]",
        citations: [
          {
            index: 1,
            articleId: "art_battery_lead",
            sourceName: "Research paper",
            url: "https://example.com/paper",
            claimExcerpt: "Electrochemical extraction achieves 94% purity at ambient temperature.",
          },
          {
            index: 2,
            articleId: "art_battery_lead",
            sourceName: "Independent reporting",
            url: "https://example.com/reporting",
            claimExcerpt: "Scalability beyond pilot reactors is currently pending verification.",
          },
        ],
        evidenceFingerprint: "fp_battery_v1",
        modelVersion: "gemini-2.5-flash",
        status: "ready",
        createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      },
      rankingScore: 92,
    },
    {
      id: "story_3",
      headline: "An illustrated guide to building a compiler from scratch",
      primaryTopic: "MAKING",
      leadArticleId: "art_compiler_lead",
      leadSourceName: "Example Blog",
      leadPublishedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      leadDiscoveredAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      readOriginalUrl: "https://example.com/blog/compiler-from-scratch",
      relatedCoverage: [],
      articleIds: ["art_compiler_lead"],
      summaryRevision: {
        id: "sum_rev_3",
        storyId: "story_3",
        version: 1,
        markdownText:
          "A step-by-step visual tutorial walking through recursive descent parsing, AST generation, and x86 code emission for a minimal typed expression language. [1]",
        whyItMatters:
          "Focuses on understandable compiler fundamentals and debugging bytecode rather than relying on parser generator tools. [1]",
        citations: [
          {
            index: 1,
            articleId: "art_compiler_lead",
            sourceName: "Example Blog",
            url: "https://example.com/blog/compiler-from-scratch",
            claimExcerpt: "Step-by-step assembly generation without yacc or bison dependencies.",
          },
        ],
        evidenceFingerprint: "fp_compiler_v1",
        modelVersion: "gemini-2.5-flash",
        status: "ready",
        createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      },
      rankingScore: 88,
    },
    {
      id: "story_4",
      headline: "What a 40-year-old spacecraft can teach us about reliable software",
      primaryTopic: "SYSTEMS",
      leadArticleId: "art_spacecraft_lead",
      leadSourceName: "Example Journal",
      leadPublishedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      leadDiscoveredAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      readOriginalUrl: "https://example.com/journal/spacecraft-software",
      relatedCoverage: [],
      articleIds: ["art_spacecraft_lead"],
      rankingScore: 84,
    },
    {
      id: "story_5",
      headline: "An open-source tool turns messy public data into readable maps",
      primaryTopic: "SYSTEMS",
      leadArticleId: "art_maps_lead",
      leadSourceName: "Example Projects",
      leadPublishedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      leadDiscoveredAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      readOriginalUrl: "https://example.com/projects/readable-maps",
      relatedCoverage: [],
      articleIds: ["art_maps_lead"],
      rankingScore: 79,
    },
  ];

  for (const story of initialStories) {
    await repository.saveStory(story);
  }

  // 3. Seed Preferences for Zeke
  const zekePreferences: Preference = {
    id: "pref_zeke",
    readerId: "zeke",
    allowTopics: ["Engineering", "Systems", "Science", "Making", "Compilers", "Databases"],
    blockTopics: ["Celebrity", "Cryptocurrency Speculation"],
    preferredSources: ["Hacker News Top", "Simon Willison's Weblog", "Dan Luu"],
    blockedSources: [],
    pauseLearning: false,
    updatedAt: new Date().toISOString(),
  };

  await repository.savePreferences(zekePreferences);

  console.log("Database seeded successfully with mockup stories and preferences!");
}

// Auto-run if executed directly via tsx
if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
