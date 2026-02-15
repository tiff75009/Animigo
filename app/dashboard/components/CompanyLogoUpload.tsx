"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Cropper, { Area } from "react-easy-crop";
import {
  X,
  Loader2,
  ImageIcon,
  ZoomIn,
  ZoomOut,
  Check,
  AlertTriangle,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useCloudinary } from "@/app/hooks/useCloudinary";

const MAX_OUTPUT_SIZE = 400; // 400x400 px max
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 Mo
const ACCEPTED_TYPES = ["image/jpeg", "image/png"];

interface CompanyLogoUploadProps {
  currentLogoUrl?: string | null;
  onUploadComplete: (url: string) => Promise<void>;
  onRemove: () => Promise<void>;
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob | null> {
  const image = new Image();
  image.src = imageSrc;
  image.crossOrigin = "anonymous";

  await new Promise((resolve) => {
    image.onload = resolve;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const outputSize = Math.min(pixelCrop.width, MAX_OUTPUT_SIZE);
  canvas.width = outputSize;
  canvas.height = outputSize;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 0.9);
  });
}

export default function CompanyLogoUpload({
  currentLogoUrl,
  onUploadComplete,
  onRemove,
}: CompanyLogoUploadProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, uploadState, isConfigured } = useCloudinary();

  useEffect(() => {
    setMounted(true);
  }, []);

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Format non supporté. Seuls les fichiers JPG et PNG sont acceptés.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Le fichier ne doit pas dépasser 2 Mo.";
    }
    return null;
  };

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target?.result as string);
        setError(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
      };
      reader.readAsDataURL(file);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (!file) return;

      const fakeEvent = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(fakeEvent);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsSaving(true);
    setError(null);

    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedBlob) {
        throw new Error("Erreur lors du recadrage");
      }

      const croppedFile = new File([croppedBlob], "logo.png", {
        type: "image/png",
      });

      const url = await uploadImage(croppedFile, "animigo/companies/logos");
      if (!url) {
        throw new Error("Échec de l'upload");
      }

      await onUploadComplete(url);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'upload");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    setIsSaving(true);
    try {
      await onRemove();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la suppression"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError(null);
  };

  return (
    <>
      <div className="flex items-center gap-4">
        {/* Preview du logo actuel */}
        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
          {currentLogoUrl ? (
            <img
              src={currentLogoUrl}
              alt="Logo entreprise"
              className="w-full h-full object-contain"
            />
          ) : (
            <ImageIcon className="w-6 h-6 text-gray-300" />
          )}
        </div>

        {/* Boutons */}
        <div className="flex flex-col gap-1.5">
          <motion.button
            type="button"
            onClick={() => setIsModalOpen(true)}
            disabled={!isConfigured}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
              "bg-primary/10 text-primary hover:bg-primary/20",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Pencil className="w-3.5 h-3.5" />
            {currentLogoUrl ? "Modifier" : "Ajouter un logo"}
          </motion.button>

          {currentLogoUrl && (
            <motion.button
              type="button"
              onClick={handleRemove}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Supprimer
            </motion.button>
          )}
        </div>
      </div>

      {/* Modal de crop */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isModalOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4"
                onClick={handleClose}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Logo de l&apos;entreprise
                      </h3>
                      <p className="text-sm text-gray-500">
                        JPG ou PNG, max 2 Mo
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {!imageSrc ? (
                      <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "border-2 border-dashed rounded-xl p-10 cursor-pointer",
                          "transition-colors hover:border-primary hover:bg-primary/5",
                          error
                            ? "border-red-300 bg-red-50"
                            : "border-gray-300"
                        )}
                      >
                        <div className="flex flex-col items-center text-center">
                          <div
                            className={cn(
                              "p-4 rounded-2xl mb-4",
                              error ? "bg-red-100" : "bg-gray-100"
                            )}
                          >
                            {error ? (
                              <AlertTriangle className="w-8 h-8 text-red-500" />
                            ) : (
                              <ImageIcon className="w-8 h-8 text-gray-400" />
                            )}
                          </div>
                          {error ? (
                            <>
                              <p className="text-sm font-medium text-red-700 mb-1">
                                Fichier non valide
                              </p>
                              <p className="text-sm text-red-600">{error}</p>
                              <p className="text-xs text-red-500 mt-3">
                                Cliquez pour sélectionner un autre fichier
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-base font-medium text-gray-700 mb-1">
                                Glissez votre logo ici
                              </p>
                              <p className="text-sm text-gray-500">
                                ou cliquez pour parcourir
                              </p>
                              <p className="mt-3 text-xs text-gray-400">
                                JPG ou PNG uniquement &bull; Max 2 Mo
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Cropper */}
                        <div className="relative h-72 bg-gray-900 rounded-xl overflow-hidden">
                          <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                            cropShape="rect"
                            showGrid={true}
                            style={{
                              containerStyle: { borderRadius: "0.75rem" },
                            }}
                          />
                        </div>

                        {/* Zoom */}
                        <div className="flex items-center justify-center gap-4">
                          <button
                            type="button"
                            onClick={() =>
                              setZoom((z) => Math.max(1, z - 0.1))
                            }
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <ZoomOut className="w-5 h-5 text-gray-600" />
                          </button>
                          <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.1}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-40 accent-primary"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setZoom((z) => Math.min(3, z + 0.1))
                            }
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <ZoomIn className="w-5 h-5 text-gray-600" />
                          </button>
                          <span className="text-sm text-gray-500 w-12">
                            {Math.round(zoom * 100)}%
                          </span>
                        </div>

                        {/* Changer d'image */}
                        <div className="text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setImageSrc(null);
                              setError(null);
                              fileInputRef.current?.click();
                            }}
                            className="text-sm text-primary hover:underline"
                          >
                            Choisir une autre image
                          </button>
                        </div>
                      </div>
                    )}

                    {error && imageSrc && (
                      <p className="mt-3 text-sm text-red-500 text-center">
                        {error}
                      </p>
                    )}

                    {uploadState.isUploading && (
                      <div className="mt-4">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-primary"
                            initial={{ width: 0 }}
                            animate={{
                              width: `${uploadState.progress}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 text-center mt-1">
                          Upload en cours... {uploadState.progress}%
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 bg-gray-50">
                    <motion.button
                      type="button"
                      onClick={handleClose}
                      disabled={isSaving}
                      className={cn(
                        "px-4 py-2 text-sm font-medium rounded-lg",
                        "bg-gray-100 text-gray-700 hover:bg-gray-200",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "transition-colors"
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Annuler
                    </motion.button>

                    <motion.button
                      type="button"
                      onClick={handleSave}
                      disabled={
                        !imageSrc || isSaving || uploadState.isUploading
                      }
                      className={cn(
                        "flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-lg",
                        "bg-primary text-white hover:bg-primary/90",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "transition-colors"
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isSaving || uploadState.isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Enregistrer
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
