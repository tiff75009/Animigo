"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import {
  ShieldCheck,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Eye,
  X,
  AlertTriangle,
  Loader2,
  Search,
  Filter,
  ExternalLink,
  CreditCard,
  Camera,
  Bot,
  Sparkles,
  Hash,
  UserCheck,
  FileCheck,
  Settings,
  Zap,
  Percent,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import Image from "next/image";
import { Id } from "@/convex/_generated/dataModel";

type VerificationStatus = "pending" | "submitted" | "approved" | "rejected";

// Interface pour les résultats de vérification IA
interface AIVerificationResult {
  codeMatch: boolean;
  codeDetected: string | null;
  faceMatch: boolean;
  faceMatchConfidence: number;
  idCardValid: boolean;
  issues: string[];
  autoApproved: boolean;
  verifiedAt: number;
}

// Type pour les requests de la liste
interface VerificationRequestItem {
  _id: Id<"verificationRequests">;
  status: VerificationStatus;
  idCardFrontUrl?: string | null;
  idCardBackUrl?: string | null;
  selfieWithCodeUrl?: string | null;
  createdAt: number;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  aiVerificationResult?: AIVerificationResult;
}

const statusConfig: Record<VerificationStatus, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending: { label: "En cours", color: "text-gray-600", bg: "bg-gray-100", icon: Clock },
  submitted: { label: "À vérifier", color: "text-blue-600", bg: "bg-blue-100", icon: Eye },
  approved: { label: "Approuvé", color: "text-green-600", bg: "bg-green-100", icon: CheckCircle },
  rejected: { label: "Rejeté", color: "text-red-600", bg: "bg-red-100", icon: XCircle },
};

