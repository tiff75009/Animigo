"use client";

import { ReactNode } from "react";
import FloatingSidebar from "./components/floating-sidebar";
import { AuthGuard } from "@/app/components/auth-guard";
import { Navbar } from "@/app/components/navbar";
import { SidebarProvider, useSidebar } from "@/app/contexts/SidebarContext";
import { cn } from "@/app/lib/utils";

function DashboardContent({ children }: { children: ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Navbar />
      <FloatingSidebar />
      <main className={cn(
        "pt-8 pb-8 md:pl-24 transition-all duration-300",
        isCollapsed ? "lg:pl-24" : "lg:pl-80"
      )}>
        <div className="px-4 lg:px-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard allowedTypes={["annonceur_pro", "annonceur_particulier"]}>
      <SidebarProvider storageKey="dashboard-sidebar-collapsed">
        <DashboardContent>{children}</DashboardContent>
      </SidebarProvider>
    </AuthGuard>
  );
}
