"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  Share2,
  Link2,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

// Icônes réseaux sociaux en SVG
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const MessengerIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M.001 11.639C.001 4.949 5.241 0 12.001 0S24 4.95 24 11.639c0 6.689-5.24 11.638-12 11.638-1.21 0-2.38-.16-3.47-.46a.96.96 0 00-.64.05l-2.39 1.05a.96.96 0 01-1.35-.85l-.07-2.14a.97.97 0 00-.32-.68A11.39 11.389 0 01.002 11.64zm8.32-2.19l-3.52 5.6c-.35.53.32 1.139.82.75l3.79-2.87c.26-.2.6-.2.87 0l2.8 2.1c.84.63 2.04.4 2.6-.48l3.52-5.6c.35-.53-.32-1.13-.82-.75l-3.79 2.87c-.25.2-.6.2-.86 0l-2.8-2.1a1.8 1.8 0 00-2.61.48z"/>
  </svg>
);

const EmailIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

interface ShareOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  action: (url: string, title: string) => void;
}

const shareOptions: ShareOption[] = [
  {
    id: "facebook",
    name: "Facebook",
    icon: <FacebookIcon />,
    color: "text-[#1877F2]",
    bgColor: "bg-[#1877F2]/10 hover:bg-[#1877F2]/20",
    action: (url) => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank"),
  },
  {
    id: "twitter",
    name: "X (Twitter)",
    icon: <TwitterIcon />,
    color: "text-black",
    bgColor: "bg-gray-100 hover:bg-gray-200",
    action: (url, title) => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, "_blank"),
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: <WhatsAppIcon />,
    color: "text-[#25D366]",
    bgColor: "bg-[#25D366]/10 hover:bg-[#25D366]/20",
    action: (url, title) => window.open(`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`, "_blank"),
  },
  {
    id: "telegram",
    name: "Telegram",
    icon: <TelegramIcon />,
    color: "text-[#0088cc]",
    bgColor: "bg-[#0088cc]/10 hover:bg-[#0088cc]/20",
    action: (url, title) => window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, "_blank"),
  },
  {
    id: "messenger",
    name: "Messenger",
    icon: <MessengerIcon />,
    color: "text-[#006AFF]",
    bgColor: "bg-[#006AFF]/10 hover:bg-[#006AFF]/20",
    action: (url) => window.open(`https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(url)}`, "_blank"),
  },
  {
    id: "email",
    name: "Email",
    icon: <EmailIcon />,
    color: "text-gray-600",
    bgColor: "bg-gray-100 hover:bg-gray-200",
    action: (url, title) => window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Regarde ce profil sur Animigo : ${url}`)}`, "_blank"),
  },
];

interface AnnouncerActionBarProps {
  announcerName: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export default function AnnouncerActionBar({
  announcerName,
  isFavorite,
  onToggleFavorite,
}: AnnouncerActionBarProps) {
  const router = useRouter();
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  // Fermer le menu au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback silencieux
    }
  };

  const handleShare = (option: ShareOption) => {
    const url = window.location.href;
    const title = `${announcerName} sur Animigo`;
    option.action(url, title);
    setShowShareMenu(false);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${announcerName} sur Animigo`,
          text: `Découvrez le profil de ${announcerName} sur Animigo`,
          url: window.location.href,
        });
      } catch {
        // User cancelled
      }
    } else {
      setShowShareMenu(!showShareMenu);
    }
  };

  return (
    <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
      {/* Bouton Retour */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => router.push("/recherche")}
        className="flex items-center gap-2 px-4 py-2.5 bg-white/95 backdrop-blur-md rounded-full shadow-lg shadow-black/10 border border-white/50 text-gray-700 hover:bg-white transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium hidden sm:inline">Retour aux annonces</span>
      </motion.button>

      {/* Actions droite */}
      <div className="flex items-center gap-2">
        {/* Bouton Favoris */}
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleFavorite}
          className={cn(
            "p-3 rounded-full shadow-lg shadow-black/10 border transition-all",
            isFavorite
              ? "bg-red-500 border-red-400 text-white"
              : "bg-white/95 backdrop-blur-md border-white/50 text-gray-600 hover:bg-white hover:text-red-500"
          )}
        >
          <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
        </motion.button>

        {/* Bouton Partager */}
        <div ref={shareRef} className="relative">
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0, transition: { delay: 0.05 } }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNativeShare}
            className={cn(
              "p-3 rounded-full shadow-lg shadow-black/10 border transition-all",
              showShareMenu
                ? "bg-primary border-primary text-white"
                : "bg-white/95 backdrop-blur-md border-white/50 text-gray-600 hover:bg-white hover:text-primary"
            )}
          >
            <Share2 className="w-5 h-5" />
          </motion.button>

          {/* Menu de partage */}
          <AnimatePresence>
            {showShareMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="absolute right-0 top-full mt-3 w-72 bg-white rounded-2xl shadow-2xl shadow-black/15 border border-gray-100 overflow-hidden"
              >
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-primary/5 via-secondary/5 to-purple-500/5 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-primary/10 rounded-xl">
                        <Share2 className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-semibold text-gray-900">Partager</span>
                    </div>
                    <button
                      onClick={() => setShowShareMenu(false)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Réseaux sociaux */}
                <div className="p-3">
                  <div className="grid grid-cols-3 gap-2">
                    {shareOptions.map((option, index) => (
                      <motion.button
                        key={option.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => handleShare(option)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-xl transition-all",
                          option.bgColor
                        )}
                      >
                        <span className={option.color}>{option.icon}</span>
                        <span className="text-xs font-medium text-gray-700">{option.name}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Copier le lien */}
                <div className="p-3 pt-0">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCopyLink}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all",
                      copied
                        ? "bg-green-500 text-white"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    )}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Lien copié !</span>
                      </>
                    ) : (
                      <>
                        <Link2 className="w-4 h-4" />
                        <span>Copier le lien</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
