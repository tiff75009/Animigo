"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  MessageSquare,
  Send,
  ImageIcon,
  Phone,
  Video,
  MoreVertical,
  Search,
  ChevronLeft,
  CheckCircle,
  Clock,
  Calendar,
  Info,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import {
  mockConversations,
  type Conversation,
  type ChatMessage,
} from "@/app/lib/dashboard-data";

// Status badge config
const statusConfig = {
  completed: { label: "Terminée", color: "bg-green-100 text-green-700" },
  in_progress: { label: "En cours", color: "bg-blue-100 text-blue-700" },
  upcoming: { label: "À venir", color: "bg-purple/20 text-purple" },
  pending_acceptance: { label: "À accepter", color: "bg-accent/30 text-foreground" },
  pending_confirmation: { label: "En attente", color: "bg-orange-100 text-orange-700" },
  refused: { label: "Refusée", color: "bg-red-100 text-red-700" },
  cancelled: { label: "Annulée", color: "bg-gray-100 text-gray-700" },
};

// Conversation Item Component
function ConversationItem({
  conversation,
  isSelected,
  onClick,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
        isSelected
          ? "bg-primary/10 border-l-4 border-primary"
          : "hover:bg-gray-50"
      )}
      onClick={onClick}
      whileHover={{ x: isSelected ? 0 : 4 }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full overflow-hidden">
          <Image
            src={conversation.participantImage}
            alt={conversation.participantName}
            width={48}
            height={48}
            className="object-cover w-full h-full"
          />
        </div>
        {conversation.isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-semibold text-foreground truncate">
            {conversation.participantName}
          </h4>
          <span className="text-xs text-text-light flex-shrink-0">
            {conversation.lastMessageTime}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-light truncate flex-1">
            {conversation.animal.emoji} {conversation.lastMessage}
          </span>
          {conversation.unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full font-semibold flex-shrink-0">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Message Bubble Component
function MessageBubble({ message }: { message: ChatMessage }) {
  const formatTime = (timestamp: string) => {
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
          {message.content}
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
        {message.type === "image" && message.imageUrl && (
          <div className="mb-2 rounded-xl overflow-hidden">
            <Image
              src={message.imageUrl}
              alt="Image partagée"
              width={300}
              height={200}
              className="object-cover"
            />
          </div>
        )}
        {message.content && (
          <p className={cn("text-sm", message.isMe ? "text-white" : "text-foreground")}>
            {message.content}
          </p>
        )}
        <p
          className={cn(
            "text-xs mt-1",
            message.isMe ? "text-white/70" : "text-text-light"
          )}
        >
          {formatTime(message.timestamp)}
        </p>
      </div>
    </motion.div>
  );
}

// Chat View Component
function ChatView({
  conversation,
  onBack,
}: {
  conversation: Conversation;
  onBack: () => void;
}) {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.messages]);

  const handleSend = () => {
    if (newMessage.trim()) {
      // In a real app, this would send the message to the backend
      console.log("Sending message:", newMessage);
      setNewMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const status = conversation.missionStatus
    ? statusConfig[conversation.missionStatus]
    : null;

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

          <div className="relative">
            <div className="w-12 h-12 rounded-full overflow-hidden">
              <Image
                src={conversation.participantImage}
                alt={conversation.participantName}
                width={48}
                height={48}
                className="object-cover w-full h-full"
              />
            </div>
            {conversation.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            )}
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-foreground">
              {conversation.participantName}
            </h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-text-light flex items-center gap-1">
                {conversation.animal.emoji} {conversation.animal.name}
              </span>
              {status && (
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", status.color)}>
                  {status.label}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              className="p-2 hover:bg-gray-100 rounded-lg text-text-light hover:text-foreground"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Phone className="w-5 h-5" />
            </motion.button>
            <motion.button
              className="p-2 hover:bg-gray-100 rounded-lg text-text-light hover:text-foreground"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Video className="w-5 h-5" />
            </motion.button>
            <motion.button
              className="p-2 hover:bg-gray-100 rounded-lg text-text-light hover:text-foreground"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <MoreVertical className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {/* Date separator */}
        <div className="flex justify-center mb-4">
          <span className="px-3 py-1 bg-white rounded-full text-xs text-text-light shadow-sm">
            Aujourd&apos;hui
          </span>
        </div>

        {conversation.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-foreground/10 p-4">
        <div className="flex items-end gap-3">
          <motion.button
            className="p-2 hover:bg-gray-100 rounded-lg text-text-light hover:text-primary"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ImageIcon className="w-5 h-5" />
          </motion.button>

          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Écrivez votre message..."
              className="w-full px-4 py-3 bg-gray-100 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              rows={1}
            />
          </div>

          <motion.button
            className={cn(
              "p-3 rounded-xl transition-colors",
              newMessage.trim()
                ? "bg-primary text-white"
                : "bg-gray-100 text-text-light"
            )}
            onClick={handleSend}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={!newMessage.trim()}
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-4">
        <MessageSquare className="w-12 h-12 text-primary" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        Sélectionnez une conversation
      </h3>
      <p className="text-text-light max-w-sm">
        Choisissez une conversation dans la liste pour commencer à échanger avec les propriétaires d&apos;animaux.
      </p>
    </div>
  );
}

export default function MessageriePage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileChat, setShowMobileChat] = useState(false);

  const totalUnread = mockConversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const filteredConversations = mockConversations.filter(
    (c) =>
      c.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.animal.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowMobileChat(true);
  };

  const handleBack = () => {
    setShowMobileChat(false);
  };

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
                    isSelected={selectedConversation?.id === conversation.id}
                    onClick={() => handleSelectConversation(conversation)}
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
          {selectedConversation ? (
            <ChatView conversation={selectedConversation} onBack={handleBack} />
          ) : (
            <EmptyState />
          )}
        </div>
      </motion.div>
    </div>
  );
}
