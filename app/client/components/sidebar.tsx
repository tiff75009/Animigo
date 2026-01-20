"use client";

import { useState, memo, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  MessageCircle,
  PawPrint,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Calendar,
  Heart,
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
  onClick?: () => void;
}

const NavLink = memo(function NavLink({ item, isActive, onClick }: NavLinkProps) {
  return (
    <Link href={item.href} onClick={onClick}>
      <motion.div
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
          isActive
            ? "bg-primary text-white shadow-md shadow-primary/25"
            : "text-gray-600 hover:bg-gray-100"
        )}
      >
        {item.icon}
        <span className="font-medium">{item.label}</span>
      </motion.div>
    </Link>
  );
});

interface NavSectionProps {
  title: string;
  items: NavItem[];
  currentPath: string;
  onItemClick?: () => void;
}

const NavSection = memo(function NavSection({
  title,
  items,
  currentPath,
  onItemClick,
}: NavSectionProps) {
  return (
    <div className="space-y-1">
      <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        {title}
      </p>
      {items.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          isActive={currentPath === item.href}
          onClick={onItemClick}
        />
      ))}
    </div>
  );
});

const Logo = memo(function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3 px-4 py-2">
      <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
        <span className="text-xl">🐾</span>
      </div>
      <span className="text-xl font-extrabold text-foreground">
        Anim<span className="text-primary">igo</span>
      </span>
    </Link>
  );
});

interface UserInfoProps {
  user: { firstName: string; lastName: string; email: string } | null;
  isLoading: boolean;
}

const UserInfo = memo(function UserInfo({ user, isLoading }: UserInfoProps) {
  if (isLoading) {
    return (
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
          <div className="flex-1">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 border-b border-gray-100">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-secondary/70 flex items-center justify-center text-white font-bold text-lg shadow-md">
          {user?.firstName?.charAt(0) || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">
            {user?.firstName} {user?.lastName?.charAt(0)}.
          </p>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Heart className="w-3 h-3 text-primary" />
            Propriétaire
          </p>
        </div>
      </div>
    </div>
  );
});

export default function ClientSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();

  const closeSidebar = useCallback(() => setIsOpen(false), []);

  const mainNavItems: NavItem[] = [
    { href: "/client", icon: <Home className="w-5 h-5" />, label: "Accueil" },
    { href: "/recherche", icon: <Search className="w-5 h-5" />, label: "Rechercher" },
    { href: "/client/messagerie", icon: <MessageCircle className="w-5 h-5" />, label: "Messagerie" },
  ];

  const accountNavItems: NavItem[] = [
    { href: "/client/mes-animaux", icon: <PawPrint className="w-5 h-5" />, label: "Mes animaux" },
    { href: "/client/reservations", icon: <Calendar className="w-5 h-5" />, label: "Mes réservations" },
    { href: "/client/parametres", icon: <Settings className="w-5 h-5" />, label: "Paramètres" },
  ];

  const handleLogout = async () => {
    await logout();
  };

  const SidebarContent = (
    <>
      <div className="p-4 border-b border-gray-100">
        <Logo />
      </div>

      <UserInfo user={user} isLoading={isLoading} />

      <nav className="flex-1 px-3 py-6 space-y-6 overflow-y-auto">
        <NavSection
          title="Principal"
          items={mainNavItems}
          currentPath={pathname}
          onItemClick={closeSidebar}
        />

        <NavSection
          title="Mon compte"
          items={accountNavItems}
          currentPath={pathname}
          onItemClick={closeSidebar}
        />
      </nav>

      <div className="p-4 border-t border-gray-100">
        <motion.button
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Déconnexion</span>
        </motion.button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-lg"
      >
        <Menu className="w-6 h-6 text-foreground" />
      </button>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 bg-white border-r border-gray-100 h-screen sticky top-0">
        {SidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSidebar}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-white z-50 flex flex-col shadow-2xl"
            >
              <button
                onClick={closeSidebar}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
