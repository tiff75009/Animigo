"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2, Mail, ArrowRight, Calendar, MapPin, User, Clock } from "lucide-react";
import Link from "next/link";

// Helper functions
function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatPrice(amountInCents: number): string {
  // Le montant est stocké en centimes, on divise par 100
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amountInCents / 100);
}

function getAnimalEmoji(type: string): string {
  const emojis: Record<string, string> = {
    chien: "\u{1F415}",
    chat: "\u{1F431}",
    oiseau: "\u{1F426}",
    rongeur: "\u{1F439}",
    reptile: "\u{1F98E}",
    poisson: "\u{1F420}",
    cheval: "\u{1F434}",
    nac: "\u{1F43E}",
    autre: "\u{1F43E}",
  };
  return emojis[type.toLowerCase()] || "\u{1F43E}";
}

// Calculer le nombre de jours entre deux dates
function getDaysDifference(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // +1 car on compte le jour de début
}

interface ReservationData {
  missionId: string;
  serviceName: string;
  serviceCategory: string;
  announcerName: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  animalName?: string;
  animalType?: string;
  location?: string;
  totalAmount?: number;
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [context, setContext] = useState<"registration" | "reservation">("registration");
  const [reservationData, setReservationData] = useState<ReservationData | null>(null);

  const verifyEmail = useMutation(api.public.emailVerify.verifyEmail);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Lien invalide : aucun token fourni.");
      return;
    }

    const verify = async () => {
      try {
        const result = await verifyEmail({ token });

        if (result.success && result.user) {
          setStatus("success");
          setUserName(result.user.firstName);

          if (result.context) {
            setContext(result.context);
          }
          if (result.reservation) {
            setReservationData(result.reservation);
          }
        } else {
          setStatus("error");
          setErrorMessage(result.error || "Une erreur est survenue.");
        }
      } catch (error) {
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Une erreur est survenue."
        );
      }
    };

    verify();
  }, [token, verifyEmail]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Header */}
          <div
            className={`p-8 text-center ${
              status === "success"
                ? "bg-gradient-to-r from-secondary to-secondary/80"
                : status === "error"
                ? "bg-gradient-to-r from-primary to-primary/80"
                : "bg-gradient-to-r from-primary to-accent"
            }`}
          >
            {status === "loading" && (
              <Loader2 className="w-16 h-16 text-white mx-auto animate-spin" />
            )}
            {status === "success" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
              >
                <CheckCircle className="w-16 h-16 text-white mx-auto" />
              </motion.div>
            )}
            {status === "error" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
              >
                <XCircle className="w-16 h-16 text-white mx-auto" />
              </motion.div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 text-center">
            {status === "loading" && (
              <>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Vérification en cours...
                </h1>
                <p className="text-text-light">
                  Veuillez patienter pendant que nous vérifions votre email.
                </p>
              </>
            )}

            {status === "success" && context === "registration" && (
              <>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Email vérifié !
                </h1>
                <p className="text-text-light mb-6">
                  Félicitations {userName} ! Votre adresse email a été confirmée
                  avec succès. Vous pouvez maintenant profiter de toutes les
                  fonctionnalités d&apos;Animigo.
                </p>

                <div className="space-y-3">
                  <Link
                    href="/dashboard"
                    className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-colors"
                  >
                    Accéder à mon espace
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    href="/"
                    className="block text-text-light hover:text-primary transition-colors"
                  >
                    Retour à l&apos;accueil
                  </Link>
                </div>
              </>
            )}

            {status === "success" && context === "reservation" && (
              <>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Réservation confirmée !
                </h1>
                <p className="text-text-light mb-6">
                  Félicitations {userName} ! Votre email a été vérifié et votre
                  demande de réservation a été envoyée à l&apos;annonceur.
                </p>

                {/* Reservation Summary */}
                {reservationData && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-50 rounded-2xl p-5 mb-6 text-left"
                  >
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <span className="text-lg">📋</span>
                      Récapitulatif
                    </h3>

                    <div className="space-y-4">
                      {/* Service */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-xl">{getAnimalEmoji(reservationData.animalType || "autre")}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-text-light uppercase tracking-wide">Service</p>
                          <p className="font-semibold text-foreground">
                            {reservationData.serviceName}
                          </p>
                        </div>
                      </div>

                      {/* Announcer */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-secondary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-text-light uppercase tracking-wide">Pet-sitter</p>
                          <p className="font-semibold text-foreground">
                            {reservationData.announcerName}
                          </p>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-5 h-5 text-purple" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-text-light uppercase tracking-wide">Dates</p>
                          <p className="font-semibold text-foreground">
                            {formatDateShort(reservationData.startDate)}
                            {reservationData.endDate && reservationData.endDate !== reservationData.startDate && (
                              <>
                                <span className="text-text-light font-normal"> au </span>
                                {formatDateShort(reservationData.endDate)}
                              </>
                            )}
                          </p>
                          {reservationData.endDate && reservationData.endDate !== reservationData.startDate && (
                            <p className="text-sm text-text-light">
                              {getDaysDifference(reservationData.startDate, reservationData.endDate)} jours
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Horaires */}
                      {(reservationData.startTime || reservationData.endTime) && (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Clock className="w-5 h-5 text-foreground" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-text-light uppercase tracking-wide">Horaires</p>
                            <p className="font-semibold text-foreground">
                              {reservationData.startTime && reservationData.startTime}
                              {reservationData.startTime && reservationData.endTime && " - "}
                              {reservationData.endTime && reservationData.endTime}
                              {reservationData.startTime && !reservationData.endTime && " (début)"}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Animal */}
                      {reservationData.animalName && (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span className="text-xl">{getAnimalEmoji(reservationData.animalType || "autre")}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-text-light uppercase tracking-wide">Votre animal</p>
                            <p className="font-semibold text-foreground">
                              {reservationData.animalName}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Location */}
                      {reservationData.location && (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-5 h-5 text-secondary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-text-light uppercase tracking-wide">Lieu</p>
                            <p className="font-semibold text-foreground">
                              {reservationData.location}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Total */}
                      {reservationData.totalAmount !== undefined && (
                        <div className="pt-4 mt-4 border-t border-slate-200">
                          <div className="flex justify-between items-center">
                            <span className="text-text-light">Montant total</span>
                            <span className="text-2xl font-bold text-primary">
                              {formatPrice(reservationData.totalAmount)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                <div className="p-4 bg-secondary/10 border border-secondary/20 rounded-xl mb-6">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">Prochaine étape :</span> L&apos;annonceur va recevoir votre demande et reviendra vers vous
                    rapidement. Vous recevrez une notification dès qu&apos;il aura accepté.
                  </p>
                </div>

                <div className="space-y-3">
                  <Link
                    href="/dashboard/missions"
                    className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-primary/20"
                  >
                    Voir mes réservations
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    href="/"
                    className="block text-text-light hover:text-primary transition-colors text-sm"
                  >
                    Retour à l&apos;accueil
                  </Link>
                </div>
              </>
            )}

            {status === "error" && (
              <>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Échec de la vérification
                </h1>
                <p className="text-text-light mb-6">{errorMessage}</p>

                <div className="p-4 bg-accent/20 border border-accent/30 rounded-xl mb-6">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-foreground flex-shrink-0 mt-0.5" />
                    <div className="text-left">
                      <p className="text-sm text-foreground font-medium">
                        Besoin d&apos;un nouveau lien ?
                      </p>
                      <p className="text-sm text-text-light mt-1">
                        Connectez-vous à votre compte pour renvoyer un email de
                        vérification.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Link
                    href="/connexion"
                    className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-primary/20"
                  >
                    Se connecter
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    href="/"
                    className="block text-text-light hover:text-primary transition-colors text-sm"
                  >
                    Retour à l&apos;accueil
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-text-light text-sm mt-6">
          Des questions ?{" "}
          <a
            href="mailto:support@animigo.fr"
            className="text-primary hover:underline font-medium"
          >
            Contactez-nous
          </a>
        </p>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
