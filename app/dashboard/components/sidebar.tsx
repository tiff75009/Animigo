"use client";

import { cn } from "@/app/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { getUnreadMessagesCount, mockUserProfile } from "@/app/lib/dashboard-data";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/dashboard/planning", label: "Planning", icon: Calendar },
  { href: "/dashboard/messagerie", label: "Messagerie", icon: MessageSquare },
];

const missionNavItems: NavItem[] = [
  { href: "/dashboard/missions/accepter", label: "À accepter", icon: HelpCircle },
  { href: "/dashboard/missions/confirmation", label: "En attente", icon: Clock },
  { href: "/dashboard/missions/en-cours", label: "En cours", icon: CalendarClock },
  { href: "/dashboard/missions/a-venir", label: "À venir", icon: Calendar },
  { href: "/dashboard/missions/terminees", label: "Terminées", icon: CheckCircle },
  { href: "/dashboard/missions/refusees", label: "Refusées", icon: XCircle },
  { href: "/dashboard/missions/annulees", label: "Annulées", icon: Ban },
];

const accountNavItems: NavItem[] = [
  { href: "/dashboard/profil", label: "Ma fiche", icon: User },
  { href: "/dashboard/avis", label: "Mes avis", icon: Star },
  { href: "/dashboard/paiements", label: "Paiements", icon: CreditCard },
  { href: "/dashboard/parametres", label: "Paramètres", icon: Settings },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const unreadCount = getUnreadMessagesCount();

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href;
    const badge = item.label === "Messagerie" ? unreadCount : item.badge;

    return (
      <Link href={item.href} onClick={() => setIsMobileOpen(false)}>
        <motion.div
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors relative",
            isActive
              ? "bg-primary text-white shadow-lg shadow-primary/30"
              : "text-foreground/70 hover:bg-primary/10 hover:text-primary"
          )}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
        >
          <item.icon className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1">{item.label}</span>
          {badge && badge > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold bg-accent text-foreground rounded-full">
              {badge}
            </span>
          )}
        </motion.div>
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-foreground/10">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
            <span className="text-xl">🐾</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold text-foreground leading-tight">
              Anim<span className="text-primary">igo</span>
            </span>
            <span className="text-[10px] text-text-light font-medium -mt-1">
              Espace garde
            </span>
          </div>
        </Link>
      </div>

      {/* User info */}
      <div className="p-4 border-b border-foreground/10">
        <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-2xl">
            {mockUserProfile.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{mockUserProfile.firstName} {mockUserProfile.lastName}</p>
            <p className="text-xs text-text-light flex items-center gap-1">
              {mockUserProfile.verified && <CheckCircle className="w-3 h-3 text-secondary" />}
              Garde vérifié
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Main */}
        <div>
          <p className="px-4 text-xs font-semibold text-text-light uppercase tracking-wider mb-2">
            Principal
          </p>
          <div className="space-y-1">
            {mainNavItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>

        {/* Missions */}
        <div>
          <p className="px-4 text-xs font-semibold text-text-light uppercase tracking-wider mb-2">
            Missions
          </p>
          <div className="space-y-1">
            {missionNavItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>

        {/* Account */}
        <div>
          <p className="px-4 text-xs font-semibold text-text-light uppercase tracking-wider mb-2">
            Compte
          </p>
          <div className="space-y-1">
            {accountNavItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-foreground/10">
        <motion.button
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium text-red-500 hover:bg-red-50 transition-colors"
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
        >
          <LogOut className="w-5 h-5" />
          <span>Déconnexion</span>
        </motion.button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <motion.button
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-white rounded-xl shadow-lg"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        whileTap={{ scale: 0.95 }}
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </motion.button>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col w-72 bg-white border-r border-foreground/10 h-screen sticky top-0",
          className
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsMobileOpen(false)}
            />
            {/* Sidebar */}
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-white z-50 shadow-2xl"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
