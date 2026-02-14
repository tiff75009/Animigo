"use client";

import Link from "next/link";
import { ArrowRight, MessageSquare } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

interface Conversation {
  id: Id<"conversations">;
  participantName: string;
  participantImage: string;
  animalEmoji: string;
  serviceName: string;
  lastMessage: string;
  lastMessageAt: number | undefined;
  unreadCount: number;
}

interface RecentMessagesProps {
  conversations: Conversation[];
  isLoading: boolean;
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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function RecentMessages({ conversations, isLoading }: RecentMessagesProps) {
  const recent = conversations.slice(0, 4);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
        <div className="h-5 w-36 rounded bg-gray-200 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 rounded bg-gray-200" />
                <div className="h-3 w-40 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Messages récents
        </h3>
        <Link
          href="/dashboard/messagerie"
          className="text-primary text-sm font-medium flex items-center gap-1 hover:underline"
        >
          Tous
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="text-center py-8 text-text-light">
          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucun message</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recent.map((conv) => (
            <Link key={conv.id} href="/dashboard/messagerie">
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                  {getInitials(conv.participantName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground text-sm truncate">
                      {conv.participantName}
                    </p>
                    {conv.lastMessageAt && (
                      <span className="text-xs text-text-light flex-shrink-0">
                        {formatRelativeTime(conv.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-light truncate">
                    {conv.lastMessage || "Aucun message"}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="w-5 h-5 bg-primary rounded-full text-white text-xs flex items-center justify-center flex-shrink-0">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
