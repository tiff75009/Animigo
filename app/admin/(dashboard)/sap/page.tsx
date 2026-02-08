"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import {
  FileCheck,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  User,
  X,
  AlertTriangle,
  Loader2,
  Search,
  ExternalLink,
  Ban,
  Building,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Id } from "@/convex/_generated/dataModel";

type SapStatus = "pending" | "submitted" | "approved" | "rejected" | "revoked";

interface SapDeclarationItem {
  _id: Id<"sapDeclarations">;
  status: SapStatus;
  sapDeclarationNumber?: string | null;
  sapReceiptUrl?: string | null;
  exclusivityAttested?: boolean;
  createdAt: number;
  submittedAt?: number;
  reviewedAt?: number;
  rejectionReason?: string;
  adminNotes?: string;
  user?: {
    id: Id<"users">;
    firstName: string;
    lastName: string;
    email: string;
    accountType: string;
    companyName?: string;
    siret?: string;
  } | null;
}

const statusConfig: Record<SapStatus, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending: { label: "Brouillon", color: "text-slate-400", bg: "bg-slate-700/50", icon: Clock },
  submitted: { label: "A vérifier", color: "text-blue-400", bg: "bg-blue-500/20", icon: Eye },
  approved: { label: "Approuvé", color: "text-green-400", bg: "bg-green-500/20", icon: CheckCircle },
  rejected: { label: "Rejeté", color: "text-red-400", bg: "bg-red-500/20", icon: XCircle },
  revoked: { label: "Révoqué", color: "text-orange-400", bg: "bg-orange-500/20", icon: Ban },
};

