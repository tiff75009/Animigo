"use client";

import { useState, memo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  User,
  CreditCard,
  Settings,
  MessageSquare,
  LogOut,
  Calendar,
  CheckCircle,
  Clock,
  CalendarClock,
  XCircle,
  Ban,
  HelpCircle,
  Star,
  Briefcase,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/hooks/useAuth";
import { useSidebar } from "@/app/contexts/SidebarContext";

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  onClick?: () => void;
}

const NavLink = memo(function NavLink({ item, isActive, isCollapsed, onClick }: NavLinkProps) {
  return (
    <Link href={item.href} onClick={onClick}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "relative flex items-center gap-3 rounded-2xl transition-all duration-300",
          isCollapsed ? "p-3 justify-center" : "px-4 py-3",
          isActive
            ? "bg-primary text-white shadow-lg shadow-primary/30"
            : "text-slate-600 hover:bg-slate-100/80"
        )}
        title={isCollapsed ? item.label : undefined}
      >
        <span className="shrink-0 relative">
          {item.icon}
          {(item.badge ?? 0) > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {item.badge! > 9 ? "9+" : item.badge}
            </span>
          )}
        </span>
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="font-medium whitespace-nowrap overflow-hidden"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </Link>
  );
});

interface NavSectionProps {
  title: string;
  items: NavItem[];
  currentPath: string;
  isCollapsed: boolean;
  onItemClick?: () => void;
}

const NavSection = memo(function NavSection({
  title,
  items,
  currentPath,
  isCollapsed,
  onItemClick,
}: NavSectionProps) {
  return (
    <div className="space-y-1">
      <AnimatePresence mode="wait">
        {!isCollapsed && (
          <motion.p
            key="title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3"
          >
            {title}
          </motion.p>
        )}
      </AnimatePresence>
      {items.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          isActive={currentPath === item.href}
          isCollapsed={isCollapsed}
          onClick={onItemClick}
        />
      ))}
    </div>
  );
});

// Collapsible section for missions
interface CollapsibleNavSectionProps {
  title: string;
  icon: React.ReactNode;
  items: NavItem[];
  currentPath: string;
  isCollapsed: boolean;
  onItemClick?: () => void;
}

