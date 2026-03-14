"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { Id } from "@/convex/_generated/dataModel";
import {
  FlaskConical, Play, Square, CheckCircle, XCircle, Clock, ArrowRight,
  CreditCard, RefreshCw, Trash2, ChevronDown, ChevronUp, Mail,
  Bell, AlertTriangle, Banknote, UserX, User, Loader2, Eye,
  Plus, Ban, CircleDollarSign, Send, RotateCcw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────
type ActionResult = {
  success: boolean;
  message: string;
  details?: Record<string, any>;
};

const STATUS_COLORS: Record<string, string> = {
  pending_acceptance: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  pending_confirmation: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  upcoming: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  in_progress: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  refused: "bg-red-500/20 text-red-400 border-red-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  pending_acceptance: "En attente acceptation",
  pending_confirmation: "En attente paiement",
  upcoming: "À venir",
  in_progress: "En cours",
  completed: "Terminée",
  refused: "Refusée",
  cancelled: "Annulée",
};

const PAYMENT_COLORS: Record<string, string> = {
  not_due: "text-slate-500",
  pending: "text-yellow-400",
  paid: "text-emerald-400",
  refunded: "text-red-400",
};

function formatPrice(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Composant principal ──────────────────────────────────────────────
export default function TestReservationsPage() {
  const { token } = useAdminAuth();
  const data = useQuery(api.admin.testReservations.getTestData, token ? { token } : "skip");

  const [result, setResult] = useState<ActionResult | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string>("create");
  const [testCard, setTestCard] = useState<string>("visa");

  // Mutations
  const createTestMission = useMutation(api.admin.testReservations.createTestMission);
  const simulateAccept = useMutation(api.admin.testReservations.simulateAcceptMission);
  const forceStatus = useMutation(api.admin.testReservations.forceStatusTransition);
  const simulateConfirmEnd = useMutation(api.admin.testReservations.simulateConfirmEnd);
  const forcePayout = useMutation(api.admin.testReservations.forcePayout);
  const simulatePayment = useMutation(api.admin.testReservations.simulateClientPayment);
  const simulateCancelClient = useMutation(api.admin.testReservations.simulateCancelByClient);
  const simulateCancelAnnouncer = useMutation(api.admin.testReservations.simulateCancelByAnnouncer);
  const cleanupMissions = useMutation(api.admin.testReservations.cleanupTestMissions);

  // État formulaire création
  const [createForm, setCreateForm] = useState({
    announcerId: "",
    clientId: "",
    serviceId: "",
    variantId: "",
    startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "18:00",
    initialStatus: "pending_acceptance",
  });

  const resetCancellationCounter = useMutation(api.admin.testReservations.resetClientCancellationCounter);

  // État simulation annulation
  const [cancelReason, setCancelReason] = useState("Raison de test");
  const [simulationMode, setSimulationMode] = useState<"real" | "custom" | "scenario">("real");
  const [simHoursSincePaid, setSimHoursSincePaid] = useState<number | undefined>(undefined);
  const [simHoursBeforeStart, setSimHoursBeforeStart] = useState<number | undefined>(undefined);
  const [simCancellationCount, setSimCancellationCount] = useState<number | undefined>(undefined);

  // Preview annulation (réactif)
  const cancellationPreview = useQuery(
    api.admin.testReservations.previewCancellation,
    (selectedMission && token && simulationMode !== "real") ? {
      token,
      missionId: selectedMission as Id<"missions">,
      simulateHoursSincePaid: simHoursSincePaid,
      simulateHoursBeforeStart: simHoursBeforeStart,
      simulateCancellationCount: simCancellationCount,
    } : "skip"
  );

  // Info compteur annulation du client sélectionné (résolu après le rendu)
  const selectedMissionData = data?.missions?.find((m: any) => m._id === selectedMission);
  const clientCancellationInfo = useQuery(
    api.admin.testReservations.getClientCancellationInfo,
    (selectedMissionData?.clientId && token) ? {
      token,
      clientId: selectedMissionData.clientId as Id<"users">,
    } : "skip"
  );

  // Appliquer un scénario prédéfini
  function applyScenario(scenario: string) {
    setSimulationMode("scenario");
    switch (scenario) {
      case "grace_period":
        setSimHoursSincePaid(2);
        setSimHoursBeforeStart(undefined);
        setSimCancellationCount(0);
        break;
      case "before_threshold":
        setSimHoursSincePaid(72);
        setSimHoursBeforeStart(72);
        setSimCancellationCount(0);
        break;
      case "first_cancel_close":
        setSimHoursSincePaid(48);
        setSimHoursBeforeStart(12);
        setSimCancellationCount(0);
        break;
      case "second_cancel":
        setSimHoursSincePaid(48);
        setSimHoursBeforeStart(12);
        setSimCancellationCount(1);
        break;
      case "third_cancel":
        setSimHoursSincePaid(48);
        setSimHoursBeforeStart(12);
        setSimCancellationCount(2);
        break;
      case "last_minute":
        setSimHoursSincePaid(4);
        setSimHoursBeforeStart(3);
        setSimCancellationCount(0);
        break;
      case "last_minute_grace":
        setSimHoursSincePaid(1);
        setSimHoursBeforeStart(3);
        setSimCancellationCount(0);
        break;
    }
  }

  const [announcerSearch, setAnnouncerSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [showAnnouncerDropdown, setShowAnnouncerDropdown] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Filtrer les annonceurs par recherche
  const filteredAnnouncers = useMemo(() => {
    if (!data?.announcers || announcerSearch.length < 1) return [];
    const q = announcerSearch.toLowerCase();
    return data.announcers.filter((a: any) =>
      a.firstName?.toLowerCase().includes(q) ||
      a.lastName?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.username?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [data?.announcers, announcerSearch]);

  // Filtrer les clients par recherche
  const filteredClients = useMemo(() => {
    if (!data?.clients || clientSearch.length < 1) return [];
    const q = clientSearch.toLowerCase();
    return data.clients.filter((c: any) =>
      c.firstName?.toLowerCase().includes(q) ||
      c.lastName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.username?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [data?.clients, clientSearch]);

  // Services de l'annonceur sélectionné
  const announcerServices = useMemo(() => {
    if (!data?.services || !createForm.announcerId) return [];
    return data.services.filter((s: any) => s.userId === createForm.announcerId);
  }, [data?.services, createForm.announcerId]);

  // Variantes du service sélectionné
  const selectedServiceVariants = useMemo(() => {
    if (!data?.services || !createForm.serviceId) return [];
    const svc = data.services.find((s: any) => s._id === createForm.serviceId);
    return svc?.variants || [];
  }, [data?.services, createForm.serviceId]);

  // La variante sélectionnée
  const selectedVariant = useMemo(() => {
    return selectedServiceVariants.find((v: any) => v._id === createForm.variantId) || null;
  }, [selectedServiceVariants, createForm.variantId]);

  // Le service sélectionné
  const selectedService = useMemo(() => {
    if (!data?.services || !createForm.serviceId) return null;
    return data.services.find((s: any) => s._id === createForm.serviceId) || null;
  }, [data?.services, createForm.serviceId]);

  // Déterminer le mode de réservation
  const bookingMode = useMemo(() => {
    if (!selectedVariant) return "range";
    if (selectedVariant.sessionType === "collective") return "collective";
    if ((selectedVariant.numberOfSessions || 1) > 1) return "multi-session";
    // Range vs hourly basé sur catégorie
    const dailyCats = ["garde", "hebergement", "pension", "garde-domicile", "visite"];
    if (selectedService && dailyCats.includes(selectedService.category)) return "range";
    return "hourly";
  }, [selectedVariant, selectedService]);

  // État sessions multiples
  const [multiSessions, setMultiSessions] = useState<{ date: string; startTime: string; endTime: string }[]>([]);
  // État créneaux collectifs sélectionnés
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  // État garde de nuit
  const [includeOvernight, setIncludeOvernight] = useState(false);
  const [overnightNights, setOvernightNights] = useState(1);
  // Nombre d'animaux (collectif)
  const [animalCount, setAnimalCount] = useState(1);

  // Nom affiché de l'annonceur sélectionné
  const selectedAnnouncerLabel = useMemo(() => {
    if (!createForm.announcerId || !data?.announcers) return "";
    const a = data.announcers.find((a: any) => a._id === createForm.announcerId);
    return a ? `${a.firstName} ${a.lastName} (${a.email})` : "";
  }, [createForm.announcerId, data?.announcers]);

  // Nom affiché du client sélectionné
  const selectedClientLabel = useMemo(() => {
    if (!createForm.clientId || !data?.clients) return "";
    const c = data.clients.find((c: any) => c._id === createForm.clientId);
    return c ? `${c.firstName} ${c.lastName} (${c.email})` : "";
  }, [createForm.clientId, data?.clients]);

  const handleSelectAnnouncer = (id: string) => {
    setCreateForm(prev => ({ ...prev, announcerId: id, serviceId: "", variantId: "" }));
    const a = data?.announcers?.find((a: any) => a._id === id);
    setAnnouncerSearch(a ? `${a.firstName} ${a.lastName}` : "");
    setShowAnnouncerDropdown(false);
  };

  const handleSelectClient = (id: string) => {
    setCreateForm(prev => ({ ...prev, clientId: id }));
    const c = data?.clients?.find((c: any) => c._id === id);
    setClientSearch(c ? `${c.firstName} ${c.lastName}` : "");
    setShowClientDropdown(false);
  };

  const handleServiceChange = (serviceId: string) => {
    setCreateForm(prev => ({ ...prev, serviceId, variantId: "" }));
  };

  // ─── Actions ──────────────────────────────────────────────────────
  async function runAction(name: string, fn: () => Promise<any>) {
    setLoading(name);
    setResult(null);
    try {
      const res = await fn();
      setResult({
        success: res.success !== false,
        message: `${name} : OK`,
        details: res,
      });
    } catch (error: any) {
      setResult({
        success: false,
        message: `${name} : ${error.data || error.message || "Erreur"}`,
      });
    } finally {
      setLoading(null);
    }
  }

  if (!token) return <div className="p-8 text-white">Chargement...</div>;
  if (!data) return <div className="p-8 text-white flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Chargement des données...</div>;

  const missions = data.missions || [];
  const activeMission = selectedMission ? missions.find((m: any) => m._id === selectedMission) : null;

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-violet-500/20 rounded-lg">
            <FlaskConical className="w-6 h-6 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Test Réservations</h1>
          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full border border-amber-500/30">
            Environnement de test
          </span>
        </div>
        <p className="text-slate-400">
          Testez le flux complet : réservation → acceptation → paiement → fin de mission → versement annonceur. Aussi les annulations.
        </p>
      </div>

      {/* Résultat global */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-6 p-4 rounded-xl border ${
              result.success
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-red-500/10 border-red-500/30"
            }`}
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${result.success ? "text-emerald-400" : "text-red-400"}`}>
                  {result.message}
                </p>
                {result.details && (
                  <pre className="mt-2 text-xs text-slate-400 bg-slate-900/50 rounded-lg p-3 overflow-x-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                )}
              </div>
              <button onClick={() => setResult(null)} className="text-slate-500 hover:text-slate-300">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ─── Colonne gauche : Actions ─── */}
        <div className="xl:col-span-2 space-y-6">

          {/* Section 1 : Créer une mission de test */}
          <Section
            title="Créer une mission de test"
            icon={Plus}
            accent="violet"
            expanded={expandedSection === "create"}
            onToggle={() => setExpandedSection(expandedSection === "create" ? "" : "create")}
          >
            <div className="space-y-4">
              {/* Ligne 1 : Annonceur (search) + Client (search) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Annonceur - Recherche */}
                <div className="relative">
                  <label className="block text-sm text-slate-400 mb-1">
                    Annonceur
                    {createForm.announcerId && (
                      <button
                        onClick={() => { setCreateForm(prev => ({ ...prev, announcerId: "", serviceId: "", variantId: "" })); setAnnouncerSearch(""); }}
                        className="ml-2 text-xs text-red-400 hover:text-red-300"
                      >
                        Effacer
                      </button>
                    )}
                  </label>
                  <input
                    type="text"
                    value={announcerSearch}
                    onChange={e => { setAnnouncerSearch(e.target.value); setShowAnnouncerDropdown(true); if (createForm.announcerId) setCreateForm(prev => ({ ...prev, announcerId: "", serviceId: "", variantId: "" })); }}
                    onFocus={() => setShowAnnouncerDropdown(true)}
                    onBlur={() => setTimeout(() => setShowAnnouncerDropdown(false), 200)}
                    placeholder="Rechercher par nom, email ou pseudo..."
                    className={`w-full px-3 py-2.5 bg-slate-800 border rounded-lg text-sm focus:outline-none focus:border-violet-500 ${
                      createForm.announcerId ? "border-violet-500/50 text-violet-300" : "border-slate-700 text-white"
                    }`}
                  />
                  {showAnnouncerDropdown && filteredAnnouncers.length > 0 && !createForm.announcerId && (
                    <div className="absolute z-20 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                      {filteredAnnouncers.map((a: any) => (
                        <button
                          key={a._id}
                          onClick={() => handleSelectAnnouncer(a._id)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-700 transition-colors border-b border-slate-700/50 last:border-0"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate">{a.firstName} {a.lastName}</p>
                            <p className="text-xs text-slate-400 truncate">{a.email} {a.username ? `· @${a.username}` : ""}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${a.accountType === "annonceur_pro" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                              {a.accountType === "annonceur_pro" ? "Pro" : "Particulier"}
                            </span>
                            {a.stripeAccountId && <CreditCard className="w-3 h-3 text-blue-400" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {announcerSearch.length >= 1 && filteredAnnouncers.length === 0 && !createForm.announcerId && showAnnouncerDropdown && (
                    <div className="absolute z-20 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg p-3">
                      <p className="text-xs text-slate-500 text-center">Aucun annonceur trouvé</p>
                    </div>
                  )}
                </div>

                {/* Client - Recherche */}
                <div className="relative">
                  <label className="block text-sm text-slate-400 mb-1">
                    Client
                    {createForm.clientId && (
                      <button
                        onClick={() => { setCreateForm(prev => ({ ...prev, clientId: "" })); setClientSearch(""); }}
                        className="ml-2 text-xs text-red-400 hover:text-red-300"
                      >
                        Effacer
                      </button>
                    )}
                  </label>
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={e => { setClientSearch(e.target.value); setShowClientDropdown(true); if (createForm.clientId) setCreateForm(prev => ({ ...prev, clientId: "" })); }}
                    onFocus={() => setShowClientDropdown(true)}
                    onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                    placeholder="Rechercher par nom, email ou pseudo..."
                    className={`w-full px-3 py-2.5 bg-slate-800 border rounded-lg text-sm focus:outline-none focus:border-violet-500 ${
                      createForm.clientId ? "border-violet-500/50 text-violet-300" : "border-slate-700 text-white"
                    }`}
                  />
                  {showClientDropdown && filteredClients.length > 0 && !createForm.clientId && (
                    <div className="absolute z-20 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                      {filteredClients.map((c: any) => (
                        <button
                          key={c._id}
                          onClick={() => handleSelectClient(c._id)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-700 transition-colors border-b border-slate-700/50 last:border-0"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate">{c.firstName} {c.lastName}</p>
                            <p className="text-xs text-slate-400 truncate">{c.email} {c.username ? `· @${c.username}` : ""}</p>
                          </div>
                          {c.stripeCustomerId && <CreditCard className="w-3 h-3 text-blue-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                  {clientSearch.length >= 1 && filteredClients.length === 0 && !createForm.clientId && showClientDropdown && (
                    <div className="absolute z-20 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg p-3">
                      <p className="text-xs text-slate-500 text-center">Aucun client trouvé</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ligne 2 : Service + Formule (apparaît après sélection annonceur) */}
              {createForm.announcerId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">
                      Service
                      {announcerServices.length === 0 && (
                        <span className="ml-2 text-xs text-red-400">Aucun service actif</span>
                      )}
                    </label>
                    <select
                      value={createForm.serviceId}
                      onChange={e => handleServiceChange(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                      disabled={announcerServices.length === 0}
                    >
                      <option value="">Sélectionner un service</option>
                      {announcerServices.map((s: any) => (
                        <option key={s._id} value={s._id}>
                          {s.category} — {s.name || "Sans nom"} ({s.variants.length} formule{s.variants.length > 1 ? "s" : ""})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Formule</label>
                    <select
                      value={createForm.variantId}
                      onChange={e => setCreateForm(prev => ({ ...prev, variantId: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                      disabled={!createForm.serviceId}
                    >
                      <option value="">Sélectionner une formule</option>
                      {selectedServiceVariants.map((v: any) => (
                        <option key={v._id} value={v._id}>
                          {v.name} — {v.price ? formatPrice(v.price) : v.pricing?.daily ? `${formatPrice(v.pricing.daily)}/jour` : v.pricing?.hourly ? `${formatPrice(v.pricing.hourly)}/h` : "Prix variable"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Badge mode détecté */}
              {selectedVariant && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Mode détecté :</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                    bookingMode === "collective" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
                    bookingMode === "multi-session" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" :
                    bookingMode === "range" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                    "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  }`}>
                    {bookingMode === "collective" ? `Collectif (${selectedVariant.numberOfSessions || "?"} créneaux)` :
                     bookingMode === "multi-session" ? `Multi-séances (${selectedVariant.numberOfSessions} séances)` :
                     bookingMode === "range" ? "Garde / Plage de dates" :
                     "Horaire (date + créneau)"}
                  </span>
                </div>
              )}

              {/* ─── NOMBRE D'ANIMAUX (tous les modes) ─── */}
              {selectedVariant && (
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Nombre d'animaux</label>
                    <input
                      type="number" min={1} max={selectedVariant.maxAnimalsPerSession || 10} value={animalCount}
                      onChange={e => setAnimalCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24 px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  {selectedVariant.maxAnimalsPerSession && (
                    <span className="text-xs text-slate-500 pt-5">max {selectedVariant.maxAnimalsPerSession} par séance</span>
                  )}
                  {/* Estimation du prix */}
                  {(() => {
                    const v = selectedVariant;
                    const pu = v.priceUnit || "day";
                    let unitLabel = "";
                    let unitPrice = v.price || 0;
                    if (pu === "hour") { unitLabel = "/h"; unitPrice = v.pricing?.hourly || v.price || 0; }
                    else if (pu === "day") { unitLabel = "/jour"; unitPrice = v.pricing?.daily || v.price || 0; }
                    else if (pu === "half_day") { unitLabel = "/demi-j"; unitPrice = v.pricing?.halfDaily || v.price || 0; }
                    else if (pu === "flat") { unitLabel = " forfait"; }
                    return unitPrice ? (
                      <span className="text-xs text-emerald-400 pt-5">
                        {(unitPrice / 100).toFixed(2)}€{unitLabel} × {animalCount} animal{animalCount > 1 ? "x" : ""}
                      </span>
                    ) : null;
                  })()}
                </div>
              )}

              {/* ─── MODE COLLECTIF : Sélection des créneaux ─── */}
              {bookingMode === "collective" && selectedVariant && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-slate-500">
                      {selectedSlotIds.length} créneau{selectedSlotIds.length > 1 ? "x" : ""} sélectionné{selectedSlotIds.length > 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {(selectedVariant.collectiveSlots || []).length === 0 ? (
                      <p className="text-xs text-red-400">Aucun créneau collectif disponible pour cette formule</p>
                    ) : (
                      (selectedVariant.collectiveSlots || []).map((slot: any) => (
                        <label key={slot._id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedSlotIds.includes(slot._id) ? "bg-purple-500/10 border border-purple-500/30" : "bg-slate-800 border border-transparent hover:bg-slate-750"
                        }`}>
                          <input
                            type="checkbox"
                            checked={selectedSlotIds.includes(slot._id)}
                            onChange={e => {
                              if (e.target.checked) setSelectedSlotIds(prev => [...prev, slot._id]);
                              else setSelectedSlotIds(prev => prev.filter(id => id !== slot._id));
                            }}
                            className="rounded border-slate-600"
                          />
                          <span className="text-sm text-white">{slot.date}</span>
                          <span className="text-xs text-slate-400">{slot.startTime} - {slot.endTime}</span>
                          <span className={`text-xs ml-auto ${slot.availableSpots > 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {slot.availableSpots}/{slot.maxAnimals} places
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ─── MODE MULTI-SESSION : N dates/heures ─── */}
              {bookingMode === "multi-session" && selectedVariant && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">
                      {multiSessions.length}/{selectedVariant.numberOfSessions} séances définies
                      {selectedVariant.sessionInterval ? ` (intervalle min : ${selectedVariant.sessionInterval}j)` : ""}
                    </span>
                    <button
                      onClick={() => {
                        if (multiSessions.length < (selectedVariant.numberOfSessions || 1)) {
                          const lastDate = multiSessions.length > 0
                            ? multiSessions[multiSessions.length - 1].date
                            : createForm.startDate;
                          const nextDate = new Date(lastDate);
                          nextDate.setDate(nextDate.getDate() + (selectedVariant.sessionInterval || 7));
                          setMultiSessions(prev => [...prev, {
                            date: nextDate.toISOString().split("T")[0],
                            startTime: "10:00",
                            endTime: "11:00",
                          }]);
                        }
                      }}
                      disabled={multiSessions.length >= (selectedVariant.numberOfSessions || 1)}
                      className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 disabled:opacity-30"
                    >
                      + Ajouter séance
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {multiSessions.map((session, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg">
                        <span className="text-xs text-slate-500 w-6">#{idx + 1}</span>
                        <input
                          type="date" value={session.date}
                          onChange={e => {
                            const updated = [...multiSessions];
                            updated[idx] = { ...updated[idx], date: e.target.value };
                            setMultiSessions(updated);
                          }}
                          className="px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-xs focus:outline-none focus:border-cyan-500"
                        />
                        <input
                          type="time" value={session.startTime}
                          onChange={e => {
                            const updated = [...multiSessions];
                            updated[idx] = { ...updated[idx], startTime: e.target.value };
                            setMultiSessions(updated);
                          }}
                          className="px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-xs focus:outline-none focus:border-cyan-500"
                        />
                        <span className="text-xs text-slate-500">→</span>
                        <input
                          type="time" value={session.endTime}
                          onChange={e => {
                            const updated = [...multiSessions];
                            updated[idx] = { ...updated[idx], endTime: e.target.value };
                            setMultiSessions(updated);
                          }}
                          className="px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-xs focus:outline-none focus:border-cyan-500"
                        />
                        <button
                          onClick={() => setMultiSessions(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-300 ml-auto"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── MODE RANGE : Date début → Date fin + heures optionnelles + nuit ─── */}
              {bookingMode === "range" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Date début</label>
                      <input type="date" value={createForm.startDate}
                        onChange={e => setCreateForm(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Date fin</label>
                      <input type="date" value={createForm.endDate}
                        onChange={e => setCreateForm(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Heure début <span className="text-slate-600">(opt.)</span></label>
                      <input type="time" value={createForm.startTime}
                        onChange={e => setCreateForm(prev => ({ ...prev, startTime: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Heure fin <span className="text-slate-600">(opt.)</span></label>
                      <input type="time" value={createForm.endTime}
                        onChange={e => setCreateForm(prev => ({ ...prev, endTime: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                  {/* Estimation prix range */}
                  {createForm.startDate && createForm.endDate && selectedVariant && (() => {
                    const start = new Date(createForm.startDate);
                    const end = new Date(createForm.endDate);
                    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                    const dailyRate = selectedVariant.pricing?.daily || selectedVariant.price || 0;
                    const totalService = dailyRate * days * animalCount;
                    const nightsTotal = includeOvernight ? (selectedService?.overnightPrice || selectedVariant.pricing?.nightly || 0) * overnightNights : 0;
                    return (
                      <div className="flex items-center gap-4 p-2 bg-slate-800/50 rounded-lg">
                        <span className="text-xs text-slate-400">
                          {days} jour{days > 1 ? "s" : ""}
                          {animalCount > 1 && ` × ${animalCount} animaux`}
                        </span>
                        <span className="text-xs text-slate-400">
                          {(dailyRate / 100).toFixed(2)}€/jour × {days}j{animalCount > 1 ? ` × ${animalCount}` : ""}
                          {nightsTotal > 0 ? ` + ${(nightsTotal / 100).toFixed(2)}€ nuits` : ""}
                        </span>
                        <span className="text-xs text-emerald-400 font-medium ml-auto">
                          Service : {((totalService + nightsTotal) / 100).toFixed(2)}€
                        </span>
                      </div>
                    );
                  })()}
                  {/* Option garde de nuit */}
                  {selectedService?.allowOvernightStay && (
                    <div className="flex items-center gap-4 p-3 bg-slate-800 rounded-lg">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={includeOvernight}
                          onChange={e => setIncludeOvernight(e.target.checked)}
                          className="rounded border-slate-600"
                        />
                        <span className="text-sm text-white">Inclure garde de nuit</span>
                      </label>
                      {includeOvernight && (
                        <div className="flex items-center gap-2">
                          <input type="number" min={1} max={30} value={overnightNights}
                            onChange={e => setOvernightNights(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                          />
                          <span className="text-xs text-slate-400">nuit{overnightNights > 1 ? "s" : ""}</span>
                          {selectedService?.overnightPrice && (
                            <span className="text-xs text-slate-500">({formatPrice(selectedService.overnightPrice)}/nuit)</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ─── MODE HORAIRE : Date unique + heures obligatoires ─── */}
              {bookingMode === "hourly" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Date</label>
                      <input type="date" value={createForm.startDate}
                        onChange={e => setCreateForm(prev => ({ ...prev, startDate: e.target.value, endDate: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Heure début</label>
                      <input type="time" value={createForm.startTime}
                        onChange={e => setCreateForm(prev => ({ ...prev, startTime: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Heure fin</label>
                      <input type="time" value={createForm.endTime}
                        onChange={e => setCreateForm(prev => ({ ...prev, endTime: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                  {/* Estimation durée + prix */}
                  {createForm.startTime && createForm.endTime && selectedVariant && (() => {
                    const [sh, sm] = createForm.startTime.split(":").map(Number);
                    const [eh, em] = createForm.endTime.split(":").map(Number);
                    const hours = Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
                    const hourlyRate = selectedVariant.pricing?.hourly || selectedVariant.price || 0;
                    const isForfait = selectedVariant.priceUnit === "flat";
                    const unitServicePrice = isForfait ? selectedVariant.price : Math.round(hourlyRate * hours);
                    const totalService = unitServicePrice * animalCount;
                    return (
                      <div className="flex items-center gap-4 p-2 bg-slate-800/50 rounded-lg">
                        <span className="text-xs text-slate-400">
                          Durée : <span className="text-white font-medium">{hours.toFixed(1)}h</span>
                        </span>
                        {!isForfait && (
                          <span className="text-xs text-slate-400">
                            {(hourlyRate / 100).toFixed(2)}€/h × {hours.toFixed(1)}h
                            {animalCount > 1 && ` × ${animalCount} animaux`}
                          </span>
                        )}
                        <span className="text-xs text-emerald-400 font-medium ml-auto">
                          Service : {(totalService / 100).toFixed(2)}€
                        </span>
                      </div>
                    );
                  })()}
                  {/* Durée fixe du variant si définie */}
                  {selectedVariant?.duration && (
                    <p className="text-xs text-slate-500">
                      Durée de la formule : {selectedVariant.duration} min
                      {selectedVariant.priceUnit === "flat" && " (forfait — le prix ne change pas selon les heures)"}
                    </p>
                  )}
                </div>
              )}

              {/* Statut initial (tous les modes) */}
              <div className="w-48">
                <label className="block text-sm text-slate-400 mb-1">Statut initial</label>
                <select
                  value={createForm.initialStatus}
                  onChange={e => setCreateForm(prev => ({ ...prev, initialStatus: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                >
                  <option value="pending_acceptance">En attente acceptation</option>
                  <option value="pending_confirmation">En attente paiement</option>
                  <option value="upcoming">À venir (payé)</option>
                  <option value="in_progress">En cours (payé)</option>
                  <option value="completed">Terminée (payé)</option>
                </select>
              </div>

              {/* Récapitulatif + bouton */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <div className="text-xs text-slate-500 space-x-3">
                  {createForm.announcerId && <span>Annonceur: <span className="text-slate-300">{selectedAnnouncerLabel.split(" (")[0]}</span></span>}
                  {createForm.clientId && <span>Client: <span className="text-slate-300">{selectedClientLabel.split(" (")[0]}</span></span>}
                  {selectedVariant && <span>Mode: <span className="text-slate-300">{bookingMode}</span></span>}
                </div>
                <button
                  disabled={
                    !createForm.serviceId || !createForm.variantId || !createForm.clientId || !createForm.announcerId ||
                    loading === "create" ||
                    (bookingMode === "collective" && selectedSlotIds.length === 0) ||
                    (bookingMode === "multi-session" && multiSessions.length < (selectedVariant?.numberOfSessions || 1))
                  }
                  onClick={() => runAction("Créer mission", () =>
                    createTestMission({
                      token: token!,
                      announcerId: createForm.announcerId as Id<"users">,
                      clientId: createForm.clientId as Id<"users">,
                      serviceId: createForm.serviceId as Id<"services">,
                      variantId: createForm.variantId as Id<"serviceVariants">,
                      startDate: createForm.startDate,
                      endDate: createForm.endDate,
                      startTime: createForm.startTime || undefined,
                      endTime: createForm.endTime || undefined,
                      animalCount,
                      // Multi-session
                      ...(bookingMode === "multi-session" ? { sessions: multiSessions } : {}),
                      // Collectif
                      ...(bookingMode === "collective" ? {
                        collectiveSlotIds: selectedSlotIds as Id<"collectiveSlots">[],
                      } : {}),
                      // Nuit
                      ...(includeOvernight ? {
                        includeOvernightStay: true,
                        overnightNights,
                      } : {}),
                      initialStatus: createForm.initialStatus,
                    })
                  )}
                  className="flex items-center gap-2 px-5 py-2.5 bg-violet-500 hover:bg-violet-600 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {loading === "create" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Créer la mission
                </button>
              </div>
            </div>
          </Section>

          {/* Section 2 : Flux de réservation */}
          <Section
            title="Flux de réservation (étape par étape)"
            icon={ArrowRight}
            accent="blue"
            expanded={expandedSection === "flow"}
            onToggle={() => setExpandedSection(expandedSection === "flow" ? "" : "flow")}
          >
            {!selectedMission ? (
              <p className="text-slate-500 text-sm">Sélectionnez une mission dans la liste à droite pour tester le flux.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-slate-400">Mission sélectionnée :</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLORS[activeMission?.status || ""] || "text-slate-400"}`}>
                    {STATUS_LABELS[activeMission?.status || ""] || activeMission?.status}
                  </span>
                  <span className="text-sm text-white">{activeMission?.serviceName}</span>
                </div>

                {/* Boutons de flux selon le statut */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Accepter (pending_acceptance → pending_confirmation) */}
                  <FlowButton
                    label="Accepter la mission"
                    description="Crée le PaymentIntent + notif + email client"
                    icon={CheckCircle}
                    color="emerald"
                    disabled={activeMission?.status !== "pending_acceptance"}
                    loading={loading === "accept"}
                    onClick={() => runAction("Accepter mission", () =>
                      simulateAccept({ token: token!, missionId: selectedMission as Id<"missions"> })
                    )}
                  />

                  {/* Simuler paiement client via Stripe test */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={testCard}
                        onChange={(e) => setTestCard(e.target.value)}
                        className="bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white flex-1"
                      >
                        <option value="visa">💳 Visa •••• 4242</option>
                        <option value="visa_debit">💳 Visa Debit •••• 4242</option>
                        <option value="mastercard">💳 Mastercard •••• 5556</option>
                        <option value="declined">❌ Visa Declined</option>
                        <option value="insufficient">❌ Fonds insuffisants</option>
                        <option value="expired">❌ Carte expirée</option>
                        <option value="3ds_required">🔐 3DS Required</option>
                      </select>
                    </div>
                    <FlowButton
                      label="Payer via Stripe (test)"
                      description={`Confirme le PaymentIntent avec carte de test Stripe`}
                      icon={CreditCard}
                      color="blue"
                      disabled={activeMission?.status !== "pending_confirmation"}
                      loading={loading === "pay"}
                      onClick={() => runAction("Simuler paiement", () =>
                        simulatePayment({ token: token!, missionId: selectedMission as Id<"missions">, testCard })
                      )}
                    />
                  </div>

                  {/* Forcer → in_progress */}
                  <FlowButton
                    label="Démarrer la mission"
                    description="Force status → in_progress"
                    icon={Play}
                    color="cyan"
                    disabled={activeMission?.status !== "upcoming"}
                    loading={loading === "start"}
                    onClick={() => runAction("Démarrer mission", () =>
                      forceStatus({ token: token!, missionId: selectedMission as Id<"missions">, targetStatus: "in_progress" })
                    )}
                  />

                  {/* Forcer → completed */}
                  <FlowButton
                    label="Terminer la mission"
                    description="Force status → completed"
                    icon={Square}
                    color="amber"
                    disabled={activeMission?.status !== "in_progress" && activeMission?.status !== "upcoming"}
                    loading={loading === "complete"}
                    onClick={() => runAction("Terminer mission", () =>
                      forceStatus({ token: token!, missionId: selectedMission as Id<"missions">, targetStatus: "completed" })
                    )}
                  />

                  {/* Confirmer fin + préparer payout */}
                  <FlowButton
                    label="Client confirme fin"
                    description="readyForPayout = true + planifie versement"
                    icon={Banknote}
                    color="emerald"
                    disabled={activeMission?.status !== "completed" || activeMission?.readyForPayout === true}
                    loading={loading === "confirm"}
                    onClick={() => runAction("Confirmer fin", () =>
                      simulateConfirmEnd({ token: token!, missionId: selectedMission as Id<"missions"> })
                    )}
                  />

                  {/* Indicateur état payout */}
                  {activeMission?.readyForPayout && (
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs text-emerald-400 font-medium">Prêt pour versement</span>
                      </div>
                      {activeMission.payoutScheduledFor && (
                        <p className="text-xs text-slate-400 mt-1 ml-6">Prévu le {activeMission.payoutScheduledFor}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-0.5 ml-6">
                        Annonceur : <span className={activeMission.announcerPaymentStatus === "paid" ? "text-emerald-400" : "text-amber-400"}>
                          {activeMission.announcerPaymentStatus || "not_due"}
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Forcer payout */}
                  <FlowButton
                    label="Forcer le versement"
                    description="Déclenche un payout Stripe immédiat"
                    icon={CircleDollarSign}
                    color="green"
                    disabled={!activeMission?.readyForPayout || activeMission?.announcerPaymentStatus === "paid"}
                    loading={loading === "payout"}
                    onClick={() => runAction("Forcer payout", () =>
                      forcePayout({ token: token!, missionId: selectedMission as Id<"missions"> })
                    )}
                  />
                </div>
              </div>
            )}
          </Section>

          {/* Section 3 : Annulations */}
          <Section
            title="Annulations"
            icon={Ban}
            accent="red"
            expanded={expandedSection === "cancel"}
            onToggle={() => setExpandedSection(expandedSection === "cancel" ? "" : "cancel")}
          >
            {!selectedMission ? (
              <p className="text-slate-500 text-sm">Sélectionnez une mission pour tester les annulations.</p>
            ) : (
              <div className="space-y-4">
                {/* Compteur d'annulations du client */}
                {clientCancellationInfo && (
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span className="text-sm text-slate-300">
                        Compteur annulations client : <span className="font-bold text-white">{clientCancellationInfo.totalCancellations}</span>
                      </span>
                    </div>
                    <button
                      onClick={() => runAction("Reset compteur", () =>
                        resetCancellationCounter({
                          token: token!,
                          clientId: selectedMissionData?.clientId as Id<"users">,
                        })
                      )}
                      disabled={clientCancellationInfo.totalCancellations === 0}
                      className="px-3 py-1 text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg border border-amber-500/30 transition-colors disabled:opacity-40"
                    >
                      <RotateCcw className="w-3 h-3 inline mr-1" />
                      Réinitialiser
                    </button>
                  </div>
                )}

                {/* Mode de simulation */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Mode de simulation</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSimulationMode("real"); setSimHoursSincePaid(undefined); setSimHoursBeforeStart(undefined); setSimCancellationCount(undefined); }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        simulationMode === "real"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      Temps réel
                    </button>
                    <button
                      onClick={() => setSimulationMode("scenario")}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        simulationMode === "scenario"
                          ? "bg-violet-500/20 text-violet-400 border-violet-500/40"
                          : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      Scénarios
                    </button>
                    <button
                      onClick={() => setSimulationMode("custom")}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        simulationMode === "custom"
                          ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                          : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      Personnalisé
                    </button>
                  </div>
                </div>

                {/* Scénarios prédéfinis */}
                {simulationMode === "scenario" && (
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { key: "grace_period", label: "Periode de grâce (2h après paiement)", desc: "→ Remboursement 100%", active: "bg-emerald-500/20 border-emerald-500/40" },
                      { key: "before_threshold", label: "+48h avant le début (72h)", desc: "→ Remboursement - commission", active: "bg-blue-500/20 border-blue-500/40" },
                      { key: "first_cancel_close", label: "1ère annulation, <48h avant début", desc: "→ Remboursement - commission", active: "bg-cyan-500/20 border-cyan-500/40" },
                      { key: "second_cancel", label: "2ème annulation, <48h avant début", desc: "→ Annonceur conserve X%", active: "bg-orange-500/20 border-orange-500/40" },
                      { key: "third_cancel", label: "3ème+ annulation, <48h avant début", desc: "→ Annonceur conserve Y%", active: "bg-red-500/20 border-red-500/40" },
                      { key: "last_minute", label: "Last-minute (3h avant, hors grâce)", desc: "→ Selon compteur + pénalité", active: "bg-red-500/20 border-red-500/40" },
                      { key: "last_minute_grace", label: "Last-minute dans la grâce (1h)", desc: "→ Remboursement 100% (grâce réduite)", active: "bg-amber-500/20 border-amber-500/40" },
                    ].map((s) => {
                      const isActive = simHoursSincePaid !== undefined && (
                        (s.key === "grace_period" && simHoursSincePaid === 2 && simCancellationCount === 0 && simHoursBeforeStart === undefined) ||
                        (s.key === "before_threshold" && simHoursSincePaid === 72 && simHoursBeforeStart === 72) ||
                        (s.key === "first_cancel_close" && simHoursBeforeStart === 12 && simCancellationCount === 0) ||
                        (s.key === "second_cancel" && simCancellationCount === 1) ||
                        (s.key === "third_cancel" && simCancellationCount === 2) ||
                        (s.key === "last_minute" && simHoursSincePaid === 4 && simHoursBeforeStart === 3) ||
                        (s.key === "last_minute_grace" && simHoursSincePaid === 1 && simHoursBeforeStart === 3)
                      );
                      return (
                        <button
                          key={s.key}
                          onClick={() => applyScenario(s.key)}
                          className={`text-left px-3 py-2 rounded-lg border transition-all ${
                            isActive
                              ? `${s.active} text-white`
                              : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600"
                          }`}
                        >
                          <span className="text-sm font-medium">{s.label}</span>
                          <span className="block text-xs text-slate-500 mt-0.5">{s.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Paramètres personnalisés */}
                {simulationMode === "custom" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Heures depuis paiement</label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={simHoursSincePaid ?? ""}
                        onChange={e => setSimHoursSincePaid(e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                        placeholder="ex: 24"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Heures avant début</label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={simHoursBeforeStart ?? ""}
                        onChange={e => setSimHoursBeforeStart(e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                        placeholder="ex: 48"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Nb annulations précédentes</label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={simCancellationCount ?? ""}
                        onChange={e => setSimCancellationCount(e.target.value !== "" ? Number(e.target.value) : undefined)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                        placeholder="ex: 0"
                      />
                    </div>
                  </div>
                )}

                {/* Preview en temps réel */}
                {cancellationPreview && simulationMode !== "real" && (
                  <div className="p-4 bg-slate-800/70 rounded-xl border border-slate-700/50 space-y-3">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Eye className="w-4 h-4 text-cyan-400" />
                      Aperçu (simulation)
                    </h4>
                    <div className={`text-sm rounded-lg px-3 py-2 border-l-2 ${
                      cancellationPreview.canCancel ? "text-slate-300 border-cyan-500 bg-slate-900/50" : "text-red-400 border-red-500 bg-red-500/10"
                    }`}>
                      {cancellationPreview.canCancel ? cancellationPreview.reason : `❌ ${cancellationPreview.reason}`}
                    </div>
                    {cancellationPreview.canCancel && (
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                          <p className="text-[11px] text-slate-500 mb-0.5">Remboursé</p>
                          <p className="text-sm font-bold text-emerald-400">{formatPrice(cancellationPreview.refundAmount)}</p>
                        </div>
                        <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                          <p className="text-[11px] text-slate-500 mb-0.5">Annonceur</p>
                          <p className="text-sm font-bold text-orange-400">{formatPrice(cancellationPreview.announcerRetained)}</p>
                        </div>
                        <div className="p-2 bg-violet-500/10 rounded-lg border border-violet-500/20">
                          <p className="text-[11px] text-slate-500 mb-0.5">Commission</p>
                          <p className="text-sm font-bold text-violet-400">{formatPrice(cancellationPreview.platformFeeRetained)}</p>
                        </div>
                        <div className="p-2 bg-pink-500/10 rounded-lg border border-pink-500/20">
                          <p className="text-[11px] text-slate-500 mb-0.5">Frais Stripe</p>
                          <p className="text-sm font-bold text-pink-400">{formatPrice(cancellationPreview.stripeFeeRetained || 0)}</p>
                        </div>
                      </div>
                    )}
                    {cancellationPreview.context && (
                      <div className="text-xs text-slate-500 grid grid-cols-2 gap-1">
                        <span>Réel : {cancellationPreview.context.realHoursSincePaid ?? "—"}h depuis paiement</span>
                        <span>Réel : {cancellationPreview.context.realHoursBeforeStart ?? "—"}h avant début</span>
                        {cancellationPreview.context.simulatedHoursSincePaid !== null && (
                          <span className="text-cyan-400">Simulé : {cancellationPreview.context.simulatedHoursSincePaid}h depuis paiement</span>
                        )}
                        {cancellationPreview.context.simulatedHoursBeforeStart !== null && (
                          <span className="text-cyan-400">Simulé : {cancellationPreview.context.simulatedHoursBeforeStart}h avant début</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Raison de l'annulation</label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-red-500"
                    placeholder="Raison..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FlowButton
                    label="Annulation par le CLIENT"
                    description={simulationMode !== "real" ? "Avec paramètres simulés" : "Calcul réel selon les 7 règles admin"}
                    icon={User}
                    color="orange"
                    disabled={!["pending_acceptance", "pending_confirmation", "upcoming", "in_progress"].includes(activeMission?.status || "")}
                    loading={loading === "cancel-client"}
                    onClick={() => runAction("Annulation client", () =>
                      simulateCancelClient({
                        token: token!,
                        missionId: selectedMission as Id<"missions">,
                        reason: cancelReason,
                        ...(simulationMode !== "real" ? {
                          simulateHoursSincePaid: simHoursSincePaid,
                          simulateHoursBeforeStart: simHoursBeforeStart,
                          simulateCancellationCount: simCancellationCount,
                        } : {}),
                      })
                    )}
                  />

                  <FlowButton
                    label="Annulation par l'ANNONCEUR"
                    description="Remboursement intégral au client"
                    icon={UserX}
                    color="red"
                    disabled={!["pending_acceptance", "pending_confirmation", "upcoming", "in_progress"].includes(activeMission?.status || "")}
                    loading={loading === "cancel-announcer"}
                    onClick={() => runAction("Annulation annonceur", () =>
                      simulateCancelAnnouncer({
                        token: token!,
                        missionId: selectedMission as Id<"missions">,
                        reason: cancelReason,
                      })
                    )}
                  />
                </div>

                {/* Résumé du remboursement après annulation */}
                {result?.success && result.details?.reason && (
                  <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 space-y-3">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <CircleDollarSign className="w-4 h-4 text-amber-400" />
                      Résultat de l'annulation
                    </h4>
                    <div className="text-sm text-slate-300 bg-slate-900/50 rounded-lg px-3 py-2 border-l-2 border-amber-500">
                      {result.details.reason}
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                        <p className="text-[11px] text-slate-500 mb-0.5">Remboursé</p>
                        <p className="text-sm font-bold text-emerald-400">{formatPrice(result.details.refundAmount || 0)}</p>
                      </div>
                      <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                        <p className="text-[11px] text-slate-500 mb-0.5">Annonceur</p>
                        <p className="text-sm font-bold text-orange-400">{formatPrice(result.details.announcerRetained || 0)}</p>
                      </div>
                      <div className="p-2 bg-violet-500/10 rounded-lg border border-violet-500/20">
                        <p className="text-[11px] text-slate-500 mb-0.5">Commission</p>
                        <p className="text-sm font-bold text-violet-400">{formatPrice(result.details.platformFeeRetained || 0)}</p>
                      </div>
                      <div className="p-2 bg-pink-500/10 rounded-lg border border-pink-500/20">
                        <p className="text-[11px] text-slate-500 mb-0.5">Frais Stripe</p>
                        <p className="text-sm font-bold text-pink-400">{formatPrice(result.details.stripeFeeRetained || 0)}</p>
                      </div>
                    </div>
                    {result.details.cancellationCount > 0 && (
                      <p className="text-xs text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Compteur annulations : {result.details.cancellationCount}
                      </p>
                    )}
                    {result.details.sessionBreakdown && (
                      <div className="text-xs text-slate-400 bg-slate-900/30 rounded-lg p-2">
                        <p className="font-medium text-slate-300 mb-1">Détail séances :</p>
                        <p>Effectuées : {result.details.sessionBreakdown.pastSessions}/{result.details.sessionBreakdown.totalSessions}</p>
                        <p>Restantes : {result.details.sessionBreakdown.remainingSessions}/{result.details.sessionBreakdown.totalSessions}</p>
                        <p>Montant restant : {formatPrice(result.details.sessionBreakdown.remainingAmount || 0)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* Section 4 : Nettoyage */}
          <Section
            title="Nettoyage"
            icon={Trash2}
            accent="slate"
            expanded={expandedSection === "cleanup"}
            onToggle={() => setExpandedSection(expandedSection === "cleanup" ? "" : "cleanup")}
          >
            <p className="text-slate-400 text-sm mb-4">Supprime les missions créées dans les 24 dernières heures et leurs données associées.</p>
            <button
              onClick={() => runAction("Nettoyage", () => cleanupMissions({ token: token! }))}
              disabled={loading === "cleanup"}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-lg text-sm transition-colors border border-red-500/30"
            >
              {loading === "cleanup" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Nettoyer les missions de test
            </button>
          </Section>

          {/* Section 5 : Logs emails */}
          <Section
            title={`Emails récents (${data.emailLogs.length})`}
            icon={Mail}
            accent="cyan"
            expanded={expandedSection === "emails"}
            onToggle={() => setExpandedSection(expandedSection === "emails" ? "" : "emails")}
          >
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {data.emailLogs.length === 0 ? (
                <p className="text-slate-500 text-sm">Aucun email récent</p>
              ) : (
                data.emailLogs.map((e: any) => (
                  <div key={e._id} className={`p-3 rounded-lg border ${
                    e.status === "sent" || e.status === "delivered"
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : e.status === "failed"
                      ? "bg-red-500/5 border-red-500/20"
                      : "bg-slate-800 border-slate-700"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          e.status === "sent" || e.status === "delivered" ? "bg-emerald-400" :
                          e.status === "failed" ? "bg-red-400" : "bg-yellow-400"
                        }`} />
                        <span className="text-sm text-white font-medium truncate max-w-[300px]">{e.subject}</span>
                      </div>
                      <span className="text-xs text-slate-500">{e.createdAt ? formatDate(e.createdAt) : ""}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-slate-400">→ {e.to}</span>
                      {e.template && <span className="text-xs px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">{e.template}</span>}
                      {e.errorMessage && <span className="text-xs text-red-400">{e.errorMessage}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Section>

          {/* Section 6 : Notifications */}
          <Section
            title={`Notifications récentes (${data.notifications.length})`}
            icon={Bell}
            accent="amber"
            expanded={expandedSection === "notifs"}
            onToggle={() => setExpandedSection(expandedSection === "notifs" ? "" : "notifs")}
          >
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {data.notifications.length === 0 ? (
                <p className="text-slate-500 text-sm">Aucune notification récente</p>
              ) : (
                data.notifications.map((n: any) => (
                  <div key={n._id} className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          n.type.includes("cancelled") ? "bg-red-500/20 text-red-400" :
                          n.type.includes("accepted") || n.type.includes("confirmed") ? "bg-emerald-500/20 text-emerald-400" :
                          n.type.includes("payment") ? "bg-blue-500/20 text-blue-400" :
                          "bg-slate-700 text-slate-300"
                        }`}>{n.type}</span>
                        <span className="text-sm text-white font-medium">{n.title}</span>
                      </div>
                      <span className="text-xs text-slate-500">{n.createdAt ? formatDate(n.createdAt) : ""}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </Section>
        </div>

        {/* ─── Colonne droite : Liste des missions ─── */}
        <div className="space-y-4">
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Missions récentes</h3>
              <button
                onClick={() => setSelectedMission(null)}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Désélectionner
              </button>
            </div>

            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
              {missions.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">Aucune mission</p>
              ) : (
                missions.map((m: any) => (
                  <button
                    key={m._id}
                    onClick={() => setSelectedMission(m._id)}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      selectedMission === m._id
                        ? "bg-violet-500/10 border-violet-500/40 ring-1 ring-violet-500/30"
                        : "bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLORS[m.status] || "text-slate-400"}`}>
                        {STATUS_LABELS[m.status] || m.status}
                      </span>
                      <span className="text-xs text-slate-500">{m.startDate}</span>
                    </div>
                    <p className="text-sm text-white font-medium truncate">{m.serviceName}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-slate-400">{m.clientName} → {m.announcerName}</span>
                      <span className="text-xs font-medium text-white">{formatPrice(m.amount)}</span>
                    </div>

                    {/* Détails financiers */}
                    <div className="mt-2 pt-2 border-t border-slate-700/50 grid grid-cols-2 gap-x-2 gap-y-1">
                      <span className="text-xs text-slate-500">Paiement :</span>
                      <span className={`text-xs font-medium ${PAYMENT_COLORS[m.paymentStatus] || "text-slate-400"}`}>
                        {m.paymentStatus}
                      </span>

                      <span className="text-xs text-slate-500">Annonceur :</span>
                      <span className={`text-xs font-medium ${PAYMENT_COLORS[m.announcerPaymentStatus || "not_due"] || "text-slate-400"}`}>
                        {m.announcerPaymentStatus || "not_due"}
                      </span>

                      {m.platformFee > 0 && (
                        <>
                          <span className="text-xs text-slate-500">Commission :</span>
                          <span className="text-xs text-slate-300">{formatPrice(m.platformFee)} ({m.commissionRate || "?"}%)</span>
                        </>
                      )}

                      {m.stripeFee > 0 && (
                        <>
                          <span className="text-xs text-slate-500">Frais Stripe :</span>
                          <span className="text-xs text-slate-300">{formatPrice(m.stripeFee)} ({m.stripeFeeRate || "?"}%)</span>
                        </>
                      )}

                      {(m.serviceAmount || m.basePrice) > 0 && (
                        <>
                          <span className="text-xs text-slate-500">Service HT :</span>
                          <span className="text-xs text-slate-300">{formatPrice(m.serviceAmount || m.basePrice)}</span>
                        </>
                      )}

                      {m.announcerEarnings > 0 && (
                        <>
                          <span className="text-xs text-slate-500">Gains ann. :</span>
                          <span className="text-xs text-emerald-400">{formatPrice(m.announcerEarnings)}</span>
                        </>
                      )}

                      {m.readyForPayout && (
                        <>
                          <span className="text-xs text-slate-500">Payout :</span>
                          <span className="text-xs text-amber-400">Prêt</span>
                        </>
                      )}

                      {m.cancelledBy && (
                        <>
                          <span className="text-xs text-slate-500">Annulé par :</span>
                          <span className="text-xs text-red-400">{m.cancelledBy}</span>
                        </>
                      )}

                      {m.refundAmount > 0 && (
                        <>
                          <span className="text-xs text-slate-500">Remboursé :</span>
                          <span className="text-xs text-red-400">{formatPrice(m.refundAmount)}</span>
                        </>
                      )}
                    </div>

                    {/* Stripe */}
                    {m.payment && (
                      <div className="mt-2 pt-2 border-t border-slate-700/50">
                        <div className="flex items-center gap-1">
                          <CreditCard className="w-3 h-3 text-slate-500" />
                          <span className="text-xs text-slate-500">Stripe : </span>
                          <span className={`text-xs font-medium ${
                            m.payment.status === "captured" ? "text-emerald-400" :
                            m.payment.status === "refunded" ? "text-red-400" :
                            m.payment.status === "cancelled" ? "text-red-400" :
                            "text-yellow-400"
                          }`}>{m.payment.status}</span>
                          {m.payment.paymentIntentId && (
                            <span className="text-xs text-slate-600 truncate max-w-[100px]">{m.payment.paymentIntentId}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Composants réutilisables ──────────────────────────────────────────

function Section({
  title, icon: Icon, accent, expanded, onToggle, children,
}: {
  title: string;
  icon: React.ElementType;
  accent: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const accentMap: Record<string, string> = {
    violet: "bg-violet-500/20 text-violet-400",
    blue: "bg-blue-500/20 text-blue-400",
    red: "bg-red-500/20 text-red-400",
    slate: "bg-slate-700/50 text-slate-400",
    cyan: "bg-cyan-500/20 text-cyan-400",
    amber: "bg-amber-500/20 text-amber-400",
    emerald: "bg-emerald-500/20 text-emerald-400",
  };

  return (
    <motion.div
      className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${accentMap[accent] || accentMap.slate}`}>
            <Icon className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FlowButton({
  label, description, icon: Icon, color, disabled, loading, onClick,
}: {
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400",
    blue: "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 text-blue-400",
    cyan: "bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-400",
    amber: "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 text-amber-400",
    green: "bg-green-500/10 border-green-500/30 hover:bg-green-500/20 text-green-400",
    orange: "bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20 text-orange-400",
    red: "bg-red-500/10 border-red-500/30 hover:bg-red-500/20 text-red-400",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`p-3 rounded-lg border text-left transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
        colorMap[color] || colorMap.blue
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-xs text-slate-500">{description}</p>
    </button>
  );
}
