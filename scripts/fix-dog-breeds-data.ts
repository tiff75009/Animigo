/**
 * Script de correction des données de races de chiens
 * Corrige le champ hypoallergenic et nettoie les données
 */

import { readFileSync, writeFileSync } from "fs";

// Liste officielle des races hypoallergéniques (source: woopets.fr)
const HYPOALLERGENIC_BREEDS = new Set([
  "affenpinscher",
  "airedale-terrier",
  "barbet",
  "bedlington-terrier",
  "berger-de-bergame",
  "berger-polonais-de-plaine",
  "bichon-a-poil-frise",
  "bichon-bolonais",
  "bichon-havanais",
  "bichon-maltais",
  "biewer-yorkshire",
  "border-terrier",
  "bouvier-des-flandres",
  "cairn-terrier",
  "caniche",
  "cavapoo",
  "chien-chinois-a-crete",
  "chien-d-eau-irlandais",
  "chien-d-eau-portugais",
  "chien-nu-du-perou",
  "chien-nu-mexicain",
  "coton-de-tulear",
  "dandie-dinmont-terrier",
  "fox-terrier",
  "goldendoodle",
  "griffon-bruxellois",
  "griffon-korthals",
  "irish-terrier",
  "labradoodle",
  "lakeland-terrier",
  "lhassa-apso",
  "maltipoo",
  "norfolk-terrier",
  "norwich-terrier",
  "samoyede",
  "schnauzer",
  "sealyham-terrier",
  "shih-tzu",
  "terrier-tcheque",
  "terrier-tibetain",
  "west-highland-white-terrier",
  "yorkshire-terrier",
]);

// Fonction pour normaliser un slug
function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprimer accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Charger et corriger les données
function main() {
  console.log("Chargement des données...");

  const rawData = readFileSync("data/dog-breeds.json", "utf-8");
  const data = JSON.parse(rawData);

  console.log(`${data.breeds.length} races à traiter`);

  let hypoCount = 0;
  let fixedCount = 0;

  // Corriger chaque race
  for (const breed of data.breeds) {
    const normalizedSlug = normalizeSlug(breed.slug);
    const isHypo = HYPOALLERGENIC_BREEDS.has(normalizedSlug);

    if (breed.hypoallergenic !== isHypo) {
      fixedCount++;
    }

    breed.hypoallergenic = isHypo;

    if (isHypo) {
      hypoCount++;
    }

    // Nettoyer les noms qui contiennent "Hypoallergénique" par erreur
    if (breed.name.includes("Hypoallergénique")) {
      breed.name = breed.name.replace(/Hypoallergénique\s*/gi, "").trim();
    }

    // Nettoyer les autres noms
    breed.otherNames = breed.otherNames
      .filter((n: string) => !n.toLowerCase().includes("hypoallergénique"))
      .filter((n: string) => n.length > 1 && n.length < 50);
  }

  // Sauvegarder les données corrigées
  data.fixedAt = new Date().toISOString();
  writeFileSync("data/dog-breeds.json", JSON.stringify(data, null, 2), "utf-8");
  console.log(`Fichier dog-breeds.json corrigé (${fixedCount} modifications)`);

  // Régénérer le fichier autocomplete
  const autocompleteData = data.breeds.map((b: any) => ({
    slug: b.slug,
    name: b.name,
    otherNames: b.otherNames,
    size: b.size,
    weight: b.weight.male?.max || b.weight.female?.max || null,
    hypoallergenic: b.hypoallergenic,
  }));

  writeFileSync(
    "data/dog-breeds-autocomplete.json",
    JSON.stringify(autocompleteData, null, 2),
    "utf-8"
  );
  console.log("Fichier autocomplete régénéré");

  // Stats
  console.log("\n=== Statistiques corrigées ===");
  console.log(`Total races: ${data.breeds.length}`);
  console.log(`Hypoallergéniques: ${hypoCount}`);
  console.log(
    `Petits chiens: ${data.breeds.filter((b: any) => b.size === "small").length}`
  );
  console.log(
    `Chiens moyens: ${data.breeds.filter((b: any) => b.size === "medium").length}`
  );
  console.log(
    `Grands chiens: ${data.breeds.filter((b: any) => b.size === "large").length}`
  );
}

main();
