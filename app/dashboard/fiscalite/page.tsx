"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Receipt,
  Download,
  ChevronDown,
  Wallet,
  ClipboardList,
  Info,
  ExternalLink,
  FileText,
  Building2,
  User,
  Calendar,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/hooks/useAuth";

function formatEuros(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// Génération du PDF côté client avec jsPDF
// La commission est payée par le client en sus du prix du service.
// L'annonceur perçoit 100% du prix de son service (announcerEarnings).
async function generateFiscalPDF(data: {
  year: number;
  userInfo: { firstName: string; lastName: string; accountType: string; siret?: string; companyName?: string };
  totalEarnings: number;
  missionCount: number;
  monthlyBreakdown: { month: string; missions: number; earnings: number }[];
  missionDetails: { date: string; clientName: string; service: string; earnings: number }[];
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // --- En-tête ---
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 107, 107); // #FF6B6B
  doc.text("Animigo", 20, y);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text(`Récapitulatif fiscal ${data.year}`, pageWidth - 20, y, { align: "right" });
  y += 5;

  doc.setFontSize(9);
  doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, pageWidth - 20, y + 5, { align: "right" });
  y += 15;

  // Ligne séparatrice
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.5);
  doc.line(20, y, pageWidth - 20, y);
  y += 10;

  // --- Informations annonceur ---
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40);
  doc.text("Informations annonceur", 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Nom : ${data.userInfo.firstName} ${data.userInfo.lastName}`, 20, y);
  y += 6;
  doc.text(`Statut : ${data.userInfo.accountType === "annonceur_pro" ? "Professionnel" : "Particulier"}`, 20, y);
  y += 6;
  if (data.userInfo.siret) {
    doc.text(`SIRET : ${data.userInfo.siret}`, 20, y);
    y += 6;
  }
  if (data.userInfo.companyName) {
    doc.text(`Entreprise : ${data.userInfo.companyName}`, 20, y);
    y += 6;
  }
  y += 5;

  // --- Totaux ---
  doc.setFillColor(255, 249, 240); // #FFF9F0
  doc.roundedRect(20, y, pageWidth - 40, 30, 3, 3, "F");
  y += 10;

  const colWidth = (pageWidth - 40) / 2;
  const labels = ["Vos revenus", "Missions"];
  const values = [
    formatEuros(data.totalEarnings),
    String(data.missionCount),
  ];
  for (let i = 0; i < 2; i++) {
    const x = 20 + colWidth * i + colWidth / 2;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(labels[i], x, y, { align: "center" });
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text(values[i], x, y + 10, { align: "center" });
  }
  y += 28;

  // --- Tableau mensuel ---
  y += 5;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40);
  doc.text("Ventilation mensuelle", 20, y);
  y += 8;

  // Header
  const cols = [20, 75, 110, pageWidth - 20];
  doc.setFillColor(245, 245, 245);
  doc.rect(20, y - 4, pageWidth - 40, 8, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("Mois", cols[0] + 2, y);
  doc.text("Missions", cols[1] + 2, y);
  doc.text("Revenus", cols[2] + 2, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  for (const row of data.monthlyBreakdown) {
    if (row.missions === 0) continue;
    doc.setFontSize(9);
    doc.text(row.month, cols[0] + 2, y);
    doc.text(String(row.missions), cols[1] + 2, y);
    doc.setFont("helvetica", "bold");
    doc.text(formatEuros(row.earnings), cols[2] + 2, y);
    doc.setFont("helvetica", "normal");
    y += 7;

    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  }

  // Ligne total
  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, pageWidth - 20, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TOTAL", cols[0] + 2, y);
  doc.text(String(data.missionCount), cols[1] + 2, y);
  doc.setTextColor(255, 107, 107);
  doc.text(formatEuros(data.totalEarnings), cols[2] + 2, y);
  y += 12;

  // --- Détail missions ---
  if (data.missionDetails.length > 0) {
    if (y > 230) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text("Détail des missions", 20, y);
    y += 8;

    // Header
    const detCols = [20, 48, 95, 140, pageWidth - 20];
    doc.setFillColor(245, 245, 245);
    doc.rect(20, y - 4, pageWidth - 40, 8, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text("Date", detCols[0] + 2, y);
    doc.text("Service", detCols[1] + 2, y);
    doc.text("Client", detCols[2] + 2, y);
    doc.text("Revenus", detCols[3] + 2, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8);

    for (const m of data.missionDetails) {
      doc.text(formatDate(m.date), detCols[0] + 2, y);
      doc.text(m.service.substring(0, 25), detCols[1] + 2, y);
      doc.text(m.clientName.substring(0, 22), detCols[2] + 2, y);
      doc.setFont("helvetica", "bold");
      doc.text(formatEuros(m.earnings), detCols[3] + 2, y);
      doc.setFont("helvetica", "normal");
      y += 6;

      if (y > 275) {
        doc.addPage();
        y = 20;
      }
    }
  }

  // --- Mention légale ---
  y = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(160, 160, 160);
  doc.text(
    "Document informatif généré par Animigo — ne constitue pas une facture.",
    pageWidth / 2,
    y,
    { align: "center" }
  );

  doc.save(`Animigo_Recapitulatif_Fiscal_${data.year}.pdf`);
}

export default function FiscalitePage() {
  const { token, user } = useAuth();
  const isPro = user?.accountType === "annonceur_pro";
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isGenerating, setIsGenerating] = useState(false);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);

  const fiscalData = useQuery(
    api.dashboard.fiscalSummary.getFiscalYearSummary,
    token ? { sessionToken: token, year: selectedYear } : "skip"
  );

  // Années disponibles (au moins l'année en cours)
  const availableYears = useMemo(() => {
    const years = fiscalData?.availableYears ?? [];
    if (!years.includes(currentYear)) years.push(currentYear);
    return years.sort((a: number, b: number) => b - a);
  }, [fiscalData?.availableYears, currentYear]);

  const handleGeneratePDF = useCallback(async () => {
    if (!fiscalData) return;
    setIsGenerating(true);
    try {
      await generateFiscalPDF(fiscalData);
    } finally {
      setIsGenerating(false);
    }
  }, [fiscalData]);

  const isLoading = !fiscalData && token;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
            Fiscalité
          </h1>
          <p className="text-slate-500 mt-1">
            Revenus perçus du 1er janvier au 31 décembre {selectedYear}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sélecteur d'année */}
          <div className="relative">
            <button
              onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 hover:border-primary/50 transition-colors"
            >
              <Calendar className="w-4 h-4 text-slate-400" />
              {selectedYear}
              <ChevronDown className={cn(
                "w-4 h-4 text-slate-400 transition-transform",
                yearDropdownOpen && "rotate-180"
              )} />
            </button>
            {yearDropdownOpen && (
              <div className="absolute right-0 mt-2 w-32 bg-white border border-slate-200 rounded-2xl shadow-xl z-10 py-1 overflow-hidden">
                {availableYears.map((year: number) => (
                  <button
                    key={year}
                    onClick={() => {
                      setSelectedYear(year);
                      setYearDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full px-4 py-2 text-sm text-left hover:bg-slate-50 transition-colors",
                      year === selectedYear && "bg-primary/5 text-primary font-medium"
                    )}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bouton PDF */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGeneratePDF}
            disabled={isGenerating || !fiscalData || fiscalData.missionCount === 0}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all shadow-lg",
              fiscalData && fiscalData.missionCount > 0
                ? "bg-primary text-white hover:bg-primary/90 shadow-primary/30"
                : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
            )}
          >
            {isGenerating ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Générer mon récapitulatif
          </motion.button>
        </div>
      </motion.div>

      {/* Cartes résumé */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <SummaryCard
          icon={<Wallet className="w-5 h-5" />}
          label="Vos revenus"
          value={isLoading ? "..." : formatEuros(fiscalData?.totalEarnings ?? 0)}
          sublabel={`Année civile ${selectedYear}`}
          color="primary"
        />
        <SummaryCard
          icon={<ClipboardList className="w-5 h-5" />}
          label="Missions réalisées"
          value={isLoading ? "..." : String(fiscalData?.missionCount ?? 0)}
          sublabel={`Du 01/01 au 31/12/${selectedYear}`}
          color="secondary"
        />
      </motion.div>

      {/* Tableau mensuel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Ventilation mensuelle</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wider">Mois</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs uppercase tracking-wider">Missions</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-500 text-xs uppercase tracking-wider">Revenus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={3} className="px-6 py-4">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : (
                <>
                  {(fiscalData?.monthlyBreakdown ?? []).map((row) => {
                    if (row.missions === 0) return null;
                    return (
                      <tr key={row.month} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3 font-medium text-slate-700">{row.month}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{row.missions}</td>
                        <td className="px-6 py-3 text-right font-semibold text-slate-800">{formatEuros(row.earnings)}</td>
                      </tr>
                    );
                  })}
                  {fiscalData && fiscalData.missionCount === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                        <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        Aucune mission terminée en {selectedYear}
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
            {fiscalData && fiscalData.missionCount > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-bold">
                  <td className="px-6 py-3 text-slate-800">Total</td>
                  <td className="px-4 py-3 text-right text-slate-800">{fiscalData.missionCount}</td>
                  <td className="px-6 py-3 text-right text-primary text-base">{formatEuros(fiscalData.totalEarnings)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </motion.div>

      {/* Section Comment déclarer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Info className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-slate-800">Comment déclarer vos revenus ?</h2>
        </div>
        <div className="p-6 space-y-6">
          {isPro ? (
            /* Auto-entrepreneur / Pro */
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-1">Auto-entrepreneur / Professionnel</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Déclarez votre <strong>chiffre d'affaires</strong> (le montant de vos revenus perçus) dans votre
                  déclaration de CA trimestrielle ou mensuelle sur le portail de l'URSSAF.
                  Pour l'impôt sur le revenu, reportez le CA en <strong>micro-BIC ou micro-BNC</strong> selon
                  votre activité. Les montants affichés correspondent à l'année civile
                  (du 1er janvier au 31 décembre {selectedYear}).
                </p>
              </div>
            </div>
          ) : (
            /* Particulier — services entre particuliers */
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-1">Services entre particuliers</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Les revenus issus de services rendus entre particuliers via une plateforme
                  doivent être déclarés sur votre <strong>déclaration de revenus annuelle</strong>,
                  au titre de l'année civile (1er janvier — 31 décembre {selectedYear}).
                  Reportez le montant total perçu en <strong>case 1KZ</strong> (revenus des plateformes)
                  ou en <strong>case 5HQ</strong> (micro-BNC) si vous optez pour le régime micro.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed mt-2">
                  En dessous de <strong>3 000 € par an</strong> et <strong>20 transactions</strong>,
                  la plateforme n'est pas tenue de transmettre vos données au fisc,
                  mais <strong>vous restez tenu de déclarer vos revenus</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Rappel important */}
          <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
            <div className="flex gap-3">
              <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm text-slate-700">
                <p className="font-semibold mb-1">Rappel important</p>
                <p className="leading-relaxed">
                  Les frais de service Animigo sont facturés directement aux clients
                  et <strong>ne sont pas déduits de vos revenus</strong>. Le montant affiché
                  dans « Vos revenus » correspond au prix de vos prestations,
                  que vous percevez intégralement.
                  Ce document est informatif et ne constitue pas une facture.
                </p>
              </div>
            </div>
          </div>

          {/* Lien impots.gouv.fr */}
          <a
            href="https://www.impots.gouv.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
          >
            Accéder à impots.gouv.fr
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </motion.div>
    </div>
  );
}

// Composant carte résumé
function SummaryCard({
  icon,
  label,
  value,
  sublabel,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
  color: "primary" | "secondary" | "slate";
}) {
  const colors = {
    primary: {
      bg: "bg-primary/5",
      icon: "bg-primary/10 text-primary",
      value: "text-primary",
    },
    secondary: {
      bg: "bg-secondary/5",
      icon: "bg-secondary/10 text-secondary",
      value: "text-secondary",
    },
    slate: {
      bg: "bg-slate-50",
      icon: "bg-slate-100 text-slate-500",
      value: "text-slate-700",
    },
  };

  const c = colors[color];

  return (
    <div className={cn("rounded-2xl border border-slate-200/60 p-5", c.bg)}>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", c.icon)}>
          {icon}
        </div>
        <span className="text-sm font-medium text-slate-500">{label}</span>
      </div>
      <p className={cn("text-2xl font-bold", c.value)}>{value}</p>
      <p className="text-xs text-slate-400 mt-1">{sublabel}</p>
    </div>
  );
}
