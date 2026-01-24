"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  BadgeCheck,
  Briefcase,
  ShoppingBag,
  Wallet,
  MessageSquare,
  ExternalLink,
  MoreHorizontal,
  UserCheck,
  UserX,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Components des onglets
import { OverviewTab } from "./components/OverviewTab";
import { ServicesTab } from "./components/ServicesTab";
import { SalesTab } from "./components/SalesTab";
import { FinancesTab } from "./components/FinancesTab";
import { MessagesTab } from "./components/MessagesTab";

type Tab = "overview" | "services" | "sales" | "finances" | "messages";

const TABS = [
  { id: "overview" as Tab, label: "Aperçu", icon: User },
  { id: "services" as Tab, label: "Services", icon: Briefcase },
  { id: "sales" as Tab, label: "Ventes", icon: ShoppingBag },
  { id: "finances" as Tab, label: "Finances", icon: Wallet },
  { id: "messages" as Tab, label: "Messages", icon: MessageSquare },
];

export default function AnnouncerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const announcerId = params.id as Id<"users">;

  // Détails de l'annonceur
  const announcerDetails = useQuery(
    api.admin.announcers.getAnnouncerDetails,
    token ? { token, announcerId } : "skip"
  );

  // Toggle active
  const toggleActive = useMutation(api.admin.users.toggleUserActive);

  const handleToggleActive = async () => {
    if (!token || !announcerDetails) return;
    try {
      await toggleActive({ token, userId: announcerId });
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  if (!announcerDetails) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const { user, profile, stats, verification, stripeAccount } = announcerDetails;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/annonceurs"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux annonceurs
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center">
              {profile?.profileImageUrl ? (
                <img
                  src={profile.profileImageUrl}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-slate-500" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">
                  {user.firstName} {user.lastName}
                </h1>
                {profile?.isIdentityVerified && (
                  <BadgeCheck className="w-5 h-5 text-blue-400" />
                )}
              </div>

              <div className="flex items-center gap-3 mt-1">
                {user.slug && (
                  <span className="text-slate-400">@{user.slug}</span>
                )}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    user.accountType === "annonceur_pro"
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}
                >
                  {user.accountType === "annonceur_pro" ? "Pro" : "Particulier"}
                </span>
                {user.companyName && (
                  <span className="text-sm text-slate-400 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {user.companyName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {user.phone}
                </span>
                {profile?.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {profile.city}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleActive}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                user.isActive
                  ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              }`}
            >
              {user.isActive ? (
                <>
                  <UserCheck className="w-4 h-4" />
                  Actif
                </>
              ) : (
                <>
                  <UserX className="w-4 h-4" />
                  Inactif
                </>
              )}
            </button>

            {user.slug && (
              <a
                href={`/annonceur/${user.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium text-white transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Voir profil public
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <motion.div
          className="bg-slate-900 rounded-xl p-4 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-slate-400 text-sm">Missions totales</p>
          <p className="text-2xl font-bold text-white">{stats.totalMissions}</p>
        </motion.div>

        <motion.div
          className="bg-slate-900 rounded-xl p-4 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-slate-400 text-sm">Missions terminées</p>
          <p className="text-2xl font-bold text-green-400">{stats.completedMissions}</p>
        </motion.div>

        <motion.div
          className="bg-slate-900 rounded-xl p-4 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-slate-400 text-sm">Revenus totaux</p>
          <p className="text-2xl font-bold text-primary">
            {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
            }).format(stats.totalRevenue / 100)}
          </p>
        </motion.div>

        <motion.div
          className="bg-slate-900 rounded-xl p-4 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-slate-400 text-sm">En attente</p>
          <p className="text-2xl font-bold text-amber-400">{stats.pendingMissions}</p>
        </motion.div>
      </div>

      {/* Status Indicators */}
      <div className="flex flex-wrap gap-3 mb-8">
        {/* Email */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
            user.emailVerified
              ? "bg-green-500/10 text-green-400 border border-green-500/30"
              : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
          }`}
        >
          {user.emailVerified ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          Email {user.emailVerified ? "vérifié" : "non vérifié"}
        </div>

        {/* Identité */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
            profile?.isIdentityVerified
              ? "bg-green-500/10 text-green-400 border border-green-500/30"
              : "bg-slate-500/10 text-slate-400 border border-slate-500/30"
          }`}
        >
          {profile?.isIdentityVerified ? (
            <BadgeCheck className="w-4 h-4" />
          ) : (
            <User className="w-4 h-4" />
          )}
          Identité {profile?.isIdentityVerified ? "vérifiée" : "non vérifiée"}
        </div>

        {/* Stripe */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
            stripeAccount?.chargesEnabled
              ? "bg-green-500/10 text-green-400 border border-green-500/30"
              : "bg-slate-500/10 text-slate-400 border border-slate-500/30"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Stripe {stripeAccount?.chargesEnabled ? "connecté" : "non connecté"}
        </div>

        {/* Date inscription */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-slate-800 text-slate-300">
          <Calendar className="w-4 h-4" />
          Membre depuis{" "}
          {new Date(user.createdAt).toLocaleDateString("fr-FR", {
            month: "long",
            year: "numeric",
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800 mb-6">
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-slate-400 hover:text-white hover:border-slate-600"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "overview" && (
            <OverviewTab
              user={user}
              profile={profile}
              verification={verification}
              stripeAccount={stripeAccount}
            />
          )}
          {activeTab === "services" && (
            <ServicesTab
              announcerId={announcerId}
              services={announcerDetails.services}
            />
          )}
          {activeTab === "sales" && (
            <SalesTab announcerId={announcerId} />
          )}
          {activeTab === "finances" && (
            <FinancesTab announcerId={announcerId} />
          )}
          {activeTab === "messages" && <MessagesTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
