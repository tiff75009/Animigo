"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/app/lib/utils";
import { Search, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { useDebounce } from "@/app/hooks/useDebounce";

interface FaqSearchProps {
  audience?: "client" | "annonceur";
  basePath: string; // "/client/aide" ou "/dashboard/aide"
  placeholder?: string;
  className?: string;
}

export function FaqSearch({
  audience,
  basePath,
  placeholder = "Rechercher dans l'aide...",
  className,
}: FaqSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchResults = useQuery(
    api.support.faq.searchFaq,
    debouncedQuery.length >= 2 ? { query: debouncedQuery, audience } : "skip"
  );

  const isLoading = debouncedQuery.length >= 2 && searchResults === undefined;

  // Fermer les résultats si clic à l'extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Ouvrir les résultats quand on tape
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setIsOpen(true);
    }
  }, [debouncedQuery]);

  const handleClear = () => {
    setQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder={placeholder}
          className={cn(
            "w-full pl-11 pr-10 py-3 rounded-full",
            "border border-gray-200 bg-white",
            "focus:border-primary focus:ring-2 focus:ring-primary/20",
            "outline-none transition-all",
            "text-foreground placeholder:text-gray-400"
          )}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <X className="w-5 h-5" />
            )}
          </button>
        )}
      </div>

      {/* Résultats de recherche */}
      {isOpen && searchResults && searchResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-50">
          <ul className="divide-y divide-gray-100">
            {searchResults.map((result: (typeof searchResults)[number]) => (
              <li key={result._id}>
                <Link
                  href={`${basePath}/article/${result.slug}`}
                  onClick={() => {
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium text-foreground line-clamp-1">
                    {result.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {result.categoryName}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Message si aucun résultat */}
      {isOpen && searchResults && searchResults.length === 0 && debouncedQuery.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-4 z-50">
          <p className="text-center text-gray-500 text-sm">
            Aucun résultat pour "{debouncedQuery}"
          </p>
        </div>
      )}
    </div>
  );
}
