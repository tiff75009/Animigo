"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useAction } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Trash2, Image as ImageIcon, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/app/lib/utils";
import { useCloudinary } from "@/app/hooks/useCloudinary";

const MAX_PHOTOS = 3;
const MAX_SIZE_MB = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface PhotoEntry {
  url: string;
  order?: number;
  /** Status de modération OCR (formules uniquement). */
  moderationStatus?: "pending" | "approved" | "rejected";
  /** Motif lisible si moderationStatus === "rejected". */
  rejectionReason?: string;
}

interface Props {
  /**
   * Mode "attached" : le service existe déjà, les upload/delete sont
   * persistés immédiatement via les mutations.
   * Mode "staged" : pas de service encore (formulaire de création) ;
   * les URLs sont gardées en état local et remontées via onChange.
   */
  serviceId?: Id<"services">;
  token?: string;
  photos: PhotoEntry[];
  /** Callback avec la liste complète des URLs après add/remove */
  onChange?: (urls: string[]) => void;
  /**
   * Callback appelé à chaque changement du status de validation des photos.
   * `false` = au moins une photo est rejetée par l'OCR → le parent doit
   * désactiver le bouton de soumission.
   */
  onValidityChange?: (isValid: boolean) => void;
  className?: string;
}

interface ScanState {
  status: "scanning" | "approved" | "rejected" | "error";
  rejectionReason?: string;
}

