"use client";

import Link from "next/link";
import { ShieldCheck, ShieldAlert, Clock } from "lucide-react";

interface VerificationBadgeProps {
  data: {
    isVerified: boolean;
    isPending: boolean;
  } | null;
  isLoading: boolean;
}

export function VerificationBadge({ data, isLoading }: VerificationBadgeProps) {
  if (isLoading || !data) return null;

  if (data.isVerified) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-xl text-sm">
        <ShieldCheck className="w-4 h-4 text-green-600" />
        <span className="font-medium text-green-700">Identité vérifiée</span>
      </div>
    );
  }

  if (data.isPending) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl text-sm">
        <Clock className="w-4 h-4 text-blue-600" />
        <span className="font-medium text-blue-700">Vérification en cours</span>
      </div>
    );
  }

  return (
    <Link href="/dashboard/verification">
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl text-sm hover:bg-amber-100 transition-colors cursor-pointer">
        <ShieldAlert className="w-4 h-4 text-amber-600" />
        <span className="font-medium text-amber-700">Vérifier mon identité</span>
      </div>
    </Link>
  );
}
