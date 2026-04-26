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
      <div
        className="p-5 transition-all cursor-pointer group hover:shadow-[0_10px_30px_rgba(30,30,28,0.06)]"
        style={{ borderRadius: 14, background: "#f5f9f6", border: "1px solid #cfdbd3" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "#fff", border: "1px solid #cfdbd3" }}
            >
              <Wallet className="w-5 h-5" style={{ color: "#1f3a33" }} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#9c9484" }}>
                Prochain virement
              </div>
              <p className="text-[22px] font-semibold text-[#1f3a33] tracking-[-0.02em] m-0">
                {formatCurrency(data.amount)}
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="inline-flex items-center gap-1 text-[12px] mb-1" style={{ color: "#2f4a3f" }}>
              <Calendar className="w-3 h-3" />
              <span className="font-semibold">{dateStr}</span>
            </div>
            <p className="text-[11px]" style={{ color: "#6d6d68" }}>
              {data.missionsCount} mission{data.missionsCount > 1 ? "s" : ""}
            </p>
            <ArrowRight
              className="w-4 h-4 ml-auto mt-1 group-hover:translate-x-1 transition-transform"
              style={{ color: "#1f3a33" }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
