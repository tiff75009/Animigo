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
      <div
        className="bg-white p-5 animate-pulse"
        style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
      >
        <div className="h-4 w-28 rounded bg-[#f1ede3] mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3"
              style={{ borderRadius: 12, background: "#fcfaf4", border: "1px solid #f1ede3" }}
            >
              <div className="w-10 h-10 rounded-full bg-[#f1ede3]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-28 rounded bg-[#f1ede3]" />
                <div className="h-2.5 w-40 rounded bg-[#f1ede3]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white p-5"
      style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-0.5">
            Messages
          </div>
          <h3 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
            Messages récents
          </h3>
        </div>
        <Link
          href="/dashboard/messagerie"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors hover:bg-[#f7f5ef]"
          style={{ color: "#1f3a33", border: "1px solid #1f3a33" }}
        >
          Tous
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {recent.length === 0 ? (
        <div
          className="text-center py-8"
          style={{ borderRadius: 12, background: "#fcfaf4", border: "1px solid #f1ede3" }}
        >
          <MessageSquare className="w-9 h-9 mx-auto mb-2" style={{ color: "#cdc9c0" }} />
          <p className="text-[13px] text-[#6d6d68]">Aucun message</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recent.map((conv) => (
            <Link key={conv.id} href="/dashboard/messagerie">
              <div
                className="flex items-center gap-3 p-3 transition-colors cursor-pointer hover:bg-[#f7f5ef]"
                style={{ borderRadius: 12, background: "#fcfaf4", border: "1px solid #f1ede3" }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold flex-shrink-0"
                  style={{ background: "#f5f9f6", color: "#1f3a33", border: "1px solid #cfdbd3" }}
                >
                  {getInitials(conv.participantName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13.5px] font-semibold text-[#1f1f1d] tracking-[-0.01em] truncate m-0">
                      {conv.participantName}
                    </p>
                    {conv.lastMessageAt && (
                      <span className="text-[11px] text-[#9c9484] flex-shrink-0">
                        {formatRelativeTime(conv.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#6d6d68] truncate">
                    {conv.lastMessage || "Aucun message"}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <span
                    className="w-5 h-5 rounded-full text-[10px] font-bold inline-flex items-center justify-center flex-shrink-0"
                    style={{ background: "#1f3a33", color: "#f7f5ef" }}
                  >
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
