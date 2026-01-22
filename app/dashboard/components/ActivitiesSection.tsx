"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Plus,
  X,
  Edit,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";

interface SelectedActivity {
  activityId: Id<"activities">;
  customDescription?: string;
}

interface Activity {
  _id: Id<"activities">;
  name: string;
  emoji: string;
  description?: string;
  order: number;
  isActive: boolean;
}

interface ActivitiesSectionProps {
  token: string | null;
  selectedActivities: SelectedActivity[] | undefined;
  onUpdate: (activities: SelectedActivity[]) => Promise<void>;
}

export default function ActivitiesSection({
  token,
  selectedActivities = [],
  onUpdate,
}: ActivitiesSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<Id<"activities"> | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Récupérer les activités disponibles
  const availableActivities = useQuery(api.services.activities.getActiveActivities);

  // Activités non encore sélectionnées
  const unselectedActivities = availableActivities?.filter(
    (activity: Activity) => !selectedActivities.some((sa) => sa.activityId === activity._id)
  ) || [];

  // Ajouter une activité
  const handleAddActivity = useCallback(async (activityId: Id<"activities">) => {
    setIsSaving(true);
    try {
      const newActivities = [
        ...selectedActivities,
        { activityId, customDescription: undefined },
      ];
      await onUpdate(newActivities);
      setIsAdding(false);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsSaving(false);
    }
  }, [selectedActivities, onUpdate]);

  // Supprimer une activité
  const handleRemoveActivity = useCallback(async (activityId: Id<"activities">) => {
    setIsSaving(true);
    try {
      const newActivities = selectedActivities.filter(
        (sa) => sa.activityId !== activityId
      );
      await onUpdate(newActivities);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsSaving(false);
    }
  }, [selectedActivities, onUpdate]);

  // Commencer l'édition de la description
  const startEditDescription = (activityId: Id<"activities">, currentDescription?: string) => {
    setEditingId(activityId);
    setEditDescription(currentDescription || "");
  };

  // Sauvegarder la description
  const saveDescription = useCallback(async () => {
    if (!editingId) return;
    setIsSaving(true);
    try {
      const newActivities = selectedActivities.map((sa) =>
        sa.activityId === editingId
          ? { ...sa, customDescription: editDescription.trim() || undefined }
          : sa
      );
      await onUpdate(newActivities);
      setEditingId(null);
      setEditDescription("");
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsSaving(false);
    }
  }, [editingId, editDescription, selectedActivities, onUpdate]);

  // Annuler l'édition
  const cancelEdit = () => {
    setEditingId(null);
    setEditDescription("");
  };

  // Trouver les infos d'une activité
  const getActivityInfo = (activityId: Id<"activities">): Activity | undefined => {
    return availableActivities?.find((a: Activity) => a._id === activityId);
  };

  if (!availableActivities) {
    return (
      <div className="bg-white rounded-3xl shadow-lg p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-3xl shadow-lg p-6 overflow-hidden"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Activités proposées
        </h3>
        {selectedActivities.length === 0 && (
          <span className="text-xs text-amber-500 bg-amber-50 px-2 py-1 rounded-full">
            Aucune activité
          </span>
        )}
      </div>

      <LayoutGroup>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {/* Activités sélectionnées */}
            {selectedActivities.map((sa, index) => {
              const activity = getActivityInfo(sa.activityId);
              if (!activity) return null;

              const isEditing = editingId === sa.activityId;

              return (
                <motion.div
                  key={sa.activityId}
                  layout
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                    delay: index * 0.05,
                  }}
                  className="group relative flex items-start gap-4 p-4 bg-background rounded-xl hover:bg-primary/5 transition-colors"
                >
                  {/* Bouton supprimer */}
                  <button
                    onClick={() => handleRemoveActivity(sa.activityId)}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Emoji */}
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                    {activity.emoji}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{activity.name}</p>
                      {!isEditing && (
                        <button
                          onClick={() => startEditDescription(sa.activityId, sa.customDescription || activity.description)}
                          className="p-1 text-foreground/40 hover:text-primary rounded transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Décrivez cette activité..."
                          rows={2}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-foreground/20 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={saveDescription}
                            disabled={isSaving}
                            className="flex items-center gap-1 px-3 py-1 bg-primary text-white text-xs rounded-lg font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                          >
                            {isSaving ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            Enregistrer
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-1 text-foreground/60 text-xs rounded-lg font-medium hover:bg-foreground/10 transition-colors"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-text-light">
                        {sa.customDescription || activity.description || (
                          <span className="italic text-foreground/40">
                            Cliquez sur le crayon pour ajouter une description
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* Bouton Ajouter */}
            <motion.div
              layout
              key="add-button"
              className="relative"
            >
              <AnimatePresence mode="wait">
                {isAdding ? (
                  <motion.div
                    key="selector"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="p-4 bg-primary/5 rounded-xl border-2 border-dashed border-primary/30"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-foreground">
                        Choisir une activité
                      </p>
                      <button
                        onClick={() => setIsAdding(false)}
                        className="p-1 text-foreground/40 hover:text-foreground rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {unselectedActivities.length === 0 ? (
                      <p className="text-sm text-text-light text-center py-4">
                        Toutes les activités ont été ajoutées !
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {unselectedActivities.map((activity: Activity) => (
                          <button
                            key={activity._id}
                            onClick={() => handleAddActivity(activity._id)}
                            disabled={isSaving}
                            className="w-full flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-primary/5 transition-colors text-left disabled:opacity-50"
                          >
                            <span className="text-xl">{activity.emoji}</span>
                            <span className="font-medium text-sm text-foreground">
                              {activity.name}
                            </span>
                            {isSaving && (
                              <Loader2 className="w-4 h-4 animate-spin ml-auto" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.button
                    key="add-btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsAdding(true)}
                    disabled={unselectedActivities.length === 0}
                    className="w-full flex items-center justify-center gap-3 p-4 bg-primary/5 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                      <Plus className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-medium text-primary">
                      {unselectedActivities.length === 0
                        ? "Toutes les activités ajoutées"
                        : "Ajouter une activité"}
                    </span>
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>
      </LayoutGroup>

      {/* Info si aucune activité */}
      {selectedActivities.length === 0 && !isAdding && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-text-light text-center mt-4"
        >
          Ajoutez des activités pour montrer aux clients ce que vous proposez
        </motion.p>
      )}
    </motion.div>
  );
}
