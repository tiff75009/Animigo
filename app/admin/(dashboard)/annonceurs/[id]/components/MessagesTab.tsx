"use client";

import { MessageSquare } from "lucide-react";

export function MessagesTab() {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-12 text-center">
      <div className="max-w-md mx-auto">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <MessageSquare className="w-8 h-8 text-slate-500" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Messagerie à venir
        </h3>
        <p className="text-slate-400">
          L'historique des conversations entre l'annonceur et ses clients sera
          disponible dans une prochaine mise à jour.
        </p>
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-300">
            Cette fonctionnalité permettra de consulter les échanges pour la
            modération et le support client.
          </p>
        </div>
      </div>
    </div>
  );
}
