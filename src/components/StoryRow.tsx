"use client";

import React, { useState } from "react";
import { ChevronRight, ArrowUpRight } from "lucide-react";
import { Story } from "@/lib/domain/types";
import { SummaryInset } from "./SummaryInset";

interface StoryRowProps {
  story: Story;
  isFirst?: boolean;
  onFeedback: (storyId: string, feedbackType: string, reason?: string) => void;
}

export function StoryRow({ story, isFirst, onFeedback }: StoryRowProps) {
  // If first story, default to expanded as seen in mockup expanded-summary-v2
  const [isExpanded, setIsExpanded] = useState(isFirst || false);

  const toggleExpansion = () => {
    setIsExpanded((prev) => !prev);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleExpansion();
    }
  };

  return (
    <article
      className={`border-b border-[#E2DDD1] py-5 transition-colors ${
        isFirst && !isExpanded ? "bg-[#FAF8F3] -mx-4 px-4 rounded-md" : ""
      }`}
    >
      {/* Topic Badge & Header */}
      <div className="flex items-center space-x-2 mb-1.5">
        <span className="text-[11px] font-bold tracking-wider text-[#C9633F] uppercase font-sans">
          {story.primaryTopic}
        </span>
        {story.isUserSubmitted && (
          <span className="text-[10px] bg-[#E8F0EE] text-[#21665D] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Added by you
          </span>
        )}
      </div>

      {/* Main Headline & Chevron Row */}
      <div className="flex items-start justify-between gap-4">
        <button
          onClick={toggleExpansion}
          onKeyDown={handleKeyDown}
          aria-expanded={isExpanded}
          className="text-left group flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#21665D] rounded"
        >
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#182B33] leading-snug group-hover:text-[#21665D] transition-colors">
            {story.headline}
          </h2>
        </button>

        {/* Circular Chevron Disclosure Indicator */}
        <button
          onClick={toggleExpansion}
          aria-label={isExpanded ? "Collapse summary" : "Expand summary"}
          className="w-8 h-8 rounded-full border border-[#D5DDD3] hover:border-[#182B33] flex items-center justify-center flex-shrink-0 text-[#182B33] hover:bg-[#EDE8DC] transition-all focus:outline-none focus:ring-2 focus:ring-[#21665D]"
        >
          <ChevronRight
            className={`w-4 h-4 transition-transform duration-200 ${
              isExpanded ? "rotate-90" : "rotate-0"
            }`}
          />
        </button>
      </div>

      {/* Metadata Line */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#5D717B] mt-2 font-sans">
        <span>{story.leadSourceName}</span>
        <span className="text-[#C2CEC0]">·</span>
        <span>{formatTimeAgo(story.leadPublishedAt || story.leadDiscoveredAt)}</span>
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

function formatTimeAgo(isoString?: string): string {
  if (!isoString) return "recently";
  try {
    const elapsedMs = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(elapsedMs / (1000 * 60));
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  } catch {
    return "recently";
  }
}
