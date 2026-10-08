"use client";

import React, { useState, useEffect } from "react";
import { X, Check, RefreshCw } from "lucide-react";
import { Preference } from "@/lib/domain/types";

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function PreferencesModal({ isOpen, onClose, onUpdated }: PreferencesModalProps) {
  const [prefs, setPrefs] = useState<Preference | null>(null);
  const [allowInput, setAllowInput] = useState("");
  const [blockInput, setBlockInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/preferences")
        .then((res) => res.json())
        .then((data) => setPrefs(data))
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen || !prefs) return null;

  const handleAddAllow = () => {
    if (!allowInput.trim()) return;
    setPrefs({
      ...prefs,
      allowTopics: [...prefs.allowTopics, allowInput.trim()],
    });
    setAllowInput("");
  };

  const handleRemoveAllow = (index: number) => {
    setPrefs({
      ...prefs,
      allowTopics: prefs.allowTopics.filter((_, i) => i !== index),
    });
  };

  const handleAddBlock = () => {
    if (!blockInput.trim()) return;
    setPrefs({
      ...prefs,
      blockTopics: [...prefs.blockTopics, blockInput.trim()],
    });
    setBlockInput("");
  };

  const handleRemoveBlock = (index: number) => {
    setPrefs({
      ...prefs,
      blockTopics: prefs.blockTopics.filter((_, i) => i !== index),
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-[#F7F5EF] border border-[#182B33] rounded-lg max-w-xl w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#5D717B] hover:text-[#182B33] p-1 rounded-md transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-2xl font-serif font-bold text-[#182B33] mb-1">
          Preferences & Signals
        </h3>
        <p className="text-sm text-[#5D717B] mb-6 font-sans">
          Explicit interests override inferred behavior. Filter out topics you never want to see.
        </p>

        <div className="space-y-6 font-sans text-sm">
          {/* Allow Topics */}
          <div>
            <label className="block font-semibold text-[#182B33] mb-2">
              Interested Topics & Keywords
            </label>
            <div className="flex flex-wrap gap-2 mb-2.5">
              {prefs.allowTopics.map((topic, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2.5 py-1 bg-[#E8F0EE] border border-[#C5DCD8] rounded-full text-xs text-[#21665D] font-medium"
                >
                  {topic}
                  <button
                    onClick={() => handleRemoveAllow(i)}
                    className="ml-1.5 text-[#5D717B] hover:text-[#C9633F]"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={allowInput}
                onChange={(e) => setAllowInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddAllow())}
                placeholder="Add topic (e.g. Compilers, Space, Batteries)"
                className="flex-1 px-3 py-1.5 bg-white border border-[#D5DDD3] rounded text-sm text-[#182B33]"
              />
              <button
                type="button"
                onClick={handleAddAllow}
                className="px-3 py-1.5 bg-[#21665D] text-white rounded text-xs font-semibold"
              >
                Add
              </button>
            </div>
          </div>

          {/* Block Topics */}
          <div>
            <label className="block font-semibold text-[#182B33] mb-2">
              Excluded Topics (Strict Filter)
            </label>
            <div className="flex flex-wrap gap-2 mb-2.5">
              {prefs.blockTopics.map((topic, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2.5 py-1 bg-[#FBEBE7] border border-[#F3CCC2] rounded-full text-xs text-[#C9633F] font-medium"
                >
                  {topic}
                  <button
                    onClick={() => handleRemoveBlock(i)}
                    className="ml-1.5 text-[#5D717B] hover:text-red-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={blockInput}
                onChange={(e) => setBlockInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddBlock())}
                placeholder="Add exclusion (e.g. Celebrity, Crypto)"
                className="flex-1 px-3 py-1.5 bg-white border border-[#D5DDD3] rounded text-sm text-[#182B33]"
              />
              <button
                type="button"
                onClick={handleAddBlock}
                className="px-3 py-1.5 bg-[#C9633F] text-white rounded text-xs font-semibold"
              >
                Block
              </button>
            </div>
          </div>

          {/* Pause Learning Toggle */}
          <div className="pt-4 border-t border-[#E5DFD3] flex items-center justify-between">
            <div>
              <p className="font-semibold text-[#182B33]">Pause adaptation loop</p>
              <p className="text-xs text-[#5D717B]">
                Temporarily freezes profile learning from reading interactions.
              </p>
            </div>
            <input
              type="checkbox"
              checked={prefs.pauseLearning}
              onChange={(e) => setPrefs({ ...prefs, pauseLearning: e.target.checked })}
              className="w-4 h-4 text-[#21665D] rounded focus:ring-[#21665D]"
            />
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E5DFD3]">
            {saveSuccess ? (
              <span className="text-xs text-[#21665D] font-medium flex items-center">
                <Check className="w-4 h-4 mr-1" />
                Preferences updated!
              </span>
            ) : (
              <span />
            )}

            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-[#5D717B] hover:text-[#182B33]"
              >
                Close
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-[#21665D] hover:bg-[#184F47] text-white rounded font-medium text-sm transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
