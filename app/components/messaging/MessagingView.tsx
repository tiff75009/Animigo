"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  MessageSquare,
  Send,
  Search,
  ChevronLeft,
  Info,
  Loader2,
  Check,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useAuth } from "@/app/hooks/useAuth";
import { useConversations, useMessages, useConversation } from "@/app/hooks/useMessaging";
import { useActiveConversation } from "@/app/contexts/MessagingContext";
import { Id } from "@/convex/_generated/dataModel";

// Status badge config
const statusConfig: Record<string, { label: string; color: string }> = {
  completed: { label: "Terminée", color: "bg-green-100 text-green-700" },
  in_progress: { label: "En cours", color: "bg-blue-100 text-blue-700" },
  upcoming: { label: "À venir", color: "bg-purple/20 text-purple" },
  pending_acceptance: { label: "À accepter", color: "bg-accent/30 text-foreground" },
  pending_confirmation: { label: "En attente", color: "bg-orange-100 text-orange-700" },
  refused: { label: "Refusée", color: "bg-red-100 text-red-700" },
  cancelled: { label: "Annulée", color: "bg-gray-100 text-gray-700" },
};

interface ConversationItemProps {
  conversation: {
    id: Id<"conversations">;
    participantName: string;
    participantImage: string;
    animalName: string;
    animalEmoji: string;
    lastMessage: string;
    lastMessageAt: number | undefined;
    unreadCount: number;
    missionStatus: string | undefined;
  };
  isSelected: boolean;
  onClick: () => void;
}

