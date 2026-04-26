"use client";

import { BarChart3, Euro } from "lucide-react";

interface TopService {
  name: string;
  category: string;
  missionCount: number;
  totalEarnings: number;
  averageEarnings: number;
}

interface TopServicesProps {
  data: {
    topServices: TopService[];
    overallAverageBasket: number;
    totalCompleted: number;
  } | null | undefined;
  isLoading: boolean;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

export function TopServices({ data, isLoading }: TopServicesProps) {
  if (isLoading) {
    return (
      <div
        className="bg-white p-5 animate-pulse"
        style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
      >
        <div className="h-4 w-36 rounded bg-[#f1ede3] mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-3 w-28 rounded bg-[#f1ede3]" />
                <div className="h-3 w-16 rounded bg-[#f1ede3]" />
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#f1ede3]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const services = data?.topServices ?? [];
  const maxCount = services.length > 0 ? services[0].missionCount : 1;

  return (
    <div
      className="bg-white p-5"
      style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
    >
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-0.5">
            Statistiques
          </div>
          <h3 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
            Services populaires
          </h3>
        </div>
        {data && data.overallAverageBasket > 0 && (
          <div
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] flex-shrink-0"
            style={{ background: "#fcfaf4", border: "1px solid #f1ede3", color: "#3a3a38" }}
          >
            <Euro className="w-3 h-3" style={{ color: "#9c9484" }} />
            <span>Panier moyen :</span>
            <span className="font-semibold text-[#1f1f1d]">{formatCurrency(data.overallAverageBasket)}</span>
          </div>
        )}
      </div>

      {services.length === 0 ? (
        <div
          className="text-center py-8"
          style={{ borderRadius: 12, background: "#fcfaf4", border: "1px solid #f1ede3" }}
        >
          <BarChart3 className="w-9 h-9 mx-auto mb-2" style={{ color: "#cdc9c0" }} />
          <p className="text-[13px] text-[#6d6d68]">Aucune mission terminée</p>
          <p className="text-[11px] mt-1" style={{ color: "#9c9484" }}>
            Les statistiques apparaîtront après vos premières gardes
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((service) => {
            const pct = Math.round((service.missionCount / maxCount) * 100);
            return (
              <div key={`${service.category}::${service.name}`}>
                <div className="flex items-center justify-between mb-1.5 gap-3">
                  <span className="text-[13px] font-semibold text-[#1f1f1d] tracking-[-0.01em] truncate">
                    {service.name}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] flex-shrink-0">
                    <span style={{ color: "#9c9484" }}>
                      {service.missionCount} mission{service.missionCount > 1 ? "s" : ""}
                    </span>
                    <span className="font-semibold text-[#1f1f1d]">
                      {formatCurrency(service.averageEarnings)}/moy.
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#f1ede3" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: "#1f3a33" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
