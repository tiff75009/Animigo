"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft, Save, Eye, FileText, Tag, Info, Table2, Type,
  Trash2, MoveDown, Layers, ClipboardPaste, ChevronRight, ImageIcon, Hash, Copy, Check, Search,
} from "lucide-react";
import Link from "next/link";
import TableColumnsPanel from "./TableColumnsPanel";
import { filterFieldsByDocumentType, getDefaultClientReceiptTemplate, type DocumentType as DocType, type FieldDef } from "./constants";

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
  { key: "clientAddress", label: "Adresse complète client", example: "12 rue des Lilas, 75015 Paris" },
  { key: "clientStreet", label: "Rue client", example: "12 rue des Lilas" },
  { key: "clientPostalCode", label: "Code postal client", example: "75015" },
  { key: "clientCity", label: "Ville client", example: "Paris" },
  { key: "announcerName", label: "Nom prestataire", example: "Marie Martin" },
  { key: "announcerEmail", label: "Email prestataire", example: "marie@example.com" },
  { key: "announcerPhone", label: "Tél. prestataire", example: "06 98 76 54 32" },
  { key: "announcerAddress", label: "Adresse complète prestataire", example: "5 avenue des Champs, 75008 Paris" },
  { key: "announcerStreet", label: "Rue prestataire", example: "5 avenue des Champs" },
  { key: "announcerPostalCode", label: "Code postal prestataire", example: "75008" },
  { key: "announcerCity", label: "Ville prestataire", example: "Paris" },
  { key: "companyName", label: "Raison sociale", example: "Pet Care SARL" },
  { key: "siret", label: "SIRET", example: "SIRET : 123 456 789 00012" },
  { key: "capital", label: "Capital social", example: "Capital : 10 000 €" },
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

const IMAGE_FIELDS = [
  { key: "companyLogo", label: "Logo entreprise", description: "Logo de l'annonceur (défini dans Paramètres > Informations)" },
];

// ============================================
// CONFIGURATION COLONNES TABLEAU
// ============================================

export interface TableColumnDef {
  id: string;
  dataField: string; // "description" | "quantity" | ... | "freeText"
  headerText: string;
  widthPercent: number;
  enabled: boolean;
  contentTemplate?: string; // template personnalisé : texte libre + {{balises}} (si vide → valeur par défaut du dataField)
}

export interface TableColumnsConfig {
  itemsTable?: TableColumnDef[];
  totalsTable?: TableColumnDef[];
}

const ITEMS_COLUMN_FIELDS = [
  { field: "description", label: "Description du service", defaultHeader: "Description", defaultWidth: 34 },
  { field: "quantity", label: "Quantité", defaultHeader: "Qté", defaultWidth: 7 },
  { field: "unit", label: "Unité", defaultHeader: "Unité", defaultWidth: 8 },
  { field: "unitPriceHT", label: "Prix unitaire HT", defaultHeader: "P.U. HT", defaultWidth: 13 },
  { field: "unitPriceTTC", label: "Prix unitaire TTC", defaultHeader: "P.U. TTC", defaultWidth: 13 },
  { field: "vatRate", label: "Taux TVA", defaultHeader: "TVA %", defaultWidth: 9 },
  { field: "vatAmount", label: "Montant TVA", defaultHeader: "Montant TVA", defaultWidth: 14 },
  { field: "totalHT", label: "Total HT ligne", defaultHeader: "Total HT", defaultWidth: 15 },
  { field: "totalTTC", label: "Total TTC ligne", defaultHeader: "Total TTC", defaultWidth: 15 },
] as const;

const TOTALS_COLUMN_FIELDS = [
  { field: "label", label: "Libellé", defaultHeader: "Libellé", defaultWidth: 60 },
  { field: "amount", label: "Montant", defaultHeader: "Montant", defaultWidth: 40 },
] as const;

function getDefaultItemsColumns(): TableColumnDef[] {
  // Correspond aux 7 colonnes actuelles par défaut
  const defaults = ["description", "quantity", "unit", "unitPriceHT", "vatRate", "vatAmount", "totalTTC"];
  return defaults.map((field, i) => {
    const def = ITEMS_COLUMN_FIELDS.find(f => f.field === field)!;
    return {
      id: `items_col_${i}`,
      dataField: field,
      headerText: def.defaultHeader,
      widthPercent: ITEMS_TABLE_CONST.defaultWidths[i],
      enabled: true,
    };
  });
}

function getDefaultTotalsColumns(): TableColumnDef[] {
  return TOTALS_COLUMN_FIELDS.map((def, i) => ({
    id: `totals_col_${i}`,
    dataField: def.field,
    headerText: def.defaultHeader,
    widthPercent: def.defaultWidth,
    enabled: true,
  }));
}

// Résoudre le contenu d'une cellule selon la config de la colonne
function resolveColumnCell(col: TableColumnDef, rowData: Record<string, string>, globalData?: Record<string, string>): string {
  // Si un contentTemplate est défini, l'utiliser (texte libre + {{balises}})
  if (col.contentTemplate) {
    return col.contentTemplate.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      // D'abord chercher dans les données de la ligne (per-row), puis dans les globales
      return rowData[key] ?? globalData?.[key] ?? key;
    });
  }
  // Sinon, valeur par défaut du dataField
  if (col.dataField === "freeText") return "";
  return rowData[col.dataField] || "";
}

// Générer des données d'exemple selon les colonnes actives
function generateExampleData(tableKey: "itemsTable" | "totalsTable", columns: TableColumnDef[], globalInputs?: Record<string, string>): string[][] {
  const active = columns.filter(c => c.enabled);
  if (tableKey === "totalsTable") {
    const rows = [
      { label: "Total HT", amount: "75,00 €" },
      { label: "TVA (20%)", amount: "15,00 €" },
      { label: "Total TTC", amount: "90,00 €" },
    ];
    return rows.map(row => active.map(col => resolveColumnCell(col, row, globalInputs)));
  }
  // itemsTable
  const exampleItems = [
    { description: "Garde de chien - Formule Premium\nMax (Chien), Luna (Chat)\n10/03/2026 - 12/03/2026\n2 jours\nIndividuel", quantity: "2", unit: "jour", unitPriceHT: "25,00 €", unitPriceTTC: "30,00 €", vatRate: "20%", vatAmount: "10,00 €", totalHT: "50,00 €", totalTTC: "60,00 €" },
    { description: "Options : Promenade, Toilettage", quantity: "1", unit: "forfait", unitPriceHT: "15,00 €", unitPriceTTC: "18,00 €", vatRate: "20%", vatAmount: "3,00 €", totalHT: "15,00 €", totalTTC: "18,00 €" },
    { description: "Garde de nuit", quantity: "1", unit: "nuit", unitPriceHT: "10,00 €", unitPriceTTC: "12,00 €", vatRate: "20%", vatAmount: "2,00 €", totalHT: "10,00 €", totalTTC: "12,00 €" },
  ];
  return exampleItems.map(item => active.map(col => resolveColumnCell(col, item, globalInputs)));
}

