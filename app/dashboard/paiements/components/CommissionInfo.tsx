"use client";

import type { UserInfo } from "../types";

interface CommissionInfoProps {
  userInfo: UserInfo;
}

export function CommissionInfo({ userInfo }: CommissionInfoProps) {
  return (
    <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
        Commission : {userInfo.commissionRate}% ({userInfo.commissionLabel})
      </span>
      <p className="text-xs text-gray-400 max-w-[220px] text-right sm:text-left">
        Payée par le client en sus de votre tarif
      </p>
    </div>
  );
}
