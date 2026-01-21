"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface EditableFieldProps {
  value: string;
  placeholder?: string;
  onSave: (value: string) => Promise<void>;
  type?: "text" | "textarea";
  label?: string;
  className?: string;
  textClassName?: string;
  maxLength?: number;
  minRows?: number;
  maxRows?: number;
  disabled?: boolean;
}

export default function EditableField({
  value,
  placeholder = "Ajouter...",
  onSave,
  type = "text",
  label,
  className,
  textClassName,
  maxLength,
  minRows = 3,
  maxRows = 6,
  disabled = false,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Synchroniser la valeur quand elle change de l'extérieur
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // Focus sur l'input quand on passe en mode édition
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Placer le curseur à la fin
      if (inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.selectionStart = inputRef.current.value.length;
      }
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(value);
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value);
    setError(null);
  };

  const handleSave = async () => {
    // Ne rien faire si la valeur n'a pas changé
    if (editValue.trim() === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(editValue.trim());
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel();
    }
    if (e.key === "Enter" && type === "text") {
      e.preventDefault();
      handleSave();
    }
    // Ctrl+Enter pour sauvegarder dans textarea
    if (e.key === "Enter" && e.ctrlKey && type === "textarea") {
      e.preventDefault();
      handleSave();
    }
  };

  const isEmpty = !value || value.trim() === "";

  return (
    <div className={cn("group relative", className)}>
      {label && (
        <label className="block text-xs font-medium text-gray-500 mb-1">
          {label}
        </label>
      )}

      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="editing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="relative">
              {type === "textarea" ? (
                <textarea
                  ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm",
                    "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                    "resize-none transition-all",
                    error && "border-red-300 focus:ring-red-200 focus:border-red-400",
                    textClassName
                  )}
                  rows={minRows}
                  maxLength={maxLength}
                  disabled={isSaving}
                  style={{ minHeight: `${minRows * 1.5}rem`, maxHeight: `${maxRows * 1.5}rem` }}
                />
              ) : (
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm",
                    "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                    "transition-all",
                    error && "border-red-300 focus:ring-red-200 focus:border-red-400",
                    textClassName
                  )}
                  maxLength={maxLength}
                  disabled={isSaving}
                />
              )}

              {/* Compteur de caractères */}
              {maxLength && (
                <span className="absolute bottom-2 right-2 text-xs text-gray-400">
                  {editValue.length}/{maxLength}
                </span>
              )}
            </div>

            {/* Message d'erreur */}
            {error && (
              <p className="mt-1 text-xs text-red-500">{error}</p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-2">
              <motion.button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg",
                  "bg-primary text-white hover:bg-primary/90",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-colors"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Enregistrer
              </motion.button>
              <motion.button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg",
                  "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-colors"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <X className="w-4 h-4" />
                Annuler
              </motion.button>
              {type === "textarea" && (
                <span className="text-xs text-gray-400 ml-auto">
                  Ctrl+Entrée pour sauvegarder
                </span>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="display"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="relative"
          >
            <div
              onClick={handleStartEdit}
              className={cn(
                "cursor-pointer rounded-lg transition-colors",
                !disabled && "hover:bg-gray-50",
                isEmpty && "py-2"
              )}
            >
              <p
                className={cn(
                  "text-sm leading-relaxed",
                  isEmpty ? "text-gray-400 italic" : "text-gray-700",
                  textClassName
                )}
              >
                {isEmpty ? placeholder : value}
              </p>
            </div>

            {/* Bouton éditer (visible au hover) */}
            {!disabled && (
              <motion.button
                type="button"
                onClick={handleStartEdit}
                className={cn(
                  "absolute top-0 right-0 p-1.5 rounded-lg",
                  "bg-white shadow-sm border border-gray-200",
                  "opacity-0 group-hover:opacity-100 transition-opacity",
                  "hover:bg-gray-50"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Modifier"
              >
                <Pencil className="w-3.5 h-3.5 text-gray-500" />
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
