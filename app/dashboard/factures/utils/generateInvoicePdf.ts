// Génération de facture PDF professionnelle — conforme réglementation française
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
  unit?: string;
  unitPrice: number;
  total: number;
}

interface InvoiceMission {
  serviceName: string;
  variantName?: string;
  startDate: string;
  endDate: string;
  serviceCategory?: string;
  startTime?: string;
  endTime?: string;
  animal?: { name: string; type: string };
  animals?: Array<{ name: string; type: string }>;
  animalCount?: number;
  sessions?: Array<{ date: string; startTime: string; endTime: string }>;
  sessionType?: "individual" | "collective";
  numberOfSessions?: number;
  serviceLocation?: "announcer_home" | "client_home";
  includeOvernightStay?: boolean;
  overnightNights?: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  createdAt: number;
  amount: number;
  amountHT?: number;
  tva?: number;
  vatRate?: number;
  items: InvoiceItem[];
  emitter: InvoiceEmitter;
  emitterAddress?: InvoiceAddress;
  recipient: InvoiceRecipient;
  recipientAddress?: InvoiceAddress;
  mission?: InvoiceMission;
  serviceTypeSlug?: string | null;
  // Frais client (ajoutés uniquement côté client)
  platformFee?: number;      // Commission Animigo en centimes
  stripeFee?: number;        // Frais de paiement Stripe en centimes
  commissionRate?: number;   // Taux commission (%)
  stripeFeeRate?: number;    // Taux frais Stripe (%)
}

// ============================================
// HELPERS
// ============================================

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " \u20AC";
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

function formatTime(time: string): string {
  return time.replace(":", "h");
}

// ============================================
// GÉNÉRATION PDF
// ============================================

