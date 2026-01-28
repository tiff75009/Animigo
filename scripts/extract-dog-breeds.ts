/**
 * Script d'extraction des races de chiens depuis Woopets.fr
 *
 * Usage: bun run scripts/extract-dog-breeds.ts
 *
 * Génère un fichier JSON avec toutes les races de chiens et leurs caractéristiques
 */

import * as cheerio from "cheerio";
import { writeFileSync } from "fs";

const BASE_URL = "https://www.woopets.fr";
const RACES_LIST_URL = `${BASE_URL}/chien/races/`;

// Types pour les données extraites
interface DogBreed {
  slug: string;
  name: string;
  otherNames: string[];
  origin: string | null;
  size: "small" | "medium" | "large" | null; // Gabarit
  weight: {
    male: { min: number; max: number } | null;
    female: { min: number; max: number } | null;
  };
  height: {
    male: { min: number; max: number } | null;
    female: { min: number; max: number } | null;
  };
  lifeExpectancy: { min: number; max: number } | null;
  fciGroup: number | null;
  fciGroupName: string | null;
  hypoallergenic: boolean;
  coatType: string | null;
  colors: string[];
  temperament: string[];
  imageUrl: string | null;
}

// Délai entre les requêtes pour éviter de surcharger le serveur
const DELAY_MS = 500;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Parser le gabarit
function parseSize(text: string): "small" | "medium" | "large" | null {
  const lower = text.toLowerCase();
  if (lower.includes("petit")) return "small";
  if (lower.includes("moyen")) return "medium";
  if (lower.includes("grand") || lower.includes("géant")) return "large";
  return null;
}

// Parser une plage de valeurs (ex: "22-32 kg" ou "55-60 cm")
function parseRange(text: string): { min: number; max: number } | null {
  const match = text.match(/(\d+)[^\d]+(\d+)/);
  if (match) {
    return { min: parseInt(match[1]), max: parseInt(match[2]) };
  }
  // Valeur unique
  const single = text.match(/(\d+)/);
  if (single) {
    const val = parseInt(single[1]);
    return { min: val, max: val };
  }
  return null;
}

// Récupérer la liste de toutes les races
async function fetchBreedsList(): Promise<{ slug: string; name: string; imageUrl: string | null }[]> {
  console.log("Récupération de la liste des races...");

  const response = await fetch(RACES_LIST_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch races list: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const breeds: { slug: string; name: string; imageUrl: string | null }[] = [];

  // Les races sont dans des liens avec le pattern /chien/race/{slug}/
  $('a[href^="/chien/race/"]').each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    const match = href.match(/\/chien\/race\/([^/]+)\/?$/);
    if (!match) return;

    const slug = match[1];

    // Éviter les doublons
    if (breeds.some(b => b.slug === slug)) return;

    // Récupérer le nom (texte du lien ou alt de l'image)
    let name = $(el).text().trim();
    if (!name) {
      name = $(el).find("img").attr("alt") || slug;
    }

    // Récupérer l'image
    const img = $(el).find("img").attr("src") || $(el).find("img").attr("data-src");
    const imageUrl = img ? (img.startsWith("http") ? img : `${BASE_URL}${img}`) : null;

    breeds.push({ slug, name, imageUrl });
  });

  console.log(`Trouvé ${breeds.length} races`);
  return breeds;
}

