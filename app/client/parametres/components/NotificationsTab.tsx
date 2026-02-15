"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Bell } from "lucide-react";
import { cn } from "@/app/lib/utils";

function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        "relative w-11 h-6 rounded-full transition-colors",
        enabled ? "bg-primary" : "bg-gray-200"
      )}
    >
      <motion.div
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
        animate={{ left: enabled ? 24 : 4 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

export function NotificationsTab() {
  const [notifications, setNotifications] = useState({
    email: {
      reservations: true,
      messages: true,
      promotions: false,
    },
    push: {
      reservations: true,
      messages: true,
      promotions: false,
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Préférences de notifications</h2>
        <p className="text-sm text-gray-500">Choisissez comment vous souhaitez être informé</p>
      </div>

      {/* Email */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-gray-400" />
          <h3 className="font-medium text-foreground">Email</h3>
        </div>

        <div className="pl-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Réservations</p>
              <p className="text-sm text-gray-500">Confirmations, rappels, modifications</p>
            </div>
            <ToggleSwitch
              enabled={notifications.email.reservations}
              onChange={() => setNotifications({
                ...notifications,
                email: { ...notifications.email, reservations: !notifications.email.reservations }
              })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Messages</p>
              <p className="text-sm text-gray-500">Nouveaux messages des pet-sitters</p>
            </div>
            <ToggleSwitch
              enabled={notifications.email.messages}
              onChange={() => setNotifications({
                ...notifications,
                email: { ...notifications.email, messages: !notifications.email.messages }
              })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Promotions</p>
              <p className="text-sm text-gray-500">Offres spéciales et actualités</p>
            </div>
            <ToggleSwitch
              enabled={notifications.email.promotions}
              onChange={() => setNotifications({
                ...notifications,
                email: { ...notifications.email, promotions: !notifications.email.promotions }
              })}
            />
          </div>
        </div>
      </div>

      {/* Push */}
      <div className="space-y-4 pt-6 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-gray-400" />
          <h3 className="font-medium text-foreground">Notifications push</h3>
        </div>

        <div className="pl-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Réservations</p>
              <p className="text-sm text-gray-500">Alertes en temps réel</p>
            </div>
            <ToggleSwitch
              enabled={notifications.push.reservations}
              onChange={() => setNotifications({
                ...notifications,
                push: { ...notifications.push, reservations: !notifications.push.reservations }
              })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Messages</p>
              <p className="text-sm text-gray-500">Notification immédiate des nouveaux messages</p>
            </div>
            <ToggleSwitch
              enabled={notifications.push.messages}
              onChange={() => setNotifications({
                ...notifications,
                push: { ...notifications.push, messages: !notifications.push.messages }
              })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
