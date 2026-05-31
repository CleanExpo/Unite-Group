// src/components/help/HelpSearch.tsx
"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface HelpSearchProps {
  query: string;
  onChange: (query: string) => void;
}

export function HelpSearch({ query, onChange }: HelpSearchProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus on "/" keyboard shortcut
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement).tagName
        )
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        ref={inputRef}
        type="search"
        placeholder="Search help articles... (press /)"
        value={query}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        className="pl-10 bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-teal-500/50 focus-visible:border-teal-500/50 h-11"
      />
      {query && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-sm"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}

/**
 * Highlights matching terms in a string by wrapping them in a <mark> element.
 */
export function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark
        key={i}
        className="bg-teal-500/30 text-teal-200 rounded px-0.5"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}
