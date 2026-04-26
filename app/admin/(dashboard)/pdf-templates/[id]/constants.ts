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

// Balises spécifiques au reçu client (preuve de paiement émise par la plateforme)
const CLIENT_RECEIPT_FIELDS: FieldDef[] = [
  // ─── Identification du document ───
  { key: "receiptNumber", label: "N° Reçu", example: "REC-2026-0042", documentTypes: ["client_receipt"] },
  { key: "bookingNumber", label: "N° Réservation", example: "RES-2026-0042", documentTypes: ["client_receipt"] },
  { key: "paymentStatus", label: "Statut paiement", example: "PAYÉ", documentTypes: ["client_receipt"] },
  // ─── Détails du paiement Stripe ───
  { key: "paymentDate", label: "Date + heure du paiement", example: "12/03/2026 à 14:32", documentTypes: ["client_receipt"] },
  { key: "paymentMethod", label: "Mode de paiement", example: "Carte Visa •••• 4242", documentTypes: ["client_receipt"] },
  { key: "cardLast4", label: "4 derniers chiffres carte", example: "•••• 4242", documentTypes: ["client_receipt"] },
  { key: "cardBrand", label: "Marque carte", example: "Visa", documentTypes: ["client_receipt"] },
  { key: "transactionId", label: "Réf. transaction Stripe", example: "pi_3OqXyz...", documentTypes: ["client_receipt"] },
  { key: "paidAmount", label: "Montant total payé", example: "90,00 €", documentTypes: ["client_receipt"] },
  { key: "paidAmountInWords", label: "Montant en lettres", example: "Quatre-vingt-dix euros", documentTypes: ["client_receipt"] },
  // ─── Service réservé ───
  { key: "bookingDate", label: "Date prestation", example: "15/03/2026", documentTypes: ["client_receipt"] },
  { key: "serviceLocation", label: "Lieu prestation", example: "Au domicile du client", documentTypes: ["client_receipt"] },
  // ─── Prestataire (annonceur) ───
  { key: "serviceProvider", label: "Nom prestataire", example: "Marie Martin", documentTypes: ["client_receipt"] },
  { key: "providerStatus", label: "Statut prestataire", example: "Micro-entrepreneur", documentTypes: ["client_receipt"] },
  { key: "providerAddress", label: "Adresse prestataire", example: "12 rue des Lilas, 75015 Paris", documentTypes: ["client_receipt"] },
  { key: "providerSiret", label: "SIRET prestataire (si pro)", example: "SIRET : 123 456 789 00012", documentTypes: ["client_receipt"] },
  // ─── Plateforme Animigo (émetteur du reçu) ───
  { key: "platformName", label: "Nom plateforme", example: "Animigo", documentTypes: ["client_receipt"] },
  { key: "platformLegalName", label: "Raison sociale plateforme", example: "Animigo SAS", documentTypes: ["client_receipt"] },
  { key: "platformAddress", label: "Adresse plateforme", example: "10 rue de la Paix, 75002 Paris", documentTypes: ["client_receipt"] },
  { key: "platformSiret", label: "SIRET plateforme", example: "SIRET : 987 654 321 00023", documentTypes: ["client_receipt"] },
  { key: "platformCapital", label: "Capital social plateforme", example: "Capital social : 10 000 €", documentTypes: ["client_receipt"] },
  { key: "platformContact", label: "Contact plateforme", example: "support@animigo.fr — 01 23 45 67 89", documentTypes: ["client_receipt"] },
  // ─── Décomposition financière ───
  { key: "platformFee", label: "Commission plateforme", example: "Commission Animigo : 13,50 €", documentTypes: ["client_receipt"] },
  { key: "providerEarnings", label: "Reversé au prestataire", example: "76,50 €", documentTypes: ["client_receipt"] },
  // ─── Mentions légales obligatoires ───
  { key: "escrowMention", label: "Mention séquestre / escrow", example: "Les fonds sont conservés...", documentTypes: ["client_receipt"] },
  { key: "stripeMention", label: "Mention Stripe (DSP2)", example: "Paiement traité par Stripe Payments Europe Ltd", documentTypes: ["client_receipt"] },
  { key: "intermediaryMention", label: "Mention intermédiation", example: "Animigo agit en tant que plateforme de mise en relation", documentTypes: ["client_receipt"] },
  { key: "cgvMention", label: "Mention CGV", example: "Conformément aux CGV acceptées lors de la réservation", documentTypes: ["client_receipt"] },
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

// ============================================
// TEMPLATE PAR DÉFAUT — REÇU CLIENT (PRÉ-REMPLI)
// ============================================

/**
 * Template prêt à l'emploi pour un reçu de paiement client (Animigo).
 * Contient :
 *  - En-tête : titre "REÇU DE PAIEMENT" + n° reçu + date émission + statut "PAYÉ"
 *  - Bloc client (destinataire)
 *  - Bloc prestataire (avec SIRET conditionnel selon statut)
 *  - Bloc plateforme (Animigo, émetteur)
 *  - Bloc service réservé (dates, lieu, animaux)
 *  - Bloc paiement (date, mode, transaction Stripe, montant)
 *  - Décomposition financière (commission + reversement)
 *  - Mentions légales obligatoires (escrow, Stripe, intermédiation, CGV)
 *  - Footer avec mentions plateforme
 */
export function getDefaultClientReceiptTemplate() {
  return {
    basePdf: { width: 210, height: 297, padding: [15, 15, 15, 15] },
    schemas: [[
      // ─── HEADER ───
      {
        name: "documentType",
        type: "text",
        content: "REÇU DE PAIEMENT",
        position: { x: 0, y: 0 },
        width: 100,
        height: 12,
        fontSize: 22,
        fontColor: "#10b981",
        fontName: "Helvetica-Bold",
      },
      {
        name: "platformName",
        type: "text",
        content: "Animigo",
        position: { x: 130, y: 0 },
        width: 50,
        height: 8,
        fontSize: 14,
        fontColor: "#1f3a33",
        alignment: "right",
        fontName: "Helvetica-Bold",
      },
      {
        name: "receiptNumber",
        type: "text",
        content: "REC-2026-0042",
        position: { x: 130, y: 9 },
        width: 50,
        height: 5,
        fontSize: 9,
        fontColor: "#64748b",
        alignment: "right",
      },
      {
        name: "date",
        type: "text",
        content: "Émis le 12/03/2026",
        position: { x: 130, y: 14 },
        width: 50,
        height: 5,
        fontSize: 9,
        fontColor: "#64748b",
        alignment: "right",
      },
      // Badge "PAYÉ"
      {
        name: "paymentStatus",
        type: "text",
        content: "PAYÉ",
        position: { x: 0, y: 14 },
        width: 30,
        height: 7,
        fontSize: 11,
        fontColor: "#10b981",
        backgroundColor: "#d1fae5",
        alignment: "center",
        fontName: "Helvetica-Bold",
      },
      {
        name: "bookingNumber",
        type: "text",
        content: "Réservation : RES-2026-0042",
        position: { x: 32, y: 15 },
        width: 80,
        height: 5,
        fontSize: 9,
        fontColor: "#64748b",
      },

      // ─── DESTINATAIRE (CLIENT) ───
      {
        name: "_label_client",
        type: "text",
        content: "REÇU REMIS À",
        position: { x: 0, y: 30 },
        width: 80,
        height: 4,
        fontSize: 8,
        fontColor: "#9c9484",
        fontName: "Helvetica-Bold",
      },
      {
        name: "clientName",
        type: "text",
        content: "Jean Dupont",
        position: { x: 0, y: 35 },
        width: 80,
        height: 6,
        fontSize: 11,
        fontName: "Helvetica-Bold",
        fontColor: "#1f1f1d",
      },
      {
        name: "clientAddress",
        type: "text",
        content: "12 rue des Lilas, 75015 Paris",
        position: { x: 0, y: 41 },
        width: 80,
        height: 5,
        fontSize: 9,
        fontColor: "#64748b",
      },
      {
        name: "clientEmail",
        type: "text",
        content: "jean@example.com",
        position: { x: 0, y: 46 },
        width: 80,
        height: 5,
        fontSize: 9,
        fontColor: "#64748b",
      },

      // ─── ÉMETTEUR (ANIMIGO) ───
      {
        name: "_label_platform",
        type: "text",
        content: "ÉMIS PAR",
        position: { x: 110, y: 30 },
        width: 70,
        height: 4,
        fontSize: 8,
        fontColor: "#9c9484",
        alignment: "right",
        fontName: "Helvetica-Bold",
      },
      {
        name: "platformLegalName",
        type: "text",
        content: "Animigo SAS",
        position: { x: 110, y: 35 },
        width: 70,
        height: 6,
        fontSize: 11,
        fontName: "Helvetica-Bold",
        alignment: "right",
        fontColor: "#1f1f1d",
      },
      {
        name: "platformAddress",
        type: "text",
        content: "10 rue de la Paix, 75002 Paris",
        position: { x: 110, y: 41 },
        width: 70,
        height: 5,
        fontSize: 9,
        fontColor: "#64748b",
        alignment: "right",
      },
      {
        name: "platformSiret",
        type: "text",
        content: "SIRET : 987 654 321 00023",
        position: { x: 110, y: 46 },
        width: 70,
        height: 5,
        fontSize: 9,
        fontColor: "#64748b",
        alignment: "right",
      },
      // ─── BLOC SERVICE RÉSERVÉ ───
      {
        name: "_section_service",
        type: "text",
        content: "DÉTAIL DE LA PRESTATION",
        position: { x: 0, y: 65 },
        width: 180,
        height: 5,
        fontSize: 9,
        fontColor: "#1f3a33",
        fontName: "Helvetica-Bold",
        backgroundColor: "#f5f9f6",
      },
      {
        name: "serviceName",
        type: "text",
        content: "Garde de chien — Formule Premium",
        position: { x: 2, y: 71 },
        width: 178,
        height: 6,
        fontSize: 11,
        fontName: "Helvetica-Bold",
        fontColor: "#1f1f1d",
      },
      {
        name: "missionDate",
        type: "text",
        content: "Du 15/03/2026 au 17/03/2026",
        position: { x: 2, y: 78 },
        width: 88,
        height: 5,
        fontSize: 9,
        fontColor: "#64748b",
      },
      {
        name: "serviceLocation",
        type: "text",
        content: "Au domicile du client",
        position: { x: 92, y: 78 },
        width: 88,
        height: 5,
        fontSize: 9,
        fontColor: "#64748b",
      },
      {
        name: "animalDetails",
        type: "text",
        content: "Max (Chien), Luna (Chat)",
        position: { x: 2, y: 83 },
        width: 178,
        height: 5,
        fontSize: 9,
        fontColor: "#64748b",
      },
      // Prestataire (sous le service)
      {
        name: "_label_provider",
        type: "text",
        content: "Prestataire :",
        position: { x: 2, y: 90 },
        width: 25,
        height: 5,
        fontSize: 9,
        fontColor: "#9c9484",
      },
      {
        name: "serviceProvider",
        type: "text",
        content: "Marie Martin",
        position: { x: 27, y: 90 },
        width: 60,
        height: 5,
        fontSize: 9,
        fontColor: "#1f1f1d",
        fontName: "Helvetica-Bold",
      },
      {
        name: "providerStatus",
        type: "text",
        content: "Micro-entrepreneur",
        position: { x: 90, y: 90 },
        width: 50,
        height: 5,
        fontSize: 8,
        fontColor: "#9c9484",
      },
      {
        name: "providerSiret",
        type: "text",
        content: "SIRET : 123 456 789 00012",
        position: { x: 2, y: 95 },
        width: 178,
        height: 5,
        fontSize: 8,
        fontColor: "#9c9484",
      },

      // ─── BLOC PAIEMENT ───
      {
        name: "_section_payment",
        type: "text",
        content: "DÉTAIL DU PAIEMENT",
        position: { x: 0, y: 108 },
        width: 180,
        height: 5,
        fontSize: 9,
        fontColor: "#1f3a33",
        fontName: "Helvetica-Bold",
        backgroundColor: "#f5f9f6",
      },
      {
        name: "_label_paymentDate",
        type: "text",
        content: "Date du paiement :",
        position: { x: 2, y: 115 },
        width: 50,
        height: 5,
        fontSize: 9,
        fontColor: "#64748b",
      },
      {
        name: "paymentDate",
        type: "text",
        content: "12/03/2026 à 14:32",
        position: { x: 52, y: 115 },
        width: 80,
        height: 5,
        fontSize: 9,
        fontColor: "#1f1f1d",
        fontName: "Helvetica-Bold",
      },
      {
        name: "_label_paymentMethod",
        type: "text",
        content: "Mode de paiement :",
        position: { x: 2, y: 121 },
        width: 50,
        height: 5,
        fontSize: 9,
        fontColor: "#64748b",
      },
      {
        name: "paymentMethod",
        type: "text",
        content: "Carte Visa •••• 4242",
        position: { x: 52, y: 121 },
        width: 80,
        height: 5,
        fontSize: 9,
        fontColor: "#1f1f1d",
        fontName: "Helvetica-Bold",
      },
      {
        name: "_label_transaction",
        type: "text",
        content: "Réf. transaction :",
        position: { x: 2, y: 127 },
        width: 50,
        height: 5,
        fontSize: 9,
        fontColor: "#64748b",
      },
      {
        name: "transactionId",
        type: "text",
        content: "pi_3OqXyz1abc...",
        position: { x: 52, y: 127 },
        width: 130,
        height: 5,
        fontSize: 8,
        fontColor: "#1f1f1d",
        fontName: "Courier",
      },

      // ─── MONTANT TOTAL ───
      {
        name: "_label_total",
        type: "text",
        content: "MONTANT TOTAL PAYÉ",
        position: { x: 110, y: 138 },
        width: 70,
        height: 5,
        fontSize: 8,
        fontColor: "#9c9484",
        alignment: "right",
        fontName: "Helvetica-Bold",
      },
      {
        name: "paidAmount",
        type: "text",
        content: "90,00 €",
        position: { x: 110, y: 143 },
        width: 70,
        height: 12,
        fontSize: 22,
        fontColor: "#10b981",
        alignment: "right",
        fontName: "Helvetica-Bold",
      },

      // ─── DÉCOMPOSITION ───
      {
        name: "_label_breakdown",
        type: "text",
        content: "Dont commission Animigo :",
        position: { x: 110, y: 158 },
        width: 50,
        height: 5,
        fontSize: 8,
        fontColor: "#64748b",
        alignment: "right",
      },
      {
        name: "platformFee",
        type: "text",
        content: "13,50 €",
        position: { x: 162, y: 158 },
        width: 18,
        height: 5,
        fontSize: 8,
        fontColor: "#64748b",
        alignment: "right",
      },
      {
        name: "_label_provider_earnings",
        type: "text",
        content: "Reversé au prestataire :",
        position: { x: 110, y: 163 },
        width: 50,
        height: 5,
        fontSize: 8,
        fontColor: "#64748b",
        alignment: "right",
      },
      {
        name: "providerEarnings",
        type: "text",
        content: "76,50 €",
        position: { x: 162, y: 163 },
        width: 18,
        height: 5,
        fontSize: 8,
        fontColor: "#64748b",
        alignment: "right",
      },

      // ─── MENTIONS LÉGALES OBLIGATOIRES ───
      {
        name: "_section_legal",
        type: "text",
        content: "MENTIONS LÉGALES",
        position: { x: 0, y: 180 },
        width: 180,
        height: 5,
        fontSize: 8,
        fontColor: "#9c9484",
        fontName: "Helvetica-Bold",
      },
      {
        name: "intermediaryMention",
        type: "text",
        content: "Animigo agit en tant que plateforme de mise en relation entre les particuliers et les prestataires de services animaliers. La présente preuve de paiement n'est pas une facture commerciale.",
        position: { x: 0, y: 186 },
        width: 180,
        height: 8,
        fontSize: 7,
        fontColor: "#64748b",
      },
      {
        name: "stripeMention",
        type: "text",
        content: "Paiement sécurisé traité par Stripe Payments Europe Ltd, prestataire de services de paiement agréé.",
        position: { x: 0, y: 195 },
        width: 180,
        height: 5,
        fontSize: 7,
        fontColor: "#64748b",
      },
      {
        name: "escrowMention",
        type: "text",
        content: "Les fonds sont conservés sur le compte séquestre Animigo jusqu'à confirmation par le client de la réalisation du service, puis reversés au prestataire conformément à nos CGV.",
        position: { x: 0, y: 201 },
        width: 180,
        height: 8,
        fontSize: 7,
        fontColor: "#64748b",
      },
      {
        name: "_legal_note",
        type: "text",
        content: "Ce reçu n'est pas une facture commerciale. Pour toute facture comptable détaillée (TVA, mentions légales du prestataire), veuillez vous référer à la facture émise par votre prestataire.",
        position: { x: 0, y: 211 },
        width: 180,
        height: 8,
        fontSize: 7,
        fontColor: "#64748b",
        fontName: "Helvetica-Oblique",
      },
      {
        name: "cgvMention",
        type: "text",
        content: "Document établi conformément aux Conditions Générales de Vente acceptées lors de la réservation.",
        position: { x: 0, y: 220 },
        width: 180,
        height: 5,
        fontSize: 7,
        fontColor: "#64748b",
      },

      // ─── FOOTER ───
      {
        name: "thankYouMessage",
        type: "text",
        content: "Merci pour votre confiance — l'équipe Animigo",
        position: { x: 0, y: 248 },
        width: 180,
        height: 6,
        fontSize: 10,
        fontColor: "#1f3a33",
        alignment: "center",
        fontName: "Helvetica-Oblique",
      },
      {
        name: "platformContact",
        type: "text",
        content: "support@animigo.fr — animigo.fr",
        position: { x: 0, y: 256 },
        width: 180,
        height: 4,
        fontSize: 7,
        fontColor: "#9c9484",
        alignment: "center",
      },
      {
        name: "platformCapital",
        type: "text",
        content: "Animigo SAS — Capital social : 10 000 € — RCS Paris",
        position: { x: 0, y: 261 },
        width: 180,
        height: 4,
        fontSize: 7,
        fontColor: "#9c9484",
        alignment: "center",
      },
    ]],
  };
}