function AIVerificationResults({ result, expectedCode }: { result: AIVerificationResult; expectedCode: string }) {
  const allGreen = result.codeMatch && result.faceMatch && result.idCardValid && result.autoApproved;
  const hasIssues = result.issues.length > 0;

  return (
    <div className={cn(
      "rounded-xl border p-4",
      allGreen ? "bg-green-50 border-green-200" : hasIssues ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200"
    )}>
      <div className="flex items-center gap-2 mb-4">
        <Bot className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-foreground">Vérification automatique (IA)</h3>
        {result.autoApproved && (
          <span className="ml-auto px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Auto-approuvé
          </span>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-4">
        {/* Code détecté */}
        <div className={cn(
          "p-3 rounded-lg",
          result.codeMatch ? "bg-green-100" : "bg-red-100"
        )}>
          <div className="flex items-center gap-2 mb-1">
            <Hash className="w-4 h-4" />
            <span className="text-sm font-medium">Code détecté</span>
            {result.codeMatch ? (
              <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600 ml-auto" />
            )}
          </div>
          <p className={cn(
            "font-mono text-lg font-bold",
            result.codeMatch ? "text-green-700" : "text-red-700"
          )}>
            {result.codeDetected || "Non détecté"}
          </p>
          {!result.codeMatch && result.codeDetected && (
            <p className="text-xs text-red-600 mt-1">Attendu: {expectedCode}</p>
          )}
        </div>

        {/* Correspondance visage */}
        <div className={cn(
          "p-3 rounded-lg",
          result.faceMatch ? "bg-green-100" : "bg-red-100"
        )}>
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="w-4 h-4" />
            <span className="text-sm font-medium">Visages</span>
            {result.faceMatch ? (
              <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600 ml-auto" />
            )}
          </div>
          <p className={cn(
            "text-lg font-bold",
            result.faceMatch ? "text-green-700" : "text-red-700"
          )}>
            {result.faceMatch ? "Correspondent" : "Ne correspondent pas"}
          </p>
          <p className="text-xs mt-1 text-gray-600">
            Confiance: {result.faceMatchConfidence}%
          </p>
        </div>

        {/* Validité CNI */}
        <div className={cn(
          "p-3 rounded-lg",
          result.idCardValid ? "bg-green-100" : "bg-red-100"
        )}>
          <div className="flex items-center gap-2 mb-1">
            <FileCheck className="w-4 h-4" />
            <span className="text-sm font-medium">Pièce d&apos;identité</span>
            {result.idCardValid ? (
              <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600 ml-auto" />
            )}
          </div>
          <p className={cn(
            "text-lg font-bold",
            result.idCardValid ? "text-green-700" : "text-red-700"
          )}>
            {result.idCardValid ? "Valide" : "Problème détecté"}
          </p>
        </div>
      </div>

      {/* Problèmes détectés */}
      {hasIssues && (
        <div className="p-3 bg-amber-100 rounded-lg">
          <p className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Problèmes détectés par l&apos;IA
          </p>
          <ul className="text-sm text-amber-700 space-y-1">
            {result.issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-3">
        Vérifié le {new Date(result.verifiedAt).toLocaleString("fr-FR")}
      </p>
    </div>
  );
}

// Panneau de configuration de la vérification automatique
function VerificationSettingsPanel({
  settings,
  onSave,
}: {
  settings: { autoVerifyEnabled: boolean; confidenceThreshold: number } | undefined;
  onSave: (autoVerifyEnabled: boolean, confidenceThreshold: number) => Promise<void>;
}) {
  const [autoVerifyEnabled, setAutoVerifyEnabled] = useState(settings?.autoVerifyEnabled ?? false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(settings?.confidenceThreshold ?? 80);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Sync with settings when they load
  useEffect(() => {
    if (settings && !initialized) {
      setAutoVerifyEnabled(settings.autoVerifyEnabled);
      setConfidenceThreshold(settings.confidenceThreshold);
      setInitialized(true);
    }
  }, [settings, initialized]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);
    try {
      await onSave(autoVerifyEnabled, confidenceThreshold);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = settings && (
    autoVerifyEnabled !== settings.autoVerifyEnabled ||
    confidenceThreshold !== settings.confidenceThreshold
  );

  return (
    <div className="bg-white rounded-2xl border border-foreground/5 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
          <Bot className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Vérification automatique par IA</h3>
          <p className="text-sm text-text-light">Configurer l&apos;approbation automatique des demandes</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Toggle auto-vérification */}
        <div className="p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className={cn("w-5 h-5", autoVerifyEnabled ? "text-secondary" : "text-gray-400")} />
              <div>
                <p className="font-medium text-foreground">Auto-approbation</p>
                <p className="text-sm text-text-light">
                  {autoVerifyEnabled ? "Les demandes valides sont auto-approuvées" : "Toutes les demandes nécessitent une vérification manuelle"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setAutoVerifyEnabled(!autoVerifyEnabled)}
              className={cn(
                "relative w-14 h-8 rounded-full transition-colors",
                autoVerifyEnabled ? "bg-secondary" : "bg-gray-300"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform",
                  autoVerifyEnabled ? "translate-x-7" : "translate-x-1"
                )}
              />
            </button>
          </div>
        </div>

        {/* Seuil de confiance */}
        <div className="p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <Percent className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">Seuil de confiance</p>
              <p className="text-sm text-text-light">Minimum requis pour l&apos;auto-approbation</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="50"
              max="100"
              step="5"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
              disabled={!autoVerifyEnabled}
              className={cn(
                "flex-1 h-2 rounded-full appearance-none cursor-pointer",
                autoVerifyEnabled ? "bg-primary/20" : "bg-gray-200"
              )}
              style={{
                background: autoVerifyEnabled
                  ? `linear-gradient(to right, #FF6B6B 0%, #FF6B6B ${(confidenceThreshold - 50) * 2}%, #E5E7EB ${(confidenceThreshold - 50) * 2}%, #E5E7EB 100%)`
                  : undefined,
              }}
            />
            <span className={cn(
              "w-16 text-center font-bold text-lg",
              autoVerifyEnabled ? "text-primary" : "text-gray-400"
            )}>
              {confidenceThreshold}%
            </span>
          </div>
          {autoVerifyEnabled && (
            <p className="text-xs text-text-light mt-2">
              Les demandes avec une confiance &lt; {confidenceThreshold}% nécessiteront une vérification manuelle
            </p>
          )}
        </div>
      </div>

      {/* Bouton sauvegarder */}
      <div className="flex justify-end mt-6 pt-4 border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className={cn(
            "px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2",
            hasChanges
              ? "bg-primary text-white hover:bg-primary/90"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Enregistrement...
            </>
          ) : saved ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Enregistré !
            </>
          ) : (
            "Enregistrer les paramètres"
          )}
        </button>
      </div>
    </div>
  );
}

export default function AdminVerificationsPage() {
  const { token, isLoading: authLoading } = useAdminAuth();
  const [selectedStatus, setSelectedStatus] = useState<VerificationStatus | "all">("submitted");
  const [selectedRequest, setSelectedRequest] = useState<Id<"verificationRequests"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // Query pour la liste des demandes
  const requests = useQuery(
    api.verification.verification.listVerificationRequests,
    token ? {
      sessionToken: token,
      ...(selectedStatus !== "all" && { status: selectedStatus }),
    } : "skip"
  );

  // Query pour les détails d'une demande
  const requestDetails = useQuery(
    api.verification.verification.getVerificationRequestDetails,
    token && selectedRequest ? {
      sessionToken: token,
      requestId: selectedRequest,
    } : "skip"
  );

  // Query pour les paramètres de vérification
  const verificationSettings = useQuery(
    api.admin.config.getVerificationSettings,
    token ? { token } : "skip"
  );

  // Mutations
  const approveVerification = useMutation(api.verification.verification.approveVerification);
  const rejectVerification = useMutation(api.verification.verification.rejectVerification);
  const updateVerificationSettings = useMutation(api.admin.config.updateVerificationSettings);

  // Filtrer par recherche
  const filteredRequests = (requests as VerificationRequestItem[] | undefined)?.filter((request) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      request.user?.firstName.toLowerCase().includes(query) ||
      request.user?.lastName.toLowerCase().includes(query) ||
      request.user?.email.toLowerCase().includes(query)
    );
  });

  // Compter les demandes par statut
  const counts = {
    submitted: (requests as VerificationRequestItem[] | undefined)?.filter((r) => r.status === "submitted").length || 0,
    pending: (requests as VerificationRequestItem[] | undefined)?.filter((r) => r.status === "pending").length || 0,
    approved: (requests as VerificationRequestItem[] | undefined)?.filter((r) => r.status === "approved").length || 0,
    rejected: (requests as VerificationRequestItem[] | undefined)?.filter((r) => r.status === "rejected").length || 0,
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vérifications d&apos;identité</h1>
          <p className="text-text-light mt-1">Gérez les demandes de vérification des annonceurs</p>
        </div>
        <div className="flex items-center gap-3">
          {counts.submitted > 0 && (
            <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl font-medium">
              {counts.submitted} demande{counts.submitted > 1 ? "s" : ""} en attente
            </div>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "p-2.5 rounded-xl transition-colors",
              showSettings ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Panneau de configuration */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <VerificationSettingsPanel
              settings={verificationSettings}
              onSave={async (autoVerifyEnabled, confidenceThreshold) => {
                if (!token) return;
                await updateVerificationSettings({
                  token,
                  autoVerifyEnabled,
                  confidenceThreshold,
                });
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedStatus("all")}
            className={cn(
              "px-4 py-2 rounded-xl font-medium transition-colors",
              selectedStatus === "all"
                ? "bg-foreground text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            Tous
          </button>
          {(["submitted", "pending", "approved", "rejected"] as const).map((status) => {
            const config = statusConfig[status];
            const count = counts[status];
            return (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={cn(
                  "px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2",
                  selectedStatus === status
                    ? `${config.bg} ${config.color}`
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                <config.icon className="w-4 h-4" />
                {config.label}
                {count > 0 && (
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs",
                    selectedStatus === status ? "bg-white/30" : config.bg
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Liste des demandes */}
      <div className="bg-white rounded-2xl border border-foreground/5 shadow-sm overflow-hidden">
        {!filteredRequests ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-8 text-center">
            <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune demande trouvée</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Annonceur</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Documents</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRequests.map((request) => {
                const config = statusConfig[request.status as VerificationStatus];
                const hasAllDocs = request.idCardFrontUrl && request.idCardBackUrl && request.selfieWithCodeUrl;

                return (
                  <tr key={request._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {request.user?.firstName} {request.user?.lastName}
                          </p>
                          <p className="text-sm text-text-light">{request.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium",
                        config.bg, config.color
                      )}>
                        <config.icon className="w-4 h-4" />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          request.idCardFrontUrl ? "bg-green-500" : "bg-gray-300"
                        )} title="CNI Recto" />
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          request.idCardBackUrl ? "bg-green-500" : "bg-gray-300"
                        )} title="CNI Verso" />
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          request.selfieWithCodeUrl ? "bg-green-500" : "bg-gray-300"
                        )} title="Selfie" />
                        <span className="text-sm text-text-light ml-1">
                          {hasAllDocs ? "Complet" : "Incomplet"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-text-light">
                        {new Date(request.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedRequest(request._id)}
                        className="px-4 py-2 bg-primary/10 text-primary rounded-lg font-medium hover:bg-primary/20 transition-colors"
                      >
                        Examiner
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de détails */}
      <AnimatePresence>
        {selectedRequest && requestDetails && (
          <VerificationDetailModal
            request={requestDetails}
            onClose={() => setSelectedRequest(null)}
            onApprove={async (notes) => {
              await approveVerification({
                sessionToken: token!,
                requestId: selectedRequest,
                adminNotes: notes,
              });
              setSelectedRequest(null);
            }}
            onReject={async (reason, notes) => {
              await rejectVerification({
                sessionToken: token!,
                requestId: selectedRequest,
                rejectionReason: reason,
                adminNotes: notes,
              });
              setSelectedRequest(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Modal de détails
function VerificationDetailModal({
  request,
  onClose,
  onApprove,
  onReject,
}: {
  request: any;
  onClose: () => void;
  onApprove: (notes?: string) => Promise<void>;
  onReject: (reason: string, notes?: string) => Promise<void>;
}) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApprove(adminNotes || undefined);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    setIsRejecting(true);
    try {
      await onReject(rejectionReason, adminNotes || undefined);
    } finally {
      setIsRejecting(false);
    }
  };

  const isSubmitted = request.status === "submitted";

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[900px] md:max-h-[90vh] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-foreground">Demande de vérification</h2>
            <p className="text-text-light text-sm mt-1">
              {request.user?.firstName} {request.user?.lastName} - {request.user?.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Infos utilisateur */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-text-light">Type de compte</p>
              <p className="font-medium text-foreground">
                {request.user?.accountType === "annonceur_pro" ? "Professionnel" : "Particulier"}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-text-light">Code de vérification</p>
              <p className="font-mono font-bold text-lg text-primary">{request.verificationCode}</p>
            </div>
          </div>

          {/* Résultats vérification IA */}
          {request.aiVerificationResult && (
            <AIVerificationResults result={request.aiVerificationResult} expectedCode={request.verificationCode} />
          )}

          {/* Documents */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Documents soumis</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {/* CNI Recto */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-text-light flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  CNI Recto
                </p>
                {request.idCardFrontUrl ? (
                  <button
                    onClick={() => setSelectedImage(request.idCardFrontUrl)}
                    className="relative aspect-[4/3] w-full bg-gray-100 rounded-xl overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                  >
                    <Image
                      src={request.idCardFrontUrl}
                      alt="CNI Recto"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                      <Eye className="w-6 h-6 text-white opacity-0 hover:opacity-100" />
                    </div>
                  </button>
                ) : (
                  <div className="aspect-[4/3] bg-gray-100 rounded-xl flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Non fourni</span>
                  </div>
                )}
              </div>

              {/* CNI Verso */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-text-light flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  CNI Verso
                </p>
                {request.idCardBackUrl ? (
                  <button
                    onClick={() => setSelectedImage(request.idCardBackUrl)}
                    className="relative aspect-[4/3] w-full bg-gray-100 rounded-xl overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                  >
                    <Image
                      src={request.idCardBackUrl}
                      alt="CNI Verso"
                      fill
                      className="object-cover"
                    />
                  </button>
                ) : (
                  <div className="aspect-[4/3] bg-gray-100 rounded-xl flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Non fourni</span>
                  </div>
                )}
              </div>

              {/* Selfie */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-text-light flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Selfie avec code
                </p>
                {request.selfieWithCodeUrl ? (
                  <button
                    onClick={() => setSelectedImage(request.selfieWithCodeUrl)}
                    className="relative aspect-[4/3] w-full bg-gray-100 rounded-xl overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                  >
                    <Image
                      src={request.selfieWithCodeUrl}
                      alt="Selfie"
                      fill
                      className="object-cover"
                    />
                  </button>
                ) : (
                  <div className="aspect-[4/3] bg-gray-100 rounded-xl flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Non fourni</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rappel du code */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm text-amber-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Vérifiez que le code <strong className="font-mono">{request.verificationCode}</strong> est bien visible
                sur la photo selfie et correspond au code généré pour cette demande.
              </span>
            </p>
          </div>

          {/* Notes admin */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notes internes (optionnel)
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Ajouter des notes..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              rows={2}
            />
          </div>

          {/* Formulaire de rejet */}
          {showRejectForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="p-4 bg-red-50 border border-red-200 rounded-xl"
            >
              <label className="block text-sm font-medium text-red-700 mb-2">
                Raison du rejet (sera envoyée à l&apos;utilisateur)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex: Le code sur la photo ne correspond pas, Photo floue..."
                className="w-full px-4 py-3 border border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none bg-white"
                rows={3}
              />
            </motion.div>
          )}
        </div>

        {/* Footer */}
        {isSubmitted && (
          <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
            {!showRejectForm ? (
              <>
                <button
                  onClick={() => setShowRejectForm(true)}
                  className="px-6 py-3 bg-red-100 text-red-600 rounded-xl font-medium hover:bg-red-200 transition-colors flex items-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Rejeter
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="px-6 py-3 bg-secondary text-white rounded-xl font-medium hover:bg-secondary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isApproving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  Approuver
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleReject}
                  disabled={isRejecting || !rejectionReason.trim()}
                  className="px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isRejecting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                  Confirmer le rejet
                </button>
              </>
            )}
          </div>
        )}
      </motion.div>

      {/* Modal image en plein écran */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-4xl max-h-[90vh] w-full h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={selectedImage}
                alt="Document"
                fill
                className="object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
