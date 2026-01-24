"use client";

import { Id } from "@/convex/_generated/dataModel";
import {
  Briefcase,
  Package,
  Settings,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
} from "lucide-react";

interface Service {
  _id: Id<"services">;
  category: string;
  categoryName: string;
  animalTypes: string[];
  isActive: boolean;
  basePrice?: number;
  moderationStatus?: string;
  variantsCount: number;
  optionsCount: number;
  stats: {
    totalSales: number;
    revenue: number;
  };
}

interface ServicesTabProps {
  announcerId: Id<"users">;
  services: Service[];
}

const formatMoney = (cents: number) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
};

export function ServicesTab({ announcerId, services }: ServicesTabProps) {
  if (services.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-12 text-center">
        <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Aucun service</h3>
        <p className="text-slate-400">
          Cet annonceur n'a pas encore créé de services
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {services.map((service) => (
        <div
          key={service._id}
          className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden"
        >
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-800 rounded-lg">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-white">{service.categoryName}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  {service.animalTypes.map((animal) => (
                    <span
                      key={animal}
                      className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-300 capitalize"
                    >
                      {animal}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Status */}
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                  service.isActive
                    ? "bg-green-500/20 text-green-400"
                    : "bg-slate-500/20 text-slate-400"
                }`}
              >
                {service.isActive ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Actif
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    Inactif
                  </>
                )}
              </div>

              {/* Moderation Status */}
              {service.moderationStatus && (
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                    service.moderationStatus === "approved"
                      ? "bg-green-500/20 text-green-400"
                      : service.moderationStatus === "pending"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {service.moderationStatus === "approved" ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approuvé
                    </>
                  ) : service.moderationStatus === "pending" ? (
                    <>
                      <Clock className="w-3.5 h-3.5" />
                      En attente
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" />
                      Rejeté
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Prix de base */}
              <div className="p-3 bg-slate-800 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Prix de base</p>
                <p className="text-lg font-semibold text-white">
                  {service.basePrice ? formatMoney(service.basePrice) : "-"}
                </p>
              </div>

              {/* Formules */}
              <div className="p-3 bg-slate-800 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Formules</p>
                <p className="text-lg font-semibold text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-400" />
                  {service.variantsCount}
                </p>
              </div>

              {/* Options */}
              <div className="p-3 bg-slate-800 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Options</p>
                <p className="text-lg font-semibold text-white flex items-center gap-2">
                  <Settings className="w-4 h-4 text-slate-400" />
                  {service.optionsCount}
                </p>
              </div>

              {/* Ventes */}
              <div className="p-3 bg-slate-800 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Ventes totales</p>
                <p className="text-lg font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                  {service.stats.totalSales}
                </p>
              </div>
            </div>

            {/* Revenue */}
            {service.stats.revenue > 0 && (
              <div className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-lg flex items-center justify-between">
                <span className="text-primary font-medium">
                  Revenus générés par ce service
                </span>
                <span className="text-xl font-bold text-primary">
                  {formatMoney(service.stats.revenue)}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Total */}
      <div className="bg-slate-900 rounded-xl border border-primary/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400">Total tous services</p>
            <p className="text-sm text-slate-500">
              {services.reduce((sum, s) => sum + s.stats.totalSales, 0)} ventes
            </p>
          </div>
          <p className="text-2xl font-bold text-primary">
            {formatMoney(
              services.reduce((sum, s) => sum + s.stats.revenue, 0)
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
