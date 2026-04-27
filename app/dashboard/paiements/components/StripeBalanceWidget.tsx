"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Wallet, RefreshCw, Loader2 } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatPrice } from "../types";

interface StripeBalanceWidgetProps {
  token: string | null;
}

export function StripeBalanceWidget({ token }: StripeBalanceWidgetProps) {
  const [balance, setBalance] = useState<{
    available: number;
    pending: number;
    currency: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number | null>(null);

  const getBalance = useAction(api.api.stripeConnect.getMyStripeBalance);

  const fetchBalance = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getBalance({ sessionToken: token });
      setBalance(result);
      setLastFetch(Date.now());
    } catch {
      setError("Impossible de récupérer le solde Stripe.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!balance && !loading && !error) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-emerald-600" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Solde Stripe Connect
          </h3>
        </div>
        <button
          type="button"
          onClick={fetchBalance}
          disabled={loading}
          className="text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
          title="Actualiser"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {balance && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">Disponible</p>
            <p className="text-lg font-bold text-emerald-700">{formatPrice(balance.available / 100)}</p>
            <p className="text-[10px] text-gray-400">virable maintenant</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">En attente</p>
            <p className="text-lg font-bold text-amber-600">{formatPrice(balance.pending / 100)}</p>
            <p className="text-[10px] text-gray-400">dispo sous 2-7j</p>
          </div>
        </div>
      )}

      {lastFetch && (
        <p className="mt-2 text-[10px] text-gray-400">
          Mis à jour à {new Date(lastFetch).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </motion.div>
  );
}
