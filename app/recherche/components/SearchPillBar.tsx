"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Calendar,
  PawPrint,
  Search,
  ChevronDown,
  LocateFixed,
  Loader2,
  Minus,
  Plus,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { LocationSearchBar } from "@/app/components/search";
import { radiusOptions } from "@/app/components/platform";
import { DatePickerDropdown } from "./DatePickerDropdown";

type SearchMode = "garde" | "services";
type Popover = null | "where" | "arrival" | "departure" | "animal";

interface Props {
  searchMode: SearchMode;
  location: { text: string; coordinates?: { lat: number; lng: number } };
  onLocationChange: (loc: { text: string; coordinates?: { lat: number; lng: number } }) => void;
  radius: number;
  onRadiusChange: (r: number) => void;
  onGeolocate: () => void;
  isGeoLoading: boolean;
  isReverseGeocoding: boolean;
  startDate: string | null;
  endDate: string | null;
  onDateRangeChange: (start: string | null, end: string | null) => void;
  singleDate: string | null;
  onSingleDateChange: (d: string | null) => void;
  numberOfAnimals: number;
  onNumberOfAnimalsChange: (n: number) => void;
  onSearch: () => void;
}

/** Formate la date YYYY-MM-DD en "25 avr." */
function formatShortDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

function useClickOutside(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  if (typeof window !== "undefined") {
    // Attach handler when ref is mounted via onClick outside on document
    if (ref.current) {
      const handler = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) onClose();
      };
      document.addEventListener("mousedown", handler, { once: true });
    }
  }
  return ref;
}

