"use client";

import { useState, useEffect, Suspense, useMemo, useCallback, useRef } from "react";
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

// Onglets valides pour la validation URL
const VALID_TABS: MissionTab[] = [
  "pending_acceptance",
  "pending_confirmation",
  "upcoming",
  "in_progress",
  "completed",
  "refused",
  "cancelled",
];

function MissionsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token, user, isLoading: authLoading } = useAuth();
  const isVatSubject = user?.isVatSubject ?? false;

  // Récupérer et VALIDER l'onglet actif depuis l'URL
  const tabFromUrl = searchParams.get("tab");
  const validatedTab: MissionTab = VALID_TABS.includes(tabFromUrl as MissionTab)
    ? (tabFromUrl as MissionTab)
    : "pending_acceptance";

  const [activeTab, setActiveTab] = useState<MissionTab>(validatedTab);

  // Récupérer les filtres depuis l'URL
  const serviceFromUrl = searchParams.get("service") as ServiceTypeFilter | null;
  const sessionFromUrl = searchParams.get("session") as SessionTypeFilter | null;
  const animalFromUrl = searchParams.get("animal") as AnimalTypeFilter | null;
  const monthFromUrl = searchParams.get("month") as MonthFilter | null;

  // États des filtres (initialisés depuis l'URL)
  const [serviceType, setServiceType] = useState<ServiceTypeFilter>(serviceFromUrl || "all");
  const [sessionType, setSessionType] = useState<SessionTypeFilter>(sessionFromUrl || "all");
  const [animalType, setAnimalType] = useState<AnimalTypeFilter>(animalFromUrl || "all");
  const [month, setMonth] = useState<MonthFilter>(monthFromUrl || "all");
  const [showFilters, setShowFilters] = useState(false);

  // Sync avec l'URL quand l'onglet change
  useEffect(() => {
    if (tabFromUrl && VALID_TABS.includes(tabFromUrl as MissionTab) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl as MissionTab);
    }
  }, [tabFromUrl]);

  // Mettre à jour l'URL quand les filtres changent
  const updateUrl = useCallback((tab: MissionTab, filters?: {
    service?: ServiceTypeFilter;
    session?: SessionTypeFilter;
    animal?: AnimalTypeFilter;
    month?: MonthFilter;
  }) => {
    const params = new URLSearchParams();
    params.set("tab", tab);

    const svc = filters?.service ?? serviceType;
    const sess = filters?.session ?? sessionType;
    const anim = filters?.animal ?? animalType;
    const mon = filters?.month ?? month;

    if (svc !== "all") params.set("service", svc);
    if (sess !== "all") params.set("session", sess);
    if (anim !== "all") params.set("animal", anim);
    if (mon !== "all") params.set("month", mon);

    router.replace(`/dashboard/missions?${params.toString()}`, { scroll: false });
  }, [router, serviceType, sessionType, animalType, month]);

  const handleTabChange = (tab: MissionTab) => {
    setActiveTab(tab);
    updateUrl(tab);
  };

  // Wrapper pour les changements de filtres qui met à jour l'URL
  const handleServiceTypeChange = (value: ServiceTypeFilter) => {
    setServiceType(value);
    updateUrl(activeTab, { service: value });
  };

  const handleSessionTypeChange = (value: SessionTypeFilter) => {
    setSessionType(value);
    updateUrl(activeTab, { session: value });
  };

  const handleAnimalTypeChange = (value: AnimalTypeFilter) => {
    setAnimalType(value);
    updateUrl(activeTab, { animal: value });
  };

  const handleMonthChange = (value: MonthFilter) => {
    setMonth(value);
    updateUrl(activeTab, { month: value });
  };

  // Query UNIFIÉE : récupère les missions ET les stats en une seule requête
  // Optimisation : évite les appels dupliqués entre stats et missions
  const data = useQuery(
    api.planning.missions.getAnnouncerMissionsWithStats,
    token ? { token, status: activeTab } : "skip"
  );

  // Extraire les données de la query unifiée
  const stats = data?.stats;
  const currentMissions = data?.missions;
  const announcerCoordinates = data?.announcerCoordinates;

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

  // Ref pour conserver les counts précédents (évite le "repli" des tabs pendant le chargement)
  const previousCountsRef = useRef<Partial<Record<MissionTab, number>>>({});

  // Préparer les compteurs pour les badges des onglets
  const counts: Partial<Record<MissionTab, number>> = useMemo(() => {
    if (stats) {
      const newCounts = {
        pending_acceptance: stats.pending_acceptance ?? 0,
        pending_confirmation: stats.pending_confirmation ?? 0,
        upcoming: stats.upcoming ?? 0,
        in_progress: stats.in_progress ?? 0,
        completed: stats.completed ?? 0,
        refused: stats.refused ?? 0,
        cancelled: stats.cancelled ?? 0,
      };
      previousCountsRef.current = newCounts;
      return newCounts;
    }
    // Pendant le chargement, garder les counts précédents
    return previousCountsRef.current;
  }, [stats]);

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
            onServiceTypeChange={handleServiceTypeChange}
            sessionType={sessionType}
            onSessionTypeChange={handleSessionTypeChange}
            animalType={animalType}
            onAnimalTypeChange={handleAnimalTypeChange}
            month={month}
            onMonthChange={handleMonthChange}
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
            missions={currentMissions}
            announcerCoordinates={announcerCoordinates}
            serviceType={serviceType}
            sessionType={sessionType}
            animalType={animalType}
            month={month}
            isVatSubject={isVatSubject}
          />
        )}
        {activeTab === "upcoming" && (
          <UpcomingTab
            token={token}
            missions={currentMissions}
            announcerCoordinates={announcerCoordinates}
            serviceType={serviceType}
            sessionType={sessionType}
            animalType={animalType}
            month={month}
            isVatSubject={isVatSubject}
          />
        )}
        {activeTab === "pending_confirmation" && (
          <GenericMissionTab
            token={token}
            status="pending_confirmation"
            missions={currentMissions}
            announcerCoordinates={announcerCoordinates}
            serviceType={serviceType}
            sessionType={sessionType}
            animalType={animalType}
            month={month}
            isVatSubject={isVatSubject}
          />
        )}
        {activeTab === "in_progress" && (
          <GenericMissionTab
            token={token}
            status="in_progress"
            missions={currentMissions}
            announcerCoordinates={announcerCoordinates}
            serviceType={serviceType}
            sessionType={sessionType}
            animalType={animalType}
            month={month}
            isVatSubject={isVatSubject}
          />
        )}
        {activeTab === "completed" && (
          <GenericMissionTab
            token={token}
            status="completed"
            missions={currentMissions}
            announcerCoordinates={announcerCoordinates}
            serviceType={serviceType}
            sessionType={sessionType}
            animalType={animalType}
            month={month}
            isVatSubject={isVatSubject}
          />
        )}
        {activeTab === "refused" && (
          <GenericMissionTab
            token={token}
            status="refused"
            missions={currentMissions}
            announcerCoordinates={announcerCoordinates}
            serviceType={serviceType}
            sessionType={sessionType}
            animalType={animalType}
            month={month}
            isVatSubject={isVatSubject}
          />
        )}
        {activeTab === "cancelled" && (
          <GenericMissionTab
            token={token}
            status="cancelled"
            missions={currentMissions}
            announcerCoordinates={announcerCoordinates}
            serviceType={serviceType}
            sessionType={sessionType}
            animalType={animalType}
            month={month}
            isVatSubject={isVatSubject}
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
