"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { DisputeListPanel, type DisputeItem } from "@/app/components/disputes/DisputeListPanel";

export default function ClientReclamationsPage() {
  const { token, isLoading } = useAuth();

  const disputes = useQuery(
    api.planning.disputes.getMyClientDisputes,
    token ? { sessionToken: token } : "skip"
  );

  if (isLoading || disputes === undefined) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
          Mes réclamations
        </h1>
        <p className="text-sm text-gray-500">
          Suivez l&apos;avancement de toutes vos réclamations en un seul endroit.
        </p>
      </div>

      <DisputeListPanel
        disputes={disputes as DisputeItem[]}
        role="client"
        token={token!}
      />
    </div>
  );
}
