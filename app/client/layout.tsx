"use client";

import { ReactNode } from "react";
import ClientSidebar from "./components/sidebar";
import { AuthGuard } from "@/app/components/auth-guard";
import { DashboardHeader } from "@/app/components/platform";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard allowedTypes={["utilisateur"]}>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Header mobile */}
        <DashboardHeader />

        {/* Sidebar desktop */}
        <ClientSidebar />

        <main className="flex-1 pt-16 overflow-y-auto">
          <div className="p-4 lg:p-8 max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
