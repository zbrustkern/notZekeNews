import { runCollection } from "../lib/ingestion/collector";

async function main() {
  console.log("Starting NotZeke News background collection worker...");
  const results = await runCollection();
  console.log("\nCollection Results Summary:");
  let totalNewArticles = 0;
  let totalNewStories = 0;

  for (const r of results) {
    console.log(`- ${r.sourceName}: ${r.fetchedItems} fetched, ${r.newArticles} new articles, ${r.newStories} new stories`);
    if (r.errors.length > 0) {
      console.log(`  Warnings/Errors: ${r.errors.join("; ")}`);
    }
    totalNewArticles += r.newArticles;
    totalNewStories += r.newStories;
  }

  console.log(`\nCompleted! Total new articles: ${totalNewArticles}, total new stories: ${totalNewStories}`);
}

main().catch((err) => {
  console.error("Worker failed:", err);
  process.exit(1);
});
