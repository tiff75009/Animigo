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
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useAuth } from "@/app/hooks/useAuth";

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
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
        whileHover={{ x: isCollapsed ? 0 : 4 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "flex items-center gap-3 rounded-xl transition-all duration-200",
          isCollapsed ? "px-3 py-3 justify-center" : "px-4 py-3",
          isActive
            ? "bg-primary text-white shadow-md shadow-primary/25"
            : "text-gray-600 hover:bg-gray-100"
        )}
        title={isCollapsed ? item.label : undefined}
      >
        <span className="shrink-0">{item.icon}</span>
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
        {!isCollapsed ? (
          <motion.p
            key="title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2"
          >
            {title}
          </motion.p>
        ) : (
          <motion.div
            key="divider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-px bg-gray-100 mx-3 mb-2"
          />
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

interface LogoProps {
  isCollapsed: boolean;
}

const Logo = memo(function Logo({ isCollapsed }: LogoProps) {
  return (
    <Link href="/" className={cn(
      "flex items-center gap-3 py-2",
      isCollapsed ? "px-0 justify-center" : "px-4"
    )}>
      <motion.div
        className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/25 shrink-0"
        whileHover={{ scale: 1.05, rotate: -3 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        <span className="text-xl">🐾</span>
      </motion.div>
      <AnimatePresence mode="wait">
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="text-xl font-extrabold text-foreground whitespace-nowrap overflow-hidden"
          >
            Anim<span className="text-primary">igo</span>
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
});

// Hook pour détecter la taille d'écran avec valeur initiale côté client
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

  // Retourner la vraie valeur seulement après le montage
  return mounted ? matches : defaultValue;
}

export default function ClientSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  // État de la sidebar (collapsed ou non)
  const [isManuallyCollapsed, setIsManuallyCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Breakpoints ajustés :
  // - md (768px+) : sidebar visible
  // - lg (1024px+) : sidebar étendue par défaut
  const isMdScreen = useMediaQuery("(min-width: 768px)", true);
  const isLgScreen = useMediaQuery("(min-width: 1024px)", true);

  // Monter le composant
  useEffect(() => {
    setMounted(true);
  }, []);

  // Charger l'état depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) {
      setIsManuallyCollapsed(saved === "true");
    }
  }, []);

  // Logique de collapse :
  // - Sur md à lg : toujours collapsed (icônes seules)
  // - Sur lg+ : utilise l'état manuel (par défaut étendue)
  const isCollapsed = isLgScreen ? isManuallyCollapsed : true;

  // Sauvegarder l'état dans localStorage
  const toggleCollapse = useCallback(() => {
    setIsManuallyCollapsed(prev => {
      const newValue = !prev;
      localStorage.setItem("sidebar-collapsed", String(newValue));
      // Dispatch un event custom pour synchroniser avec le header (après le rendu)
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("sidebar-toggle", { detail: newValue }));
      }, 0);
      return newValue;
    });
  }, []);

  const mainNavItems: NavItem[] = [
    { href: "/client", icon: <Home className="w-5 h-5" />, label: "Accueil" },
    { href: "/recherche", icon: <Search className="w-5 h-5" />, label: "Rechercher" },
    { href: "/client/messagerie", icon: <MessageCircle className="w-5 h-5" />, label: "Messagerie" },
  ];

  const accountNavItems: NavItem[] = [
    { href: "/client/profil", icon: <User className="w-5 h-5" />, label: "Mon profil" },
    { href: "/client/mes-animaux", icon: <PawPrint className="w-5 h-5" />, label: "Mes animaux" },
    { href: "/client/reservations", icon: <Calendar className="w-5 h-5" />, label: "Mes réservations" },
    { href: "/client/parametres", icon: <Settings className="w-5 h-5" />, label: "Paramètres" },
  ];

  const handleLogout = async () => {
    await logout();
  };

  // Calculer la largeur pour éviter le flash
  const sidebarWidth = isCollapsed ? 80 : 288;

  return (
    <div className="hidden md:block relative h-screen sticky top-0">
      {/* Toggle Button - visible sur lg+ - EN DEHORS de la sidebar pour éviter overflow-hidden */}
      {isLgScreen && (
        <motion.button
          onClick={toggleCollapse}
          initial={{ opacity: 0, x: -10 }}
          animate={{
            opacity: 1,
            x: 0,
            left: sidebarWidth - 14
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="absolute top-20 z-20 w-7 h-7 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center text-gray-400 hover:text-primary hover:border-primary hover:shadow-xl transition-all group"
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          title={isCollapsed ? "Étendre la sidebar" : "Réduire la sidebar"}
          style={{ left: sidebarWidth - 14 }}
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.div>
        </motion.button>
      )}

      <motion.aside
        initial={false}
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex flex-col bg-white border-r border-gray-100 h-full overflow-hidden"
        style={{ width: mounted ? undefined : sidebarWidth }}
      >

      {/* Logo */}
      <div className={cn(
        "p-4 border-b border-gray-100",
        isCollapsed && "px-2"
      )}>
        <Logo isCollapsed={isCollapsed} />
      </div>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 py-6 space-y-6 overflow-y-auto overflow-x-hidden",
        isCollapsed ? "px-2" : "px-3"
      )}>
        <NavSection
          title="Principal"
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
        "p-4 border-t border-gray-100",
        isCollapsed && "px-2"
      )}>
        <motion.button
          whileHover={{ x: isCollapsed ? 0 : 4 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors w-full",
            isCollapsed ? "px-3 py-3 justify-center" : "px-4 py-3"
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
                className="font-medium whitespace-nowrap overflow-hidden"
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
