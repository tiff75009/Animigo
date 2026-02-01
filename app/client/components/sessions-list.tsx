"use client";

import { Calendar, Clock, CheckCircle } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface Session {
  date: string;
  startTime: string;
  endTime: string;
}

interface SessionsListProps {
  sessions: Session[];
  sessionType?: "individual" | "collective";
  numberOfSessions?: number;
}

function formatSessionDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function getSessionStatus(dateStr: string): "past" | "today" | "upcoming" {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sessionDate = new Date(dateStr);
  sessionDate.setHours(0, 0, 0, 0);

  if (sessionDate.getTime() < today.getTime()) {
    return "past";
  } else if (sessionDate.getTime() === today.getTime()) {
    return "today";
  }
  return "upcoming";
}

const statusStyles = {
  past: {
    container: "bg-gray-50 border-gray-200",
    text: "text-gray-500",
    badge: "bg-gray-100 text-gray-600",
    badgeLabel: "Passée",
  },
  today: {
    container: "bg-green-50 border-green-200",
    text: "text-green-700",
    badge: "bg-green-100 text-green-700",
    badgeLabel: "Aujourd'hui",
  },
  upcoming: {
    container: "bg-blue-50 border-blue-200",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-700",
    badgeLabel: "À venir",
  },
};

export function SessionsList({
  sessions,
  sessionType,
  numberOfSessions,
}: SessionsListProps) {
  if (!sessions || sessions.length === 0) {
    return null;
  }

  // Trier les séances par date
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const completedCount = sortedSessions.filter(
    (s) => getSessionStatus(s.date) === "past"
  ).length;

  return (
    <div className="space-y-3">
      {/* Header avec compteur */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="w-4 h-4" />
          <span>
            {completedCount}/{sortedSessions.length} séance
            {sortedSessions.length > 1 ? "s" : ""} effectuée
            {completedCount > 1 ? "s" : ""}
          </span>
        </div>
        {sessionType === "collective" && (
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
            Collectif
          </span>
        )}
      </div>

      {/* Liste des séances */}
      <div className="space-y-2">
        {sortedSessions.map((session, index) => {
          const status = getSessionStatus(session.date);
          const styles = statusStyles[status];

          return (
            <div
              key={`${session.date}-${index}`}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                styles.container
              )}
            >
              {/* Icône de statut */}
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                  status === "past"
                    ? "bg-gray-200"
                    : status === "today"
                      ? "bg-green-200"
                      : "bg-blue-200"
                )}
              >
                {status === "past" ? (
                  <CheckCircle className="w-4 h-4 text-gray-600" />
                ) : (
                  <Calendar className="w-4 h-4 text-current" />
                )}
              </div>

              {/* Infos de la séance */}
              <div className="flex-1 min-w-0">
                <p className={cn("font-medium capitalize", styles.text)}>
                  {formatSessionDate(session.date)}
                </p>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {session.startTime} - {session.endTime}
                </p>
              </div>

              {/* Badge de statut */}
              <span
                className={cn(
                  "text-xs px-2 py-1 rounded-full font-medium flex-shrink-0",
                  styles.badge
                )}
              >
                {styles.badgeLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
