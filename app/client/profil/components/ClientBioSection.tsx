"use client";

import { useState, memo, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Save, Loader2 } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface ClientBioSectionProps {
  description: string | null;
  onSave: (description: string | null) => Promise<{ success: boolean }>;
  isSaving: boolean;
}

const MAX_CHARS = 500;

function ClientBioSection({
  description,
  onSave,
  isSaving,
}: ClientBioSectionProps) {
  const [value, setValue] = useState(description || "");
  const [hasChanges, setHasChanges] = useState(false);

  // Reset when description changes from parent
  useEffect(() => {
    setValue(description || "");
    setHasChanges(false);
  }, [description]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= MAX_CHARS) {
      setValue(newValue);
      setHasChanges(newValue !== (description || ""));
    }
  }, [description]);

  const handleSave = useCallback(async () => {
    const result = await onSave(value.trim() || null);
    if (result.success) {
      setHasChanges(false);
    }
  }, [value, onSave]);

  const charsRemaining = MAX_CHARS - value.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-foreground/5"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              A propos de moi
            </h3>
            <p className="text-sm text-text-light">
              Parlez un peu de vous et de vos animaux
            </p>
          </div>
        </div>
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={value}
          onChange={handleChange}
          placeholder="Présentez-vous en quelques mots... Parlez de vos animaux, de ce que vous recherchez comme services, etc."
          rows={4}
          className={cn(
            "w-full px-4 py-3 rounded-xl border-2 bg-white text-foreground",
            "placeholder:text-text-light/60 resize-none",
            "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10",
            "transition-all duration-200"
          )}
        />

        {/* Character counter */}
        <div className="absolute bottom-3 right-3 text-xs text-text-light">
          <span className={cn(charsRemaining < 50 && "text-amber-500", charsRemaining < 20 && "text-red-500")}>
            {charsRemaining}
          </span>
          /{MAX_CHARS}
        </div>
      </div>

      {/* Save button */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex justify-end"
        >
          <motion.button
            onClick={handleSave}
            disabled={isSaving}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium",
              "bg-primary text-white hover:bg-primary/90 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Sauvegarder
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}

export default memo(ClientBioSection);
