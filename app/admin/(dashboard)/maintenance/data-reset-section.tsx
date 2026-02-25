"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  AlertTriangle,
  Check,
  Loader2,
  X,
  Users,
  Cat,
  Calendar,
  CreditCard,
  Briefcase,
  HelpCircle,
  Star,
  MessageSquare,
  Bell,
  FileText,
  Eye,
  CheckCircle2,
  XCircle,
  Link2,
  type LucideIcon,
} from "lucide-react";

// ─── Groupes de données (miroir backend) ────────────────────────────────────

const GROUPS: {
  key: string;
  label: string;
  icon: LucideIcon;
  danger: "critical" | "high" | "medium" | "low";
}[] = [
  { key: "users", label: "Comptes utilisateurs", icon: Users, danger: "critical" },
  { key: "animals", label: "Animaux", icon: Cat, danger: "high" },
  { key: "reservations", label: "Réservations & Missions", icon: Calendar, danger: "critical" },
  { key: "payments", label: "Paiements Stripe", icon: CreditCard, danger: "critical" },
  { key: "services", label: "Services & Annonces", icon: Briefcase, danger: "high" },
  { key: "support", label: "Support & Réclamations", icon: HelpCircle, danger: "medium" },
  { key: "reviews", label: "Avis & Favoris", icon: Star, danger: "medium" },
  { key: "messaging", label: "Messagerie", icon: MessageSquare, danger: "medium" },
  { key: "notifications", label: "Notifications", icon: Bell, danger: "low" },
  { key: "logs", label: "Logs", icon: FileText, danger: "low" },
  { key: "visitRequests", label: "Demandes de visite", icon: Eye, danger: "low" },
];

// Tables par groupe (pour le fallback table-par-table)
const GROUP_TABLES: Record<string, string[]> = {
  users: [
    "regularityScores", "cancellationPolicies", "clientCredits", "sapDeclarations",
    "verificationRequests", "phoneVerificationAttempts", "passwordResetTokens",
    "emailVerificationTokens", "userPreferences", "clientAddresses", "clientProfiles",
    "profiles", "sessions", "users",
  ],
  animals: ["animals"],
  reservations: [
    "slotChangeNotifications", "collectiveSlotBookings", "collectiveSlots",
    "availability", "pendingBookings", "missions",
  ],
  payments: ["invoices", "announcerPayouts", "savedPaymentMethods", "stripePayments"],
  services: ["serviceOptions", "serviceVariants", "photos", "services"],
  support: ["ticketMessages", "disputes", "supportTickets"],
  reviews: ["favorites", "reviews"],
  messaging: ["messages", "conversations"],
  notifications: ["notifications"],
  logs: ["emailLogs", "smsLogs", "activities"],
  visitRequests: ["visitRequests"],
};

// Ordre d'exécution (enfants/dépendances avant parents)
const EXECUTION_ORDER = [
  "logs", "notifications", "visitRequests",
  "support", "reviews", "messaging",
  "payments", "reservations", "services",
  "animals", "users",
];

// ─── Dépendances entre groupes ──────────────────────────────────────────────
// Si on supprime le groupe X, ces groupes ont des FK vers X et DOIVENT aussi
// être supprimés pour éviter des références cassées.
//
// users → tout le monde référence users (userId, announcerId, clientId…)
// animals → reservations (missions.animalId)
// services → reservations (missions.serviceId), reviews (favorites.formuleId → serviceVariants)
// reservations → payments (stripePayments.missionId), support (disputes.missionId),
//                reviews (reviews.missionId), messaging (conversations.missionId)

const DIRECT_DEPENDENTS: Record<string, string[]> = {
  users: ["animals", "services", "reservations", "payments", "support", "reviews", "messaging", "notifications", "logs", "visitRequests"],
  animals: ["reservations"],
  services: ["reservations", "reviews"],
  reservations: ["payments", "support", "reviews", "messaging"],
  payments: [],
  support: [],
  reviews: [],
  messaging: [],
  notifications: [],
  logs: [],
  visitRequests: [],
};

