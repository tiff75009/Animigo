"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  Bell,
  MessageCircle,
  LogOut,
  LayoutDashboard,
  CheckCheck,
  Calendar,
  CreditCard,
  Star,
  Clock,
  Wallet,
  User,
  Menu,
  X,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useAuthState } from "@/app/hooks/useAuthState";
import { useNotifications } from "@/app/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Doc } from "@/convex/_generated/dataModel";

type Notification = Doc<"notifications">;

interface SearchHeaderProps {
  onLocationClick: () => void;
  locationText?: string;
}

// Mapping type → icône
const notificationIcons: Record<string, { icon: React.ElementType; color: string }> = {
  new_mission: { icon: Calendar, color: "text-blue-500" },
  mission_accepted: { icon: CheckCheck, color: "text-green-500" },
  mission_refused: { icon: X, color: "text-red-500" },
  mission_confirmed: { icon: CheckCheck, color: "text-purple-500" },
  mission_started: { icon: Clock, color: "text-amber-500" },
  mission_completed: { icon: CheckCheck, color: "text-green-500" },
  mission_cancelled: { icon: X, color: "text-gray-500" },
  payment_authorized: { icon: CreditCard, color: "text-blue-500" },
  payment_captured: { icon: Wallet, color: "text-green-500" },
  payout_sent: { icon: Wallet, color: "text-emerald-500" },
  review_received: { icon: Star, color: "text-yellow-500" },
  new_message: { icon: MessageCircle, color: "text-blue-500" },
  welcome: { icon: User, color: "text-purple-500" },
  reminder: { icon: Bell, color: "text-orange-500" },
  system: { icon: Bell, color: "text-gray-500" },
};

