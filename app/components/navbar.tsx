"use client";

import { cn } from "@/app/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User, Briefcase, LogOut, LayoutDashboard, Bell, MessageCircle, ChevronDown, MoreHorizontal } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useAuthState } from "@/app/hooks/useAuthState";
import { useNotifications } from "@/app/hooks/useNotifications";
import { NotificationDropdown } from "@/app/components/notifications";
import Link from "next/link";

// Services/Categories pour la navigation
const serviceCategories = [
  { slug: "garde", label: "Garde", emoji: "🏠", href: "/recherche?mode=garde" },
  { slug: "toilettage", label: "Toilettage", emoji: "✂️", href: "/recherche?mode=services&category=toilettage" },
  { slug: "dressage", label: "Dressage", emoji: "🎓", href: "/recherche?mode=services&category=dressage" },
  { slug: "promenade", label: "Promenade", emoji: "🚶", href: "/recherche?mode=services&category=promenade" },
  { slug: "transport", label: "Transport", emoji: "🚗", href: "/recherche?mode=services&category=transport" },
  { slug: "pension", label: "Pension", emoji: "🏨", href: "/recherche?mode=services&category=pension" },
  { slug: "visite", label: "Visite à domicile", emoji: "👀", href: "/recherche?mode=services&category=visite" },
  { slug: "veterinaire", label: "Vétérinaire", emoji: "🩺", href: "/recherche?mode=services&category=veterinaire" },
  { slug: "comportementaliste", label: "Comportementaliste", emoji: "🧠", href: "/recherche?mode=services&category=comportementaliste" },
];

