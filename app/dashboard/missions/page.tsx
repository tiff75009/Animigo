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
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: "#1f3a33" }} />
          <p className="text-[13px]" style={{ color: "#6d6d68" }}>
            Chargement...
          </p>
        </div>
      </div>
    );
  }

  const activeFilterCount =
    (serviceType !== "all" ? 1 : 0) +
    (sessionType !== "all" ? 1 : 0) +
    (animalType !== "all" ? 1 : 0) +
    (month !== "all" ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Header — esprit du planning */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: tabConfig.pastelBg,
                border: `1px solid ${tabConfig.pastelBorder}`,
              }}
            >
              <tabConfig.icon
                className="w-4 h-4 sm:w-5 sm:h-5"
                style={{ color: tabConfig.accent }}
              />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484]">
                Mes missions
              </div>
              <h1 className="text-[20px] sm:text-[24px] font-semibold text-[#1f1f1d] tracking-[-0.02em] truncate m-0">
                {tabConfig.label}
              </h1>
            </div>
          </div>

          {/* Bouton filtres — pill cohérente avec le planning */}
          <motion.button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors flex-shrink-0"
            style={
              showFilters || hasActiveFilters
                ? { background: "#1f3a33", color: "#f7f5ef", border: "1px solid #1f3a33" }
                : {
                    background: "#fff",
                    color: "#1f1f1d",
                    border: "1px solid #ece9e1",
                  }
            }
            whileTap={{ scale: 0.97 }}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filtres</span>
            {hasActiveFilters && (
              <span
                className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                style={{
                  background:
                    showFilters || hasActiveFilters
                      ? "rgba(247,245,239,0.2)"
                      : "#f7f5ef",
                  color:
                    showFilters || hasActiveFilters ? "#f7f5ef" : "#6d6d68",
                }}
              >
                {activeFilterCount}
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
