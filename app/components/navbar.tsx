"use client";

import { cn } from "@/app/lib/utils";
import { navLinks } from "@/app/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Search, LogIn, UserPlus, LayoutDashboard, LogOut, ChevronDown } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useAuthState } from "@/app/hooks/useAuthState";
import Link from "next/link";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const { isLoading, isAuthenticated, isAdmin, user, logout } = useAuthState();

  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > 20);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Fermer le menu profil si on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-profile-menu]')) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const initials = user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() : "";

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className={cn(
          "fixed top-3 left-3 right-3 z-50 transition-all duration-300 rounded-2xl",
          isScrolled
            ? "bg-white/80 backdrop-blur-xl shadow-lg shadow-black/5 border border-gray-200/50"
            : "bg-white/50 backdrop-blur-md border border-white/50"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 lg:h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <motion.div
                className="relative w-9 h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-primary via-primary to-secondary rounded-xl flex items-center justify-center shadow-md shadow-primary/25"
                whileHover={{ scale: 1.05, rotate: -3 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <span className="text-base lg:text-lg">🐾</span>
                <motion.div
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
              <div className="flex flex-col">
                <span className="text-lg lg:text-xl font-bold text-gray-900 leading-none">
                  Anim<span className="text-primary">igo</span>
                </span>
                <span className="text-[9px] lg:text-[10px] text-gray-500 font-medium hidden sm:block">
                  Le bonheur de vos animaux
                </span>
              </div>
            </Link>

            {/* Desktop Navigation - Centre */}
            <div className="hidden lg:flex items-center gap-0.5 bg-gray-100/80 rounded-xl p-1">
              {navLinks.map((link) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  className="relative px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  onHoverStart={() => setHoveredLink(link.href)}
                  onHoverEnd={() => setHoveredLink(null)}
                >
                  <span className="relative z-10">{link.label}</span>
                  <AnimatePresence>
                    {hoveredLink === link.href && (
                      <motion.div
                        layoutId="navHover"
                        className="absolute inset-0 bg-white rounded-lg shadow-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        style={{ zIndex: 0 }}
                      />
                    )}
                  </AnimatePresence>
                </motion.a>
              ))}
            </div>

            {/* Tablette Navigation - Centre (md only) */}
            <div className="hidden md:flex lg:hidden items-center gap-0.5 bg-gray-100/80 rounded-xl p-1">
              {navLinks.slice(0, 2).map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white transition-all"
                >
                  {link.label}
                </a>
              ))}
              <div className="relative group">
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white transition-all">
                  Plus
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <div className="absolute top-full right-0 mt-2 py-2 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[160px]">
                  {navLinks.slice(2).map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    >
                      <span>{link.emoji}</span>
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Desktop CTAs - Droite */}
            <div className="hidden md:flex items-center gap-2">
              {!isLoading && isAuthenticated && user ? (
                /* Menu Profil Connecté */
                <div className="relative" data-profile-menu>
                  <motion.button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className={cn(
                      "flex items-center gap-2 pl-1 pr-3 py-1 rounded-full transition-all",
                      isProfileOpen
                        ? "bg-gray-100 shadow-inner"
                        : "hover:bg-gray-100/80"
                    )}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      {initials}
                    </div>
                    <span className="text-sm font-medium text-gray-700 hidden lg:block max-w-[100px] truncate">
                      {user.firstName}
                    </span>
                    <motion.div
                      animate={{ rotate: isProfileOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </motion.div>
                  </motion.button>

                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl shadow-black/10 border border-gray-100 overflow-hidden"
                      >
                        {/* Header profil */}
                        <div className="p-4 bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white font-bold shadow-md">
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
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                              <LayoutDashboard className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-medium">{isAdmin ? "Administration" : "Dashboard"}</span>
                          </Link>
                        </div>

                        <div className="mx-3 h-px bg-gray-100" />

                        <div className="p-2">
                          <button
                            onClick={() => {
                              setIsProfileOpen(false);
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
                /* Boutons Auth - Non connecté */
                <div className="flex items-center gap-1.5">
                  <Link
                    href="/connexion"
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100/80 transition-all"
                  >
                    Se connecter
                  </Link>
                  <Link
                    href="/inscription"
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary border border-primary/20 rounded-lg hover:bg-primary/5 hover:border-primary/30 transition-all"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>S&apos;inscrire</span>
                  </Link>
                </div>
              )}

              {/* CTA Recherche */}
              <Link
                href="/recherche"
                className="group flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-primary to-primary/90 rounded-xl shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
              >
                <Search className="w-4 h-4" />
                <span className="hidden lg:inline">Rechercher</span>
                <motion.span
                  className="text-white/80"
                  animate={{ x: [0, 2, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              <Link
                href="/recherche"
                className="p-2.5 bg-primary text-white rounded-xl shadow-md shadow-primary/25"
              >
                <Search className="w-4 h-4" />
              </Link>
              <motion.button
                className={cn(
                  "p-2.5 rounded-xl transition-colors",
                  isMobileMenuOpen
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700"
                )}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                whileTap={{ scale: 0.95 }}
              >
                <AnimatePresence mode="wait">
                  {isMobileMenuOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <X className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Menu className="w-5 h-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 md:hidden"
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Menu content */}
            <motion.div
              className="absolute top-20 left-3 right-3 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              {/* Navigation Links */}
              <div className="p-2">
                {navLinks.map((link, index) => (
                  <motion.a
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <span className="text-lg">{link.emoji}</span>
                    <span className="font-medium text-gray-900">{link.label}</span>
                  </motion.a>
                ))}
              </div>

              <div className="mx-4 h-px bg-gray-100" />

              {/* Auth Section */}
              <div className="p-3">
                {!isLoading && isAuthenticated && user ? (
                  <div className="space-y-2">
                    {/* User Info */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white font-bold text-sm">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>

                    <Link
                      href={isAdmin ? "/admin" : "/dashboard"}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 w-full p-3 bg-gray-900 text-white font-medium rounded-xl"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      {isAdmin ? "Administration" : "Dashboard"}
                    </Link>

                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        logout();
                      }}
                      className="flex items-center justify-center gap-2 w-full p-3 text-red-600 font-medium rounded-xl border border-red-200 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Se déconnecter
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href="/connexion"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-center gap-2 p-3 text-gray-700 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <LogIn className="w-4 h-4" />
                        Connexion
                      </Link>
                      <Link
                        href="/inscription"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-center gap-2 p-3 text-primary font-medium rounded-xl border border-primary/20 hover:bg-primary/5 transition-colors"
                      >
                        <UserPlus className="w-4 h-4" />
                        Inscription
                      </Link>
                    </div>
                    <Link
                      href="/recherche"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 w-full p-3.5 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-xl shadow-lg shadow-primary/25"
                    >
                      <Search className="w-4 h-4" />
                      Trouver un prestataire
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
