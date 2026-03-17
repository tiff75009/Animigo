/**
 * Génération PDF côté client avec @pdfme/generator
 * Utilisé quand un template admin pdfme est configuré
 */

async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function generatePdfFromTemplate(
  templateJson: string,
  inputs: Record<string, string>
): Promise<Blob> {
  const { generate } = await import("@pdfme/generator");
  const { text, image, table, line, rectangle } = await import("@pdfme/schemas");

  const templateData = JSON.parse(templateJson);

  // Convertir les URLs d'images en base64 pour pdfme
  const imageFields = new Set<string>();
  for (const page of templateData.schemas) {
    for (const schema of page) {
      if (schema.type === "image") imageFields.add(schema.name);
    }
  }
  for (const key of imageFields) {
    const val = inputs[key];
    if (val && val.startsWith("http")) {
      try {
        inputs[key] = await urlToBase64(val);
      } catch {
        // Si le fetch échoue, laisser vide
        delete inputs[key];
      }
    }
  }

  // Préserver les contenus statiques (textes libres, images statiques) du template
  for (const page of templateData.schemas) {
    for (const schema of page) {
      if (!(schema.name in inputs) && schema.content) {
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

  // Filtrer les plugins définis
  const allPlugins: Record<string, any> = { text, image, table, line, rectangle };
  const plugins: Record<string, any> = {};
  for (const [key, val] of Object.entries(allPlugins)) {
    if (val) plugins[key] = val;
  }

  // Si le footer est activé, retirer les éléments de la zone footer du template principal
  // (ils seront rendus via un PDF séparé en post-traitement)
  const hfConfig = templateData._headerFooterConfig;
  const genTemplate = JSON.parse(JSON.stringify(templateData));
  const paddingTop = templateData.basePdf?.padding?.[0] ?? 20;
  let footerThresholdY = Infinity;
  if (hfConfig?.footer?.enabled) {
    footerThresholdY = 297 - hfConfig.footer.height - paddingTop;
    for (let p = 0; p < genTemplate.schemas.length; p++) {
      genTemplate.schemas[p] = genTemplate.schemas[p].filter(
        (s: any) => s.type === "table" || (s.position?.y || 0) < footerThresholdY
      );
    }
  }

  // Charger les polices personnalisées
  const fontUrls: Record<string, { url: string; fallback?: boolean }> = {
    "Montserrat":           { url: "/fonts/Montserrat-Regular.ttf", fallback: true },
    "Montserrat Bold":      { url: "/fonts/Montserrat-Bold.ttf" },
    "Montserrat SemiBold":  { url: "/fonts/Montserrat-SemiBold.ttf" },
    "Montserrat Italic":    { url: "/fonts/Montserrat-Italic.ttf" },
    "Montserrat Bold Italic": { url: "/fonts/Montserrat-BoldItalic.ttf" },
    "Montserrat Light":     { url: "/fonts/Montserrat-Light.ttf" },
    "Open Sans":            { url: "/fonts/OpenSans-Regular.ttf" },
    "Roboto":               { url: "/fonts/Roboto-Regular.ttf" },
    "Lato":                 { url: "/fonts/Lato-Regular.ttf" },
    "Lato Bold":            { url: "/fonts/Lato-Bold.ttf" },
    "Lato Italic":          { url: "/fonts/Lato-Italic.ttf" },
    "Love Taking":          { url: "/fonts/LoveTaking.ttf" },
  };
  const font: Record<string, { data: ArrayBuffer; fallback?: boolean }> = {};
  await Promise.all(
    Object.entries(fontUrls).map(async ([key, def]) => {
      try {
        const res = await fetch(def.url);
        if (res.ok) font[key] = { data: await res.arrayBuffer(), ...(def.fallback ? { fallback: true } : {}) };
      } catch { /* skip */ }
    })
  );

  const genOpts: any = { template: genTemplate, inputs: [inputs], plugins };
  if (Object.keys(font).length > 0) genOpts.options = { font };
  let pdfBytes = await generate(genOpts);

  // Post-traitement : en-tête / pied de page (AVANT numérotation)
  if (hfConfig?.header?.enabled || hfConfig?.footer?.enabled) {
    pdfBytes = await applyHeaderFooter(pdfBytes, hfConfig, templateData, inputs, plugins, generate, footerThresholdY, font);
  }

  // Post-traitement : numérotation de pages (APRÈS header/footer pour ne pas être masquée)
  const pageNumConfig = templateData._pageNumberConfig;
  if (pageNumConfig?.enabled) {
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    for (let i = 0; i < totalPages; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      const label = formatPageNum(pageNumConfig.format, i + 1, totalPages);
      const textWidth = font.widthOfTextAtSize(label, pageNumConfig.fontSize);
      const marginX = 20;

      let x: number;
      if (pageNumConfig.alignment === "left") x = marginX;
      else if (pageNumConfig.alignment === "right") x = width - textWidth - marginX;
      else x = (width - textWidth) / 2;

      const mmToPt = 2.835;
      const y = pageNumConfig.position === "footer"
        ? pageNumConfig.marginY * mmToPt
        : height - pageNumConfig.marginY * mmToPt - pageNumConfig.fontSize;

      page.drawText(label, { x, y, size: pageNumConfig.fontSize, font, color: rgb(0.58, 0.64, 0.69) });
    }

    pdfBytes = await pdfDoc.save();
  }

  return new Blob([pdfBytes], { type: "application/pdf" });
}

function shouldApplyToPage(repeat: string, pageIndex: number): boolean {
  const pageNum = pageIndex + 1;
  switch (repeat) {
    case "all_pages": return true;
    case "first_page_only": return pageIndex === 0;
    case "all_except_first": return pageIndex > 0;
    case "even_pages": return pageNum % 2 === 0;
    case "odd_pages": return pageNum % 2 === 1;
    default: return true;
  }
}

async function applyHeaderFooter(
  pdfBytesInput: Uint8Array,
  config: any,
  templateData: any,
  inputs: Record<string, any>,
  plugins: Record<string, any>,
  generate: any,
  footerThresholdY: number,
  font?: Record<string, { data: ArrayBuffer; fallback?: boolean }>,
): Promise<Uint8Array> {
  const { PDFDocument, rgb } = await import("pdf-lib");
  const pdfDoc = await PDFDocument.load(pdfBytesInput);
  const pages = pdfDoc.getPages();
  const mainPageCount = pages.length;
  if (mainPageCount === 0) return await pdfDoc.save();

  const firstPage = pages[0];
  const { width: pageW, height: pageH } = firstPage.getSize();
  const mmToPt = 2.835;

  // ── Header : embarquer depuis page 1 (les éléments du haut ne bougent pas) ──
  let headerEmbed: any = null;
  if (config.header?.enabled) {
    const hH = config.header.height * mmToPt;
    [headerEmbed] = await pdfDoc.embedPages([firstPage], [
      { left: 0, bottom: pageH - hH, right: pageW, top: pageH },
    ]);
  }

  // ── Footer : PDF séparé avec uniquement les éléments de la zone footer ──
  let footerEmbed: any = null;
  if (config.footer?.enabled) {
    const fH = config.footer.height * mmToPt;

    // Cloner le template ORIGINAL, garder uniquement les éléments dans la zone footer
    const footerTemplate = JSON.parse(JSON.stringify(templateData));
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
      const footerGenOpts: any = { template: footerTemplate, inputs: [inputs], plugins };
      if (font && Object.keys(font).length > 0) footerGenOpts.options = { font };
      const footerPdfBytes = await generate(footerGenOpts);
      const footerDoc = await PDFDocument.load(footerPdfBytes);
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
  if (headerEmbed && config.header?.enabled) {
    const hH = config.header.height * mmToPt;
    const repeat = config.header.repeat;
    for (let i = 0; i < mainPageCount; i++) {
      const apply = shouldApplyToPage(repeat, i);
      if (i > 0 && apply) {
        pages[i].drawRectangle({ x: 0, y: pageH - hH, width: pageW, height: hH, color: rgb(1, 1, 1) });
        pages[i].drawPage(headerEmbed, { x: 0, y: pageH - hH });
      }
      if (i === 0 && !apply) {
        pages[0].drawRectangle({ x: 0, y: pageH - hH, width: pageW, height: hH, color: rgb(1, 1, 1) });
      }
    }
    if (config.header.showLine) {
      const lineY = pageH - hH;
      for (let i = 0; i < mainPageCount; i++) {
        if (shouldApplyToPage(repeat, i)) {
          pages[i].drawLine({ start: { x: 20, y: lineY }, end: { x: pageW - 20, y: lineY }, thickness: 0.5, color: rgb(0.85, 0.87, 0.89) });
        }
      }
    }
  }

  // ── Appliquer footer (sur TOUTES les pages, y compris page 1) ──
  if (footerEmbed && config.footer?.enabled) {
    const fH = config.footer.height * mmToPt;
    const repeat = config.footer.repeat;
    for (let i = 0; i < mainPageCount; i++) {
      const apply = shouldApplyToPage(repeat, i);
      if (apply) {
        pages[i].drawRectangle({ x: 0, y: 0, width: pageW, height: fH, color: rgb(1, 1, 1) });
        pages[i].drawPage(footerEmbed, { x: 0, y: 0 });
      }
    }
    if (config.footer.showLine) {
      const lineY = fH;
      for (let i = 0; i < mainPageCount; i++) {
        if (shouldApplyToPage(repeat, i)) {
          pages[i].drawLine({ start: { x: 20, y: lineY }, end: { x: pageW - 20, y: lineY }, thickness: 0.5, color: rgb(0.85, 0.87, 0.89) });
        }
      }
    }
  }

  return await pdfDoc.save();
}

function formatPageNum(format: string, page: number, total: number): string {
  switch (format) {
    case "page_x_of_y": return `Page ${page} sur ${total}`;
    case "x_of_y": return `${page} sur ${total}`;
    case "x_slash_y": return `${page} / ${total}`;
    case "page_x": return `Page ${page}`;
    default: return `${page} / ${total}`;
  }
}
