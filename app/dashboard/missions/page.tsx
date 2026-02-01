"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/hooks/useAuth";
import { Loader2, Filter } from "lucide-react";

import {
  MissionsTabs,
  getTabConfig,
  type MissionTab,
  MissionsFilters,
  type ServiceTypeFilter,
  type SessionTypeFilter,
  type AnimalTypeFilter,
  type MonthFilter,
  PendingAcceptanceTab,
  UpcomingTab,
  GenericMissionTab,
} from "./components";

// Type minimal pour les missions dans les filtres
interface MissionForFilters {
  animal?: { type?: string } | null;
  startDate?: string;
  serviceCategory?: string;
  sessionType?: string;
}

function MissionsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();

  // Récupérer l'onglet actif depuis l'URL ou utiliser la valeur par défaut
  const tabFromUrl = searchParams.get("tab") as MissionTab | null;
  const [activeTab, setActiveTab] = useState<MissionTab>(
    tabFromUrl || "pending_acceptance"
  );

  // États des filtres
  const [serviceType, setServiceType] = useState<ServiceTypeFilter>("all");
  const [sessionType, setSessionType] = useState<SessionTypeFilter>("all");
  const [animalType, setAnimalType] = useState<AnimalTypeFilter>("all");
  const [month, setMonth] = useState<MonthFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Sync avec l'URL quand l'onglet change
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (tab: MissionTab) => {
    setActiveTab(tab);
    // Mettre à jour l'URL sans recharger la page
    const newUrl = `/dashboard/missions?tab=${tab}`;
    router.push(newUrl, { scroll: false });
  };

  // Query pour les compteurs de toutes les missions
  const stats = useQuery(
    api.planning.missions.getAnnouncerDashboardStats,
    token ? { token } : "skip"
  );

  // Query pour récupérer toutes les missions de l'onglet actif (pour les filtres)
  const currentMissions = useQuery(
    api.planning.missions.getMissionsByStatus,
    token ? { token, status: activeTab } : "skip"
  );

  const tabConfig = getTabConfig(activeTab);

  // Extraire les types d'animaux disponibles
  const availableAnimalTypes = useMemo(() => {
    if (!currentMissions) return [];
    const types = new Set<string>();
    (currentMissions as MissionForFilters[]).forEach((m) => {
      if (m.animal?.type) {
        types.add(m.animal.type.toLowerCase());
      }
    });
    return Array.from(types).sort();
  }, [currentMissions]);

  // Extraire les mois disponibles (format YYYY-MM)
  const availableMonths = useMemo(() => {
    if (!currentMissions) return [];
    const months = new Set<string>();
    (currentMissions as MissionForFilters[]).forEach((m) => {
      if (m.startDate) {
        try {
          const date = new Date(m.startDate);
          const year = date.getFullYear();
          const monthNum = (date.getMonth() + 1).toString().padStart(2, "0");
          months.add(`${year}-${monthNum}`);
        } catch {
          // Ignorer les dates invalides
        }
      }
    });
    return Array.from(months);
  }, [currentMissions]);

  // Calculer les compteurs pour les filtres
  const filterCounts = useMemo(() => {
    if (!currentMissions) return {};

    let garde = 0;
    let service = 0;
    let individual = 0;
    let collective = 0;
    const byAnimal: Record<string, number> = {};
    const byMonth: Record<string, number> = {};

    (currentMissions as MissionForFilters[]).forEach((m) => {
      // Compteur par catégorie de service
      if (m.serviceCategory === "garde" || m.serviceCategory === "hébergement") {
        garde++;
      } else {
        service++;
      }

      // Compteur par type de session
      if (m.sessionType === "collective") {
        collective++;
      } else {
        individual++;
      }

      // Compteur par type d'animal
      if (m.animal?.type) {
        const type = m.animal.type.toLowerCase();
        byAnimal[type] = (byAnimal[type] || 0) + 1;
      }

      // Compteur par mois
      if (m.startDate) {
        try {
          const date = new Date(m.startDate);
          const year = date.getFullYear();
          const monthNum = (date.getMonth() + 1).toString().padStart(2, "0");
          const monthKey = `${year}-${monthNum}`;
          byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
        } catch {
          // Ignorer les dates invalides
        }
      }
    });

    return { garde, service, individual, collective, byAnimal, byMonth };
  }, [currentMissions]);

  // Préparer les compteurs pour les badges des onglets
  const counts: Partial<Record<MissionTab, number>> = stats
    ? {
        pending_acceptance: stats.pendingAcceptance ?? 0,
        pending_confirmation: stats.pendingConfirmation ?? 0,
        upcoming: stats.upcoming ?? 0,
        in_progress: stats.inProgress ?? 0,
        completed: stats.completed ?? 0,
        refused: stats.refused ?? 0,
        cancelled: stats.cancelled ?? 0,
      }
    : {};

  // Vérifier si des filtres sont actifs
  const hasActiveFilters = serviceType !== "all" || sessionType !== "all" || animalType !== "all" || month !== "all";

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-text-light">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 ${tabConfig.bgColor} rounded-2xl`}>
              <tabConfig.icon className={`w-6 h-6 ${tabConfig.textColor}`} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Mes missions
              </h1>
              <p className="text-text-light">
                Gérez toutes vos missions en un seul endroit
              </p>
            </div>
          </div>

          {/* Bouton filtres */}
          <motion.button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
              showFilters || hasActiveFilters
                ? "bg-primary text-white"
                : "bg-slate-100 text-foreground hover:bg-slate-200"
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filtres</span>
            {hasActiveFilters && (
              <span className="w-5 h-5 bg-white/20 rounded-full text-xs flex items-center justify-center">
                {(serviceType !== "all" ? 1 : 0) +
                 (sessionType !== "all" ? 1 : 0) +
                 (animalType !== "all" ? 1 : 0) +
                 (month !== "all" ? 1 : 0)}
              </span>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <MissionsTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          counts={counts}
        />
      </motion.div>

      {/* Filtres (collapsible) */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ delay: 0.15 }}
        >
          <MissionsFilters
            serviceType={serviceType}
            onServiceTypeChange={setServiceType}
            sessionType={sessionType}
            onSessionTypeChange={setSessionType}
            animalType={animalType}
            onAnimalTypeChange={setAnimalType}
            month={month}
            onMonthChange={setMonth}
            availableAnimalTypes={availableAnimalTypes}
            availableMonths={availableMonths}
            counts={filterCounts}
          />
        </motion.div>
      )}

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {activeTab === "pending_acceptance" && (
          <PendingAcceptanceTab
            token={token}
            serviceType={serviceType}
            sessionType={sessionType}
            animalType={animalType}
            month={month}
          />
        )}
        {activeTab === "upcoming" && (
          <UpcomingTab
            token={token}
            serviceType={serviceType}
            sessionType={sessionType}
            animalType={animalType}
            month={month}
          />
        )}
        {activeTab === "pending_confirmation" && (
          <GenericMissionTab
            token={token}
            status="pending_confirmation"
            serviceType={serviceType}
            sessionType={sessionType}
            animalType={animalType}
            month={month}
          />
        )}
        {activeTab === "in_progress" && (
          <GenericMissionTab
            token={token}
            status="in_progress"
            serviceType={serviceType}
            sessionType={sessionType}
            animalType={animalType}
            month={month}
          />
        )}
        {activeTab === "completed" && (
          <GenericMissionTab
            token={token}
            status="completed"
            serviceType={serviceType}
            sessionType={sessionType}
            animalType={animalType}
            month={month}
          />
        )}
        {activeTab === "refused" && (
          <GenericMissionTab
            token={token}
            status="refused"
            serviceType={serviceType}
            sessionType={sessionType}
            animalType={animalType}
            month={month}
          />
        )}
        {activeTab === "cancelled" && (
          <GenericMissionTab
            token={token}
            status="cancelled"
            serviceType={serviceType}
            sessionType={sessionType}
            animalType={animalType}
            month={month}
          />
        )}
      </motion.div>
    </div>
  );
}

export default function MissionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
            <p className="text-text-light">Chargement...</p>
          </div>
        </div>
      }
    >
      <MissionsPageContent />
    </Suspense>
  );
}
