"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  User,
  Building2,
  BadgeCheck,
  Loader2,
  X,
} from "lucide-react";

interface AnnouncerSearchInputProps {
  placeholder?: string;
  onSelect?: (announcerId: string) => void;
  className?: string;
}

interface SearchResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName?: string;
  slug?: string;
  profileImage?: string;
  accountType: string;
  isActive: boolean;
  isVerified: boolean;
}

export function AnnouncerSearchInput({
  placeholder = "Rechercher un annonceur...",
  onSelect,
  className = "",
}: AnnouncerSearchInputProps) {
  const { token } = useAdminAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Recherche
  const results = useQuery(
    api.admin.announcers.searchAnnouncers,
    token && debouncedQuery.length >= 2
      ? { token, query: debouncedQuery, limit: 8 }
      : "skip"
  );

  // Gérer le clic en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Gérer le raccourci clavier Ctrl+K
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Navigation clavier dans les résultats
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!results || results.length === 0) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1
          );
          break;
        case "Enter":
          event.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex].id);
          }
          break;
        case "Escape":
          setIsFocused(false);
          inputRef.current?.blur();
          break;
      }
    },
    [results, selectedIndex]
  );

  // Sélectionner un annonceur
  const handleSelect = (announcerId: string) => {
    setQuery("");
    setIsFocused(false);
    if (onSelect) {
      onSelect(announcerId);
    } else {
      router.push(`/admin/annonceurs/${announcerId}`);
    }
  };

  const showResults = isFocused && query.length >= 2;
  const isLoading = query.length >= 2 && debouncedQuery !== query;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-12 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary"
        />
        {query.length > 0 ? (
          <button
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        ) : (
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded">
            Ctrl+K
          </kbd>
        )}
      </div>

      {/* Résultats */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {isLoading ? (
              <div className="p-4 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : results && results.length > 0 ? (
              <div className="max-h-80 overflow-y-auto">
                {results.map((announcer: SearchResult, index: number) => (
                  <button
                    key={announcer.id}
                    onClick={() => handleSelect(announcer.id)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      index === selectedIndex
                        ? "bg-slate-800"
                        : "hover:bg-slate-800/50"
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center flex-shrink-0">
                      {announcer.profileImage ? (
                        <img
                          src={announcer.profileImage}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-slate-400" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium truncate">
                          {announcer.firstName} {announcer.lastName}
                        </span>
                        {announcer.isVerified && (
                          <BadgeCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        )}
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs ${
                            announcer.accountType === "annonceur_pro"
                              ? "bg-purple-500/20 text-purple-400"
                              : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          {announcer.accountType === "annonceur_pro"
                            ? "Pro"
                            : "Particulier"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <span className="truncate">{announcer.email}</span>
                        {announcer.companyName && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 truncate">
                              <Building2 className="w-3 h-3" />
                              {announcer.companyName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        announcer.isActive ? "bg-green-400" : "bg-slate-500"
                      }`}
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400">
                Aucun annonceur trouvé
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
