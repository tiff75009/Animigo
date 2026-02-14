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
      <div className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
        <div className="h-5 w-36 rounded bg-gray-200 mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 w-28 rounded bg-gray-200" />
                <div className="h-4 w-16 rounded bg-gray-200" />
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const services = data?.topServices ?? [];
  const maxCount = services.length > 0 ? services[0].missionCount : 1;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Services populaires
        </h3>
        {data && data.overallAverageBasket > 0 && (
          <div className="flex items-center gap-1 text-sm text-text-light">
            <Euro className="w-3.5 h-3.5" />
            <span>Panier moyen : <span className="font-semibold text-foreground">{formatCurrency(data.overallAverageBasket)}</span></span>
          </div>
        )}
      </div>

      {services.length === 0 ? (
        <div className="text-center py-8 text-text-light">
          <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucune mission terminée</p>
          <p className="text-xs mt-1">Les statistiques apparaîtront après vos premières gardes</p>
        </div>
      ) : (
        <div className="space-y-4">
          {services.map((service) => {
            const pct = Math.round((service.missionCount / maxCount) * 100);
            return (
              <div key={`${service.category}::${service.name}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground truncate">
                    {service.name}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-text-light flex-shrink-0">
                    <span>{service.missionCount} mission{service.missionCount > 1 ? "s" : ""}</span>
                    <span className="font-medium text-foreground">{formatCurrency(service.averageEarnings)}/moy.</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
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
