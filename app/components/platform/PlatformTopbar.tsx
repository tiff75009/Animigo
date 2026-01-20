"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  ChevronDown,
  LogIn,
  UserPlus,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Home,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useAuthState } from "@/app/hooks/useAuthState";

interface PlatformTopbarProps {
  onOpenFilters?: () => void;
  hasActiveFilters?: boolean;
  locationText?: string;
  onLocationClick?: () => void;
  resultsCount?: number;
}

export function PlatformTopbar({
  onOpenFilters,
  hasActiveFilters = false,
  locationText,
  onLocationClick,
  resultsCount,
}: PlatformTopbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { isLoading, isAuthenticated, isAdmin, user, logout } = useAuthState();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-profile-menu]")) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "";

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-200",
          isScrolled
            ? "bg-white shadow-md"
            : "bg-white/95 backdrop-blur-sm"
        )}
      >
        <div className="h-16 px-4 lg:px-6 flex items-center gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 shrink-0 group"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <span className="text-sm">🐾</span>
            </div>
            <span className="text-lg font-bold text-gray-900 hidden sm:block">
              Anim<span className="text-primary">igo</span>
            </span>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-2xl">
            <button
              onClick={onLocationClick}
              className="flex items-center gap-3 flex-1 h-11 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors text-left"
            >
              <Search className="w-4 h-4 text-gray-400" />
              <div className="flex-1 min-w-0">
                {locationText ? (
                  <span className="text-sm text-gray-900 truncate block">
                    {locationText}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">
                    Rechercher une ville ou un code postal...
                  </span>
                )}
              </div>
              {resultsCount !== undefined && (
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                  {resultsCount} resultat{resultsCount > 1 ? "s" : ""}
                </span>
              )}
            </button>
          </div>

          {/* Filters Button - Desktop */}
          {onOpenFilters && (
            <button
              onClick={onOpenFilters}
              className={cn(
                "hidden md:flex items-center gap-2 h-11 px-4 rounded-xl border transition-all",
                hasActiveFilters
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-sm font-medium">Filtres</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-primary" />
              )}
            </button>
          )}

          {/* Spacer */}
          <div className="flex-1 md:hidden" />

          {/* Right Section - Desktop */}
          <div className="hidden md:flex items-center gap-2">
            {/* Home Link */}
            <Link
              href="/"
              className="flex items-center gap-2 h-10 px-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">Accueil</span>
            </Link>

            {/* Auth */}
            {!isLoading && isAuthenticated && user ? (
              <div className="relative" data-profile-menu>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className={cn(
                    "flex items-center gap-2 h-10 pl-1 pr-3 rounded-full border transition-all",
                    isProfileOpen
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                  )}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {initials}
                  </div>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-gray-400 transition-transform",
                      isProfileOpen && "rotate-180"
                    )}
                  />
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
                    >
                      <div className="p-3 border-b border-gray-100">
                        <p className="font-semibold text-gray-900 truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>
                      <div className="p-1">
                        <Link
                          href={isAdmin ? "/admin" : "/dashboard"}
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {isAdmin ? "Administration" : "Dashboard"}
                          </span>
                        </Link>
                        <button
                          onClick={() => {
                            setIsProfileOpen(false);
                            logout();
                          }}
                          className="flex items-center gap-3 w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            Se deconnecter
                          </span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/connexion"
                  className="h-10 px-4 flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Connexion
                </Link>
                <Link
                  href="/inscription"
                  className="h-10 px-4 flex items-center gap-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Inscription
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {onOpenFilters && (
              <button
                onClick={onOpenFilters}
                className={cn(
                  "p-2.5 rounded-lg border transition-all",
                  hasActiveFilters
                    ? "border-primary bg-primary text-white"
                    : "border-gray-200 text-gray-600"
                )}
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2.5 rounded-lg border border-gray-200 text-gray-600"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden px-4 pb-3">
          <button
            onClick={onLocationClick}
            className="flex items-center gap-3 w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-left"
          >
            <MapPin className="w-4 h-4 text-primary" />
            <span className="flex-1 text-sm text-gray-500 truncate">
              {locationText || "Ou cherchez-vous ?"}
            </span>
            <Search className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 md:hidden"
          >
            <div
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-xl"
            >
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">Menu</span>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-2">
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <Home className="w-5 h-5" />
                  <span className="font-medium">Accueil</span>
                </Link>

                {!isLoading && isAuthenticated && user ? (
                  <>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {user.firstName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Link
                      href={isAdmin ? "/admin" : "/dashboard"}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      <LayoutDashboard className="w-5 h-5" />
                      <span className="font-medium">
                        {isAdmin ? "Administration" : "Dashboard"}
                      </span>
                    </Link>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        logout();
                      }}
                      className="flex items-center gap-3 w-full p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-medium">Se deconnecter</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/connexion"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      <LogIn className="w-5 h-5" />
                      <span className="font-medium">Connexion</span>
                    </Link>
                    <Link
                      href="/inscription"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 bg-primary text-white rounded-xl"
                    >
                      <UserPlus className="w-5 h-5" />
                      <span className="font-medium">Inscription</span>
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer for fixed header */}
      <div className="h-[104px] md:h-16" />
    </>
  );
}
