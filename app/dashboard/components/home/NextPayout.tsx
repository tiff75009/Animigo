"use client";

import Link from "next/link";
import { Wallet, Calendar, ArrowRight } from "lucide-react";

interface NextPayoutProps {
  data: {
    amount: number;
    missionsCount: number;
    scheduledDate: number;
  } | null;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

export function NextPayout({ data }: NextPayoutProps) {
  if (!data) return null;

  const date = new Date(data.scheduledDate);
  const dateStr = date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });

  return (
    <Link href="/dashboard/paiements">
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 hover:shadow-md transition-all cursor-pointer group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-700">Prochain virement</p>
              <p className="text-2xl font-bold text-green-800">{formatCurrency(data.amount)}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-sm text-green-600 mb-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{dateStr}</span>
            </div>
            <p className="text-xs text-green-600">
              {data.missionsCount} mission{data.missionsCount > 1 ? "s" : ""}
            </p>
            <ArrowRight className="w-4 h-4 text-green-400 ml-auto mt-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}
