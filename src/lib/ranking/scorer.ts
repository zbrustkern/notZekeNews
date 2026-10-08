import { Story, Preference, InterestProfile } from "../domain/types";

export interface ScoreBreakdown {
  total: number;
  topicScore: number;
  freshnessScore: number;
  sourceScore: number;
  submissionBonus: number;
  explorationJitter: number;
  isBlocked: boolean;
}

/**
 * Calculates a transparent ranking score for a story based on explicit preferences,
 * learned profile, and freshness.
 */
export function scoreStory(
  story: Story,
  preferences?: Preference | null,
  profile?: InterestProfile | null
): ScoreBreakdown {
  let isBlocked = false;
  let topicScore = 0;
  let sourceScore = 0;
  let submissionBonus = story.isUserSubmitted ? 50 : 0;

  // 1. Check Explicit Exclusions
  if (preferences) {
    for (const blocked of preferences.blockTopics) {
      if (
        story.primaryTopic.toLowerCase().includes(blocked.toLowerCase()) ||
        story.headline.toLowerCase().includes(blocked.toLowerCase())
      ) {
        isBlocked = true;
      }
    }
    for (const blockedSrc of preferences.blockedSources) {
      if (story.leadSourceName.toLowerCase().includes(blockedSrc.toLowerCase())) {
        isBlocked = true;
      }
    }

    // 2. Explicit Allowlist Boosts
    for (const allowed of preferences.allowTopics) {
      if (
        story.primaryTopic.toLowerCase() === allowed.toLowerCase() ||
        story.headline.toLowerCase().includes(allowed.toLowerCase())
      ) {
        topicScore += 30;
      }
    }
    for (const prefSrc of preferences.preferredSources) {
      if (story.leadSourceName.toLowerCase().includes(prefSrc.toLowerCase())) {
        sourceScore += 25;
      }
    }
  }

  // 3. Learned Profile Weights
  if (profile && !preferences?.pauseLearning) {
    const topicWeight = profile.topicWeights[story.primaryTopic.toLowerCase()] || 1.0;
    topicScore += Math.round((topicWeight - 1.0) * 20);

    const srcWeight = profile.sourceAffinities[story.leadSourceName.toLowerCase()] || 1.0;
    sourceScore += Math.round((srcWeight - 1.0) * 15);
  }

  // 4. Freshness Decay (24-hour half-life)
  const discoveredMs = new Date(story.leadDiscoveredAt).getTime();
  const ageHours = Math.max(0, (Date.now() - discoveredMs) / (1000 * 3600));
  const freshnessScore = Math.round(40 * Math.pow(0.5, ageHours / 24));

  // 5. Exploration Jitter (bounded serendipity factor 0-10 pts)
  const explorationFactor = profile?.explorationFactor ?? 0.1;
  const explorationJitter = Math.round(Math.random() * 10 * explorationFactor);

  const total = isBlocked
    ? -1000
    : Math.max(0, 50 + topicScore + sourceScore + freshnessScore + submissionBonus + explorationJitter);

  return {
    total,
    topicScore,
    freshnessScore,
    sourceScore,
    submissionBonus,
    explorationJitter,
    isBlocked,
  };
}
