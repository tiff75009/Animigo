"use client";

import { useState, memo, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  MessageCircle,
  PawPrint,
  Settings,
  LogOut,
  Search,
  Calendar,
  User,
  ChevronLeft,
  Bell,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useAuth } from "@/app/hooks/useAuth";

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
          {item.badge && item.badge > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {item.badge > 9 ? "9+" : item.badge}
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
  const { logout } = useAuth();

  const [isManuallyCollapsed, setIsManuallyCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isLgScreen = useMediaQuery("(min-width: 1024px)", true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("client-sidebar-collapsed");
    if (saved !== null) {
      setIsManuallyCollapsed(saved === "true");
    }
  }, []);

  const isCollapsed = isLgScreen ? isManuallyCollapsed : true;

  const toggleCollapse = useCallback(() => {
    setIsManuallyCollapsed(prev => {
      const newValue = !prev;
      localStorage.setItem("client-sidebar-collapsed", String(newValue));
      return newValue;
    });
  }, []);

  const mainNavItems: NavItem[] = [
    { href: "/client", icon: <Home className="w-5 h-5" />, label: "Accueil" },
    { href: "/recherche", icon: <Search className="w-5 h-5" />, label: "Rechercher" },
    { href: "/client/messagerie", icon: <MessageCircle className="w-5 h-5" />, label: "Messages" },
    { href: "/client/notifications", icon: <Bell className="w-5 h-5" />, label: "Notifications" },
  ];

  const accountNavItems: NavItem[] = [
    { href: "/client/profil", icon: <User className="w-5 h-5" />, label: "Mon profil" },
    { href: "/client/mes-animaux", icon: <PawPrint className="w-5 h-5" />, label: "Mes animaux" },
    { href: "/client/reservations", icon: <Calendar className="w-5 h-5" />, label: "Réservations" },
    { href: "/client/parametres", icon: <Settings className="w-5 h-5" />, label: "Paramètres" },
  ];

  const handleLogout = async () => {
    await logout();
  };

  const sidebarWidth = isCollapsed ? 72 : 260;

  return (
    <div className="hidden md:block fixed left-4 top-24 bottom-6 z-40">
      {/* Toggle Button - EN DEHORS de la sidebar pour éviter overflow hidden */}
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
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/25 shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <p className="font-semibold text-slate-800 text-sm whitespace-nowrap">Mon espace</p>
                  <p className="text-xs text-slate-400 whitespace-nowrap">Client</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation */}
        <nav className={cn(
          "flex-1 py-4 space-y-6 overflow-y-auto overflow-x-hidden scrollbar-hide",
          isCollapsed ? "px-2" : "px-3"
        )}>
          <NavSection
            title="Navigation"
            items={mainNavItems}
            currentPath={pathname}
            isCollapsed={isCollapsed}
          />

          <NavSection
            title="Mon compte"
            items={accountNavItems}
            currentPath={pathname}
            isCollapsed={isCollapsed}
          />
        </nav>

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
