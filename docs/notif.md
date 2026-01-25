# Système de Notifications - Animigo

## Architecture: Convex + QStash

```
Action utilisateur (ex: mission acceptée)
    │
    ├── Mutation Convex: updateMissionStatus()
    │   └── Logique métier (sync, rapide)
    │
    └── queueNotification() → QStash (async, ne bloque pas)
            │
            └── QStash POST → /api/notifications/create
                    │
                    └── Convex mutation: notifications.create()
                            │
                            └── Client reçoit via useQuery() (real-time)
```

---

## Phase 1: Intégration QStash dans l'Admin

### 1.1 Ajouter QStash à la page Intégrations

**Fichier:** `app/admin/(dashboard)/integrations/page.tsx`

Ajouter une nouvelle section dans le tableau `integrations`:

```typescript
{
  id: "qstash",
  name: "Upstash QStash",
  description: "File de messages pour notifications asynchrones",
  icon: Bell, // ou MessageSquare
  color: "bg-emerald-500",
  docsUrl: "https://console.upstash.com/qstash",
  fields: [
    {
      key: "qstash_token",
      label: "Token QStash",
      description: "Token d'authentification QStash (QSTASH_TOKEN)",
      isSecret: true,
      placeholder: "eyJVc2VySUQi...",
    },
    {
      key: "qstash_current_signing_key",
      label: "Signing Key (Current)",
      description: "Clé de signature actuelle pour valider les webhooks",
      isSecret: true,
      placeholder: "sig_...",
    },
    {
      key: "qstash_next_signing_key",
      label: "Signing Key (Next)",
      description: "Prochaine clé de signature (rotation)",
      isSecret: true,
      placeholder: "sig_...",
    },
  ],
}
```

### 1.2 Créer l'action de test QStash

**Fichier:** `convex/admin/config.ts`

```typescript
export const testQStashConnection = action({
  args: { token: v.string(), qstashToken: v.string() },
  handler: async (ctx, args) => {
    // Valider session admin
    const session = await ctx.runQuery(internal.admin.session.validateAdmin, {
      token: args.token,
    });
    if (!session) throw new Error("Non autorisé");

    try {
      // Test: publier un message de test
      const response = await fetch("https://qstash.upstash.io/v2/publish/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${args.qstashToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // On publie vers une URL de test (notre propre endpoint)
          url: "https://httpstat.us/200", // Endpoint de test public
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const data = await response.json();
      return {
        success: true,
        message: "Connexion QStash OK",
        messageId: data.messageId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  },
});
```

### 1.3 Dépendance

```bash
bun add @upstash/qstash
```

---

## Phase 2: Schema Notifications

### 2.1 Ajouter la table au schema

**Fichier:** `convex/schema.ts`

```typescript
// Notifications in-app
notifications: defineTable({
  // Destinataire
  userId: v.id("users"),

  // Type de notification (pour filtrage et icône)
  type: v.union(
    // Missions
    v.literal("new_mission"),           // Annonceur: nouvelle demande reçue
    v.literal("mission_accepted"),      // Client: demande acceptée
    v.literal("mission_refused"),       // Client: demande refusée
    v.literal("mission_confirmed"),     // Annonceur: client a confirmé
    v.literal("mission_started"),       // Les deux: mission démarrée
    v.literal("mission_completed"),     // Les deux: mission terminée
    v.literal("mission_cancelled"),     // Les deux: annulation

    // Paiements
    v.literal("payment_authorized"),    // Client: paiement pré-autorisé
    v.literal("payment_captured"),      // Annonceur: paiement capturé
    v.literal("payout_sent"),           // Annonceur: virement envoyé

    // Avis
    v.literal("review_received"),       // Annonceur: nouvel avis

    // Messages (futur)
    v.literal("new_message"),           // Nouveau message reçu

    // Système
    v.literal("welcome"),               // Nouveau compte créé
    v.literal("reminder"),              // Rappel (ex: mission demain)
    v.literal("system")                 // Notification système générique
  ),

  // Contenu
  title: v.string(),                    // "Nouvelle demande !"
  message: v.string(),                  // "Marie souhaite réserver..."

  // Lien contextuel
  linkType: v.optional(v.union(
    v.literal("mission"),
    v.literal("payment"),
    v.literal("profile"),
    v.literal("review"),
    v.literal("message"),
    v.literal("settings")
  )),
  linkId: v.optional(v.string()),       // ID de la ressource
  linkUrl: v.optional(v.string()),      // URL complète (générée)

  // Statut
  isRead: v.boolean(),                  // false par défaut
  readAt: v.optional(v.number()),       // Timestamp lecture

  // Metadata flexible (infos additionnelles selon le type)
  metadata: v.optional(v.any()),

  // Timestamps
  createdAt: v.number(),
  expiresAt: v.number(),                // Auto-delete après 30 jours
})
  .index("by_user", ["userId"])
  .index("by_user_unread", ["userId", "isRead"])
  .index("by_user_created", ["userId", "createdAt"])
  .index("by_user_type", ["userId", "type"])
  .index("by_expires", ["expiresAt"]),
```

