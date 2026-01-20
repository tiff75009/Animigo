"use client";

import { useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  getOptimizedImageUrl,
  getThumbnailUrl,
} from "@/app/lib/cloudinary";

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

interface UseCloudinaryReturn {
  isConfigured: boolean;
  uploadState: UploadState;
  uploadImage: (file: File, folder?: string) => Promise<string | null>;
  uploadImages: (files: File[], folder?: string) => Promise<string[]>;
  getOptimizedUrl: (url: string, width?: number, height?: number) => string;
  getThumbnail: (url: string, size?: number) => string;
}

export function useCloudinary(): UseCloudinaryReturn {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });

  // Récupérer la config Cloudinary depuis Convex
  const cloudinaryConfig = useQuery(api.config.getCloudinaryConfig);

  const isConfigured = !!(
    cloudinaryConfig?.cloudName &&
    cloudinaryConfig?.apiKey
  );

  const uploadImage = useCallback(
    async (file: File, folder?: string): Promise<string | null> => {
      if (!cloudinaryConfig?.cloudName || !cloudinaryConfig?.apiKey) {
        setUploadState((prev) => ({
          ...prev,
          error: "Cloudinary n'est pas configuré",
        }));
        return null;
      }

      setUploadState({ isUploading: true, progress: 0, error: null });

      try {
        const result = await uploadToCloudinary(
          file,
          {
            cloudName: cloudinaryConfig.cloudName,
            apiKey: cloudinaryConfig.apiKey,
            uploadPreset: cloudinaryConfig.uploadPreset,
          },
          { folder: folder || "animigo/animals" }
        );

        if (result.success && result.url) {
          setUploadState({ isUploading: false, progress: 100, error: null });
          return result.url;
        } else {
          setUploadState({
            isUploading: false,
            progress: 0,
            error: result.error || "Échec de l'upload",
          });
          return null;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Erreur inconnue";
        setUploadState({ isUploading: false, progress: 0, error: errorMessage });
        return null;
      }
    },
    [cloudinaryConfig]
  );

  const uploadImages = useCallback(
    async (files: File[], folder?: string): Promise<string[]> => {
      if (!cloudinaryConfig?.cloudName || !cloudinaryConfig?.apiKey) {
        setUploadState((prev) => ({
          ...prev,
          error: "Cloudinary n'est pas configuré",
        }));
        return [];
      }

      setUploadState({ isUploading: true, progress: 0, error: null });

      try {
        const results = await uploadMultipleToCloudinary(
          files,
          {
            cloudName: cloudinaryConfig.cloudName,
            apiKey: cloudinaryConfig.apiKey,
            uploadPreset: cloudinaryConfig.uploadPreset,
          },
          { folder: folder || "animigo/animals" },
          (current, total) => {
            setUploadState((prev) => ({
              ...prev,
              progress: Math.round((current / total) * 100),
            }));
          }
        );

        const urls = results
          .filter((r) => r.success && r.url)
          .map((r) => r.url as string);

        const errors = results.filter((r) => !r.success);
        if (errors.length > 0) {
          setUploadState({
            isUploading: false,
            progress: 100,
            error: `${errors.length} image(s) n'ont pas pu être uploadées`,
          });
        } else {
          setUploadState({ isUploading: false, progress: 100, error: null });
        }

        return urls;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Erreur inconnue";
        setUploadState({ isUploading: false, progress: 0, error: errorMessage });
        return [];
      }
    },
    [cloudinaryConfig]
  );

  const getOptimizedUrl = useCallback(
    (url: string, width?: number, height?: number): string => {
      return getOptimizedImageUrl(url, { width, height });
    },
    []
  );

  const getThumbnail = useCallback((url: string, size?: number): string => {
    return getThumbnailUrl(url, size);
  }, []);

  return {
    isConfigured,
    uploadState,
    uploadImage,
    uploadImages,
    getOptimizedUrl,
    getThumbnail,
  };
}
