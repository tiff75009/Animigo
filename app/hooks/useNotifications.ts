"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "./useAuth";
import { Id } from "@/convex/_generated/dataModel";
import { useCallback } from "react";

export function useNotifications(limit?: number) {
  const { token } = useAuth();

  const notifications = useQuery(
    api.notifications.queries.list,
    token ? { sessionToken: token, limit } : "skip"
  );

  const unreadCount = useQuery(
    api.notifications.queries.unreadCount,
    token ? { sessionToken: token } : "skip"
  );

  const markAsReadMutation = useMutation(
    api.notifications.mutations.markAsRead
  );
  const markAllAsReadMutation = useMutation(
    api.notifications.mutations.markAllAsRead
  );
  const deleteNotificationMutation = useMutation(
    api.notifications.mutations.deleteNotification
  );

  const markAsRead = useCallback(
    async (notificationId: Id<"notifications">) => {
      if (!token) return;
      await markAsReadMutation({ sessionToken: token, notificationId });
    },
    [token, markAsReadMutation]
  );

  const markAllAsRead = useCallback(async () => {
    if (!token) return;
    await markAllAsReadMutation({ sessionToken: token });
  }, [token, markAllAsReadMutation]);

  const deleteNotification = useCallback(
    async (notificationId: Id<"notifications">) => {
      if (!token) return;
      await deleteNotificationMutation({ sessionToken: token, notificationId });
    },
    [token, deleteNotificationMutation]
  );

  return {
    notifications: notifications ?? [],
    unreadCount: unreadCount ?? 0,
    isLoading: notifications === undefined,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
