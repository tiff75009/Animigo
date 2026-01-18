"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  PlusCircle,
  Calendar,
  Clock,
  CheckCircle,
  ArrowRight,
  Dog,
  Cat,
  Rabbit,
  Star,
  Euro,
  TrendingUp,
  MessageSquare,
  HelpCircle,
} from "lucide-react";
import {
  calculateStats,
  getMissionsByStatus,
  mockUserProfile,
  getUnreadMessagesCount,
} from "@/app/lib/dashboard-data";
import { useAuth } from "@/app/hooks/useAuth";

export default function DashboardPage() {
  const { user } = useAuth();
  const stats = calculateStats();
  const pendingAcceptanceMissions = getMissionsByStatus("pending_acceptance");
  const inProgressMissions = getMissionsByStatus("in_progress");
  const upcomingMissions = getMissionsByStatus("upcoming");
  const unreadMessages = getUnreadMessagesCount();

  const displayName = user?.firstName || mockUserProfile.firstName;

  // Missions actives (à accepter + en cours + à venir)
  const activeMissions = [
    ...pendingAcceptanceMissions,
    ...inProgressMissions,
    ...upcomingMissions,
  ].slice(0, 4);

  const hasActiveMissions = activeMissions.length > 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalRevenue = stats.completedMissions.totalAmount +
    stats.inProgressMissions.totalAmount +
    stats.upcomingMissions.totalAmount;

  return (
    <div className="space-y-6">
      {/* Header avec message de bienvenue */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Bonjour {displayName} !
          </h1>
          <p className="text-text-light mt-1">
            Voici un résumé de votre activité
          </p>
        </div>
        <div className="flex items-center gap-3">
          {stats.totalReviews > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
              <span className="font-semibold">{stats.averageRating.toFixed(1)}</span>
              <span className="text-amber-600 text-sm">({stats.totalReviews} avis)</span>
            </div>
          )}
          {unreadMessages > 0 && (
            <Link href="/dashboard/messagerie" className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors">
              <MessageSquare className="w-5 h-5" />
              <span className="font-semibold">{unreadMessages}</span>
              <span className="text-sm hidden sm:inline">message{unreadMessages > 1 ? 's' : ''}</span>
            </Link>
          )}
        </div>
      </motion.div>

      {/* Bouton principal + Stats rapides */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bouton Créer une garde - prend 2 colonnes */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Link href="/dashboard/missions/nouvelle">
            <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all cursor-pointer group h-full">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                  <PlusCircle className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl md:text-2xl font-bold mb-1">
                    Proposer une garde
                  </h2>
                  <p className="text-white/90">
                    Trouvez quelqu'un pour garder votre animal
                  </p>
                </div>
                <ArrowRight className="w-6 h-6 hidden md:block group-hover:translate-x-2 transition-transform" />
              </div>

              {/* Types d'animaux */}
              <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-white/20">
                <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full text-sm">
                  <Dog className="w-4 h-4" />
                  <span>Chien</span>
                </div>
                <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full text-sm">
                  <Cat className="w-4 h-4" />
                  <span>Chat</span>
                </div>
                <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full text-sm">
                  <Rabbit className="w-4 h-4" />
                  <span>NAC</span>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Revenus */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-gradient-to-br from-secondary to-secondary/80 rounded-2xl p-6 text-white"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-white/80 text-sm">Revenus totaux</p>
              <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-lg px-3 py-2">
              <p className="text-white/70 text-xs">Encaissé</p>
              <p className="font-semibold">{formatCurrency(stats.completedMissions.collectedAmount)}</p>
            </div>
            <div className="bg-white/10 rounded-lg px-3 py-2">
              <p className="text-white/70 text-xs">En attente</p>
              <p className="font-semibold">{formatCurrency(stats.completedMissions.pendingAmount)}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Statistiques des missions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <Link href="/dashboard/missions/accepter" className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm font-medium text-text-light">À accepter</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{pendingAcceptanceMissions.length}</p>
        </Link>

        <Link href="/dashboard/missions/en-cours" className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-text-light">En cours</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{inProgressMissions.length}</p>
        </Link>

        <Link href="/dashboard/missions/a-venir" className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-text-light">À venir</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{upcomingMissions.length}</p>
        </Link>

        <Link href="/dashboard/missions/terminees" className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-text-light">Terminées</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.completedMissions.count}</p>
        </Link>
      </motion.div>

      {/* Contenu principal en 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne gauche - Missions actives */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
        >
          {hasActiveMissions ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Vos prochaines gardes
                </h3>
                <Link
                  href="/dashboard/planning"
                  className="text-primary text-sm font-medium flex items-center gap-1 hover:underline"
                >
                  Planning
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="space-y-3">
                {activeMissions.map((mission) => (
                  <Link
                    key={mission.id}
                    href={`/dashboard/missions/${mission.status === 'pending_acceptance' ? 'accepter' : mission.status === 'in_progress' ? 'en-cours' : 'a-venir'}`}
                  >
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm flex-shrink-0">
                        {mission.animal.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{mission.animal.name}</p>
                        <p className="text-sm text-text-light truncate">{mission.service}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-medium text-foreground">
                          {new Date(mission.startDate).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          mission.status === 'pending_acceptance'
                            ? 'bg-amber-100 text-amber-700'
                            : mission.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {mission.status === 'pending_acceptance' ? 'À accepter' :
                           mission.status === 'in_progress' ? 'En cours' : 'À venir'}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 text-center h-full flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <span className="text-3xl">🐕</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Aucune garde en cours
              </h3>
              <p className="text-text-light mb-4 text-sm">
                Proposez votre première garde pour commencer
              </p>
              <Link
                href="/dashboard/missions/nouvelle"
                className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-colors text-sm"
              >
                <PlusCircle className="w-4 h-4" />
                Nouvelle garde
              </Link>
            </div>
          )}
        </motion.div>

        {/* Colonne droite - Accès rapides */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          {/* Accès rapides */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Accès rapides
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/dashboard/planning"
                className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
              >
                <Calendar className="w-6 h-6 text-purple-600" />
                <span className="font-medium text-purple-900">Planning</span>
              </Link>
              <Link
                href="/dashboard/messagerie"
                className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
              >
                <MessageSquare className="w-6 h-6 text-blue-600" />
                <span className="font-medium text-blue-900">Messages</span>
              </Link>
              <Link
                href="/dashboard/services"
                className="flex items-center gap-3 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
              >
                <CheckCircle className="w-6 h-6 text-green-600" />
                <span className="font-medium text-green-900">Services</span>
              </Link>
              <Link
                href="/dashboard/paiements"
                className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
              >
                <Euro className="w-6 h-6 text-amber-600" />
                <span className="font-medium text-amber-900">Paiements</span>
              </Link>
            </div>
          </div>

          {/* Aide */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
            <h3 className="font-semibold text-blue-900 mb-2">
              Besoin d'aide ?
            </h3>
            <p className="text-blue-700 text-sm mb-4">
              Notre équipe est disponible pour vous accompagner.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/aide"
                className="bg-white text-blue-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                Centre d'aide
              </Link>
              <Link
                href="/contact"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Nous contacter
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
