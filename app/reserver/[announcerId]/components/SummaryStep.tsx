"use client";

import Image from "next/image";
import { AlertCircle, Clock, MapPin, Moon, Sun, Home, CalendarCheck, Users, CreditCard, Package, Plus, PawPrint } from "lucide-react";
import { cn } from "@/app/lib/utils";
import type { ServiceDetail, ServiceVariant } from "./FormulaStep";
import type { ServiceOption } from "./OptionsStep";

// Type pour les séances multi-sessions
interface SelectedSession {
  date: string;
  startTime: string;
  endTime: string;
}

// Type pour les créneaux collectifs
interface CollectiveSlotInfo {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  availableSpots: number;
}

// Type pour les animaux de l'utilisateur (correspondant au retour de getUserAnimals)
interface UserAnimal {
  id: string;
  name: string;
  type: string;
  emoji?: string;
  breed?: string;
  primaryPhotoUrl?: string | null;
}

// Price calculation result interface (must match page.tsx)
interface PriceBreakdown {
  firstDayAmount: number;
  firstDayHours: number;
  firstDayIsFullDay: boolean;
  fullDays: number;
  fullDaysAmount: number;
  lastDayAmount: number;
  lastDayHours: number;
  lastDayIsFullDay: boolean;
  nightsAmount: number;
  nights: number;
  optionsAmount: number;
  totalAmount: number;
  hourlyRate: number;
  dailyRate: number;
  nightlyRate: number;
}

interface AnnouncerData {
  firstName: string;
  lastName?: string;
  profileImage: string | null;
  location: string;
}

interface SummaryStepProps {
  announcer: AnnouncerData;
  selectedService: ServiceDetail;
  selectedVariant: ServiceVariant;
  selectedDate: string;
  selectedEndDate: string | null;
  selectedTime: string | null;
  selectedEndTime: string | null;
  includeOvernightStay: boolean;
  days: number;
  selectedOptionIds: string[];
  priceBreakdown: PriceBreakdown;
  serviceLocation: "announcer_home" | "client_home" | null;
  commissionRate?: number; // Taux de commission en %
  // Support pour les formules collectives
  isCollectiveFormula?: boolean;
  collectiveSlots?: CollectiveSlotInfo[];
  animalCount?: number;
  // Support pour les formules individuelles multi-séances
  isMultiSessionIndividual?: boolean;
  selectedSessions?: SelectedSession[];
  // Animaux de l'utilisateur
  userAnimals?: UserAnimal[] | null;
  selectedAnimalIds?: string[];
  error: string | null;
}

