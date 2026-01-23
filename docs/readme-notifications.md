# Systeme de Notifications Animigo

## Architecture

```
┌─────────────────┐     ┌─────────────┐     ┌─────────────────┐
│  Ta Feature     │────▶│   QStash    │────▶│  API Webhook    │
│  (action)       │     │  (async)    │     │  /api/notif...  │
└─────────────────┘     └─────────────┘     └────────┬────────┘
                                                     │
                                                     ▼
┌─────────────────┐     ┌─────────────┐     ┌─────────────────┐
│  Interface      │◀────│   Convex    │◀────│  createFromWeb  │
│  (cloche)       │     │  (realtime) │     │  hook mutation  │
└─────────────────┘     └─────────────┘     └─────────────────┘
```

**Toujours utiliser QStash** pour envoyer les notifications. Cela permet :
- De ne pas bloquer la mutation/action appelante
- D'avoir des retries automatiques en cas d'echec
- De scaler sans surcharger Convex

---

## Implementation

### Etape 1 : Creer une action pour ta feature

Les notifications doivent etre envoyees depuis une **action** Convex (pas une mutation) car les actions peuvent faire des appels HTTP.

```typescript
// convex/missions/actions.ts
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

export const acceptMission = action({
  args: {
    sessionToken: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    // 1. Executer ta logique metier via une mutation interne
    const result = await ctx.runMutation(internal.missions.mutations.accept, {
      sessionToken: args.sessionToken,
      missionId: args.missionId,
    });

    // 2. Envoyer la notification via QStash
    await sendNotification(ctx, {
      userId: result.clientId,
      type: "mission_accepted",
      title: "Demande acceptee !",
      message: `${result.announcerName} a accepte votre demande`,
      linkUrl: `/client/reservations/${args.missionId}`,
    });

    return result;
  },
});

// Fonction helper pour envoyer une notification
async function sendNotification(
  ctx: any,
  notification: {
    userId: string;
    type: string;
    title: string;
    message: string;
    linkUrl?: string;
    linkType?: string;
    metadata?: any;
  }
) {
  // Recuperer la config QStash
  const qstashConfig = await ctx.runQuery(
    internal.notifications.queries.getQStashConfig
  );

  if (!qstashConfig.token || !qstashConfig.appUrl) {
    console.error("QStash non configure");
    return;
  }

  const destinationUrl = `${qstashConfig.appUrl}/api/notifications/create`;

  const response = await fetch(
    `https://qstash.upstash.io/v2/publish/${destinationUrl}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${qstashConfig.token}`,
        "Content-Type": "application/json",
        "Upstash-Retries": "3",
      },
      body: JSON.stringify(notification),
    }
  );

  if (!response.ok) {
    console.error("Erreur QStash:", await response.text());
  }
}
```

### Etape 2 : Appeler l'action depuis le frontend

```typescript
// Dans ton composant React
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

const acceptMission = useAction(api.missions.actions.acceptMission);

const handleAccept = async () => {
  await acceptMission({
    sessionToken: token,
    missionId: mission._id,
  });
  // La notification est envoyee automatiquement
};
```

---

## Helper reutilisable (recommande)

Pour eviter de dupliquer le code, cree un helper dans `convex/lib/notifications.ts` :

```typescript
// convex/lib/notifications.ts
import { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";

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
  linkUrl?: string;
  linkType?: string;
  linkId?: string;
  metadata?: Record<string, unknown>;
}

export async function sendNotification(
  ctx: ActionCtx,
  notification: NotificationPayload
): Promise<boolean> {
  try {
    const qstashConfig = await ctx.runQuery(
      internal.notifications.queries.getQStashConfig
    );

    if (!qstashConfig.token || !qstashConfig.appUrl) {
      console.error("QStash non configure - notification ignoree");
      return false;
    }

    const destinationUrl = `${qstashConfig.appUrl}/api/notifications/create`;

    const response = await fetch(
      `https://qstash.upstash.io/v2/publish/${destinationUrl}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${qstashConfig.token}`,
          "Content-Type": "application/json",
          "Upstash-Retries": "3",
        },
        body: JSON.stringify(notification),
      }
    );

    if (!response.ok) {
      console.error("Erreur QStash:", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Erreur envoi notification:", error);
    return false;
  }
}
```

Puis utilise-le dans tes actions :

```typescript
// convex/missions/actions.ts
import { sendNotification } from "../lib/notifications";

