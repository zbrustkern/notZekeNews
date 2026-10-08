"use client";

import React, { useState } from "react";
import { Sparkles, ArrowUpRight, Check, ThumbsUp, ThumbsDown } from "lucide-react";
import { SummaryRevision, Citation } from "@/lib/domain/types";

interface SummaryInsetProps {
  storyId: string;
  summary?: SummaryRevision;
  onFeedback: (type: string, reason?: string) => void;
  onRetry?: () => void;
}

export function SummaryInset({ storyId, summary, onFeedback, onRetry }: SummaryInsetProps) {
  const [votedRelevance, setVotedRelevance] = useState<"positive" | "negative" | null>(null);
  const [votedQuality, setVotedQuality] = useState<"helpful" | "needs_improvement" | null>(null);
  const [showQualityDetails, setShowQualityDetails] = useState(false);

  if (!summary) {
    return (
      <div className="bg-[#EDF2EB] border-l-2 border-[#21665D] p-5 my-3 rounded-r-md text-sm text-[#5D717B]">
        <p className="animate-pulse">Preparing agent brief...</p>
      </div>
    );
  }

  if (summary.status === "unavailable") {
    return (
      <div className="bg-[#EDF2EB] border-l-2 border-[#C9633F] p-5 my-3 rounded-r-md text-sm text-[#5D717B]">
        <p className="font-medium text-[#182B33] mb-1">Summary unavailable</p>
        <p className="text-xs text-[#5D717B] mb-3">{summary.markdownText}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs font-semibold text-[#21665D] hover:underline"
          >
            Retry generation
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#EDF2EB] border-l-2 border-[#21665D] p-5 my-3.5 rounded-r-md shadow-sm transition-all duration-150">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 text-xs tracking-wider font-semibold text-[#21665D]">
        <div className="flex items-center space-x-1.5 uppercase">
          <Sparkles className="w-3.5 h-3.5 stroke-[2.2]" />
          <span>Agent Brief</span>
        </div>
        <span className="text-[#5D717B] font-normal tracking-normal text-xs">
          Updated {formatTimeAgo(summary.updatedAt)}
        </span>
      </div>

      {/* Summary Body */}
      <div className="text-[15px] leading-relaxed text-[#182B33] space-y-3 font-sans">
        <p>{renderTextWithCitations(summary.markdownText, summary.citations)}</p>

        {summary.whyItMatters && (
          <p>
            <strong className="font-semibold text-[#182B33]">Why it matters:</strong>{" "}
            {renderTextWithCitations(summary.whyItMatters, summary.citations)}
          </p>
        )}
      </div>

      {/* Citation Chips */}
      {summary.citations && summary.citations.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-3.5 pb-2">
          {summary.citations.map((c) => (
            <a
              key={c.index}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-2.5 py-1 bg-white hover:bg-[#F7F5EF] border border-[#D5DDD3] rounded text-xs text-[#21665D] font-medium transition-colors shadow-2xs group"
            >
              <span className="mr-1 text-[#5D717B] font-sans font-normal">[{c.index}]</span>
              <span>{c.sourceName}</span>
              <ArrowUpRight className="w-3 h-3 ml-1 text-[#21665D] group-hover:translate-x-0.5 transition-transform" />
            </a>
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-[#DFE7DD] mt-3 pt-3 flex flex-wrap items-center justify-between text-xs text-[#5D717B]">
        {/* Story Relevance Controls */}
        <div className="flex items-center space-x-2">
          {votedRelevance ? (
            <span className="inline-flex items-center text-[#21665D] font-medium">
              <Check className="w-3.5 h-3.5 mr-1" />
              Relevance feedback recorded
            </span>
          ) : (
            <>
              <button
                onClick={() => {
                  setVotedRelevance("positive");
                  onFeedback("relevance_positive");
                }}
                className="hover:text-[#21665D] hover:underline transition-colors focus:outline-none"
              >
                More like this
              </button>
              <span className="text-[#C2CEC0]">·</span>
              <button
                onClick={() => {
                  setVotedRelevance("negative");
                  onFeedback("relevance_negative");
                }}
                className="hover:text-[#C9633F] hover:underline transition-colors focus:outline-none"
              >
                Less like this
              </button>
            </>
          )}
        </div>

        {/* Separator */}
        <span className="hidden sm:inline text-[#C2CEC0]">|</span>

        {/* Summary Writing Quality Controls */}
        <div className="flex items-center space-x-1.5 mt-2 sm:mt-0">
          <span className="text-[#5D717B]">Summary:</span>
          {votedQuality ? (
            <span className="text-[#21665D] font-medium ml-1">
              Feedback saved
            </span>
          ) : (
            <>
              <button
                onClick={() => {
                  setVotedQuality("helpful");
                  onFeedback("summary_helpful");
                }}
                className="font-medium text-[#21665D] hover:underline focus:outline-none ml-1"
              >
                Helpful
              </button>
              <span className="text-[#C2CEC0]">·</span>
              <button
                onClick={() => setShowQualityDetails(!showQualityDetails)}
                className="font-medium text-[#5D717B] hover:text-[#C9633F] hover:underline focus:outline-none"
              >
                Needs improvement
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded Quality Options */}
      {showQualityDetails && !votedQuality && (
        <div className="mt-3 pt-2 border-t border-[#DFE7DD] flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#5D717B] font-medium">What could be better?</span>
          {["Too vague", "Too long", "Incorrect/missing context"].map((reason) => (
            <button
              key={reason}
              onClick={() => {
                setVotedQuality("needs_improvement");
                setShowQualityDetails(false);
                onFeedback("summary_needs_improvement", reason);
              }}
              className="px-2.5 py-1 bg-white hover:bg-[#F2EFE8] border border-[#D5DDD3] rounded text-[#182B33] transition-colors"
            >
              {reason}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function renderTextWithCitations(text: string, citations?: Citation[]) {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, index) => {
    const match = part.match(/\[(\d+)\]/);
    if (match) {
      const citNum = parseInt(match[1], 10);
      const citation = citations?.find((c) => c.index === citNum);
      if (citation) {
        return (
          <a
            key={index}
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#21665D] font-semibold hover:underline px-0.5 inline-block"
            title={`${citation.sourceName}: ${citation.claimExcerpt}`}
          >
            [{citNum}]
          </a>
        );
      }
      return (
        <span key={index} className="text-[#21665D] font-semibold">
          [{citNum}]
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function formatTimeAgo(isoString: string): string {
  try {
    const elapsedMs = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(elapsedMs / (1000 * 60));
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    return "earlier";
  } catch {
    return "recently";
  }
}
