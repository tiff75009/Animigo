"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  Euro,
  Calendar,
  X,
  CheckCircle,
  Clock,
  CreditCard,
  CalendarClock,
  AlertCircle,
  Wallet,
  Ban,
  ArrowRight,
  Users,
  Bell,
} from "lucide-react";
import { MissionCard } from "../../components/mission-card";
import { getMissionsByStatus, type Mission, mockUserProfile } from "@/app/lib/dashboard-data";

// Accept Confirmation Modal
function AcceptModal({
  isOpen,
  onClose,
  mission,
  onConfirm,
  isIncreaseCapacity = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  mission: Mission | null;
  onConfirm: () => void;
  isIncreaseCapacity?: boolean;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleConfirm = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      setTimeout(() => {
        onConfirm();
        setIsSuccess(false);
        onClose();
      }, 2000);
    }, 1500);
  };

  if (!isOpen || !mission) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {isSuccess ? (
            <div className="text-center py-8 px-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="w-10 h-10 text-green-500" />
              </motion.div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                Mission acceptée !
              </h3>
              <p className="text-text-light">
                Un lien de paiement a été envoyé à {mission.clientName}.
              </p>
              {isIncreaseCapacity && (
                <p className="text-sm text-blue-600 mt-2">
                  {mission.clientName} sera informé(e) de l&apos;augmentation de capacité.
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Header - Fixed */}
              <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
                <h3 className="text-xl font-bold text-foreground">
                  {isIncreaseCapacity ? "Accepter avec capacité augmentée" : "Accepter la mission"}
                </h3>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-text-light" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
                {/* Mission Summary */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-2xl">
                      {mission.animal.emoji}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {mission.service}
                      </h4>
                      <p className="text-sm text-text-light">
                        {mission.animal.name} • {mission.clientName}
                      </p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-xl font-bold text-primary">{mission.amount}€</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text-light">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Du {formatDate(mission.startDate)} au {formatDate(mission.endDate)}
                    </span>
                  </div>
                </div>

                {/* Capacity Increase Warning */}
                {isIncreaseCapacity && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-blue-800">
                          Capacité augmentée pour cette période
                        </p>
                        <p className="text-sm text-blue-700 mt-1">
                          Vous acceptez de garder <strong>{mockUserProfile.maxAnimals + 1} animaux</strong> au lieu de {mockUserProfile.maxAnimals} sur cette période.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Bell className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-800">
                            Notification au client
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                            <strong>{mission.clientName}</strong> sera informé(e) <strong>avant le paiement</strong> que vous avez accepté un animal supplémentaire pour cette mission. Le client pourra décider de confirmer ou non la réservation en toute connaissance de cause.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Information Steps */}
                <div className="space-y-4 mb-6">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-primary" />
                    Ce qui va se passer
                  </h4>

                  {/* Step 1 - Payment Link */}
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-blue-800">Lien de paiement envoyé</p>
                      <p className="text-sm text-blue-700">
                        {mission.clientName} recevra un lien de paiement sécurisé pour confirmer la réservation.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 - Pending */}
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-orange-800">En attente de paiement</p>
                      <p className="text-sm text-orange-700">
                        La mission sera visible dans <strong>&quot;En attente&quot;</strong> jusqu&apos;à ce que le client effectue le paiement.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 - Upcoming */}
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CalendarClock className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-green-800">Mission confirmée</p>
                      <p className="text-sm text-green-700">
                        Une fois le paiement effectué, la mission apparaîtra dans <strong>&quot;À venir&quot;</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 - Cashout */}
                  <div className="flex items-start gap-3 p-3 bg-purple/10 rounded-xl">
                    <div className="w-8 h-8 bg-purple/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Wallet className="w-4 h-4 text-purple" />
                    </div>
                    <div>
                      <p className="font-medium text-purple">Encaissement après la mission</p>
                      <p className="text-sm text-purple/80">
                        Le paiement sera encaissable dans votre espace <strong>&quot;Paiements&quot;</strong> une fois la mission terminée.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cancellation Policy */}
                <div className="bg-gray-100 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Ban className="w-5 h-5 text-text-light flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Politique d&apos;annulation</p>
                      <p className="text-sm text-text-light">
                        La mission peut être annulée à tout moment <strong>avant la date de début</strong> par vous ou par le client. En cas d&apos;annulation, le client sera intégralement remboursé.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions - Fixed */}
              <div className="flex gap-3 p-6 pt-4 border-t border-gray-100">
                <motion.button
                  onClick={onClose}
                  className="flex-1 py-3 bg-gray-200 text-foreground rounded-xl font-semibold"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  Annuler
                </motion.button>
                <motion.button
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className={`flex-1 py-3 ${isIncreaseCapacity ? "bg-blue-500" : "bg-green-500"} text-white rounded-xl font-semibold flex items-center justify-center gap-2`}
                  whileHover={{ scale: isProcessing ? 1 : 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Traitement...
                    </>
                  ) : isIncreaseCapacity ? (
                    <>
                      <Users className="w-5 h-5" />
                      Confirmer avec capacité +1
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Confirmer l&apos;acceptation
                    </>
                  )}
                </motion.button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Refuse Confirmation Modal
