"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion } from "framer-motion";
import {
  Globe,
  Loader2,
  Check,
  X,
  Trash2,
  Wrench,
  Users,
  RefreshCw,
} from "lucide-react";
import { Id, Doc } from "@/convex/_generated/dataModel";

export default function MaintenancePage() {
  const { token } = useAdminAuth();

  // États pour le mode maintenance
  const [isTogglingMaintenance, setIsTogglingMaintenance] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [manualIpName, setManualIpName] = useState("");
  const [manualIpAddress, setManualIpAddress] = useState("");
  const [isAddingIp, setIsAddingIp] = useState(false);

  // États pour la régénération de slugs
  const [isRegeneratingSlugs, setIsRegeneratingSlugs] = useState(false);
  const [slugResult, setSlugResult] = useState<{
    total: number;
    updated: number;
    unchanged: number;
    errors: number;
  } | null>(null);

  // Queries
  const isMaintenanceEnabled = useQuery(api.admin.config.isMaintenanceModeEnabled);
  const pendingVisitRequests = useQuery(
    api.maintenance.visitRequests.listPendingRequests,
    token ? { token } : "skip"
  );
  const approvedVisitRequests = useQuery(
    api.maintenance.visitRequests.listApprovedRequests,
    token ? { token } : "skip"
  );

  // Mutations
  const toggleMaintenanceMode = useMutation(api.admin.config.toggleMaintenanceMode);
  const approveRequest = useMutation(api.maintenance.visitRequests.approveRequest);
  const rejectRequest = useMutation(api.maintenance.visitRequests.rejectRequest);
  const revokeAccess = useMutation(api.maintenance.visitRequests.revokeAccess);
  const addManualIp = useMutation(api.maintenance.visitRequests.addManualIp);
  const regenerateAllSlugs = useMutation(api.admin.maintenance.regenerateAllSlugs);

  const handleToggleMaintenance = async () => {
    if (!token) return;
    setIsTogglingMaintenance(true);
    try {
      await toggleMaintenanceMode({
        token,
        enabled: !isMaintenanceEnabled,
      });
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsTogglingMaintenance(false);
    }
  };

  const handleApproveRequest = async (requestId: Id<"visitRequests">) => {
    if (!token) return;
    setProcessingRequestId(requestId);
    try {
      await approveRequest({ token, requestId });
    } catch (error) {
      console.error("Erreur lors de l'approbation:", error);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectRequest = async (requestId: Id<"visitRequests">) => {
    if (!token) return;
    setProcessingRequestId(requestId);
    try {
      await rejectRequest({ token, requestId });
    } catch (error) {
      console.error("Erreur lors du rejet:", error);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRevokeAccess = async (requestId: Id<"visitRequests">) => {
    if (!token) return;
    setProcessingRequestId(requestId);
    try {
      await revokeAccess({ token, requestId });
    } catch (error) {
      console.error("Erreur lors de la révocation:", error);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleAddManualIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !manualIpName.trim() || !manualIpAddress.trim()) return;
    setIsAddingIp(true);
    try {
      await addManualIp({
        token,
        name: manualIpName.trim(),
        ipAddress: manualIpAddress.trim(),
      });
      setManualIpName("");
      setManualIpAddress("");
    } catch (error) {
      console.error("Erreur lors de l'ajout:", error);
    } finally {
      setIsAddingIp(false);
    }
  };

  const handleRegenerateSlugs = async () => {
    if (!token) return;
    setIsRegeneratingSlugs(true);
    setSlugResult(null);
    try {
      const result = await regenerateAllSlugs({ token });
      setSlugResult({
        total: result.total,
        updated: result.updated,
        unchanged: result.unchanged,
        errors: result.errors,
      });
    } catch (error) {
      console.error("Erreur lors de la régénération des slugs:", error);
    } finally {
      setIsRegeneratingSlugs(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Wrench className="w-8 h-8 text-cyan-400" />
          Maintenance
        </h1>
        <p className="text-slate-400 mt-1">
          Mode maintenance, gestion des accès et opérations de maintenance
        </p>
      </div>

      <div className="space-y-8">
        {/* Mode Maintenance */}
        <motion.div
          className="bg-slate-900 rounded-xl p-6 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Globe className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Mode Maintenance</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
              <div className="flex-1">
                <p className="text-slate-200 font-medium">Activer le mode maintenance</p>
                <p className="text-sm text-slate-400 mt-1">
                  Quand activé, seules les IPs approuvées peuvent accéder au site.
                  Les autres visiteurs voient une page &quot;Bientôt disponible&quot;.
                </p>
              </div>
              <button
                onClick={handleToggleMaintenance}
                disabled={isTogglingMaintenance || isMaintenanceEnabled === undefined}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  isMaintenanceEnabled
                    ? "bg-emerald-500"
                    : "bg-slate-600"
                } ${isTogglingMaintenance ? "opacity-50" : ""}`}
              >
                <span
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform flex items-center justify-center ${
                    isMaintenanceEnabled ? "left-7" : "left-1"
                  }`}
                >
                  {isTogglingMaintenance ? (
                    <Loader2 className="w-4 h-4 text-slate-600 animate-spin" />
                  ) : isMaintenanceEnabled ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : null}
                </span>
              </button>
            </div>

            {isMaintenanceEnabled && (
              <div className="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <Globe className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-300">
                  Le mode maintenance est activé. Le site affiche une page &quot;Bientôt disponible&quot;
                  aux visiteurs non approuvés.
                </p>
              </div>
            )}

            {/* Demandes en attente */}
            {pendingVisitRequests && pendingVisitRequests.length > 0 && (
              <div className="mt-4">
                <h3 className="text-slate-200 font-medium mb-3 flex items-center gap-2">
                  <span>Demandes en attente</span>
                  <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
                    {pendingVisitRequests.length}
                  </span>
                </h3>
                <div className="space-y-2">
                  {pendingVisitRequests.map((request: Doc<"visitRequests">) => (
                    <div
                      key={request._id}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-200 font-medium truncate">
                          {request.name}
                        </p>
                        <p className="text-sm text-slate-400 font-mono">
                          {request.ipAddress}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleApproveRequest(request._id)}
                          disabled={processingRequestId === request._id}
                          className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors disabled:opacity-50"
                          title="Approuver"
                        >
                          {processingRequestId === request._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request._id)}
                          disabled={processingRequestId === request._id}
                          className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                          title="Rejeter"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendingVisitRequests && pendingVisitRequests.length === 0 && (
              <p className="text-slate-500 text-sm italic">
                Aucune demande d&apos;accès en attente.
              </p>
            )}

            {/* Ajouter une IP manuellement */}
            <div className="mt-4 pt-4 border-t border-slate-700">
              <h3 className="text-slate-200 font-medium mb-3">
                Ajouter une IP manuellement
              </h3>
              <form onSubmit={handleAddManualIp} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualIpName}
                    onChange={(e) => setManualIpName(e.target.value)}
                    placeholder="Nom"
                    className="flex-1 min-w-0 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    value={manualIpAddress}
                    onChange={(e) => setManualIpAddress(e.target.value)}
                    placeholder="Adresse IP"
                    className="flex-1 min-w-0 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isAddingIp || !manualIpName.trim() || !manualIpAddress.trim()}
                  className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isAddingIp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Ajout en cours...
                    </>
                  ) : (
                    "Ajouter"
                  )}
                </button>
              </form>
              <p className="text-xs text-slate-500 mt-2">
                Tu peux trouver ton IP sur{" "}
                <a
                  href="https://whatismyipaddress.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline"
                >
                  whatismyipaddress.com
                </a>
              </p>
            </div>

            {/* IPs approuvées */}
            {approvedVisitRequests && approvedVisitRequests.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-700">
                <h3 className="text-slate-200 font-medium mb-3 flex items-center gap-2">
                  <span>IPs approuvées</span>
                  <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">
                    {approvedVisitRequests.length}
                  </span>
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {approvedVisitRequests.map((request: Doc<"visitRequests">) => (
                    <div
                      key={request._id}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-200 font-medium truncate">
                          {request.name}
                        </p>
                        <p className="text-sm text-slate-400 font-mono">
                          {request.ipAddress}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRevokeAccess(request._id)}
                        disabled={processingRequestId === request._id}
                        className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50 ml-4"
                        title="Révoquer l'accès"
                      >
                        {processingRequestId === request._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Régénération des slugs */}
        <motion.div
          className="bg-slate-900 rounded-xl p-6 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Wrench className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Opérations de maintenance</h2>
            <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">
              Temporaire
            </span>
          </div>

          <div className="p-4 bg-slate-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-cyan-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-white font-medium">Régénérer les slugs utilisateurs</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Régénère les slugs URL au format <code className="bg-slate-700 px-1 rounded">prenom-ville</code> (ex: marie-paris, jean-lyon-2).
                  Les slugs seront mis à jour pour tous les utilisateurs avec leur ville de profil.
                </p>

                {slugResult && (
                  <div className={`mt-3 p-3 rounded-lg ${
                    slugResult.errors > 0
                      ? "bg-amber-500/10 border border-amber-500/30"
                      : "bg-green-500/10 border border-green-500/30"
                  }`}>
                    <p className={slugResult.errors > 0 ? "text-amber-300" : "text-green-300"}>
                      <strong>{slugResult.updated}</strong> slugs mis à jour, <strong>{slugResult.unchanged}</strong> inchangés sur <strong>{slugResult.total}</strong> utilisateurs.
                      {slugResult.errors > 0 && (
                        <span className="text-amber-400"> ({slugResult.errors} erreurs)</span>
                      )}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleRegenerateSlugs}
                  disabled={isRegeneratingSlugs}
                  className="mt-3 flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isRegeneratingSlugs ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Régénération en cours...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Régénérer tous les slugs
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
