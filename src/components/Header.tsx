"use client";

import React from "react";
import { Plus } from "lucide-react";

interface HeaderProps {
  onOpenAddLink: () => void;
  onOpenPreferences: () => void;
}

export function Header({ onOpenAddLink, onOpenPreferences }: HeaderProps) {
  return (
    <header className="border-b border-[#182B33] pb-6 mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-start space-x-3.5">
          {/* Monogram [N] */}
          <div className="w-10 h-10 bg-[#C9633F] rounded-md flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
            <span className="text-white font-serif text-2xl font-bold leading-none select-none">
              N
            </span>
          </div>

          {/* Title & Tagline */}
          <div>
            <h1 className="text-3xl font-serif font-bold text-[#182B33] tracking-tight leading-tight">
              NotZeke News
            </h1>
            <p className="text-sm text-[#5D717B] font-sans mt-0.5">
              A personal briefing, with a wider lens.
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onOpenAddLink}
            className="inline-flex items-center px-4 py-2 bg-[#21665D] hover:bg-[#184F47] text-white text-sm font-medium rounded-md transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#21665D] focus:ring-offset-2"
          >
            <Plus className="w-4 h-4 mr-1.5 stroke-[2.5]" />
            Add a link
          </button>

          <span className="text-[#A2B0B6] font-light text-lg">|</span>

          <button
            onClick={onOpenPreferences}
            className="text-sm font-medium text-[#21665D] hover:text-[#184F47] hover:underline focus:outline-none"
          >
            Preferences
          </button>
        </div>
      </div>
    </header>
  );
}