export function SearchPillBar({
  searchMode,
  location,
  onLocationChange,
  radius,
  onRadiusChange,
  onGeolocate,
  isGeoLoading,
  isReverseGeocoding,
  startDate,
  endDate,
  onDateRangeChange,
  singleDate,
  onSingleDateChange,
  numberOfAnimals,
  onNumberOfAnimalsChange,
  onSearch,
}: Props) {
  const [popover, setPopover] = useState<Popover>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fermeture au clic extérieur
  const handlePopoverBackdropClick = () => setPopover(null);

  const locationLabel = location.text || "Où ? (ville ou adresse)";
  const locationSet = Boolean(location.text);

  const arrivalLabel =
    searchMode === "garde"
      ? formatShortDate(startDate) || "Ajouter date"
      : formatShortDate(singleDate) || "Date";
  const departureLabel = formatShortDate(endDate) || "Ajouter date";

  const animalLabel =
    numberOfAnimals > 0
      ? `${numberOfAnimals} animal${numberOfAnimals > 1 ? "x" : ""}`
      : "Ajouter";

  return (
    <div ref={wrapperRef} className="w-full max-w-5xl mx-auto relative">
      {/* PILL BAR (desktop) */}
      <div
        className="hidden md:inline-flex items-stretch bg-white rounded-full border border-gray-200 p-1.5 w-full"
        style={{
          boxShadow:
            "0 20px 50px -12px rgba(30,20,10,0.15), 0 2px 4px rgba(30,20,10,0.04)",
        }}
        role="search"
      >
        {/* Où */}
        <PillSection
          active={popover === "where"}
          onClick={() => setPopover(popover === "where" ? null : "where")}
          label="Où"
          value={locationLabel}
          icon={<MapPin className="w-4 h-4" />}
          highlighted={locationSet}
          grow
        />
        <Divider />

        {/* Arrivée / Date */}
        <PillSection
          active={popover === "arrival"}
          onClick={() => setPopover(popover === "arrival" ? null : "arrival")}
          label={searchMode === "garde" ? "Arrivée" : "Date"}
          value={arrivalLabel}
          icon={<Calendar className="w-4 h-4" />}
          highlighted={Boolean(searchMode === "garde" ? startDate : singleDate)}
        />

        {/* Départ (seulement en mode garde) */}
        {searchMode === "garde" && (
          <>
            <Divider />
            <PillSection
              active={popover === "departure"}
              onClick={() => setPopover(popover === "departure" ? null : "departure")}
              label="Départ"
              value={departureLabel}
              icon={<Calendar className="w-4 h-4" />}
              highlighted={Boolean(endDate)}
            />
          </>
        )}

        <Divider />

        {/* Animaux */}
        <PillSection
          active={popover === "animal"}
          onClick={() => setPopover(popover === "animal" ? null : "animal")}
          label="Animaux"
          value={animalLabel}
          icon={<PawPrint className="w-4 h-4" />}
          highlighted={numberOfAnimals > 1}
        />

        {/* CTA Rechercher */}
        <button
          type="button"
          onClick={() => {
            setPopover(null);
            onSearch();
          }}
          className="ml-1.5 inline-flex items-center gap-2 px-5 rounded-full text-white font-bold text-sm transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background:
              "linear-gradient(135deg, var(--primary) 0%, #FF4F8B 100%)",
            boxShadow: "0 4px 12px rgba(255,107,107,0.35)",
          }}
        >
          <Search className="w-[18px] h-[18px]" />
          <span className="hidden lg:inline">Rechercher</span>
        </button>
      </div>

      {/* MOBILE : accordéon vertical compact */}
      <div className="md:hidden bg-white rounded-2xl border border-gray-200 p-2 shadow-lg space-y-1">
        <MobilePillButton
          icon={<MapPin className="w-4 h-4" />}
          label="Où"
          value={locationLabel}
          highlighted={locationSet}
          onClick={() => setPopover("where")}
        />
        <MobilePillButton
          icon={<Calendar className="w-4 h-4" />}
          label={searchMode === "garde" ? "Arrivée" : "Date"}
          value={arrivalLabel}
          highlighted={Boolean(searchMode === "garde" ? startDate : singleDate)}
          onClick={() => setPopover("arrival")}
        />
        {searchMode === "garde" && (
          <MobilePillButton
            icon={<Calendar className="w-4 h-4" />}
            label="Départ"
            value={departureLabel}
            highlighted={Boolean(endDate)}
            onClick={() => setPopover("departure")}
          />
        )}
        <MobilePillButton
          icon={<PawPrint className="w-4 h-4" />}
          label="Animaux"
          value={animalLabel}
          highlighted={numberOfAnimals > 1}
          onClick={() => setPopover("animal")}
        />
        <button
          type="button"
          onClick={() => {
            setPopover(null);
            onSearch();
          }}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm mt-2 hover:shadow-lg active:scale-[0.98] transition-all"
          style={{
            background:
              "linear-gradient(135deg, var(--primary) 0%, #FF4F8B 100%)",
            boxShadow: "0 4px 12px rgba(255,107,107,0.35)",
          }}
        >
          <Search className="w-[18px] h-[18px]" />
          Rechercher
        </button>
      </div>

      {/* RADIUS HINT */}
      <div className="mt-4 flex items-center justify-center gap-2 text-[13px]">
        <span className="text-text-light">Rayon de recherche :</span>
        <RadiusPicker radius={radius} onRadiusChange={onRadiusChange} />
      </div>

      {/* POPOVERS */}
      <AnimatePresence>
        {popover && (
          <>
            {/* Backdrop pour fermer au clic extérieur */}
            <div
              className="fixed inset-0 z-30"
              onClick={handlePopoverBackdropClick}
            />

            {popover === "where" && (
              <PopoverShell onClose={() => setPopover(null)} widthClass="w-[420px] max-w-[90vw]">
                <div className="p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2">
                    Où cherchez-vous ?
                  </div>
                  <LocationSearchBar
                    value={location}
                    onChange={(loc) => {
                      onLocationChange(loc);
                    }}
                    placeholder="Rechercher une ville..."
                    showGeolocationButton={false}
                    rightSlot={
                      <button
                        type="button"
                        onClick={onGeolocate}
                        disabled={isGeoLoading || isReverseGeocoding}
                        className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-lg transition-all flex-shrink-0",
                          location.coordinates
                            ? "bg-primary text-white"
                            : "text-gray-400 hover:text-primary hover:bg-primary/5",
                          (isGeoLoading || isReverseGeocoding) &&
                            "opacity-50 cursor-not-allowed"
                        )}
                        title="Me localiser"
                      >
                        {isGeoLoading || isReverseGeocoding ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <LocateFixed className="w-4 h-4" />
                        )}
                      </button>
                    }
                  />
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-gray-600 mb-2 flex items-center justify-between">
                      <span>Rayon de recherche</span>
                      <span className="text-primary">{radius} km</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={radiusOptions.length - 1}
                      step={1}
                      value={radiusOptions.indexOf(radius) >= 0 ? radiusOptions.indexOf(radius) : 0}
                      onChange={(e) => onRadiusChange(radiusOptions[parseInt(e.target.value)])}
                      className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>
              </PopoverShell>
            )}

            {popover === "arrival" && (
              <PopoverShell onClose={() => setPopover(null)} widthClass="w-[340px] max-w-[90vw]">
                {searchMode === "garde" ? (
                  <DatePickerDropdown
                    isOpen
                    mode="range"
                    selectedDate={null}
                    startDate={startDate}
                    endDate={endDate}
                    onDateSelect={() => void 0}
                    onRangeSelect={(s, e) => {
                      onDateRangeChange(s, e);
                    }}
                    onClose={() => setPopover(null)}
                    accentColor="primary"
                  />
                ) : (
                  <DatePickerDropdown
                    isOpen
                    mode="single"
                    selectedDate={singleDate}
                    startDate={null}
                    endDate={null}
                    onDateSelect={(d) => {
                      onSingleDateChange(d);
                      setPopover(null);
                    }}
                    onRangeSelect={() => void 0}
                    onClose={() => setPopover(null)}
                    accentColor="primary"
                  />
                )}
              </PopoverShell>
            )}

            {popover === "departure" && (
              <PopoverShell onClose={() => setPopover(null)} widthClass="w-[340px] max-w-[90vw]">
                <DatePickerDropdown
                  isOpen
                  mode="range"
                  selectedDate={null}
                  startDate={startDate}
                  endDate={endDate}
                  onDateSelect={() => void 0}
                  onRangeSelect={(s, e) => {
                    onDateRangeChange(s, e);
                  }}
                  onClose={() => setPopover(null)}
                  accentColor="secondary"
                />
              </PopoverShell>
            )}

            {popover === "animal" && (
              <PopoverShell onClose={() => setPopover(null)} widthClass="w-[280px]">
                <div className="p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-primary mb-3">
                    Combien d&apos;animaux ?
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Animaux à garder
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onNumberOfAnimalsChange(Math.max(1, numberOfAnimals - 1))
                        }
                        disabled={numberOfAnimals <= 1}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        aria-label="Diminuer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-base font-bold min-w-[1.5rem] text-center">
                        {numberOfAnimals}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onNumberOfAnimalsChange(Math.min(10, numberOfAnimals + 1))
                        }
                        disabled={numberOfAnimals >= 10}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        aria-label="Augmenter"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </PopoverShell>
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Sous-composants
// ──────────────────────────────────────────────────────────────────

