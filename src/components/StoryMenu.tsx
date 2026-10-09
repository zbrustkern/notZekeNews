"use client";

import React, { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Zap, TrendingDown, Ban, Info, Check } from "lucide-react";
import { Story, SteeringTier } from "@/lib/domain/types";

interface StoryMenuProps {
  story: Story;
  onSteer: (targetType: "topic" | "source", name: string, tier: SteeringTier) => void;
}

export function StoryMenu({ story, onSteer }: StoryMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowWhy(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (targetType: "topic" | "source", name: string, tier: SteeringTier) => {
    onSteer(targetType, name, tier);
    const label =
      tier === "over_index"
        ? `Showing more ${name}`
        : tier === "under_index"
        ? `Showing less ${name}`
        : `Hid ${name}`;
    setFeedbackToast(label);
    setTimeout(() => {
      setFeedbackToast(null);
      setIsOpen(false);
    }, 1200);
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
          setShowWhy(false);
        }}
        aria-label="Story options"
        className="w-10 h-10 sm:w-8 sm:h-8 rounded-full hover:bg-[#EAE4D7] text-[#5D717B] hover:text-[#182B33] flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#21665D]"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-10 sm:top-9 z-30 w-72 max-w-[calc(100vw-2rem)] bg-[#FAF8F3] border border-[#D5DDD3] rounded-lg shadow-xl py-2 text-xs font-sans text-[#182B33] animate-in fade-in zoom-in-95 duration-100"
        >
          {feedbackToast ? (
            <div className="p-4 text-center text-[#21665D] font-medium flex items-center justify-center space-x-1.5">
              <Check className="w-4 h-4" />
              <span>{feedbackToast}</span>
            </div>
          ) : showWhy ? (
            <div className="p-3.5 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-[#E2DDD1]">
                <span className="font-semibold text-[#182B33] flex items-center">
                  <Info className="w-3.5 h-3.5 mr-1 text-[#21665D]" />
                  Why you’re seeing this
                </span>
                <button
                  onClick={() => setShowWhy(false)}
                  className="text-[#5D717B] hover:text-[#182B33] text-[11px]"
                >
                  Back
                </button>
              </div>
              <p className="text-[#3A4D56] text-xs leading-relaxed">
                {story.rankingExplanation || `Based on your interest in ${story.primaryTopic} and how recent this story is.`}
              </p>
            </div>
          ) : (
            <>
              {/* Topic Steering Section */}
              <div className="px-3 py-1.5 border-b border-[#E8E2D5]">
                <div className="text-[10px] font-bold tracking-wider text-[#7A8E97] uppercase mb-1">
                  Topic: {story.primaryTopic}
                </div>
                <button
                  onClick={() => handleAction("topic", story.primaryTopic, "over_index")}
                  className="w-full text-left py-2 sm:py-1 px-1.5 rounded hover:bg-[#EDF2EB] text-[#21665D] font-medium flex items-center space-x-2 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 text-[#21665D]" />
                  <span>Show more from this topic</span>
                </button>
                <button
                  onClick={() => handleAction("topic", story.primaryTopic, "under_index")}
                  className="w-full text-left py-2 sm:py-1 px-1.5 rounded hover:bg-[#F6EFEB] text-[#A65B32] font-medium flex items-center space-x-2 transition-colors"
                >
                  <TrendingDown className="w-3.5 h-3.5 text-[#A65B32]" />
                  <span>Show less from this topic</span>
                </button>
                <button
                  onClick={() => handleAction("topic", story.primaryTopic, "banned")}
                  className="w-full text-left py-2 sm:py-1 px-1.5 rounded hover:bg-red-50 text-red-700 font-medium flex items-center space-x-2 transition-colors"
                >
                  <Ban className="w-3.5 h-3.5 text-red-600" />
                  <span>Hide this topic</span>
                </button>
              </div>

              {/* Source Steering Section */}
              <div className="px-3 py-1.5 border-b border-[#E8E2D5]">
                <div className="text-[10px] font-bold tracking-wider text-[#7A8E97] uppercase mb-1">
                  Source: {story.leadSourceName}
                </div>
                <button
                  onClick={() => handleAction("source", story.leadSourceName, "over_index")}
                  className="w-full text-left py-2 sm:py-1 px-1.5 rounded hover:bg-[#EDF2EB] text-[#21665D] font-medium flex items-center space-x-2 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 text-[#21665D]" />
                  <span>Show more from this source</span>
                </button>
                <button
                  onClick={() => handleAction("source", story.leadSourceName, "under_index")}
                  className="w-full text-left py-2 sm:py-1 px-1.5 rounded hover:bg-[#F6EFEB] text-[#A65B32] font-medium flex items-center space-x-2 transition-colors"
                >
                  <TrendingDown className="w-3.5 h-3.5 text-[#A65B32]" />
                  <span>Show less from this source</span>
                </button>
                <button
                  onClick={() => handleAction("source", story.leadSourceName, "banned")}
                  className="w-full text-left py-2 sm:py-1 px-1.5 rounded hover:bg-red-50 text-red-700 font-medium flex items-center space-x-2 transition-colors"
                >
                  <Ban className="w-3.5 h-3.5 text-red-600" />
                  <span>Hide this source</span>
                </button>
              </div>

              {/* Recommendation Transparency */}
              <div className="px-3 pt-1.5">
                <button
                  onClick={() => setShowWhy(true)}
                  className="w-full text-left py-2 sm:py-1 px-1.5 rounded hover:bg-[#EAE4D7] text-[#5D717B] hover:text-[#182B33] flex items-center space-x-2 transition-colors"
                >
                  <Info className="w-3.5 h-3.5 text-[#5D717B]" />
                  <span>Why am I seeing this?</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
