"use client";

import Link from "next/link";
import { ArrowRight, Bell, Calendar, MessageSquare, CreditCard, CheckCircle, AlertCircle } from "lucide-react";

interface Notification {
  _id: string;
  type: string;
  title: string;
  body?: string;
  isRead: boolean;
  createdAt: number;
}

interface RecentNotificationsProps {
  notifications: Notification[];
  isLoading: boolean;
}

function getNotifIcon(type: string) {
  switch (type) {
    case "mission_accepted":
    case "mission_completed":
      return { icon: CheckCircle, bg: "bg-green-100", color: "text-green-600" };
    case "mission_cancelled":
    case "mission_refused":
      return { icon: AlertCircle, bg: "bg-red-100", color: "text-red-600" };
    case "new_message":
      return { icon: MessageSquare, bg: "bg-blue-100", color: "text-blue-600" };
    case "payment_success":
    case "payment_reminder":
      return { icon: CreditCard, bg: "bg-amber-100", color: "text-amber-600" };
    case "booking_reminder":
      return { icon: Calendar, bg: "bg-purple-100", color: "text-purple-600" };
    default:
      return { icon: Bell, bg: "bg-gray-100", color: "text-gray-600" };
  }
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `${minutes} min`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}j`;
  return new Date(timestamp).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function RecentNotifications({ notifications, isLoading }: RecentNotificationsProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
        <div className="h-5 w-36 rounded bg-gray-200 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 rounded bg-gray-200" />
                <div className="h-3 w-16 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const recent = notifications.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Notifications
        </h3>
        <Link
          href="/client/notifications"
          className="text-primary text-sm font-medium flex items-center gap-1 hover:underline"
        >
          Toutes
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucune notification</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recent.map((notif) => {
            const { icon: Icon, bg, color } = getNotifIcon(notif.type);
            return (
              <div
                key={notif._id}
                className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                  !notif.isRead ? "bg-primary/5" : "hover:bg-gray-50"
                }`}
              >
                <div className={`w-8 h-8 ${bg} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${!notif.isRead ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                    {notif.title}
                  </p>
                  {notif.body && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{notif.body}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {formatRelativeTime(notif.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
