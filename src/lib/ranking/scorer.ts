import { Story, Preference, InterestProfile, SteeringTier } from "../domain/types";

export interface ScoreBreakdown {
  total: number;
  topicScore: number;
  freshnessScore: number;
  sourceScore: number;
  submissionBonus: number;
  explorationJitter: number;
  isBlocked: boolean;
  explanation: string;
}

/**
 * Calculates a transparent ranking score for a story based on explicit preferences,
 * steerable dials (over-index / under-index / ban), learned profile, and freshness.
 */
export function scoreStory(
  story: Story,
  preferences?: Preference | null,
  profile?: InterestProfile | null
): ScoreBreakdown {
  let isBlocked = false;
  let blockReason = "";
  let topicScore = 0;
  let sourceScore = 0;
  let submissionBonus = story.isUserSubmitted ? 50 : 0;
  const factors: string[] = [];

  if (story.isUserSubmitted) {
    factors.push("Added by you (+50)");
  }

  // 1. Check Explicit Steering & Legacy Exclusions
  if (preferences) {
    const steeredTopics = preferences.steeredTopics || {};
    const steeredSources = preferences.steeredSources || {};

    // A. Check Source Steering
    const sourceKey = story.leadSourceName.toLowerCase().trim();
    for (const [srcName, tier] of Object.entries(steeredSources)) {
      if (sourceKey.includes(srcName.toLowerCase().trim())) {
        if (tier === "banned") {
          isBlocked = true;
          blockReason = `Banned source: ${story.leadSourceName}`;
        } else if (tier === "over_index") {
          sourceScore += 40;
          factors.push(`⚡ Over-indexed source (${srcName}: +40)`);
        } else if (tier === "under_index") {
          sourceScore -= 40;
          factors.push(`📉 Under-indexed source (${srcName}: -40)`);
        }
      }
    }

    // Legacy Blocked Sources
    for (const blockedSrc of preferences.blockedSources) {
      if (sourceKey.includes(blockedSrc.toLowerCase().trim())) {
        isBlocked = true;
        blockReason = `Blocked source: ${story.leadSourceName}`;
      }
    }

    // B. Check Topic Steering
    const storyHeadlineLower = story.headline.toLowerCase();
    const storyTopicLower = story.primaryTopic.toLowerCase();

    for (const [topicName, tier] of Object.entries(steeredTopics)) {
      const targetLower = topicName.toLowerCase().trim();
      if (storyTopicLower.includes(targetLower) || storyHeadlineLower.includes(targetLower)) {
        if (tier === "banned") {
          isBlocked = true;
          blockReason = `Muted topic: ${topicName}`;
        } else if (tier === "over_index") {
          topicScore += 40;
          factors.push(`⚡ Over-indexed topic (${topicName}: +40)`);
        } else if (tier === "under_index") {
          topicScore -= 40;
          factors.push(`📉 Under-indexed topic (${topicName}: -40)`);
        }
      }
    }

    // Legacy Blocked Topics
    for (const blocked of preferences.blockTopics) {
      const bLower = blocked.toLowerCase().trim();
      if (storyTopicLower.includes(bLower) || storyHeadlineLower.includes(bLower)) {
        isBlocked = true;
        blockReason = `Blocked topic: ${blocked}`;
      }
    }

    // Legacy Allowlist Boosts (if not already handled by steering)
    for (const allowed of preferences.allowTopics) {
      const aLower = allowed.toLowerCase().trim();
      if (!steeredTopics[allowed] && (storyTopicLower.includes(aLower) || storyHeadlineLower.includes(aLower))) {
        topicScore += 30;
        factors.push(`Preferred topic (${allowed}: +30)`);
      }
    }
    for (const prefSrc of preferences.preferredSources) {
      if (!steeredSources[prefSrc] && sourceKey.includes(prefSrc.toLowerCase().trim())) {
        sourceScore += 25;
        factors.push(`Preferred source (${prefSrc}: +25)`);
      }
    }
  }

  // 2. Learned Profile Weights (Continuous Inferred Drift)
  if (profile && !preferences?.pauseLearning && !isBlocked) {
    const topicWeight = profile.topicWeights[story.primaryTopic.toLowerCase()] || 1.0;
    if (Math.abs(topicWeight - 1.0) > 0.05) {
      const delta = Math.round((topicWeight - 1.0) * 20);
      topicScore += delta;
      factors.push(`Learned topic affinity (${delta >= 0 ? "+" : ""}${delta})`);
    }

    const srcWeight = profile.sourceAffinities[story.leadSourceName.toLowerCase()] || 1.0;
    if (Math.abs(srcWeight - 1.0) > 0.05) {
      const delta = Math.round((srcWeight - 1.0) * 15);
      sourceScore += delta;
      factors.push(`Learned source affinity (${delta >= 0 ? "+" : ""}${delta})`);
    }
  }

  // 3. Freshness Decay (24-hour half-life)
  const discoveredMs = new Date(story.leadDiscoveredAt).getTime();
  const ageHours = Math.max(0, (Date.now() - discoveredMs) / (1000 * 3600));
  const freshnessScore = Math.round(40 * Math.pow(0.5, ageHours / 24));
  factors.push(`Freshness (${Math.round(ageHours)}h ago: +${freshnessScore})`);

  // 4. Exploration Jitter (bounded serendipity factor 0-10 pts)
  const explorationFactor = profile?.explorationFactor ?? 0.1;
  const explorationJitter = Math.round(Math.random() * 10 * explorationFactor);
  if (explorationJitter > 0) {
    factors.push(`Exploration (+${explorationJitter})`);
  }

  const total = isBlocked
    ? -1000
    : Math.max(0, 50 + topicScore + sourceScore + freshnessScore + submissionBonus + explorationJitter);

  const explanation = isBlocked
    ? `Excluded: ${blockReason}`
    : `Total: ${total} pts · ${factors.join(" · ")}`;

  return {
    total,
    topicScore,
    freshnessScore,
    sourceScore,
    submissionBonus,
    explorationJitter,
    isBlocked,
    explanation,
  };
}
