/**
 * Constantes partagées de l'éditeur de template PDF.
 * Extraites de [id]/page.tsx pour réduire le monolithe et permettre le tree-shaking.
 */

// ============================================
// TYPES DOCUMENTS
// ============================================

export type DocumentType = "invoice" | "client_receipt" | "receipt";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  invoice: "Facture",
  client_receipt: "Reçu paiement client",
  receipt: "Reçu (déprécié)",
};

export const DOCUMENT_TYPE_ICONS: Record<DocumentType, string> = {
  invoice: "📄",
  client_receipt: "🧾",
  receipt: "📃",
};

// ============================================
// BALISES DYNAMIQUES — communes à tous les types
// ============================================

export interface FieldDef {
  key: string;
  label: string;
  example: string;
  /** Si défini, balise réservée à certains types de documents. Sinon disponible partout. */
  documentTypes?: DocumentType[];
}

const COMMON_FIELDS: FieldDef[] = [
  { key: "documentType", label: "Type document", example: "FACTURE" },
  { key: "date", label: "Date émission", example: "14/03/2026" },
  // Client (destinataire de la facture / reçu)
  { key: "clientName", label: "Nom client", example: "Jean Dupont" },
  { key: "clientEmail", label: "Email client", example: "jean@example.com" },
  { key: "clientPhone", label: "Tél. client", example: "06 12 34 56 78" },
  { key: "clientAddress", label: "Adresse complète client", example: "12 rue des Lilas, 75015 Paris" },
  { key: "clientStreet", label: "Rue client", example: "12 rue des Lilas" },
  { key: "clientPostalCode", label: "Code postal client", example: "75015" },
  { key: "clientCity", label: "Ville client", example: "Paris" },
  // Prestation
  { key: "serviceName", label: "Nom service", example: "Garde de chien" },
  { key: "missionDate", label: "Date prestation", example: "10/03/2026 - 12/03/2026" },
  { key: "sessionType", label: "Type séance", example: "Individuel" },
  { key: "animalDetails", label: "Animaux (détail)", example: "Max (Chien), Luna (Chat)" },
  { key: "timeRange", label: "Horaires", example: "09:00 - 18:00" },
];

const INVOICE_FIELDS: FieldDef[] = [
  { key: "invoiceNumber", label: "N° Facture", example: "FA-2026-0042", documentTypes: ["invoice"] },
  { key: "announcerName", label: "Nom prestataire", example: "Marie Martin", documentTypes: ["invoice"] },
  { key: "announcerEmail", label: "Email prestataire", example: "marie@example.com", documentTypes: ["invoice"] },
  { key: "announcerPhone", label: "Tél. prestataire", example: "06 98 76 54 32", documentTypes: ["invoice"] },
  { key: "announcerAddress", label: "Adresse prestataire", example: "5 av. des Champs, 75008 Paris", documentTypes: ["invoice"] },
  { key: "announcerStreet", label: "Rue prestataire", example: "5 avenue des Champs", documentTypes: ["invoice"] },
  { key: "announcerPostalCode", label: "Code postal prestataire", example: "75008", documentTypes: ["invoice"] },
  { key: "announcerCity", label: "Ville prestataire", example: "Paris", documentTypes: ["invoice"] },
  { key: "companyName", label: "Raison sociale", example: "Pet Care SARL", documentTypes: ["invoice"] },
  { key: "siret", label: "SIRET", example: "SIRET : 123 456 789 00012", documentTypes: ["invoice"] },
  { key: "capital", label: "Capital social", example: "Capital : 10 000 €", documentTypes: ["invoice"] },
  { key: "sapMention", label: "Mention SAP", example: "Service à la personne - TVA réduite 10%", documentTypes: ["invoice"] },
  { key: "sapApprovalNumber", label: "N° agrément SAP", example: "Agrément SAP : SAP-2025-12345", documentTypes: ["invoice"] },
  { key: "vatRate", label: "Taux TVA", example: "20 %", documentTypes: ["invoice"] },
  { key: "mentionTVA", label: "Mention TVA", example: "TVA non applicable, art. 293 B du CGI", documentTypes: ["invoice"] },
  { key: "amountHT", label: "Total HT (texte)", example: "Total HT : 75,00 €", documentTypes: ["invoice"] },
  { key: "tva", label: "TVA (texte)", example: "TVA (20%) : 15,00 €", documentTypes: ["invoice"] },
  { key: "amountTTC", label: "Total TTC (texte)", example: "Total TTC : 90,00 €", documentTypes: ["invoice"] },
];

// Balises spécifiques au reçu client (preuve de paiement)
const CLIENT_RECEIPT_FIELDS: FieldDef[] = [
  { key: "receiptNumber", label: "N° Reçu", example: "REC-2026-0042", documentTypes: ["client_receipt"] },
  { key: "bookingNumber", label: "N° Réservation", example: "RES-2026-0042", documentTypes: ["client_receipt"] },
  { key: "paymentDate", label: "Date du paiement", example: "12/03/2026 à 14:32", documentTypes: ["client_receipt"] },
  { key: "paymentMethod", label: "Mode de paiement", example: "Carte bancaire (•••• 4242)", documentTypes: ["client_receipt"] },
  { key: "transactionId", label: "Réf. transaction Stripe", example: "pi_3OqXyz...", documentTypes: ["client_receipt"] },
  { key: "paidAmount", label: "Montant payé", example: "90,00 €", documentTypes: ["client_receipt"] },
  { key: "paymentStatus", label: "Statut paiement", example: "PAYÉ", documentTypes: ["client_receipt"] },
  { key: "bookingDate", label: "Date prestation", example: "15/03/2026", documentTypes: ["client_receipt"] },
  { key: "serviceProvider", label: "Prestataire", example: "Marie Martin", documentTypes: ["client_receipt"] },
  { key: "platformName", label: "Nom plateforme", example: "Animigo", documentTypes: ["client_receipt"] },
  { key: "platformFee", label: "Commission plateforme", example: "Commission Animigo : 13,50 €", documentTypes: ["client_receipt"] },
  { key: "thankYouMessage", label: "Message de remerciement", example: "Merci pour votre confiance !", documentTypes: ["client_receipt"] },
];