export const acceptMission = action({
  // ...
  handler: async (ctx, args) => {
    const result = await ctx.runMutation(/* ... */);

    await sendNotification(ctx, {
      userId: result.clientId,
      type: "mission_accepted",
      title: "Demande acceptee !",
      message: `${result.announcerName} a accepte votre demande`,
      linkUrl: `/client/reservations/${args.missionId}`,
    });

    return result;
  },
});
```

---

## Types de notifications disponibles

| Type | Usage |
|------|-------|
| `new_mission` | Nouvelle demande de reservation |
| `mission_accepted` | Demande acceptee par l'annonceur |
| `mission_refused` | Demande refusee |
| `mission_confirmed` | Mission confirmee (paiement ok) |
| `mission_started` | Mission demarree |
| `mission_completed` | Mission terminee |
| `mission_cancelled` | Mission annulee |
| `payment_authorized` | Paiement autorise |
| `payment_captured` | Paiement capture (argent recu) |
| `payout_sent` | Virement envoye a l'annonceur |
| `review_received` | Nouvel avis recu |
| `new_message` | Nouveau message |
| `welcome` | Bienvenue (inscription) |
| `reminder` | Rappel |
| `system` | Notification systeme |

---

## Structure d'une notification

```typescript
{
  userId: string,             // ID Convex du destinataire
  type: NotificationType,     // Type (voir tableau ci-dessus)
  title: string,              // Titre court
  message: string,            // Message descriptif
  linkUrl?: string,           // URL de redirection au clic
  linkType?: string,          // Type de lien pour icone
  linkId?: string,            // ID de l'entite liee
  metadata?: object,          // Donnees supplementaires
}
```

---

## Interface utilisateur (la cloche)

### Emplacement actuel

Le composant de notification (cloche) se trouve dans :
```
app/components/platform/SearchHeader.tsx (ligne ~140)
```

### Hook pour les notifications

```typescript
import { useNotifications } from "@/app/hooks/useNotifications";

const {
  notifications,      // Liste des notifications
  unreadCount,        // Nombre de non lues
  isLoading,          // Chargement en cours
  markAsRead,         // Marquer une notif comme lue
  markAllAsRead,      // Marquer toutes comme lues
  deleteNotification, // Supprimer une notification
} = useNotifications(50); // Limite optionnelle
```

### Reutiliser la cloche ailleurs

Pour ajouter la cloche dans un autre endroit :

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Trash2 } from "lucide-react";
import { useNotifications } from "@/app/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications(50);

  // Fermer au clic exterieur + marquer comme lu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        if (isOpen && unreadCount > 0) {
          markAllAsRead();
        }
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, unreadCount, markAllAsRead]);

  const displayedNotifications = notifications.slice(0, 5);

  return (
    <div ref={ref} className="relative">
      {/* Bouton cloche */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <span className="font-semibold text-gray-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs text-gray-500">
                  {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Liste */}
            <div className="max-h-80 overflow-y-auto">
              {displayedNotifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Aucune notification
                </div>
              ) : (
                displayedNotifications.map((notif) => (
                  <div
                    key={notif._id}
                    className={`p-4 border-b border-gray-50 hover:bg-gray-50 group ${
                      !notif.isRead ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notif.isRead ? "font-semibold" : ""}`}>
                          {notif.title}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {notif.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(notif.createdAt, {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteNotification(notif._id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 5 && (
              <div className="p-3 bg-gray-50 text-center">
                <a href="/client/notifications" className="text-sm text-blue-600 hover:underline">
                  Voir toutes les notifications
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

---

## Fichiers cles

| Fichier | Description |
|---------|-------------|
| `convex/notifications/mutations.ts` | Mutations (createFromWebhook, markAsRead...) |
| `convex/notifications/queries.ts` | Queries (list, unreadCount, getQStashConfig) |
| `convex/notifications/actions.ts` | Action de test QStash |
| `convex/lib/notifications.ts` | Helper sendNotification (a creer) |
| `app/api/notifications/create/route.ts` | Webhook API recevant les appels QStash |
| `app/hooks/useNotifications.ts` | Hook React pour l'interface |
| `app/components/platform/SearchHeader.tsx` | Composant avec la cloche |
| `app/client/notifications/page.tsx` | Page liste complete |
| `app/admin/(dashboard)/dev-test/page.tsx` | Page admin pour tester |

---

## Configuration requise

### Admin > Integrations

- **QStash Token** : Token API depuis [console.upstash.com](https://console.upstash.com)
- **URL de l'application** : URL publique (ex: `https://animigo.fr`)

### Variables d'environnement (optionnel)

```bash
# Pour la verification de signature QStash (securite supplementaire)
QSTASH_CURRENT_SIGNING_KEY=sig_xxx
QSTASH_NEXT_SIGNING_KEY=sig_xxx
```

---

## Test des notifications

1. Aller sur `/admin/dev-test`
2. Rechercher un utilisateur
3. Choisir le type de notification
4. Selectionner **Via QStash**
5. Envoyer

**Pour tester en local :**
```bash
ngrok http 3000
# Copier l'URL ngrok (ex: https://abc123.ngrok.io)
# La mettre dans Admin > Integrations > URL de l'application
```

---

## Retention

Les notifications sont automatiquement supprimees apres **30 jours** via un cron job Convex (`convex/crons.ts`).
