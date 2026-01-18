"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User } from "@/app/hooks/useAuthState";
import { Badge } from "@/app/components/ui/badge";
import { LogOut, LayoutDashboard, Settings, ChevronDown, Shield } from "lucide-react";

interface UserMenuProps {
  user: User;
  isAdmin: boolean;
  onLogout: () => void;
}

const accountTypeLabels: Record<User["accountType"], string> = {
  annonceur_pro: "Professionnel",
  annonceur_particulier: "Particulier",
  utilisateur: "Utilisateur",
};

const accountTypeVariants: Record<User["accountType"], "primary" | "secondary" | "purple"> = {
  annonceur_pro: "purple",
  annonceur_particulier: "secondary",
  utilisateur: "primary",
};

export function UserMenu({ user, isAdmin, onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fermer le menu si on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fermer le menu sur Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  const dashboardLink = isAdmin ? "/admin" : "/dashboard";
  const dashboardLabel = isAdmin ? "Administration" : "Dashboard";

  return (
    <div className="relative" ref={menuRef}>
      {/* Bouton avatar */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 pr-3 rounded-full bg-white/50 hover:bg-white/80 border border-primary/10 transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Avatar */}
        <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md shadow-primary/20">
          {initials}
        </div>
        <span className="text-sm font-medium text-foreground/80 hidden sm:block">
          {user.firstName}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-foreground/50" />
        </motion.div>
      </motion.button>

      {/* Menu dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl shadow-primary/10 border border-primary/10 overflow-hidden z-50"
          >
            {/* Info utilisateur */}
            <div className="p-4 bg-gradient-to-br from-primary/5 to-secondary/5 border-b border-primary/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/20">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-sm text-foreground/60 truncate">{user.email}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant={accountTypeVariants[user.accountType]}>
                  {accountTypeLabels[user.accountType]}
                </Badge>
                {isAdmin && (
                  <Badge variant="purple" className="gap-1">
                    <Shield className="w-3 h-3" />
                    Admin
                  </Badge>
                )}
              </div>
            </div>

            {/* Liens */}
            <div className="p-2">
              <Link
                href={dashboardLink}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/5 transition-colors group"
              >
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <LayoutDashboard className="w-4 h-4 text-primary" />
                </div>
                <span className="font-medium text-foreground/80 group-hover:text-foreground">
                  {dashboardLabel}
                </span>
              </Link>

              {!isAdmin && (
                <Link
                  href="/dashboard/parametres"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/5 transition-colors group"
                >
                  <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                    <Settings className="w-4 h-4 text-secondary" />
                  </div>
                  <span className="font-medium text-foreground/80 group-hover:text-foreground">
                    Paramètres
                  </span>
                </Link>
              )}
            </div>

            {/* Séparateur */}
            <div className="mx-4 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

            {/* Déconnexion */}
            <div className="p-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-red-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors">
                  <LogOut className="w-4 h-4 text-red-600" />
                </div>
                <span className="font-medium text-red-600">Se déconnecter</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
