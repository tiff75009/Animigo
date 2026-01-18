"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// Intervalle de heartbeat (30 secondes)
const HEARTBEAT_INTERVAL_MS = 30 * 1000;

export function DevPresenceBeacon() {
  const devKey = process.env.NEXT_PUBLIC_DEV_KEY;
  const heartbeatMutation = useMutation(api.admin.devPresence.heartbeat);
  const disconnectMutation = useMutation(api.admin.devPresence.disconnect);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasConnectedRef = useRef(false);

  useEffect(() => {
    // Ne s'exécute qu'en mode développement avec une clé valide
    if (process.env.NODE_ENV !== "development" || !devKey) {
      return;
    }

    const sendHeartbeat = async () => {
      try {
        const result = await heartbeatMutation({
          devKey,
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        });
        if (result.success && !hasConnectedRef.current) {
          console.log(`[DevPresence] Connecté en tant que ${result.devName}`);
          hasConnectedRef.current = true;
        }
      } catch (error) {
        console.error("[DevPresence] Erreur heartbeat:", error);
      }
    };

    // Envoyer le premier heartbeat immédiatement
    sendHeartbeat();

    // Configurer l'intervalle pour les heartbeats suivants
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    // Gérer la fermeture de la page
    const handleUnload = () => {
      // Essayer d'envoyer une déconnexion (pas garanti d'aboutir)
      disconnectMutation({ devKey }).catch(() => {});
    };

    // Gérer la visibilité de la page (pause/resume)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Envoyer un heartbeat immédiat quand la page redevient visible
        sendHeartbeat();
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener("beforeunload", handleUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // Envoyer une déconnexion au démontage
      disconnectMutation({ devKey }).catch(() => {});
    };
  }, [devKey, heartbeatMutation, disconnectMutation]);

  // Ce composant ne rend rien
  return null;
}
