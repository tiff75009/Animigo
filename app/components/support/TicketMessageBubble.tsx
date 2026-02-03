"use client";

import { cn } from "@/app/lib/utils";
import { Paperclip, Lock } from "lucide-react";

interface TicketMessageBubbleProps {
  message: {
    _id: string;
    content: string;
    senderName: string;
    senderType: "user" | "admin";
    isInternal?: boolean;
    createdAt: number;
    attachments?: Array<{
      name: string;
      url: string;
      type: string;
    }>;
  };
  isCurrentUser?: boolean;
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TicketMessageBubble({ message, isCurrentUser }: TicketMessageBubbleProps) {
  const isSystem = message.senderName === "Système";
  const isInternal = message.isInternal;

  // Message système (changement de statut, etc.)
  if (isSystem && !isInternal) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-gray-100 text-gray-500 text-xs px-3 py-1.5 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  // Note interne (admin uniquement)
  if (isInternal) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5">
          <Lock className="w-3 h-3" />
          <span className="font-medium">Note interne:</span> {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col max-w-[80%]",
        isCurrentUser ? "ml-auto items-end" : "mr-auto items-start"
      )}
    >
      {/* Nom de l'expéditeur */}
      <span
        className={cn(
          "text-xs mb-1 px-1",
          isCurrentUser ? "text-gray-500" : "text-primary font-medium"
        )}
      >
        {message.senderType === "admin" ? "Support" : message.senderName}
      </span>

      {/* Bulle de message */}
      <div
        className={cn(
          "rounded-2xl px-4 py-2.5",
          isCurrentUser
            ? "bg-primary text-white rounded-br-md"
            : "bg-gray-100 text-foreground rounded-bl-md"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Pièces jointes */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.attachments.map((attachment, index) => (
              <a
                key={index}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-1.5 text-xs underline",
                  isCurrentUser ? "text-white/90" : "text-primary"
                )}
              >
                <Paperclip className="w-3 h-3" />
                {attachment.name}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Heure */}
      <span className="text-[10px] text-gray-400 mt-1 px-1">
        {formatDateTime(message.createdAt)}
      </span>
    </div>
  );
}
