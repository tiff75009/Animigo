"use client";

import { ReactNode } from "react";
import ClientSidebar from "./components/sidebar";
import { AuthGuard } from "@/app/components/auth-guard";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard allowedTypes={["utilisateur"]}>
      <div className="min-h-screen bg-gray-50 flex">
        <ClientSidebar />
        <main className="flex-1 pt-16 lg:pt-0 overflow-y-auto">
          <div className="p-4 lg:p-8 max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