function PillSection({
  active,
  onClick,
  label,
  value,
  icon,
  highlighted,
  grow,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  value: string;
  icon: React.ReactNode;
  highlighted?: boolean;
  grow?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-5 py-2.5 rounded-full text-left transition-colors cursor-pointer",
        active
          ? "bg-primary/5 shadow-inner"
          : "hover:bg-gray-50",
        grow && "flex-1 min-w-[180px]"
      )}
    >
      <span className={cn("text-primary", highlighted && "opacity-100")}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-foreground">
          {label}
        </div>
        <div
          className={cn(
            "text-sm truncate mt-0.5",
            highlighted ? "font-semibold text-foreground" : "font-normal text-text-light"
          )}
        >
          {value}
        </div>
      </div>
      {!grow && <ChevronDown className="w-3 h-3 text-text-light flex-shrink-0" />}
    </button>
  );
}

function Divider() {
  return <div className="w-px bg-gray-200 my-2" />;
}

function MobilePillButton({
  icon,
  label,
  value,
  highlighted,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlighted: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
    >
      <span className="text-primary">{icon}</span>
      <div className="flex-1 text-left min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-foreground">
          {label}
        </div>
        <div
          className={cn(
            "text-sm truncate",
            highlighted ? "font-semibold text-foreground" : "font-normal text-text-light"
          )}
        >
          {value}
        </div>
      </div>
      <ChevronDown className="w-3 h-3 text-text-light flex-shrink-0" />
    </button>
  );
}

function PopoverShell({
  onClose,
  children,
  widthClass,
}: {
  onClose: () => void;
  children: React.ReactNode;
  widthClass: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-white rounded-2xl border border-gray-200 z-50 overflow-hidden",
        widthClass
      )}
      style={{
        boxShadow: "0 20px 50px -12px rgba(30,20,10,0.18), 0 2px 4px rgba(30,20,10,0.04)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onClose}
        className="sr-only"
        aria-label="Fermer"
      />
      {children}
    </motion.div>
  );
}

function RadiusPicker({
  radius,
  onRadiusChange,
}: {
  radius: number;
  onRadiusChange: (r: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-[13px] font-medium text-foreground hover:bg-gray-50 transition-colors shadow-sm"
      >
        {radius} km
        <ChevronDown className={cn("w-2.5 h-2.5 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className="absolute left-1/2 -translate-x-1/2 mt-2 bg-white rounded-xl border border-gray-200 p-2 shadow-xl z-50 min-w-[120px]"
            >
              {radiusOptions.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    onRadiusChange(r);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full px-3 py-1.5 rounded-lg text-sm text-left transition-colors",
                    radius === r
                      ? "bg-primary/10 text-primary font-semibold"
                      : "hover:bg-gray-50"
                  )}
                >
                  {r} km
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
