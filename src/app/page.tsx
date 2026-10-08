"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { StoryRow } from "@/components/StoryRow";
import { AddLinkModal } from "@/components/AddLinkModal";
import { PreferencesModal } from "@/components/PreferencesModal";
import { Story } from "@/lib/domain/types";

export default function FeedPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastCollectedAt, setLastCollectedAt] = useState<string>("");
  const [isAddLinkOpen, setIsAddLinkOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/feed");
      const data = await res.json();
      if (data.stories) {
        setStories(data.stories);
        setLastCollectedAt(data.lastCollectedAt);
      }
    } catch (err) {
      console.error("Failed to load feed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const handleFeedback = async (storyId: string, feedbackType: string, reason?: string) => {
    try {
      await fetch(`/api/stories/${storyId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackType, reason }),
      });
    } catch (err) {
      console.error("Failed to record feedback:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5EF] text-[#182B33]">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Masthead */}
        <Header
          onOpenAddLink={() => setIsAddLinkOpen(true)}
          onOpenPreferences={() => setIsPreferencesOpen(true)}
        />

        {/* Feed Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs tracking-wider text-[#7A8E97] uppercase font-semibold font-sans mb-1">
            <span>DESIGN CONCEPT · SAMPLE STORIES</span>
          </div>

          <div className="flex items-baseline justify-between">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#182B33] tracking-tight">
              For you
            </h2>

            <div className="flex items-center space-x-1.5 text-xs text-[#5D717B] font-sans">
              <span className="w-2 h-2 rounded-full bg-[#2E8B57]" />
              <span>Collected 12 minutes ago</span>
            </div>
          </div>

          <p className="text-sm text-[#5D717B] mt-1.5 font-sans">
            Click a headline for a summary. Follow a source to read more.
          </p>
        </div>

        {/* Stories Feed */}
        {loading ? (
          <div className="py-20 text-center text-[#5D717B] font-sans">
            <div className="animate-spin w-6 h-6 border-2 border-[#21665D] border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm">Loading your personal briefing...</p>
          </div>
        ) : stories.length === 0 ? (
          <div className="py-20 text-center text-[#5D717B] font-sans border-t border-[#E2DDD1]">
            <p className="text-base font-serif mb-2">No stories found</p>
            <p className="text-xs">Add a link or configure feeds in preferences to get started.</p>
          </div>
        ) : (
          <div className="border-t border-[#182B33]">
            {stories.map((story, index) => (
              <StoryRow
                key={story.id}
                story={story}
                isFirst={index === 0}
                onFeedback={handleFeedback}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <AddLinkModal
        isOpen={isAddLinkOpen}
        onClose={() => setIsAddLinkOpen(false)}
        onSuccess={fetchFeed}
      />

      <PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        onUpdated={fetchFeed}
      />
    </div>
  );
}
