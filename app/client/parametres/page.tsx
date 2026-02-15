"use client";

import { useState } from "react";
import { User, Lock, Bell, FileCheck, CreditCard } from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";
import { cn } from "@/app/lib/utils";
import { ProfilTab } from "./components/ProfilTab";
import { SecuriteTab } from "./components/SecuriteTab";
import { NotificationsTab } from "./components/NotificationsTab";
import { SapTab } from "./components/SapTab";
import { PaiementTab } from "./components/PaiementTab";

type TabType = "profil" | "securite" | "notifications" | "sap" | "paiement";

export default function ParametresPage() {
  const { user } = useAuth();
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  const [activeTab, setActiveTab] = useState<TabType>("profil");

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "profil", label: "Profil", icon: <User className="w-5 h-5" /> },
    { id: "securite", label: "Sécurité", icon: <Lock className="w-5 h-5" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="w-5 h-5" /> },
    { id: "sap", label: "Éligibilité SAP", icon: <FileCheck className="w-5 h-5" /> },
    { id: "paiement", label: "Paiement", icon: <CreditCard className="w-5 h-5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-gray-500 mt-1">Gérez votre compte et vos préférences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "bg-white text-foreground shadow-sm"
                : "text-gray-500 hover:text-foreground"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {activeTab === "profil" && <ProfilTab user={user} token={token} />}
        {activeTab === "securite" && <SecuriteTab token={token} />}
        {activeTab === "notifications" && <NotificationsTab />}
        {activeTab === "sap" && <SapTab token={token} />}
        {activeTab === "paiement" && <PaiementTab token={token} />}
      </div>
    </div>
  );
}
