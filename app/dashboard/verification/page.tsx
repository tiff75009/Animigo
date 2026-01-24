"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/hooks/useAuth";
import {
  ShieldCheck,
  Upload,
  Camera,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  Copy,
  RefreshCw,
  XCircle,
  Info,
  Loader2,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import Image from "next/image";

// Configuration Cloudinary
const CLOUDINARY_CLOUD_NAME = "dpusoqz6c";
const CLOUDINARY_UPLOAD_PRESET = "animigo_unsigned";

interface UploadState {
  isUploading: boolean;
  progress: number;
  url: string | null;
  error: string | null;
}

export default function VerificationPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();

  // États d'upload
  const [idFront, setIdFront] = useState<UploadState>({ isUploading: false, progress: 0, url: null, error: null });
  const [idBack, setIdBack] = useState<UploadState>({ isUploading: false, progress: 0, url: null, error: null });
  const [selfie, setSelfie] = useState<UploadState>({ isUploading: false, progress: 0, url: null, error: null });
  const [codeCopied, setCodeCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mutations
  const getOrCreateRequest = useMutation(api.verification.verification.getOrCreateVerificationRequest);
  const updateDocuments = useMutation(api.verification.verification.updateVerificationDocuments);
  const submitRequest = useMutation(api.verification.verification.submitVerificationRequest);

  // Query pour le statut
  const verificationStatus = useQuery(
    api.verification.verification.getVerificationStatus,
    token ? { sessionToken: token } : "skip"
  );

  // Initialiser la demande
  const [requestId, setRequestId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [isAlreadyVerified, setIsAlreadyVerified] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  // Créer ou récupérer la demande au chargement
  useEffect(() => {
    async function initRequest() {
      if (!token) return;

      try {
        const result = await getOrCreateRequest({ sessionToken: token });
        if (result.request) {
          setRequestId(result.request._id);
          setVerificationCode(result.request.verificationCode);
          setIsAlreadyVerified(result.isAlreadyVerified);

          // Pré-remplir les URLs existantes
          if (result.request.idCardFrontUrl) {
            setIdFront(prev => ({ ...prev, url: result.request!.idCardFrontUrl! }));
          }
          if (result.request.idCardBackUrl) {
            setIdBack(prev => ({ ...prev, url: result.request!.idCardBackUrl! }));
          }
          if (result.request.selfieWithCodeUrl) {
            setSelfie(prev => ({ ...prev, url: result.request!.selfieWithCodeUrl! }));
          }
          if (result.request.rejectionReason) {
            setRejectionReason(result.request.rejectionReason);
          }
        }
      } catch (error) {
        console.error("Erreur lors de l'initialisation:", error);
      }
    }

    initRequest();
  }, [token, getOrCreateRequest]);

  // Upload vers Cloudinary
  const uploadToCloudinary = useCallback(async (
    file: File,
    folder: string,
    setUploadState: React.Dispatch<React.SetStateAction<UploadState>>
  ): Promise<string | null> => {
    setUploadState({ isUploading: true, progress: 0, url: null, error: null });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", `verification/${folder}`);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Erreur lors de l'upload");
      }

      const data = await response.json();
      setUploadState({ isUploading: false, progress: 100, url: data.secure_url, error: null });
      return data.secure_url;
    } catch (error) {
      setUploadState({ isUploading: false, progress: 0, url: null, error: "Erreur lors de l'upload" });
      return null;
    }
  }, []);

  // Handler pour l'upload de fichier
  const handleFileUpload = useCallback(async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "front" | "back" | "selfie"
  ) => {
    const file = event.target.files?.[0];
    if (!file || !token || !requestId) return;

    // Validation du fichier
    if (!file.type.startsWith("image/")) {
      const setError = type === "front" ? setIdFront : type === "back" ? setIdBack : setSelfie;
      setError(prev => ({ ...prev, error: "Le fichier doit être une image" }));
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB max
      const setError = type === "front" ? setIdFront : type === "back" ? setIdBack : setSelfie;
      setError(prev => ({ ...prev, error: "Le fichier est trop volumineux (max 10MB)" }));
      return;
    }

    const setUploadState = type === "front" ? setIdFront : type === "back" ? setIdBack : setSelfie;
    const folder = type === "front" ? "id-front" : type === "back" ? "id-back" : "selfie";

    const url = await uploadToCloudinary(file, folder, setUploadState);

    if (url) {
      // Mettre à jour en base
      try {
        await updateDocuments({
          sessionToken: token,
          requestId: requestId as any,
          ...(type === "front" && { idCardFrontUrl: url }),
          ...(type === "back" && { idCardBackUrl: url }),
          ...(type === "selfie" && { selfieWithCodeUrl: url }),
        });
      } catch (error) {
        console.error("Erreur lors de la mise à jour:", error);
      }
    }
  }, [token, requestId, uploadToCloudinary, updateDocuments]);

  // Copier le code
  const copyCode = useCallback(() => {
    if (verificationCode) {
      navigator.clipboard.writeText(verificationCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  }, [verificationCode]);

  // Soumettre la demande
  const handleSubmit = useCallback(async () => {
    if (!token || !requestId || !idFront.url || !idBack.url || !selfie.url) return;

    setIsSubmitting(true);
    try {
      await submitRequest({
        sessionToken: token,
        requestId: requestId as any,
      });
      // Rediriger ou afficher un message de succès
      router.refresh();
    } catch (error) {
      console.error("Erreur lors de la soumission:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [token, requestId, idFront.url, idBack.url, selfie.url, submitRequest, router]);

  // Loading
  if (authLoading || !verificationStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Déjà vérifié
  if (isAlreadyVerified || verificationStatus.isIdentityVerified) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-8 shadow-sm border border-foreground/5 text-center"
        >
          <div className="w-20 h-20 mx-auto bg-secondary/10 rounded-full flex items-center justify-center mb-6">
            <ShieldCheck className="w-10 h-10 text-secondary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Identité vérifiée</h1>
          <p className="text-text-light mb-6">
            Votre identité a été vérifiée avec succès. Votre profil affiche désormais le badge de confiance.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            Retour au tableau de bord
          </button>
        </motion.div>
      </div>
    );
  }

  // En attente de validation
  if (verificationStatus.latestRequest?.status === "submitted") {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-8 shadow-sm border border-foreground/5 text-center"
        >
          <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-6">
            <Clock className="w-10 h-10 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Vérification en cours</h1>
          <p className="text-text-light mb-4">
            Votre demande de vérification a été soumise et est en cours d&apos;examen par notre équipe.
          </p>
          <p className="text-sm text-text-light">
            Vous recevrez une notification dès que la vérification sera terminée.
          </p>
          <div className="mt-6 p-4 bg-blue-50 rounded-xl">
            <p className="text-sm text-blue-700">
              Soumis le {new Date(verificationStatus.latestRequest.submittedAt!).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const canSubmit = idFront.url && idBack.url && selfie.url && !isSubmitting;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-sm border border-foreground/5"
      >
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Vérifier mon identité</h1>
            <p className="text-text-light mt-1">
              Gagnez la confiance des clients en vérifiant votre identité. Le badge vérifié sera affiché sur votre profil.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Message de rejet si applicable */}
      {rejectionReason && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-2xl p-4"
        >
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-700">Demande précédente rejetée</p>
              <p className="text-sm text-red-600 mt-1">{rejectionReason}</p>
              <p className="text-sm text-red-600 mt-2">
                Vous pouvez soumettre à nouveau vos documents corrigés.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Info sécurité avec lien Filigrane */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-blue-50 border border-blue-200 rounded-2xl p-4"
      >
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-700">Protégez votre pièce d&apos;identité</p>
            <p className="text-sm text-blue-600 mt-1">
              Avant d&apos;envoyer une copie de votre pièce d&apos;identité, nous vous recommandons d&apos;utiliser
              le service officiel <strong>Filigrane Facile</strong> du gouvernement pour ajouter un filigrane protecteur.
            </p>
            <a
              href="https://filigrane.beta.gouv.fr/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Accéder à Filigrane Facile
            </a>
          </div>
        </div>
      </motion.div>

      {/* Code de vérification */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl p-6 shadow-sm border border-foreground/5"
      >
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          Code de vérification
        </h2>
        <p className="text-text-light text-sm mb-4">
          Écrivez ce code sur une feuille de papier et tenez-la devant vous lors de votre photo selfie.
          Cela nous permet de vérifier que c&apos;est bien vous.
        </p>
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-gray-100 rounded-xl p-4 text-center">
            <span className="text-3xl font-mono font-bold text-foreground tracking-widest">
              {verificationCode || "------"}
            </span>
          </div>
          <button
            onClick={copyCode}
            className={cn(
              "px-4 py-3 rounded-xl font-medium transition-colors flex items-center gap-2",
              codeCopied
                ? "bg-secondary text-white"
                : "bg-gray-100 text-foreground hover:bg-gray-200"
            )}
          >
            {codeCopied ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Copié !
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copier
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Uploads */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* CNI Recto */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-foreground/5"
        >
          <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Pièce d&apos;identité (Recto)
          </h3>
          <p className="text-sm text-text-light mb-4">
            Face avant de votre carte d&apos;identité ou passeport.
          </p>

          <UploadZone
            state={idFront}
            onUpload={(e) => handleFileUpload(e, "front")}
            inputId="id-front"
          />
        </motion.div>

        {/* CNI Verso */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-foreground/5"
        >
          <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Pièce d&apos;identité (Verso)
          </h3>
          <p className="text-sm text-text-light mb-4">
            Face arrière de votre carte d&apos;identité.
          </p>

          <UploadZone
            state={idBack}
            onUpload={(e) => handleFileUpload(e, "back")}
            inputId="id-back"
          />
        </motion.div>
      </div>

      {/* Selfie avec code */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-2xl p-6 shadow-sm border border-foreground/5"
      >
        <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          Photo selfie avec le code
        </h3>
        <p className="text-sm text-text-light mb-4">
          Prenez-vous en photo en tenant une feuille avec le code <strong className="font-mono">{verificationCode}</strong> écrit dessus.
          Votre visage et le code doivent être clairement visibles.
        </p>

        <UploadZone
          state={selfie}
          onUpload={(e) => handleFileUpload(e, "selfie")}
          inputId="selfie"
          cameraOnly
        />

        <div className="mt-4 p-4 bg-amber-50 rounded-xl">
          <p className="text-sm text-amber-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Assurez-vous que le code sur la feuille correspond exactement au code affiché ci-dessus.
              Une photo floue ou illisible sera rejetée.
            </span>
          </p>
        </div>
      </motion.div>

      {/* Bouton soumettre */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex justify-end"
      >
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={cn(
            "px-8 py-4 rounded-xl font-medium text-lg transition-all flex items-center gap-3",
            canSubmit
              ? "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/30"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5" />
              Soumettre ma demande
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}

// Composant Zone d'upload réutilisable
function UploadZone({
  state,
  onUpload,
  inputId,
  cameraOnly = false,
}: {
  state: UploadState;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputId: string;
  cameraOnly?: boolean;
}) {
  if (state.url) {
    return (
      <div className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden">
        <Image
          src={state.url}
          alt="Document uploadé"
          fill
          className="object-contain"
        />
        <div className="absolute top-2 right-2">
          <label
            htmlFor={inputId}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/90 rounded-lg text-sm font-medium text-foreground cursor-pointer hover:bg-white transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            {cameraOnly ? "Reprendre" : "Remplacer"}
          </label>
          <input
            id={inputId}
            type="file"
            accept="image/*"
            capture={cameraOnly ? "user" : undefined}
            onChange={onUpload}
            className="hidden"
          />
        </div>
        <div className="absolute bottom-2 left-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/90 text-white rounded-lg text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Uploadé
          </span>
        </div>
      </div>
    );
  }

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "flex flex-col items-center justify-center aspect-video bg-gray-50 border-2 border-dashed rounded-xl cursor-pointer transition-colors",
        state.isUploading
          ? "border-primary bg-primary/5"
          : state.error
          ? "border-red-300 bg-red-50"
          : cameraOnly
          ? "border-secondary/50 hover:border-secondary hover:bg-secondary/5"
          : "border-gray-200 hover:border-primary hover:bg-primary/5"
      )}
    >
      {state.isUploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-primary font-medium">Upload en cours...</span>
        </div>
      ) : state.error ? (
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
          <span className="text-sm text-red-600">{state.error}</span>
          <span className="text-xs text-red-500">Cliquez pour réessayer</span>
        </div>
      ) : cameraOnly ? (
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <Camera className="w-10 h-10 text-secondary" />
          <span className="text-sm text-secondary font-semibold">
            Prendre une photo
          </span>
          <span className="text-xs text-gray-500">L&apos;appareil photo s&apos;ouvrira automatiquement</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <Upload className="w-8 h-8 text-gray-400" />
          <span className="text-sm text-gray-600 font-medium">
            Cliquez pour uploader
          </span>
          <span className="text-xs text-gray-400">PNG, JPG jusqu&apos;à 10MB</span>
        </div>
      )}
      <input
        id={inputId}
        type="file"
        accept="image/*"
        capture={cameraOnly ? "user" : undefined}
        onChange={onUpload}
        className="hidden"
        disabled={state.isUploading}
      />
    </label>
  );
}
