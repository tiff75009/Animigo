"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface ConversationData {
  id: Id<"conversations">;
  missionId: Id<"missions">;
  participantName: string;
  participantImage: string;
  animalName: string;
  animalEmoji: string;
  serviceName: string;
  lastMessage: string;
  lastMessageAt: number | undefined;
  lastMessageSenderId: Id<"users"> | undefined;
  unreadCount: number;
  missionStatus: string | undefined;
  isAnnouncer: boolean;
}

interface MessageData {
  id: Id<"messages">;
  content: string;
  type: "text" | "system";
  isMe: boolean;
  senderId: Id<"users">;
  isRead: boolean;
  createdAt: number;
}

/**
 * Hook pour gérer les conversations
 */
export function useConversations(token: string | null) {
  const conversations = useQuery(
    api.messaging.queries.listConversations,
    token ? { token } : "skip"
  ) as ConversationData[] | undefined;

  const totalUnread = useQuery(
    api.messaging.queries.totalUnreadCount,
    token ? { token } : "skip"
  ) as number | undefined;

  return {
    conversations: conversations || [],
    totalUnread: totalUnread || 0,
    isLoading: token !== null && conversations === undefined,
  };
}

/**
 * Hook pour gérer les messages d'une conversation avec pagination
 */
export function useMessages(
  token: string | null,
  conversationId: Id<"conversations"> | null
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessagesCountRef = useRef(0);
  const prevLastMessageIdRef = useRef<string | null>(null);
  const prevFirstMessageIdRef = useRef<string | null>(null);
  const loadingOlderRef = useRef(false);

  // Query paginée pour les messages
  const {
    results,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.messaging.queries.listMessages,
    token && conversationId
      ? { token, conversationId, paginationOpts: { numItems: 20 } }
      : "skip",
    { initialNumItems: 20 }
  );

  // Mutations
  const sendMessageMutation = useMutation(api.messaging.mutations.sendMessage);
  const markAsReadMutation = useMutation(api.messaging.mutations.markAsRead);

  // Les messages sont retournés en ordre desc, les inverser pour l'affichage chronologique
  const messages = useMemo(() => {
    if (!results) return [];
    return [...results].reverse() as MessageData[];
  }, [results]);

  // Marquer comme lu dès qu'il y a des messages non lus (même les nouveaux qui arrivent)
  useEffect(() => {
    if (token && conversationId && results && results.length > 0) {
      // Vérifier s'il y a des messages non lus de l'autre partie
      const hasUnread = results.some((msg: MessageData) => !msg.isMe && !msg.isRead);
      if (hasUnread) {
        markAsReadMutation({ token, conversationId }).catch(console.error);
      }
    }
  }, [token, conversationId, results, markAsReadMutation]);

  // Détecter si un nouveau message est arrivé (pour auto-scroll)
  // et si des anciens messages ont été chargés (pour préserver le scroll)
  const { shouldScrollToBottom, didLoadOlder } = useMemo(() => {
    if (!messages.length) {
      return { shouldScrollToBottom: false, didLoadOlder: false };
    }

    const lastMessage = messages[messages.length - 1];
    const firstMessage = messages[0];
    const lastMessageId = lastMessage?.id;
    const firstMessageId = firstMessage?.id;

    let scrollToBottom = false;
    let loadedOlder = false;

    // Nouveau message arrivé en bas (différent du précédent)
    if (lastMessageId && lastMessageId !== prevLastMessageIdRef.current) {
      const isNewMessage = prevLastMessageIdRef.current !== null;
      prevLastMessageIdRef.current = lastMessageId;
      scrollToBottom = isNewMessage && !loadingOlderRef.current;
    }

    // Anciens messages chargés en haut (premier message différent)
    if (firstMessageId && firstMessageId !== prevFirstMessageIdRef.current) {
      const hadMessages = prevFirstMessageIdRef.current !== null;
      prevFirstMessageIdRef.current = firstMessageId;
      loadedOlder = hadMessages && loadingOlderRef.current;
      loadingOlderRef.current = false;
    }

    return { shouldScrollToBottom: scrollToBottom, didLoadOlder: loadedOlder };
  }, [messages]);

  // Reset les refs quand on change de conversation
  useEffect(() => {
    prevMessagesCountRef.current = 0;
    prevLastMessageIdRef.current = null;
    prevFirstMessageIdRef.current = null;
    loadingOlderRef.current = false;
  }, [conversationId]);

  // Envoyer un message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!token || !conversationId) {
        throw new Error("Non authentifié ou conversation non sélectionnée");
      }
      return sendMessageMutation({ token, conversationId, content });
    },
    [token, conversationId, sendMessageMutation]
  );

  // Charger les anciens messages
  const loadOlderMessages = useCallback(() => {
    if (status === "CanLoadMore") {
      loadingOlderRef.current = true;
      loadMore(20);
    }
  }, [status, loadMore]);

  return {
    messages,
    sendMessage,
    loadOlderMessages,
    canLoadMore: status === "CanLoadMore",
    isLoadingMore: status === "LoadingMore",
    isLoading: status === "LoadingFirstPage",
    scrollRef,
    shouldScrollToBottom,
    didLoadOlder,
  };
}

/**
 * Hook pour récupérer une conversation spécifique
 */
export function useConversation(
  token: string | null,
  conversationId: Id<"conversations"> | null
) {
  const conversation = useQuery(
    api.messaging.queries.getConversation,
    token && conversationId ? { token, conversationId } : "skip"
  );

  return {
    conversation,
    isLoading: token !== null && conversationId !== null && conversation === undefined,
  };
}
