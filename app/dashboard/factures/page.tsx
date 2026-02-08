"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Download,
  Plus,
  Building2,
  Search,
  Loader2,
  CheckCircle,
  X,
  Eye,
  Calendar,
  Receipt,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";
import { generateInvoicePdf, type InvoiceData } from "./utils/generateInvoicePdf";

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatServiceDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function FacturesPage() {
  const { user, token } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Queries
  const invoices = useQuery(
    api.services.invoices.getAnnouncerInvoices,
    token ? { token } : "skip"
  );

  const invoiceableMissions = useQuery(
    api.services.invoices.getInvoiceableMissions,
    token ? { token } : "skip"
  );

  // Mutations
  const createInvoice = useMutation(api.services.invoices.createAnnouncerInvoice);
  const saveInvoicePdf = useMutation(api.services.invoices.saveInvoicePdf);
  const generateUploadUrl = useMutation(api.services.invoices.generateUploadUrl);

  const isProAnnouncer = user?.accountType === "annonceur_pro";

  // Filtrer les factures
  const filteredInvoices = invoices?.filter((inv: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.recipient?.name.toLowerCase().includes(q) ||
      inv.mission?.serviceName.toLowerCase().includes(q)
    );
  });

  // Créer et télécharger une facture
  const handleCreateInvoice = useCallback(
    async (missionId: Id<"missions">) => {
      if (!token) return;
      setIsCreating(true);
      try {
        // 1. Créer la facture en base
        const result = await createInvoice({ token, missionId });

        // 2. Récupérer les détails pour générer le PDF
        // On attend un instant pour que la query se rafraîchisse
        // Le PDF sera généré au téléchargement
        setShowCreateModal(false);
      } catch (error: any) {
        alert(error.message || "Erreur lors de la création de la facture");
      } finally {
        setIsCreating(false);
      }
    },
    [token, createInvoice]
  );

  // Télécharger le PDF d'une facture
  const handleDownloadPdf = useCallback(
    async (invoiceId: Id<"invoices">) => {
      if (!token) return;
      setIsDownloading(invoiceId);

      try {
        // Récupérer les détails complets
        const details = await fetch(
          `/api/invoice-details?invoiceId=${invoiceId}&token=${token}`
        ).then((r) => r.json());

        // En fait, on utilise la query Convex directement via un composant
        // Pour simplifier, on va chercher les détails depuis le cache
        // et générer le PDF côté client
      } catch (error) {
        console.error("Erreur téléchargement PDF:", error);
      } finally {
        setIsDownloading(null);
      }
    },
    [token]
  );

  if (!isProAnnouncer) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <Building2 className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-amber-800 mb-2">
            Fonctionnalité réservée aux professionnels
          </h2>
          <p className="text-amber-700 text-sm">
            La facturation est disponible uniquement pour les annonceurs professionnels (SIRET enregistré).
            Passez votre compte en mode professionnel pour accéder à cette fonctionnalité.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mes factures</h1>
            <p className="text-sm text-text-light">
              Gérez et téléchargez vos factures
            </p>
          </div>
        </div>

        {invoiceableMissions && invoiceableMissions.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-full font-semibold text-sm shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow"
          >
            <Plus className="w-4 h-4" />
            Nouvelle facture
          </motion.button>
        )}
      </div>

      {/* Infos entreprise */}
      <div className="bg-white rounded-2xl border border-foreground/10 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-4 h-4 text-text-light" />
          <h3 className="font-semibold text-sm text-foreground">Informations entreprise</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-text-light text-xs">Raison sociale</p>
            <p className="font-medium">{user?.companyName || `${user?.firstName} ${user?.lastName}`}</p>
          </div>
          <div>
            <p className="text-text-light text-xs">SIRET</p>
            <p className="font-medium font-mono text-xs">{user?.siret || "Non renseigné"}</p>
          </div>
          <div>
            <p className="text-text-light text-xs">Statut TVA</p>
            <p className="font-medium">
              {(user as any)?.isVatSubject ? (
                <span className="text-blue-600">Assujetti TVA (20%)</span>
              ) : (
                <span className="text-amber-600">Non assujetti (art. 293B)</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-text-light text-xs">Factures émises</p>
            <p className="font-medium">{invoices?.length ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Barre de recherche */}
      {invoices && invoices.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light" />
          <input
            type="text"
            placeholder="Rechercher par numéro, client ou service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-foreground/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
          />
        </div>
      )}

      {/* Liste des factures */}
      {!invoices ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-foreground/10 p-12 text-center">
          <Receipt className="w-12 h-12 text-text-light/50 mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-2">Aucune facture</h3>
          <p className="text-sm text-text-light mb-4">
            Créez votre première facture une fois qu&apos;une mission est terminée.
          </p>
          {invoiceableMissions && invoiceableMissions.length > 0 && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-primary font-semibold text-sm hover:underline"
            >
              {invoiceableMissions.length} mission{invoiceableMissions.length > 1 ? "s" : ""} facturable{invoiceableMissions.length > 1 ? "s" : ""}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInvoices?.map((invoice: any) => (
            <InvoiceRow
              key={invoice._id}
              invoice={invoice}
              token={token!}
              isDownloading={isDownloading === invoice._id}
            />
          ))}
        </div>
      )}

      {/* Modal création de facture */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateInvoiceModal
            missions={invoiceableMissions || []}
            isCreating={isCreating}
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateInvoice}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// Composant ligne de facture
// ============================================