---

## Phase 3: Backend Convex

### 3.1 Mutations notifications

**Fichier:** `convex/notifications/mutations.ts`

```typescript
import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// Types de notifications
export const notificationTypes = [
  "new_mission", "mission_accepted", "mission_refused",
  "mission_confirmed", "mission_started", "mission_completed",
  "mission_cancelled", "payment_authorized", "payment_captured",
  "payout_sent", "review_received", "new_message",
  "welcome", "reminder", "system"
] as const;

// Durée de rétention: 30 jours
const RETENTION_DAYS = 30;

// Création d'une notification (appelée par l'endpoint API)
export const create = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    linkType: v.optional(v.string()),
    linkId: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + RETENTION_DAYS * 24 * 60 * 60 * 1000;

    return await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type as any,
      title: args.title,
      message: args.message,
      linkType: args.linkType as any,
      linkId: args.linkId,
      linkUrl: args.linkUrl,
      metadata: args.metadata,
      isRead: false,
      createdAt: now,
      expiresAt,
    });
  },
});

// Marquer comme lue
export const markAsRead = mutation({
  args: {
    sessionToken: v.string(),
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Session invalide");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== session.userId) {
      throw new Error("Notification non trouvée");
    }

    await ctx.db.patch(args.notificationId, {
      isRead: true,
      readAt: Date.now(),
    });
  },
});

// Marquer toutes comme lues
export const markAllAsRead = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Session invalide");
    }

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", session.userId).eq("isRead", false)
      )
      .collect();

    const now = Date.now();
    for (const notif of unreadNotifications) {
      await ctx.db.patch(notif._id, { isRead: true, readAt: now });
    }

    return { count: unreadNotifications.length };
  },
});

// Supprimer les notifications expirées (cron job)
export const cleanupExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("notifications")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .take(100); // Batch de 100

    for (const notif of expired) {
      await ctx.db.delete(notif._id);
    }

    return { deleted: expired.length };
  },
});
```

### 3.2 Queries notifications

**Fichier:** `convex/notifications/queries.ts`

```typescript
import { v } from "convex/values";
import { query } from "../_generated/server";

// Liste des notifications de l'utilisateur
export const list = query({
  args: {
    sessionToken: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return [];
    }

    const limit = args.limit ?? 50;

    return await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", session.userId))
      .order("desc")
      .take(limit);
  },
});

// Compteur de non-lues
export const unreadCount = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return 0;
    }

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", session.userId).eq("isRead", false)
      )
      .collect();

    return unread.length;
  },
});
```

### 3.3 Cron job pour cleanup

**Fichier:** `convex/crons.ts`

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Nettoyer les notifications expirées tous les jours à 3h du matin
crons.daily(
  "cleanup expired notifications",
  { hourUTC: 3, minuteUTC: 0 },
  internal.notifications.mutations.cleanupExpired
);

