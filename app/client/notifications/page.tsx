"use client";

import { motion } from "framer-motion";
import {
  Bell,
  CheckCheck,
  Trash2,
  Calendar,
  CreditCard,
  Star,
  MessageCircle,
  Clock,
  Wallet,
  User,
  X,
  Loader2,
} from "lucide-react";
import { useNotifications } from "@/app/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/app/lib/utils";
import { useRouter } from "next/navigation";
import { Doc } from "@/convex/_generated/dataModel";

type Notification = Doc<"notifications">;

// Mapping type → icône et couleur
const notificationConfig: Record<
  string,
  { icon: React.ElementType; bgColor: string; iconColor: string }
> = {
  new_mission: {
    icon: Calendar,
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  mission_accepted: {
    icon: CheckCheck,
    bgColor: "bg-green-100",
    iconColor: "text-green-600",
  },
  mission_refused: {
    icon: X,
    bgColor: "bg-red-100",
    iconColor: "text-red-600",
  },
  mission_confirmed: {
    icon: CheckCheck,
    bgColor: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  mission_started: {
    icon: Clock,
    bgColor: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  mission_completed: {
    icon: CheckCheck,
    bgColor: "bg-green-100",
    iconColor: "text-green-600",
  },
  mission_cancelled: {
    icon: X,
    bgColor: "bg-gray-100",
    iconColor: "text-gray-600",
  },
  payment_authorized: {
    icon: CreditCard,
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  payment_captured: {
    icon: Wallet,
    bgColor: "bg-green-100",
    iconColor: "text-green-600",
  },
  payout_sent: {
    icon: Wallet,
    bgColor: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  review_received: {
    icon: Star,
    bgColor: "bg-yellow-100",
    iconColor: "text-yellow-600",
  },
  new_message: {
    icon: MessageCircle,
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  welcome: {
    icon: User,
    bgColor: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  reminder: {
    icon: Bell,
    bgColor: "bg-orange-100",
    iconColor: "text-orange-600",
  },
  system: {
    icon: Bell,
    bgColor: "bg-gray-100",
    iconColor: "text-gray-600",
  },
};

export default function NotificationsPage() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications(100);

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead) {
      await markAsRead(notif._id);
    }
    if (notif.linkUrl) {
      router.push(notif.linkUrl);
    }
  };

  const handleDeleteAll = async () => {
    for (const notif of notifications) {
      await deleteNotification(notif._id);
    }
  };

  const getConfig = (type: string) => {
    return notificationConfig[type] || notificationConfig.system;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">
            {notifications.length === 0
              ? "Aucune notification"
              : `${notifications.length} notification${notifications.length > 1 ? "s" : ""}${unreadCount > 0 ? ` (${unreadCount} non lue${unreadCount > 1 ? "s" : ""})` : ""}`}
          </p>
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Tout marquer lu
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDeleteAll}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Tout supprimer
            </motion.button>
          </div>
        )}
      </div>

      {/* Liste des notifications */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Bell className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-lg font-medium text-gray-500">
              Aucune notification
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Vous recevrez des notifications pour vos reservations et messages
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notif: Notification, index: number) => {
              const config = getConfig(notif.type);
              const Icon = config.icon;

              return (
                <motion.div
                  key={notif._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    "flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer group",
                    !notif.isRead && "bg-primary/5"
                  )}
                  onClick={() => handleNotificationClick(notif)}
                >
                  {/* Icône */}
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                      config.bgColor
                    )}
                  >
                    <Icon className={cn("w-6 h-6", config.iconColor)} />
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            "text-sm",
                            !notif.isRead
                              ? "font-semibold text-gray-900"
                              : "font-medium text-gray-700"
                          )}
                        >
                          {notif.title}
                        </p>
                        {!notif.isRead && (
                          <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatDistanceToNow(notif.createdAt, {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{notif.message}</p>
                    {notif.linkUrl && (
                      <p className="text-xs text-primary mt-2">
                        Cliquez pour voir les details
                      </p>
                    )}
                  </div>

                  {/* Bouton supprimer */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notif._id);
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
