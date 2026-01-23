"use client";

import { useNotifications } from "@/app/hooks/useNotifications";
import { NotificationItem } from "./NotificationItem";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Id, Doc } from "@/convex/_generated/dataModel";

type Notification = Doc<"notifications">;

interface NotificationListProps {
  onClose?: () => void;
  maxItems?: number;
}

export function NotificationList({
  onClose,
  maxItems = 20,
}: NotificationListProps) {
  const router = useRouter();
  const { notifications, isLoading, markAsRead, markAllAsRead, unreadCount } =
    useNotifications(maxItems);

  const handleNotificationClick = async (notification: {
    _id: string;
    isRead: boolean;
    linkUrl?: string;
  }) => {
    if (!notification.isRead) {
      await markAsRead(notification._id as Id<"notifications">);
    }
    if (notification.linkUrl) {
      router.push(notification.linkUrl);
      onClose?.();
    }
  };

  return (
    <div className="flex flex-col max-h-[70vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900">Notifications</h3>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
          >
            <CheckCheck className="w-4 h-4" />
            Tout marquer lu
          </button>
        )}
      </div>

      {/* Liste */}
      <div className="overflow-y-auto flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Bell className="w-12 h-12 mb-3 opacity-50" />
            <p>Aucune notification</p>
          </div>
        ) : (
          notifications.map((notif: Notification) => (
            <NotificationItem
              key={notif._id}
              notification={{
                _id: notif._id,
                type: notif.type,
                title: notif.title,
                message: notif.message,
                isRead: notif.isRead,
                createdAt: notif.createdAt,
                linkUrl: notif.linkUrl,
              }}
              onClick={() => handleNotificationClick(notif)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={() => {
              router.push("/client/notifications");
              onClose?.();
            }}
            className="w-full text-center text-sm text-primary hover:underline"
          >
            Voir toutes les notifications
          </button>
        </div>
      )}
    </div>
  );
}
