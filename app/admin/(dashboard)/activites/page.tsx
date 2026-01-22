"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  GripVertical,
  Check,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

interface ActivityFormData {
  name: string;
  emoji: string;
  description: string;
}

// Type pour une activité depuis la query
type Activity = {
  _id: Id<"activities">;
  _creationTime: number;
  name: string;
  emoji: string;
  description?: string;
  order: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

// Emojis suggérés pour les activités
const SUGGESTED_EMOJIS = [
  "🚶", "🏃", "🎾", "🤗", "📸", "🛁", "✂️", "💊", "🍖", "🎮",
  "🏠", "🚗", "🌳", "☀️", "🌙", "🎵", "🧸", "🦴", "🐾", "❤️",
];

export default function ActivitiesPage() {
  const { token } = useAdminAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<Id<"activities"> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<Id<"activities"> | null>(null);

  // Form state
  const [formData, setFormData] = useState<ActivityFormData>({
    name: "",
    emoji: "🎯",
    description: "",
  });

  // Queries
  const activities = useQuery(
    api.services.activities.getAllActivities,
    token ? { token } : "skip"
  );

  // Mutations
  const createActivity = useMutation(api.services.activities.createActivity);
  const updateActivity = useMutation(api.services.activities.updateActivity);
  const deleteActivity = useMutation(api.services.activities.deleteActivity);
  const reorderActivities = useMutation(api.services.activities.reorderActivities);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      emoji: "🎯",
      description: "",
    });
    setIsAdding(false);
    setEditingId(null);
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!token || !formData.name.trim() || !formData.emoji) return;

    setIsSaving(true);
    try {
      if (editingId) {
        await updateActivity({
          token,
          activityId: editingId,
          name: formData.name.trim(),
          emoji: formData.emoji,
          description: formData.description.trim() || null,
        });
      } else {
        await createActivity({
          token,
          name: formData.name.trim(),
          emoji: formData.emoji,
          description: formData.description.trim() || undefined,
        });
      }
      resetForm();
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle edit
  const handleEdit = (activity: Activity) => {
    setFormData({
      name: activity.name,
      emoji: activity.emoji,
      description: activity.description || "",
    });
    setEditingId(activity._id);
    setIsAdding(true);
  };

  // Handle delete
  const handleDelete = async (activityId: Id<"activities">) => {
    if (!token) return;
    setDeletingId(activityId);
    try {
      await deleteActivity({ token, activityId });
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setDeletingId(null);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (activity: Activity) => {
    if (!token) return;
    try {
      await updateActivity({
        token,
        activityId: activity._id,
        isActive: !activity.isActive,
      });
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  // Handle move up/down
  const handleMove = async (index: number, direction: "up" | "down") => {
    if (!token || !activities) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= activities.length) return;

    const newOrder = [...activities];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];

    try {
      await reorderActivities({
        token,
        orderedIds: newOrder.map((a) => a._id),
      });
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  if (!activities) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-blue-500" />
            Activités proposables
          </h1>
          <p className="text-slate-400 mt-1">
            Gérez les activités que les annonceurs peuvent sélectionner
          </p>
        </div>
        <motion.button
          onClick={() => {
            resetForm();
            setIsAdding(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-5 h-5" />
          Nouvelle activité
        </motion.button>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {(isAdding || editingId) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-slate-800 rounded-xl p-6 mb-6 border border-slate-700"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? "Modifier l'activité" : "Nouvelle activité"}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Nom *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Promenades quotidiennes"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Emoji */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Emoji *
                </label>
                <input
                  type="text"
                  value={formData.emoji}
                  onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-2xl text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  maxLength={2}
                />
              </div>
            </div>

            {/* Emojis suggérés */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Emojis suggérés
              </label>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData({ ...formData, emoji })}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg text-xl transition-all ${
                      formData.emoji === emoji
                        ? "bg-blue-500 ring-2 ring-blue-400"
                        : "bg-slate-900 hover:bg-slate-700 border border-slate-700"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Description par défaut (optionnel)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description affichée si l'annonceur n'en fournit pas"
                rows={2}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <motion.button
                onClick={handleSubmit}
                disabled={isSaving || !formData.name.trim() || !formData.emoji}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                {editingId ? "Enregistrer" : "Créer"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activities List */}
      {activities.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 text-center border border-slate-700">
          <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Aucune activité</h3>
          <p className="text-slate-400 mb-4">
            Commencez par ajouter des activités que les annonceurs pourront proposer.
          </p>
          <motion.button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-5 h-5" />
            Ajouter une activité
          </motion.button>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 p-4 border-b border-slate-700 bg-slate-900/50">
            <div className="w-10"></div>
            <p className="text-sm font-medium text-slate-400">Activité</p>
            <p className="text-sm font-medium text-slate-400">Description</p>
            <p className="text-sm font-medium text-slate-400 w-32 text-center">Actions</p>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-700">
            {activities.map((activity: Activity, index: number) => (
              <motion.div
                key={activity._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`grid grid-cols-[auto_1fr_1fr_auto] gap-4 p-4 items-center transition-colors ${
                  activity.isActive ? "bg-slate-800" : "bg-slate-800/50"
                }`}
              >
                {/* Emoji */}
                <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-2xl">
                  {activity.emoji}
                </div>

                {/* Nom */}
                <div className="flex items-center gap-3">
                  <span className={`font-medium ${activity.isActive ? "text-white" : "text-slate-500"}`}>
                    {activity.name}
                  </span>
                  {!activity.isActive && (
                    <span className="px-2 py-0.5 text-xs bg-slate-700 text-slate-400 rounded">
                      Inactif
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className={`text-sm truncate ${activity.isActive ? "text-slate-400" : "text-slate-600"}`}>
                  {activity.description || "—"}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-1 w-32 justify-end">
                  {/* Move Up */}
                  <button
                    onClick={() => handleMove(index, "up")}
                    disabled={index === 0}
                    className="p-2 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Monter"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>

                  {/* Move Down */}
                  <button
                    onClick={() => handleMove(index, "down")}
                    disabled={index === activities.length - 1}
                    className="p-2 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Descendre"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Toggle Active */}
                  <button
                    onClick={() => handleToggleActive(activity)}
                    className={`p-2 rounded-lg transition-colors ${
                      activity.isActive
                        ? "text-green-500 hover:bg-green-500/10"
                        : "text-slate-500 hover:bg-slate-700"
                    }`}
                    title={activity.isActive ? "Désactiver" : "Activer"}
                  >
                    {activity.isActive ? (
                      <ToggleRight className="w-5 h-5" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => handleEdit(activity)}
                    className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg"
                    title="Modifier"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => {
                      if (confirm("Supprimer cette activité ?")) {
                        handleDelete(activity._id);
                      }
                    }}
                    disabled={deletingId === activity._id}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg disabled:opacity-50"
                    title="Supprimer"
                  >
                    {deletingId === activity._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-3 p-4 bg-blue-500/10 rounded-xl mt-6 border border-blue-500/20">
        <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-300">
          <p className="font-medium">Comment ça fonctionne ?</p>
          <p className="mt-1 text-blue-400">
            Les activités que vous ajoutez ici seront disponibles pour les annonceurs dans leur fiche profil.
            Ils pourront les sélectionner et ajouter leur propre description personnalisée.
          </p>
        </div>
      </div>
    </div>
  );
}
