"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  MessageCircle,
  Calendar,
  CheckCheck,
  X,
  CreditCard,
  Star,
  Clock,
  Wallet,
  User,
  Trash2,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useNotifications } from "@/app/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Doc } from "@/convex/_generated/dataModel";

type Notification = Doc<"notifications">;

// Mapping type → icône
const notificationIcons: Record<string, { icon: React.ElementType; color: string }> = {
  new_mission: { icon: Calendar, color: "text-blue-500" },
  mission_accepted: { icon: CheckCheck, color: "text-green-500" },
  mission_refused: { icon: X, color: "text-red-500" },
  mission_confirmed: { icon: CheckCheck, color: "text-purple-500" },
  mission_started: { icon: Clock, color: "text-amber-500" },
  mission_completed: { icon: CheckCheck, color: "text-green-500" },
  mission_cancelled: { icon: X, color: "text-gray-500" },
  payment_authorized: { icon: CreditCard, color: "text-blue-500" },
  payment_captured: { icon: Wallet, color: "text-green-500" },
  payout_sent: { icon: Wallet, color: "text-emerald-500" },
  review_received: { icon: Star, color: "text-yellow-500" },
  new_message: { icon: MessageCircle, color: "text-blue-500" },
  welcome: { icon: User, color: "text-purple-500" },
  reminder: { icon: Bell, color: "text-orange-500" },
  system: { icon: Bell, color: "text-gray-500" },
};

interface NotificationDropdownProps {
  className?: string;
}

export function NotificationDropdown({ className }: NotificationDropdownProps) {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications(50);

  // Limiter à 5 notifications dans le dropdown
  const displayedNotifications = notifications.slice(0, 5);

  const getNotificationIcon = (type: string) => {
    const config = notificationIcons[type] || notificationIcons.system;
    const Icon = config.icon;
    return <Icon className={cn("w-4 h-4", config.color)} />;
  };

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.isRead) {
      markAsRead(notif._id);
    }
    if (notif.linkUrl) {
      setShowNotifications(false);
      router.push(notif.linkUrl);
    }
  };

  // Fermer le dropdown si on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        if (showNotifications && unreadCount > 0) {
          markAllAsRead();
        }
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications, unreadCount, markAllAsRead]);

  return (
    <div ref={notifRef} className={cn("relative", className)}>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowNotifications(!showNotifications)}
        className={cn(
          "relative p-2.5 rounded-xl transition-colors",
          showNotifications
            ? "bg-primary/10 text-primary"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/80"
        )}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm"
          >
            {unreadCount}
          </motion.span>
        )}
      </motion.button>

      {/* Notifications Dropdown */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed sm:absolute right-4 sm:right-0 left-4 sm:left-auto top-16 sm:top-full sm:mt-2 w-auto sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[200]"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-primary/5 via-secondary/5 to-purple/5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Bell className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    {notifications.length > 0 && (
                      <p className="text-xs text-gray-500">
                        {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Tout est lu"}
                      </p>
                    )}
                  </div>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Tout marquer lu
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-500">Aucune notification</p>
                </div>
              ) : (
                displayedNotifications.map((notif: Notification, index: number) => (
                  <motion.div
                    key={notif._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleNotificationClick(notif)}
                    className={cn(
                      "p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors group",
                      !notif.isRead && "bg-primary/5",
                      notif.linkUrl && "cursor-pointer"
                    )}
                  >
                    <div className="flex gap-3">
                      <div className="shrink-0">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          {getNotificationIcon(notif.type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-sm",
                            !notif.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"
                          )}>
                            {notif.title}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notif._id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-500 truncate">{notif.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(notif.createdAt, { addSuffix: true, locale: fr })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 bg-gray-50 border-t border-gray-100">
                <Link
                  href="/client/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="block w-full py-2.5 text-center text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
                >
                  {unreadCount > 5
                    ? `Voir les ${unreadCount} notifications non lues`
                    : notifications.length > 5
                      ? `Voir toutes les notifications (${notifications.length})`
                      : "Voir toutes les notifications"
                  }
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