function InvoiceRow({
  invoice,
  token,
  isDownloading,
}: {
  invoice: any;
  token: string;
  isDownloading: boolean;
}) {
  const [downloading, setDownloading] = useState(false);

  // Query pour les détails complets (pour la génération PDF)
  const invoiceDetails = useQuery(
    api.services.invoices.getInvoiceDetails,
    { token, invoiceId: invoice._id }
  );

  const handleDownload = async () => {
    if (!invoiceDetails || !invoiceDetails.emitter) return;
    setDownloading(true);

    try {
      const pdfData: InvoiceData = {
        invoiceNumber: invoiceDetails.invoiceNumber,
        createdAt: invoiceDetails.createdAt,
        amount: invoiceDetails.amount,
        amountHT: invoiceDetails.amountHT,
        tva: invoiceDetails.tva,
        items: invoiceDetails.items,
        emitter: invoiceDetails.emitter,
        emitterAddress: invoiceDetails.emitterAddress || undefined,
        recipient: invoiceDetails.recipient || { firstName: "Client", lastName: "", email: "" },
        recipientAddress: invoiceDetails.recipientAddress || undefined,
        mission: invoiceDetails.mission || undefined,
      };

      const blob = await generateInvoicePdf(pdfData);

      // Télécharger
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Facture_${invoiceDetails.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      alert("Erreur lors de la génération du PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-foreground/10 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-4">
        {/* Icône */}
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-primary" />
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-sm text-foreground font-mono">
              {invoice.invoiceNumber}
            </span>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-secondary/10 text-secondary rounded-full">
              <CheckCircle className="w-3 h-3 inline mr-0.5" />
              Émise
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-text-light">
            <span>{invoice.recipient?.name || "Client"}</span>
            <span>-</span>
            <span>{invoice.mission?.serviceName || "Service"}</span>
            {invoice.mission?.startDate && (
              <>
                <span>-</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatServiceDate(invoice.mission.startDate)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Montant */}
        <div className="text-right flex-shrink-0 mr-2">
          <div className="font-bold text-foreground">{formatPrice(invoice.amount)}</div>
          {invoice.amountHT && (
            <div className="text-[10px] text-text-light">
              HT : {formatPrice(invoice.amountHT)}
            </div>
          )}
        </div>

        {/* Date */}
        <div className="text-right flex-shrink-0 hidden sm:block mr-2">
          <div className="text-xs text-text-light">{formatDate(invoice.createdAt)}</div>
        </div>

        {/* Actions */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleDownload}
          disabled={downloading || !invoiceDetails}
          className={cn(
            "p-2.5 rounded-xl transition-colors flex-shrink-0",
            downloading
              ? "bg-slate-100 text-slate-400"
              : "bg-primary/10 text-primary hover:bg-primary/20"
          )}
          title="Télécharger le PDF"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ============================================
// Modal de création de facture
// ============================================

function CreateInvoiceModal({
  missions,
  isCreating,
  onClose,
  onCreate,
}: {
  missions: any[];
  isCreating: boolean;
  onClose: () => void;
  onCreate: (missionId: Id<"missions">) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-foreground">Créer une facture</h2>
            <p className="text-sm text-text-light">Sélectionnez une mission terminée</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-text-light" />
          </button>
        </div>

        {/* Liste des missions */}
        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-3">
          {missions.length === 0 ? (
            <div className="text-center py-8 text-text-light">
              <CheckCircle className="w-10 h-10 text-secondary mx-auto mb-3" />
              <p className="font-medium">Toutes les missions ont déjà une facture !</p>
            </div>
          ) : (
            missions.map((mission) => (
              <motion.button
                key={mission._id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onCreate(mission._id)}
                disabled={isCreating}
                className="w-full text-left p-4 rounded-xl border border-foreground/10 hover:border-primary/30 hover:bg-primary/5 transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm text-foreground">
                    {mission.serviceName}
                    {mission.variantName ? ` - ${mission.variantName}` : ""}
                  </span>
                  <span className="font-bold text-primary">
                    {formatPrice(mission.announcerEarnings || mission.amount)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-text-light">
                  <span>{mission.clientName}</span>
                  <span>-</span>
                  <span>
                    {formatServiceDate(mission.startDate)} → {formatServiceDate(mission.endDate)}
                  </span>
                </div>
                {mission.optionNames && mission.optionNames.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {mission.optionNames.map((opt: string) => (
                      <span
                        key={opt}
                        className="px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded"
                      >
                        {opt}
                      </span>
                    ))}
                  </div>
                )}
              </motion.button>
            ))
          )}
        </div>

        {isCreating && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-center gap-2 text-sm text-text-light">
            <Loader2 className="w-4 h-4 animate-spin" />
            Création en cours...
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