// Récupérer les détails d'une race
async function fetchBreedDetails(slug: string, name: string, imageUrl: string | null): Promise<DogBreed | null> {
  const url = `${BASE_URL}/chien/race/${slug}/`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${slug}: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const breed: DogBreed = {
      slug,
      name,
      otherNames: [],
      origin: null,
      size: null,
      weight: { male: null, female: null },
      height: { male: null, female: null },
      lifeExpectancy: null,
      fciGroup: null,
      fciGroupName: null,
      hypoallergenic: false,
      coatType: null,
      colors: [],
      temperament: [],
      imageUrl,
    };

    // Parser le contenu de la page
    const pageText = $("body").text();

    // Autres noms
    const otherNamesMatch = pageText.match(/Autres noms?\s*:?\s*([^\n]+)/i);
    if (otherNamesMatch) {
      breed.otherNames = otherNamesMatch[1]
        .split(/[,;]/)
        .map(n => n.trim())
        .filter(n => n && n.length > 0 && n.length < 50);
    }

    // Origine
    const originMatch = pageText.match(/Origine\s*:?\s*([A-Za-zÀ-ÿ\s-]+?)(?:\n|Groupe|Taille|Poids)/i);
    if (originMatch) {
      breed.origin = originMatch[1].trim();
    }

    // Gabarit
    const sizeMatch = pageText.match(/Gabarit\s*:?\s*([^\n]+)/i);
    if (sizeMatch) {
      breed.size = parseSize(sizeMatch[1]);
    }

    // Essayer de trouver le gabarit dans les méta-données ou badges
    if (!breed.size) {
      if (pageText.toLowerCase().includes("petit chien") || pageText.toLowerCase().includes("petite taille")) {
        breed.size = "small";
      } else if (pageText.toLowerCase().includes("grand chien") || pageText.toLowerCase().includes("grande taille")) {
        breed.size = "large";
      } else if (pageText.toLowerCase().includes("taille moyenne")) {
        breed.size = "medium";
      }
    }

    // Poids et taille - chercher dans les tableaux
    $("table").each((_, table) => {
      const tableText = $(table).text();
      if (tableText.includes("Poids") || tableText.includes("Taille")) {
        $(table).find("tr").each((_, row) => {
          const cells = $(row).find("td, th");
          if (cells.length >= 2) {
            const label = $(cells[0]).text().toLowerCase();
            const value = $(cells[1]).text();

            if (label.includes("femelle")) {
              if (tableText.includes("kg")) {
                breed.weight.female = parseRange(value);
              } else if (tableText.includes("cm")) {
                breed.height.female = parseRange(value);
              }
            } else if (label.includes("mâle") || label.includes("male")) {
              if (tableText.includes("kg")) {
                breed.weight.male = parseRange(value);
              } else if (tableText.includes("cm")) {
                breed.height.male = parseRange(value);
              }
            }
          }
        });
      }
    });

    // Fallback: chercher poids/taille dans le texte
    const weightMatch = pageText.match(/(\d+)\s*(?:à|-)?\s*(\d+)?\s*kg/gi);
    if (weightMatch && !breed.weight.male && !breed.weight.female) {
      const range = parseRange(weightMatch[0]);
      if (range) {
        breed.weight.male = range;
        breed.weight.female = range;
      }
    }

    const heightMatch = pageText.match(/(\d+)\s*(?:à|-)?\s*(\d+)?\s*cm/gi);
    if (heightMatch && !breed.height.male && !breed.height.female) {
      const range = parseRange(heightMatch[0]);
      if (range) {
        breed.height.male = range;
        breed.height.female = range;
      }
    }

    // Espérance de vie
    const lifeMatch = pageText.match(/[Ee]spérance de vie\s*:?\s*(\d+)\s*(?:à|-)\s*(\d+)\s*ans/);
    if (lifeMatch) {
      breed.lifeExpectancy = { min: parseInt(lifeMatch[1]), max: parseInt(lifeMatch[2]) };
    }

    // Groupe FCI
    const fciMatch = pageText.match(/Groupe\s*(\d+)/i);
    if (fciMatch) {
      breed.fciGroup = parseInt(fciMatch[1]);
    }

    const fciGroupNameMatch = pageText.match(/Groupe\s*\d+\s*[:\-]?\s*([^\n(]+)/i);
    if (fciGroupNameMatch) {
      breed.fciGroupName = fciGroupNameMatch[1].trim().substring(0, 100);
    }

    // Hypoallergénique - chercher spécifiquement dans les badges ou caractéristiques
    // Ne pas chercher dans le texte général car le mot apparaît dans les menus
    const hypoMatch = $(".badge, .tag, .label, .characteristic, .feature")
      .filter((_, el) => $(el).text().toLowerCase().includes("hypoallergénique"))
      .length > 0;
    // Alternative: chercher "Race hypoallergénique : Oui" ou similaire
    const hypoTextMatch = pageText.match(/[Rr]ace hypoallergénique\s*:?\s*(oui|yes)/i);
    breed.hypoallergenic = hypoMatch || !!hypoTextMatch;

    // Type de poil
    const coatMatch = pageText.match(/[Tt]ype de poil\s*:?\s*([^\n]+)/);
    if (coatMatch) {
      breed.coatType = coatMatch[1].trim().substring(0, 100);
    }

    // Couleurs
    const colorsMatch = pageText.match(/[Cc]ouleur(?:s)?\s*:?\s*([^\n]+)/);
    if (colorsMatch) {
      breed.colors = colorsMatch[1]
        .split(/[,;]/)
        .map(c => c.trim())
        .filter(c => c && c.length > 0 && c.length < 50);
    }

    // Tempérament - mots clés courants
    const temperamentKeywords = [
      "affectueux", "calme", "protecteur", "joueur", "intelligent",
      "obéissant", "sportif", "indépendant", "sociable", "fidèle",
      "énergique", "doux", "vigilant", "courageux", "docile"
    ];
    const lowerText = pageText.toLowerCase();
    breed.temperament = temperamentKeywords.filter(t => lowerText.includes(t));

    // Déduire le gabarit du poids si non trouvé
    if (!breed.size && (breed.weight.male || breed.weight.female)) {
      const avgWeight = breed.weight.male?.max || breed.weight.female?.max || 0;
      if (avgWeight > 0) {
        if (avgWeight <= 10) breed.size = "small";
        else if (avgWeight <= 25) breed.size = "medium";
        else breed.size = "large";
      }
    }

    return breed;

  } catch (error) {
    console.error(`Error fetching ${slug}:`, error);
    return null;
  }
}

