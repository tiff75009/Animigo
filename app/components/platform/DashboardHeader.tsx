"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  MessageCircle,
  LogOut,
  LayoutDashboard,
  Calendar,
  User,
  Menu,
  X,
  ChevronDown,
  Settings,
  PawPrint,
  Search,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useAuthState } from "@/app/hooks/useAuthState";
import { NotificationDropdown } from "@/app/components/notifications";

// Hook pour détecter la taille d'écran
function useMediaQuery(query: string, defaultValue = false) {
  const [matches, setMatches] = useState(defaultValue);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return mounted ? matches : defaultValue;
}

// Hook pour synchroniser avec l'état de la sidebar
function useSidebarWidth() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Breakpoints alignés avec la sidebar :
  // - md (768px+) : sidebar visible (collapsed)
  // - lg (1024px+) : sidebar étendue par défaut
  const isMdScreen = useMediaQuery("(min-width: 768px)", true);
  const isLgScreen = useMediaQuery("(min-width: 1024px)", true);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }

    // Écouter l'événement custom de la sidebar
    const handleSidebarToggle = (e: CustomEvent) => {
      setIsCollapsed(e.detail);
    };
    window.addEventListener("sidebar-toggle", handleSidebarToggle as EventListener);

    // Écouter les changements de localStorage (autre onglet)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "sidebar-collapsed") {
        setIsCollapsed(e.newValue === "true");
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("sidebar-toggle", handleSidebarToggle as EventListener);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Retourner la largeur en pixels
  if (!isMdScreen) return 0; // Mobile (< 768px), pas de sidebar
  if (!isLgScreen) return 80; // Tablet (768-1024px), sidebar collapsed
  return isCollapsed ? 80 : 288; // Desktop (1024px+), dépend de l'état
}

export function DashboardHeader() {
  const { isAuthenticated, user, logout } = useAuthState();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const sidebarWidth = useSidebarWidth();

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
    <motion.header
      initial={false}
      animate={{ left: sidebarWidth }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed top-0 right-0 z-[100] bg-white/95 backdrop-blur-md border-b border-gray-100"
      style={{ left: sidebarWidth }}
    >
      <div className="h-16 px-4 lg:px-6 flex items-center gap-3">
        {/* Logo - Mobile uniquement */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 md:hidden">
          <motion.div
            className="relative w-9 h-9 bg-gradient-to-br from-primary via-primary to-secondary rounded-xl flex items-center justify-center shadow-md shadow-primary/25"
            whileHover={{ scale: 1.05, rotate: -3 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <span className="text-base">🐾</span>
          </motion.div>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Bouton recherche */}
          <Link
            href="/recherche"
            className="p-2.5 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Search className="w-5 h-5" />
          </Link>

          {/* Messages Button */}
          {isAuthenticated && (
            <Link
              href="/client/messagerie"
              className="relative p-2.5 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
            </Link>
          )}

          {/* Notifications - Composant réutilisable */}
          {isAuthenticated && <NotificationDropdown />}

          {/* Desktop Profile Menu */}
          {isAuthenticated && user && (
            <div ref={profileRef} className="relative hidden md:block">
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
                        href="/client"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <LayoutDashboard className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium">Tableau de bord</span>
                      </Link>
                      <Link
                        href="/client/reservations"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-blue-500" />
                        </div>
                        <span className="font-medium">Mes réservations</span>
                      </Link>
                      <Link
                        href="/client/mes-animaux"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                          <PawPrint className="w-4 h-4 text-amber-500" />
                        </div>
                        <span className="font-medium">Mes animaux</span>
                      </Link>
                      <Link
                        href="/client/messagerie"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                          <MessageCircle className="w-4 h-4 text-green-500" />
                        </div>
                        <span className="font-medium">Messages</span>
                      </Link>
                      <Link
                        href="/client/parametres"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Settings className="w-4 h-4 text-gray-500" />
                        </div>
                        <span className="font-medium">Paramètres</span>
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
          )}

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
            <div className="p-4 space-y-2">
              {isAuthenticated && user && (
                <>
                  {/* User Info */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-3">
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

                  {/* Navigation Links */}
                  <Link
                    href="/client"
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <LayoutDashboard className="w-5 h-5 text-gray-500" />
                    <span className="font-medium">Tableau de bord</span>
                  </Link>
                  <Link
                    href="/client/reservations"
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <span className="font-medium">Mes réservations</span>
                  </Link>
                  <Link
                    href="/client/mes-animaux"
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <PawPrint className="w-5 h-5 text-gray-500" />
                    <span className="font-medium">Mes animaux</span>
                  </Link>
                  <Link
                    href="/client/messagerie"
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5 text-gray-500" />
                    <span className="font-medium">Messages</span>
                  </Link>
                  <Link
                    href="/client/parametres"
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-5 h-5 text-gray-500" />
                    <span className="font-medium">Paramètres</span>
                  </Link>

                  <div className="h-px bg-gray-100 my-2" />

                  {/* Recherche */}
                  <Link
                    href="/recherche"
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors text-primary"
                  >
                    <PawPrint className="w-5 h-5" />
                    <span className="font-medium">Trouver un gardien</span>
                  </Link>

                  <div className="h-px bg-gray-100 my-2" />

                  {/* Logout */}
                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      logout();
                    }}
                    className="flex items-center gap-3 w-full p-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Se déconnecter</span>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
