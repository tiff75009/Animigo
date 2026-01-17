"use client";

import { Sidebar } from "./components/sidebar";
import { AuthGuard } from "@/app/components/auth-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedTypes={["annonceur_pro", "annonceur_particulier"]}>
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <main className="flex-1 lg:pl-0 pt-16 lg:pt-0">
          <div className="p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
