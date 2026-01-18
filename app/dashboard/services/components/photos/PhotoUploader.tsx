"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface PhotoUploaderProps {
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  maxSizeMB?: number;
  acceptedFormats?: string[];
}

export default function PhotoUploader({
  onUpload,
  isUploading,
  maxSizeMB = 5,
  acceptedFormats = ["image/jpeg", "image/png", "image/webp"],
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!isUploading) {
      inputRef.current?.click();
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`Le fichier dépasse ${maxSizeMB}MB`);
      return;
    }

    // Check file type
    if (!acceptedFormats.includes(file.type)) {
      alert("Format non supporté. Utilisez JPG, PNG ou WebP.");
      return;
    }

    await onUpload(file);

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <motion.div
      onClick={handleClick}
      className={cn(
        "relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all",
        isUploading
          ? "border-primary/50 bg-primary/5"
          : "border-foreground/20 hover:border-primary/50 hover:bg-primary/5"
      )}
      whileHover={{ scale: isUploading ? 1 : 1.01 }}
      whileTap={{ scale: isUploading ? 1 : 0.99 }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptedFormats.join(",")}
        onChange={handleChange}
        className="hidden"
        disabled={isUploading}
      />

      <div className="flex flex-col items-center gap-4">
        <div
          className={cn(
            "p-4 rounded-full",
            isUploading ? "bg-primary/10" : "bg-foreground/5"
          )}
        >
          {isUploading ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-text-light" />
          )}
        </div>

        <div>
          <p className="font-medium text-foreground">
            {isUploading ? "Téléversement en cours..." : "Ajouter une photo"}
          </p>
          <p className="text-sm text-text-light mt-1">
            {isUploading
              ? "Veuillez patienter"
              : `Cliquez ou glissez une image (max ${maxSizeMB}MB)`}
          </p>
        </div>

        {!isUploading && (
          <div className="flex items-center gap-2 text-xs text-text-light">
            <ImageIcon className="w-4 h-4" />
            <span>JPG, PNG, WebP</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