// Conversation Item Component
function ConversationItem({ conversation, isSelected, onClick }: ConversationItemProps) {
  const formatTime = (timestamp: number | undefined) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Hier";
    } else if (diffDays < 7) {
      return date.toLocaleDateString("fr-FR", { weekday: "short" });
    }
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  return (
    <motion.button
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all text-left",
        isSelected
          ? "bg-primary/10 border-l-4 border-primary"
          : "hover:bg-gray-50"
      )}
      onClick={onClick}
      whileHover={{ x: isSelected ? 0 : 4 }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
          <Image
            src={conversation.participantImage}
            alt={conversation.participantName}
            width={48}
            height={48}
            className="object-cover w-full h-full"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-semibold text-foreground truncate">
            {conversation.participantName}
          </h4>
          <span className="text-xs text-text-light flex-shrink-0">
            {formatTime(conversation.lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-light truncate flex-1">
            {conversation.animalEmoji} {conversation.lastMessage || "Nouvelle conversation"}
          </span>
          {conversation.unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full font-semibold flex-shrink-0">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

interface MessageBubbleProps {
  message: {
    id: Id<"messages">;
    content: string;
    type: "text" | "system";
    isMe: boolean;
    isRead: boolean;
    createdAt: number;
  };
}

// Message Bubble Component
function MessageBubble({ message }: MessageBubbleProps) {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (message.type === "system") {
    return (
      <div className="flex justify-center my-4">
        <div className="px-4 py-2 bg-gray-100 rounded-full text-sm text-text-light flex items-center gap-2">
          <Info className="w-4 h-4" />
          <span>{message.content}</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex mb-3", message.isMe ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2",
          message.isMe
            ? "bg-primary text-white rounded-br-md"
            : "bg-white shadow-md rounded-bl-md"
        )}
      >
        <p className={cn("text-sm whitespace-pre-wrap", message.isMe ? "text-white" : "text-foreground")}>
          {message.content}
        </p>
        <div
          className={cn(
            "flex items-center justify-end gap-1 mt-1",
            message.isMe ? "text-white/70" : "text-text-light"
          )}
        >
          <span className="text-xs">
            {formatTime(message.createdAt)}
          </span>
          {/* Confirmation d'envoi et de lecture (seulement pour ses propres messages) */}
          {message.isMe && (
            <span className="flex items-center">
              {message.isRead ? (
                <CheckCheck className="w-4 h-4 text-blue-300" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface ChatViewProps {
  conversationId: Id<"conversations">;
  onBack: () => void;
  userType: "client" | "announcer";
}

// Chat View Component
function ChatView({ conversationId, onBack, userType }: ChatViewProps) {
  const { token } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { conversation, isLoading: isLoadingConversation } = useConversation(token, conversationId);
  const {
    messages,
    sendMessage,
    loadOlderMessages,
    canLoadMore,
    isLoadingMore,
    isLoading: isLoadingMessages,
    shouldScrollToBottom,
  } = useMessages(token, conversationId);

  // Auto-scroll quand un nouveau message arrive (ses propres ou reçus)
  useEffect(() => {
    if (shouldScrollToBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [shouldScrollToBottom, messages]);

  // Initial scroll to bottom
  useEffect(() => {
    if (!isLoadingMessages && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [isLoadingMessages, conversationId]);

  // Infinite scroll - observer for loading older messages
  useEffect(() => {
    if (!sentinelRef.current || !canLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && canLoadMore && !isLoadingMore) {
          loadOlderMessages();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [canLoadMore, isLoadingMore, loadOlderMessages]);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(newMessage.trim());
      setNewMessage("");
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
    } finally {
      setIsSending(false);
    }
  }, [newMessage, isSending, sendMessage]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoadingConversation || isLoadingMessages) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-2 text-text-light">Chargement...</p>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <p className="text-text-light">Conversation non trouvée</p>
      </div>
    );
  }

  const status = conversation.missionStatus ? statusConfig[conversation.missionStatus] : null;
  const missionLink = userType === "announcer"
    ? `/dashboard/missions/${conversation.missionId}`
    : `/client/reservations/${conversation.missionId}`;

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-white border-b border-foreground/10 p-4">
        <div className="flex items-center gap-4">
          <motion.button
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            onClick={onBack}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>

          <Link href={missionLink} className="relative">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
              <Image
                src={conversation.participantImage}
                alt={conversation.participantName}
                width={48}
                height={48}
                className="object-cover w-full h-full"
              />
            </div>
          </Link>

          <div className="flex-1">
            <Link href={missionLink} className="hover:underline">
              <h3 className="font-semibold text-foreground">
                {conversation.participantName}
              </h3>
            </Link>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-text-light flex items-center gap-1">
                {conversation.animalEmoji} {conversation.animalName}
              </span>
              {status && (
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", status.color)}>
                  {status.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {/* Sentinel for infinite scroll (top) */}
        <div ref={sentinelRef} className="h-4">
          {isLoadingMore && (
            <div className="flex justify-center py-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* Date separator */}
        {messages.length > 0 && (
          <div className="flex justify-center mb-4">
            <span className="px-3 py-1 bg-white rounded-full text-xs text-text-light shadow-sm">
              {new Date(messages[0].createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-foreground/10 p-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Écrivez votre message..."
              className="w-full px-4 py-3 bg-gray-100 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              rows={1}
              disabled={isSending}
            />
          </div>

          <motion.button
            className={cn(
              "p-3 rounded-xl transition-colors",
              newMessage.trim() && !isSending
                ? "bg-primary text-white"
                : "bg-gray-100 text-text-light"
            )}
            onClick={handleSend}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState({ userType }: { userType: "client" | "announcer" }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-4">
        <MessageSquare className="w-12 h-12 text-primary" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        Sélectionnez une conversation
      </h3>
      <p className="text-text-light max-w-sm">
        {userType === "announcer"
          ? "Choisissez une conversation dans la liste pour échanger avec les propriétaires d'animaux."
          : "Choisissez une conversation dans la liste pour échanger avec les prestataires."}
      </p>
    </div>
  );
}

// No Conversations State
function NoConversationsState({ userType }: { userType: "client" | "announcer" }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <MessageSquare className="w-12 h-12 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        Aucune conversation
      </h3>
      <p className="text-text-light max-w-sm">
        {userType === "announcer"
          ? "Vos conversations avec les clients apparaîtront ici après confirmation de leurs réservations."
          : "Vos conversations avec les prestataires apparaîtront ici après confirmation de vos réservations."}
      </p>
    </div>
  );
}

interface MessagingViewProps {
  userType: "client" | "announcer";
}

export default function MessagingView({ userType }: MessagingViewProps) {
  const { token, isLoading: isAuthLoading } = useAuth();
  const searchParams = useSearchParams();
  const { setActiveConversationId } = useActiveConversation();
  const [selectedConversationId, setSelectedConversationId] = useState<Id<"conversations"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [hasInitializedFromUrl, setHasInitializedFromUrl] = useState(false);

  const { conversations, totalUnread, isLoading } = useConversations(token);

  // Signaler la conversation active au contexte
  useEffect(() => {
    setActiveConversationId(selectedConversationId);
    // Nettoyer quand on quitte la page
    return () => setActiveConversationId(null);
  }, [selectedConversationId, setActiveConversationId]);

  // Sélectionner automatiquement la conversation depuis l'URL
  useEffect(() => {
    if (hasInitializedFromUrl) return;

    const conversationParam = searchParams.get("conversation");
    if (conversationParam && conversations.length > 0) {
      // Vérifier que la conversation existe dans la liste
      const conversationExists = conversations.some(
        (c) => c.id === conversationParam
      );
      if (conversationExists) {
        setSelectedConversationId(conversationParam as Id<"conversations">);
        setShowMobileChat(true);
        setHasInitializedFromUrl(true);
      }
    }
  }, [searchParams, conversations, hasInitializedFromUrl]);

  const filteredConversations = conversations.filter(
    (c) =>
      c.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.animalName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectConversation = (conversationId: Id<"conversations">) => {
    setSelectedConversationId(conversationId);
    setShowMobileChat(true);
  };

  const handleBack = () => {
    setShowMobileChat(false);
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-2 text-text-light">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <MessageSquare className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Messagerie
            </h1>
            <p className="text-text-light">
              {totalUnread > 0
                ? `${totalUnread} message${totalUnread > 1 ? "s" : ""} non lu${totalUnread > 1 ? "s" : ""}`
                : "Toutes vos conversations"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 bg-white rounded-2xl shadow-lg overflow-hidden flex"
      >
        {conversations.length === 0 ? (
          <NoConversationsState userType={userType} />
        ) : (
          <>
            {/* Conversation List */}
            <div
              className={cn(
                "w-full lg:w-96 border-r border-foreground/10 flex flex-col",
                showMobileChat ? "hidden lg:flex" : "flex"
              )}
            >
              {/* Search */}
              <div className="p-4 border-b border-foreground/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light" />
                  <input
                    type="text"
                    placeholder="Rechercher une conversation..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                  />
                </div>
              </div>

              {/* Conversation List */}
              <div className="flex-1 overflow-y-auto p-2">
                {filteredConversations.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-text-light">Aucune conversation trouvée</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredConversations.map((conversation) => (
                      <ConversationItem
                        key={conversation.id}
                        conversation={conversation}
                        isSelected={selectedConversationId === conversation.id}
                        onClick={() => handleSelectConversation(conversation.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Chat View */}
            <div
              className={cn(
                "flex-1 flex flex-col",
                showMobileChat ? "flex" : "hidden lg:flex"
              )}
            >
              {selectedConversationId ? (
                <ChatView
                  conversationId={selectedConversationId}
                  onBack={handleBack}
                  userType={userType}
                />
              ) : (
                <EmptyState userType={userType} />
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
