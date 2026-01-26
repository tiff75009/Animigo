"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Settings,
  Plug,
  LogOut,
  Shield,
  Tag,
  ShieldAlert,
  FileCheck,
  Code,
  Circle,
  UserPlus,
  Percent,
  Mail,
  CalendarCheck,
  Sparkles,
  FlaskConical,
  ShieldCheck,
  Wallet,
  FileText,
  MapPin,
  Globe,
  Layers,
  ListChecks,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, token, logout } = useAdminAuth();

  // Récupérer les stats de modération pour le badge
  const moderationStats = useQuery(
    api.admin.moderation.getModerationStats,
    token ? { token } : "skip"
  );

  // Récupérer les développeurs en ligne
  const onlineDevs = useQuery(
    api.admin.devPresence.getOnlineDevs,
    token ? { token } : "skip"
  );

  // Récupérer les vérifications en attente
  const pendingVerifications = useQuery(
    api.verification.verification.countPendingVerifications,
    token ? { sessionToken: token } : "skip"
  );

  const navSections: NavSection[] = [
    {
      title: "Général",
      items: [
        {
          label: "Dashboard",
          href: "/admin",
          icon: LayoutDashboard,
        },
        {
          label: "Finances",
          href: "/admin/finances",
          icon: Wallet,
        },
      ],
    },
    {
      title: "Modération",
      items: [
        {
          label: "Services en attente",
          href: "/admin/moderation/services",
          icon: ShieldAlert,
          badge: moderationStats?.pending || 0,
        },
        {
          label: "Vérifications",
          href: "/admin/verifications",
          icon: ShieldCheck,
          badge: pendingVerifications || 0,
        },
        {
          label: "Réservations",
          href: "/admin/reservations",
          icon: CalendarCheck,
        },
      ],
    },
    {
      title: "Utilisateurs",
      items: [
        {
          label: "Tous les utilisateurs",
          href: "/admin/utilisateurs",
          icon: Users,
        },
        {
          label: "Annonceurs",
          href: "/admin/annonceurs",
          icon: Briefcase,
        },
      ],
    },
    {
      title: "Services",
      items: [
        {
          label: "Catégories",
          href: "/admin/services/categories",
          icon: Tag,
        },
        {
          label: "Prestations",
          href: "/admin/services/prestations",
          icon: ListChecks,
        },
        {
          label: "Types",
          href: "/admin/services/types",
          icon: Layers,
        },
        {
          label: "Activités",
          href: "/admin/activites",
          icon: Sparkles,
        },
      ],
    },
    {
      title: "SEO",
      items: [
        {
          label: "Pages services",
          href: "/admin/seo/services",
          icon: FileText,
        },
        {
          label: "Villes",
          href: "/admin/seo/villes",
          icon: MapPin,
        },
        {
          label: "Pages villes",
          href: "/admin/seo/pages-villes",
          icon: Globe,
        },
      ],
    },
    {
      title: "Configuration",
      items: [
        {
          label: "Commissions",
          href: "/admin/commissions",
          icon: Percent,
        },
        {
          label: "Templates Email",
          href: "/admin/templates-email",
          icon: Mail,
        },
        {
          label: "Pages légales",
          href: "/admin/legal",
          icon: FileText,
        },
        {
          label: "Invitations Admin",
          href: "/admin/invitations",
          icon: UserPlus,
        },
        {
          label: "Clés développeur",
          href: "/admin/dev-keys",
          icon: Code,
        },
        {
          label: "Intégrations API",
          href: "/admin/integrations",
          icon: Plug,
        },
        {
          label: "Paramètres",
          href: "/admin/parametres",
          icon: Settings,
        },
        {
          label: "Dev Test",
          href: "/admin/dev-test",
          icon: FlaskConical,
        },
      ],
    },
  ];

  const isItemActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Animigo</h1>
            <p className="text-xs text-slate-400">Administration</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = isItemActive(item.href);

                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium text-sm flex-1">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Indicateur développeurs en ligne */}
      {onlineDevs && onlineDevs.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-800">
          <Link href="/admin/dev-keys">
            <div className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
              <Circle className="w-2 h-2 fill-emerald-400 animate-pulse" />
              <span>
                {onlineDevs.length} dev{onlineDevs.length > 1 ? "s" : ""} en ligne
              </span>
            </div>
          </Link>
        </div>
      )}

      {/* User info + Logout */}
      <div className="p-4 border-t border-slate-800">
        {user && (
          <div className="mb-4 px-4">
            <p className="text-sm font-medium text-white">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
        )}
        <motion.button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Déconnexion</span>
        </motion.button>
      </div>
    </aside>
  );
}