// Fonction principale
async function main() {
  console.log("=== Extraction des races de chiens Woopets.fr ===\n");

  // 1. Récupérer la liste des races
  const breedsList = await fetchBreedsList();

  // 2. Récupérer les détails de chaque race
  const breeds: DogBreed[] = [];
  let processed = 0;

  for (const { slug, name, imageUrl } of breedsList) {
    processed++;
    console.log(`[${processed}/${breedsList.length}] ${name}...`);

    const details = await fetchBreedDetails(slug, name, imageUrl);
    if (details) {
      breeds.push(details);
    }

    // Délai entre les requêtes
    await sleep(DELAY_MS);
  }

  console.log(`\nExtraction terminée: ${breeds.length} races récupérées`);

  // 3. Générer le fichier JSON
  const outputPath = "data/dog-breeds.json";
  const output = {
    version: "1.0",
    source: "woopets.fr",
    extractedAt: new Date().toISOString(),
    count: breeds.length,
    breeds: breeds.sort((a, b) => a.name.localeCompare(b.name, "fr")),
  };

  // Créer le dossier data si nécessaire
  const { mkdirSync } = await import("fs");
  try {
    mkdirSync("data", { recursive: true });
  } catch {}

  writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\nFichier généré: ${outputPath}`);

  // 4. Générer un fichier simplifié pour l'autocomplete
  const autocompleteData = breeds.map(b => ({
    slug: b.slug,
    name: b.name,
    otherNames: b.otherNames,
    size: b.size,
    weight: b.weight.male?.max || b.weight.female?.max || null,
    hypoallergenic: b.hypoallergenic,
  }));

  const autocompletePath = "data/dog-breeds-autocomplete.json";
  writeFileSync(autocompletePath, JSON.stringify(autocompleteData, null, 2), "utf-8");
  console.log(`Fichier autocomplete généré: ${autocompletePath}`);

  // Stats
  console.log("\n=== Statistiques ===");
  console.log(`Petits chiens: ${breeds.filter(b => b.size === "small").length}`);
  console.log(`Chiens moyens: ${breeds.filter(b => b.size === "medium").length}`);
  console.log(`Grands chiens: ${breeds.filter(b => b.size === "large").length}`);
  console.log(`Hypoallergéniques: ${breeds.filter(b => b.hypoallergenic).length}`);
}

main().catch(console.error);
