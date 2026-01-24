"use client";

import { cn } from "@/app/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
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
  Briefcase,
  ChevronDown,
  ClipboardList,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { useState, memo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getUnreadMessagesCount } from "@/app/lib/dashboard-data";
import { useAuth } from "@/app/hooks/useAuth";

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
  { href: "/dashboard/services", label: "Mes services", icon: Briefcase },
  { href: "/dashboard/avis", label: "Mes avis", icon: Star },
  { href: "/dashboard/paiements", label: "Paiements", icon: CreditCard },
  { href: "/dashboard/parametres", label: "Paramètres", icon: Settings },
];

// Composant NavLink mémorisé et sorti du composant principal
const NavLink = memo(function NavLink({
  item,
  isActive,
  badge,
  onClose
}: {
  item: NavItem;
  isActive: boolean;
  badge?: number;
  onClose: () => void;
}) {
  return (
    <Link href={item.href} scroll={false} onClick={onClose}>
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
});

// Skeleton pour le chargement
const UserInfoSkeleton = memo(function UserInfoSkeleton() {
  return (
    <div className="p-4 border-b border-foreground/10">
      <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl animate-pulse">
        <div className="w-12 h-12 bg-foreground/10 rounded-full" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 bg-foreground/10 rounded w-24" />
          <div className="h-3 bg-foreground/10 rounded w-16" />
        </div>
      </div>
    </div>
  );
});

// Composant UserInfo séparé
const UserInfo = memo(function UserInfo({
  user,
  isLoading,
  isIdentityVerified,
}: {
  user: { firstName: string; lastName: string; profileImage?: string | null; verified: boolean } | null;
  isLoading: boolean;
  isIdentityVerified?: boolean;
}) {
  // Afficher skeleton pendant le chargement
  if (isLoading || !user) {
    return <UserInfoSkeleton />;
  }

  return (
    <div className="p-4 border-b border-foreground/10">
      <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl">
        <div className="relative w-12 h-12 rounded-xl overflow-hidden ring-2 ring-white shadow-md bg-gray-100 flex-shrink-0">
          {user.profileImage ? (
            <Image
              src={user.profileImage}
              alt={`${user.firstName} ${user.lastName}`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
              <User className="w-6 h-6 text-gray-400" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{user.firstName} {user.lastName}</p>
          <p className="text-xs text-text-light flex items-center gap-1">
            {isIdentityVerified ? (
              <>
                <ShieldCheck className="w-3 h-3 text-secondary" />
                <span className="text-secondary">Identité vérifiée</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 text-amber-500" />
                <span className="text-amber-600">Non vérifié</span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
});

// Composant NavSection séparé
const NavSection = memo(function NavSection({
  title,
  items,
  pathname,
  unreadCount,
  onClose,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  unreadCount?: number;
  onClose: () => void;
}) {
  return (
    <div>
      <p className="px-4 text-xs font-semibold text-text-light uppercase tracking-wider mb-2">
        {title}
      </p>
      <div className="space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={pathname === item.href}
            badge={item.label === "Messagerie" ? unreadCount : item.badge}
            onClose={onClose}
          />
        ))}
      </div>
    </div>
  );
});

// Composant CollapsibleNavSection pour menu déroulant
const CollapsibleNavSection = memo(function CollapsibleNavSection({
  title,
  icon: Icon,
  items,
  pathname,
  onClose,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ElementType;
  items: NavItem[];
  pathname: string;
  onClose: () => void;
  defaultOpen?: boolean;
}) {
  // Ouvrir automatiquement si un des items est actif
  const hasActiveItem = items.some(item => pathname === item.href || pathname.startsWith(item.href + "/"));
  const [isOpen, setIsOpen] = useState(defaultOpen || hasActiveItem);

  // Compter les items actifs pour le badge
  const activeCount = items.filter(item => pathname === item.href).length;

  return (
    <div>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium transition-colors",
          hasActiveItem
            ? "bg-primary/10 text-primary"
            : "text-foreground/70 hover:bg-primary/10 hover:text-primary"
        )}
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
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
            <div className="pl-4 mt-1 space-y-1">
              {items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href}
                  onClose={onClose}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// Logo séparé
const Logo = memo(function Logo() {
  return (
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
  );
});

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const unreadCount = getUnreadMessagesCount();
  const { user, token, logout, isLoading } = useAuth();

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

  const closeMobile = () => setIsMobileOpen(false);

  // Données utilisateur pour l'affichage (null si en chargement)
  const displayUser = user
    ? {
        firstName: user.firstName,
        lastName: user.lastName,
        profileImage: profileData?.profile?.profileImageUrl || null,
        verified: user.accountType === "annonceur_pro",
      }
    : null;

  const isIdentityVerified = verificationStatus?.isIdentityVerified || false;
  const hasPendingRequest = verificationStatus?.latestRequest?.status === "submitted";

  const handleLogout = () => {
    closeMobile();
    logout();
  };

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
          "hidden lg:flex flex-col w-72 bg-white border-r border-foreground/10 h-screen flex-shrink-0",
          className
        )}
      >
        <div className="flex flex-col h-full">
          <Logo />
          <UserInfo user={displayUser} isLoading={isLoading} isIdentityVerified={isIdentityVerified} />

          {/* Bouton vérification si non vérifié */}
          {!isIdentityVerified && !isLoading && (
            <div className="px-4 pb-2">
              <Link href="/dashboard/verification" onClick={closeMobile}>
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
                        <p className="text-sm font-medium text-blue-700">En cours de vérification</p>
                        <p className="text-xs text-blue-600">Votre demande est en attente</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5 text-amber-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-amber-700">Vérifier mon profil</p>
                        <p className="text-xs text-amber-600">Gagnez en confiance</p>
                      </div>
                    </>
                  )}
                </motion.div>
              </Link>
            </div>
          )}

          <nav className="flex-1 overflow-y-auto p-4 space-y-4">
            <NavSection
              title="Principal"
              items={mainNavItems}
              pathname={pathname}
              unreadCount={unreadCount}
              onClose={closeMobile}
            />
            <CollapsibleNavSection
              title="Missions"
              icon={ClipboardList}
              items={missionNavItems}
              pathname={pathname}
              onClose={closeMobile}
            />
            <NavSection
              title="Compte"
              items={accountNavItems}
              pathname={pathname}
              onClose={closeMobile}
            />
          </nav>

          <div className="p-4 border-t border-foreground/10">
            <motion.button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium text-red-500 hover:bg-red-50 transition-colors"
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <LogOut className="w-5 h-5" />
              <span>Déconnexion</span>
            </motion.button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={closeMobile}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-white z-50 shadow-2xl"
            >
              <div className="flex flex-col h-full">
                <Logo />
                <UserInfo user={displayUser} isLoading={isLoading} isIdentityVerified={isIdentityVerified} />

                {/* Bouton vérification si non vérifié (mobile) */}
                {!isIdentityVerified && !isLoading && (
                  <div className="px-4 pb-2">
                    <Link href="/dashboard/verification" onClick={closeMobile}>
                      <motion.div
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl transition-colors",
                          hasPendingRequest
                            ? "bg-blue-50 border border-blue-200"
                            : "bg-amber-50 border border-amber-200"
                        )}
                        whileTap={{ scale: 0.98 }}
                      >
                        {hasPendingRequest ? (
                          <>
                            <Clock className="w-5 h-5 text-blue-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-blue-700">En cours de vérification</p>
                              <p className="text-xs text-blue-600">Votre demande est en attente</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-5 h-5 text-amber-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-amber-700">Vérifier mon profil</p>
                              <p className="text-xs text-amber-600">Gagnez en confiance</p>
                            </div>
                          </>
                        )}
                      </motion.div>
                    </Link>
                  </div>
                )}

                <nav className="flex-1 overflow-y-auto p-4 space-y-4">
                  <NavSection
                    title="Principal"
                    items={mainNavItems}
                    pathname={pathname}
                    unreadCount={unreadCount}
                    onClose={closeMobile}
                  />
                  <CollapsibleNavSection
                    title="Missions"
                    icon={ClipboardList}
                    items={missionNavItems}
                    pathname={pathname}
                    onClose={closeMobile}
                  />
                  <NavSection
                    title="Compte"
                    items={accountNavItems}
                    pathname={pathname}
                    onClose={closeMobile}
                  />
                </nav>

                <div className="p-4 border-t border-foreground/10">
                  <motion.button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium text-red-500 hover:bg-red-50 transition-colors"
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Déconnexion</span>
                  </motion.button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
