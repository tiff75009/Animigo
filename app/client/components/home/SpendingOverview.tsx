"use client";

import Link from "next/link";
import { ArrowRight, Euro, TrendingUp, FileText } from "lucide-react";

interface SpendingOverviewProps {
  totalSpent: number;
  monthSpent: number;
  invoicesCount: number;
}

function formatCurrency(amountCents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(amountCents / 100);
}

export function SpendingOverview({ totalSpent, monthSpent, invoicesCount }: SpendingOverviewProps) {
  const stats = [
    {
      label: "Ce mois-ci",
      value: formatCurrency(monthSpent),
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      label: "Total dépensé",
      value: formatCurrency(totalSpent),
      icon: Euro,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    {
      label: "Factures",
      value: String(invoicesCount),
      icon: FileText,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Dépenses
        </h3>
        <Link
          href="/client/factures"
          className="text-primary text-sm font-medium flex items-center gap-1 hover:underline"
        >
          Factures
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