const ITEMS_TABLE_CONST = {
  defaultWidths: [34, 7, 8, 13, 9, 14, 15],
};

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
// NUMÉROTATION DE PAGES
// ============================================

interface PageNumberConfig {
  enabled: boolean;
  position: "header" | "footer";
  alignment: "left" | "center" | "right";
  format: "page_x_of_y" | "x_of_y" | "x_slash_y" | "page_x";
  fontSize: number;
  marginY: number;
}

const DEFAULT_PAGE_NUMBER_CONFIG: PageNumberConfig = {
  enabled: false,
  position: "footer",
  alignment: "center",
  format: "page_x_of_y",
  fontSize: 8,
  marginY: 10,
};

const PAGE_NUMBER_FORMATS: { value: PageNumberConfig["format"]; label: string; example: string }[] = [
  { value: "page_x_of_y", label: "Page X sur Y", example: "Page 1 sur 3" },
  { value: "x_of_y", label: "X sur Y", example: "1 sur 3" },
  { value: "x_slash_y", label: "X / Y", example: "1 / 3" },
  { value: "page_x", label: "Page X", example: "Page 1" },
];

function formatPageNumber(format: PageNumberConfig["format"], page: number, total: number): string {
  switch (format) {
    case "page_x_of_y": return `Page ${page} sur ${total}`;
    case "x_of_y": return `${page} sur ${total}`;
    case "x_slash_y": return `${page} / ${total}`;
    case "page_x": return `Page ${page}`;
  }
}

// ============================================
// EN-TÊTE / PIED DE PAGE
// ============================================

type RepeatRule = "all_pages" | "first_page_only" | "all_except_first" | "even_pages" | "odd_pages";

interface ZoneConfig {
  enabled: boolean;
  height: number; // mm
  repeat: RepeatRule;
  showLine: boolean;
}

interface HeaderFooterConfig {
  header: ZoneConfig;
  footer: ZoneConfig;
}

const DEFAULT_HEADER_FOOTER_CONFIG: HeaderFooterConfig = {
  header: { enabled: false, height: 30, repeat: "all_pages", showLine: false },
  footer: { enabled: false, height: 20, repeat: "all_pages", showLine: false },
};

const REPEAT_OPTIONS: { value: RepeatRule; label: string }[] = [
  { value: "all_pages", label: "Toutes les pages" },
  { value: "first_page_only", label: "Première page uniquement" },
  { value: "all_except_first", label: "Toutes sauf la première" },
  { value: "even_pages", label: "Pages paires (2, 4, 6…)" },
  { value: "odd_pages", label: "Pages impaires (1, 3, 5…)" },
];