// Desktop: 5 premiers services affichés, le reste dans "Plus"
const DESKTOP_VISIBLE_COUNT = 5;

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Services visibles et cachés sur desktop
  const visibleServices = serviceCategories.slice(0, DESKTOP_VISIBLE_COUNT);
  const moreServices = serviceCategories.slice(DESKTOP_VISIBLE_COUNT);

  const { isLoading, isAuthenticated, isAdmin, user, logout } = useAuthState();
  const { unreadCount } = useNotifications(50);

  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > 20);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Fermer les menus si on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-profile-menu]')) {
        setIsProfileOpen(false);
      }
      if (!target.closest('[data-more-menu]')) {
        setIsMoreOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const initials = user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() : "";

  return (
    <>
      {/* Main Navbar */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled
            ? "bg-white/95 backdrop-blur-xl shadow-sm border-b border-gray-100"
            : "bg-white/80 backdrop-blur-md"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <motion.div
                className="relative w-9 h-9 bg-gradient-to-br from-primary via-primary to-secondary rounded-xl flex items-center justify-center shadow-md shadow-primary/25"
                whileHover={{ scale: 1.05, rotate: -3 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <span className="text-base">🐾</span>
                <motion.div
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
              <span className="text-xl font-bold text-gray-900">
                Anim<span className="text-primary">igo</span>
              </span>
            </Link>

            {/* Desktop: Services Navigation */}
            <div className="hidden lg:flex items-center">
              <div className="flex items-center bg-gray-50/80 rounded-full px-1 py-1">
                {visibleServices.map((service) => (
                  <Link
                    key={service.slug}
                    href={service.href}
                    className="relative px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors rounded-full"
                    onMouseEnter={() => setHoveredLink(service.slug)}
                    onMouseLeave={() => setHoveredLink(null)}
                  >
                    <span className="relative z-10 flex items-center gap-1.5">
                      <span className="text-base">{service.emoji}</span>
                      <span>{service.label}</span>
                    </span>
                    <AnimatePresence>
                      {hoveredLink === service.slug && (
                        <motion.div
                          layoutId="navHover"
                          className="absolute inset-0 bg-white rounded-full shadow-sm"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          style={{ zIndex: 0 }}
                        />
                      )}
                    </AnimatePresence>
                  </Link>
                ))}

                {/* Plus dropdown si plus de 6 services */}
                {moreServices.length > 0 && (
                  <div className="relative" data-more-menu>
                    <button
                      onClick={() => setIsMoreOpen(!isMoreOpen)}
                      className={cn(
                        "flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-full transition-colors",
                        isMoreOpen
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                      )}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                      <span>Plus</span>
                      <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isMoreOpen && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                      {isMoreOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.96 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[200]"
                        >
                          <div className="p-2">
                            {moreServices.map((service) => (
                              <Link
                                key={service.slug}
                                href={service.href}
                                onClick={() => setIsMoreOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <span className="text-lg">{service.emoji}</span>
                                <span className="font-medium">{service.label}</span>
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop: Right Side Actions */}
            <div className="hidden lg:flex items-center gap-3">
              {!isLoading && isAuthenticated && user ? (
                <>
                  {/* Messages */}
                  <Link
                    href="/dashboard/messagerie"
                    className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                  </Link>

                  {/* Notifications */}
                  <NotificationDropdown />

                  {/* Profile Menu */}
                  <div className="relative" data-profile-menu>
                    <button
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                      className={cn(
                        "flex items-center gap-2 p-1.5 rounded-full transition-all",
                        isProfileOpen ? "bg-gray-100" : "hover:bg-gray-100"
                      )}
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {initials}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isProfileOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.96 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[200]"
                        >
                          <div className="p-3 border-b border-gray-100">
                            <p className="font-semibold text-gray-900 truncate">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          </div>
                          <div className="p-1">
                            <Link
                              href={isAdmin ? "/admin" : "/dashboard"}
                              onClick={() => setIsProfileOpen(false)}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <LayoutDashboard className="w-4 h-4" />
                              <span>{isAdmin ? "Administration" : "Dashboard"}</span>
                            </Link>
                            <button
                              onClick={() => { setIsProfileOpen(false); logout(); }}
                              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <LogOut className="w-4 h-4" />
                              <span>Se déconnecter</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                /* Non connecté: Devenir annonceur + Connexion */
                <>
                  <Link
                    href="/inscription"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Devenir annonceur</span>
                  </Link>
                  <Link
                    href="/connexion"
                    className="flex items-center gap-2 p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                  >
                    <User className="w-5 h-5" />
                    <span className="text-sm font-medium">Connexion</span>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile: Right Side */}
            <div className="flex lg:hidden items-center gap-1">
              {!isLoading && isAuthenticated && user ? (
                <>
                  {/* Messages */}
                  <Link
                    href="/dashboard/messagerie"
                    className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                  </Link>
                  {/* Notifications - dropdown */}
                  <NotificationDropdown />
                </>
              ) : (
                <>
                  {/* Devenir annonceur (mobile) - only when not logged in */}
                  <Link
                    href="/inscription"
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 underline underline-offset-2 mr-1"
                  >
                    Devenir annonceur
                  </Link>
                  <Link
                    href="/connexion"
                    className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <User className="w-5 h-5" />
                  </Link>
                </>
              )}

              {/* Hamburger Menu */}
              <button
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isMobileMenuOpen ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
                )}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile: Services Scrollable Bar */}
        <div className="lg:hidden border-t border-gray-100 bg-white/95">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-1 px-4 py-2 min-w-max">
              {serviceCategories.map((service) => (
                <Link
                  key={service.slug}
                  href={service.href}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg whitespace-nowrap transition-colors"
                >
                  <span>{service.emoji}</span>
                  <span>{service.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu - Slide from Right */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Slide-in Menu */}
            <motion.div
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm z-50 bg-white shadow-2xl lg:hidden flex flex-col"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <span className="text-lg font-bold text-gray-900">Menu</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Services Section */}
                <div className="p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Nos services</p>
                  <div className="space-y-1">
                    {serviceCategories.map((service, index) => (
                      <motion.div
                        key={service.slug}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link
                          href={service.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-xl">{service.emoji}</span>
                          <span className="font-medium text-gray-900">{service.label}</span>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="mx-4 h-px bg-gray-100" />

                {/* Other Links */}
                <div className="p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Liens utiles</p>
                  <div className="space-y-1">
                    <Link
                      href="/inscription"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <Briefcase className="w-5 h-5 text-secondary" />
                      <span className="font-medium text-gray-900">Devenir annonceur</span>
                    </Link>
                    <Link
                      href="/#how-it-works"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-xl">✨</span>
                      <span className="font-medium text-gray-900">Comment ça marche</span>
                    </Link>
                    <Link
                      href="/#faq"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-xl">❓</span>
                      <span className="font-medium text-gray-900">FAQ</span>
                    </Link>
                  </div>
                </div>

                {/* User Section (if authenticated) */}
                {!isLoading && isAuthenticated && user && (
                  <>
                    <div className="mx-4 h-px bg-gray-100" />
                    <div className="p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Mon compte</p>

                      {/* User Info Card */}
                      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Link
                          href={isAdmin ? "/admin" : "/dashboard"}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          <LayoutDashboard className="w-5 h-5 text-primary" />
                          <span className="font-medium text-gray-900">{isAdmin ? "Administration" : "Mon espace"}</span>
                        </Link>
                        <Link
                          href="/dashboard/messagerie"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          <MessageCircle className="w-5 h-5 text-gray-500" />
                          <span className="font-medium text-gray-900">Messages</span>
                        </Link>
                        <Link
                          href="/client/notifications"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors relative"
                        >
                          <Bell className="w-5 h-5 text-gray-500" />
                          <span className="font-medium text-gray-900">Notifications</span>
                          {unreadCount > 0 && (
                            <span className="ml-auto px-2 py-0.5 bg-primary text-white text-xs font-bold rounded-full">
                              {unreadCount}
                            </span>
                          )}
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                {!isLoading && isAuthenticated && user ? (
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); logout(); }}
                    className="flex items-center justify-center gap-2 w-full p-3 text-red-600 font-medium rounded-xl border border-red-200 bg-white hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Se déconnecter
                  </button>
                ) : (
                  <div className="space-y-2">
                    <Link
                      href="/connexion"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 w-full p-3 bg-primary text-white font-semibold rounded-xl shadow-md shadow-primary/25 hover:bg-primary/90 transition-colors"
                    >
                      <User className="w-4 h-4" />
                      Se connecter
                    </Link>
                    <Link
                      href="/inscription"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 w-full p-3 text-gray-700 font-medium rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                    >
                      Créer un compte
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spacer for fixed navbar */}
      <div className="h-16 lg:h-16" />
      <div className="h-12 lg:hidden" /> {/* Extra space for mobile services bar */}
    </>
  );
}
