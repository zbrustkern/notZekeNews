"use client";

import React from "react";
import { Plus, SlidersHorizontal } from "lucide-react";

interface HeaderProps {
  onOpenAddLink: () => void;
  onOpenPreferences: () => void;
}

export function Header({ onOpenAddLink, onOpenPreferences }: HeaderProps) {
  return (
    <header className="border-b border-[#182B33] pb-4 mb-5 sm:pb-6 sm:mb-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          {/* Monogram [N] */}
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#C9633F] rounded-md flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white font-serif text-xl sm:text-2xl font-bold leading-none select-none">
              N
            </span>
          </div>

          {/* Title & Tagline */}
          <div className="min-w-0">
            <h1 className="text-[22px] sm:text-3xl font-serif font-bold text-[#182B33] tracking-tight leading-none sm:leading-tight whitespace-nowrap">
              NotZeke News
            </h1>
            <p className="hidden sm:block text-sm text-[#5D717B] font-sans mt-0.5">
              A personal briefing, with a wider lens.
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0">
          <button
            onClick={onOpenAddLink}
            aria-label="Add a link"
            className="inline-flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 bg-[#21665D] hover:bg-[#184F47] text-white text-sm font-medium rounded-full sm:rounded-md transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#21665D] focus-visible:ring-offset-2"
          >
            <Plus className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-1.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Add a link</span>
          </button>

          <span className="hidden sm:inline text-[#A2B0B6] font-light text-lg" aria-hidden="true">
            |
          </span>

          <button
            onClick={onOpenPreferences}
            aria-label="Preferences"
            className="inline-flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto rounded-full sm:rounded-none text-sm font-medium text-[#21665D] hover:text-[#184F47] hover:bg-[#EDE8DC] sm:hover:bg-transparent sm:hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#21665D]"
          >
            <SlidersHorizontal className="w-5 h-5 sm:hidden" />
            <span className="hidden sm:inline">Preferences</span>
          </button>
        </div>
      </div>
    </header>
  );
}
