"use client";

import React, { useState } from "react";
import { ChevronRight, ArrowUpRight, Undo2 } from "lucide-react";
import { Story, SteeringTier } from "@/lib/domain/types";
import { SummaryInset } from "./SummaryInset";
import { StoryMenu } from "./StoryMenu";
import { formatTimeAgo } from "@/lib/format";

interface StoryRowProps {
  story: Story;
  isFirst?: boolean;
  onFeedback: (storyId: string, feedbackType: string, reason?: string) => void;
  onSteer?: (targetType: "topic" | "source", name: string, tier: SteeringTier) => void;
}

export function StoryRow({ story, isFirst, onFeedback, onSteer }: StoryRowProps) {
  const [isExpanded, setIsExpanded] = useState(isFirst || false);
  const [bannedState, setBannedState] = useState<{
    targetType: "topic" | "source";
    name: string;
  } | null>(null);

  const toggleExpansion = () => {
    setIsExpanded((prev) => !prev);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleExpansion();
    }
  };

  const handleSteer = (targetType: "topic" | "source", name: string, tier: SteeringTier) => {
    if (tier === "banned") {
      setBannedState({ targetType, name });
    }
    if (onSteer) {
      onSteer(targetType, name, tier);
    }
  };

  const handleUndoBan = () => {
    if (bannedState && onSteer) {
      onSteer(bannedState.targetType, bannedState.name, "neutral");
      setBannedState(null);
    }
  };

  if (bannedState) {
    return (
      <div className="py-4 px-3 my-2 bg-[#F5EBE6] border border-[#ECD1C6] rounded-md text-xs text-[#A65B32] flex items-center justify-between transition-all">
        <span>
          You won’t see stories from <strong>{bannedState.name}</strong> anymore.
        </span>
        <button
          onClick={handleUndoBan}
          className="inline-flex items-center text-[#21665D] font-semibold hover:underline ml-3"
        >
          <Undo2 className="w-3.5 h-3.5 mr-1" />
          Undo
        </button>
      </div>
    );
  }

  return (
    <article
      className={`border-b border-[#E2DDD1] py-4 sm:py-5 transition-colors ${
        isFirst && !isExpanded ? "bg-[#FAF8F3] -mx-4 px-4 rounded-md" : ""
      }`}
    >
      {/* Topic Badge & Options */}
      <div className="flex items-center justify-between gap-2 mb-1 sm:mb-1.5 min-h-[24px]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-bold tracking-wider text-[#C9633F] uppercase font-sans truncate">
            {story.primaryTopic}
          </span>
          {story.isUserSubmitted && (
            <span className="text-[10px] bg-[#E8F0EE] text-[#21665D] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap">
              Added by you
            </span>
          )}
        </div>

        <div className="sm:hidden -mr-2 flex-shrink-0">
          <StoryMenu story={story} onSteer={handleSteer} />
        </div>
      </div>

      {/* Main Headline & Controls Row */}
      <div className="flex items-start justify-between gap-3">
        <button
          onClick={toggleExpansion}
          onKeyDown={handleKeyDown}
          aria-expanded={isExpanded}
          className="text-left group flex-1 min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#21665D] rounded"
        >
          <h2 className="text-[19px] sm:text-2xl font-serif font-bold text-[#182B33] leading-snug group-hover:text-[#21665D] transition-colors">
            {story.headline}
          </h2>
        </button>

        {/* Action Controls: StoryMenu + Chevron (desktop) */}
        <div className="hidden sm:flex items-center space-x-1.5 flex-shrink-0 pt-0.5">
          <StoryMenu story={story} onSteer={handleSteer} />

          <button
            onClick={toggleExpansion}
            aria-label={isExpanded ? "Collapse summary" : "Expand summary"}
            className="w-8 h-8 rounded-full border border-[#D5DDD3] hover:border-[#182B33] flex items-center justify-center text-[#182B33] hover:bg-[#EDE8DC] transition-all focus:outline-none focus:ring-2 focus:ring-[#21665D]"
          >
            <ChevronRight
              className={`w-4 h-4 transition-transform duration-200 ${
                isExpanded ? "rotate-90" : "rotate-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Metadata Line */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] sm:text-sm text-[#5D717B] mt-1.5 sm:mt-2 font-sans">
        <span>{story.leadSourceName}</span>
        <span className="text-[#C2CEC0]">·</span>
        <span suppressHydrationWarning>{formatTimeAgo(story.leadPublishedAt || story.leadDiscoveredAt)}</span>
        <span className="text-[#C2CEC0]">·</span>
        <a
          href={story.readOriginalUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center text-[#21665D] hover:text-[#184F47] hover:underline font-medium group"
        >
          <span>Read original</span>
          <ArrowUpRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </div>

      {/* Related Coverage */}
      {story.relatedCoverage && story.relatedCoverage.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 text-sm text-[#5D717B] mt-1.5 font-sans">
          <span className="font-medium text-[#7A8E97]">More coverage:</span>
          {story.relatedCoverage.map((item, idx) => (
            <React.Fragment key={idx}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center text-[#21665D] hover:underline"
              >
                <span>{item.label}</span>
                <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </a>
              {idx < story.relatedCoverage.length - 1 && (
                <span className="text-[#C2CEC0]">·</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Inline Expanded Summary */}
      {isExpanded && (
        <SummaryInset
          storyId={story.id}
          summary={story.summaryRevision}
          onFeedback={(type, reason) => onFeedback(story.id, type, reason)}
        />
      )}
    </article>
  );
}
