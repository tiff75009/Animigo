"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X as XIcon, MapPin, User, MessageSquare, Copy, CheckCheck, Link2 } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileName: string;
  profileLastInitial: string;
  profileImage?: string | null;
  location?: string | null;
}

export default function ShareModal({
  isOpen,
  onClose,
  profileName,
  profileLastInitial,
  profileImage,
  location,
}: ShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  const displayName = `${profileName} ${profileLastInitial}.`;
  const shareText = `Découvre le profil de ${profileName} sur Animigo !`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => {
      setCopiedLink(false);
      onClose();
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="text-base font-bold text-gray-900">Partager le profil</h3>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XIcon className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Profil preview */}
            <div className="mx-5 mb-4 flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              {profileImage ? (
                <Image
                  src={profileImage}
                  alt={profileName}
                  width={44}
                  height={44}
                  className="w-11 h-11 rounded-xl object-cover"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
                {location && (
                  <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {location}
                  </p>
                )}
              </div>
            </div>

            {/* Options de partage */}
            <div className="px-5 pb-2">
              <div className="grid grid-cols-4 gap-3 mb-4">
                {/* WhatsApp */}
                <button
                  onClick={() => {
                    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${window.location.href}`)}`, "_blank");
                    onClose();
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-11 h-11 rounded-full bg-[#25D366] flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </div>
                  <span className="text-[10px] font-medium text-gray-600">WhatsApp</span>
                </button>

                {/* Facebook */}
                <button
                  onClick={() => {
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, "_blank", "width=600,height=400");
                    onClose();
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-11 h-11 rounded-full bg-[#1877F2] flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </div>
                  <span className="text-[10px] font-medium text-gray-600">Facebook</span>
                </button>

                {/* X / Twitter */}
                <button
                  onClick={() => {
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(window.location.href)}`, "_blank", "width=600,height=400");
                    onClose();
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-11 h-11 rounded-full bg-black flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </div>
                  <span className="text-[10px] font-medium text-gray-600">X</span>
                </button>

                {/* Email */}
                <button
                  onClick={() => {
                    window.open(`mailto:?subject=${encodeURIComponent(`Profil de ${profileName} sur Animigo`)}&body=${encodeURIComponent(`Salut ! Regarde le profil de ${profileName} sur Animigo : ${window.location.href}`)}`, "_self");
                    onClose();
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-11 h-11 rounded-full bg-gray-600 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-medium text-gray-600">Email</span>
                </button>
              </div>

              {/* Copier le lien */}
              <button
                onClick={handleCopyLink}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all mb-4",
                  copiedLink
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                )}
              >
                {copiedLink ? (
                  <CheckCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <Link2 className="w-5 h-5 text-gray-500 flex-shrink-0" />
                )}
                <div className="flex-1 text-left min-w-0">
                  <p className={cn("text-sm font-medium truncate", copiedLink ? "text-emerald-700" : "text-gray-700")}>
                    {copiedLink ? "Lien copié !" : "Copier le lien"}
                  </p>
                </div>
                {!copiedLink && (
                  <Copy className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
