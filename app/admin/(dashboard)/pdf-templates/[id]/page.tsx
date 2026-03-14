"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { useParams, useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft, Save, Eye, FileText, Tag, Info, Table2, Type,
  Trash2, MoveDown, Layers, ClipboardPaste, ChevronRight,
} from "lucide-react";
import Link from "next/link";

// ============================================
// BALISES DYNAMIQUES
// ============================================

const TEXT_FIELDS = [
  { key: "invoiceNumber", label: "N° Facture/Reçu", example: "FA-2026-0042" },
  { key: "documentType", label: "Type document", example: "FACTURE" },
  { key: "date", label: "Date émission", example: "14/03/2026" },
  { key: "clientName", label: "Nom client", example: "Jean Dupont" },
  { key: "clientEmail", label: "Email client", example: "jean@example.com" },
  { key: "clientPhone", label: "Tél. client", example: "06 12 34 56 78" },
  { key: "clientAddress", label: "Adresse client", example: "12 rue des Lilas, 75015 Paris" },
  { key: "announcerName", label: "Nom prestataire", example: "Marie Martin" },
  { key: "announcerEmail", label: "Email prestataire", example: "marie@example.com" },
  { key: "announcerPhone", label: "Tél. prestataire", example: "06 98 76 54 32" },
  { key: "announcerAddress", label: "Adresse prestataire", example: "5 avenue des Champs, 75008 Paris" },
  { key: "companyName", label: "Raison sociale", example: "Pet Care SARL" },
  { key: "siret", label: "SIRET", example: "SIRET : 123 456 789 00012" },
  { key: "serviceName", label: "Nom service", example: "Garde de chien" },
  { key: "missionDate", label: "Date prestation", example: "10/03/2026 - 12/03/2026" },
  { key: "sessionType", label: "Type séance", example: "Individuel" },
  { key: "animalDetails", label: "Animaux (détail)", example: "Max (Chien), Luna (Chat)" },
  { key: "timeRange", label: "Horaires", example: "09:00 - 18:00" },
  { key: "sapMention", label: "Mention SAP", example: "Service à la personne - TVA réduite 10%" },
  { key: "sapApprovalNumber", label: "N° agrément SAP", example: "Agrément SAP : SAP-2025-12345" },
  { key: "vatRate", label: "Taux TVA", example: "20 %" },
  { key: "mentionTVA", label: "Mention TVA", example: "TVA non applicable, art. 293 B du CGI" },
  // Champs texte conservés pour compatibilité (alternative au tableau totaux)
  { key: "amountHT", label: "Total HT (texte)", example: "Total HT : 75,00 €" },
  { key: "tva", label: "TVA (texte)", example: "TVA (20%) : 15,00 €" },
  { key: "amountTTC", label: "Total TTC (texte)", example: "Total TTC : 90,00 €" },
];

const ITEMS_TABLE = {
  key: "itemsTable",
  label: "Tableau des prestations",
  description: "Tableau détaillé avec description enrichie, TVA par ligne. Les éléments en dessous se décalent automatiquement.",
  exampleData: [
    [
      "Garde de chien - Formule Premium\nMax (Chien), Luna (Chat)\n10/03/2026 - 12/03/2026 - 09:00 à 18:00\n2 jours\nIndividuel",
      "2", "jour", "25,00 €", "20%", "10,00 €", "60,00 €",
    ],
    ["Options : Promenade, Toilettage", "1", "forfait", "15,00 €", "20%", "3,00 €", "18,00 €"],
    ["Garde de nuit", "1", "nuit", "10,00 €", "20%", "2,00 €", "12,00 €"],
  ],
  defaultHead: ["Description", "Qté", "Unité", "P.U. HT", "TVA %", "Montant TVA", "Total TTC"],
  defaultWidths: [34, 7, 8, 13, 9, 14, 15],
};