// Helper functions
function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatHours(hours: number): string {
  if (hours === Math.floor(hours)) {
    return `${hours}h`;
  }
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h${minutes.toString().padStart(2, "0")}`;
}

export default function SummaryStep({
  announcer,
  selectedService,
  selectedVariant,
  selectedDate,
  selectedEndDate,
  selectedTime,
  selectedEndTime,
  includeOvernightStay,
  days,
  selectedOptionIds,
  priceBreakdown,
  serviceLocation,
  commissionRate = 15,
  // Formules collectives
  isCollectiveFormula = false,
  collectiveSlots = [],
  animalCount = 1,
  // Formules multi-séances
  isMultiSessionIndividual = false,
  selectedSessions = [],
  // Animaux de l'utilisateur
  userAnimals = null,
  selectedAnimalIds = [],
  error,
}: SummaryStepProps) {
  const isMultiDay = selectedEndDate && selectedEndDate !== selectedDate;

  // Déterminer le type de formule
  const isCollective = isCollectiveFormula || selectedVariant.sessionType === "collective";
  const isMultiSession = isMultiSessionIndividual || (!isCollective && (selectedVariant.numberOfSessions || 1) > 1);
  const numberOfSessions = selectedVariant.numberOfSessions || 1;

  // Filtrer les animaux sélectionnés
  const selectedAnimals = userAnimals?.filter(animal => selectedAnimalIds.includes(animal.id)) || [];
  const effectiveAnimalCount = selectedAnimals.length > 0 ? selectedAnimals.length : animalCount;

  // Formater l'heure (9:00 -> 9h, 14:30 -> 14h30)
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    return minutes === "00" ? `${parseInt(hours)}h` : `${parseInt(hours)}h${minutes}`;
  };

  // Calculer la durée totale en heures
  const calculateTotalHours = () => {
    if (!selectedTime) return 0;

    const startParts = selectedTime.split(":").map(Number);
    const startHour = startParts[0] + startParts[1] / 60;

    if (selectedEndTime) {
      const endParts = selectedEndTime.split(":").map(Number);
      const endHour = endParts[0] + endParts[1] / 60;

      if (isMultiDay) {
        // Multi-jours: heures du premier jour + jours complets + heures du dernier jour
        const firstDayHours = 20 - startHour; // Jusqu'à 20h par défaut
        const lastDayHours = endHour - 8; // Depuis 8h par défaut
        const middleDays = days - 2;
        return firstDayHours + (middleDays > 0 ? middleDays * 8 : 0) + lastDayHours;
      } else {
        // Même jour
        return endHour - startHour;
      }
    }
    return 0;
  };

  const totalHours = calculateTotalHours();

  // Calculer la commission et le total avec commission
  const commissionAmount = Math.round((priceBreakdown.totalAmount * commissionRate) / 100);
  const totalWithCommission = priceBreakdown.totalAmount + commissionAmount;

  // Helper pour afficher le lieu de prestation
  const getLocationLabel = () => {
    if (!serviceLocation) return null;
    return serviceLocation === "client_home"
      ? "À domicile (chez vous)"
      : "Chez le pet-sitter";
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <h2 className="text-lg font-bold text-foreground mb-4">Récapitulatif</h2>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Announcer */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
        <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
          {announcer.profileImage ? (
            <Image
              src={announcer.profileImage}
              alt={announcer.firstName}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold text-lg">
                {announcer.firstName.charAt(0)}
              </span>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">
            {announcer.firstName} {announcer.lastName?.charAt(0)}.
          </p>
          <p className="text-sm text-text-light flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {announcer.location}
          </p>
        </div>
      </div>

      {/* Service Details */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-text-light">Service</span>
          <span className="font-medium text-foreground">
            {selectedService.categoryIcon} {selectedService.categoryName}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-light">Prestation</span>
          <span className="font-medium text-foreground flex items-center gap-2">
            {selectedVariant.name}
            {isCollective && (
              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                Collectif
              </span>
            )}
            {isMultiSession && !isCollective && (
              <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                {numberOfSessions} séances
              </span>
            )}
          </span>
        </div>
        {getLocationLabel() && (
          <div className="flex justify-between text-sm">
            <span className="text-text-light">Lieu</span>
            <span className="font-medium text-foreground flex items-center gap-1">
              {serviceLocation === "client_home" ? (
                <Home className="w-3 h-3" />
              ) : (
                <MapPin className="w-3 h-3" />
              )}
              {getLocationLabel()}
            </span>
          </div>
        )}

        {/* Affichage des dates selon le type de formule */}
        {isCollective ? (
          // Formule collective: liste numérotée des créneaux
          <div className="p-3 bg-purple-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <CalendarCheck className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">
                {collectiveSlots.length > 0
                  ? `Créneaux sélectionnés (${collectiveSlots.length}/${numberOfSessions})`
                  : `${numberOfSessions} séance${numberOfSessions > 1 ? "s" : ""} collective${numberOfSessions > 1 ? "s" : ""}`
                }
              </span>
            </div>
            {collectiveSlots.length > 0 ? (
              <div className="space-y-1.5">
                {collectiveSlots
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((slot, index) => (
                  <div
                    key={slot._id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="w-5 h-5 rounded-full bg-purple-200 text-purple-700 text-xs flex items-center justify-center font-semibold">
                      {index + 1}
                    </span>
                    <span className="text-gray-700 capitalize">
                      {formatDate(slot.date)}
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-purple-700 font-medium">
                      {slot.startTime} - {slot.endTime}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-purple-600/70 animate-pulse">
                Chargement des créneaux...
              </p>
            )}
            {effectiveAnimalCount > 1 && (
              <div className="mt-2 pt-2 border-t border-purple-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-purple-700">
                  {effectiveAnimalCount} animal{effectiveAnimalCount > 1 ? "aux" : ""}
                </span>
              </div>
            )}
          </div>
        ) : isMultiSession ? (
          // Formule multi-séances: liste numérotée des séances
          <div className="p-3 bg-primary/5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <CalendarCheck className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {selectedSessions.length > 0
                  ? `Séances planifiées (${selectedSessions.length}/${numberOfSessions})`
                  : `${numberOfSessions} séance${numberOfSessions > 1 ? "s" : ""} à planifier`
                }
              </span>
            </div>
            {selectedSessions.length > 0 ? (
              <div className="space-y-1.5">
                {selectedSessions
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((session, index) => (
                  <div
                    key={`${session.date}-${session.startTime}`}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-semibold">
                      {index + 1}
                    </span>
                    <span className="text-gray-700 capitalize">
                      {formatDate(session.date)}
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-primary font-medium">
                      {session.startTime} - {session.endTime}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-primary/70 animate-pulse">
                Chargement des séances...
              </p>
            )}
          </div>
        ) : (
          // Formule uni-séance: affichage classique
          <div className="text-sm">
            <span className="text-text-light block mb-1">Date et horaire</span>
            <div className="font-medium text-foreground">
              {isMultiDay && selectedTime && selectedEndTime ? (
                // Multi-jours avec heures
                <span>
                  Du {formatDate(selectedDate)} à {formatTime(selectedTime)} jusqu&apos;au {formatDate(selectedEndDate)} à {formatTime(selectedEndTime)}
                </span>
              ) : selectedTime && selectedEndTime ? (
                // Même jour avec plage horaire
                <span>
                  {formatDate(selectedDate)} de {formatTime(selectedTime)} à {formatTime(selectedEndTime)}
                </span>
              ) : selectedTime ? (
                // Même jour avec heure de début seulement
                <span>
                  {formatDate(selectedDate)} à {formatTime(selectedTime)}
                </span>
              ) : isMultiDay ? (
                // Multi-jours sans heures
                <span>
                  Du {formatDate(selectedDate)} au {formatDate(selectedEndDate)}
                </span>
              ) : (
                // Date simple
                <span>{formatDate(selectedDate)}</span>
              )}
            </div>
            {/* Durée */}
            {(days > 1 || totalHours > 0) && (
              <div className="flex items-center gap-1 mt-1.5 text-xs text-text-light">
                <Clock className="w-3 h-3" />
                {days > 1 ? (
                  <span>
                    {days} jour{days > 1 ? "s" : ""} · {totalHours > 0 ? `${totalHours.toFixed(1).replace(".0", "")}h au total` : ""}
                    {totalHours > 0 && days > 1 && (
                      <span className="text-gray-400"> ({(totalHours / days).toFixed(1).replace(".0", "")}h/jour)</span>
                    )}
                  </span>
                ) : totalHours > 0 ? (
                  <span>Durée : {totalHours.toFixed(1).replace(".0", "")}h</span>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Section Animaux - visible si des animaux sont sélectionnés */}
        {selectedAnimals.length > 0 && (
          <div className="p-3 bg-amber-50 rounded-xl mt-3">
            <div className="flex items-center gap-2 mb-2">
              <PawPrint className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                {selectedAnimals.length > 1 ? "Animaux concernés" : "Animal concerné"}
              </span>
            </div>
            <div className="space-y-2">
              {selectedAnimals.map((animal) => (
                <div
                  key={animal.id}
                  className="flex items-center gap-3"
                >
                  {animal.primaryPhotoUrl ? (
                    <Image
                      src={animal.primaryPhotoUrl}
                      alt={animal.name}
                      width={32}
                      height={32}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 text-sm">
                      {animal.emoji || animal.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{animal.name}</p>
                    <p className="text-xs text-text-light">
                      {animal.type}{animal.breed ? ` - ${animal.breed}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {selectedAnimals.length > 1 && (
              <p className="text-xs text-amber-600 mt-2 pt-2 border-t border-amber-200">
                Le prix est ajusté pour {selectedAnimals.length} animaux
              </p>
            )}
          </div>
        )}
      </div>

      {/* Price Breakdown - Mode Plan/Détaillé */}
      <div className="border-t border-gray-200 pt-4 space-y-3">
        {/* En-tête avec icône */}
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-semibold text-foreground">Détail du prix</span>
        </div>

        {/* Formule de base */}
        <div className={cn(
          "rounded-xl p-4 space-y-3",
          isCollective ? "bg-purple-50" : isMultiSession ? "bg-primary/5" : "bg-gray-50"
        )}>
          {/* Ligne formule */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Package className={cn(
                  "w-4 h-4",
                  isCollective ? "text-purple-600" : isMultiSession ? "text-primary" : "text-gray-600"
                )} />
                <span className="font-medium text-foreground">
                  Formule : {selectedVariant.name}
                </span>
              </div>

              {/* Détail du calcul selon le type */}
              {isCollective ? (
                // Formule collective: prix × séances × animaux
                <p className="text-xs text-gray-500 ml-6">
                  └ {formatPrice(Math.round(selectedVariant.price * (1 + commissionRate / 100)))} × {numberOfSessions} séance{numberOfSessions > 1 ? "s" : ""}
                  {effectiveAnimalCount > 1 && ` × ${effectiveAnimalCount} animaux`}
                </p>
              ) : isMultiSession ? (
                // Formule multi-séances: prix × séances
                <p className="text-xs text-gray-500 ml-6">
                  └ {formatPrice(Math.round(selectedVariant.price * (1 + commissionRate / 100)))} × {numberOfSessions} séance{numberOfSessions > 1 ? "s" : ""}
                </p>
              ) : (
                // Formule uni-séance: détail existant
                <p className="text-xs text-gray-500 ml-6">
                  └ {days > 1
                    ? `${days} jours × ${formatPrice(Math.round(priceBreakdown.dailyRate * (1 + commissionRate / 100)))}/jour`
                    : priceBreakdown.firstDayHours > 0
                      ? `${formatHours(priceBreakdown.firstDayHours)} × ${formatPrice(Math.round(priceBreakdown.hourlyRate * (1 + commissionRate / 100)))}/h`
                      : formatPrice(Math.round(priceBreakdown.firstDayAmount * (1 + commissionRate / 100)))
                  }
                </p>
              )}
            </div>
            <span className={cn(
              "font-bold text-lg",
              isCollective ? "text-purple-700" : isMultiSession ? "text-primary" : "text-foreground"
            )}>
              {isCollective ? (
                formatPrice(Math.round(selectedVariant.price * numberOfSessions * effectiveAnimalCount * (1 + commissionRate / 100)))
              ) : isMultiSession ? (
                formatPrice(Math.round(selectedVariant.price * numberOfSessions * (1 + commissionRate / 100)))
              ) : (
                formatPrice(Math.round((priceBreakdown.firstDayAmount + priceBreakdown.fullDaysAmount + priceBreakdown.lastDayAmount) * (1 + commissionRate / 100)))
              )}
            </span>
          </div>

          {/* Nuits (si applicable et pas formule collective/multi-session) */}
          {!isCollective && !isMultiSession && includeOvernightStay && priceBreakdown.nights > 0 && (
            <div className="flex items-start justify-between pt-2 border-t border-gray-200/50">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span className="font-medium text-indigo-800">Nuits</span>
                </div>
                <p className="text-xs text-indigo-600 ml-6">
                  └ {priceBreakdown.nights} nuit{priceBreakdown.nights > 1 ? "s" : ""} × {formatPrice(Math.round(priceBreakdown.nightlyRate * (1 + commissionRate / 100)))}/nuit
                </p>
              </div>
              <span className="font-medium text-indigo-700">
                +{formatPrice(Math.round(priceBreakdown.nightsAmount * (1 + commissionRate / 100)))}
              </span>
            </div>
          )}
        </div>

        {/* Options */}
        {selectedOptionIds.length > 0 && (
          <div className="bg-secondary/5 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Plus className="w-4 h-4 text-secondary" />
              <span className="font-medium text-foreground">Options</span>
            </div>
            {selectedOptionIds.map((optId) => {
              const opt = selectedService.options.find(
                (o: ServiceOption) => o.id === optId
              );
              if (!opt) return null;
              const optPriceWithCommission = Math.round(opt.price * (1 + commissionRate / 100));
              return (
                <div
                  key={optId}
                  className="flex justify-between text-sm ml-6"
                >
                  <span className="text-gray-600">└ {opt.name}</span>
                  <span className="font-medium text-secondary">+{formatPrice(optPriceWithCommission)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Sous-total + Frais de service + Total */}
        <div className="bg-gray-100 rounded-xl p-4 space-y-2">
          {/* Sous-total */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Sous-total</span>
            <span className="font-medium text-foreground">
              {isCollective ? (
                formatPrice(Math.round(selectedVariant.price * numberOfSessions * effectiveAnimalCount) + selectedOptionIds.reduce((sum, optId) => {
                  const opt = selectedService.options.find((o: ServiceOption) => o.id === optId);
                  return sum + (opt?.price || 0);
                }, 0))
              ) : isMultiSession ? (
                formatPrice(Math.round(selectedVariant.price * numberOfSessions) + selectedOptionIds.reduce((sum, optId) => {
                  const opt = selectedService.options.find((o: ServiceOption) => o.id === optId);
                  return sum + (opt?.price || 0);
                }, 0))
              ) : (
                formatPrice(priceBreakdown.totalAmount - Math.round(priceBreakdown.totalAmount * commissionRate / 100 / (1 + commissionRate / 100)))
              )}
            </span>
          </div>

          {/* Frais de service */}
          <div className="flex justify-between text-sm text-gray-500">
            <span>Frais de service ({commissionRate}%)</span>
            <span>
              {isCollective ? (
                formatPrice(Math.round((selectedVariant.price * numberOfSessions * effectiveAnimalCount + selectedOptionIds.reduce((sum, optId) => {
                  const opt = selectedService.options.find((o: ServiceOption) => o.id === optId);
                  return sum + (opt?.price || 0);
                }, 0)) * commissionRate / 100))
              ) : isMultiSession ? (
                formatPrice(Math.round((selectedVariant.price * numberOfSessions + selectedOptionIds.reduce((sum, optId) => {
                  const opt = selectedService.options.find((o: ServiceOption) => o.id === optId);
                  return sum + (opt?.price || 0);
                }, 0)) * commissionRate / 100))
              ) : (
                formatPrice(commissionAmount)
              )}
            </span>
          </div>

          {/* Ligne de séparation */}
          <div className="border-t-2 border-primary/20 my-2" />

          {/* Total */}
          <div className="flex justify-between">
            <span className="font-bold text-lg text-foreground">Total</span>
            <span className="font-bold text-xl text-primary">
              {isCollective ? (
                formatPrice(Math.round((selectedVariant.price * numberOfSessions * effectiveAnimalCount + selectedOptionIds.reduce((sum, optId) => {
                  const opt = selectedService.options.find((o: ServiceOption) => o.id === optId);
                  return sum + (opt?.price || 0);
                }, 0)) * (1 + commissionRate / 100)))
              ) : isMultiSession ? (
                formatPrice(Math.round((selectedVariant.price * numberOfSessions + selectedOptionIds.reduce((sum, optId) => {
                  const opt = selectedService.options.find((o: ServiceOption) => o.id === optId);
                  return sum + (opt?.price || 0);
                }, 0)) * (1 + commissionRate / 100)))
              ) : (
                formatPrice(totalWithCommission)
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
