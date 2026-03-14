/**
 * Génération PDF côté client avec @pdfme/generator
 * Utilisé quand un template admin pdfme est configuré
 */

export async function generatePdfFromTemplate(
  templateJson: string,
  inputs: Record<string, string>
): Promise<Blob> {
  const { generate } = await import("@pdfme/generator");
  const { text, image, table, line, rectangle } = await import("@pdfme/schemas");

  const templateData = JSON.parse(templateJson);

  // Filtrer les plugins définis (ellipse n'existe pas dans @pdfme/schemas)
  const allPlugins: Record<string, any> = { text, image, table, line, rectangle };
  const plugins: Record<string, any> = {};
  for (const [key, val] of Object.entries(allPlugins)) {
    if (val) plugins[key] = val;
  }

  const pdf = await generate({
    template: templateData,
    inputs: [inputs],
    plugins,
  });

  return new Blob([pdf], { type: "application/pdf" });
}