export function ServicePhotosUploader({
  serviceId,
  token,
  photos,
  onChange,
  onValidityChange,
  className,
}: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // États de scan OCR live, par URL (résultat du scanPhotoUrl appelé à l'upload)
  const [scanStates, setScanStates] = useState<Record<string, ScanState>>({});

  const { uploadImage, isConfigured: isCloudinaryConfigured } = useCloudinary();
  const addPhoto = useMutation(api.services.servicePhotos.addServicePhoto);
  const deletePhoto = useMutation(api.services.servicePhotos.deleteServicePhoto);
  const scanPhotoUrl = useAction(api.api.visionOcr.scanPhotoUrl);

  // Notifier le parent du status de validité (true = aucune photo rejetée)
  useEffect(() => {
    if (!onValidityChange) return;
    const hasRejection = Object.values(scanStates).some((s) => s.status === "rejected");
    const hasRejectionInProps = photos.some((p) => p.moderationStatus === "rejected");
    onValidityChange(!hasRejection && !hasRejectionInProps);
  }, [scanStates, photos, onValidityChange]);

  const attached = Boolean(serviceId && token);
  const sortedPhotos = [...photos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const remainingSlots = MAX_PHOTOS - sortedPhotos.length;
  const canUpload = remainingSlots > 0;

  const notifyChange = useCallback(
    (next: PhotoEntry[]) => {
      onChange?.(next.map((p) => p.url));
    },
    [onChange]
  );

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setError(null);

      if (!isCloudinaryConfigured) {
        setError("Upload indisponible : Cloudinary n'est pas configuré");
        return;
      }

      const validFiles: File[] = [];
      const errors: string[] = [];
      for (const file of files) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          errors.push(`${file.name} : format invalide`);
          continue;
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
          errors.push(`${file.name} : trop volumineux (max ${MAX_SIZE_MB} Mo)`);
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length === 0) {
        setError(errors.join(" · "));
        return;
      }

      const filesToProcess = validFiles.slice(0, remainingSlots);
      if (validFiles.length > remainingSlots) {
        errors.push(
          `Seules ${remainingSlots} photo${remainingSlots > 1 ? "s" : ""} sur ${validFiles.length} ajoutées (max ${MAX_PHOTOS})`
        );
      }

      setIsUploading(true);
      setUploadProgress({ current: 0, total: filesToProcess.length });

      const newPhotos = [...sortedPhotos];

      try {
        for (let i = 0; i < filesToProcess.length; i++) {
          const file = filesToProcess[i];
          setUploadProgress({ current: i + 1, total: filesToProcess.length });

          try {
            const url = await uploadImage(file, "animigo/services");
            if (!url) {
              errors.push(`${file.name} : upload échoué`);
              continue;
            }
            const entry: PhotoEntry = { url, order: newPhotos.length };
            newPhotos.push(entry);
            // Marquer la photo comme "scanning" tant que le résultat OCR n'est pas là
            setScanStates((prev) => ({ ...prev, [url]: { status: "scanning" } }));
            // Mode attached : persistance immédiate
            if (attached) {
              try {
                await addPhoto({ token: token!, serviceId: serviceId!, url });
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                errors.push(`${file.name} : ${msg}`);
                newPhotos.pop();
                setScanStates((prev) => {
                  const next = { ...prev };
                  delete next[url];
                  return next;
                });
                continue;
              }
            }
            // Lancer le scan OCR EN BACKGROUND (ne bloque pas l'upload des autres
            // photos). Le résultat met à jour scanStates en async pour afficher
            // le badge live.
            scanPhotoUrl({ url })
              .then((result) => {
                setScanStates((prev) => ({
                  ...prev,
                  [url]: {
                    status: result.status,
                    rejectionReason: result.rejectionReason,
                  },
                }));
              })
              .catch((err) => {
                console.error("[ServicePhotosUploader] scan échoué", err);
                setScanStates((prev) => ({ ...prev, [url]: { status: "error" } }));
              });
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`${file.name} : ${msg}`);
            console.error("[ServicePhotosUploader]", err);
          }
        }
        notifyChange(newPhotos);
      } finally {
        setIsUploading(false);
        setUploadProgress({ current: 0, total: 0 });
        if (errors.length > 0) setError(errors.join(" · "));
      }
    },
    [
      isCloudinaryConfigured,
      remainingSlots,
      sortedPhotos,
      attached,
      addPhoto,
      token,
      serviceId,
      uploadImage,
      notifyChange,
      scanPhotoUrl,
    ]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    uploadFiles(files);
    if (e.target) e.target.value = "";
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canUpload) setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!canUpload) return;
    const files = Array.from(e.dataTransfer.files);
    uploadFiles(files);
  };

  const handleDelete = async (url: string) => {
    setError(null);
    const remaining = sortedPhotos
      .filter((p) => p.url !== url)
      .map((p, i) => ({ ...p, order: i }));
    try {
      if (attached) {
        await deletePhoto({ token: token!, serviceId: serviceId!, url });
      }
      notifyChange(remaining);
      // Nettoyer le scan live de cette URL
      setScanStates((prev) => {
        const next = { ...prev };
        delete next[url];
        return next;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur suppression";
      setError(msg);
    }
  };

  // Helper : statut effectif d'une photo (scan live OU status persisté en DB)
  const getEffectiveStatus = (
    photo: PhotoEntry
  ): { status: "scanning" | "approved" | "rejected" | "pending" | "error" | undefined; reason?: string } => {
    const live = scanStates[photo.url];
    if (live) return { status: live.status, reason: live.rejectionReason };
    if (photo.moderationStatus) {
      return { status: photo.moderationStatus, reason: photo.rejectionReason };
    }
    return { status: undefined };
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" />
            Photos du service
          </h4>
          <p className="text-xs text-text-light mt-0.5">
            Jusqu&apos;à {MAX_PHOTOS} photos affichées dans les résultats de recherche
          </p>
        </div>
        <span className="text-xs font-medium text-text-light">
          {sortedPhotos.length}/{MAX_PHOTOS}
        </span>
      </div>

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-xl transition-all",
          isDragging && canUpload && "ring-2 ring-primary ring-offset-2 bg-primary/5"
        )}
      >
        {/* Animation scanline (keyframes injectées une seule fois) */}
        <style>{`
          @keyframes ocr-scanline {
            0%   { transform: translateY(-100%); opacity: 0; }
            10%  { opacity: 1; }
            90%  { opacity: 1; }
            100% { transform: translateY(100%); opacity: 0; }
          }
          @keyframes ocr-scan-glow {
            0%, 100% { box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.4); }
            50%      { box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.85); }
          }
          .ocr-scanning-overlay::before {
            content: "";
            position: absolute;
            inset: 0;
            background: linear-gradient(
              180deg,
              transparent 0%,
              rgba(59, 130, 246, 0.0) 40%,
              rgba(59, 130, 246, 0.55) 50%,
              rgba(59, 130, 246, 0.0) 60%,
              transparent 100%
            );
            animation: ocr-scanline 1.6s ease-in-out infinite;
            pointer-events: none;
          }
          .ocr-scanning-frame {
            animation: ocr-scan-glow 1.6s ease-in-out infinite;
          }
        `}</style>

        <div className="grid grid-cols-3 gap-2">
          <AnimatePresence mode="popLayout">
            {sortedPhotos.map((photo, idx) => {
              const eff = getEffectiveStatus(photo);
              const isScanning = eff.status === "scanning" || eff.status === "pending";
              const isRejected = eff.status === "rejected";
              const isApproved = eff.status === "approved";
              return (
              <motion.div
                key={photo.url}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  "relative aspect-square rounded-xl overflow-hidden group border",
                  isRejected ? "border-red-300" : "border-gray-200",
                  isScanning && "ocr-scanning-frame"
                )}
              >
                <Image
                  src={photo.url}
                  alt="Photo du service"
                  fill
                  sizes="(max-width: 768px) 33vw, 200px"
                  className={cn(
                    "object-cover",
                    isRejected && "opacity-50",
                    isScanning && "opacity-90"
                  )}
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Overlay animation scanline (uniquement pendant le scan) */}
                {isScanning && <div className="absolute inset-0 ocr-scanning-overlay pointer-events-none" />}

                {/* Bouton supprimer (top-right) — z-20 pour rester au-dessus des badges */}
                <button
                  type="button"
                  onClick={() => handleDelete(photo.url)}
                  className="absolute top-1.5 right-1.5 z-20 w-8 h-8 rounded-full bg-white/95 shadow-lg flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Supprimer la photo"
                  title="Supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Index de la photo (bottom-right pour ne pas chevaucher les badges bottom-left) */}
                <span className="absolute bottom-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-black/50 text-white text-[10px] font-bold flex items-center justify-center">
                  {(photo.order ?? idx) + 1}
                </span>

                {/* Badges modération OCR */}
                {/* Pendant le scan : badge en haut, mais avec right-12 pour laisser le slot du bouton supprimer */}
                {isScanning && (
                  <div className="absolute top-1.5 left-1.5 right-12 z-10 px-2 py-1 rounded-md bg-white/95 shadow-sm flex items-center gap-1.5 text-[10px] font-semibold text-blue-700 backdrop-blur">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                    <span className="truncate">Analyse en cours...</span>
                  </div>
                )}
                {/* Refusée : badge en BAS-GAUCHE pour ne plus passer derrière le bouton supprimer */}
                {isRejected && (
                  <div
                    className="absolute bottom-1.5 left-1.5 z-10 px-2 py-1 rounded-md bg-red-500 shadow-md flex items-center gap-1 text-[10px] font-bold text-white"
                    title={eff.reason || "Photo refusée par la modération automatique"}
                  >
                    <ShieldAlert className="w-3 h-3" />
                    <span>Refusée</span>
                  </div>
                )}
                {/* Vérifiée : badge en bas-gauche, visible au hover (discret) */}
                {isApproved && (
                  <div
                    className="absolute bottom-1.5 left-1.5 z-10 px-2 py-1 rounded-md bg-emerald-500/95 shadow-md flex items-center gap-1 text-[10px] font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Photo vérifiée par la modération automatique"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>Vérifiée</span>
                  </div>
                )}
              </motion.div>
              );
            })}
          </AnimatePresence>

          {canUpload && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              className={cn(
                "aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-all group",
                isDragging
                  ? "border-primary bg-primary/10 text-primary"
                  : isUploading
                  ? "border-primary/50 bg-primary/5 text-primary"
                  : "border-gray-300 text-text-light hover:border-primary hover:text-primary hover:bg-primary/5"
              )}
              aria-label="Ajouter des photos"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-[11px] font-medium">
                    {uploadProgress.current}/{uploadProgress.total}
                  </span>
                </>
              ) : isDragging ? (
                <>
                  <Upload className="w-5 h-5" />
                  <span className="text-[11px] font-medium">Déposer</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-medium text-center leading-tight px-1">
                    {remainingSlots > 1 ? `Ajouter (${remainingSlots})` : "Ajouter"}
                  </span>
                </>
              )}
            </button>
          )}

          {Array.from({
            length: Math.max(0, MAX_PHOTOS - sortedPhotos.length - (canUpload ? 1 : 0)),
          }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="aspect-square rounded-xl border border-dashed border-gray-200 bg-gray-50/50"
            />
          ))}
        </div>

        {isDragging && canUpload && (
          <div className="absolute inset-0 rounded-xl bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full text-sm font-semibold text-primary shadow-lg flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Déposez vos photos ici
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFileInput}
        multiple
        className="hidden"
      />

      {canUpload && !isUploading && (
        <p className="text-[11px] text-text-light mt-2 px-1">
          Glissez-déposez ou cliquez · JPG, PNG, WebP · max {MAX_SIZE_MB} Mo
        </p>
      )}

      {error && (
        <p className="text-xs text-red-600 mt-2 px-1 whitespace-pre-wrap">{error}</p>
      )}

      {/* Récapitulatif des photos refusées par la modération OCR (live + persisté) */}
      {(() => {
        const rejectedList = sortedPhotos
          .map((p, i) => ({ photo: p, idx: i, eff: getEffectiveStatus(p) }))
          .filter((x) => x.eff.status === "rejected");
        if (rejectedList.length === 0) return null;
        return (
          <div className="mt-2 p-2.5 rounded-lg border border-red-200 bg-red-50">
            <p className="text-[12px] font-semibold text-red-700 flex items-center gap-1.5 mb-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              Photo(s) refusée(s) par la modération automatique
            </p>
            <ul className="text-[11.5px] text-red-700 list-disc list-inside space-y-0.5">
              {rejectedList.map(({ photo, idx, eff }) => (
                <li key={photo.url}>
                  Photo {(photo.order ?? idx) + 1} :{" "}
                  {eff.reason || "coordonnées détectées dans l'image"}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-red-600/80 mt-1.5">
              Les photos contenant un email ou un numéro de téléphone ne sont pas autorisées sur la plateforme.
              Supprimez-les ou remplacez-les avant de sauvegarder.
            </p>
          </div>
        );
      })()}
    </div>
  );
}
