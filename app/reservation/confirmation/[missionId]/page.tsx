"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/app/hooks/useAuth";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Calendar,
  MessageCircle,
  ChevronRight,
  Home,
  Loader2,
  ShieldCheck,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/app/components/navbar";

const formatDateLong = (dateStr: string): string => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatPrice = (cents: number) => (cents / 100).toFixed(2);

type StepState = "done" | "current" | "upcoming";

interface TimelineStep {
  title: string;
  description: string;
  icon: typeof Clock;
  state: StepState;
  highlight?: string;
}

export default function ReservationConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const { token, isLoading: isAuthLoading } = useAuth();

  const missionId = params.missionId as Id<"missions">;

  const mission = useQuery(
    api.planning.missions.getClientMissionById,
    token ? { token, missionId } : "skip"
  );

  // Loading
  if (isAuthLoading || mission === undefined) {
    return (
      <>
        <Navbar />
        <main
          className="min-h-screen flex items-center justify-center"
          style={{ background: "#fcfaf4" }}
        >
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1f3a33" }} />
        </main>
      </>
    );
  }

  // Mission introuvable / non autorisée
  if (mission === null) {
    return (
      <>
        <Navbar />
        <main
          className="min-h-screen flex items-center justify-center px-4"
          style={{ background: "#fcfaf4" }}
        >
          <div
            className="max-w-md w-full text-center p-8 rounded-2xl"
            style={{ background: "#fff", border: "1px solid #ece9e1" }}
          >
            <h1 className="text-xl font-semibold mb-2" style={{ color: "#1f1f1d" }}>
              Réservation introuvable
            </h1>
            <p className="text-sm mb-6" style={{ color: "#6d6d68" }}>
              Cette réservation n&apos;existe pas ou ne vous appartient pas.
            </p>
            <button
              onClick={() => router.push("/dashboard?tab=missions")}
              className="px-5 py-2.5 rounded-full text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: "#1f3a33", color: "#f7f5ef" }}
            >
              Voir mes réservations
            </button>
          </div>
        </main>
      </>
    );
  }

  // Étapes du processus selon le statut de la mission
  const status = mission.status;
  const timeline: TimelineStep[] = [
    {
      title: "Demande envoyée",
      description: `Votre demande a été transmise à ${mission.announcerName ?? "l'annonceur"}.`,
      icon: CheckCircle2,
      state: "done",
    },
    {
      title: "Acceptation par l'annonceur",
      description:
        status === "pending_acceptance"
          ? "L'annonceur a un délai pour confirmer votre réservation. Vous recevrez un email dès qu'il aura répondu."
          : status === "refused"
            ? "L'annonceur a refusé cette réservation."
            : "L'annonceur a confirmé votre réservation.",
      icon: ShieldCheck,
      state:
        status === "pending_acceptance"
          ? "current"
          : status === "refused"
            ? "current"
            : "done",
      highlight: mission.acceptanceDeadline
        ? `Réponse attendue avant le ${new Date(mission.acceptanceDeadline).toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}`
        : undefined,
    },
    {
      title: "Paiement",
      description:
        status === "pending_acceptance"
          ? "Le paiement sera demandé une fois l'annonceur l'aura accepté votre demande."
          : status === "pending_confirmation" || status === "pending_payment"
            ? "Procédez au paiement pour finaliser votre réservation."
            : status === "refused"
              ? "Aucun paiement n'a été effectué."
              : "Paiement effectué avec succès.",
      icon: CreditCard,
      state:
        status === "pending_acceptance" || status === "refused"
          ? "upcoming"
          : status === "pending_confirmation" || status === "pending_payment"
            ? "current"
            : "done",
    },
    {
      title: "Prestation confirmée",
      description:
        status === "upcoming" ||
        status === "in_progress" ||
        status === "completed"
          ? "Votre réservation est confirmée. Vous pouvez échanger avec l'annonceur."
          : "Votre réservation sera confirmée après le paiement.",
      icon: Calendar,
      state:
        status === "upcoming" || status === "in_progress"
          ? "current"
          : status === "completed"
            ? "done"
            : "upcoming",
    },
  ];

  return (
    <>
      <Navbar />
      <main className="min-h-screen pb-20" style={{ background: "#fcfaf4" }}>
        {/* ─── Hero succès ─── */}
        <section
          className="pt-12 pb-16 px-4"
          style={{
            background: "linear-gradient(180deg, #f5f9f6 0%, #fcfaf4 100%)",
          }}
        >
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
              style={{ background: "#10b981", boxShadow: "0 8px 24px rgba(16,185,129,0.25)" }}
            >
              <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={2.5} />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-3xl sm:text-4xl font-bold mb-3 tracking-[-0.015em]"
              style={{ color: "#1f1f1d" }}
            >
              Demande envoyée !
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-base sm:text-lg max-w-xl mx-auto"
              style={{ color: "#3a3a38" }}
            >
              Votre demande de réservation a bien été transmise à{" "}
              <strong>{mission.announcerName ?? "l'annonceur"}</strong>.
              Vous recevrez un email dès qu&apos;il aura confirmé votre réservation.
            </motion.p>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-4 -mt-8 space-y-6">
          {/* ─── Récap mission ─── */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-2xl"
            style={{ background: "#fff", border: "1px solid #ece9e1", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}
          >
            <div
              className="text-[10px] font-medium uppercase tracking-[0.1em] mb-2"
              style={{ color: "#9c9484" }}
            >
              Votre réservation
            </div>
            <h2 className="text-xl font-semibold mb-4" style={{ color: "#1f1f1d" }}>
              {mission.serviceName ?? mission.serviceCategory ?? "Prestation"}
            </h2>

            <div className="space-y-3">
              <RecapRow
                icon={<Calendar className="w-4 h-4" style={{ color: "#1f3a33" }} />}
                label="Date"
                value={
                  mission.startDate === mission.endDate
                    ? formatDateLong(mission.startDate)
                    : `Du ${formatDateLong(mission.startDate)} au ${formatDateLong(mission.endDate)}`
                }
              />
              {mission.startTime && (
                <RecapRow
                  icon={<Clock className="w-4 h-4" style={{ color: "#1f3a33" }} />}
                  label="Horaires"
                  value={`${mission.startTime}${mission.endTime ? ` – ${mission.endTime}` : ""}`}
                />
              )}
              <RecapRow
                icon={<CreditCard className="w-4 h-4" style={{ color: "#1f3a33" }} />}
                label="Montant total"
                value={`${formatPrice(mission.amount ?? 0)} €`}
                highlight
              />
            </div>
          </motion.section>

          {/* ─── Timeline du processus ─── */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-2xl"
            style={{ background: "#fff", border: "1px solid #ece9e1" }}
          >
            <div
              className="text-[10px] font-medium uppercase tracking-[0.1em] mb-4"
              style={{ color: "#9c9484" }}
            >
              Prochaines étapes
            </div>

            <div className="space-y-0">
              {timeline.map((step, index) => (
                <TimelineItem
                  key={index}
                  step={step}
                  isLast={index === timeline.length - 1}
                />
              ))}
            </div>
          </motion.section>

          {/* ─── Info importante ─── */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-5 rounded-2xl flex items-start gap-3"
            style={{ background: "#fcfaf4", border: "1px solid #f1ede3" }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "#fff", border: "1px solid #f1ede3" }}
            >
              <Mail className="w-4 h-4" style={{ color: "#1f3a33" }} />
            </div>
            <div className="text-[13px] leading-[1.5]" style={{ color: "#3a3a38" }}>
              <p className="font-semibold mb-1" style={{ color: "#1f1f1d" }}>
                Suivez votre demande par email
              </p>
              <p>
                Nous vous tiendrons informé(e) à chaque étape. Vous pouvez aussi
                suivre l&apos;avancement dans votre espace client.
              </p>
            </div>
          </motion.section>

          {/* ─── CTA ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-3 pt-2"
          >
            <Link
              href="/dashboard?tab=missions"
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "#1f3a33", color: "#f7f5ef" }}
            >
              Voir mes réservations
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href={`/messages?mission=${missionId}`}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-colors hover:bg-[#f5f9f6]"
              style={{ background: "#fff", border: "1px solid #cfdbd3", color: "#1f3a33" }}
            >
              <MessageCircle className="w-4 h-4" />
              Écrire à l&apos;annonceur
            </Link>
            <Link
              href="/"
              className="sm:flex-shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-colors hover:bg-[#fafafa]"
              style={{ background: "transparent", border: "1px solid #ece9e1", color: "#6d6d68" }}
            >
              <Home className="w-4 h-4" />
              Accueil
            </Link>
          </motion.div>
        </div>
      </main>
    </>
  );
}

function RecapRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2.5 text-[13px]" style={{ color: "#6d6d68" }}>
        {icon}
        <span>{label}</span>
      </div>
      <span
        className="text-[14px] text-right"
        style={{
          color: highlight ? "#1f3a33" : "#1f1f1d",
          fontWeight: highlight ? 700 : 600,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function TimelineItem({ step, isLast }: { step: TimelineStep; isLast: boolean }) {
  const Icon = step.icon;
  const colors = {
    done: { bg: "#10b981", text: "#fff", border: "#10b981" },
    current: { bg: "#1f3a33", text: "#fff", border: "#1f3a33" },
    upcoming: { bg: "#fff", text: "#cdc9c0", border: "#ece9e1" },
  }[step.state];

  return (
    <div className="flex gap-4 relative">
      {/* Bulle + ligne */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center z-10"
          style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
        >
          <Icon className="w-4 h-4" style={{ color: colors.text }} strokeWidth={2.5} />
        </div>
        {!isLast && (
          <div
            className="w-px flex-1 my-1"
            style={{
              minHeight: 28,
              background:
                step.state === "done"
                  ? "linear-gradient(180deg, #10b981 0%, #ece9e1 100%)"
                  : "#ece9e1",
            }}
          />
        )}
      </div>

      {/* Contenu */}
      <div className={`flex-1 pb-${isLast ? "0" : "5"}`}>
        <p
          className="text-[14px] font-semibold tracking-[-0.005em]"
          style={{
            color: step.state === "upcoming" ? "#9c9484" : "#1f1f1d",
          }}
        >
          {step.title}
        </p>
        <p
          className="text-[12.5px] leading-[1.5] mt-0.5"
          style={{ color: step.state === "upcoming" ? "#cdc9c0" : "#6d6d68" }}
        >
          {step.description}
        </p>
        {step.highlight && (
          <div
            className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
            style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}
          >
            <Clock className="w-3 h-3" />
            {step.highlight}
          </div>
        )}
      </div>
    </div>
  );
}
