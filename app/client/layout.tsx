"use client";

import { ReactNode } from "react";
import FloatingSidebar from "./components/floating-sidebar";
import { AuthGuard } from "@/app/components/auth-guard";
import { Navbar } from "@/app/components/navbar";
import { SidebarProvider, useSidebar } from "@/app/contexts/SidebarContext";
import { cn } from "@/app/lib/utils";

function ClientContent({ children }: { children: ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Navbar />
      <FloatingSidebar />
      <main className={cn(
        "pt-8 pb-8 md:pl-24 transition-all duration-300",
        isCollapsed ? "lg:pl-24" : "lg:pl-72"
      )}>
        <div className="px-4 lg:px-8 max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard allowedTypes={["utilisateur"]}>
      <SidebarProvider storageKey="client-sidebar-collapsed">
        <ClientContent>{children}</ClientContent>
      </SidebarProvider>
    </AuthGuard>
  );
}
