"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, AlertTriangle, AlertCircle, Check, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/app/lib/utils";

interface ProfilTabProps {
  user: { firstName: string; lastName: string; email: string; username?: string } | null;
  token: string | null;
}

export function ProfilTab({ user, token }: ProfilTabProps) {
  const updateUserInfo = useMutation(api.auth.username.updateUserInfo);

  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phone: "",
    username: user?.username || "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [debouncedUsername, setDebouncedUsername] = useState(formData.username);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: "",
        username: user.username || "",
      });
      setDebouncedUsername(user.username || "");
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsername(formData.username);
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.username]);

  const usernameCheck = useQuery(
    api.auth.username.checkUsernameAvailability,
    debouncedUsername.trim().length >= 3 && debouncedUsername !== (user?.username || "")
      ? { username: debouncedUsername.trim() }
      : "skip"
  );

  const usernameIsOwn = debouncedUsername === (user?.username || "");
  const usernameIsValid = formData.username.trim().length >= 3 && (usernameIsOwn || usernameCheck?.available === true);
  const usernameIsTaken = formData.username.trim().length >= 3 && !usernameIsOwn && usernameCheck?.available === false && !usernameCheck?.error;

  const handleUsernameChange = (value: string) => {
    setFormData({ ...formData, username: value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30) });
  };

  const handleSave = async () => {
    if (!token) return;
    setIsSaving(true);
    setError("");
    try {
      await updateUserInfo({
        sessionToken: token,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        ...(formData.username.trim().length >= 3 ? { username: formData.username.trim() } : {}),
      });
      setSaved(true);
      setIsEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Informations personnelles</h2>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-primary font-medium text-sm hover:underline"
        >
          {isEditing ? "Annuler" : "Modifier"}
        </button>
      </div>

      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Prénom</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            ) : (
              <p className="text-foreground font-medium">{user?.firstName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Nom</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            ) : (
              <p className="text-foreground font-medium">{user?.lastName}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Nom d&apos;utilisateur</label>
          {isEditing ? (
            <div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">@</div>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="jeandupont"
                  maxLength={30}
                  className={cn(
                    "w-full pl-8 pr-10 py-2.5 border rounded-xl focus:outline-none focus:ring-2",
                    usernameIsValid
                      ? "border-green-300 focus:ring-green-200"
                      : usernameIsTaken
                      ? "border-red-300 focus:ring-red-200"
                      : "border-gray-200 focus:ring-primary/20 focus:border-primary"
                  )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameIsValid && <Check className="w-4 h-4 text-green-500" />}
                  {usernameIsTaken && <AlertCircle className="w-4 h-4 text-red-500" />}
                </div>
              </div>
              {usernameIsTaken && (
                <p className="text-xs text-red-500 mt-1">
                  Ce nom est déjà pris{usernameCheck?.suggestion ? `. Essayez : ${usernameCheck.suggestion}` : ""}
                </p>
              )}
            </div>
          ) : (
            <p className="text-foreground font-medium">
              {user?.username ? `@${user.username}` : <span className="text-gray-400 italic">Non défini</span>}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-400" />
            <p className="text-foreground">{user?.email}</p>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
              Vérifié
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        )}

        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2"
          >
            <Check className="w-5 h-5" />
            Modifications enregistrées
          </motion.div>
        )}

        {isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="pt-4 border-t border-gray-100"
          >
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Enregistrer
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