const TOTALS_TABLE = {
  key: "totalsTable",
  label: "Tableau des totaux",
  description: "Récapitulatif Total HT / TVA / Total TTC. Se décale automatiquement sous le tableau des prestations.",
  exampleData: [
    ["Total HT", "75,00 €"],
    ["TVA (20%)", "15,00 €"],
    ["Total TTC", "90,00 €"],
  ],
  defaultHead: ["Libellé", "Montant"],
  defaultWidths: [60, 40],
};

// ============================================
// TEMPLATE PAR DÉFAUT
// ============================================

const DYNAMIC_BASE_PDF = { width: 210, height: 297, padding: [20, 20, 20, 20] };

function getDefaultTemplate() {
  return {
    basePdf: DYNAMIC_BASE_PDF,
    schemas: [
      [
        // ── En-tête ──
        {
          name: "documentType",
          type: "text",
          content: "FACTURE",
          position: { x: 0, y: 0 },
          width: 80,
          height: 10,
          fontSize: 22,
          fontColor: "#FF6B6B",
        },
        {
          name: "invoiceNumber",
          type: "text",
          content: "FA-2026-0001",
          position: { x: 110, y: 0 },
          width: 60,
          height: 8,
          fontSize: 12,
          alignment: "right",
        },
        {
          name: "date",
          type: "text",
          content: "14/03/2026",
          position: { x: 110, y: 10 },
          width: 60,
          height: 6,
          fontSize: 10,
          fontColor: "#64748b",
          alignment: "right",
        },

        // ── Émetteur ──
        {
          name: "announcerName",
          type: "text",
          content: "Marie Martin",
          position: { x: 0, y: 25 },
          width: 80,
          height: 6,
          fontSize: 11,
        },
        {
          name: "companyName",
          type: "text",
          content: "Pet Care SARL",
          position: { x: 0, y: 32 },
          width: 80,
          height: 6,
          fontSize: 10,
          fontColor: "#64748b",
        },
        {
          name: "announcerAddress",
          type: "text",
          content: "5 avenue des Champs, 75008 Paris",
          position: { x: 0, y: 39 },
          width: 80,
          height: 6,
          fontSize: 10,
          fontColor: "#64748b",
        },
        {
          name: "siret",
          type: "text",
          content: "SIRET : 123 456 789 00012",
          position: { x: 0, y: 46 },
          width: 80,
          height: 6,
          fontSize: 9,
          fontColor: "#94a3b8",
        },
        {
          name: "sapApprovalNumber",
          type: "text",
          content: "",
          position: { x: 0, y: 53 },
          width: 80,
          height: 5,
          fontSize: 8,
          fontColor: "#94a3b8",
        },

        // ── Destinataire ──
        {
          name: "clientName",
          type: "text",
          content: "Jean Dupont",
          position: { x: 100, y: 25 },
          width: 70,
          height: 6,
          fontSize: 11,
        },
        {
          name: "clientAddress",
          type: "text",
          content: "12 rue des Lilas, 75015 Paris",
          position: { x: 100, y: 32 },
          width: 70,
          height: 6,
          fontSize: 10,
          fontColor: "#64748b",
        },

        // ── Infos mission ──
        {
          name: "serviceName",
          type: "text",
          content: "Garde de chien",
          position: { x: 0, y: 65 },
          width: 90,
          height: 6,
          fontSize: 10,
          fontColor: "#475569",
        },
        {
          name: "sessionType",
          type: "text",
          content: "Individuel",
          position: { x: 90, y: 65 },
          width: 30,
          height: 6,
          fontSize: 9,
          fontColor: "#64748b",
          alignment: "center",
        },
        {
          name: "missionDate",
          type: "text",
          content: "10/03/2026 - 12/03/2026",
          position: { x: 120, y: 65 },
          width: 50,
          height: 6,
          fontSize: 10,
          fontColor: "#475569",
          alignment: "right",
        },

        // ── Tableau des prestations (7 colonnes) ──
        {
          name: "itemsTable",
          type: "table",
          position: { x: 0, y: 76 },
          width: 170,
          height: 40,
          showHead: true,
          head: ["Description", "Qté", "Unité", "P.U. HT", "TVA %", "Montant TVA", "Total TTC"],
          headWidthPercentages: [34, 7, 8, 13, 9, 14, 15],
          content: JSON.stringify([
            [
              "Garde de chien - Formule Premium\nMax (Chien), Luna (Chat)\n10/03 - 12/03/2026 - 09:00 à 18:00\n2 jours - Individuel",
              "2", "jour", "25,00 €", "20%", "10,00 €", "60,00 €",
            ],
            ["Options : Promenade, Toilettage", "1", "forfait", "15,00 €", "20%", "3,00 €", "18,00 €"],
            ["Garde de nuit", "1", "nuit", "10,00 €", "20%", "2,00 €", "12,00 €"],
          ]),
          tableStyles: {
            borderWidth: 0.3,
            borderColor: "#e2e8f0",
          },
          headStyles: {
            fontColor: "#ffffff",
            backgroundColor: "#334155",
            fontSize: 8,
            alignment: "left",
            verticalAlignment: "middle",
            lineHeight: 1,
            characterSpacing: 0,
            borderColor: "",
            borderWidth: { top: 0, right: 0, bottom: 0, left: 0 },
            padding: { top: 4, right: 3, bottom: 4, left: 3 },
          },
          bodyStyles: {
            fontSize: 8,
            fontColor: "#334155",
            alignment: "left",
            verticalAlignment: "middle",
            lineHeight: 1.2,
            characterSpacing: 0,
            backgroundColor: "",
            borderColor: "#e2e8f0",
            borderWidth: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 },
            alternateBackgroundColor: "#f8fafc",
            padding: { top: 3, right: 3, bottom: 3, left: 3 },
          },
          columnStyles: {},
        },

        // ── Tableau des totaux ──
        {
          name: "totalsTable",
          type: "table",
          position: { x: 100, y: 122 },
          width: 70,
          height: 25,
          showHead: false,
          head: ["Libellé", "Montant"],
          headWidthPercentages: [60, 40],
          content: JSON.stringify([
            ["Total HT", "75,00 €"],
            ["TVA (20%)", "15,00 €"],
            ["Total TTC", "90,00 €"],
          ]),
          tableStyles: {
            borderWidth: 0,
            borderColor: "",
          },
          headStyles: {
            fontColor: "#ffffff",
            backgroundColor: "#334155",
            fontSize: 9,
            alignment: "left",
            verticalAlignment: "middle",
            lineHeight: 1,
            characterSpacing: 0,
            borderColor: "",
            borderWidth: { top: 0, right: 0, bottom: 0, left: 0 },
            padding: { top: 4, right: 5, bottom: 4, left: 5 },
          },
          bodyStyles: {
            fontSize: 10,
            fontColor: "#1e293b",
            alignment: "right",
            verticalAlignment: "middle",
            lineHeight: 1,
            characterSpacing: 0,
            backgroundColor: "#f1f5f9",
            borderColor: "#e2e8f0",
            borderWidth: { top: 0.3, right: 0, bottom: 0.3, left: 0 },
            alternateBackgroundColor: "#e2e8f0",
            padding: { top: 5, right: 5, bottom: 5, left: 5 },
          },
          columnStyles: {
            0: { alignment: "left", fontColor: "#475569" },
          },
        },

        // ── SAP & TVA ──
        {
          name: "sapMention",
          type: "text",
          content: "",
          position: { x: 0, y: 122 },
          width: 90,
          height: 5,
          fontSize: 8,
          fontColor: "#16a34a",
        },
        {
          name: "mentionTVA",
          type: "text",
          content: "",
          position: { x: 0, y: 155 },
          width: 170,
          height: 6,
          fontSize: 8,
          fontColor: "#94a3b8",
        },
      ],
    ],
  };
}

