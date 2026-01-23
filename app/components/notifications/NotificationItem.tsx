"use client";

import {
  Bell,
  Calendar,
  CreditCard,
  Star,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Wallet,
  User,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

// Mapping type → icône et couleur
const typeConfig: Record<string, { icon: React.ElementType; color: string }> = {
  new_mission: { icon: Calendar, color: "bg-blue-100 text-blue-600" },
  mission_accepted: { icon: CheckCircle, color: "bg-green-100 text-green-600" },
  mission_refused: { icon: XCircle, color: "bg-red-100 text-red-600" },
  mission_confirmed: {
    icon: CheckCircle,
    color: "bg-purple-100 text-purple-600",
  },
  mission_started: { icon: Clock, color: "bg-amber-100 text-amber-600" },
  mission_completed: {
    icon: CheckCircle,
    color: "bg-green-100 text-green-600",
  },
  mission_cancelled: { icon: XCircle, color: "bg-slate-100 text-slate-600" },
  payment_authorized: {
    icon: CreditCard,
    color: "bg-blue-100 text-blue-600",
  },
  payment_captured: { icon: Wallet, color: "bg-green-100 text-green-600" },
  payout_sent: { icon: Wallet, color: "bg-emerald-100 text-emerald-600" },
  review_received: { icon: Star, color: "bg-yellow-100 text-yellow-600" },
  new_message: { icon: MessageSquare, color: "bg-blue-100 text-blue-600" },
  welcome: { icon: User, color: "bg-purple-100 text-purple-600" },
  reminder: { icon: Bell, color: "bg-orange-100 text-orange-600" },
  system: { icon: Bell, color: "bg-slate-100 text-slate-600" },
};

interface NotificationItemProps {
  notification: {
    _id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: number;
    linkUrl?: string;
  };
  onClick: () => void;
}

export function NotificationItem({
  notification,
  onClick,
}: NotificationItemProps) {
  const config = typeConfig[notification.type] || typeConfig.system;
  const Icon = config.icon;

  const timeAgo = formatDistanceToNow(notification.createdAt, {
    addSuffix: true,
    locale: fr,
  });

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 ${
        !notification.isRead ? "bg-primary/5" : ""
      }`}
    >
      <div className="flex gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.color}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={`font-medium text-sm ${!notification.isRead ? "text-slate-900" : "text-slate-700"}`}
            >
              {notification.title}
            </p>
            {!notification.isRead && (
              <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
            )}
          </div>
          <p className="text-sm text-slate-500 line-clamp-2 mt-0.5">
            {notification.message}
          </p>
          <p className="text-xs text-slate-400 mt-1">{timeAgo}</p>
        </div>
      </div>
    </button>
  );
}
