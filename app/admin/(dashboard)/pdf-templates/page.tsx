"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { Id } from "@/convex/_generated/dataModel";
import { motion } from "framer-motion";
import {
  FileText, Plus, Trash2, Star, Copy, Pencil, Search,
} from "lucide-react";
import Link from "next/link";

export default function PdfTemplatesPage() {
  const { token } = useAdminAuth();
  const templates = useQuery(api.admin.pdfTemplates.listPdfTemplates, token ? { token } : "skip");
  const deleteTemplate = useMutation(api.admin.pdfTemplates.deletePdfTemplate);
  const setDefault = useMutation(api.admin.pdfTemplates.setDefaultTemplate);
  const saveTemplate = useMutation(api.admin.pdfTemplates.savePdfTemplate);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "invoice" | "client_receipt" | "refund_receipt">("all");

  if (!token) return null;

  const filtered = templates?.filter((t: { name: string; slug: string; documentType: string; _id: Id<"pdfTemplates">; isDefault: boolean; templateJson: string; updatedAt: number; createdAt: number }) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase());
    // Mappe l'ancien "receipt" déprécié vers "client_receipt" pour l'affichage
    const effectiveType = t.documentType === "receipt" ? "client_receipt" : t.documentType;
    const matchType = filterType === "all" || effectiveType === filterType;
    return matchSearch && matchType;
  });

  const handleDelete = async (templateId: Id<"pdfTemplates">) => {
    if (!confirm("Supprimer ce template ?")) return;
    await deleteTemplate({ token: token!, templateId });
  };

  const handleSetDefault = async (templateId: Id<"pdfTemplates">) => {
    await setDefault({ token: token!, templateId });
  };

  const handleDuplicate = async (template: any) => {
    await saveTemplate({
      token: token!,
      name: `${template.name} (copie)`,
      slug: `${template.slug}_copy_${Date.now()}`,
      documentType: template.documentType,
      templateJson: template.templateJson,
      isDefault: false,
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-rose-400" />
            </div>
            Templates PDF
          </h1>
          <p className="text-slate-400 mt-1">
            Gérez les modèles de factures et reçus générés automatiquement
          </p>
        </div>
        <Link href={filterType !== "all" ? `/admin/pdf-templates/new?type=${filterType}` : "/admin/pdf-templates/new"}>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-medium transition-colors">
            <Plus className="w-4 h-4" />
            Nouveau template
          </button>
        </Link>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
          />
        </div>
        <div className="flex gap-1 bg-slate-800 rounded-xl p-1 border border-slate-700">
          {[
            { value: "all", label: "Tous" },
            { value: "invoice", label: "Factures annonceur" },
            { value: "client_receipt", label: "Reçus client" },
            { value: "refund_receipt", label: "Remboursements" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterType(f.value as any)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterType === f.value
                  ? "bg-rose-500/20 text-rose-300"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {!templates ? (
        <div className="text-center py-20 text-slate-500">Chargement...</div>
      ) : filtered && filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Aucun template trouvé</p>
          <Link href={filterType !== "all" ? `/admin/pdf-templates/new?type=${filterType}` : "/admin/pdf-templates/new"}>
            <button className="mt-4 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors">
              Créer le premier template
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered?.map((template: any, index: number) => (
            <motion.div
              key={template._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-all group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                template.documentType === "invoice"
                  ? "bg-blue-500/20 text-blue-400"
                  : template.documentType === "client_receipt"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : template.documentType === "refund_receipt"
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-slate-500/20 text-slate-400"
              }`}>
                <FileText className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium truncate">{template.name}</p>
                  {template.isDefault && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 rounded-md uppercase">
                      Par défaut
                    </span>
                  )}
                  {template.documentType === "receipt" && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-500/20 text-orange-400 rounded-md uppercase">
                      Déprécié
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-sm">
                  {template.documentType === "invoice"
                    ? "Facture annonceur"
                    : template.documentType === "client_receipt"
                    ? "Reçu paiement client"
                    : template.documentType === "refund_receipt"
                    ? "Bon de remboursement"
                    : "Reçu (ancien format)"}
                  {template.targetCompanyType === "micro_enterprise" ? " — Micro-entreprise" :
                   template.targetCompanyType === "regular_company" ? " — Société" :
                   " — Tous types"}
                  {" — "}{template.slug}
                </p>
              </div>

              <p className="text-slate-500 text-sm flex-shrink-0">
                {new Date(template.updatedAt).toLocaleDateString("fr-FR")}
              </p>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href={`/admin/pdf-templates/${template._id}`}>
                  <button className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors" title="Éditer">
                    <Pencil className="w-4 h-4" />
                  </button>
                </Link>
                <button
                  onClick={() => handleDuplicate(template)}
                  className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  title="Dupliquer"
                >
                  <Copy className="w-4 h-4" />
                </button>
                {!template.isDefault && (
                  <button
                    onClick={() => handleSetDefault(template._id)}
                    className="p-2 rounded-lg hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 transition-colors"
                    title="Définir par défaut"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(template._id)}
                  className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
