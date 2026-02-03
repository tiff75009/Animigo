"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronLeft, Send, CheckCircle } from "lucide-react";
import { TicketForm } from "@/app/components/support";

export default function DashboardNouveauTicketPage() {
  const router = useRouter();
  const [success, setSuccess] = useState<{ ticketNumber: string } | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  const handleSuccess = (ticketId: string, ticketNumber: string) => {
    setSuccess({ ticketNumber });
    // Rediriger après 2 secondes
    setTimeout(() => {
      router.push(`/dashboard/tickets/${ticketId}`);
    }, 2000);
  };

  if (!token) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Veuillez vous connecter pour créer un ticket</p>
      </div>
    );
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Ticket créé avec succès !
        </h1>
        <p className="text-gray-500 mb-4">
          Numéro de ticket : <span className="font-mono font-semibold">{success.ticketNumber}</span>
        </p>
        <p className="text-sm text-gray-400">
          Redirection en cours...
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Retour */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <Link
          href="/dashboard/tickets"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-primary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour à mes tickets
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-sm"
      >
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Send className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Nouveau ticket
            </h1>
            <p className="text-gray-500">
              Décrivez votre problème et notre équipe vous répondra rapidement
            </p>
          </div>
        </div>
      </motion.div>

      {/* Formulaire */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-6 shadow-sm"
      >
        <TicketForm
          sessionToken={token}
          onSuccess={handleSuccess}
        />
      </motion.div>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700"
      >
        <p className="font-medium mb-1">Conseil</p>
        <p>
          Avant de créer un ticket, consultez notre{" "}
          <Link href="/dashboard/aide" className="underline hover:no-underline">
            centre d'aide
          </Link>{" "}
          pour trouver une réponse rapide à votre question.
        </p>
      </motion.div>
    </div>
  );
}
