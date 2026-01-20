"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Euro, Calendar, Loader2, MapPin, Phone, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/app/lib/utils";
import Link from "next/link";

interface Mission {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  animal: {
    name: string;
    type: string;
    emoji: string;
  };
  serviceName: string;
  serviceCategory: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  status: string;
  amount: number;
  paymentStatus: string;
  location?: string;
  clientNotes?: string;
}

function MissionConfirmationCard({ mission }: { mission: Mission }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  };

  const getDaysUntil = () => {
    const start = new Date(mission.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = start.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntil = getDaysUntil();

  return (
    <motion.div
      className="bg-white rounded-2xl shadow-md overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
    >
      {/* Main content */}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl flex items-center justify-center text-3xl shadow-sm">
              {mission.animal.emoji}
            </div>
            <div>
              <p className="font-semibold text-foreground text-lg">{mission.clientName}</p>
              <p className="text-sm text-text-light flex items-center gap-1.5">
                <span>{mission.animal.emoji}</span>
                {mission.animal.name}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{formatPrice(mission.amount)}</p>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold mt-1">
              <Clock className="w-3 h-3" />
              En attente
            </span>
          </div>
        </div>

        {/* Service */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl p-4 mb-4">
          <p className="font-medium text-foreground">{mission.serviceName}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-text-light">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" />
              <span>{formatDate(mission.startDate)}</span>
              {mission.startDate !== mission.endDate && (
                <>
                  <span className="text-text-light/50">-</span>
                  <span>{formatDate(mission.endDate)}</span>
                </>
              )}
            </div>
            {mission.startTime && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-secondary" />
                <span>{mission.startTime}</span>
                {mission.endTime && <span>- {mission.endTime}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Days until */}
        {daysUntil > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <div className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium",
              daysUntil <= 3 ? "bg-red-100 text-red-700" :
              daysUntil <= 7 ? "bg-orange-100 text-orange-700" :
              "bg-blue-100 text-blue-700"
            )}>
              {daysUntil === 1 ? "Demain" : `Dans ${daysUntil} jours`}
            </div>
          </div>
        )}

        {/* Expand button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-text-light hover:text-foreground transition-colors"
        >
          {isExpanded ? (
            <>
              <span>Masquer les détails</span>
              <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              <span>Voir les détails</span>
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-slate-100 bg-slate-50/50 px-5 py-4"
        >
          <div className="space-y-3">
            {mission.location && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-text-light flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-text-light">Lieu</p>
                  <p className="font-medium text-foreground">{mission.location}</p>
                </div>
              </div>
            )}
            {mission.clientPhone && (
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-text-light flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-text-light">Téléphone</p>
                  <a href={`tel:${mission.clientPhone}`} className="font-medium text-primary hover:underline">
                    {mission.clientPhone}
                  </a>
                </div>
              </div>
            )}
            {mission.clientNotes && (
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-text-light flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-text-light">Notes du client</p>
                  <p className="font-medium text-foreground">{mission.clientNotes}</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Footer info */}
      <div className="bg-orange-50 border-t border-orange-100 px-5 py-3">
        <p className="text-sm text-orange-700 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          En attente de confirmation et paiement du client
        </p>
      </div>
    </motion.div>
  );
}

export default function MissionsConfirmationPage() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const missions = useQuery(
    api.planning.missions.getMissionsByStatus,
    token ? { token, status: "pending_confirmation" } : "skip"
  );

  const isLoading = missions === undefined;
  const totalAmount = missions?.reduce((sum: number, m: { amount: number }) => sum + m.amount, 0) || 0;

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-text-light">Chargement des missions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-orange-100 rounded-2xl">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              En attente de confirmation
            </h1>
            <p className="text-text-light">
              {missions?.length || 0} mission{(missions?.length || 0) > 1 ? "s" : ""} en attente de confirmation client
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      {missions && missions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-4"
        >
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-xl">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-text-light">En attente</p>
                <p className="text-2xl font-bold text-foreground">{missions.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Euro className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-text-light">Montant potentiel</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Info banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3"
      >
        <span className="text-2xl">&#8987;</span>
        <div>
          <p className="font-semibold text-orange-800">En attente du client</p>
          <p className="text-sm text-orange-700">
            Vous avez accepté ces missions. Le propriétaire doit maintenant confirmer la réservation en effectuant le paiement.
          </p>
        </div>
      </motion.div>

      {/* Mission List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        {!missions || missions.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-md text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.3 }}
              className="text-6xl mb-4"
            >
              &#9989;
            </motion.div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Aucune mission en attente
            </h3>
            <p className="text-text-light mb-6">
              Toutes vos propositions ont été traitées par les clients.
            </p>
            <Link
              href="/dashboard/missions/accepter"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors"
            >
              Voir les demandes à accepter
            </Link>
          </div>
        ) : (
          missions.map((mission: Mission, index: number) => (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
            >
              <MissionConfirmationCard mission={mission as Mission} />
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}
