// Génération de facture PDF conforme à la réglementation française
// Utilise jsPDF (déjà installé dans le projet)

interface InvoiceEmitter {
  firstName: string;
  lastName: string;
  companyName?: string;
  siret?: string;
  legalForm?: string;
  isVatSubject?: boolean;
  email: string;
  phone: string;
}

interface InvoiceAddress {
  location?: string;
  city?: string;
  postalCode?: string;
}

interface InvoiceRecipient {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceMission {
  serviceName: string;
  variantName?: string;
  startDate: string;
  endDate: string;
  serviceCategory?: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  createdAt: number;
  amount: number;
  amountHT?: number;
  tva?: number;
  items: InvoiceItem[];
  emitter: InvoiceEmitter;
  emitterAddress?: InvoiceAddress;
  recipient: InvoiceRecipient;
  recipientAddress?: InvoiceAddress;
  mission?: InvoiceMission;
}

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatServiceDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // === EN-TÊTE ===
  // Logo Animigo
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 107, 107); // #FF6B6B
  doc.text("Animigo", margin, y);

  // Titre facture
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text("FACTURE", pageWidth - margin, y, { align: "right" });
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`N° ${data.invoiceNumber}`, pageWidth - margin, y, { align: "right" });
  y += 5;
  doc.text(`Date : ${formatDate(data.createdAt)}`, pageWidth - margin, y, { align: "right" });
  y += 12;

  // Ligne séparatrice
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  // === ÉMETTEUR (gauche) / DESTINATAIRE (droite) ===
  const halfWidth = contentWidth / 2 - 5;

  // Émetteur
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120, 120, 120);
  doc.text("ÉMETTEUR", margin, y);

  // Destinataire
  doc.text("DESTINATAIRE", margin + halfWidth + 10, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40);

  // Nom émetteur
  const emitterName = data.emitter.companyName || `${data.emitter.firstName} ${data.emitter.lastName}`;
  doc.text(emitterName, margin, y);

  // Nom destinataire
  doc.text(`${data.recipient.firstName} ${data.recipient.lastName}`, margin + halfWidth + 10, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);

  // Détails émetteur
  let emitterY = y;
  if (data.emitter.companyName) {
    doc.text(`${data.emitter.firstName} ${data.emitter.lastName}`, margin, emitterY);
    emitterY += 4;
  }
  if (data.emitter.legalForm) {
    doc.text(data.emitter.legalForm, margin, emitterY);
    emitterY += 4;
  }
  if (data.emitter.siret) {
    doc.text(`SIRET : ${data.emitter.siret}`, margin, emitterY);
    emitterY += 4;
  }
  if (data.emitterAddress?.location) {
    doc.text(data.emitterAddress.location, margin, emitterY);
    emitterY += 4;
  }
  if (data.emitterAddress?.postalCode || data.emitterAddress?.city) {
    doc.text(`${data.emitterAddress.postalCode || ""} ${data.emitterAddress.city || ""}`.trim(), margin, emitterY);
    emitterY += 4;
  }
  doc.text(data.emitter.email, margin, emitterY);
  emitterY += 4;
  doc.text(data.emitter.phone, margin, emitterY);

  // Détails destinataire
  let recipientY = y;
  doc.text(data.recipient.email, margin + halfWidth + 10, recipientY);
  recipientY += 4;
  if (data.recipient.phone) {
    doc.text(data.recipient.phone, margin + halfWidth + 10, recipientY);
    recipientY += 4;
  }
  if (data.recipientAddress?.location) {
    doc.text(data.recipientAddress.location, margin + halfWidth + 10, recipientY);
    recipientY += 4;
  }
  if (data.recipientAddress?.postalCode || data.recipientAddress?.city) {
    doc.text(`${data.recipientAddress.postalCode || ""} ${data.recipientAddress.city || ""}`.trim(), margin + halfWidth + 10, recipientY);
  }

  y = Math.max(emitterY, recipientY) + 12;

  // === OBJET / MISSION ===
  if (data.mission) {
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(margin, y, contentWidth, 16, 2, 2, "F");
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text("Objet :", margin + 4, y);
    doc.setFont("helvetica", "normal");
    doc.text(
      `${data.mission.serviceName}${data.mission.variantName ? ` - ${data.mission.variantName}` : ""}`,
      margin + 25,
      y
    );
    y += 5;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Période : du ${formatServiceDate(data.mission.startDate)} au ${formatServiceDate(data.mission.endDate)}`,
      margin + 4,
      y
    );
    y += 12;
  }

  // === TABLEAU DES PRESTATIONS ===
  // Header
  const colX = {
    description: margin,
    qty: margin + contentWidth * 0.55,
    unitPrice: margin + contentWidth * 0.68,
    total: margin + contentWidth * 0.85,
  };

  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y - 4, contentWidth, 8, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("Description", colX.description + 4, y);
  doc.text("Qté", colX.qty, y);
  doc.text("Prix unit. HT", colX.unitPrice, y);
  doc.text("Total HT", colX.total, y);
  y += 8;

  // Lignes
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);

  for (const item of data.items) {
    // Prix HT de l'item
    const itemUnitHT = data.emitter.isVatSubject
      ? Math.round(item.unitPrice / 1.20)
      : item.unitPrice;
    const itemTotalHT = data.emitter.isVatSubject
      ? Math.round(item.total / 1.20)
      : item.total;

    // Description (avec retour à la ligne si trop long)
    const descLines = doc.splitTextToSize(item.description, contentWidth * 0.5);
    doc.text(descLines, colX.description + 4, y);
    doc.text(String(item.quantity), colX.qty, y);
    doc.text(formatPrice(itemUnitHT), colX.unitPrice, y);
    doc.setFont("helvetica", "bold");
    doc.text(formatPrice(itemTotalHT), colX.total, y);
    doc.setFont("helvetica", "normal");

    y += Math.max(descLines.length * 5, 7);

    if (y > 260) {
      doc.addPage();
      y = 20;
    }
  }

  // Ligne séparatrice
  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // === TOTAUX ===
  const totalX = margin + contentWidth * 0.6;
  const totalValueX = pageWidth - margin;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);

  if (data.emitter.isVatSubject && data.amountHT !== undefined && data.tva !== undefined) {
    // Total HT
    doc.text("Total HT", totalX, y);
    doc.text(formatPrice(data.amountHT), totalValueX, y, { align: "right" });
    y += 6;

    // TVA
    doc.text("TVA (20%)", totalX, y);
    doc.text(formatPrice(data.tva), totalValueX, y, { align: "right" });
    y += 6;

    // Total TTC
    doc.setDrawColor(200, 200, 200);
    doc.line(totalX, y - 2, pageWidth - margin, y - 2);
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 107, 107);
    doc.text("Total TTC", totalX, y);
    doc.text(formatPrice(data.amount), totalValueX, y, { align: "right" });
  } else {
    // Pas de TVA (micro-entrepreneur)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 107, 107);
    doc.text("Total", totalX, y);
    doc.text(formatPrice(data.amount), totalValueX, y, { align: "right" });
  }

  y += 15;

  // === MENTIONS LÉGALES ===
  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  doc.setDrawColor(230, 230, 230);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(130, 130, 130);

  const mentions: string[] = [];

  if (!data.emitter.isVatSubject) {
    mentions.push("TVA non applicable, article 293 B du Code général des impôts.");
  }

  mentions.push(`Facture émise le ${formatDate(data.createdAt)} via la plateforme Animigo.`);
  mentions.push("Paiement effectué par l'intermédiaire de la plateforme Animigo.");

  if (data.emitter.siret) {
    mentions.push(`SIRET : ${data.emitter.siret}`);
  }

  for (const mention of mentions) {
    doc.text(mention, margin, y);
    y += 4;
  }

  // Pied de page
  y += 6;
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text("Animigo - Marketplace de services animaliers", pageWidth / 2, y, { align: "center" });
  y += 3;
  doc.text("www.animigo.fr", pageWidth / 2, y, { align: "center" });

  // Retourner le Blob PDF
  return doc.output("blob");
}