// ============================================
// MENU CONTEXTUEL
// ============================================

interface ContextMenuState {
  x: number;
  y: number;
  visible: boolean;
}

// ============================================
// COMPOSANT PAGE
// ============================================

export default function PdfTemplateEditorPage() {
  const { token } = useAdminAuth();
  const params = useParams();
  const router = useRouter();
  const designerRef = useRef<HTMLDivElement>(null);
  const designerInstance = useRef<any>(null);
  const pdfmeModules = useRef<any>(null);

  const isNew = params.id === "new";
  const templateId = isNew ? undefined : (params.id as Id<"pdfTemplates">);

  const existingTemplate = useQuery(
    api.admin.pdfTemplates.getPdfTemplate,
    token && templateId ? { token, templateId } : "skip"
  );
  const saveTemplate = useMutation(api.admin.pdfTemplates.savePdfTemplate);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [documentType, setDocumentType] = useState<"invoice" | "receipt">("invoice");
  const [targetCompanyType, setTargetCompanyType] = useState<"micro_enterprise" | "regular_company" | "all">("all");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [designerLoaded, setDesignerLoaded] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [containerReady, setContainerReady] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"info" | "fields">("info");
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ x: 0, y: 0, visible: false });
  const [showFieldsSubmenu, setShowFieldsSubmenu] = useState(false);

  const setDesignerContainer = useCallback((node: HTMLDivElement | null) => {
    designerRef.current = node;
    if (node) setContainerReady(true);
  }, []);

  // Charger les données existantes
  useEffect(() => {
    if (existingTemplate) {
      setName(existingTemplate.name);
      setSlug(existingTemplate.slug);
      setDocumentType(existingTemplate.documentType);
      setTargetCompanyType(existingTemplate.targetCompanyType || "all");
      setIsDefault(existingTemplate.isDefault);
    }
  }, [existingTemplate]);

  // Initialiser le Designer pdfme
  useEffect(() => {
    if (!containerReady || !designerRef.current || designerLoaded) return;
    if (!isNew && !existingTemplate) return;

    const initDesigner = async () => {
      try {
        console.log("[pdfme] Import modules...");
        // @ts-ignore
        const pdfmeUi = await import("@pdfme/ui");
        // @ts-ignore
        const pdfmeSchemas = await import("@pdfme/schemas");
        // @ts-ignore
        const { generate } = await import("@pdfme/generator");

        const { Designer } = pdfmeUi;
        const { text, image, table, line, rectangle } = pdfmeSchemas;

        pdfmeModules.current = { text, image, table, line, rectangle, generate };

        let templateData;
        if (existingTemplate?.templateJson) {
          templateData = JSON.parse(existingTemplate.templateJson);
          if (!templateData.basePdf || typeof templateData.basePdf === "string") {
            templateData.basePdf = DYNAMIC_BASE_PDF;
          }
        } else {
          templateData = getDefaultTemplate();
        }

        console.log("[pdfme] Template:", templateData.schemas?.[0]?.length, "champs, basePdf:", typeof templateData.basePdf);

        const plugins = { text, image, table, line, rectangle };

        designerInstance.current = new Designer({
          domContainer: designerRef.current!,
          template: templateData,
          plugins,
        });

        console.log("[pdfme] Designer OK");
        setDesignerLoaded(true);
      } catch (error: any) {
        console.error("[pdfme] ERREUR:", error);
        setInitError(error?.message || String(error));
      }
    };

    const timer = setTimeout(initDesigner, 200);
    return () => clearTimeout(timer);
  }, [existingTemplate, designerLoaded, isNew, containerReady]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (designerInstance.current) {
        try { designerInstance.current.destroy(); } catch { /* ignore */ }
      }
    };
  }, []);

  // Fermer le menu contextuel au clic ailleurs
  useEffect(() => {
    const handler = () => setContextMenu((prev) => ({ ...prev, visible: false }));
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // ============================================
  // MENU CONTEXTUEL (clic droit)
  // ============================================

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (!designerInstance.current) return;
    e.preventDefault();
    setShowFieldsSubmenu(false);
    setContextMenu({ x: e.clientX, y: e.clientY, visible: true });
  }, []);

  const ctxAddField = useCallback((type: "text" | "itemsTable" | "totalsTable" | "line" | "rectangle") => {
    if (!designerInstance.current) return;
    setContextMenu((prev) => ({ ...prev, visible: false }));

    const template = designerInstance.current.getTemplate();
    const currentPage = template.schemas[0] || [];
    let newSchema: any;

    if (type === "text") {
      newSchema = {
        name: `text_${Date.now()}`,
        type: "text",
        content: "Nouveau texte",
        position: { x: 20, y: 20 },
        width: 60,
        height: 8,
        fontSize: 10,
      };
    } else if (type === "itemsTable") {
      newSchema = {
        name: "itemsTable",
        type: "table",
        position: { x: 0, y: 80 },
        width: 170,
        height: 40,
        showHead: true,
        head: ITEMS_TABLE.defaultHead,
        headWidthPercentages: ITEMS_TABLE.defaultWidths,
        content: JSON.stringify(ITEMS_TABLE.exampleData),
        tableStyles: { borderWidth: 0.3, borderColor: "#e2e8f0" },
        headStyles: {
          fontColor: "#ffffff", backgroundColor: "#334155", fontSize: 8,
          alignment: "left", verticalAlignment: "middle", lineHeight: 1, characterSpacing: 0,
          borderColor: "", borderWidth: { top: 0, right: 0, bottom: 0, left: 0 },
          padding: { top: 4, right: 3, bottom: 4, left: 3 },
        },
        bodyStyles: {
          fontSize: 8, fontColor: "#334155", alignment: "left", verticalAlignment: "middle",
          lineHeight: 1.2, characterSpacing: 0, backgroundColor: "",
          borderColor: "#e2e8f0", borderWidth: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 },
          alternateBackgroundColor: "#f8fafc", padding: { top: 3, right: 3, bottom: 3, left: 3 },
        },
        columnStyles: {},
      };
    } else if (type === "totalsTable") {
      newSchema = {
        name: "totalsTable",
        type: "table",
        position: { x: 100, y: 130 },
        width: 70,
        height: 25,
        showHead: false,
        head: TOTALS_TABLE.defaultHead,
        headWidthPercentages: TOTALS_TABLE.defaultWidths,
        content: JSON.stringify(TOTALS_TABLE.exampleData),
        tableStyles: { borderWidth: 0, borderColor: "" },
        headStyles: {
          fontColor: "#ffffff", backgroundColor: "#334155", fontSize: 9,
          alignment: "left", verticalAlignment: "middle", lineHeight: 1, characterSpacing: 0,
          borderColor: "", borderWidth: { top: 0, right: 0, bottom: 0, left: 0 },
          padding: { top: 4, right: 5, bottom: 4, left: 5 },
        },
        bodyStyles: {
          fontSize: 10, fontColor: "#1e293b", alignment: "right", verticalAlignment: "middle",
          lineHeight: 1, characterSpacing: 0, backgroundColor: "#f1f5f9",
          borderColor: "#e2e8f0", borderWidth: { top: 0.3, right: 0, bottom: 0.3, left: 0 },
          alternateBackgroundColor: "#e2e8f0", padding: { top: 5, right: 5, bottom: 5, left: 5 },
        },
        columnStyles: { 0: { alignment: "left", fontColor: "#475569" } },
      };
    } else if (type === "line") {
      newSchema = {
        name: `line_${Date.now()}`,
        type: "line",
        position: { x: 0, y: 70 },
        width: 170,
        height: 0.5,
        color: "#e2e8f0",
      };
    } else if (type === "rectangle") {
      newSchema = {
        name: `rect_${Date.now()}`,
        type: "rectangle",
        position: { x: 10, y: 10 },
        width: 60,
        height: 30,
        borderWidth: 0.5,
        borderColor: "#000000",
        color: "",
      };
    }

    if (newSchema) {
      template.schemas[0] = [...currentPage, newSchema];
      designerInstance.current.updateTemplate(template);
    }
  }, []);

  const ctxPasteField = useCallback((fieldKey: string, fieldLabel: string) => {
    if (!designerInstance.current) return;
    setContextMenu((prev) => ({ ...prev, visible: false }));
    setShowFieldsSubmenu(false);

    const template = designerInstance.current.getTemplate();
    const currentPage = template.schemas[0] || [];

    // Trouver l'exemple correspondant
    const textField = TEXT_FIELDS.find((f) => f.key === fieldKey);
    const example = textField?.example || "";

    const newSchema = {
      name: fieldKey,
      type: "text",
      content: example,
      position: { x: 20, y: 20 },
      width: 70,
      height: 7,
      fontSize: 10,
    };

    template.schemas[0] = [...currentPage, newSchema];
    designerInstance.current.updateTemplate(template);
  }, []);

  const ctxResetTemplate = useCallback(() => {
    if (!designerInstance.current) return;
    if (!confirm("Réinitialiser le template avec le modèle par défaut ?")) return;
    setContextMenu((prev) => ({ ...prev, visible: false }));
    designerInstance.current.updateTemplate(getDefaultTemplate());
  }, []);

  // ============================================
  // ACTIONS
  // ============================================

  const handleSave = useCallback(async () => {
    if (!token || !name || !slug) return;

    setSaving(true);
    try {
      let templateJson: string;

      if (designerInstance.current) {
        const currentTemplate = designerInstance.current.getTemplate();
        templateJson = JSON.stringify(currentTemplate);
      } else {
        templateJson = existingTemplate?.templateJson || "{}";
      }

      await saveTemplate({
        token,
        templateId: templateId || undefined,
        name,
        slug,
        documentType,
        targetCompanyType,
        templateJson,
        isDefault,
      });

      setShowSaveModal(true);
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
    } finally {
      setSaving(false);
    }
  }, [token, name, slug, documentType, targetCompanyType, isDefault, templateId, isNew, existingTemplate, saveTemplate, router]);

  const handlePreview = useCallback(async () => {
    if (!designerInstance.current || !pdfmeModules.current) return;

    try {
      const { text, image, table, line, rectangle, generate } = pdfmeModules.current;
      if (!generate) return;

      const template = designerInstance.current.getTemplate();

      const plugins: Record<string, any> = {};
      if (text) plugins.text = text;
      if (image) plugins.image = image;
      if (table) plugins.table = table;
      if (line) plugins.line = line;
      if (rectangle) plugins.rectangle = rectangle;

      // Données fictives
      const inputs: Record<string, any> = {};
      for (const field of TEXT_FIELDS) {
        inputs[field.key] = field.example;
      }
      // Tableaux (JSON stringifié pour generate)
      inputs[ITEMS_TABLE.key] = JSON.stringify(ITEMS_TABLE.exampleData);
      inputs[TOTALS_TABLE.key] = JSON.stringify(TOTALS_TABLE.exampleData);

      console.log("[preview] Génération avec", Object.keys(plugins).length, "plugins,", Object.keys(inputs).length, "champs");

      const pdf = await generate({ template, inputs: [inputs], plugins });

      const blob = new Blob([pdf], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      console.error("Erreur prévisualisation:", error);
      alert("Erreur lors de la génération. Voir la console (F12).");
    }
  }, []);

  // ============================================
  // RENDER
  // ============================================

  if (!token) return null;

  return (
    <div className="flex flex-col" style={{ height: "100vh" }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/admin/pdf-templates">
            <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <h1 className="text-lg font-bold text-white">
            {isNew ? "Nouveau template" : `Éditer : ${existingTemplate?.name || "..."}`}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreview}
            disabled={!designerLoaded}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-medium transition-colors"
          >
            <Eye className="w-4 h-4" />
            Aperçu PDF
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name || !slug}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        <div className="w-72 border-r border-slate-800 flex flex-col flex-shrink-0">
          {/* Tabs */}
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setSidebarTab("info")}
              className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${sidebarTab === "info" ? "text-rose-400 border-b-2 border-rose-400" : "text-slate-500 hover:text-slate-300"}`}
            >
              Informations
            </button>
            <button
              onClick={() => setSidebarTab("fields")}
              className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${sidebarTab === "fields" ? "text-rose-400 border-b-2 border-rose-400" : "text-slate-500 hover:text-slate-300"}`}
            >
              Balises
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {sidebarTab === "info" ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Nom</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Facture Pro"
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-rose-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Slug</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="invoice_pro"
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-rose-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Type de document</label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-rose-500/50"
                  >
                    <option value="invoice">Facture</option>
                    <option value="receipt">Reçu</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Type d&apos;annonceur ciblé</label>
                  <select
                    value={targetCompanyType}
                    onChange={(e) => setTargetCompanyType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-rose-500/50"
                  >
                    <option value="all">Tous les types</option>
                    <option value="micro_enterprise">Micro-entreprise</option>
                    <option value="regular_company">Société (SARL, SAS...)</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Le template sera utilisé pour ce type d&apos;annonceur. Si aucun template spécifique n&apos;existe, le template &quot;Tous types&quot; sera utilisé.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-800 text-rose-500 focus:ring-rose-500/50"
                  />
                  <span className="text-sm text-slate-300">Template par défaut</span>
                </label>

                {/* Info positionnement dynamique */}
                <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <h4 className="text-xs font-semibold text-emerald-400 mb-1.5 flex items-center gap-1.5">
                    <MoveDown className="w-3.5 h-3.5" />
                    Positionnement dynamique
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Les éléments situés <strong className="text-slate-300">en dessous</strong> des tableaux
                    se décalent automatiquement quand ceux-ci grandissent.
                    Les sauts de page sont gérés automatiquement.
                  </p>
                </div>

                {/* Info clic droit */}
                <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                  <h4 className="text-xs font-semibold text-violet-400 mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Clic droit
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Faites un clic droit sur le canvas pour ajouter rapidement des éléments
                    (texte, tableau prestations, tableau totaux, ligne, rectangle)
                    ou réinitialiser le template.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Champs texte */}
                <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Type className="w-3 h-3" />
                  Champs texte
                </h4>
                <div className="space-y-1">
                  {TEXT_FIELDS.map((field) => (
                    <div
                      key={field.key}
                      className="flex items-start gap-2 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer group"
                      onClick={() => navigator.clipboard.writeText(field.key)}
                      title={`Copier : ${field.key}`}
                    >
                      <Info className="w-3 h-3 text-slate-600 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-300 group-hover:text-white">{field.label}</p>
                        <p className="text-[10px] text-slate-600 font-mono truncate">{field.key}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tableau des prestations */}
                <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 pt-2">
                  <Table2 className="w-3 h-3" />
                  Tableau prestations
                </h4>
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs font-semibold text-blue-400">{ITEMS_TABLE.label}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{ITEMS_TABLE.description}</p>
                  <div className="mt-2">
                    <p className="text-[10px] text-slate-500 font-semibold mb-1">Colonnes :</p>
                    <div className="flex flex-wrap gap-1">
                      {ITEMS_TABLE.defaultHead.map((h, i) => (
                        <span key={i} className="text-[9px] px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded">
                          {h} ({ITEMS_TABLE.defaultWidths[i]}%)
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-[10px] text-slate-500 font-semibold mb-1">Description enrichie :</p>
                    <ul className="text-[10px] text-slate-400 space-y-0.5 list-disc pl-3">
                      <li>Nom service + formule</li>
                      <li>Animaux (nom + type : chien, chat...)</li>
                      <li>Dates et horaires</li>
                      <li>Durée (jours, nuits)</li>
                      <li>Individuel / Collectif</li>
                      <li>Mention SAP si applicable</li>
                    </ul>
                  </div>
                </div>

                {/* Tableau des totaux */}
                <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 pt-2">
                  <Table2 className="w-3 h-3" />
                  Tableau totaux
                </h4>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-xs font-semibold text-emerald-400">{TOTALS_TABLE.label}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{TOTALS_TABLE.description}</p>
                  <div className="mt-2">
                    <p className="text-[10px] text-slate-500 font-semibold mb-1">Lignes générées :</p>
                    <ul className="text-[10px] text-slate-400 space-y-0.5 list-disc pl-3">
                      <li>Total HT (si assujetti TVA)</li>
                      <li>TVA (taux%) (si assujetti TVA)</li>
                      <li>Total TTC (toujours)</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Zone Designer pdfme ── */}
        <div
          className="flex-1 bg-slate-950 relative"
          style={{ minHeight: "500px" }}
          onContextMenu={handleContextMenu}
        >
          <div
            ref={setDesignerContainer}
            style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />

          {/* Spinner / Erreur */}
          {!designerLoaded && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="text-center">
                {initError ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-3">
                      <span className="text-red-400 text-xl">!</span>
                    </div>
                    <p className="text-red-400 text-sm font-medium">Erreur de chargement</p>
                    <p className="text-slate-500 text-xs mt-1 max-w-xs break-all">{initError}</p>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">Chargement de l&apos;éditeur...</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Menu contextuel clic droit */}
          {contextMenu.visible && (
            <div
              className="fixed z-[100] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-black/50 py-1.5 min-w-[220px]"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="px-3 py-1 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Ajouter un élément</p>
              <button
                onClick={() => ctxAddField("text")}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <Type className="w-4 h-4 text-blue-400" />
                Champ texte
              </button>
              <button
                onClick={() => ctxAddField("itemsTable")}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <Table2 className="w-4 h-4 text-emerald-400" />
                Tableau prestations
              </button>
              <button
                onClick={() => ctxAddField("totalsTable")}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <Table2 className="w-4 h-4 text-amber-400" />
                Tableau totaux
              </button>
              <button
                onClick={() => ctxAddField("line")}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <MoveDown className="w-4 h-4 text-slate-400" />
                Ligne séparatrice
              </button>
              <button
                onClick={() => ctxAddField("rectangle")}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <Layers className="w-4 h-4 text-violet-400" />
                Rectangle
              </button>
              <div className="mx-2 my-1 h-px bg-slate-800" />
              <p className="px-3 py-1 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Balises</p>
              <div className="relative">
                <button
                  onClick={() => setShowFieldsSubmenu((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <ClipboardPaste className="w-4 h-4 text-cyan-400" />
                    Coller la balise
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 text-slate-500 transition-transform ${showFieldsSubmenu ? "rotate-90" : ""}`} />
                </button>
                {showFieldsSubmenu && (
                  <div className="fixed z-[110] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-black/50 py-1.5 w-56 max-h-[320px] overflow-y-auto"
                    style={{ left: (contextMenu.x + 220), top: contextMenu.y }}
                  >
                    {TEXT_FIELDS.map((field) => (
                      <button
                        key={field.key}
                        onClick={() => ctxPasteField(field.key, field.label)}
                        className="w-full flex items-start gap-2 px-3 py-1.5 text-left hover:bg-slate-800 transition-colors group"
                      >
                        <span className="text-xs text-slate-300 group-hover:text-white leading-tight">{field.label}</span>
                        <span className="text-[10px] text-slate-600 font-mono ml-auto flex-shrink-0">{field.key}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mx-2 my-1 h-px bg-slate-800" />
              <button
                onClick={ctxResetTemplate}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Réinitialiser le template
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modale après sauvegarde */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Save className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white text-center">Template sauvegardé</h3>
            <p className="text-slate-400 text-sm text-center mt-2">
              Le template <strong className="text-slate-200">{name}</strong> a été enregistré.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors text-sm"
              >
                Continuer l&apos;édition
              </button>
              <button
                onClick={() => router.push("/admin/pdf-templates")}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-medium transition-colors text-sm"
              >
                Retour à la liste
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