// Inverse : pour chaque groupe, quels groupes parents le forcent à être inclus
const REQUIRED_BY: Record<string, string[]> = {};
for (const [group, deps] of Object.entries(DIRECT_DEPENDENTS)) {
  for (const dep of deps) {
    if (!REQUIRED_BY[dep]) REQUIRED_BY[dep] = [];
    REQUIRED_BY[dep].push(group);
  }
}

/** Calcule l'ensemble des groupes auto-sélectionnés par cascade transitive */
function computeCascade(manual: Set<string>): Set<string> {
  const auto = new Set<string>();
  const visited = new Set<string>();

  function addDeps(group: string) {
    if (visited.has(group)) return;
    visited.add(group);
    for (const dep of DIRECT_DEPENDENTS[group] || []) {
      if (!manual.has(dep)) {
        auto.add(dep);
      }
      addDeps(dep);
    }
  }

  for (const group of manual) {
    addDeps(group);
  }

  return auto;
}

/** Pour un groupe auto-sélectionné, retourne le(s) groupe(s) parent(s) effectif(s) */
function getAutoSelectReasons(key: string, effective: Set<string>): string {
  const parents = (REQUIRED_BY[key] || []).filter((p) => effective.has(p));
  if (parents.length === 0) return "Inclus automatiquement";
  const labels = parents.map(
    (p) => GROUPS.find((g) => g.key === p)?.label || p
  );
  if (labels.length === 1) return `Lié à ${labels[0]}`;
  return `Lié à ${labels.slice(0, -1).join(", ")} et ${labels[labels.length - 1]}`;
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const DANGER_STYLES = {
  critical: {
    badge: "bg-red-500/20 text-red-400",
    label: "Critique",
  },
  high: {
    badge: "bg-orange-500/20 text-orange-400",
    label: "Élevé",
  },
  medium: {
    badge: "bg-yellow-500/20 text-yellow-400",
    label: "Moyen",
  },
  low: {
    badge: "bg-emerald-500/20 text-emerald-400",
    label: "Faible",
  },
};

type GroupResult = {
  status: "done" | "error";
  deleted?: number;
  error?: string;
};

// ─── Composant principal ────────────────────────────────────────────────────

interface DataResetSectionProps {
  token: string | null;
}

export function DataResetSection({ token }: DataResetSectionProps) {
  // selected = groupes cochés manuellement par l'admin
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingGroup, setProcessingGroup] = useState<string | null>(null);
  const [groupResults, setGroupResults] = useState<Record<string, GroupResult>>({});

  const dataCounts = useQuery(
    api.admin.dataReset.getDataCounts,
    token ? { token } : "skip"
  );
  const deleteGroupMut = useMutation(api.admin.dataReset.deleteGroup);
  const deleteTableMut = useMutation(api.admin.dataReset.deleteTable);
  const cleanStripeMut = useMutation(api.admin.dataReset.cleanStripeFieldsOnAdmins);

  // Groupes auto-sélectionnés par cascade
  const autoSelected = useMemo(() => computeCascade(selected), [selected]);
  // Union : tout ce qui sera effectivement supprimé
  const allEffective = useMemo(
    () => new Set([...selected, ...autoSelected]),
    [selected, autoSelected]
  );

  const hasResults = Object.keys(groupResults).length > 0;
  const manualCount = selected.size;
  const autoCount = autoSelected.size;
  const totalEffective = allEffective.size;
  const totalSelectedDocs = GROUPS.filter((g) => allEffective.has(g.key)).reduce(
    (sum, g) => sum + (dataCounts?.[g.key]?.total ?? 0),
    0
  );

  const toggleGroup = (key: string) => {
    if (isProcessing) return;
    // Un groupe auto-sélectionné ne peut pas être décoché directement
    if (autoSelected.has(key) && !selected.has(key)) return;

    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    if (hasResults) setGroupResults({});
  };

  const toggleAll = () => {
    if (isProcessing) return;
    if (totalEffective === GROUPS.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(GROUPS.map((g) => g.key)));
    }
    if (hasResults) setGroupResults({});
  };

  const openModal = () => {
    setShowModal(true);
    setModalStep(1);
    setConfirmText("");
  };

  const closeModal = () => {
    if (isProcessing) return;
    setShowModal(false);
    setModalStep(1);
    setConfirmText("");
  };

  const executeReset = async () => {
    if (!token) return;
    setShowModal(false);
    setIsProcessing(true);
    setGroupResults({});

    const toProcess = EXECUTION_ORDER.filter((key) => allEffective.has(key));

    for (const groupKey of toProcess) {
      setProcessingGroup(groupKey);

      try {
        const result = await deleteGroupMut({ token, group: groupKey });
        setGroupResults((prev) => ({
          ...prev,
          [groupKey]: { status: "done", deleted: result.totalDeleted },
        }));

        if (groupKey === "payments") {
          await cleanStripeMut({ token });
        }
      } catch {
        // Fallback : suppression table par table
        try {
          const tables = GROUP_TABLES[groupKey] || [];
          let totalDeleted = 0;

          for (const tableName of tables) {
            const excludeAdmins =
              groupKey === "users" &&
              (tableName === "users" || tableName === "sessions");
            const result = await deleteTableMut({
              token,
              tableName,
              excludeAdmins,
            });
            totalDeleted += result.deleted;
          }

          setGroupResults((prev) => ({
            ...prev,
            [groupKey]: { status: "done", deleted: totalDeleted },
          }));

          if (groupKey === "payments") {
            await cleanStripeMut({ token });
          }
        } catch (fallbackErr: unknown) {
          const message =
            fallbackErr instanceof Error
              ? fallbackErr.message
              : "Erreur inconnue";
          setGroupResults((prev) => ({
            ...prev,
            [groupKey]: { status: "error", error: message },
          }));
          break;
        }
      }
    }

    setProcessingGroup(null);
    setIsProcessing(false);
    setSelected(new Set());
  };

  const getGroupStatus = (key: string) => {
    if (groupResults[key]) return groupResults[key].status;
    if (processingGroup === key) return "processing";
    if (isProcessing && allEffective.has(key) && !groupResults[key]) return "pending";
    return null;
  };

  const totalDeleted = Object.values(groupResults)
    .filter((r) => r.status === "done")
    .reduce((sum, r) => sum + (r.deleted ?? 0), 0);

  const hasError = Object.values(groupResults).some((r) => r.status === "error");

  return (
    <motion.div
      className="bg-slate-900 rounded-xl p-6 border border-slate-800"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-red-500/20 rounded-lg">
          <Trash2 className="w-5 h-5 text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">
          Réinitialisation des données
        </h2>
        <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded-full font-medium">
          Danger
        </span>
      </div>

      {/* Avertissement */}
      <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-6">
        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-red-300 font-medium">
            Zone dangereuse — Suppression irréversible
          </p>
          <p className="text-sm text-red-300/70 mt-1">
            Les données supprimées ne peuvent pas être récupérées. Les comptes
            administrateurs et la configuration système sont toujours préservés.
            Les groupes liés sont automatiquement inclus pour éviter les
            références cassées.
          </p>
        </div>
      </div>

      {/* Boutons d'action haut */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={toggleAll}
          disabled={isProcessing}
          className="text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50"
        >
          {totalEffective === GROUPS.length
            ? "Tout désélectionner"
            : "Tout sélectionner"}
        </button>
        {totalEffective > 0 && !isProcessing && (
          <span className="text-sm text-slate-500">
            {manualCount} sélectionné{manualCount > 1 ? "s" : ""}
            {autoCount > 0 && (
              <span className="text-amber-400/70">
                {" "}+ {autoCount} lié{autoCount > 1 ? "s" : ""}
              </span>
            )}
            {" · "}
            {totalSelectedDocs.toLocaleString("fr-FR")} documents
          </span>
        )}
      </div>

      {/* Grille de groupes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {GROUPS.map((group) => {
          const count = dataCounts?.[group.key]?.total ?? 0;
          const isManual = selected.has(group.key);
          const isAuto = autoSelected.has(group.key) && !isManual;
          const isEffective = allEffective.has(group.key);
          const status = getGroupStatus(group.key);
          const danger = DANGER_STYLES[group.danger];
          const Icon = group.icon;

          return (
            <motion.button
              key={group.key}
              onClick={() => toggleGroup(group.key)}
              disabled={isProcessing}
              className={`relative flex items-center gap-3 p-4 rounded-lg border text-left transition-all ${
                status === "done"
                  ? "bg-emerald-500/5 border-emerald-500/30"
                  : status === "error"
                    ? "bg-red-500/5 border-red-500/30"
                    : status === "processing"
                      ? "bg-blue-500/5 border-blue-500/30"
                      : isAuto
                        ? "bg-amber-500/5 border-amber-500/20"
                        : isManual
                          ? "bg-slate-800 border-slate-600"
                          : "bg-slate-800/50 border-slate-700/50 hover:border-slate-600"
              } ${isProcessing || isAuto ? "cursor-default" : "cursor-pointer"}`}
              whileTap={isProcessing || isAuto ? undefined : { scale: 0.98 }}
            >
              {/* Checkbox / Status icon */}
              <div className="flex-shrink-0">
                {status === "done" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : status === "error" ? (
                  <XCircle className="w-5 h-5 text-red-400" />
                ) : status === "processing" ? (
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                ) : isAuto ? (
                  <div className="w-5 h-5 rounded border-2 bg-amber-500/80 border-amber-500 flex items-center justify-center">
                    <Link2 className="w-3 h-3 text-white" />
                  </div>
                ) : (
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isManual
                        ? "bg-red-500 border-red-500"
                        : "border-slate-600"
                    }`}
                  >
                    {isManual && <Check className="w-3 h-3 text-white" />}
                  </div>
                )}
              </div>

              {/* Icon */}
              <div
                className={`p-1.5 rounded-md ${
                  status === "done"
                    ? "bg-emerald-500/20"
                    : status === "error"
                      ? "bg-red-500/20"
                      : isAuto
                        ? "bg-amber-500/10"
                        : "bg-slate-700"
                }`}
              >
                <Icon className="w-4 h-4 text-slate-300" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">
                    {group.label}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${danger.badge}`}
                  >
                    {danger.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {dataCounts ? (
                    <span className="text-xs text-slate-400">
                      {count.toLocaleString("fr-FR")} document
                      {count !== 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">Chargement...</span>
                  )}
                  {isAuto && !status && (
                    <span className="text-[10px] text-amber-400/80 italic truncate">
                      {getAutoSelectReasons(group.key, allEffective)}
                    </span>
                  )}
                  {status === "done" &&
                    groupResults[group.key]?.deleted !== undefined && (
                      <span className="text-xs text-emerald-400">
                        −
                        {groupResults[group.key].deleted!.toLocaleString(
                          "fr-FR"
                        )}{" "}
                        supprimé
                        {groupResults[group.key].deleted! !== 1 ? "s" : ""}
                      </span>
                    )}
                  {status === "error" && (
                    <span className="text-xs text-red-400 truncate">
                      {groupResults[group.key]?.error}
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Résumé après exécution */}
      {hasResults && !isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg mb-4 ${
            hasError
              ? "bg-red-500/10 border border-red-500/30"
              : "bg-emerald-500/10 border border-emerald-500/30"
          }`}
        >
          <p className={hasError ? "text-red-300" : "text-emerald-300"}>
            {hasError ? (
              <>
                <strong>Erreur</strong> — La suppression a été interrompue.{" "}
                {totalDeleted > 0 && (
                  <>
                    {totalDeleted.toLocaleString("fr-FR")} documents supprimés
                    avant l&apos;erreur.
                  </>
                )}
              </>
            ) : (
              <>
                <strong>{totalDeleted.toLocaleString("fr-FR")}</strong>{" "}
                documents supprimés avec succès.
              </>
            )}
          </p>
        </motion.div>
      )}

      {/* Bouton Réinitialiser */}
      <button
        onClick={openModal}
        disabled={totalEffective === 0 || isProcessing}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Suppression en cours...
          </>
        ) : (
          <>
            <Trash2 className="w-4 h-4" />
            Réinitialiser les données sélectionnées
          </>
        )}
      </button>

      {/* Modal de confirmation */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-slate-900 rounded-xl border border-slate-700 w-full max-w-lg p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {modalStep === 1 ? (
                <>
                  {/* Étape 1 : Récapitulatif */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-500/20 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">
                      Confirmer la suppression
                    </h3>
                  </div>

                  <p className="text-sm text-slate-400 mb-4">
                    Vous êtes sur le point de supprimer les données suivantes :
                  </p>

                  <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                    {GROUPS.filter((g) => allEffective.has(g.key)).map(
                      (group) => {
                        const count = dataCounts?.[group.key]?.total ?? 0;
                        const danger = DANGER_STYLES[group.danger];
                        const isAuto =
                          autoSelected.has(group.key) &&
                          !selected.has(group.key);
                        return (
                          <div
                            key={group.key}
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              isAuto
                                ? "bg-amber-500/5 border border-amber-500/20"
                                : "bg-slate-800"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {isAuto && (
                                <Link2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              )}
                              <span
                                className={`text-sm truncate ${isAuto ? "text-amber-200" : "text-white"}`}
                              >
                                {group.label}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 text-[10px] font-medium rounded flex-shrink-0 ${danger.badge}`}
                              >
                                {danger.label}
                              </span>
                            </div>
                            <span className="text-sm text-slate-400 font-mono flex-shrink-0 ml-2">
                              {count.toLocaleString("fr-FR")}
                            </span>
                          </div>
                        );
                      }
                    )}
                  </div>

                  {autoCount > 0 && (
                    <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
                      <Link2 className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-300/80">
                        {autoCount} groupe{autoCount > 1 ? "s" : ""} inclus
                        automatiquement pour éviter les références cassées
                        (données liées).
                      </p>
                    </div>
                  )}

                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg mb-6">
                    <p className="text-sm text-red-300">
                      <strong>
                        {totalSelectedDocs.toLocaleString("fr-FR")}
                      </strong>{" "}
                      documents seront supprimés définitivement.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={closeModal}
                      className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => setModalStep(2)}
                      className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Continuer
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Étape 2 : Saisie de confirmation */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-500/20 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">
                      Dernière vérification
                    </h3>
                  </div>

                  <p className="text-sm text-slate-400 mb-4">
                    Pour confirmer la suppression de{" "}
                    <strong className="text-white">
                      {totalSelectedDocs.toLocaleString("fr-FR")} documents
                    </strong>{" "}
                    dans{" "}
                    <strong className="text-white">
                      {totalEffective} groupe{totalEffective > 1 ? "s" : ""}
                    </strong>
                    , tapez{" "}
                    <code className="bg-slate-800 px-2 py-0.5 rounded text-red-400 font-mono">
                      CONFIRMER
                    </code>{" "}
                    ci-dessous :
                  </p>

                  <label htmlFor="confirm-input" className="sr-only">
                    Tapez CONFIRMER pour valider
                  </label>
                  <input
                    id="confirm-input"
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Tapez CONFIRMER"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-center font-mono text-lg tracking-widest focus:outline-none focus:border-red-500 mb-6"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && confirmText === "CONFIRMER") {
                        executeReset();
                      }
                    }}
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setModalStep(1);
                        setConfirmText("");
                      }}
                      className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
                    >
                      Retour
                    </button>
                    <button
                      onClick={executeReset}
                      disabled={confirmText !== "CONFIRMER"}
                      className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Trash2 className="w-4 h-4" />
                        Supprimer définitivement
                      </span>
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
