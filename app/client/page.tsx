"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Search,
  MessageCircle,
  PawPrint,
  Calendar,
  Heart,
  ArrowRight,
  Clock,
  MapPin,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// Types
interface Animal {
  _id: string;
  name: string;
  type: string;
  breed?: string;
}

interface PendingPayment {
  missionId: string;
  serviceName: string;
  announcerName: string;
  amount: number;
  isReady?: boolean;
}

interface Reservation {
  id: string;
  serviceName: string;
  startDate: string;
  location?: string;
  status: string;
  animal?: { emoji: string };
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  // Récupérer les animaux du client
  const animals = useQuery(
    api.animals.getUserAnimals,
    token ? { token } : "skip"
  );

  // Récupérer les réservations du client
  const reservations = useQuery(
    api.planning.missions.getClientMissions,
    token ? { token } : "skip"
  );

  // Récupérer les paiements en attente
  const pendingPayments = useQuery(
    api.api.stripeClient.getPendingPayments,
    token ? { token } : "skip"
  );

  const upcomingReservations = reservations?.filter(
    (r: { status: string }) => r.status === "upcoming" || r.status === "pending_acceptance"
  ) || [];

  return (
    <div className="space-y-8">
      {/* Alerte paiement en attente */}
      {pendingPayments && pendingPayments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg shadow-orange-500/25"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <h2 className="text-lg font-bold">
                  {pendingPayments.length === 1
                    ? "Paiement en attente"
                    : `${pendingPayments.length} paiements en attente`}
                </h2>
              </div>
              <p className="text-white/90 mb-4">
                {pendingPayments.length === 1
                  ? `Votre réservation "${pendingPayments[0].serviceName}" avec ${pendingPayments[0].announcerName} a été acceptée ! Finalisez le paiement pour confirmer.`
                  : "Vos réservations ont été acceptées ! Finalisez les paiements pour confirmer."}
              </p>
              <div className="flex flex-wrap gap-3">
                {(pendingPayments as PendingPayment[]).slice(0, 2).map((payment) => (
                  <Link
                    key={payment.missionId}
                    href={`/client/paiement/${payment.missionId}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-orange-600 rounded-xl font-semibold text-sm hover:bg-white/90 transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                    Payer {(payment.amount / 100).toFixed(2)} €
                  </Link>
                ))}
                {pendingPayments.length > 2 && (
                  <Link
                    href="/client/reservations"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-xl font-semibold text-sm hover:bg-white/30 transition-colors"
                  >
                    Voir tout
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Header de bienvenue */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: pendingPayments && pendingPayments.length > 0 ? 0.1 : 0 }}
        className="bg-gradient-to-r from-secondary to-secondary/80 rounded-2xl p-6 lg:p-8 text-white"
      >
        <h1 className="text-2xl lg:text-3xl font-bold mb-2">
          Bonjour {user?.firstName} ! 👋
        </h1>
        <p className="text-white/90">
          Bienvenue sur votre espace personnel Animigo
        </p>
      </motion.div>

      {/* Actions rapides */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {/* Rechercher un pet-sitter */}
        <Link href="/recherche">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-white cursor-pointer shadow-lg shadow-primary/25"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-1">Trouver un pet-sitter</h3>
                <p className="text-white/80 text-sm">
                  Recherchez parmi nos gardiens de confiance
                </p>
              </div>
              <ArrowRight className="w-6 h-6 text-white/60" />
            </div>
          </motion.div>
        </Link>

        {/* Mes messages */}
        <Link href="/client/messagerie">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                  <MessageCircle className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-1">Messagerie</h3>
                <p className="text-gray-500 text-sm">
                  Discutez avec vos pet-sitters
                </p>
              </div>
              <ArrowRight className="w-6 h-6 text-gray-300" />
            </div>
          </motion.div>
        </Link>
      </motion.div>

      {/* Mes animaux */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl p-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center">
              <PawPrint className="w-5 h-5 text-secondary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Mes animaux</h2>
          </div>
          <Link
            href="/client/mes-animaux"
            className="text-primary font-medium text-sm hover:underline"
          >
            Voir tout
          </Link>
        </div>

        {animals && animals.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(animals as Animal[]).slice(0, 3).map((animal, index) => (
              <motion.div
                key={animal._id || `animal-${index}`}
                whileHover={{ y: -2 }}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl"
              >
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm">
                  {getAnimalEmoji(animal.type)}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{animal.name}</p>
                  <p className="text-sm text-gray-500">
                    {animal.breed || getAnimalLabel(animal.type)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <PawPrint className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">Vous n'avez pas encore ajouté d'animal</p>
            <Link
              href="/client/mes-animaux"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              <PawPrint className="w-4 h-4" />
              Ajouter un animal
            </Link>
          </div>
        )}
      </motion.div>

      {/* Prochaines réservations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl p-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Prochaines réservations</h2>
          </div>
          <Link
            href="/client/reservations"
            className="text-primary font-medium text-sm hover:underline"
          >
            Voir tout
          </Link>
        </div>

        {upcomingReservations.length > 0 ? (
          <div className="space-y-4">
            {(upcomingReservations as Reservation[]).slice(0, 3).map((reservation) => (
              <motion.div
                key={reservation.id}
                whileHover={{ x: 4 }}
                className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:border-primary/30 transition-colors"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-xl">
                  {reservation.animal?.emoji || "🐾"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {reservation.serviceName}
                  </p>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(reservation.startDate)}
                    </span>
                    {reservation.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {reservation.location}
                      </span>
                    )}
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  reservation.status === "upcoming"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}>
                  {reservation.status === "upcoming" ? "Confirmée" : "En attente"}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">Aucune réservation à venir</p>
            <Link
              href="/recherche"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              <Search className="w-4 h-4" />
              Trouver un pet-sitter
            </Link>
          </div>
        )}
      </motion.div>

      {/* Aide */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
            <Heart className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">Besoin d'aide ?</h3>
            <p className="text-sm text-gray-500">
              Notre équipe est là pour vous accompagner.{" "}
              <a href="mailto:support@animigo.fr" className="text-primary hover:underline">
                Contactez-nous
              </a>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Helpers
function getAnimalEmoji(type: string): string {
  const emojis: Record<string, string> = {
    chien: "🐕",
    chat: "🐱",
    oiseau: "🐦",
    rongeur: "🐹",
    reptile: "🦎",
    poisson: "🐠",
    cheval: "🐴",
    nac: "🐾",
    autre: "🐾",
  };
  return emojis[type.toLowerCase()] || "🐾";
}

function getAnimalLabel(type: string): string {
  const labels: Record<string, string> = {
    chien: "Chien",
    chat: "Chat",
    oiseau: "Oiseau",
    rongeur: "Rongeur",
    reptile: "Reptile",
    poisson: "Poisson",
    cheval: "Cheval",
    nac: "NAC",
    autre: "Autre",
  };
  return labels[type.toLowerCase()] || "Animal";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}