const CollapsibleNavSection = memo(function CollapsibleNavSection({
  title,
  icon,
  items,
  currentPath,
  isCollapsed,
  onItemClick,
}: CollapsibleNavSectionProps) {
  const hasActiveItem = items.some(item => currentPath === item.href || currentPath.startsWith(item.href + "/"));
  const [isOpen, setIsOpen] = useState(hasActiveItem);

  // Si collapsed, on ne montre que l'icône du premier item actif ou l'icône par défaut
  if (isCollapsed) {
    return (
      <div className="space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={currentPath === item.href}
            isCollapsed={isCollapsed}
            onClick={onItemClick}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-3 w-full px-4 py-3 rounded-2xl font-medium transition-colors",
          hasActiveItem
            ? "bg-primary/10 text-primary"
            : "text-slate-600 hover:bg-slate-100/80"
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {icon}
        <span className="flex-1 text-left">{title}</span>
        {hasActiveItem && (
          <span className="px-2 py-0.5 text-xs font-bold bg-primary text-white rounded-full">
            {items.length}
          </span>
        )}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-3 space-y-1">
              {items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  isActive={currentPath === item.href}
                  isCollapsed={false}
                  onClick={onItemClick}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

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

export default function FloatingSidebar() {
  const pathname = usePathname();
  const { user, token, logout, isLoading } = useAuth();
  const { isCollapsed: isManuallyCollapsed, toggleCollapse } = useSidebar();

  // Compteur de messages non lus
  const unreadMessagesCount = useQuery(
    api.messaging.queries.totalUnreadCount,
    token ? { token } : "skip"
  ) as number | undefined;
  const unreadCount = unreadMessagesCount ?? 0;

  const [mounted, setMounted] = useState(false);

  // Scroll detection
  const navRef = useRef<HTMLElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const isLgScreen = useMediaQuery("(min-width: 1024px)", true);

  // Récupérer le profil pour l'avatar
  const profileData = useQuery(
    api.services.profile.getProfile,
    token ? { token } : "skip"
  );

  // Récupérer le statut de vérification
  const verificationStatus = useQuery(
    api.verification.verification.getVerificationStatus,
    token ? { sessionToken: token } : "skip"
  );

  const isIdentityVerified = verificationStatus?.isIdentityVerified || false;
  const hasPendingRequest = verificationStatus?.latestRequest?.status === "submitted";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check scroll state
  const checkScrollState = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;

    const { scrollTop, scrollHeight, clientHeight } = nav;
    setCanScrollUp(scrollTop > 5);
    setCanScrollDown(scrollTop < scrollHeight - clientHeight - 5);
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    checkScrollState();
    nav.addEventListener("scroll", checkScrollState, { passive: true });

    // Re-check on resize
    const resizeObserver = new ResizeObserver(checkScrollState);
    resizeObserver.observe(nav);

    return () => {
      nav.removeEventListener("scroll", checkScrollState);
      resizeObserver.disconnect();
    };
  }, [checkScrollState, mounted]);

  const isCollapsed = isLgScreen ? isManuallyCollapsed : true;

  const mainNavItems: NavItem[] = [
    { href: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" />, label: "Tableau de bord" },
    { href: "/dashboard/planning", icon: <Calendar className="w-5 h-5" />, label: "Planning" },
    { href: "/dashboard/messagerie", icon: <MessageSquare className="w-5 h-5" />, label: "Messages", badge: unreadCount },
  ];

  const missionNavItems: NavItem[] = [
    { href: "/dashboard/missions/accepter", icon: <HelpCircle className="w-5 h-5" />, label: "À accepter" },
    { href: "/dashboard/missions/confirmation", icon: <Clock className="w-5 h-5" />, label: "En attente" },
    { href: "/dashboard/missions/en-cours", icon: <CalendarClock className="w-5 h-5" />, label: "En cours" },
    { href: "/dashboard/missions/a-venir", icon: <Calendar className="w-5 h-5" />, label: "À venir" },
    { href: "/dashboard/missions/terminees", icon: <CheckCircle className="w-5 h-5" />, label: "Terminées" },
    { href: "/dashboard/missions/refusees", icon: <XCircle className="w-5 h-5" />, label: "Refusées" },
    { href: "/dashboard/missions/annulees", icon: <Ban className="w-5 h-5" />, label: "Annulées" },
  ];

  const accountNavItems: NavItem[] = [
    { href: "/dashboard/profil", icon: <User className="w-5 h-5" />, label: "Ma fiche" },
    { href: "/dashboard/services", icon: <Briefcase className="w-5 h-5" />, label: "Mes services" },
    { href: "/dashboard/avis", icon: <Star className="w-5 h-5" />, label: "Mes avis" },
    { href: "/dashboard/paiements", icon: <CreditCard className="w-5 h-5" />, label: "Paiements" },
    { href: "/dashboard/parametres", icon: <Settings className="w-5 h-5" />, label: "Paramètres" },
  ];

  const handleLogout = async () => {
    await logout();
  };

  const sidebarWidth = isCollapsed ? 72 : 280;

  return (
    <div className="hidden md:block fixed left-4 top-32 lg:top-24 bottom-6 z-40">
      {/* Toggle Button */}
      {isLgScreen && (
        <motion.button
          onClick={toggleCollapse}
          initial={false}
          animate={{ left: sidebarWidth - 12 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="absolute top-8 z-50 w-6 h-6 bg-white border border-slate-200 rounded-full shadow-md flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </motion.div>
        </motion.button>
      )}

      <motion.aside
        initial={false}
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="h-full flex flex-col bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden"
        style={{ width: mounted ? undefined : sidebarWidth }}
      >
        {/* User Avatar Section */}
        <div className={cn(
          "p-4 border-b border-slate-100",
          isCollapsed && "px-3"
        )}>
          <div className={cn(
            "flex items-center gap-3",
            isCollapsed && "justify-center"
          )}>
            <div className="relative w-10 h-10 rounded-2xl overflow-hidden ring-2 ring-white shadow-lg shadow-primary/25 shrink-0 bg-gradient-to-br from-primary to-secondary">
              {profileData?.profile?.profileImageUrl ? (
                <Image
                  src={profileData.profile.profileImageUrl}
                  alt="Avatar"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden flex-1 min-w-0"
                >
                  <p className="font-semibold text-slate-800 text-sm whitespace-nowrap truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs whitespace-nowrap flex items-center gap-1">
                    {isIdentityVerified ? (
                      <>
                        <ShieldCheck className="w-3 h-3 text-secondary" />
                        <span className="text-secondary">Vérifié</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 text-amber-500" />
                        <span className="text-amber-600">Non vérifié</span>
                      </>
                    )}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Verification Button */}
        {!isIdentityVerified && !isLoading && !isCollapsed && (
          <div className="px-3 py-2">
            <Link href="/dashboard/verification">
              <motion.div
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-colors",
                  hasPendingRequest
                    ? "bg-blue-50 border border-blue-200"
                    : "bg-amber-50 border border-amber-200 hover:bg-amber-100"
                )}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {hasPendingRequest ? (
                  <>
                    <Clock className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-blue-700">En cours de vérification</p>
                    </div>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-amber-700">Vérifier mon profil</p>
                    </div>
                  </>
                )}
              </motion.div>
            </Link>
          </div>
        )}

        {/* Navigation with scroll indicators */}
        <div className="flex-1 relative overflow-hidden">
          {/* Top scroll indicator - subtle chevron */}
          <AnimatePresence>
            {canScrollUp && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute top-1 right-2 z-10"
              >
                <motion.div
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="w-6 h-6 rounded-full bg-slate-100/80 backdrop-blur-sm flex items-center justify-center"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 rotate-180" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <nav
            ref={navRef}
            className={cn(
              "h-full py-4 space-y-6 overflow-y-auto overflow-x-hidden scrollbar-hide",
              isCollapsed ? "px-2" : "px-3"
            )}
          >
            <NavSection
              title="Principal"
              items={mainNavItems}
              currentPath={pathname}
              isCollapsed={isCollapsed}
            />

            <CollapsibleNavSection
              title="Missions"
              icon={<ClipboardList className="w-5 h-5" />}
              items={missionNavItems}
              currentPath={pathname}
              isCollapsed={isCollapsed}
            />

            <NavSection
              title="Compte"
              items={accountNavItems}
              currentPath={pathname}
              isCollapsed={isCollapsed}
            />
          </nav>

          {/* Bottom scroll indicator - subtle chevron */}
          <AnimatePresence>
            {canScrollDown && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute bottom-1 right-2 z-10"
              >
                <motion.div
                  animate={{ y: [0, 3, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="w-6 h-6 rounded-full bg-slate-100/80 backdrop-blur-sm flex items-center justify-center"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logout */}
        <div className={cn(
          "p-3 border-t border-slate-100",
          isCollapsed && "px-2"
        )}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 rounded-2xl text-red-500 hover:bg-red-50 transition-all w-full",
              isCollapsed ? "p-3 justify-center" : "px-4 py-3"
            )}
            title={isCollapsed ? "Déconnexion" : undefined}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="font-medium whitespace-nowrap overflow-hidden text-sm"
                >
                  Déconnexion
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.aside>
    </div>
  );
}
