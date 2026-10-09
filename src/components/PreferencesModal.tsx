"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Check,
  Zap,
  TrendingDown,
  Ban,
  Rss,
  Trash2,
  Plus,
  Loader2,
  Sliders,
  Globe,
  Sparkles,
} from "lucide-react";
import { Preference, Source, SteeringTier, TopicCategory } from "@/lib/domain/types";
import { DiscoveredFeed } from "@/lib/ingestion/discover-feed";

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const PRESET_SOURCES = [
  { name: "Lobste.rs", url: "https://lobste.rs/rss", category: "SYSTEMS" as TopicCategory },
  { name: "LWN.net", url: "https://lwn.net/headlines/rss", category: "SYSTEMS" as TopicCategory },
  { name: "ACM TechNews", url: "https://technews.acm.org/rss", category: "ENGINEERING" as TopicCategory },
  { name: "High Scalability", url: "http://feeds.feedburner.com/HighScalability", category: "SYSTEMS" as TopicCategory },
  { name: "Nature News", url: "https://www.nature.com/nature.rss", category: "SCIENCE" as TopicCategory },
  { name: "Pragmatic Engineer", url: "https://newsletter.pragmaticengineer.com/feed", category: "ENGINEERING" as TopicCategory },
];

export function PreferencesModal({ isOpen, onClose, onUpdated }: PreferencesModalProps) {
  const [activeTab, setActiveTab] = useState<"topics" | "sources">("topics");
  const [prefs, setPrefs] = useState<Preference | null>(null);
  const [sources, setSources] = useState<Array<Source & { steeringTier?: SteeringTier }>>([]);
  const [topicInput, setTopicInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Source discovery states
  const [sourceUrlInput, setSourceUrlInput] = useState("");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredFeed, setDiscoveredFeed] = useState<DiscoveredFeed | null>(null);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<TopicCategory>("ENGINEERING");

  const loadData = async () => {
    try {
      const [prefRes, srcRes] = await Promise.all([
        fetch("/api/preferences").then((r) => r.json()),
        fetch("/api/sources").then((r) => r.json()),
      ]);
      setPrefs(prefRes);
      if (srcRes.sources) {
        setSources(srcRes.sources);
      }
    } catch (err) {
      console.error("Failed to load preferences/sources:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setDiscoveredFeed(null);
      setDiscoveryError(null);
      setSourceUrlInput("");
    }
  }, [isOpen]);

  if (!isOpen || !prefs) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // 1. Topic Steering Handlers
  const handleAddTopic = (tier: SteeringTier) => {
    const term = topicInput.trim();
    if (!term) return;

    const updated = {
      ...prefs,
      steeredTopics: {
        ...(prefs.steeredTopics || {}),
        [term]: tier,
      },
    };
    setPrefs(updated);
    setTopicInput("");
    savePreferences(updated);
  };

  const handleRemoveTopic = (topicName: string) => {
    const steered = { ...(prefs.steeredTopics || {}) };
    delete steered[topicName];
    const updated = {
      ...prefs,
      steeredTopics: steered,
    };
    setPrefs(updated);
    savePreferences(updated);
  };

  // 2. Source Steering Handlers
  const handleSteerSource = async (srcName: string, tier: SteeringTier) => {
    try {
      const res = await fetch("/api/steer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "source", name: srcName, tier }),
      });
      const data = await res.json();
      if (data.preferences) {
        setPrefs(data.preferences);
      }
      loadData();
      showToast(`Set "${srcName}" to ${tier.replace("_", "-")}`);
      onUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSource = async (srcId: string, srcName: string) => {
    if (!confirm(`Unsubscribe from ${srcName}?`)) return;
    try {
      await fetch(`/api/sources?id=${srcId}`, { method: "DELETE" });
      loadData();
      showToast(`Unsubscribed from ${srcName}`);
      onUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  // 3. Source Discovery Handler
  const handleDiscoverFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceUrlInput.trim()) return;

    setIsDiscovering(true);
    setDiscoveryError(null);
    setDiscoveredFeed(null);

    try {
      const res = await fetch("/api/sources/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sourceUrlInput }),
      });
      const data = await res.json();
      if (!res.ok || !data.feed) {
        throw new Error(data.error || "Failed to discover RSS/Atom feed");
      }
      setDiscoveredFeed(data.feed);
      setSelectedCategory(data.feed.suggestedCategory || "ENGINEERING");
    } catch (err: any) {
      setDiscoveryError(err.message);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleSubscribeDiscovered = async (tier: SteeringTier = "neutral") => {
    if (!discoveredFeed) return;
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: discoveredFeed.title,
          feedUrl: discoveredFeed.feedUrl,
          siteUrl: discoveredFeed.siteUrl,
          category: selectedCategory,
          initialTier: tier,
        }),
      });
      if (res.ok) {
        showToast(`Subscribed to ${discoveredFeed.title}`);
        setDiscoveredFeed(null);
        setSourceUrlInput("");
        loadData();
        onUpdated();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPreset = async (preset: (typeof PRESET_SOURCES)[0]) => {
    try {
      await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: preset.name,
          feedUrl: preset.url,
          siteUrl: preset.url,
          category: preset.category,
          initialTier: "over_index",
        }),
      });
      loadData();
      showToast(`Subscribed to ${preset.name}`);
      onUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const savePreferences = async (updatedPrefs: Preference) => {
    setIsSaving(true);
    try {
      await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPrefs),
      });
      showToast("Settings saved");
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const steeredTopics = prefs.steeredTopics || {};
  const overIndexedTopics = Object.entries(steeredTopics).filter(([_, t]) => t === "over_index");
  const underIndexedTopics = Object.entries(steeredTopics).filter(([_, t]) => t === "under_index");
  const bannedTopics = Object.entries(steeredTopics).filter(([_, t]) => t === "banned");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
      <div className="bg-[#F7F5EF] border border-[#182B33] rounded-lg max-w-2xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#5D717B] hover:text-[#182B33] p-1 rounded-md transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-4">
          <h3 className="text-2xl font-serif font-bold text-[#182B33] tracking-tight">
            Feed Tuning &amp; Steering Center
          </h3>
          <p className="text-xs text-[#5D717B] font-sans mt-0.5">
            Steer the recommendation engine with direct priorities. Explicit rules override autonomous learning.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#D5DDD3] mb-5 font-sans text-sm">
          <button
            onClick={() => setActiveTab("topics")}
            className={`pb-2.5 px-4 font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === "topics"
                ? "border-[#21665D] text-[#21665D]"
                : "border-transparent text-[#5D717B] hover:text-[#182B33]"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Topics &amp; Keywords</span>
          </button>
          <button
            onClick={() => setActiveTab("sources")}
            className={`pb-2.5 px-4 font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === "sources"
                ? "border-[#21665D] text-[#21665D]"
                : "border-transparent text-[#5D717B] hover:text-[#182B33]"
            }`}
          >
            <Rss className="w-4 h-4" />
            <span>Source Feeds ({sources.length})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="overflow-y-auto flex-1 pr-1 font-sans text-sm space-y-6">
          {activeTab === "topics" && (
            <div className="space-y-5">
              {/* Add Topic Input Bar */}
              <div className="bg-[#FAF8F3] p-3.5 border border-[#D5DDD3] rounded-md">
                <label className="block text-xs font-bold text-[#182B33] uppercase tracking-wider mb-1.5">
                  Add Topic or Keyword
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTopic("over_index"))}
                    placeholder="e.g. Distributed Systems, Compilers, Space, LLMs"
                    className="flex-1 px-3 py-1.5 bg-white border border-[#D5DDD3] rounded text-sm text-[#182B33] focus:outline-none focus:ring-2 focus:ring-[#21665D]"
                  />
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddTopic("over_index")}
                      className="px-3 py-1.5 bg-[#21665D] hover:bg-[#184F47] text-white rounded text-xs font-semibold flex items-center space-x-1"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Boost</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddTopic("under_index")}
                      className="px-2.5 py-1.5 bg-[#FAF3EC] border border-[#ECD8CC] text-[#A65B32] hover:bg-[#F3E7DC] rounded text-xs font-semibold flex items-center space-x-1"
                    >
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span>Demote</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddTopic("banned")}
                      className="px-2.5 py-1.5 bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 rounded text-xs font-semibold flex items-center space-x-1"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Mute</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Over-Indexed (Boosted) Topics */}
              <div>
                <div className="flex items-center space-x-1.5 text-xs font-bold text-[#21665D] uppercase tracking-wider mb-2">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Over-Indexed Topics (+40 Boost)</span>
                </div>
                {overIndexedTopics.length === 0 ? (
                  <p className="text-xs text-[#7A8E97] italic">No boosted topics yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {overIndexedTopics.map(([topic]) => (
                      <span
                        key={topic}
                        className="inline-flex items-center px-2.5 py-1 bg-[#E8F0EE] border border-[#C5DCD8] rounded-full text-xs text-[#21665D] font-medium"
                      >
                        ⚡ {topic}
                        <button
                          onClick={() => handleRemoveTopic(topic)}
                          className="ml-1.5 text-[#5D717B] hover:text-[#C9633F]"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Under-Indexed (Demoted) Topics */}
              <div>
                <div className="flex items-center space-x-1.5 text-xs font-bold text-[#A65B32] uppercase tracking-wider mb-2">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Under-Indexed Topics (-40 Demote)</span>
                </div>
                {underIndexedTopics.length === 0 ? (
                  <p className="text-xs text-[#7A8E97] italic">No demoted topics yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {underIndexedTopics.map(([topic]) => (
                      <span
                        key={topic}
                        className="inline-flex items-center px-2.5 py-1 bg-[#FAF3EC] border border-[#ECD8CC] rounded-full text-xs text-[#A65B32] font-medium"
                      >
                        📉 {topic}
                        <button
                          onClick={() => handleRemoveTopic(topic)}
                          className="ml-1.5 text-[#5D717B] hover:text-red-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Muted / Banned Topics */}
              <div>
                <div className="flex items-center space-x-1.5 text-xs font-bold text-red-700 uppercase tracking-wider mb-2">
                  <Ban className="w-3.5 h-3.5" />
                  <span>Muted Topics (Hard Filter)</span>
                </div>
                {bannedTopics.length === 0 ? (
                  <p className="text-xs text-[#7A8E97] italic">No muted topics.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {bannedTopics.map(([topic]) => (
                      <span
                        key={topic}
                        className="inline-flex items-center px-2.5 py-1 bg-red-50 border border-red-200 rounded-full text-xs text-red-700 font-medium"
                      >
                        🚫 {topic}
                        <button
                          onClick={() => handleRemoveTopic(topic)}
                          className="ml-1.5 text-[#5D717B] hover:text-red-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Pause Learning */}
              <div className="pt-3 border-t border-[#D5DDD3] flex items-center justify-between">
                <div>
                  <p className="font-semibold text-xs text-[#182B33]">Pause adaptation learning</p>
                  <p className="text-[11px] text-[#5D717B]">
                    Freezes background profile updates from reading time and clicks.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.pauseLearning}
                  onChange={(e) => {
                    const updated = { ...prefs, pauseLearning: e.target.checked };
                    setPrefs(updated);
                    savePreferences(updated);
                  }}
                  className="w-4 h-4 text-[#21665D] rounded focus:ring-[#21665D]"
                />
              </div>
            </div>
          )}

          {activeTab === "sources" && (
            <div className="space-y-5">
              {/* Add by URL / Auto-Discovery Form */}
              <div className="bg-[#FAF8F3] p-4 border border-[#D5DDD3] rounded-md">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-[#182B33] uppercase tracking-wider mb-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#21665D]" />
                  <span>Add Source by Link or Blog URL</span>
                </div>
                <p className="text-xs text-[#5D717B] mb-3">
                  Paste any website (e.g. <code>https://danluu.com</code> or <code>blog.cloudflare.com</code>) — we will auto-detect the RSS/Atom feed.
                </p>

                <form onSubmit={handleDiscoverFeed} className="flex gap-2">
                  <input
                    type="url"
                    value={sourceUrlInput}
                    onChange={(e) => setSourceUrlInput(e.target.value)}
                    placeholder="https://example.com/blog"
                    className="flex-1 px-3 py-1.5 bg-white border border-[#D5DDD3] rounded text-sm text-[#182B33] focus:outline-none focus:ring-2 focus:ring-[#21665D]"
                  />
                  <button
                    type="submit"
                    disabled={isDiscovering}
                    className="px-4 py-1.5 bg-[#21665D] hover:bg-[#184F47] text-white rounded text-xs font-semibold flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {isDiscovering ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Scanning...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Discover Feed</span>
                      </>
                    )}
                  </button>
                </form>

                {discoveryError && (
                  <p className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                    {discoveryError}
                  </p>
                )}

                {/* Discovered Feed Preview Card */}
                {discoveredFeed && (
                  <div className="mt-3.5 p-3.5 bg-white border border-[#C5DCD8] rounded-md shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[#182B33] text-sm">{discoveredFeed.title}</span>
                        <p className="text-[11px] text-[#5D717B] truncate max-w-sm">{discoveredFeed.feedUrl}</p>
                      </div>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value as TopicCategory)}
                        className="text-xs bg-[#FAF8F3] border border-[#D5DDD3] rounded px-2 py-1 text-[#182B33]"
                      >
                        <option value="ENGINEERING">ENGINEERING</option>
                        <option value="SYSTEMS">SYSTEMS</option>
                        <option value="SCIENCE">SCIENCE</option>
                        <option value="MAKING">MAKING</option>
                        <option value="ESSAYS">ESSAYS</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-2 pt-1 border-t border-[#EDF2EB]">
                      <span className="text-xs text-[#5D717B]">Priority dial:</span>
                      <button
                        type="button"
                        onClick={() => handleSubscribeDiscovered("over_index")}
                        className="px-2.5 py-1 bg-[#21665D] text-white rounded text-xs font-medium hover:bg-[#184F47]"
                      >
                        ⚡ Boost (+Over-index)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSubscribeDiscovered("neutral")}
                        className="px-2.5 py-1 bg-[#FAF8F3] border border-[#D5DDD3] text-[#182B33] rounded text-xs font-medium hover:bg-[#EAE4D7]"
                      >
                        Normal
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 1-Click Preset Catalog */}
              <div>
                <div className="flex items-center space-x-1.5 text-xs font-bold text-[#7A8E97] uppercase tracking-wider mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#C9633F]" />
                  <span>Curated High-Signal Presets (1-Click Add)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PRESET_SOURCES.map((preset) => {
                    const alreadySubscribed = sources.some((s) => s.feedUrl === preset.url || s.name === preset.name);
                    return (
                      <button
                        key={preset.name}
                        onClick={() => !alreadySubscribed && handleAddPreset(preset)}
                        disabled={alreadySubscribed}
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                          alreadySubscribed
                            ? "bg-[#F3EFE8] border-[#DFD8CC] text-[#8C9BA2] cursor-default"
                            : "bg-white border-[#D5DDD3] text-[#21665D] hover:bg-[#EDF2EB] hover:border-[#21665D]"
                        }`}
                      >
                        {alreadySubscribed ? (
                          <Check className="w-3 h-3 mr-1 text-[#21665D]" />
                        ) : (
                          <Plus className="w-3 h-3 mr-1" />
                        )}
                        <span>{preset.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Monitored Sources Table */}
              <div>
                <div className="text-xs font-bold text-[#182B33] uppercase tracking-wider mb-2">
                  Subscribed Feeds ({sources.length})
                </div>
                <div className="space-y-2">
                  {sources.map((src) => {
                    const tier = src.steeringTier || "neutral";
                    return (
                      <div
                        key={src.id}
                        className="p-3 bg-white border border-[#E2DDD1] rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-sm text-[#182B33]">{src.name}</span>
                            <span className="text-[10px] bg-[#FAF8F3] border border-[#D5DDD3] text-[#7A8E97] px-1.5 py-0.5 rounded uppercase font-medium">
                              {src.category}
                            </span>
                          </div>
                          <p className="text-xs text-[#7A8E97] truncate mt-0.5">{src.feedUrl}</p>
                        </div>

                        {/* 4-Way Steering Segment Toggle */}
                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          <div className="inline-flex rounded-md border border-[#D5DDD3] bg-[#FAF8F3] p-0.5 text-xs">
                            <button
                              onClick={() => handleSteerSource(src.name, "over_index")}
                              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                                tier === "over_index"
                                  ? "bg-[#21665D] text-white shadow-xs"
                                  : "text-[#5D717B] hover:text-[#21665D]"
                              }`}
                              title="Over-index source"
                            >
                              ⚡ Boost
                            </button>
                            <button
                              onClick={() => handleSteerSource(src.name, "neutral")}
                              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                                tier === "neutral"
                                  ? "bg-white text-[#182B33] shadow-xs"
                                  : "text-[#5D717B] hover:text-[#182B33]"
                              }`}
                              title="Neutral (baseline)"
                            >
                              Normal
                            </button>
                            <button
                              onClick={() => handleSteerSource(src.name, "under_index")}
                              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                                tier === "under_index"
                                  ? "bg-[#A65B32] text-white shadow-xs"
                                  : "text-[#5D717B] hover:text-[#A65B32]"
                              }`}
                              title="Under-index source"
                            >
                              📉 Demote
                            </button>
                            <button
                              onClick={() => handleSteerSource(src.name, "banned")}
                              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                                tier === "banned"
                                  ? "bg-red-700 text-white shadow-xs"
                                  : "text-[#5D717B] hover:text-red-700"
                              }`}
                              title="Ban source completely"
                            >
                              🚫 Ban
                            </button>
                          </div>

                          <button
                            onClick={() => handleDeleteSource(src.id, src.name)}
                            className="p-1.5 text-[#5D717B] hover:text-red-700 rounded transition-colors"
                            title="Unsubscribe"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 mt-4 border-t border-[#D5DDD3] flex items-center justify-between font-sans">
          {toastMessage ? (
            <span className="text-xs text-[#21665D] font-medium flex items-center">
              <Check className="w-3.5 h-3.5 mr-1" />
              {toastMessage}
            </span>
          ) : (
            <span />
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#21665D] hover:bg-[#184F47] text-white rounded-md font-medium text-xs transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
