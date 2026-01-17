"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Check,
  X,
  Eye,
  Loader2,
  AlertTriangle,
  User,
  Euro,
  Clock,
  Filter,
  RefreshCw,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

type FilterStatus = "all" | "pending" | "approved" | "rejected";

export default function ServiceModerationPage() {
  const { token } = useAdminAuth();
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [moderationNote, setModerationNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Queries
  const moderationStats = useQuery(
    api.admin.moderation.getModerationStats,
    token ? { token } : "skip"
  );

  const servicesData = useQuery(
    api.admin.moderation.getAllServicesForModeration,
    token ? { token, status: filter, limit: 100 } : "skip"
  );

  // Mutations
  const approveService = useMutation(api.admin.moderation.approveService);
  const rejectService = useMutation(api.admin.moderation.rejectService);
  const resetToModeration = useMutation(api.admin.moderation.resetToModeration);

  // Handle approve
  const handleApprove = async (serviceId: Id<"services">) => {
    if (!token) return;
    setIsProcessing(true);
    try {
      await approveService({ token, serviceId, note: moderationNote || undefined });
      setSelectedService(null);
      setModerationNote("");
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle reject
  const handleReject = async (serviceId: Id<"services">) => {
    if (!token || !moderationNote.trim()) {
      alert("Une note explicative est requise pour le rejet");
      return;
    }
    setIsProcessing(true);
    try {
      await rejectService({ token, serviceId, note: moderationNote });
      setSelectedService(null);
      setModerationNote("");
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle reset
  const handleReset = async (serviceId: Id<"services">) => {
    if (!token || !confirm("Remettre ce service en modération ?")) return;
    try {
      await resetToModeration({ token, serviceId });
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  // Format price (handles optional price with basePrice fallback)
  const formatPrice = (cents: number | undefined, unit?: string) => {
    if (cents === undefined) return "Prix non défini";
    const price = (cents / 100).toFixed(2).replace(".", ",");
    if (!unit) return `${price}€`;
    const unitLabels: Record<string, string> = {
      hour: "/h",
      day: "/jour",
      week: "/sem",
      month: "/mois",
      flat: "",
    };
    return `${price}€${unitLabels[unit] || ""}`;
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-amber-500" />
            Modération des services
          </h1>
          <p className="text-slate-400 mt-1">
            Examinez et modérez les services signalés ou en attente
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total</p>
              <p className="text-2xl font-bold text-white">{moderationStats?.total || 0}</p>
            </div>
            <ShieldAlert className="w-8 h-8 text-slate-500" />
          </div>
        </div>
        <div
          onClick={() => setFilter("pending")}
          className={`bg-slate-800 rounded-xl p-4 border cursor-pointer transition-colors ${
            filter === "pending" ? "border-amber-500" : "border-slate-700 hover:border-slate-600"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">En attente</p>
              <p className="text-2xl font-bold text-amber-500">{moderationStats?.pending || 0}</p>
            </div>
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
        </div>
        <div
          onClick={() => setFilter("approved")}
          className={`bg-slate-800 rounded-xl p-4 border cursor-pointer transition-colors ${
            filter === "approved" ? "border-green-500" : "border-slate-700 hover:border-slate-600"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Approuvés</p>
              <p className="text-2xl font-bold text-green-500">{moderationStats?.approved || 0}</p>
            </div>
            <ShieldCheck className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div
          onClick={() => setFilter("rejected")}
          className={`bg-slate-800 rounded-xl p-4 border cursor-pointer transition-colors ${
            filter === "rejected" ? "border-red-500" : "border-slate-700 hover:border-slate-600"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Rejetés</p>
              <p className="text-2xl font-bold text-red-500">{moderationStats?.rejected || 0}</p>
            </div>
            <ShieldX className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["all", "pending", "approved", "rejected"] as FilterStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === status
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {status === "all" && "Tous"}
            {status === "pending" && "En attente"}
            {status === "approved" && "Approuvés"}
            {status === "rejected" && "Rejetés"}
          </button>
        ))}
      </div>

      {/* Services list */}
      <div className="space-y-4">
        {servicesData?.services.map((service) => (
          <motion.div
            key={service.id}
            layout
            className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden"
          >
            {/* Service header */}
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {/* Status badge */}
                    {service.moderationStatus === "pending" && (
                      <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        En attente
                      </span>
                    )}
                    {service.moderationStatus === "approved" && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Approuvé
                      </span>
                    )}
                    {service.moderationStatus === "rejected" && (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full flex items-center gap-1">
                        <ShieldX className="w-3 h-3" />
                        Rejeté
                      </span>
                    )}
                    <h3 className="text-lg font-semibold text-white">{service.name || service.category}</h3>
                    <span className="text-slate-400 text-sm">
                      {service.basePrice ? `À partir de ${formatPrice(service.basePrice)}` : formatPrice(service.price, service.priceUnit)}
                    </span>
                  </div>

                  {service.description && (
                    <p className="text-slate-300 mb-3">{service.description}</p>
                  )}

                  {/* Moderation note */}
                  {service.moderationNote && (
                    <div className="flex items-start gap-2 p-3 bg-slate-700/50 rounded-lg mb-3">
                      <Eye className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-slate-300">Note du modérateur</p>
                        <p className="text-sm text-slate-400">{service.moderationNote}</p>
                      </div>
                    </div>
                  )}

                  {/* User info */}
                  {service.user && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <User className="w-4 h-4" />
                      <span>
                        {service.user.firstName} {service.user.lastName}
                      </span>
                      <span className="text-slate-600">|</span>
                      <span>{service.user.email}</span>
                      <span className="text-slate-600">|</span>
                      <span className="capitalize">
                        {service.user.accountType.replace("_", " ")}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <span>Créé le {formatDate(service.createdAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  {service.moderationStatus === "pending" && (
                    <>
                      <button
                        onClick={() =>
                          setSelectedService(
                            selectedService === service.id ? null : service.id
                          )
                        }
                        className="p-2 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded-lg transition-colors"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleApprove(service.id)}
                        disabled={isProcessing}
                        className="p-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() =>
                          setSelectedService(
                            selectedService === service.id ? null : service.id
                          )
                        }
                        className="p-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  {(service.moderationStatus === "approved" ||
                    service.moderationStatus === "rejected") && (
                    <button
                      onClick={() => handleReset(service.id)}
                      className="p-2 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded-lg transition-colors"
                      title="Remettre en modération"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Moderation panel */}
            <AnimatePresence>
              {selectedService === service.id && service.moderationStatus === "pending" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-slate-700"
                >
                  <div className="p-4 bg-slate-900/50">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Note de modération (obligatoire pour le rejet)
                    </label>
                    <textarea
                      value={moderationNote}
                      onChange={(e) => setModerationNote(e.target.value)}
                      placeholder="Expliquez votre décision..."
                      rows={3}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                    />
                    <div className="flex justify-end gap-3 mt-4">
                      <button
                        onClick={() => {
                          setSelectedService(null);
                          setModerationNote("");
                        }}
                        className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => handleApprove(service.id)}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-4 h-4" />
                        )}
                        Approuver
                      </button>
                      <button
                        onClick={() => handleReject(service.id)}
                        disabled={isProcessing || !moderationNote.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ShieldX className="w-4 h-4" />
                        )}
                        Rejeter
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {/* Empty state */}
        {servicesData?.services.length === 0 && (
          <div className="text-center py-12">
            <ShieldCheck className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">Aucun service à afficher</p>
            <p className="text-slate-500 text-sm">
              {filter === "pending"
                ? "Aucun service en attente de modération"
                : `Aucun service ${filter === "approved" ? "approuvé" : "rejeté"}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