export const TEXT_FIELDS: FieldDef[] = [
  ...COMMON_FIELDS,
  ...INVOICE_FIELDS,
  ...CLIENT_RECEIPT_FIELDS,
];

export const IMAGE_FIELDS: FieldDef[] = [
  { key: "companyLogo", label: "Logo entreprise", example: "Logo de l'annonceur (Paramètres > Informations)" },
  { key: "platformLogo", label: "Logo Animigo", example: "Logo plateforme (reçus client)", documentTypes: ["client_receipt"] },
];

/** Filtre les balises selon le type de document courant. */
export function filterFieldsByDocumentType(fields: FieldDef[], docType: DocumentType): FieldDef[] {
  return fields.filter((f) => !f.documentTypes || f.documentTypes.includes(docType));
}

// ============================================
// COLONNES TABLEAU
// ============================================

export interface TableColumnDef {
  id: string;
  dataField: string;
  headerText: string;
  widthPercent: number;
  enabled: boolean;
  contentTemplate?: string;
}

export interface TableColumnsConfig {
  itemsTable?: TableColumnDef[];
  totalsTable?: TableColumnDef[];
}

export const ITEMS_COLUMN_FIELDS = [
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

export const TOTALS_COLUMN_FIELDS = [
  { field: "label", label: "Libellé", defaultHeader: "Libellé", defaultWidth: 60 },
  { field: "amount", label: "Montant", defaultHeader: "Montant", defaultWidth: 40 },
] as const;

export const ITEMS_TABLE_DEFAULT_WIDTHS = [34, 7, 8, 13, 9, 14, 15];

export function getDefaultItemsColumns(): TableColumnDef[] {
  const defaults = ["description", "quantity", "unit", "unitPriceHT", "vatRate", "vatAmount", "totalTTC"];
  return defaults.map((field, i) => {
    const def = ITEMS_COLUMN_FIELDS.find((f) => f.field === field)!;
    return {
      id: `items_col_${i}`,
      dataField: field,
      headerText: def.defaultHeader,
      widthPercent: ITEMS_TABLE_DEFAULT_WIDTHS[i],
      enabled: true,
    };
  });
}

export function getDefaultTotalsColumns(): TableColumnDef[] {
  return TOTALS_COLUMN_FIELDS.map((def, i) => ({
    id: `totals_col_${i}`,
    dataField: def.field,
    headerText: def.defaultHeader,
    widthPercent: def.defaultWidth,
    enabled: true,
  }));
}

// ============================================
// NUMÉROTATION DE PAGES
// ============================================

export interface PageNumberConfig {
  enabled: boolean;
  position: "header" | "footer";
  alignment: "left" | "center" | "right";
  format: "page_x_of_y" | "x_of_y" | "x_slash_y" | "page_x";
  fontSize: number;
  marginY: number;
}

export const DEFAULT_PAGE_NUMBER_CONFIG: PageNumberConfig = {
  enabled: false,
  position: "footer",
  alignment: "center",
  format: "page_x_of_y",
  fontSize: 8,
  marginY: 10,
};

export const PAGE_NUMBER_FORMATS: { value: PageNumberConfig["format"]; label: string; example: string }[] = [
  { value: "page_x_of_y", label: "Page X sur Y", example: "Page 1 sur 3" },
  { value: "x_of_y", label: "X sur Y", example: "1 sur 3" },
  { value: "x_slash_y", label: "X / Y", example: "1 / 3" },
  { value: "page_x", label: "Page X", example: "Page 1" },
];

export function formatPageNumber(format: PageNumberConfig["format"], page: number, total: number): string {
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

export type RepeatRule = "all_pages" | "first_page_only" | "all_except_first" | "even_pages" | "odd_pages";

export interface ZoneConfig {
  enabled: boolean;
  height: number;
  repeat: RepeatRule;
  showLine: boolean;
}

export interface HeaderFooterConfig {
  header: ZoneConfig;
  footer: ZoneConfig;
}

export const DEFAULT_HEADER_FOOTER_CONFIG: HeaderFooterConfig = {
  header: { enabled: false, height: 30, repeat: "all_pages", showLine: false },
  footer: { enabled: false, height: 20, repeat: "all_pages", showLine: false },
};

export const REPEAT_OPTIONS: { value: RepeatRule; label: string }[] = [
  { value: "all_pages", label: "Toutes les pages" },
  { value: "first_page_only", label: "Première page uniquement" },
  { value: "all_except_first", label: "Toutes sauf la première" },
  { value: "even_pages", label: "Pages paires (2, 4, 6…)" },
  { value: "odd_pages", label: "Pages impaires (1, 3, 5…)" },
];

export function shouldApplyToPage(repeat: RepeatRule, pageIndex: number): boolean {
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

export const DYNAMIC_BASE_PDF = { width: 210, height: 297, padding: [20, 20, 20, 20] };
