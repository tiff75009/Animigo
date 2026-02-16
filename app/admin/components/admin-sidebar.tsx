"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { cn } from "@/app/lib/utils";
import {
  LayoutDashboard, Users, Briefcase, Settings, Plug, LogOut, Shield,
  Tag, ShieldAlert, FileCheck, Code, Circle, UserPlus, Percent, Mail,
  CalendarCheck, Sparkles, FlaskConical, ShieldCheck, Wallet, Landmark,
  FileText, MapPin, Globe, Layers, ListChecks, Ticket, HelpCircle,
  AlertTriangle, CreditCard, Wrench, Menu, X, ChevronDown, ExternalLink,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavSection {
  title: string;
  accent: string;
  items: NavItem[];
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, token, logout } = useAdminAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["Général"]));

  const moderationStats = useQuery(api.admin.moderation.getModerationStats, token ? { token } : "skip");
  const onlineDevs = useQuery(api.admin.devPresence.getOnlineDevs, token ? { token } : "skip");
  const pendingVerifications = useQuery(api.verification.verification.countPendingVerifications, token ? { sessionToken: token } : "skip");
  const reservationsNeedingAction = useQuery(api.admin.reservations.getReservationsNeedingAction, token ? { token } : "skip");
  const openDisputes = useQuery(api.admin.disputes.getOpenDisputesCount, token ? { token } : "skip");
  const openTickets = useQuery(api.admin.support.getOpenTicketsCount, token ? { token } : "skip");
  const pendingSapDeclarations = useQuery(api.sap.declarations.countPendingSapDeclarations, token ? { sessionToken: token } : "skip");

  const navSections: NavSection[] = useMemo(() => [
    {
      title: "Général", accent: "blue",
      items: [
        { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { label: "Finances", href: "/admin/finances", icon: Wallet },
      ],
    },
    {
      title: "Modération", accent: "amber",
      items: [
        { label: "Services en attente", href: "/admin/moderation/services", icon: ShieldAlert, badge: moderationStats?.pending || 0 },
        { label: "Vérifications", href: "/admin/verifications", icon: ShieldCheck, badge: pendingVerifications || 0 },
        { label: "Réservations", href: "/admin/reservations", icon: CalendarCheck, badge: reservationsNeedingAction || 0 },
        { label: "Déclarations SAP", href: "/admin/sap", icon: FileCheck, badge: pendingSapDeclarations || 0 },
        { label: "Réclamations", href: "/admin/reclamations", icon: AlertTriangle, badge: openDisputes || 0 },
      ],
    },
    {
      title: "Utilisateurs", accent: "violet",
      items: [
        { label: "Utilisateurs", href: "/admin/utilisateurs", icon: Users },
        { label: "Annonceurs", href: "/admin/annonceurs", icon: Briefcase },
      ],
    },
    {
      title: "Services", accent: "emerald",
      items: [
        { label: "Catégories", href: "/admin/services/categories", icon: Tag },
        { label: "Prestations", href: "/admin/services/prestations", icon: ListChecks },
        { label: "Types", href: "/admin/services/types", icon: Layers },
        { label: "Activités", href: "/admin/activites", icon: Sparkles },
      ],
    },
    {
      title: "SEO", accent: "cyan",
      items: [
        { label: "Pages services", href: "/admin/seo/services", icon: FileText },
        { label: "Villes", href: "/admin/seo/villes", icon: MapPin },
        { label: "Pages villes", href: "/admin/seo/pages-villes", icon: Globe },
      ],
    },
    {
      title: "Paiements", accent: "rose",
      items: [
        { label: "Commissions", href: "/admin/commissions", icon: Percent },
        { label: "Paiements & Délais", href: "/admin/paiements", icon: CreditCard },
        { label: "Comptes Connect", href: "/admin/stripe-connect", icon: Landmark },
      ],
    },
    {
      title: "Support", accent: "orange",
      items: [
        { label: "Tickets", href: "/admin/support", icon: Ticket, badge: openTickets || 0 },
        { label: "FAQ", href: "/admin/faq", icon: HelpCircle },
      ],
    },
    {
      title: "Configuration", accent: "gray",
      items: [
        { label: "Paramètres", href: "/admin/parametres", icon: Settings },
        { label: "Templates Email", href: "/admin/templates-email", icon: Mail },
        { label: "Pages légales", href: "/admin/legal", icon: FileText },
      ],
    },
    {
      title: "Développement", accent: "lime",
      items: [
        { label: "Clés développeur", href: "/admin/dev-keys", icon: Code },
        { label: "Intégrations API", href: "/admin/integrations", icon: Plug },
        { label: "Invitations Admin", href: "/admin/invitations", icon: UserPlus },
        { label: "Maintenance", href: "/admin/maintenance", icon: Wrench },
        { label: "Dev Test", href: "/admin/dev-test", icon: FlaskConical },
      ],
    },
  ], [moderationStats, pendingVerifications, reservationsNeedingAction, pendingSapDeclarations, openDisputes, openTickets]);

  const isItemActive = useCallback((href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }, [pathname]);

  useEffect(() => {
    for (const section of navSections) {
      if (section.items.some((item) => isItemActive(item.href))) {
        setOpenSections((prev) => new Set(prev).add(section.title));
        break;
      }
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const toggleSection = useCallback((title: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title); else next.add(title);
      return next;
    });
  }, []);

  const totalBadges = useMemo(() =>
    navSections.reduce((sum, s) => sum + s.items.reduce((a, i) => a + (i.badge || 0), 0), 0),
  [navSections]);

  // Style d'accent pour l'active state
  const activeStyle = (accent: string) => {
    const styles: Record<string, string> = {
      blue: "bg-blue-500/20 text-blue-300",
      amber: "bg-amber-500/20 text-amber-300",
      violet: "bg-violet-500/20 text-violet-300",
      emerald: "bg-emerald-500/20 text-emerald-300",
      cyan: "bg-cyan-500/20 text-cyan-300",
      rose: "bg-rose-500/20 text-rose-300",
      orange: "bg-orange-500/20 text-orange-300",
      gray: "bg-slate-700/50 text-white",
      lime: "bg-lime-500/20 text-lime-300",
    };
    return styles[accent] || styles.blue;
  };

  const dotColor = (accent: string) => {
    const styles: Record<string, string> = {
      blue: "bg-blue-400", amber: "bg-amber-400", violet: "bg-violet-400",
      emerald: "bg-emerald-400", cyan: "bg-cyan-400", rose: "bg-rose-400",
      orange: "bg-orange-400", gray: "bg-slate-400", lime: "bg-lime-400",
    };
    return styles[accent] || styles.blue;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header : Logo + User fusionnés */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            {user ? (
              <>
                <p className="text-[13px] font-bold text-white truncate">{user.firstName} {user.lastName}</p>
                <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
              </>
            ) : (
              <>
                <h1 className="text-[15px] font-bold text-white">Animigo</h1>
                <p className="text-[11px] text-slate-500">Administration</p>
              </>
            )}
          </div>
        </div>

        {/* Bouton retour au site */}
        <Link
          href="/"
          className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all text-[12px] font-medium"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Retour au site
        </Link>
      </div>

      {/* Séparateur */}
      <div className="mx-4 h-px bg-slate-800" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {navSections.map((section) => {
          const isOpen = openSections.has(section.title);
          const hasActive = section.items.some((i) => isItemActive(i.href));
          const badgeCount = section.items.reduce((a, i) => a + (i.badge || 0), 0);

          return (
            <div key={section.title} className="mb-0.5">
              <button
                type="button"
                onClick={() => toggleSection(section.title)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium tracking-wide transition-all duration-200 group",
                  hasActive ? "text-slate-300" : "text-slate-500 hover:text-slate-400 hover:bg-slate-800/50"
                )}
              >
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-300",
                  dotColor(section.accent),
                  hasActive ? "opacity-100 shadow-sm" : "opacity-30 group-hover:opacity-50"
                )} style={hasActive ? { boxShadow: `0 0 6px var(--tw-shadow-color, rgba(255,255,255,0.2))` } : {}} />
                <span className="flex-1 text-left uppercase tracking-widest">{section.title}</span>
                {badgeCount > 0 && (
                  <span className="min-w-[20px] h-[18px] px-1 text-[10px] font-bold bg-red-500 text-white rounded-md flex items-center justify-center">
                    {badgeCount}
                  </span>
                )}
                <ChevronDown className={cn(
                  "w-3 h-3 transition-transform duration-300 ease-out",
                  isOpen ? "rotate-0 text-slate-600" : "-rotate-90 text-slate-700"
                )} />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ height: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }, opacity: { duration: 0.2 } }}
                    className="overflow-hidden"
                  >
                    <div className="py-1 px-1 space-y-0.5">
                      {section.items.map((item) => {
                        const active = isItemActive(item.href);
                        return (
                          <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                            <div className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 cursor-pointer",
                              active
                                ? activeStyle(section.accent)
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/70"
                            )}>
                              <item.icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                              <span className="flex-1 truncate">{item.label}</span>
                              {item.badge !== undefined && item.badge > 0 && (
                                <span className={cn(
                                  "min-w-[22px] h-[20px] px-1.5 text-[10px] font-bold rounded-lg flex items-center justify-center",
                                  active ? "bg-slate-800 text-current" : "bg-red-500/80 text-white"
                                )}>
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Dev en ligne */}
      {onlineDevs && onlineDevs.length > 0 && (
        <div className="px-4 pb-2">
          <Link href="/admin/dev-keys">
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/10 hover:bg-emerald-500/[0.14] transition-all">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-[12px] font-semibold text-emerald-400">
                {onlineDevs.length} dev{onlineDevs.length > 1 ? "s" : ""} en ligne
              </span>
            </div>
          </Link>
        </div>
      )}

      {/* Déconnexion */}
      <div className="px-4 pb-4">
        <div className="h-px bg-slate-800 mb-3" />
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/[0.08] transition-all text-[13px] font-medium"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Hamburger mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-[60] p-2.5 rounded-xl text-white shadow-xl bg-slate-900 border border-slate-700 hover:border-slate-600 transition-all"
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-5 h-5" />
        {totalBadges > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 text-[9px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-500/40">
            {totalBadges > 99 ? "99+" : totalBadges}
          </span>
        )}
      </button>

      {/* Desktop */}
      <aside className="hidden lg:block w-[260px] flex-shrink-0 border-r border-slate-800">
        {sidebarContent}
      </aside>

      {/* Mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 z-[70]"
              style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className="lg:hidden fixed inset-y-0 left-0 w-[280px] z-[80] shadow-2xl shadow-black/50"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-3 z-10 p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-all"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
