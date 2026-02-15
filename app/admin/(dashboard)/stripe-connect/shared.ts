import {
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
} from "lucide-react";

/* ═══ Utilitaires ═══ */

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
}

export function formatDate(timestamp: number | string | null | undefined): string {
  if (!timestamp) return "—";
  const date = typeof timestamp === "string" ? new Date(timestamp) : new Date(timestamp);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ═══ Configs statut ═══ */

export const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  verified: {
    label: "Vérifié",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10 border-emerald-500/20",
    icon: CheckCircle,
  },
  pending: {
    label: "En attente",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/20",
    icon: Clock,
  },
  restricted: {
    label: "Restreint",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10 border-orange-500/20",
    icon: AlertTriangle,
  },
  disabled: {
    label: "Désactivé",
    color: "text-red-400",
    bgColor: "bg-red-500/10 border-red-500/20",
    icon: XCircle,
  },
};

export const payoutStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "text-amber-400" },
  processing: { label: "En cours", color: "text-blue-400" },
  completed: { label: "Complété", color: "text-emerald-400" },
  failed: { label: "Échoué", color: "text-red-400" },
};

export const missionPaymentConfig: Record<string, { label: string; color: string }> = {
  not_due: { label: "Non dû", color: "text-slate-400" },
  pending: { label: "En attente", color: "text-amber-400" },
  paid: { label: "Versé", color: "text-emerald-400" },
};
