"use client";

import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";

interface AddLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddLinkModal({ isOpen, onClose, onSuccess }: AddLinkModalProps) {
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, note }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit link");
      }

      setUrl("");
      setNote("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-[#F7F5EF] border border-[#182B33] rounded-lg max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#5D717B] hover:text-[#182B33] p-1 rounded-md transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-2xl font-serif font-bold text-[#182B33] mb-1">
          Add a link
        </h3>
        <p className="text-sm text-[#5D717B] mb-5 font-sans">
          Teach NotZeke News about stories you wish you had seen, or submit an article directly to your feed.
        </p>

        {error && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm">
          <div>
            <label className="block font-semibold text-[#182B33] mb-1">
              Article or Project URL <span className="text-[#C9633F]">*</span>
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full px-3.5 py-2.5 bg-white border border-[#D5DDD3] rounded-md text-[#182B33] placeholder-[#A2B0B6] focus:outline-none focus:ring-2 focus:ring-[#21665D] focus:border-[#21665D]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#182B33] mb-1">
              Why was this interesting? (optional note)
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. 'I liked the technical depth on local databases', 'I wish I had seen this sooner'"
              className="w-full px-3.5 py-2.5 bg-white border border-[#D5DDD3] rounded-md text-[#182B33] placeholder-[#A2B0B6] focus:outline-none focus:ring-2 focus:ring-[#21665D] focus:border-[#21665D]"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E5DFD3]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#5D717B] hover:text-[#182B33] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 bg-[#21665D] hover:bg-[#184F47] text-white text-sm font-medium rounded-md transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save & Add to Feed"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
