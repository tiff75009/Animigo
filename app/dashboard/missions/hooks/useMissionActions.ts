"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type ActionType = "accept" | "refuse" | "cancel";

interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Hook unifié pour les actions sur les missions
 * Centralise la gestion des états de loading/error pour toutes les mutations
 */
export function useMissionActions(token: string | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMissionId, setSelectedMissionId] = useState<Id<"missions"> | null>(null);

  // Mutations
  const acceptMutation = useMutation(api.planning.missions.acceptMission);
  const refuseMutation = useMutation(api.planning.missions.refuseMission);
  const cancelMutation = useMutation(api.planning.missions.cancelMission);

  /**
   * Exécute une action sur une mission
   */
  const executeAction = useCallback(async (
    action: ActionType,
    missionId: Id<"missions">,
    reason?: string
  ): Promise<ActionResult> => {
    if (!token) {
      return { success: false, error: "Non authentifié" };
    }

    setLoading(true);
    setError(null);

    try {
      switch (action) {
        case "accept":
          await acceptMutation({ token, missionId });
          break;
        case "refuse":
          await refuseMutation({ token, missionId, reason: reason || "" });
          break;
        case "cancel":
          await cancelMutation({ token, missionId, reason: reason || "" });
          break;
      }
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [token, acceptMutation, refuseMutation, cancelMutation]);

  /**
   * Accepter une mission
   */
  const accept = useCallback(async (missionId: Id<"missions">) => {
    return executeAction("accept", missionId);
  }, [executeAction]);

  /**
   * Refuser une mission
   */
  const refuse = useCallback(async (missionId: Id<"missions">, reason?: string) => {
    return executeAction("refuse", missionId, reason);
  }, [executeAction]);

  /**
   * Annuler une mission
   */
  const cancel = useCallback(async (missionId: Id<"missions">, reason?: string) => {
    return executeAction("cancel", missionId, reason);
  }, [executeAction]);

  /**
   * Réinitialiser l'erreur
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Sélectionner une mission (pour les modals)
   */
  const selectMission = useCallback((missionId: Id<"missions"> | null) => {
    setSelectedMissionId(missionId);
  }, []);

  return {
    // États
    loading,
    error,
    selectedMissionId,
    // Actions
    accept,
    refuse,
    cancel,
    executeAction,
    // Helpers
    clearError,
    selectMission,
  };
}