export async function generateInvoicePdf(data: InvoiceData): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  const margin = 20;
  const contentWidth = pageWidth - margin * 2; // 170
  let y = 0;

  // Couleurs
  const accent = { r: 255, g: 107, b: 107 }; // #FF6B6B
  const dark = { r: 45, g: 45, b: 45 };      // #2D2D2D
  const gray = { r: 100, g: 100, b: 100 };
  const lightGray = { r: 150, g: 150, b: 150 };

  // ── Bande accent en haut ──
  doc.setFillColor(accent.r, accent.g, accent.b);
  doc.rect(0, 0, pageWidth, 4, "F");
  y = 18;

  // ── FACTURE titre (droite) ──
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(dark.r, dark.g, dark.b);
  doc.text("FACTURE", pageWidth - margin, y, { align: "right" });
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(gray.r, gray.g, gray.b);
  doc.text(`N\u00B0 ${data.invoiceNumber}`, pageWidth - margin, y, { align: "right" });
  y += 5;
  doc.setFontSize(9);
  doc.text(`Date : ${formatDate(data.createdAt)}`, pageWidth - margin, y, { align: "right" });
  y += 10;

  // ── Séparateur fin ──
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // ── ÉMETTEUR (gauche) / DESTINATAIRE (droite) ──
  const halfWidth = contentWidth / 2 - 8;
  const rightCol = margin + halfWidth + 16;

  // Labels
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(lightGray.r, lightGray.g, lightGray.b);
  doc.text("ÉMETTEUR", margin, y);
  doc.text("DESTINATAIRE", rightCol, y);
  y += 6;

  // Noms
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(dark.r, dark.g, dark.b);
  const emitterName = data.emitter.companyName || `${data.emitter.firstName} ${data.emitter.lastName}`;
  doc.text(emitterName, margin, y);
  doc.text(`${data.recipient.firstName} ${data.recipient.lastName}`, rightCol, y);
  y += 5;

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(gray.r, gray.g, gray.b);

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
  if (data.emitter.phone) {
    doc.text(data.emitter.phone, margin, emitterY);
    emitterY += 4;
  }

  // Détails destinataire
  let recipientY = y;
  doc.text(data.recipient.email, rightCol, recipientY);
  recipientY += 4;
  if (data.recipient.phone) {
    doc.text(data.recipient.phone, rightCol, recipientY);
    recipientY += 4;
  }
  if (data.recipientAddress?.location) {
    doc.text(data.recipientAddress.location, rightCol, recipientY);
    recipientY += 4;
  }
  if (data.recipientAddress?.postalCode || data.recipientAddress?.city) {
    doc.text(`${data.recipientAddress.postalCode || ""} ${data.recipientAddress.city || ""}`.trim(), rightCol, recipientY);
    recipientY += 4;
  }

  y = Math.max(emitterY, recipientY) + 10;

  // ── ZONE OBJET (fond gris arrondi) ──
  if (data.mission) {
    const objetLines: string[] = [];

    // Titre
    const serviceTitle = `${data.mission.serviceName}${data.mission.variantName ? ` - ${data.mission.variantName}` : ""}`;
    objetLines.push(`Objet : ${serviceTitle}`);

    // Période
    if (data.mission.startDate === data.mission.endDate) {
      objetLines.push(`Date : ${formatServiceDate(data.mission.startDate)}`);
    } else {
      objetLines.push(`Période : du ${formatServiceDate(data.mission.startDate)} au ${formatServiceDate(data.mission.endDate)}`);
    }

    // Horaires
    if (data.mission.startTime && data.mission.endTime) {
      objetLines.push(`Horaires : ${formatTime(data.mission.startTime)} \u2013 ${formatTime(data.mission.endTime)}`);
    }

    // Animaux
    const animalCount = data.mission.animalCount || (data.mission.animals?.length) || 1;
    if (data.mission.animals && data.mission.animals.length > 1) {
      const animalNames = data.mission.animals.map((a) => a.name).join(", ");
      objetLines.push(`Animaux : ${animalNames} (${animalCount} animaux)`);
    } else if (data.mission.animal) {
      objetLines.push(`Animal : ${data.mission.animal.name} (${data.mission.animal.type})`);
    }

    // Lieu
    if (data.mission.serviceLocation) {
      const lieuLabel = data.mission.serviceLocation === "client_home"
        ? "Au domicile du client"
        : "Au domicile du prestataire";
      objetLines.push(`Lieu : ${lieuLabel}`);
    }

    // Garde de nuit
    if (data.mission.includeOvernightStay && data.mission.overnightNights) {
      objetLines.push(`Garde de nuit : ${data.mission.overnightNights} nuit${data.mission.overnightNights > 1 ? "s" : ""}`);
    }

    // Calcul hauteur zone
    const lineHeight = 4.5;
    let objetHeight = objetLines.length * lineHeight + 8;

    // Multi-séances
    const hasSessions = data.mission.sessions && data.mission.sessions.length > 1;
    if (hasSessions) {
      objetHeight += 5 + data.mission.sessions!.length * lineHeight;
    }

    // Dessiner le fond
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(margin, y, contentWidth, objetHeight, 3, 3, "F");
    doc.setDrawColor(235, 235, 235);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, objetHeight, 3, 3, "S");

    y += 5;
    doc.setFontSize(8.5);

    for (const line of objetLines) {
      if (line.startsWith("Objet :")) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(dark.r, dark.g, dark.b);
        doc.text("Objet :", margin + 5, y);
        doc.setFont("helvetica", "normal");
        doc.text(line.replace("Objet : ", ""), margin + 5 + doc.getTextWidth("Objet :  "), y);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(gray.r, gray.g, gray.b);
        doc.text(line, margin + 5, y);
      }
      y += lineHeight;
    }

    // Multi-séances détaillées
    if (hasSessions) {
      y += 2;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(dark.r, dark.g, dark.b);
      doc.text(`Nombre de séances : ${data.mission.sessions!.length}`, margin + 5, y);
      y += lineHeight;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(gray.r, gray.g, gray.b);
      for (const session of data.mission.sessions!) {
        doc.text(
          `  \u2022 ${formatServiceDate(session.date)} : ${formatTime(session.startTime)} \u2013 ${formatTime(session.endTime)}`,
          margin + 5,
          y
        );
        y += lineHeight;
      }
    }

    y += 8;
  }

  // ── TABLEAU DES PRESTATIONS ──
  // Colonnes : Description | Unité | Qté | P.U. HT | Total HT
  const colDesc = margin + 4;
  const colUnit = margin + contentWidth * 0.48;
  const colQty = margin + contentWidth * 0.58;
  const colUnitP = margin + contentWidth * 0.70;
  const colTotal = margin + contentWidth * 0.87;

  // Header du tableau
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y - 4, contentWidth, 8, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(gray.r, gray.g, gray.b);
  doc.text("Description", colDesc, y);
  doc.text("Unité", colUnit, y);
  doc.text("Qté", colQty, y);
  doc.text("P.U. HT", colUnitP, y);
  doc.text("Total HT", colTotal, y);
  y += 8;

  // Lignes du tableau
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const effectiveVatRate = data.vatRate ?? 20;

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];

    // Alternance de fond
    if (i % 2 === 1) {
      doc.setFillColor(252, 252, 252);
      doc.rect(margin, y - 4, contentWidth, 7, "F");
    }

    // Calcul prix HT
    const itemUnitHT = data.emitter.isVatSubject
      ? Math.round(item.unitPrice / (1 + effectiveVatRate / 100))
      : item.unitPrice;
    const itemTotalHT = data.emitter.isVatSubject
      ? Math.round(item.total / (1 + effectiveVatRate / 100))
      : item.total;

    // Description (avec retour à la ligne si trop long)
    const maxDescWidth = (colUnit - colDesc) - 4;
    const descLines = doc.splitTextToSize(item.description, maxDescWidth);
    doc.setTextColor(dark.r, dark.g, dark.b);
    doc.text(descLines, colDesc, y);

    // Unité
    doc.setTextColor(gray.r, gray.g, gray.b);
    doc.text(item.unit || "-", colUnit, y);

    // Quantité
    doc.text(String(item.quantity), colQty, y);

    // Prix unitaire HT
    doc.text(formatPrice(itemUnitHT), colUnitP, y);

    // Total HT
    doc.setFont("helvetica", "bold");
    doc.setTextColor(dark.r, dark.g, dark.b);
    doc.text(formatPrice(itemTotalHT), colTotal, y);
    doc.setFont("helvetica", "normal");

    y += Math.max(descLines.length * 4.5, 7);

    if (y > 250) {
      doc.addPage();
      // Bande accent en haut de la nouvelle page
      doc.setFillColor(accent.r, accent.g, accent.b);
      doc.rect(0, 0, pageWidth, 2, "F");
      y = 15;
    }
  }

  // Séparateur sous tableau
  y += 3;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // ── TOTAUX (alignés à droite) ──
  const totalLabelX = margin + contentWidth * 0.58;
  const totalValueX = pageWidth - margin;
  const hasClientFees = (data.platformFee && data.platformFee > 0) || (data.stripeFee && data.stripeFee > 0);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(gray.r, gray.g, gray.b);

  if (data.emitter.isVatSubject && data.amountHT !== undefined && data.tva !== undefined) {
    // Total HT
    doc.text("Total HT :", totalLabelX, y);
    doc.text(formatPrice(data.amountHT), totalValueX, y, { align: "right" });
    y += 6;

    // TVA
    doc.text(`TVA (${effectiveVatRate}%) :`, totalLabelX, y);
    doc.text(formatPrice(data.tva), totalValueX, y, { align: "right" });
    y += 4;

    // Séparateur
    doc.setDrawColor(200, 200, 200);
    doc.line(totalLabelX, y, pageWidth - margin, y);
    y += 6;

    if (hasClientFees) {
      // Sous-total prestation TTC
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(dark.r, dark.g, dark.b);
      doc.text("Sous-total prestation TTC :", totalLabelX, y);
      doc.text(formatPrice(data.amount), totalValueX, y, { align: "right" });
      y += 8;
    } else {
      // Total TTC (sans frais client)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(accent.r, accent.g, accent.b);
      doc.text("Total TTC :", totalLabelX, y);
      doc.text(formatPrice(data.amount), totalValueX, y, { align: "right" });
    }
  } else {
    if (hasClientFees) {
      // Sous-total prestation (micro-entrepreneur)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(dark.r, dark.g, dark.b);
      doc.text("Sous-total prestation :", totalLabelX, y);
      doc.text(formatPrice(data.amount), totalValueX, y, { align: "right" });
      y += 8;
    } else {
      // Total (sans frais client)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(accent.r, accent.g, accent.b);
      doc.text("Total :", totalLabelX, y);
      doc.text(formatPrice(data.amount), totalValueX, y, { align: "right" });
    }
  }

  // ── FRAIS DE SERVICE (côté client uniquement) ──
  if (hasClientFees) {
    // Ligne commission Animigo
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(gray.r, gray.g, gray.b);

    if (data.platformFee && data.platformFee > 0) {
      const commLabel = data.commissionRate
        ? `Commission Animigo (${data.commissionRate}%) :`
        : "Commission Animigo :";
      doc.text(commLabel, totalLabelX, y);
      doc.text(formatPrice(data.platformFee), totalValueX, y, { align: "right" });
      y += 6;
    }

    // Ligne frais de paiement
    if (data.stripeFee && data.stripeFee > 0) {
      const stripeLabel = data.stripeFeeRate
        ? `Frais de paiement (${data.stripeFeeRate}%) :`
        : "Frais de paiement :";
      doc.text(stripeLabel, totalLabelX, y);
      doc.text(formatPrice(data.stripeFee), totalValueX, y, { align: "right" });
      y += 4;
    }

    // Séparateur avant total réglé
    doc.setDrawColor(200, 200, 200);
    doc.line(totalLabelX, y, pageWidth - margin, y);
    y += 6;

    // Total réglé (montant réellement payé par le client)
    const totalRegle = data.amount + (data.platformFee || 0) + (data.stripeFee || 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(accent.r, accent.g, accent.b);
    doc.text("Total réglé :", totalLabelX, y);
    doc.text(formatPrice(totalRegle), totalValueX, y, { align: "right" });
  }

  y += 15;

  // ── MENTIONS LÉGALES ──
  if (y > 245) {
    doc.addPage();
    doc.setFillColor(accent.r, accent.g, accent.b);
    doc.rect(0, 0, pageWidth, 2, "F");
    y = 15;
  }

  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(lightGray.r, lightGray.g, lightGray.b);

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

  // ── FOOTER ──
  const footerY = pageHeight - 15;

  // Séparateur footer
  doc.setDrawColor(230, 230, 230);
  doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6);

  // "Animigo" en couleur accent + texte
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(accent.r, accent.g, accent.b);
  const animigoText = "Animigo";
  const animigoWidth = doc.getTextWidth(animigoText);
  const suffixText = "  \u2014  Facture générée par Animigo";
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(lightGray.r, lightGray.g, lightGray.b);
  const suffixWidth = doc.getTextWidth(suffixText);
  const totalFooterWidth = animigoWidth + suffixWidth;
  const footerStartX = (pageWidth - totalFooterWidth) / 2;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(accent.r, accent.g, accent.b);
  doc.text(animigoText, footerStartX, footerY);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(lightGray.r, lightGray.g, lightGray.b);
  doc.text(suffixText, footerStartX + animigoWidth, footerY);

  // URL
  doc.setFontSize(7);
  doc.text("www.animigo.fr", pageWidth / 2, footerY + 4, { align: "center" });

  // Pagination
  doc.setFontSize(7);
  doc.text(`Page 1/1`, pageWidth - margin, footerY + 4, { align: "right" });

  return doc.output("blob");
}
