"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Download,
  Loader2,
  Receipt,
  Calendar,
  User,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";
import { generateInvoicePdf, type InvoiceData } from "@/app/dashboard/factures/utils/generateInvoicePdf";

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

export default function ClientFacturesPage() {
  const { token } = useAuth();

  const invoices = useQuery(
    api.services.invoices.getClientInvoices,
    token ? { token } : "skip"
  );

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mes factures</h1>
          <p className="text-sm text-text-light">
            Factures reçues pour vos réservations
          </p>
        </div>
      </div>

      {/* Section Reçus de paiement (générés automatiquement par Animigo) */}
      <ClientReceiptsSection token={token} />

      {/* Section Factures (émises par les annonceurs) */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-light mb-3 mt-6">
          Factures
        </h2>
        {!invoices ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-foreground/10 p-12 text-center">
            <Receipt className="w-12 h-12 text-text-light/50 mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Aucune facture</h3>
            <p className="text-sm text-text-light">
              Vous recevrez des factures une fois que vos prestataires en auront émis pour vos réservations terminées.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice: any) => (
              <ClientInvoiceRow
                key={invoice._id}
                invoice={invoice}
                token={token!}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section Reçus de paiement (auto-générés au paiement Stripe) ───
function ClientReceiptsSection({ token }: { token: string | null }) {
  const receipts = useQuery(
    api.api.clientReceiptQueries.getMyReceipts,
    token ? { token } : "skip"
  );

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-text-light mb-3">
        Reçus de paiement
      </h2>
      {!receipts ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
      ) : receipts.length === 0 ? (
        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6 text-center">
          <Receipt className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm text-emerald-800 font-medium">
            Aucun reçu de paiement disponible
          </p>
          <p className="text-xs text-emerald-700/80 mt-1">
            Un reçu sera automatiquement généré et disponible ici après chaque paiement.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {receipts.map((r: any) => (
            <ClientReceiptRow key={r.missionId} receipt={r} token={token!} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClientReceiptRow({
  receipt,
  token,
}: {
  receipt: { missionId: string; serviceName: string; missionDate: string; amount: number; receiptGeneratedAt?: number };
  token: string;
}) {
  const data = useQuery(api.api.clientReceiptQueries.getClientReceiptUrl, {
    token,
    missionId: receipt.missionId as Id<"missions">,
  });

  const handleDownload = () => {
    if (!data?.url) return;
    // Si c'est un data URL (base64 fallback), créer un Blob pour téléchargement fiable
    // (window.open d'un data URL volumineux est souvent bloqué/tronqué par les navigateurs).
    if (data.url.startsWith("data:application/pdf;base64,")) {
      const base64 = data.url.split(",")[1];
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = data.filename || `recu-paiement-${String(receipt.missionId).slice(-6).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } else {
      window.open(data.url, "_blank");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-foreground/10 p-4 flex items-center gap-3 hover:border-emerald-200 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
        <Receipt className="w-5 h-5 text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-foreground truncate m-0">
          {receipt.serviceName}
        </p>
        <p className="text-[12px] text-text-light m-0 mt-0.5 flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatServiceDate(receipt.missionDate)}
          </span>
          <span>·</span>
          <span className="font-semibold text-emerald-700">{formatPrice(receipt.amount)}</span>
        </p>
      </div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={!data?.url}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
        title={data?.url ? "Télécharger le reçu PDF" : "Reçu indisponible"}
      >
        <Download className="w-3 h-3" />
        Télécharger
      </button>
    </div>
  );
}

function ClientInvoiceRow({
  invoice,
  token,
}: {
  invoice: any;
  token: string;
}) {
  const [downloading, setDownloading] = useState(false);

  const invoiceDetails = useQuery(
    api.services.invoices.getInvoiceDetails,
    { token, invoiceId: invoice._id }
  );

  // Query pour le bundle pdfme (template admin + inputs)
  const pdfBundle = useQuery(
    api.services.pdfGeneratorQueries.getInvoicePdfBundle,
    { token, invoiceId: invoice._id }
  );

  const handleDownload = async () => {
    if (!invoiceDetails || !invoiceDetails.emitter) return;
    setDownloading(true);

    try {
      // 1. Si un template admin pdfme est configuré, générer côté client avec pdfme
      if (pdfBundle?.templateJson) {
        const { generatePdfFromTemplate } = await import("@/app/lib/generatePdfFromTemplate");
        const blob = await generatePdfFromTemplate(pdfBundle.templateJson, pdfBundle.inputs);

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Facture_${invoiceDetails.invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }

      // 2. Fallback : génération jsPDF côté client (pas de template admin)
      const pdfData: InvoiceData = {
        invoiceNumber: invoiceDetails.invoiceNumber,
        createdAt: invoiceDetails.createdAt,
        amount: invoiceDetails.amount,
        amountHT: invoiceDetails.amountHT,
        tva: invoiceDetails.tva,
        vatRate: invoiceDetails.vatRate,
        items: invoiceDetails.items,
        emitter: invoiceDetails.emitter,
        emitterAddress: invoiceDetails.emitterAddress || undefined,
        recipient: invoiceDetails.recipient || { firstName: "Client", lastName: "", email: "" },
        recipientAddress: invoiceDetails.recipientAddress || undefined,
        mission: invoiceDetails.mission ? {
          serviceName: invoiceDetails.mission.serviceName,
          variantName: invoiceDetails.mission.variantName,
          startDate: invoiceDetails.mission.startDate,
          endDate: invoiceDetails.mission.endDate,
          serviceCategory: invoiceDetails.mission.serviceCategory,
          startTime: invoiceDetails.mission.startTime,
          endTime: invoiceDetails.mission.endTime,
          animal: invoiceDetails.mission.animal,
          animals: invoiceDetails.mission.animals,
          animalCount: invoiceDetails.mission.animalCount,
          sessions: invoiceDetails.mission.sessions,
          sessionType: invoiceDetails.mission.sessionType,
          numberOfSessions: invoiceDetails.mission.numberOfSessions,
          serviceLocation: invoiceDetails.mission.serviceLocation,
          includeOvernightStay: invoiceDetails.mission.includeOvernightStay,
          overnightNights: invoiceDetails.mission.overnightNights,
        } : undefined,
        serviceTypeSlug: invoiceDetails.serviceTypeSlug,
        emitterLogoUrl: invoiceDetails.emitterLogoUrl || undefined,
        platformFee: invoiceDetails.mission?.platformFee,
        stripeFee: invoiceDetails.mission?.stripeFee,
        commissionRate: invoiceDetails.mission?.commissionRate,
        stripeFeeRate: invoiceDetails.mission?.stripeFeeRate,
      };

      const blob = await generateInvoicePdf(pdfData);

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
          </div>
          <div className="flex items-center gap-3 text-xs text-text-light">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {invoice.emitter?.companyName || invoice.emitter?.name || "Prestataire"}
            </span>
            {invoice.mission?.serviceName && (
              <>
                <span>-</span>
                <span>{invoice.mission.serviceName}</span>
              </>
            )}
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
          <div className="font-bold text-foreground">
            {formatPrice(
              invoice.amount
              + (invoice.mission?.platformFee || 0)
              + (invoice.mission?.stripeFee || 0)
            )}
          </div>
          {((invoice.mission?.platformFee || 0) + (invoice.mission?.stripeFee || 0)) > 0 && (
            <div className="text-[10px] text-text-light">
              dont frais : {formatPrice((invoice.mission?.platformFee || 0) + (invoice.mission?.stripeFee || 0))}
            </div>
          )}
        </div>

        {/* Date */}
        <div className="text-right flex-shrink-0 hidden sm:block mr-2">
          <div className="text-xs text-text-light">{formatDate(invoice.createdAt)}</div>
        </div>

        {/* Télécharger */}
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