function shouldApplyToPage(repeat: RepeatRule, pageIndex: number): boolean {
  const pageNum = pageIndex + 1;
  switch (repeat) {
    case "all_pages": return true;
    case "first_page_only": return pageIndex === 0;
    case "all_except_first": return pageIndex > 0;
    case "even_pages": return pageNum % 2 === 0;
    case "odd_pages": return pageNum % 2 === 1;
  }
}

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

        // ── Logo entreprise ──
        {
          name: "companyLogo",
          type: "image",
          content: "",
          position: { x: 0, y: 0 },
          width: 25,
          height: 25,
          readOnly: true,
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
          content: "Service à la personne - TVA réduite 10%",
          position: { x: 0, y: 122 },
          width: 90,
          height: 5,
          fontSize: 8,
          fontColor: "#16a34a",
        },
        {
          name: "mentionTVA",
          type: "text",
          content: "TVA non applicable, art. 293 B du CGI",
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
  const searchParams = useSearchParams();
  // Type souhaité depuis l'URL (?type=client_receipt) pour pré-remplir un nouveau template
  const presetType = searchParams.get("type") as "invoice" | "client_receipt" | "receipt" | null;
  const designerRef = useRef<HTMLDivElement>(null);
  const designerInstance = useRef<any>(null);
  const pdfmeModules = useRef<any>(null);
  const loadedFonts = useRef<Record<string, { data: ArrayBuffer; fallback?: boolean }>>({});

  const isNew = params.id === "new";
  const templateId = isNew ? undefined : (params.id as Id<"pdfTemplates">);

  const existingTemplate = useQuery(
    api.admin.pdfTemplates.getPdfTemplate,
    token && templateId ? { token, templateId } : "skip"
  );
  const saveTemplate = useMutation(api.admin.pdfTemplates.savePdfTemplate);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [documentType, setDocumentType] = useState<"invoice" | "client_receipt" | "receipt">(
    presetType === "client_receipt" ? "client_receipt" : "invoice"
  );
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
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [fieldSearch, setFieldSearch] = useState("");
  const [ctxFieldSearch, setCtxFieldSearch] = useState("");
  const [pageNumberConfig, setPageNumberConfig] = useState<PageNumberConfig>(DEFAULT_PAGE_NUMBER_CONFIG);
  const [headerFooterConfig, setHeaderFooterConfig] = useState<HeaderFooterConfig>(DEFAULT_HEADER_FOOTER_CONFIG);
  const [margins, setMargins] = useState<[number, number, number, number]>([20, 20, 20, 20]); // [top, right, bottom, left]
  const [tableColumnsConfig, setTableColumnsConfig] = useState<TableColumnsConfig>({
    itemsTable: getDefaultItemsColumns(),
    totalsTable: getDefaultTotalsColumns(),
  });

  const setDesignerContainer = useCallback((node: HTMLDivElement | null) => {
    designerRef.current = node;
    if (node) setContainerReady(true);
  }, []);

  // ─── Listes de balises filtrées par type de document (memoisées pour perf) ───
  // Évite de recalculer à chaque render et masque les balises non pertinentes
  // (ex : SIRET caché pour client_receipt, paymentDate caché pour invoice).
  const visibleTextFields = useMemo(
    () => filterFieldsByDocumentType(TEXT_FIELDS as FieldDef[], documentType as DocType),
    [documentType]
  );
  const visibleImageFields = useMemo(
    () => filterFieldsByDocumentType(IMAGE_FIELDS as FieldDef[], documentType as DocType),
    [documentType]
  );

  // ─── Throttle RAF des updates designer pour réduire la latence sur drag/resize ───
  // pdfme.updateTemplate() est coûteux (re-render canvas complet). On bufferise
  // les appels rapides via requestAnimationFrame pour ne committer qu'une fois par frame.
  const designerUpdateRafRef = useRef<number | null>(null);
  const pendingTemplateRef = useRef<any>(null);
  const scheduleDesignerUpdate = useCallback((template: any) => {
    pendingTemplateRef.current = template;
    if (designerUpdateRafRef.current !== null) return;
    designerUpdateRafRef.current = requestAnimationFrame(() => {
      designerUpdateRafRef.current = null;
      const t = pendingTemplateRef.current;
      pendingTemplateRef.current = null;
      if (t && designerInstance.current) {
        designerInstance.current.updateTemplate(t);
      }
    });
  }, []);

  // ─── Handlers TableColumnsPanel mémorisés (sinon recréés à chaque render) ───
  const handleItemsTableChange = useCallback((newConfig: TableColumnsConfig) => {
    setTableColumnsConfig(newConfig);
    if (!designerInstance.current) return;
    const template = designerInstance.current.getTemplate();
    const activeCols = (newConfig.itemsTable || []).filter((c) => c.enabled);
    for (const page of template.schemas) {
      const tableSchema = page.find((s: any) => s.name === "itemsTable");
      if (tableSchema) {
        tableSchema.head = activeCols.map((c: TableColumnDef) => c.headerText);
        tableSchema.headWidthPercentages = activeCols.map((c: TableColumnDef) => c.widthPercent);
        tableSchema.content = JSON.stringify(generateExampleData("itemsTable", newConfig.itemsTable!));
      }
    }
    scheduleDesignerUpdate(template);
  }, [scheduleDesignerUpdate]);

  const handleTotalsTableChange = useCallback((newConfig: TableColumnsConfig) => {
    setTableColumnsConfig(newConfig);
    if (!designerInstance.current) return;
    const template = designerInstance.current.getTemplate();
    const activeCols = (newConfig.totalsTable || []).filter((c) => c.enabled);
    for (const page of template.schemas) {
      const tableSchema = page.find((s: any) => s.name === "totalsTable");
      if (tableSchema) {
        tableSchema.head = activeCols.map((c: TableColumnDef) => c.headerText);
        tableSchema.headWidthPercentages = activeCols.map((c: TableColumnDef) => c.widthPercent);
        tableSchema.content = JSON.stringify(generateExampleData("totalsTable", newConfig.totalsTable!));
      }
    }
    scheduleDesignerUpdate(template);
  }, [scheduleDesignerUpdate]);

  // Charger les données existantes
  useEffect(() => {
    if (existingTemplate) {
      setName(existingTemplate.name);
      setSlug(existingTemplate.slug);
      setDocumentType(existingTemplate.documentType);
      setTargetCompanyType(existingTemplate.targetCompanyType || "all");
      setIsDefault(existingTemplate.isDefault);
      // Charger les configs de mise en page
      try {
        const parsed = JSON.parse(existingTemplate.templateJson);
        if (parsed._pageNumberConfig) {
          setPageNumberConfig({ ...DEFAULT_PAGE_NUMBER_CONFIG, ...parsed._pageNumberConfig });
        }
        if (parsed._headerFooterConfig) {
          setHeaderFooterConfig({
            header: { ...DEFAULT_HEADER_FOOTER_CONFIG.header, ...parsed._headerFooterConfig.header },
            footer: { ...DEFAULT_HEADER_FOOTER_CONFIG.footer, ...parsed._headerFooterConfig.footer },
          });
        }
        if (parsed.basePdf?.padding && Array.isArray(parsed.basePdf.padding)) {
          setMargins(parsed.basePdf.padding as [number, number, number, number]);
        }
        if (parsed._tableColumnsConfig) {
          setTableColumnsConfig({
            itemsTable: parsed._tableColumnsConfig.itemsTable || getDefaultItemsColumns(),
            totalsTable: parsed._tableColumnsConfig.totalsTable || getDefaultTotalsColumns(),
          });
        }
      } catch { /* ignore */ }
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
        } else if (presetType === "client_receipt") {
          // Nouveau template avec ?type=client_receipt → utiliser le modèle pré-rempli
          // (header + bloc client/prestataire/plateforme + paiement + mentions légales)
          templateData = getDefaultClientReceiptTemplate();
        } else {
          templateData = getDefaultTemplate();
        }

        // Pré-remplir les champs dynamiques vides avec leurs exemples
        // pour que l'admin puisse les voir, les positionner et les styler dans l'éditeur.
        // La balise `documentType` est dynamique selon le type sélectionné.
        const dynamicDocTypeLabel = documentType === "invoice"
          ? "FACTURE"
          : documentType === "client_receipt"
          ? "REÇU DE PAIEMENT"
          : "REÇU";
        const fieldExamples = new Map(TEXT_FIELDS.map(f =>
          f.key === "documentType" ? [f.key, dynamicDocTypeLabel] : [f.key, f.example]
        ));
        for (const page of templateData.schemas) {
          for (const schema of page) {
            if (schema.type === "text" && !schema.content && fieldExamples.has(schema.name)) {
              schema.content = fieldExamples.get(schema.name);
            }
          }
        }

        console.log("[pdfme] Template:", templateData.schemas?.[0]?.length, "champs, basePdf:", typeof templateData.basePdf);

        const plugins = { text, image, table, line, rectangle };

        // Charger les polices pour le Designer
        const fontDefs: Record<string, { label: string; url: string; fallback?: boolean }> = {
          "Montserrat":           { label: "Montserrat",           url: "/fonts/Montserrat-Regular.ttf", fallback: true },
          "Montserrat Bold":      { label: "Montserrat Bold",      url: "/fonts/Montserrat-Bold.ttf" },
          "Montserrat SemiBold":  { label: "Montserrat SemiBold",  url: "/fonts/Montserrat-SemiBold.ttf" },
          "Montserrat Italic":    { label: "Montserrat Italic",    url: "/fonts/Montserrat-Italic.ttf" },
          "Montserrat Bold Italic": { label: "Montserrat Bold Italic", url: "/fonts/Montserrat-BoldItalic.ttf" },
          "Montserrat Light":     { label: "Montserrat Light",     url: "/fonts/Montserrat-Light.ttf" },
          "Open Sans":            { label: "Open Sans",            url: "/fonts/OpenSans-Regular.ttf" },
          "Roboto":               { label: "Roboto",               url: "/fonts/Roboto-Regular.ttf" },
          "Lato":                 { label: "Lato",                 url: "/fonts/Lato-Regular.ttf" },
          "Lato Bold":            { label: "Lato Bold",            url: "/fonts/Lato-Bold.ttf" },
          "Lato Italic":          { label: "Lato Italic",          url: "/fonts/Lato-Italic.ttf" },
          "Love Taking":          { label: "Love Taking",          url: "/fonts/LoveTaking.ttf" },
        };

        const font: Record<string, { data: ArrayBuffer; fallback?: boolean }> = {};
        await Promise.all(
          Object.entries(fontDefs).map(async ([key, def]) => {
            try {
              const res = await fetch(def.url);
              if (res.ok) {
                font[key] = { data: await res.arrayBuffer(), ...(def.fallback ? { fallback: true } : {}) };
              }
            } catch {
              console.warn(`[pdfme] Police ${key} non chargée`);
            }
          })
        );

        loadedFonts.current = font;
        console.log("[pdfme] Polices chargées:", Object.keys(font).length);

        designerInstance.current = new Designer({
          domContainer: designerRef.current!,
          template: templateData,
          plugins,
          options: {
            font: Object.keys(font).length > 0 ? font : undefined,
          },
        });

        // Sync margins state depuis le template chargé
        if (templateData.basePdf?.padding && Array.isArray(templateData.basePdf.padding)) {
          setMargins(templateData.basePdf.padding as [number, number, number, number]);
        }

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

  // Appliquer les marges au designer quand elles changent
  const prevMarginsRef = useRef<string>(JSON.stringify([20, 20, 20, 20]));
  useEffect(() => {
    if (!designerInstance.current || !designerLoaded) return;
    const key = JSON.stringify(margins);
    if (key === prevMarginsRef.current) return;
    prevMarginsRef.current = key;

    const template = designerInstance.current.getTemplate();
    template.basePdf = { ...template.basePdf, padding: margins };
    designerInstance.current.updateTemplate(template);
  }, [margins, designerLoaded]);

  // ─── Sync de la balise documentType dans l'aperçu en temps réel ───
  // Quand l'admin change le type (Facture / Reçu client) dans la sidebar,
  // on met à jour le `content` du schéma `documentType` dans le designer
  // pour que l'aperçu reflète immédiatement le bon libellé.
  useEffect(() => {
    if (!designerInstance.current || !designerLoaded) return;
    const documentTypeLabels: Record<string, string> = {
      invoice: "FACTURE",
      client_receipt: "REÇU DE PAIEMENT",
      receipt: "REÇU",
    };
    const newLabel = documentTypeLabels[documentType] || "DOCUMENT";
    const template = designerInstance.current.getTemplate();
    let changed = false;
    for (const page of template.schemas) {
      const docTypeSchema = page.find((s: any) => s.name === "documentType");
      if (docTypeSchema && docTypeSchema.content !== newLabel) {
        docTypeSchema.content = newLabel;
        changed = true;
      }
    }
    if (changed) {
      designerInstance.current.updateTemplate(template);
    }
  }, [documentType, designerLoaded]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (designerInstance.current) {
        try { designerInstance.current.destroy(); } catch { /* ignore */ }
      }
    };
  }, []);

  // Overlay guides en-tête/pied de page directement sur le DOM du designer
  const overlayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!designerLoaded || !designerRef.current || !overlayRef.current) return;
    const hasZones = headerFooterConfig.header.enabled || headerFooterConfig.footer.enabled;
    if (!hasZones) {
      overlayRef.current.innerHTML = "";
      return;
    }

    // Cherche l'élément page dans le DOM du designer
    // pdfme rend la page dans un div avec data-schema-page ou un div dont le ratio ≈ A4
    const findPageElement = (): HTMLElement | null => {
      const container = designerRef.current;
      if (!container) return null;
      // pdfme crée un div avec position relative qui contient la page
      // On cherche un élément dont le ratio est ≈ 210/297 (A4)
      const candidates = container.querySelectorAll<HTMLElement>("div[style]");
      for (const el of candidates) {
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        if (w > 100 && h > 100) {
          const ratio = w / h;
          const a4Ratio = 210 / 297;
          if (Math.abs(ratio - a4Ratio) < 0.05) {
            return el;
          }
        }
      }
      return null;
    };

    const updateOverlays = () => {
      const pageEl = findPageElement();
      const overlay = overlayRef.current;
      if (!pageEl || !overlay) return;

      const containerRect = designerRef.current!.getBoundingClientRect();
      const pageRect = pageEl.getBoundingClientRect();
      const pagePixelHeight = pageRect.height;
      const scale = pagePixelHeight / DYNAMIC_BASE_PDF.height; // px per mm

      overlay.innerHTML = "";

      // Position de la page relative au container du designer
      const offsetLeft = pageRect.left - containerRect.left;
      const offsetTop = pageRect.top - containerRect.top;
      const pageW = pageRect.width;

      if (headerFooterConfig.header.enabled) {
        const hPx = headerFooterConfig.header.height * scale;
        // Zone teintée
        const zone = document.createElement("div");
        zone.style.cssText = `position:absolute;left:${offsetLeft}px;top:${offsetTop}px;width:${pageW}px;height:${hPx}px;background:rgba(34,211,238,0.08);border-bottom:2px dashed #22d3ee;pointer-events:none;z-index:5;`;
        overlay.appendChild(zone);
        // Label
        const lbl = document.createElement("div");
        lbl.style.cssText = `position:absolute;left:${offsetLeft}px;top:${offsetTop + hPx + 2}px;width:${pageW}px;text-align:center;pointer-events:none;z-index:5;`;
        lbl.innerHTML = `<span style="font-size:9px;color:#22d3ee;background:rgba(15,23,42,0.8);padding:1px 6px;border-radius:4px;font-weight:600;">EN-TÊTE ${headerFooterConfig.header.height}mm</span>`;
        overlay.appendChild(lbl);
      }

      if (headerFooterConfig.footer.enabled) {
        const fPx = headerFooterConfig.footer.height * scale;
        // Zone teintée
        const zone = document.createElement("div");
        zone.style.cssText = `position:absolute;left:${offsetLeft}px;top:${offsetTop + pagePixelHeight - fPx}px;width:${pageW}px;height:${fPx}px;background:rgba(34,211,238,0.08);border-top:2px dashed #22d3ee;pointer-events:none;z-index:5;`;
        overlay.appendChild(zone);
        // Label
        const lbl = document.createElement("div");
        lbl.style.cssText = `position:absolute;left:${offsetLeft}px;top:${offsetTop + pagePixelHeight - fPx - 16}px;width:${pageW}px;text-align:center;pointer-events:none;z-index:5;`;
        lbl.innerHTML = `<span style="font-size:9px;color:#22d3ee;background:rgba(15,23,42,0.8);padding:1px 6px;border-radius:4px;font-weight:600;">PIED DE PAGE ${headerFooterConfig.footer.height}mm</span>`;
        overlay.appendChild(lbl);
      }
    };

    // Update initial + polling pour suivre le zoom/scroll du designer
    const interval = setInterval(updateOverlays, 500);
    updateOverlays();

    return () => clearInterval(interval);
  }, [headerFooterConfig, designerLoaded]);

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

    // Calculer la position en évitant que le menu sorte de l'écran
    const menuHeight = 420; // hauteur estimée du menu contextuel
    const menuWidth = 220;
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;

    let x = e.clientX;
    let y = e.clientY;

    // Si le menu dépasse en bas, le remonter
    if (y + menuHeight > viewportH) {
      y = Math.max(8, viewportH - menuHeight - 8);
    }
    // Si le menu dépasse à droite
    if (x + menuWidth > viewportW) {
      x = Math.max(8, viewportW - menuWidth - 8);
    }

    setContextMenu({ x, y, visible: true });
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

  const ctxCopyField = useCallback((fieldKey: string) => {
    const tag = `{{${fieldKey}}}`;
    navigator.clipboard.writeText(tag).then(() => {
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 1500);
    });
  }, []);

  const [pastedField, setPastedField] = useState<string | null>(null);
  const ctxPasteField = useCallback(async () => {
    if (!designerInstance.current) return;
    setContextMenu((prev) => ({ ...prev, visible: false }));

    try {
      const clipText = await navigator.clipboard.readText();
      if (!clipText) return;

      // Vérifier si c'est une balise au format {{key}}
      const tagMatch = clipText.match(/^\{\{(\w+)\}\}$/);
      const tagKey = tagMatch ? tagMatch[1] : null;

      const template = designerInstance.current.getTemplate();
      const currentPage = template.schemas[0] || [];

      if (tagKey) {
        // C'est une balise {{...}} — insérer dans l'élément sélectionné si c'est un texte
        // Trouver l'élément actuellement sélectionné (on cherche via l'API pdfme)
        // Sinon créer un nouveau champ texte avec la balise
        const newSchema = {
          name: `mixed_${Date.now()}`,
          type: "text",
          content: clipText,
          position: { x: 20, y: 20 },
          width: 80,
          height: 7,
          fontSize: 10,
        };
        template.schemas[0] = [...currentPage, newSchema];
      } else {
        // Texte libre — créer un nouveau champ texte
        const newSchema = {
          name: `text_${Date.now()}`,
          type: "text",
          content: clipText,
          position: { x: 20, y: 20 },
          width: 70,
          height: 7,
          fontSize: 10,
        };
        template.schemas[0] = [...currentPage, newSchema];
      }

      designerInstance.current.updateTemplate(template);

      // Feedback visuel
      const displayName = tagKey || clipText;
      setPastedField(displayName);
      setTimeout(() => setPastedField(null), 1500);
    } catch {
      // Clipboard non accessible
    }
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
        // Inclure les configs de mise en page dans le JSON template
        if (pageNumberConfig.enabled) {
          (currentTemplate as any)._pageNumberConfig = pageNumberConfig;
        } else {
          delete (currentTemplate as any)._pageNumberConfig;
        }
        if (headerFooterConfig.header.enabled || headerFooterConfig.footer.enabled) {
          (currentTemplate as any)._headerFooterConfig = headerFooterConfig;
        } else {
          delete (currentTemplate as any)._headerFooterConfig;
        }
        (currentTemplate as any)._tableColumnsConfig = tableColumnsConfig;
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
  }, [token, name, slug, documentType, targetCompanyType, isDefault, templateId, isNew, existingTemplate, saveTemplate, router, pageNumberConfig, headerFooterConfig, tableColumnsConfig]);

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

      // Données fictives pour les balises dynamiques
      const inputs: Record<string, any> = {};
      for (const field of TEXT_FIELDS) {
        inputs[field.key] = field.example;
      }
      // Tableaux (JSON stringifié pour generate) - utiliser la config de colonnes
      // Les balises globales (inputs) sont passées pour résoudre les {{balise}} dans les contentTemplate
      const itemsCols = tableColumnsConfig.itemsTable || getDefaultItemsColumns();
      const totalsCols = tableColumnsConfig.totalsTable || getDefaultTotalsColumns();
      inputs[ITEMS_TABLE.key] = JSON.stringify(generateExampleData("itemsTable", itemsCols, inputs));
      inputs[TOTALS_TABLE.key] = JSON.stringify(generateExampleData("totalsTable", totalsCols, inputs));

      // Images dynamiques : générer un placeholder PNG pour l'aperçu
      const knownImageKeys = new Set(IMAGE_FIELDS.map(f => f.key));
      for (const page of template.schemas) {
        for (const schema of page) {
          if (schema.type === "image" && knownImageKeys.has(schema.name)) {
            const w = Math.max(80, Math.round(schema.width * 3));
            const h = Math.max(80, Math.round(schema.height * 3));
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const c = canvas.getContext("2d")!;
            c.fillStyle = "#e2e8f0";
            c.fillRect(0, 0, w, h);
            c.fillStyle = "#94a3b8";
            c.font = "bold 12px sans-serif";
            c.textAlign = "center";
            c.textBaseline = "middle";
            c.fillText("LOGO", w / 2, h / 2);
            inputs[schema.name] = canvas.toDataURL("image/png");
          }
        }
      }

      // Textes libres : utiliser leur contenu tel quel dans les inputs
      const knownKeys = new Set([...TEXT_FIELDS.map(f => f.key), ITEMS_TABLE.key, TOTALS_TABLE.key, ...IMAGE_FIELDS.map(f => f.key)]);
      for (const page of template.schemas) {
        for (const schema of page) {
          if (schema.type === "text" && !knownKeys.has(schema.name) && schema.content) {
            inputs[schema.name] = schema.content;
          }
        }
      }

      // Remplacer les balises {{key}} dans tous les inputs texte
      for (const key of Object.keys(inputs)) {
        const val = inputs[key];
        if (typeof val === "string" && val.includes("{{")) {
          inputs[key] = val.replace(/\{\{(\w+)\}\}/g, (_match, fieldKey) => {
            return inputs[fieldKey] ?? fieldKey;
          });
        }
      }

      console.log("[preview] Génération avec", Object.keys(plugins).length, "plugins,", Object.keys(inputs).length, "champs");

      // ── Préparer le template pour la génération ──
      // Si le footer est activé, retirer les éléments de la zone footer du template principal
      // (ils seront rendus via un PDF séparé en post-traitement pour éviter le positionnement dynamique)
      const genTemplate = JSON.parse(JSON.stringify(template));
      const paddingTop = template.basePdf?.padding?.[0] ?? 20;
      let footerThresholdY = Infinity;
      if (headerFooterConfig.footer.enabled) {
        footerThresholdY = 297 - headerFooterConfig.footer.height - paddingTop;
        for (let p = 0; p < genTemplate.schemas.length; p++) {
          genTemplate.schemas[p] = genTemplate.schemas[p].filter(
            (s: any) => s.type === "table" || (s.position?.y || 0) < footerThresholdY
          );
        }
      }

      const genOptions: any = { template: genTemplate, inputs: [inputs], plugins };
      if (Object.keys(loadedFonts.current).length > 0) {
        genOptions.options = { font: loadedFonts.current };
      }
      let pdfBytes = await generate(genOptions);

      // Post-traitement : en-tête / pied de page (AVANT la numérotation pour ne pas masquer les numéros)
      if (headerFooterConfig.header.enabled || headerFooterConfig.footer.enabled) {
        const pdfLib = await import("pdf-lib");
        const pdfDoc = await pdfLib.PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const mainPageCount = pages.length;

        if (mainPageCount > 0) {
          const firstPage = pages[0];
          const { width: pageW, height: pageH } = firstPage.getSize();
          const mmToPt = 2.835;

          // ── HEADER : embarquer depuis page 1 du PDF principal ──
          let headerEmbed: any = null;
          if (headerFooterConfig.header.enabled) {
            const hH = headerFooterConfig.header.height * mmToPt;
            [headerEmbed] = await pdfDoc.embedPages([firstPage], [
              { left: 0, bottom: pageH - hH, right: pageW, top: pageH },
            ]);
          }

          // ── FOOTER : générer un PDF séparé avec uniquement les éléments footer ──
          let footerEmbed: any = null;
          if (headerFooterConfig.footer.enabled) {
            const fH = headerFooterConfig.footer.height * mmToPt;

            // Cloner le template ORIGINAL, garder uniquement les éléments dans la zone footer
            const footerTemplate = JSON.parse(JSON.stringify(template));
            let hasFooterElements = false;
            for (let p = 0; p < footerTemplate.schemas.length; p++) {
              footerTemplate.schemas[p] = footerTemplate.schemas[p].filter(
                (s: any) => s.position?.y >= footerThresholdY
              );
              if (footerTemplate.schemas[p].length > 0) hasFooterElements = true;
            }
            delete footerTemplate._pageNumberConfig;
            delete footerTemplate._headerFooterConfig;

            // Générer seulement s'il y a des éléments footer
            if (hasFooterElements) {
              const footerGenOptions: any = { template: footerTemplate, inputs: [inputs], plugins };
              if (Object.keys(loadedFonts.current).length > 0) {
                footerGenOptions.options = { font: loadedFonts.current };
              }
              const footerPdfBytes = await generate(footerGenOptions);
              const footerDoc = await pdfLib.PDFDocument.load(footerPdfBytes);
              const [copiedFooterPage] = await pdfDoc.copyPages(footerDoc, [0]);
              pdfDoc.addPage(copiedFooterPage);
              const tempPage = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
              [footerEmbed] = await pdfDoc.embedPages([tempPage], [
                { left: 0, bottom: 0, right: pageW, top: fH },
              ]);
              pdfDoc.removePage(pdfDoc.getPageCount() - 1);
            }
          }

          // ── Appliquer header ──
          if (headerEmbed && headerFooterConfig.header.enabled) {
            const hH = headerFooterConfig.header.height * mmToPt;
            const repeat = headerFooterConfig.header.repeat;
            for (let i = 0; i < mainPageCount; i++) {
              const apply = shouldApplyToPage(repeat, i);
              if (i > 0 && apply) {
                pages[i].drawRectangle({ x: 0, y: pageH - hH, width: pageW, height: hH, color: pdfLib.rgb(1, 1, 1) });
                pages[i].drawPage(headerEmbed, { x: 0, y: pageH - hH });
              }
              if (i === 0 && !apply) {
                pages[0].drawRectangle({ x: 0, y: pageH - hH, width: pageW, height: hH, color: pdfLib.rgb(1, 1, 1) });
              }
            }
            if (headerFooterConfig.header.showLine) {
              const lineY = pageH - hH;
              for (let i = 0; i < mainPageCount; i++) {
                if (shouldApplyToPage(repeat, i)) {
                  pages[i].drawLine({ start: { x: 20, y: lineY }, end: { x: pageW - 20, y: lineY }, thickness: 0.5, color: pdfLib.rgb(0.85, 0.87, 0.89) });
                }
              }
            }
          }

          // ── Appliquer footer (sur TOUTES les pages, y compris page 1) ──
          if (footerEmbed && headerFooterConfig.footer.enabled) {
            const fH = headerFooterConfig.footer.height * mmToPt;
            const repeat = headerFooterConfig.footer.repeat;
            for (let i = 0; i < mainPageCount; i++) {
              const apply = shouldApplyToPage(repeat, i);
              if (apply) {
                // Fond blanc pour masquer tout contenu existant dans la zone footer
                pages[i].drawRectangle({ x: 0, y: 0, width: pageW, height: fH, color: pdfLib.rgb(1, 1, 1) });
                pages[i].drawPage(footerEmbed, { x: 0, y: 0 });
              }
            }
            if (headerFooterConfig.footer.showLine) {
              const lineY = fH;
              for (let i = 0; i < mainPageCount; i++) {
                if (shouldApplyToPage(repeat, i)) {
                  pages[i].drawLine({ start: { x: 20, y: lineY }, end: { x: pageW - 20, y: lineY }, thickness: 0.5, color: pdfLib.rgb(0.85, 0.87, 0.89) });
                }
              }
            }
          }

          pdfBytes = await pdfDoc.save();
        }
      }

      // Post-traitement : numérotation de pages (APRÈS header/footer pour ne pas être masquée)
      if (pageNumberConfig.enabled) {
        const pdfLib2 = await import("pdf-lib");
        const pdfDoc = await pdfLib2.PDFDocument.load(pdfBytes);
        const font = await pdfDoc.embedFont(pdfLib2.StandardFonts.Helvetica);
        const pages = pdfDoc.getPages();
        const totalPages = pages.length;

        for (let i = 0; i < totalPages; i++) {
          const page = pages[i];
          const { width, height } = page.getSize();
          const text = formatPageNumber(pageNumberConfig.format, i + 1, totalPages);
          const textWidth = font.widthOfTextAtSize(text, pageNumberConfig.fontSize);

          let x: number;
          const marginX = 20;
          if (pageNumberConfig.alignment === "left") x = marginX;
          else if (pageNumberConfig.alignment === "right") x = width - textWidth - marginX;
          else x = (width - textWidth) / 2;

          const mmToPt = 2.835;
          const y = pageNumberConfig.position === "footer"
            ? pageNumberConfig.marginY * mmToPt
            : height - pageNumberConfig.marginY * mmToPt - pageNumberConfig.fontSize;

          page.drawText(text, {
            x, y,
            size: pageNumberConfig.fontSize,
            font,
            color: pdfLib2.rgb(0.58, 0.64, 0.69),
          });
        }

        pdfBytes = await pdfDoc.save();
      }

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      console.error("Erreur prévisualisation:", error);
      alert("Erreur lors de la génération. Voir la console (F12).");
    }
  }, [pageNumberConfig, headerFooterConfig, tableColumnsConfig]);

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
                    onChange={(e) => {
                      const next = e.target.value as "invoice" | "client_receipt" | "receipt";
                      setDocumentType(next);
                      // Reçu client = émis par Animigo, pas pertinent par companyType
                      if (next === "client_receipt") setTargetCompanyType("all");
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-rose-500/50"
                  >
                    <option value="invoice">📄 Facture annonceur (B2B)</option>
                    <option value="client_receipt">🧾 Reçu paiement client</option>
                    {documentType === "receipt" && <option value="receipt">📃 Reçu (déprécié)</option>}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {documentType === "invoice"
                      ? "Facture émise par l'annonceur, destinée à son client (avec SIRET, mentions légales)."
                      : documentType === "client_receipt"
                      ? "Reçu de paiement émis par Animigo, automatiquement généré au paiement Stripe et envoyé au client."
                      : "Format déprécié — bascule vers \"Reçu paiement client\" recommandée."}
                  </p>
                </div>
                {/* Type d'annonceur ciblé : pertinent uniquement pour les factures
                    (qui dépendent du SIRET / régime fiscal de l'annonceur).
                    Un reçu client est émis par Animigo (pas par l'annonceur) → forcé à "all". */}
                {documentType === "invoice" ? (
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
                ) : (
                  <div className="px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                    <p className="text-[10px] text-emerald-400 font-medium uppercase tracking-wider">
                      Reçu plateforme
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Ce reçu est émis par Animigo (pas par l&apos;annonceur). Il s&apos;applique à tous les
                      paiements clients, sans distinction de régime fiscal du prestataire.
                    </p>
                  </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-800 text-rose-500 focus:ring-rose-500/50"
                  />
                  <span className="text-sm text-slate-300">Template par défaut</span>
                </label>

                {/* Marges de page */}
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <h4 className="text-xs font-semibold text-slate-300 mb-2.5">Marges de page (mm)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { idx: 0, label: "Haut" },
                      { idx: 2, label: "Bas" },
                      { idx: 3, label: "Gauche" },
                      { idx: 1, label: "Droite" },
                    ] as const).map(({ idx, label }) => (
                      <div key={idx}>
                        <label className="block text-[10px] text-slate-500 mb-0.5">{label}</label>
                        <input
                          type="number"
                          min={5}
                          max={50}
                          value={margins[idx]}
                          onChange={(e) => {
                            const raw = Number(e.target.value);
                            setMargins((m) => {
                              const next = [...m] as [number, number, number, number];
                              next[idx] = raw;
                              return next;
                            });
                          }}
                          onBlur={(e) => {
                            const val = Math.max(5, Math.min(50, Number(e.target.value) || 5));
                            setMargins((m) => {
                              const next = [...m] as [number, number, number, number];
                              next[idx] = val;
                              return next;
                            });
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-[11px] focus:outline-none focus:border-rose-500/50"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setMargins([10, 10, 10, 10])}
                    className="mt-2 w-full py-1 text-[10px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Marges réduites (10mm)
                  </button>
                  <button
                    onClick={() => setMargins([20, 20, 20, 20])}
                    className="mt-1 w-full py-1 text-[10px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Marges par défaut (20mm)
                  </button>
                </div>

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

                {/* Numérotation de pages */}
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <label className="flex items-center justify-between cursor-pointer mb-2">
                    <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-amber-400" />
                      Numérotation de pages
                    </h4>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={pageNumberConfig.enabled}
                        onChange={(e) => setPageNumberConfig((c) => ({ ...c, enabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-slate-700 peer-checked:bg-amber-500 rounded-full transition-colors" />
                      <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full peer-checked:translate-x-4 transition-transform" />
                    </div>
                  </label>

                  {pageNumberConfig.enabled && (
                    <div className="space-y-2.5 mt-3">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">Position</label>
                        <div className="flex gap-1.5">
                          {(["header", "footer"] as const).map((pos) => (
                            <button
                              key={pos}
                              onClick={() => setPageNumberConfig((c) => ({ ...c, position: pos }))}
                              className={`flex-1 py-1.5 text-[11px] rounded-lg font-medium transition-colors ${
                                pageNumberConfig.position === pos
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-300"
                              }`}
                            >
                              {pos === "header" ? "Haut" : "Bas"}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">Alignement</label>
                        <div className="flex gap-1.5">
                          {(["left", "center", "right"] as const).map((align) => (
                            <button
                              key={align}
                              onClick={() => setPageNumberConfig((c) => ({ ...c, alignment: align }))}
                              className={`flex-1 py-1.5 text-[11px] rounded-lg font-medium transition-colors ${
                                pageNumberConfig.alignment === align
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-300"
                              }`}
                            >
                              {align === "left" ? "Gauche" : align === "center" ? "Centre" : "Droite"}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">Format</label>
                        <select
                          value={pageNumberConfig.format}
                          onChange={(e) => setPageNumberConfig((c) => ({ ...c, format: e.target.value as PageNumberConfig["format"] }))}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-[11px] focus:outline-none focus:border-amber-500/50"
                        >
                          {PAGE_NUMBER_FORMATS.map((f) => (
                            <option key={f.value} value={f.value}>{f.label} — {f.example}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] text-slate-500 mb-1">Taille police</label>
                          <input
                            type="number"
                            min={6}
                            max={14}
                            value={pageNumberConfig.fontSize}
                            onChange={(e) => setPageNumberConfig((c) => ({ ...c, fontSize: Number(e.target.value) }))}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-[11px] focus:outline-none focus:border-amber-500/50"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] text-slate-500 mb-1">Marge (mm)</label>
                          <input
                            type="number"
                            min={5}
                            max={30}
                            value={pageNumberConfig.marginY}
                            onChange={(e) => setPageNumberConfig((c) => ({ ...c, marginY: Number(e.target.value) }))}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-[11px] focus:outline-none focus:border-amber-500/50"
                          />
                        </div>
                      </div>

                      {/* Aperçu du résultat */}
                      <div className="mt-1 p-2 rounded-lg bg-slate-900 border border-slate-700/50 text-center">
                        <p className="text-[10px] text-slate-500 mb-1">Aperçu :</p>
                        <p className="text-[11px] text-amber-400 font-mono">
                          {formatPageNumber(pageNumberConfig.format, 1, 3)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* En-tête / Pied de page */}
                {(["header", "footer"] as const).map((zone) => {
                  const config = headerFooterConfig[zone];
                  const label = zone === "header" ? "En-tête" : "Pied de page";
                  const updateZone = (partial: Partial<ZoneConfig>) =>
                    setHeaderFooterConfig((c) => ({ ...c, [zone]: { ...c[zone], ...partial } }));

                  return (
                    <div key={zone} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                      <label className="flex items-center justify-between cursor-pointer mb-1">
                        <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-cyan-400" />
                          {label}
                        </h4>
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={config.enabled}
                            onChange={(e) => updateZone({ enabled: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4 bg-slate-700 peer-checked:bg-cyan-500 rounded-full transition-colors" />
                          <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full peer-checked:translate-x-4 transition-transform" />
                        </div>
                      </label>

                      {config.enabled && (
                        <div className="space-y-2.5 mt-3">
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-1">Hauteur de la zone (mm)</label>
                            <input
                              type="number"
                              min={10}
                              max={80}
                              value={config.height}
                              onChange={(e) => updateZone({ height: Number(e.target.value) })}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-[11px] focus:outline-none focus:border-cyan-500/50"
                            />
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Les éléments dans les {config.height} premiers mm {zone === "header" ? "du haut" : "du bas"} seront considérés comme {label.toLowerCase()}.
                            </p>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-500 mb-1">Répétition</label>
                            <select
                              value={config.repeat}
                              onChange={(e) => updateZone({ repeat: e.target.value as RepeatRule })}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-[11px] focus:outline-none focus:border-cyan-500/50"
                            >
                              {REPEAT_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.showLine}
                              onChange={(e) => updateZone({ showLine: e.target.checked })}
                              className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/50 w-3.5 h-3.5"
                            />
                            <span className="text-[11px] text-slate-300">Ligne séparatrice</span>
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Mini-schéma visuel de la page */}
                {(headerFooterConfig.header.enabled || headerFooterConfig.footer.enabled) && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-700/50">
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Aperçu zones</p>
                    <div className="relative bg-white rounded border border-slate-600 mx-auto" style={{ width: 120, height: 170 }}>
                      {/* Header zone */}
                      {headerFooterConfig.header.enabled && (() => {
                        const hPct = Math.min(40, (headerFooterConfig.header.height / 297) * 100);
                        return (
                          <div
                            className="absolute top-0 left-0 right-0 bg-cyan-400/20 border-b-2 border-cyan-400 border-dashed flex items-center justify-center"
                            style={{ height: `${hPct}%` }}
                          >
                            <span className="text-[8px] font-bold text-cyan-600">EN-TÊTE {headerFooterConfig.header.height}mm</span>
                          </div>
                        );
                      })()}
                      {/* Footer zone */}
                      {headerFooterConfig.footer.enabled && (() => {
                        const fPct = Math.min(40, (headerFooterConfig.footer.height / 297) * 100);
                        return (
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-cyan-400/20 border-t-2 border-cyan-400 border-dashed flex items-center justify-center"
                            style={{ height: `${fPct}%` }}
                          >
                            <span className="text-[8px] font-bold text-cyan-600">PIED DE PAGE {headerFooterConfig.footer.height}mm</span>
                          </div>
                        );
                      })()}
                      {/* Content zone label */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[8px] text-slate-400">Contenu</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Recherche balises */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={fieldSearch}
                    onChange={(e) => setFieldSearch(e.target.value)}
                    placeholder="Rechercher une balise..."
                    className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                  />
                  {fieldSearch && (
                    <button
                      onClick={() => setFieldSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                    >
                      &times;
                    </button>
                  )}
                </div>

                {/* Info balises inline */}
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-2 text-[11px] text-cyan-300/80 leading-relaxed">
                  Copiez une balise puis collez-la dans un champ texte. Vous pouvez combiner texte libre et balises :
                  <span className="font-mono text-cyan-400 ml-1">{`Facture {{invoiceNumber}}`}</span>
                </div>

                {/* Champs texte */}
                <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Type className="w-3 h-3" />
                  Champs texte
                </h4>
                <div className="space-y-1">
                  {visibleTextFields
                    .filter((f) => {
                      if (!fieldSearch) return true;
                      const q = fieldSearch.toLowerCase();
                      return f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q);
                    })
                    .map((field) => {
                    const isCopied = copiedField === field.key;
                    return (
                      <div
                        key={field.key}
                        className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors group"
                      >
                        <Info className="w-3 h-3 text-slate-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-300 group-hover:text-white">{field.label}</p>
                          <p className="text-[10px] text-slate-600 font-mono truncate">{field.key}</p>
                        </div>
                        <button
                          onClick={() => ctxCopyField(field.key)}
                          className={`flex-shrink-0 p-1.5 rounded-md transition-all duration-300 ${
                            isCopied
                              ? "bg-emerald-500/20 text-emerald-400 scale-110"
                              : "text-slate-600 hover:text-cyan-400 hover:bg-slate-700"
                          }`}
                          title={`Copier "${field.key}"`}
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Tableau des prestations - Configuration colonnes */}
                <TableColumnsPanel
                  tableKey="itemsTable"
                  config={tableColumnsConfig}
                  onChange={handleItemsTableChange}
                />

                {/* Tableau des totaux - Configuration colonnes */}
                <TableColumnsPanel
                  tableKey="totalsTable"
                  config={tableColumnsConfig}
                  onChange={handleTotalsTableChange}
                />

                {/* Champs image */}
                <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 pt-2">
                  <ImageIcon className="w-3 h-3" />
                  Images dynamiques
                </h4>
                {visibleImageFields.map((field) => (
                  <div
                    key={field.key}
                    className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20"
                  >
                    <p className="text-xs font-semibold text-orange-400">{field.label}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{(field as any).description || field.example}</p>
                    <p className="text-[10px] text-slate-500 mt-1.5 font-mono">Clé : {field.key}</p>
                  </div>
                ))}
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

          {/* Overlay guides en-tête / pied de page */}
          <div
            ref={overlayRef}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", zIndex: 5 }}
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
              <p className="px-3 py-1 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Images dynamiques</p>
              {visibleImageFields.map((field) => (
                <button
                  key={field.key}
                  onClick={() => {
                    if (!designerInstance.current) return;
                    setContextMenu((prev) => ({ ...prev, visible: false }));
                    const tmpl = designerInstance.current.getTemplate();
                    const currentPage = tmpl.schemas[0] || [];
                    const newSchema = {
                      name: field.key,
                      type: "image",
                      content: "",
                      position: { x: 10, y: 10 },
                      width: 25,
                      height: 25,
                    };
                    tmpl.schemas[0] = [...currentPage, newSchema];
                    designerInstance.current.updateTemplate(tmpl);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <ImageIcon className="w-4 h-4 text-orange-400" />
                  {field.label}
                </button>
              ))}
              <div className="mx-2 my-1 h-px bg-slate-800" />
              <p className="px-3 py-1 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Balises</p>
              <div className="relative">
                <button
                  onClick={() => { setShowFieldsSubmenu((v) => !v); setCtxFieldSearch(""); }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <ClipboardPaste className="w-4 h-4 text-cyan-400" />
                    Copier la balise
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 text-slate-500 transition-transform ${showFieldsSubmenu ? "rotate-90" : ""}`} />
                </button>
                {showFieldsSubmenu && (
                  <div className="fixed z-[110] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-black/50 py-1.5 w-64 max-h-[360px] flex flex-col"
                    style={{
                      left: Math.min(contextMenu.x + 220, window.innerWidth - 270),
                      top: Math.min(contextMenu.y, window.innerHeight - 370),
                    }}
                  >
                    <div className="px-2 pt-1 pb-1.5 flex-shrink-0">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Rechercher une balise..."
                          value={ctxFieldSearch}
                          onChange={(e) => setCtxFieldSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full pl-7 pr-2 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto flex-1">
                    {visibleTextFields.filter((field) => {
                      if (!ctxFieldSearch) return true;
                      const q = ctxFieldSearch.toLowerCase();
                      return field.label.toLowerCase().includes(q) || field.key.toLowerCase().includes(q);
                    }).map((field) => {
                      const isCopied = copiedField === field.key;
                      return (
                        <div
                          key={field.key}
                          className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-800 transition-colors group"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-slate-300 group-hover:text-white leading-tight block truncate">{field.label}</span>
                            <span className="text-[10px] text-slate-600 font-mono block truncate">{field.key}</span>
                          </div>
                          <button
                            onClick={() => ctxCopyField(field.key)}
                            className={`flex-shrink-0 p-1 rounded transition-all duration-300 ${
                              isCopied
                                ? "bg-emerald-500/20 text-emerald-400 scale-110"
                                : "text-slate-500 hover:text-cyan-400 hover:bg-slate-700"
                            }`}
                            title={`Copier "${field.key}"`}
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={ctxPasteField}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                {pastedField ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Collé : {pastedField}</span>
                  </>
                ) : (
                  <>
                    <ClipboardPaste className="w-4 h-4 text-emerald-400" />
                    Coller la balise
                  </>
                )}
              </button>
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
