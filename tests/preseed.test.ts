import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PRESEED_SOURCES, preseedSources } from "@/lib/ingestion/preseed";
import { repository } from "@/lib/storage/sqlite-repository";
import { db } from "@/lib/storage/db";
import { sourcesTable } from "@/lib/storage/schema";
import { inArray } from "drizzle-orm";

describe("Preseed Sources & Feed Refresh", () => {
  const preseedIds = PRESEED_SOURCES.map((s) => s.id);

  beforeEach(async () => {
    // Clean up preseed sources before testing
    db.delete(sourcesTable).where(inArray(sourcesTable.id, preseedIds)).run();
  });

  afterEach(async () => {
    // Clean up
    db.delete(sourcesTable).where(inArray(sourcesTable.id, preseedIds)).run();
  });

  it("contains Marginal Revolution, TechCrunch, and MIT Technology Review in PRESEED_SOURCES", () => {
    const mr = PRESEED_SOURCES.find((s) => s.name === "Marginal Revolution");
    expect(mr).toBeDefined();
    expect(mr?.feedUrl).toBe("https://marginalrevolution.com/feed");
    expect(mr?.category).toBe("SYSTEMS");

    const tc = PRESEED_SOURCES.find((s) => s.name === "TechCrunch");
    expect(tc).toBeDefined();
    expect(tc?.feedUrl).toBe("https://techcrunch.com/feed/");
    expect(tc?.category).toBe("ENGINEERING");

    const mit = PRESEED_SOURCES.find((s) => s.name === "MIT Technology Review");
    expect(mit).toBeDefined();
    expect(mit?.feedUrl).toBe("https://www.technologyreview.com/feed/");
    expect(mit?.category).toBe("SCIENCE");
  });

  it("adds all preseed sources into repository on first run without duplicates", async () => {
    const result1 = await preseedSources(false); // pollImmediately = false for fast test
    expect(result1.added.length).toBe(PRESEED_SOURCES.length);

    // Verify they exist in repository
    const sources = await repository.getSources(false);
    const names = sources.map((s) => s.name);
    expect(names).toContain("Marginal Revolution");
    expect(names).toContain("TechCrunch");
    expect(names).toContain("MIT Technology Review");

    // Re-running preseed is idempotent
    const result2 = await preseedSources(false);
    expect(result2.added.length).toBe(0);
  });
});