export default function AdminSapPage() {
  const { token } = useAdminAuth();
  const [filterStatus, setFilterStatus] = useState<SapStatus | "all">("submitted");
  const [selectedDeclaration, setSelectedDeclaration] = useState<SapDeclarationItem | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [revokeReason, setRevokeReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Queries
  const declarations = useQuery(
    api.sap.declarations.listSapDeclarations,
    token ? {
      sessionToken: token,
      ...(filterStatus !== "all" ? { status: filterStatus as SapStatus } : {}),
    } : "skip"
  ) as SapDeclarationItem[] | undefined;

  // Mutations
  const approveDeclaration = useMutation(api.sap.declarations.approveSapDeclaration);
  const rejectDeclaration = useMutation(api.sap.declarations.rejectSapDeclaration);
  const revokeDeclaration = useMutation(api.sap.declarations.revokeSapDeclaration);

  const handleApprove = async (declaration: SapDeclarationItem) => {
    if (!token) return;
    setIsProcessing(true);
    try {
      await approveDeclaration({
        sessionToken: token,
        declarationId: declaration._id,
        adminNotes: adminNotes || undefined,
      });
      setSelectedDeclaration(null);
      setAdminNotes("");
    } catch (error) {
      console.error("Erreur approbation SAP:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!token || !selectedDeclaration || !rejectionReason.trim()) return;
    setIsProcessing(true);
    try {
      await rejectDeclaration({
        sessionToken: token,
        declarationId: selectedDeclaration._id,
        rejectionReason: rejectionReason.trim(),
        adminNotes: adminNotes || undefined,
      });
      setSelectedDeclaration(null);
      setShowRejectModal(false);
      setRejectionReason("");
      setAdminNotes("");
    } catch (error) {
      console.error("Erreur rejet SAP:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevoke = async () => {
    if (!token || !selectedDeclaration || !revokeReason.trim()) return;
    setIsProcessing(true);
    try {
      await revokeDeclaration({
        sessionToken: token,
        declarationId: selectedDeclaration._id,
        reason: revokeReason.trim(),
      });
      setSelectedDeclaration(null);
      setShowRevokeModal(false);
      setRevokeReason("");
    } catch (error) {
      console.error("Erreur révocation SAP:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const filters: { value: SapStatus | "all"; label: string }[] = [
    { value: "submitted", label: "A vérifier" },
    { value: "approved", label: "Approuvées" },
    { value: "rejected", label: "Rejetées" },
    { value: "revoked", label: "Révoquées" },
    { value: "all", label: "Toutes" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileCheck className="w-7 h-7 text-blue-400" />
            Déclarations SAP
          </h1>
          <p className="text-slate-400 mt-1">Gestion des déclarations Services à la Personne</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilterStatus(f.value)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              filterStatus === f.value
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {declarations === undefined ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
        ) : declarations.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucune déclaration SAP</p>
          </div>
        ) : (
          declarations.map((decl) => {
            const config = statusConfig[decl.status];
            const StatusIcon = config.icon;

            return (
              <motion.div
                key={decl._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-400" />
                    </div>

                    {/* Infos */}
                    <div>
                      <p className="font-medium text-white">
                        {decl.user?.firstName} {decl.user?.lastName}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <span>{decl.user?.email}</span>
                        {decl.user?.companyName && (
                          <>
                            <span className="text-slate-600">|</span>
                            <span className="flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              {decl.user.companyName}
                            </span>
                          </>
                        )}
                      </div>
                      {decl.sapDeclarationNumber && (
                        <p className="text-xs text-slate-500 mt-1">
                          N° SAP : {decl.sapDeclarationNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Badge statut */}
                    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium", config.bg, config.color)}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {config.label}
                    </span>

                    {/* Date */}
                    <span className="text-xs text-slate-500">
                      {new Date(decl.submittedAt ?? decl.createdAt).toLocaleDateString("fr-FR")}
                    </span>

                    {/* Bouton détails */}
                    <button
                      onClick={() => setSelectedDeclaration(decl)}
                      className="p-2 rounded-lg bg-slate-700 text-slate-400 hover:text-white hover:bg-slate-600 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Modal détails */}
      <AnimatePresence>
        {selectedDeclaration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedDeclaration(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header modal */}
              <div className="flex items-center justify-between p-6 border-b border-slate-700">
                <h2 className="text-lg font-bold text-white">Déclaration SAP</h2>
                <button
                  onClick={() => setSelectedDeclaration(null)}
                  className="p-2 rounded-lg hover:bg-slate-700 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenu */}
              <div className="p-6 space-y-4">
                {/* Prestataire */}
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Prestataire</label>
                  <p className="text-white font-medium mt-1">
                    {selectedDeclaration.user?.firstName} {selectedDeclaration.user?.lastName}
                  </p>
                  <p className="text-sm text-slate-400">{selectedDeclaration.user?.email}</p>
                  {selectedDeclaration.user?.companyName && (
                    <p className="text-sm text-slate-400">{selectedDeclaration.user.companyName}</p>
                  )}
                  {selectedDeclaration.user?.siret && (
                    <p className="text-sm text-slate-400">SIRET : {selectedDeclaration.user.siret}</p>
                  )}
                </div>

                {/* N° déclaration */}
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wider">N° Déclaration SAP</label>
                  <p className="text-white mt-1">{selectedDeclaration.sapDeclarationNumber || "Non renseigné"}</p>
                </div>

                {/* Récépissé */}
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Récépissé DDETS</label>
                  {selectedDeclaration.sapReceiptUrl ? (
                    <a
                      href={selectedDeclaration.sapReceiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 mt-1 text-blue-400 hover:text-blue-300 text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Voir le document
                    </a>
                  ) : (
                    <p className="text-slate-500 mt-1">Non uploadé</p>
                  )}
                </div>

                {/* Attestation exclusivité */}
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Attestation exclusivité SAP</label>
                  <p className={cn("mt-1", selectedDeclaration.exclusivityAttested ? "text-green-400" : "text-red-400")}>
                    {selectedDeclaration.exclusivityAttested ? "Attesté" : "Non attesté"}
                  </p>
                </div>

                {/* Statut */}
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Statut</label>
                  <div className="mt-1">
                    {(() => {
                      const config = statusConfig[selectedDeclaration.status];
                      const StatusIcon = config.icon;
                      return (
                        <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium", config.bg, config.color)}>
                          <StatusIcon className="w-4 h-4" />
                          {config.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Motif rejet/révocation */}
                {selectedDeclaration.rejectionReason && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                    <p className="text-xs text-red-400 uppercase font-medium mb-1">
                      {selectedDeclaration.status === "revoked" ? "Motif de révocation" : "Motif de rejet"}
                    </p>
                    <p className="text-sm text-red-300">{selectedDeclaration.rejectionReason}</p>
                  </div>
                )}

                {/* Notes admin */}
                {selectedDeclaration.status === "submitted" && (
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wider">Notes admin (optionnel)</label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Notes internes..."
                      className="w-full mt-1 p-3 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      rows={2}
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-slate-700 flex gap-3">
                {selectedDeclaration.status === "submitted" && (
                  <>
                    <button
                      onClick={() => handleApprove(selectedDeclaration)}
                      disabled={isProcessing}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500 transition-colors disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Approuver
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={isProcessing}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-500 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Rejeter
                    </button>
                  </>
                )}
                {selectedDeclaration.status === "approved" && (
                  <button
                    onClick={() => setShowRevokeModal(true)}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-500 transition-colors disabled:opacity-50"
                  >
                    <Ban className="w-4 h-4" />
                    Révoquer
                  </button>
                )}
                <button
                  onClick={() => setSelectedDeclaration(null)}
                  className="px-4 py-3 bg-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-600 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal rejet */}
      <AnimatePresence>
        {showRejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4"
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Rejeter la déclaration SAP</h3>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Motif du rejet (obligatoire)..."
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  rows={3}
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleReject}
                    disabled={!rejectionReason.trim() || isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-500 transition-colors disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Confirmer le rejet
                  </button>
                  <button
                    onClick={() => setShowRejectModal(false)}
                    className="px-4 py-3 bg-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-600 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal révocation */}
      <AnimatePresence>
        {showRevokeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4"
            onClick={() => setShowRevokeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="text-lg font-bold text-white mb-2">Révoquer la déclaration SAP</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Le prestataire perdra son statut SAP et le taux réduit ne sera plus appliqué.
                </p>
                <textarea
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="Raison de la révocation (obligatoire)..."
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  rows={3}
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleRevoke}
                    disabled={!revokeReason.trim() || isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-500 transition-colors disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                    Confirmer la révocation
                  </button>
                  <button
                    onClick={() => setShowRevokeModal(false)}
                    className="px-4 py-3 bg-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-600 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
