"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  MapPin,
  User,
  ExternalLink,
  MessageCircle,
  Home,
  Lock,
  Loader2,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

interface AnnouncerLocationGridProps {
  mission: any;
  isPaid: boolean;
  isContacting: boolean;
  onContact: () => void;
}

export function AnnouncerLocationGrid({
  mission,
  isPaid,
  isContacting,
  onContact,
}: AnnouncerLocationGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Annonceur */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
      >
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-primary" />
          Votre pet-sitter
        </h3>

        <div className="flex items-center gap-3">
          {mission.announcerPhotoUrl ? (
            <img
              src={mission.announcerPhotoUrl}
              alt={mission.announcerName}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">
              {mission.announcerName}
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Link
              href={`/annonceur/${mission.announcerSlug || mission.announcerId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              title="Voir le profil"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>

            {isPaid ? (
              <button
                onClick={onContact}
                disabled={isContacting}
                className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
                title="Contacter"
              >
                {isContacting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageCircle className="w-4 h-4" />
                )}
              </button>
            ) : (
              <div
                className="p-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed relative"
                title="Disponible après paiement"
              >
                <MessageCircle className="w-4 h-4" />
                <Lock className="w-2 h-2 absolute -bottom-0.5 -right-0.5 bg-gray-100 rounded-full" />
              </div>
            )}
          </div>
        </div>

        {!isPaid && (
          <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Messagerie après paiement
          </p>
        )}
      </motion.div>

      {/* Lieu */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
      >
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-primary" />
          Lieu de prestation
        </h3>

        {isPaid || mission.serviceLocation === "client_home" ? (
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
              mission.serviceLocation === "client_home"
                ? "bg-teal-100"
                : "bg-green-100"
            )}>
              {mission.serviceLocation === "client_home" ? (
                <Home className="w-5 h-5 text-teal-600" />
              ) : (
                <MapPin className="w-5 h-5 text-green-600" />
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">
                {mission.serviceLocation === "client_home"
                  ? "À votre domicile"
                  : "Chez le pet-sitter"}
              </p>
              <p className="text-foreground font-medium text-sm">
                {mission.location}
              </p>
              {(mission.postalCode || mission.city) && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {[mission.postalCode, mission.city].filter(Boolean).join(" ")}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-gray-600 text-sm">
                Chez <span className="font-medium">le pet-sitter</span>
              </p>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Adresse visible après paiement
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
