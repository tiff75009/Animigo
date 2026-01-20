/**
 * Cloudinary Upload Helper
 * Gère l'upload d'images vers Cloudinary avec optimisation automatique
 */

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  uploadPreset?: string;
}

interface UploadOptions {
  folder?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "auto" | "webp" | "jpg" | "png";
}

interface UploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
}

const DEFAULT_OPTIONS: UploadOptions = {
  folder: "animigo/animals",
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 80,
  format: "auto",
};

/**
 * Compresse une image côté client avant l'upload
 */
async function compressImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    img.onload = () => {
      let { width, height } = img;

      // Calculer les nouvelles dimensions en gardant le ratio
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Dessiner l'image redimensionnée
      ctx.drawImage(img, 0, 0, width, height);

      // Convertir en blob avec compression
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Could not create blob"));
          }
        },
        "image/jpeg",
        quality / 100
      );
    };

    img.onerror = () => reject(new Error("Could not load image"));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Upload une image vers Cloudinary avec upload non signé
 */
export async function uploadToCloudinary(
  file: File,
  config: CloudinaryConfig,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Compresser l'image côté client
    const compressedBlob = await compressImage(
      file,
      opts.maxWidth!,
      opts.maxHeight!,
      opts.quality!
    );

    // Préparer les données pour l'upload
    const formData = new FormData();
    formData.append("file", compressedBlob, file.name);
    formData.append("upload_preset", config.uploadPreset || "animigo_unsigned");
    formData.append("folder", opts.folder || "animigo/animals");

    // Note: Les transformations ne sont pas autorisées pour les uploads non signés
    // L'optimisation est faite côté client avant l'upload (compressImage)
    // Pour les transformations à la volée, utiliser getOptimizedImageUrl()

    // Upload vers Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Upload failed");
    }

    const data = await response.json();

    return {
      success: true,
      url: data.secure_url,
      publicId: data.public_id,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Upload multiple images vers Cloudinary
 */
export async function uploadMultipleToCloudinary(
  files: File[],
  config: CloudinaryConfig,
  options: UploadOptions = {},
  onProgress?: (current: number, total: number) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const result = await uploadToCloudinary(files[i], config, options);
    results.push(result);
    onProgress?.(i + 1, files.length);
  }

  return results;
}

/**
 * Génère une URL Cloudinary optimisée pour l'affichage
 */
export function getOptimizedImageUrl(
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  } = {}
): string {
  if (!url || !url.includes("cloudinary.com")) {
    return url;
  }

  const { width = 400, height = 400, quality = 80, format = "auto" } = options;

  // Extraire les parties de l'URL Cloudinary
  // Format: https://res.cloudinary.com/{cloud}/image/upload/{transformations}/{public_id}
  const uploadIndex = url.indexOf("/upload/");
  if (uploadIndex === -1) return url;

  const baseUrl = url.substring(0, uploadIndex + 8);
  const pathAfterUpload = url.substring(uploadIndex + 8);

  // Supprimer les transformations existantes (si présentes)
  const publicIdMatch = pathAfterUpload.match(/v\d+\/(.+)$/) ||
                        pathAfterUpload.match(/^([^/]+\/[^/]+\.[a-z]+)$/i);

  const publicIdPart = publicIdMatch ? publicIdMatch[0] : pathAfterUpload;

  // Construire les nouvelles transformations
  const transformations = [
    `w_${width}`,
    `h_${height}`,
    "c_fill",
    "g_auto", // Auto-focus sur le sujet
    `q_${quality}`,
    `f_${format}`,
  ].join(",");

  return `${baseUrl}${transformations}/${publicIdPart}`;
}

/**
 * Génère une URL pour miniature
 */
export function getThumbnailUrl(url: string, size: number = 150): string {
  return getOptimizedImageUrl(url, {
    width: size,
    height: size,
    quality: 70,
  });
}

/**
 * Supprime une image de Cloudinary (nécessite l'API secret côté serveur)
 * Note: Cette fonction doit être appelée via une API route ou Convex action
 */
export async function deleteFromCloudinary(
  publicId: string,
  config: CloudinaryConfig & { apiSecret: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const timestamp = Math.floor(Date.now() / 1000);

    // Créer la signature (nécessite crypto)
    const signatureString = `public_id=${publicId}&timestamp=${timestamp}${config.apiSecret}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(signatureString);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const formData = new FormData();
    formData.append("public_id", publicId);
    formData.append("timestamp", timestamp.toString());
    formData.append("api_key", config.apiKey);
    formData.append("signature", signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`,
      {
        method: "POST",
        body: formData,
      }
    );

    const result = await response.json();

    if (result.result === "ok") {
      return { success: true };
    } else {
      return { success: false, error: result.result };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
}