function RefuseModal({
  isOpen,
  onClose,
  mission,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  mission: Mission | null;
  onConfirm: () => void;
}) {
  const [reason, setReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onConfirm();
      onClose();
    }, 1000);
  };

  if (!isOpen || !mission) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl p-6 max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-foreground">
              Refuser la mission
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5 text-text-light" />
            </button>
          </div>

          {/* Mission info */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{mission.animal.emoji}</span>
              <div>
                <p className="font-semibold text-foreground">{mission.service}</p>
                <p className="text-sm text-text-light">
                  {mission.animal.name} • {mission.clientName}
                </p>
              </div>
            </div>
          </div>

          {/* Reason (optional) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Raison du refus (optionnel)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Indiquez la raison de votre refus..."
              className="w-full px-4 py-3 bg-gray-100 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              rows={3}
            />
            <p className="text-xs text-text-light mt-2">
              Cette information nous aide à améliorer le service.
            </p>
          </div>

          {/* Warning */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-6 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-orange-700">
              Attention : un taux de refus élevé peut impacter votre visibilité sur la plateforme.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <motion.button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-200 text-foreground rounded-xl font-semibold"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              Annuler
            </motion.button>
            <motion.button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
              whileHover={{ scale: isProcessing ? 1 : 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Traitement...
                </>
              ) : (
                "Confirmer le refus"
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function MissionsAccepterPage() {
  const [missions, setMissions] = useState(getMissionsByStatus("pending_acceptance"));
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [refuseModalOpen, setRefuseModalOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [isIncreaseCapacity, setIsIncreaseCapacity] = useState(false);

  const totalAmount = missions.reduce((sum, m) => sum + m.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleAcceptClick = (missionId: string, increaseCapacity?: boolean) => {
    const mission = missions.find((m) => m.id === missionId);
    if (mission) {
      setSelectedMission(mission);
      setIsIncreaseCapacity(increaseCapacity || false);
      setAcceptModalOpen(true);
    }
  };

  const handleRefuseClick = (missionId: string) => {
    const mission = missions.find((m) => m.id === missionId);
    if (mission) {
      setSelectedMission(mission);
      setRefuseModalOpen(true);
    }
  };

  const handleAcceptConfirm = () => {
    if (selectedMission) {
      // Remove mission from list (in real app, this would update backend)
      setMissions((prev) => prev.filter((m) => m.id !== selectedMission.id));
    }
  };

  const handleRefuseConfirm = () => {
    if (selectedMission) {
      // Remove mission from list (in real app, this would update backend)
      setMissions((prev) => prev.filter((m) => m.id !== selectedMission.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-accent/20 rounded-2xl">
            <HelpCircle className="w-6 h-6 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Missions à accepter
            </h1>
            <p className="text-text-light">
              {missions.length} demande{missions.length > 1 ? "s" : ""} en attente de votre réponse
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      {missions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-4"
        >
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/20 rounded-xl">
                <Calendar className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <p className="text-sm text-text-light">Demandes</p>
                <p className="text-2xl font-bold text-foreground">{missions.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Euro className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-text-light">Montant potentiel</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Info banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3"
      >
        <span className="text-2xl">⏰</span>
        <div>
          <p className="font-semibold text-amber-800">Répondez rapidement</p>
          <p className="text-sm text-amber-700">
            Les propriétaires apprécient une réponse rapide. Un bon taux de réponse améliore votre visibilité !
          </p>
        </div>
      </motion.div>

      {/* Mission List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        {missions.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-md text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Aucune demande en attente
            </h3>
            <p className="text-text-light">
              Vous n&apos;avez pas de nouvelle demande de mission pour le moment.
            </p>
          </div>
        ) : (
          missions.map((mission, index) => (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
            >
              <MissionCard
                mission={mission}
                showActions
                onAccept={handleAcceptClick}
                onRefuse={handleRefuseClick}
              />
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Accept Modal */}
      <AcceptModal
        isOpen={acceptModalOpen}
        onClose={() => {
          setAcceptModalOpen(false);
          setSelectedMission(null);
          setIsIncreaseCapacity(false);
        }}
        mission={selectedMission}
        onConfirm={handleAcceptConfirm}
        isIncreaseCapacity={isIncreaseCapacity}
      />

      {/* Refuse Modal */}
      <RefuseModal
        isOpen={refuseModalOpen}
        onClose={() => {
          setRefuseModalOpen(false);
          setSelectedMission(null);
        }}
        mission={selectedMission}
        onConfirm={handleRefuseConfirm}
      />
    </div>
  );
}
