"use client";

import { ReactNode } from "react";
import FloatingSidebar from "./components/floating-sidebar";
import { AuthGuard } from "@/app/components/auth-guard";
import { Navbar } from "@/app/components/navbar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard allowedTypes={["annonceur_pro", "annonceur_particulier"]}>
      <div className="min-h-screen bg-slate-50/50">
        {/* Navbar standard */}
        <Navbar />

        {/* Sidebar flottante */}
        <FloatingSidebar />

        {/* Main content avec marge pour la sidebar */}
        <main className="pt-8 pb-8 md:pl-24 lg:pl-80 transition-all duration-300">
          <div className="px-4 lg:px-8 max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
