"use client";

import type { BillingType } from "../../types";
import { BILLING_TYPES } from "../../types";

interface BillingTypeSelectorProps {
  value: BillingType;
  onChange: (value: BillingType) => void;
}

export default function BillingTypeSelector({
  value,
  onChange,
}: BillingTypeSelectorProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-300 mb-3">
        Type de facturation
      </label>

      <div className="grid grid-cols-3 gap-3">
        {BILLING_TYPES.map((type) => (
          <label
            key={type.value}
            className={`flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all ${
              value === type.value
                ? "border-blue-500 bg-blue-500/10"
                : "border-slate-700 bg-slate-900 hover:border-slate-600"
            }`}
          >
            <input
              type="radio"
              name="billingType"
              value={type.value}
              checked={value === type.value}
              onChange={(e) => onChange(e.target.value as BillingType)}
              className="sr-only"
            />
            <span className="text-2xl">{type.emoji}</span>
            <span className="font-medium text-white">{type.label}</span>
            <span className="text-xs text-slate-400 text-center">
              {type.description}
            </span>
          </label>
        ))}
      </div>

      <p className="text-xs text-slate-500 mt-2">
        Pour les catégories &quot;Flexible&quot;, l&apos;annonceur définit
        s&apos;il facture à l&apos;heure ou à la journée.
      </p>
    </div>
  );
}
