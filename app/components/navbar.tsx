"use client";

import { cn } from "@/app/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  User,
  Briefcase,
  LogOut,
  LayoutDashboard,
  Bell,
  MessageCircle,
  ChevronDown,
  MoreHorizontal,
  Calendar,
  CreditCard,
  Settings,
  Star,
  ClipboardList,
  Home,
  Search,
  PawPrint,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useAuthState } from "@/app/hooks/useAuthState";
import { useNotifications } from "@/app/hooks/useNotifications";
import { NotificationDropdown } from "@/app/components/notifications";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

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

// Menu items pour le dashboard annonceur (par sections)
const announcerDashboardSections = [
  {
    title: "Principal",
    collapsible: false,
    items: [
      { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/dashboard/planning", label: "Planning", icon: Calendar },
      { href: "/dashboard/messagerie", label: "Messages", icon: MessageCircle },
    ],
  },
  {
    title: "Missions",
    collapsible: true,
    icon: ClipboardList,
    items: [
      { href: "/dashboard/missions/accepter", label: "À accepter", icon: ClipboardList },
      { href: "/dashboard/missions/confirmation", label: "En attente", icon: Calendar },
      { href: "/dashboard/missions/en-cours", label: "En cours", icon: Calendar },
      { href: "/dashboard/missions/a-venir", label: "À venir", icon: Calendar },
      { href: "/dashboard/missions/terminees", label: "Terminées", icon: Calendar },
    ],
  },
  {
    title: "Compte",
    collapsible: false,
    items: [
      { href: "/dashboard/profil", label: "Ma fiche", icon: User },
      { href: "/dashboard/services", label: "Mes services", icon: Briefcase },
      { href: "/dashboard/avis", label: "Mes avis", icon: Star },
      { href: "/dashboard/paiements", label: "Paiements", icon: CreditCard },
      { href: "/dashboard/parametres", label: "Paramètres", icon: Settings },
    ],
  },
];

// Menu items pour le dashboard client (par sections)
const clientDashboardSections = [
  {
    title: "Navigation",
    collapsible: false,
    items: [
      { href: "/client", label: "Accueil", icon: Home },
      { href: "/recherche", label: "Rechercher", icon: Search },
      { href: "/client/messagerie", label: "Messages", icon: MessageCircle },
      { href: "/client/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    title: "Mon compte",
    collapsible: false,
    items: [
      { href: "/client/profil", label: "Mon profil", icon: User },
      { href: "/client/mes-animaux", label: "Mes animaux", icon: PawPrint },
      { href: "/client/reservations", label: "Réservations", icon: Calendar },
      { href: "/client/parametres", label: "Paramètres", icon: Settings },
    ],
  },
];

interface NavbarProps {
  hideSpacers?: boolean;
}

export function Navbar({ hideSpacers = false }: NavbarProps) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  // Services visibles et cachés sur desktop
  const visibleServices = serviceCategories.slice(0, DESKTOP_VISIBLE_COUNT);
  const moreServices = serviceCategories.slice(DESKTOP_VISIBLE_COUNT);

  const { isLoading, isAuthenticated, isAdmin, user, logout } = useAuthState();
  const { unreadCount } = useNotifications(50);

  // Token pour les queries
  const [authToken, setAuthToken] = useState<string | null>(null);
  useEffect(() => {
    const t = localStorage.getItem("auth_token");
    setAuthToken(t);
  }, []);

  // Compteur de messages non lus
  const unreadMessagesCount = useQuery(
    api.messaging.queries.totalUnreadCount,
    authToken ? { token: authToken } : "skip"
  ) as number | undefined;

  // Récupérer l'avatar du profil (annonceur ou client)
  const announcerProfile = useQuery(
    api.services.profile.getProfile,
    authToken ? { token: authToken } : "skip"
  );
  const clientProfile = useQuery(
    api.client.profile.getClientProfile,
    authToken ? { token: authToken } : "skip"
  );
  const avatarUrl =
    announcerProfile?.profile?.profileImageUrl ||
    clientProfile?.profileImageUrl ||
    null;

  // Nom et logo dynamiques du site
  const siteName = useQuery(api.admin.config.getSiteName) ?? "Animigo";
  const siteLogo = useQuery(api.admin.config.getSiteLogo);

  // Detect if we're on a dashboard page
  const isOnAnnouncerDashboard = pathname.startsWith("/dashboard");
  const isOnClientDashboard = pathname.startsWith("/client");
  const isOnDashboard = isOnAnnouncerDashboard || isOnClientDashboard;
  const dashboardSections = isOnAnnouncerDashboard ? announcerDashboardSections : clientDashboardSections;

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
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-colors duration-200",
          isScrolled
            ? "bg-white shadow-sm border-b border-gray-100"
            : "bg-white/95"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              {siteLogo ? (
                <Image
                  src={siteLogo}
                  alt={siteName}
                  width={48}
                  height={48}
                  className="w-12 h-12 object-contain group-hover:scale-105 group-hover:-rotate-3 transition-transform duration-200"
                  unoptimized
                />
              ) : (
                <div className="relative w-9 h-9 bg-gradient-to-br from-primary via-primary to-secondary rounded-xl flex items-center justify-center shadow-md shadow-primary/25 group-hover:scale-105 group-hover:-rotate-3 transition-transform duration-200">
                  <span className="text-base">🐾</span>
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full" />
                </div>
              )}
              <span className="hidden lg:inline text-2xl font-love-taking text-gray-900 translate-y-1.5">
                <span className="text-primary">{siteName.slice(0, 2)}</span>{siteName.slice(2)}
              </span>
            </Link>

            {/* Desktop: Services Navigation */}
            <div className="hidden lg:flex items-center">
              <div className="flex items-center bg-gray-50/80 rounded-full px-1 py-1">
                {visibleServices.map((service) => (
                  <Link
                    key={service.slug}
                    href={service.href}
                    className="relative px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-full transition-all duration-150"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="text-base">{service.emoji}</span>
                      <span>{service.label}</span>
                    </span>
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
                    href={isOnClientDashboard ? "/client/messagerie" : "/dashboard/messagerie"}
                    className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    {(unreadMessagesCount ?? 0) > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                        {unreadMessagesCount! > 99 ? "99+" : unreadMessagesCount}
                      </span>
                    )}
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
                      <div className="relative w-8 h-8 rounded-xl overflow-hidden bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
                        {avatarUrl ? (
                          <Image src={avatarUrl} alt="Avatar" fill className="object-cover" />
                        ) : (
                          initials
                        )}
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
                    className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                  >
                    <User className="w-5 h-5" />
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
                    href={isOnClientDashboard ? "/client/messagerie" : "/dashboard/messagerie"}
                    className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    {(unreadMessagesCount ?? 0) > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                        {unreadMessagesCount! > 99 ? "99+" : unreadMessagesCount}
                      </span>
                    )}
                  </Link>
                  {/* Notifications - dropdown */}
                  <NotificationDropdown />
                </>
              ) : (
                <>
                  {/* Devenir annonceur (mobile) - only when not logged in */}
                  <Link
                    href="/inscription"
                    className="text-xs font-bold text-secondary hover:text-secondary/80 whitespace-nowrap mr-1"
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
        <div className="lg:hidden border-t border-gray-100 bg-white/95 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 py-2 px-3">
            {serviceCategories.map((service) => (
              <Link
                key={service.slug}
                href={service.href}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-full whitespace-nowrap transition-colors flex-shrink-0"
              >
                <span>{service.emoji}</span>
                <span>{service.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>

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
                <div className="flex items-center gap-2">
                  {siteLogo ? (
                    <Image
                      src={siteLogo}
                      alt={siteName}
                      width={28}
                      height={28}
                      className="w-7 h-7 object-contain"
                      unoptimized
                    />
                  ) : (
                    <span className="text-lg">🐾</span>
                  )}
                  <span className="text-lg font-love-taking text-gray-900">
                    <span className="text-primary">{siteName.slice(0, 2)}</span>{siteName.slice(2)}
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                {isOnDashboard ? (
                  /* Dashboard Navigation - Compact with sections */
                  <div className="py-2">
                    {dashboardSections.map((section, idx) => {
                      const isExpanded = expandedSections.includes(section.title);
                      const hasActiveItem = section.items.some(item => pathname === item.href || pathname.startsWith(item.href + "/"));
                      const SectionIcon = section.collapsible ? ClipboardList : null;

                      return (
                        <div key={section.title}>
                          {idx > 0 && <div className="mx-4 h-px bg-gray-100 my-2" />}
                          <div className="px-4 py-1">
                            {section.collapsible ? (
                              /* Collapsible section (Missions) */
                              <>
                                <button
                                  onClick={() => setExpandedSections(prev =>
                                    prev.includes(section.title)
                                      ? prev.filter(s => s !== section.title)
                                      : [...prev, section.title]
                                  )}
                                  className={cn(
                                    "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg transition-colors",
                                    hasActiveItem ? "bg-primary/10 text-primary" : "hover:bg-gray-50 text-gray-700"
                                  )}
                                >
                                  {SectionIcon && <SectionIcon className="w-4 h-4" />}
                                  <span className="text-sm font-medium flex-1 text-left">{section.title}</span>
                                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                                    {section.items.length}
                                  </span>
                                  <motion.div
                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                  </motion.div>
                                </button>
                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="pl-4 mt-1 space-y-0.5">
                                        {section.items.map((item) => {
                                          const Icon = item.icon;
                                          const isActive = pathname === item.href;
                                          return (
                                            <Link
                                              key={item.href}
                                              href={item.href}
                                              onClick={() => setIsMobileMenuOpen(false)}
                                              className={cn(
                                                "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors",
                                                isActive
                                                  ? "bg-primary text-white"
                                                  : "hover:bg-gray-50 text-gray-700"
                                              )}
                                            >
                                              <Icon className="w-4 h-4" />
                                              <span className="text-sm font-medium">{item.label}</span>
                                            </Link>
                                          );
                                        })}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </>
                            ) : (
                              /* Normal section */
                              <>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 px-3">
                                  {section.title}
                                </p>
                                <div className="space-y-0.5">
                                  {section.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href;
                                    return (
                                      <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={cn(
                                          "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors",
                                          isActive
                                            ? "bg-primary text-white"
                                            : "hover:bg-gray-50 text-gray-700"
                                        )}
                                      >
                                        <Icon className="w-4 h-4" />
                                        <span className="text-sm font-medium">{item.label}</span>
                                      </Link>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    {/* Services Section */}
                    <div className="p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Nos services</p>
                      <div className="space-y-1">
                        {serviceCategories.map((service) => (
                          <Link
                            key={service.slug}
                            href={service.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                          >
                            <span className="text-xl">{service.emoji}</span>
                            <span className="font-medium text-gray-900">{service.label}</span>
                          </Link>
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
                  </>
                )}

                {/* User Section (if authenticated) */}
                {!isLoading && isAuthenticated && user && (
                  <>
                    <div className="mx-4 h-px bg-gray-100" />
                    <div className="p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Mon compte</p>

                      {/* User Info Card */}
                      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl mb-3">
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm">
                          {avatarUrl ? (
                            <Image src={avatarUrl} alt="Avatar" fill className="object-cover" />
                          ) : (
                            initials
                          )}
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
                          href={isOnClientDashboard ? "/client/messagerie" : "/dashboard/messagerie"}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors relative"
                        >
                          <MessageCircle className="w-5 h-5 text-gray-500" />
                          <span className="font-medium text-gray-900">Messages</span>
                          {(unreadMessagesCount ?? 0) > 0 && (
                            <span className="ml-auto px-2 py-0.5 bg-primary text-white text-xs font-bold rounded-full">
                              {unreadMessagesCount! > 99 ? "99+" : unreadMessagesCount}
                            </span>
                          )}
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
      {!hideSpacers && (
        <>
          <div className="h-16 lg:h-16" />
          <div className="h-12 lg:hidden" /> {/* Extra space for mobile services bar */}
        </>
      )}
    </>
  );
}
