"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Search,
  MapPin,
  MessageCircle,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useAuthState } from "@/app/hooks/useAuthState";
import { NotificationDropdown } from "@/app/components/notifications";

interface SearchHeaderProps {
  onLocationClick: () => void;
  locationText?: string;
}

export function SearchHeader({ onLocationClick, locationText }: SearchHeaderProps) {
  const { isAuthenticated, user, isAdmin, logout } = useAuthState();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="h-16 px-4 sm:px-6 flex items-center">
        {/* Left Section - Logo */}
        <div className="flex items-center gap-2 shrink-0 w-auto sm:w-48">
          <Link href="/" className="flex items-center gap-2.5">
            <motion.div
              className="relative w-9 h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-primary via-primary to-secondary rounded-xl flex items-center justify-center shadow-md shadow-primary/25"
              whileHover={{ scale: 1.05, rotate: -3 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <span className="text-base lg:text-lg">🐾</span>
            </motion.div>
            <div className="hidden sm:flex flex-col">
              <span className="text-lg lg:text-xl font-bold text-gray-900 leading-none">
                Anim<span className="text-primary">igo</span>
              </span>
              <span className="text-[9px] lg:text-[10px] text-gray-500 font-medium">
                Le bonheur de vos animaux
              </span>
            </div>
          </Link>

          {/* Search Icon - Mobile (à côté du logo) */}
          <button
            onClick={onLocationClick}
            className="sm:hidden p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Center Section - Search Bar (Desktop) */}
        <div className="hidden sm:flex flex-1 justify-center px-4">
          <button
            onClick={onLocationClick}
            className="w-full max-w-xl flex items-center gap-3 h-11 px-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all hover:border-gray-300"
          >
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="flex-1 text-sm text-left truncate text-gray-600">
              {locationText || "Rechercher une ville..."}
            </span>
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
          </button>
        </div>

        {/* Spacer - Mobile */}
        <div className="flex-1 sm:hidden" />

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2 shrink-0 sm:w-48 sm:justify-end">
          {/* Messages Button - Only show when authenticated */}
          {isAuthenticated && (
            <Link
              href="/dashboard/messagerie"
              className="relative p-2.5 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
            </Link>
          )}

          {/* Notifications - Composant réutilisable */}
          {isAuthenticated && <NotificationDropdown />}

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center">
            {isAuthenticated && user ? (
              <div ref={profileRef} className="relative">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className={cn(
                    "flex items-center gap-2 pl-1 pr-3 py-1 rounded-full transition-all",
                    showProfileMenu
                      ? "bg-gray-100 shadow-inner"
                      : "hover:bg-gray-100"
                  )}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {initials}
                  </div>
                  <span className="text-sm font-medium text-gray-700 max-w-[80px] truncate">
                    {user.firstName}
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-gray-400 transition-transform",
                      showProfileMenu && "rotate-180"
                    )}
                  />
                </motion.button>

                {/* Profile Dropdown */}
                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[200]"
                    >
                      {/* Header */}
                      <div className="p-4 bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white font-bold shadow-md">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="p-2">
                        <Link
                          href={isAdmin ? "/admin" : "/dashboard"}
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <LayoutDashboard className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium">
                            {isAdmin ? "Administration" : "Dashboard"}
                          </span>
                        </Link>
                        <Link
                          href="/dashboard/messagerie"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                            <MessageCircle className="w-4 h-4 text-blue-500" />
                          </div>
                          <span className="font-medium">Messages</span>
                        </Link>
                      </div>

                      <div className="mx-3 h-px bg-gray-100" />

                      <div className="p-2">
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            logout();
                          }}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                            <LogOut className="w-4 h-4" />
                          </div>
                          <span className="font-medium">Se déconnecter</span>
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
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-all"
                >
                  Connexion
                </Link>
                <Link
                  href="/inscription"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md shadow-primary/20 transition-all"
                >
                  S&apos;inscrire
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2.5 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-gray-100 overflow-hidden bg-white"
          >
            <div className="p-4 space-y-3">
              {isAuthenticated && user ? (
                <>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white font-bold text-sm">
                      {initials}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <Link
                    href={isAdmin ? "/admin" : "/dashboard"}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <LayoutDashboard className="w-5 h-5 text-gray-500" />
                    <span className="font-medium">{isAdmin ? "Administration" : "Dashboard"}</span>
                  </Link>
                  <Link
                    href="/dashboard/messagerie"
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5 text-gray-500" />
                    <span className="font-medium">Messages</span>
                  </Link>
                  <button
                    onClick={logout}
                    className="flex items-center gap-3 w-full p-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Se déconnecter</span>
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/connexion"
                    className="flex-1 py-3 text-center font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/inscription"
                    className="flex-1 py-3 text-center font-medium text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    S&apos;inscrire
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