export default crons;
```

---

## Phase 4: API Endpoint

### 4.1 Endpoint pour recevoir les messages QStash

**Fichier:** `app/api/notifications/create/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { ConvexHttpClient } from "convex/browser";
import { internal } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Receiver pour valider les signatures QStash
const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    // Valider la signature QStash
    const body = await req.text();
    const signature = req.headers.get("upstash-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const isValid = await receiver.verify({
      signature,
      body,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parser le payload
    const payload = JSON.parse(body);
    const { userId, type, title, message, linkType, linkId, linkUrl, metadata } = payload;

    // Valider les champs requis
    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Créer la notification via Convex
    await convex.mutation(internal.notifications.mutations.create, {
      userId,
      type,
      title,
      message,
      linkType,
      linkId,
      linkUrl,
      metadata,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
```

---

## Phase 5: Helper pour envoyer des notifications

### 5.1 Utilitaire QStash

**Fichier:** `convex/lib/qstash.ts`

```typescript
import { Client } from "@upstash/qstash";

// Types de notifications
export type NotificationType =
  | "new_mission"
  | "mission_accepted"
  | "mission_refused"
  | "mission_confirmed"
  | "mission_started"
  | "mission_completed"
  | "mission_cancelled"
  | "payment_authorized"
  | "payment_captured"
  | "payout_sent"
  | "review_received"
  | "new_message"
  | "welcome"
  | "reminder"
  | "system";

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkType?: "mission" | "payment" | "profile" | "review" | "message" | "settings";
  linkId?: string;
  linkUrl?: string;
  metadata?: Record<string, any>;
}

// Client QStash (initialisé une fois)
let qstashClient: Client | null = null;

function getQStashClient(): Client {
  if (!qstashClient) {
    const token = process.env.QSTASH_TOKEN;
    if (!token) {
      throw new Error("QSTASH_TOKEN not configured");
    }
    qstashClient = new Client({ token });
  }
  return qstashClient;
}

// Fonction principale pour envoyer une notification
export async function queueNotification(payload: NotificationPayload): Promise<void> {
  const client = getQStashClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  await client.publishJSON({
    url: `${appUrl}/api/notifications/create`,
    body: payload,
    retries: 3,
  });
}

// Fonction pour envoyer une notification avec délai (rappels)
export async function queueDelayedNotification(
  payload: NotificationPayload,
  delaySeconds: number
): Promise<void> {
  const client = getQStashClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  await client.publishJSON({
    url: `${appUrl}/api/notifications/create`,
    body: payload,
    delay: delaySeconds,
    retries: 3,
  });
}
```

### 5.2 Templates de notifications

**Fichier:** `convex/lib/notificationTemplates.ts`

```typescript
import { Id } from "../_generated/dataModel";
import { queueNotification, NotificationType } from "./qstash";

// ============================================
// MISSIONS
// ============================================

export async function notifyNewMission(params: {
  announcerId: Id<"users">;
  clientName: string;
  animalName: string;
  serviceName: string;
  missionId: Id<"missions">;
}) {
  await queueNotification({
    userId: params.announcerId as string,
    type: "new_mission",
    title: "Nouvelle demande !",
    message: `${params.clientName} souhaite réserver "${params.serviceName}" pour ${params.animalName}`,
    linkType: "mission",
    linkId: params.missionId as string,
    linkUrl: `/dashboard/missions/accepter`,
  });
}

export async function notifyMissionAccepted(params: {
  clientId: Id<"users">;
  announcerName: string;
  serviceName: string;
  missionId: Id<"missions">;
}) {
  await queueNotification({
    userId: params.clientId as string,
    type: "mission_accepted",
    title: "Demande acceptée !",
    message: `${params.announcerName} a accepté votre demande pour "${params.serviceName}"`,
    linkType: "mission",
    linkId: params.missionId as string,
    linkUrl: `/client/reservations`,
  });
}

export async function notifyMissionRefused(params: {
  clientId: Id<"users">;
  announcerName: string;
  serviceName: string;
  reason?: string;
}) {
  await queueNotification({
    userId: params.clientId as string,
    type: "mission_refused",
    title: "Demande refusée",
    message: params.reason
      ? `${params.announcerName} a refusé : ${params.reason}`
      : `${params.announcerName} n'est pas disponible pour cette demande`,
    linkType: "mission",
  });
}

export async function notifyMissionConfirmed(params: {
  announcerId: Id<"users">;
  clientName: string;
  serviceName: string;
  startDate: string;
  missionId: Id<"missions">;
}) {
  await queueNotification({
    userId: params.announcerId as string,
    type: "mission_confirmed",
    title: "Réservation confirmée !",
    message: `${params.clientName} a confirmé la mission "${params.serviceName}" du ${params.startDate}`,
    linkType: "mission",
    linkId: params.missionId as string,
    linkUrl: `/dashboard/planning`,
  });
}

export async function notifyMissionCompleted(params: {
  userId: Id<"users">;
  otherPartyName: string;
  serviceName: string;
  missionId: Id<"missions">;
  isAnnouncer: boolean;
}) {
  await queueNotification({
    userId: params.userId as string,
    type: "mission_completed",
    title: "Mission terminée !",
    message: `La mission "${params.serviceName}" avec ${params.otherPartyName} est terminée`,
    linkType: "mission",
    linkId: params.missionId as string,
    linkUrl: params.isAnnouncer ? `/dashboard/missions` : `/client/reservations`,
  });
}

// ============================================
// PAIEMENTS
// ============================================

export async function notifyPaymentCaptured(params: {
  announcerId: Id<"users">;
  clientName: string;
  amount: number; // en centimes
  missionId: Id<"missions">;
}) {
  const formattedAmount = (params.amount / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

  await queueNotification({
    userId: params.announcerId as string,
    type: "payment_captured",
    title: "Paiement reçu !",
    message: `${formattedAmount} reçu de ${params.clientName}`,
    linkType: "payment",
    linkId: params.missionId as string,
    linkUrl: `/dashboard/revenus`,
    metadata: { amount: params.amount },
  });
}

export async function notifyPayoutSent(params: {
  announcerId: Id<"users">;
  amount: number; // en centimes
}) {
  const formattedAmount = (params.amount / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

  await queueNotification({
    userId: params.announcerId as string,
    type: "payout_sent",
    title: "Virement envoyé !",
    message: `${formattedAmount} a été viré sur votre compte bancaire`,
    linkType: "payment",
    linkUrl: `/dashboard/revenus`,
    metadata: { amount: params.amount },
  });
}

// ============================================
// AVIS
// ============================================

export async function notifyReviewReceived(params: {
  announcerId: Id<"users">;
  clientName: string;
  rating: number;
}) {
  const stars = "★".repeat(params.rating) + "☆".repeat(5 - params.rating);

  await queueNotification({
    userId: params.announcerId as string,
    type: "review_received",
    title: "Nouvel avis !",
    message: `${params.clientName} vous a donné ${stars}`,
    linkType: "review",
    linkUrl: `/dashboard/avis`,
    metadata: { rating: params.rating },
  });
}

// ============================================
// SYSTÈME
// ============================================

export async function notifyWelcome(params: {
  userId: Id<"users">;
  firstName: string;
  isAnnouncer: boolean;
}) {
  await queueNotification({
    userId: params.userId as string,
    type: "welcome",
    title: `Bienvenue ${params.firstName} !`,
    message: params.isAnnouncer
      ? "Votre compte annonceur est créé. Complétez votre profil pour recevoir des demandes."
      : "Votre compte est créé. Trouvez le prestataire idéal pour votre animal !",
    linkType: "settings",
    linkUrl: params.isAnnouncer ? `/dashboard/profil` : `/client/profil`,
  });
}
```

---

## Phase 6: Frontend - Composants

### 6.1 Hook useNotifications

**Fichier:** `app/hooks/useNotifications.ts`

```typescript
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "./useAuth";
import { Id } from "@/convex/_generated/dataModel";

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

  const markAsReadMutation = useMutation(api.notifications.mutations.markAsRead);
  const markAllAsReadMutation = useMutation(api.notifications.mutations.markAllAsRead);

  const markAsRead = async (notificationId: Id<"notifications">) => {
    if (!token) return;
    await markAsReadMutation({ sessionToken: token, notificationId });
  };

  const markAllAsRead = async () => {
    if (!token) return;
    await markAllAsReadMutation({ sessionToken: token });
  };

  return {
    notifications: notifications ?? [],
    unreadCount: unreadCount ?? 0,
    isLoading: notifications === undefined,
    markAsRead,
    markAllAsRead,
  };
}
```

### 6.2 Composant NotificationBell (header)

**Fichier:** `app/components/notifications/NotificationBell.tsx`

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "@/app/hooks/useNotifications";
import { NotificationList } from "./NotificationList";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer au clic extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50"
          >
            <NotificationList onClose={() => setIsOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### 6.3 Composant NotificationList

**Fichier:** `app/components/notifications/NotificationList.tsx`

```tsx
"use client";

import { useNotifications } from "@/app/hooks/useNotifications";
import { NotificationItem } from "./NotificationItem";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface NotificationListProps {
  onClose?: () => void;
}

export function NotificationList({ onClose }: NotificationListProps) {
  const router = useRouter();
  const { notifications, isLoading, markAsRead, markAllAsRead, unreadCount } = useNotifications(20);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
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
          notifications.map((notif) => (
            <NotificationItem
              key={notif._id}
              notification={notif}
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
              router.push("/notifications");
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
```

### 6.4 Composant NotificationItem

**Fichier:** `app/components/notifications/NotificationItem.tsx`

```tsx
"use client";

import {
  Bell,
  Calendar,
  CreditCard,
  Star,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Wallet,
  User,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

// Mapping type → icône et couleur
const typeConfig: Record<string, { icon: any; color: string }> = {
  new_mission: { icon: Calendar, color: "bg-blue-100 text-blue-600" },
  mission_accepted: { icon: CheckCircle, color: "bg-green-100 text-green-600" },
  mission_refused: { icon: XCircle, color: "bg-red-100 text-red-600" },
  mission_confirmed: { icon: CheckCircle, color: "bg-purple-100 text-purple-600" },
  mission_started: { icon: Clock, color: "bg-amber-100 text-amber-600" },
  mission_completed: { icon: CheckCircle, color: "bg-green-100 text-green-600" },
  mission_cancelled: { icon: XCircle, color: "bg-slate-100 text-slate-600" },
  payment_authorized: { icon: CreditCard, color: "bg-blue-100 text-blue-600" },
  payment_captured: { icon: Wallet, color: "bg-green-100 text-green-600" },
  payout_sent: { icon: Wallet, color: "bg-emerald-100 text-emerald-600" },
  review_received: { icon: Star, color: "bg-yellow-100 text-yellow-600" },
  new_message: { icon: MessageSquare, color: "bg-blue-100 text-blue-600" },
  welcome: { icon: User, color: "bg-purple-100 text-purple-600" },
  reminder: { icon: Bell, color: "bg-orange-100 text-orange-600" },
  system: { icon: Bell, color: "bg-slate-100 text-slate-600" },
};

interface NotificationItemProps {
  notification: {
    _id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: number;
    linkUrl?: string;
  };
  onClick: () => void;
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const config = typeConfig[notification.type] || typeConfig.system;
  const Icon = config.icon;

  const timeAgo = formatDistanceToNow(notification.createdAt, {
    addSuffix: true,
    locale: fr,
  });

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 ${
        !notification.isRead ? "bg-primary/5" : ""
      }`}
    >
      <div className="flex gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`font-medium text-sm ${!notification.isRead ? "text-slate-900" : "text-slate-700"}`}>
              {notification.title}
            </p>
            {!notification.isRead && (
              <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
            )}
          </div>
          <p className="text-sm text-slate-500 line-clamp-2 mt-0.5">
            {notification.message}
          </p>
          <p className="text-xs text-slate-400 mt-1">{timeAgo}</p>
        </div>
      </div>
    </button>
  );
}
```

---

## Phase 7: Utilisation dans les mutations

### Exemple: Accepter une mission

**Dans:** `convex/missions/mutations.ts`

```typescript
import { notifyMissionAccepted } from "../lib/notificationTemplates";

export const accept = mutation({
  args: {
    sessionToken: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    // ... validation session ...
    // ... mise à jour mission ...

    // Envoyer la notification au client (async via QStash)
    await notifyMissionAccepted({
      clientId: mission.clientId,
      announcerName: `${announcer.firstName}`,
      serviceName: mission.serviceName,
      missionId: mission._id,
    });

    return { success: true };
  },
});
```

---

## Checklist d'implémentation

### Phase 1: Admin QStash
- [x] Ajouter section QStash dans `integrations/page.tsx`
- [x] Créer action `testQStashConnection` dans `convex/admin/config.ts`
- [x] Installer `@upstash/qstash`

### Phase 2: Schema
- [x] Ajouter table `notifications` au schema
- [x] Run `bunx convex dev` pour générer les types

### Phase 3: Backend
- [x] Créer `convex/notifications/mutations.ts`
- [x] Créer `convex/notifications/queries.ts`
- [x] Créer/mettre à jour `convex/crons.ts`

### Phase 4: API
- [x] Créer `app/api/notifications/create/route.ts`

### Phase 5: Helpers
- [x] Créer `convex/lib/qstash.ts`
- [x] Créer `convex/lib/notificationTemplates.ts`

### Phase 6: Frontend
- [x] Créer `app/hooks/useNotifications.ts`
- [x] Créer `app/components/notifications/NotificationBell.tsx`
- [x] Créer `app/components/notifications/NotificationList.tsx`
- [x] Créer `app/components/notifications/NotificationItem.tsx`
- [ ] Intégrer `NotificationBell` dans le header (a faire manuellement)

### Phase 7: Intégration
- [ ] Ajouter notifications dans les mutations de missions
- [ ] Ajouter notifications dans les webhooks Stripe
- [ ] Tester le flow complet

---

## Variables d'environnement requises

```env
# QStash
QSTASH_TOKEN=eyJVc2VySUQi...
QSTASH_CURRENT_SIGNING_KEY=sig_...
QSTASH_NEXT_SIGNING_KEY=sig_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Guide rapide : Ajouter une nouvelle notification

### 1. Utiliser un template existant

```typescript
// Dans une mutation Convex (ex: convex/missions/mutations.ts)
import { notifyMissionAccepted } from "../lib/notificationTemplates";

// Dans le handler de la mutation:
await notifyMissionAccepted({
  clientId: mission.clientId,
  announcerName: announcer.firstName,
  serviceName: mission.serviceName,
  missionId: mission._id,
});
```

### 2. Creer une notification custom

```typescript
import { queueNotification } from "../lib/qstash";

await queueNotification({
  userId: userId as string,
  type: "system",  // ou un type existant
  title: "Titre de la notification",
  message: "Contenu du message",
  linkType: "mission",  // optionnel
  linkId: missionId,    // optionnel
  linkUrl: "/dashboard", // optionnel
  metadata: { custom: "data" }, // optionnel
});
```

### 3. Ajouter un nouveau type de notification

1. Ajouter le type dans `convex/schema.ts` (table notifications, champ type)
2. Ajouter le mapping icone/couleur dans `NotificationItem.tsx`
3. Creer un template dans `convex/lib/notificationTemplates.ts`

### 4. Integrer NotificationBell dans le header

```tsx
import { NotificationBell } from "@/app/components/notifications";

// Dans ton header:
<NotificationBell />
```

---

## Fichiers crees

```
convex/
├── schema.ts                    # Table notifications ajoutee
├── crons.ts                     # Cron cleanup ajoute
├── notifications/
│   ├── index.ts
│   ├── mutations.ts             # create, markAsRead, markAllAsRead, delete
│   └── queries.ts               # list, unreadCount, get, listByType
└── lib/
    ├── qstash.ts                # queueNotification, queueDelayedNotification
    └── notificationTemplates.ts # Templates prets a l'emploi

app/
├── api/notifications/create/
│   └── route.ts                 # Endpoint QStash
├── hooks/
│   └── useNotifications.ts      # Hook React
├── components/notifications/
│   ├── index.ts
│   ├── NotificationBell.tsx     # Cloche avec compteur
│   ├── NotificationList.tsx     # Liste dropdown
│   └── NotificationItem.tsx     # Item individuel
└── admin/(dashboard)/integrations/
    └── page.tsx                 # Section QStash ajoutee
```
