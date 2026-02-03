"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/app/lib/utils";
import { Send, Loader2, AlertCircle, Search, Calendar, X, ChevronDown, Check } from "lucide-react";

interface TicketFormProps {
  sessionToken: string;
  onSuccess?: (ticketId: Id<"supportTickets">, ticketNumber: string) => void;
  className?: string;
}

// Labels de statut en français
const statusLabels: Record<string, string> = {
  pending_acceptance: "En attente d'acceptation",
  pending_confirmation: "En attente de confirmation",
  upcoming: "À venir",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
  declined: "Refusée",
};

// Couleurs de statut
const statusColors: Record<string, string> = {
  pending_acceptance: "bg-amber-100 text-amber-700",
  pending_confirmation: "bg-blue-100 text-blue-700",
  upcoming: "bg-purple-100 text-purple-700",
  in_progress: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-700",
  declined: "bg-red-100 text-red-700",
};

interface Mission {
  _id: Id<"missions">;
  reference: string;
  serviceName: string;
  startDate: string;
  endDate?: string;
  status: string;
  clientName?: string;
  announcerName?: string;
  totalPrice?: number;
  createdAt: number;
}

export function TicketForm({ sessionToken, onSuccess, className }: TicketFormProps) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [relatedMissionId, setRelatedMissionId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtres pour le sélecteur de missions
  const [missionSearch, setMissionSearch] = useState("");
  const [missionStatusFilter, setMissionStatusFilter] = useState<string>("all");
  const [showMissionSelector, setShowMissionSelector] = useState(false);

  const categories = useQuery(api.support.tickets.getTicketCategories, {
    sessionToken,
  }) as { value: string; label: string; description?: string }[] | undefined;
  const missions = useQuery(api.support.tickets.getMyMissionsForTicket, {
    sessionToken,
  }) as Mission[] | undefined;
  const createTicket = useMutation(api.support.tickets.createTicket);

  // Mission sélectionnée
  const selectedMission = useMemo(() => {
    if (!relatedMissionId || !missions) return null;
    return missions.find((m) => m._id === relatedMissionId);
  }, [relatedMissionId, missions]);

  // Filtrage des missions
  const filteredMissions = useMemo(() => {
    if (!missions) return [];

    return missions.filter((m) => {
      // Filtre par recherche (référence, nom du service)
      if (missionSearch) {
        const searchLower = missionSearch.toLowerCase();
        const matchesSearch =
          m.reference.toLowerCase().includes(searchLower) ||
          m.serviceName.toLowerCase().includes(searchLower) ||
          (m.clientName?.toLowerCase().includes(searchLower)) ||
          (m.announcerName?.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Filtre par statut
      if (missionStatusFilter !== "all" && m.status !== missionStatusFilter) {
        return false;
      }

      return true;
    });
  }, [missions, missionSearch, missionStatusFilter]);

  // Statuts disponibles pour le filtre
  const availableStatuses = useMemo(() => {
    if (!missions) return [];
    const statuses = new Set(missions.map((m) => m.status));
    return Array.from(statuses);
  }, [missions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subject.trim()) {
      setError("Veuillez entrer un sujet");
      return;
    }
    if (subject.trim().length < 5) {
      setError("Le sujet doit contenir au moins 5 caractères");
      return;
    }
    if (!category) {
      setError("Veuillez sélectionner une catégorie");
      return;
    }
    if (!message.trim()) {
      setError("Veuillez entrer un message");
      return;
    }
    if (message.trim().length < 10) {
      setError("Le message doit contenir au moins 10 caractères");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createTicket({
        sessionToken,
        subject: subject.trim(),
        category,
        message: message.trim(),
        priority,
        relatedMissionId: relatedMissionId ? (relatedMissionId as Id<"missions">) : undefined,
      });

      if (onSuccess) {
        onSuccess(result.ticketId, result.ticketNumber);
      }
    } catch (err: any) {
      // Extraire le message d'erreur Convex
      const errorMessage = err?.data?.message || err?.message || "Une erreur est survenue";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-5", className)}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Sujet */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Sujet *
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Décrivez brièvement votre problème (min. 5 caractères)"
          className={cn(
            "w-full px-4 py-2.5 rounded-xl border focus:ring-2 outline-none transition-all",
            subject.trim().length > 0 && subject.trim().length < 5
              ? "border-red-300 focus:border-red-400 focus:ring-red-100"
              : "border-gray-200 focus:border-primary focus:ring-primary/20"
          )}
          maxLength={100}
        />
        <div className="flex justify-between mt-1">
          <span className={cn(
            "text-xs",
            subject.trim().length > 0 && subject.trim().length < 5 ? "text-red-500" : "text-gray-400"
          )}>
            {subject.trim().length < 5 ? `${5 - subject.trim().length} caractères restants minimum` : ""}
          </span>
          <span className="text-xs text-gray-400">{subject.length}/100</span>
        </div>
      </div>

      {/* Catégorie */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Catégorie *
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {categories?.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={cn(
                "p-3 rounded-xl border-2 text-left transition-all",
                category === cat.value
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              )}
            >
              <span className="block text-sm font-medium">{cat.label}</span>
              {cat.description && (
                <span className="block text-xs text-gray-500 mt-0.5">{cat.description}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Priorité */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Priorité
        </label>
        <div className="flex gap-3">
          {[
            { value: "low", label: "Basse", desc: "Pas urgent" },
            { value: "medium", label: "Moyenne", desc: "Normal" },
            { value: "high", label: "Haute", desc: "Urgent" },
          ].map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriority(p.value as typeof priority)}
              className={cn(
                "flex-1 px-3 py-2 rounded-xl border-2 transition-all text-left",
                priority === p.value
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <span className="block text-sm font-medium">{p.label}</span>
              <span className="block text-xs text-gray-500">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mission liée (optionnel) - Sélecteur amélioré */}
      {missions && missions.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Lier à une réservation (optionnel)
          </label>

          {/* Mission sélectionnée ou bouton pour ouvrir */}
          {selectedMission ? (
            <div className="border border-primary/30 bg-primary/5 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                      {selectedMission.reference}
                    </span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      statusColors[selectedMission.status] || "bg-gray-100 text-gray-700"
                    )}>
                      {statusLabels[selectedMission.status] || selectedMission.status}
                    </span>
                  </div>
                  <p className="font-medium text-sm truncate">{selectedMission.serviceName}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    {formatDate(selectedMission.startDate)}
                    {selectedMission.endDate && ` → ${formatDate(selectedMission.endDate)}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRelatedMissionId("")}
                  className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowMissionSelector(!showMissionSelector)}
              className={cn(
                "w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-left",
                "hover:border-gray-300 transition-all flex items-center justify-between",
                showMissionSelector && "border-primary ring-2 ring-primary/20"
              )}
            >
              <span className="text-gray-500">Sélectionner une réservation...</span>
              <ChevronDown className={cn(
                "w-4 h-4 text-gray-400 transition-transform",
                showMissionSelector && "rotate-180"
              )} />
            </button>
          )}

          {/* Panneau de sélection de mission */}
          {showMissionSelector && !selectedMission && (
            <div className="mt-2 border border-gray-200 rounded-xl bg-white shadow-lg overflow-hidden">
              {/* Filtres */}
              <div className="p-3 border-b border-gray-100 space-y-2">
                {/* Recherche */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={missionSearch}
                    onChange={(e) => setMissionSearch(e.target.value)}
                    placeholder="Rechercher par référence, service..."
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                  />
                </div>

                {/* Filtre par statut */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setMissionStatusFilter("all")}
                    className={cn(
                      "px-3 py-1 text-xs rounded-full transition-colors",
                      missionStatusFilter === "all"
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    Tous
                  </button>
                  {availableStatuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setMissionStatusFilter(status)}
                      className={cn(
                        "px-3 py-1 text-xs rounded-full transition-colors",
                        missionStatusFilter === status
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      {statusLabels[status] || status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Liste des missions */}
              <div className="max-h-64 overflow-y-auto">
                {filteredMissions.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Aucune réservation trouvée
                  </div>
                ) : (
                  filteredMissions.map((mission) => (
                    <button
                      key={mission._id}
                      type="button"
                      onClick={() => {
                        setRelatedMissionId(mission._id);
                        setShowMissionSelector(false);
                        setMissionSearch("");
                        setMissionStatusFilter("all");
                      }}
                      className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                              {mission.reference}
                            </span>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              statusColors[mission.status] || "bg-gray-100 text-gray-700"
                            )}>
                              {statusLabels[mission.status] || mission.status}
                            </span>
                          </div>
                          <p className="font-medium text-sm truncate">{mission.serviceName}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(mission.startDate)}
                            </span>
                            {mission.totalPrice && (
                              <span className="font-medium text-gray-700">
                                {mission.totalPrice.toFixed(2)} €
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <Check className="w-4 h-4 text-gray-300" />
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Footer avec nombre de résultats */}
              <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                {filteredMissions.length} réservation{filteredMissions.length > 1 ? "s" : ""} trouvée{filteredMissions.length > 1 ? "s" : ""}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Message */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Message *
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Décrivez votre problème en détail (min. 10 caractères)..."
          rows={5}
          className={cn(
            "w-full px-4 py-3 rounded-xl border focus:ring-2 outline-none transition-all resize-none",
            message.trim().length > 0 && message.trim().length < 10
              ? "border-red-300 focus:border-red-400 focus:ring-red-100"
              : "border-gray-200 focus:border-primary focus:ring-primary/20"
          )}
        />
        <div className="flex justify-between mt-1">
          <span className={cn(
            "text-xs",
            message.trim().length > 0 && message.trim().length < 10 ? "text-red-500" : "text-gray-400"
          )}>
            {message.trim().length < 10 ? `${10 - message.trim().length} caractères restants minimum` : ""}
          </span>
          <span className="text-xs text-gray-400">{message.length} caractères</span>
        </div>
      </div>

      {/* Bouton submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          "w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full",
          "bg-primary text-white font-semibold",
          "hover:bg-primary/90 transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Envoi en cours...
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            Envoyer le ticket
          </>
        )}
      </button>
    </form>
  );
}
