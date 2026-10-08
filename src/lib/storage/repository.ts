import {
  Story,
  Article,
  SummaryRevision,
  Source,
  Submission,
  Preference,
  InteractionEvent,
  InterestProfile,
} from "../domain/types";

export interface INewsRepository {
  getStories(limit?: number): Promise<Story[]>;
  getStoryById(id: string): Promise<Story | null>;
  saveStory(story: Story): Promise<void>;
  updateStoryScore(id: string, score: number): Promise<void>;

  saveArticle(article: Article): Promise<void>;
  getArticleById(id: string): Promise<Article | null>;
  getArticleByCanonicalUrl(url: string): Promise<Article | null>;

  saveSummaryRevision(revision: SummaryRevision): Promise<void>;
  getSummaryRevisionByStoryId(storyId: string): Promise<SummaryRevision | null>;

  getSources(onlyEnabled?: boolean): Promise<Source[]>;
  saveSource(source: Source): Promise<void>;
  updateSourceStats(
    id: string,
    health: Source["healthStatus"],
    lastPolled: string,
    articlesDelta?: number
  ): Promise<void>;

  saveSubmission(submission: Submission): Promise<void>;
  getSubmissions(): Promise<Submission[]>;
  updateSubmissionStatus(id: string, status: Submission["status"], error?: string): Promise<void>;

  getPreferences(readerId: string): Promise<Preference | null>;
  savePreferences(pref: Preference): Promise<void>;

  logEvent(event: InteractionEvent): Promise<void>;
  getEvents(limit?: number): Promise<InteractionEvent[]>;

  getLatestProfile(readerId: string): Promise<InterestProfile | null>;
  saveProfile(profile: InterestProfile): Promise<void>;
}