export function SearchHeader({ onLocationClick, locationText }: SearchHeaderProps) {
  const router = useRouter();
  const { isAuthenticated, user, isAdmin, logout } = useAuthState();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications(50);

  // Limiter à 5 notifications dans le dropdown
  const displayedNotifications = notifications.slice(0, 5);

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.isRead) {
      markAsRead(notif._id);
    }
    if (notif.linkUrl) {
      setShowNotifications(false);
      router.push(notif.linkUrl);
    }
  };

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        // Marquer tout comme lu quand on ferme le dropdown
        if (showNotifications && unreadCount > 0) {
          markAllAsRead();
        }
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications, unreadCount, markAllAsRead]);

  const getNotificationIcon = (type: string) => {
    const config = notificationIcons[type] || notificationIcons.system;
    const Icon = config.icon;
    return <Icon className={cn("w-4 h-4", config.color)} />;
  };

  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="h-16 px-4 sm:px-6 flex items-center">
        {/* Left Section - Logo */}
        <div className="flex items-center gap-2 shrink-0 w-auto sm:w-48">
          <Link href="/" className="flex items-center gap-2.5">
            <motion.div
              className="relative w-9 h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-primary via-primary to-secondary rounded-xl flex items-center justify-center shadow-md shadow-primary/25"
              whileHover={{ scale: 1.05, rotate: -3 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <span className="text-base lg:text-lg">🐾</span>
            </motion.div>
            <div className="hidden sm:flex flex-col">
              <span className="text-lg lg:text-xl font-bold text-gray-900 leading-none">
                Anim<span className="text-primary">igo</span>
              </span>
              <span className="text-[9px] lg:text-[10px] text-gray-500 font-medium">
                Le bonheur de vos animaux
              </span>
            </div>
          </Link>

          {/* Search Icon - Mobile (à côté du logo) */}
          <button
            onClick={onLocationClick}
            className="sm:hidden p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Center Section - Search Bar (Desktop) */}
        <div className="hidden sm:flex flex-1 justify-center px-4">
          <button
            onClick={onLocationClick}
            className="w-full max-w-xl flex items-center gap-3 h-11 px-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all hover:border-gray-300"
          >
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="flex-1 text-sm text-left truncate text-gray-600">
              {locationText || "Rechercher une ville..."}
            </span>
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
          </button>
        </div>

        {/* Spacer - Mobile */}
        <div className="flex-1 sm:hidden" />

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2 shrink-0 sm:w-48 sm:justify-end">
          {/* Messages Button - Only show when authenticated */}
          {isAuthenticated && (
            <Link
              href="/dashboard/messagerie"
              className="relative p-2.5 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
            </Link>
          )}

          {/* Notifications - Only show when authenticated */}
          {isAuthenticated && <div ref={notifRef} className="relative">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowNotifications(!showNotifications)}
              className={cn(
                "relative p-2.5 rounded-xl transition-colors",
                showNotifications
                  ? "bg-primary/10 text-primary"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              )}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm"
                >
                  {unreadCount}
                </motion.span>
              )}
            </motion.button>

            {/* Notifications Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="fixed sm:absolute right-4 sm:right-0 left-4 sm:left-auto top-16 sm:top-full sm:mt-2 w-auto sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[200]"
                >
                  {/* Header */}
                  <div className="p-4 bg-gradient-to-r from-primary/5 via-secondary/5 to-purple/5 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Bell className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Notifications</h3>
                          {notifications.length > 0 && (
                            <p className="text-xs text-gray-500">
                              {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Tout est lu"}
                            </p>
                          )}
                        </div>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                          Tout marquer lu
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Bell className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-gray-500">Aucune notification</p>
                      </div>
                    ) : (
                      displayedNotifications.map((notif: Notification, index: number) => (
                        <motion.div
                          key={notif._id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleNotificationClick(notif)}
                          className={cn(
                            "p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors group",
                            !notif.isRead && "bg-primary/5",
                            notif.linkUrl && "cursor-pointer"
                          )}
                        >
                          <div className="flex gap-3">
                            <div className="shrink-0">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                {getNotificationIcon(notif.type)}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={cn(
                                  "text-sm",
                                  !notif.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"
                                )}>
                                  {notif.title}
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notif._id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                              </div>
                              <p className="text-sm text-gray-500 truncate">{notif.message}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {formatDistanceToNow(notif.createdAt, { addSuffix: true, locale: fr })}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div className="p-3 bg-gray-50 border-t border-gray-100">
                      <Link
                        href="/client/notifications"
                        onClick={() => setShowNotifications(false)}
                        className="block w-full py-2.5 text-center text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
                      >
                        {unreadCount > 5
                          ? `Voir les ${unreadCount} notifications non lues`
                          : notifications.length > 5
                            ? `Voir toutes les notifications (${notifications.length})`
                            : "Voir toutes les notifications"
                        }
                      </Link>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>}

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center">
            {isAuthenticated && user ? (
              <div ref={profileRef} className="relative">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className={cn(
                    "flex items-center gap-2 pl-1 pr-3 py-1 rounded-full transition-all",
                    showProfileMenu
                      ? "bg-gray-100 shadow-inner"
                      : "hover:bg-gray-100"
                  )}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {initials}
                  </div>
                  <span className="text-sm font-medium text-gray-700 max-w-[80px] truncate">
                    {user.firstName}
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-gray-400 transition-transform",
                      showProfileMenu && "rotate-180"
                    )}
                  />
                </motion.button>

                {/* Profile Dropdown */}
                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[200]"
                    >
                      {/* Header */}
                      <div className="p-4 bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white font-bold shadow-md">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="p-2">
                        <Link
                          href={isAdmin ? "/admin" : "/dashboard"}
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <LayoutDashboard className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium">
                            {isAdmin ? "Administration" : "Dashboard"}
                          </span>
                        </Link>
                        <Link
                          href="/dashboard/messagerie"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                            <MessageCircle className="w-4 h-4 text-blue-500" />
                          </div>
                          <span className="font-medium">Messages</span>
                        </Link>
                      </div>

                      <div className="mx-3 h-px bg-gray-100" />

                      <div className="p-2">
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            logout();
                          }}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                            <LogOut className="w-4 h-4" />
                          </div>
                          <span className="font-medium">Se déconnecter</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/connexion"
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-all"
                >
                  Connexion
                </Link>
                <Link
                  href="/inscription"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md shadow-primary/20 transition-all"
                >
                  S&apos;inscrire
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2.5 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-gray-100 overflow-hidden bg-white"
          >
            <div className="p-4 space-y-3">
              {isAuthenticated && user ? (
                <>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white font-bold text-sm">
                      {initials}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <Link
                    href={isAdmin ? "/admin" : "/dashboard"}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <LayoutDashboard className="w-5 h-5 text-gray-500" />
                    <span className="font-medium">{isAdmin ? "Administration" : "Dashboard"}</span>
                  </Link>
                  <Link
                    href="/dashboard/messagerie"
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5 text-gray-500" />
                    <span className="font-medium">Messages</span>
                  </Link>
                  <button
                    onClick={logout}
                    className="flex items-center gap-3 w-full p-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Se déconnecter</span>
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/connexion"
                    className="flex-1 py-3 text-center font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/inscription"
                    className="flex-1 py-3 text-center font-medium text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    S&apos;inscrire
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
