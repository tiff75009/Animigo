"use client";

import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  MapPin,
  Calendar,
  PawPrint,
  Search,
  ChevronDown,
  LocateFixed,
  Loader2,
  X,
} from "lucide-react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/app/lib/utils";
import { CalendarPanel, DualMonthRangePanel } from "./DatePickerDropdown";

type SearchMode = "garde" | "services";
type Popover = null | "arrival" | "departure" | "animal";

const ANIMAL_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

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

  // Anchor element capturé au clic (réellement visible — desktop ou mobile)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const openPopover = (which: Popover, target: HTMLElement | null) => {
    setAnchorEl(target);
    setPopover(which);
  };
  const closePopover = () => {
    setPopover(null);
    setAnchorEl(null);
  };

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
        {/* Où — input inline éditable directement */}
        <InlineLocationPill
          location={location}
          onLocationChange={onLocationChange}
          onGeolocate={onGeolocate}
          isGeoLoading={isGeoLoading}
          isReverseGeocoding={isReverseGeocoding}
        />
        <Divider />

        {/* Arrivée / Date */}
        <PillSection
          active={popover === "arrival"}
          onClick={(e) => {
            if (popover === "arrival") closePopover();
            else openPopover("arrival", e.currentTarget);
          }}
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
              onClick={(e) => {
                if (popover === "departure") closePopover();
                else openPopover("departure", e.currentTarget);
              }}
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
          onClick={(e) => {
            if (popover === "animal") closePopover();
            else openPopover("animal", e.currentTarget);
          }}
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
        <InlineLocationPill
          location={location}
          onLocationChange={onLocationChange}
          onGeolocate={onGeolocate}
          isGeoLoading={isGeoLoading}
          isReverseGeocoding={isReverseGeocoding}
          mobile
        />
        <MobilePillButton
          icon={<Calendar className="w-4 h-4" />}
          label={searchMode === "garde" ? "Arrivée" : "Date"}
          value={arrivalLabel}
          highlighted={Boolean(searchMode === "garde" ? startDate : singleDate)}
          onClick={(e) => openPopover("arrival", e.currentTarget)}
        />
        {searchMode === "garde" && (
          <MobilePillButton
            icon={<Calendar className="w-4 h-4" />}
            label="Départ"
            value={departureLabel}
            highlighted={Boolean(endDate)}
            onClick={(e) => openPopover("departure", e.currentTarget)}
          />
        )}
        <MobilePillButton
          icon={<PawPrint className="w-4 h-4" />}
          label="Animaux"
          value={animalLabel}
          highlighted={numberOfAnimals > 1}
          onClick={(e) => openPopover("animal", e.currentTarget)}
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

      {/* POPOVERS — rendus via portail pour échapper au stacking context */}
      {/* Mode GARDE : un seul popover dual-mois ouvert depuis Arrivée OU Départ */}
      {searchMode === "garde" && (popover === "arrival" || popover === "departure") && (
        <PortalPopover
          anchor={anchorEl}
          centerOnRef={wrapperRef}
          onClose={closePopover}
          width={720}
        >
          <DualMonthRangePanel
            startDate={startDate}
            endDate={endDate}
            onRangeChange={(s, e) => onDateRangeChange(s, e)}
            onClose={closePopover}
          />
        </PortalPopover>
      )}

      {/* Mode SERVICES : single date sur le pill Arrivée */}
      {searchMode !== "garde" && popover === "arrival" && (
        <PortalPopover anchor={anchorEl} centerOnRef={wrapperRef} onClose={closePopover} width={360}>
          <CalendarPanel
            mode="single"
            selectedDate={singleDate}
            startDate={null}
            endDate={null}
            onDateSelect={(d) => {
              onSingleDateChange(d);
              closePopover();
            }}
            onRangeSelect={() => void 0}
            onClose={closePopover}
            accentColor="primary"
          />
        </PortalPopover>
      )}

      {/* Animaux : dropdown grille 1-10 */}
      {popover === "animal" && (
        <PortalPopover anchor={anchorEl} onClose={closePopover} width={260}>
          <div className="p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">
              Combien d&apos;animaux ?
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {ANIMAL_COUNT_OPTIONS.map((n) => {
                const selected = n === numberOfAnimals;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      onNumberOfAnimalsChange(n);
                      closePopover();
                    }}
                    className={cn(
                      "h-10 rounded-xl text-sm font-semibold transition-all border",
                      selected
                        ? "bg-primary text-white border-primary shadow"
                        : "bg-white text-foreground border-gray-200 hover:border-primary hover:bg-primary/5"
                    )}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-text-light mt-3 text-center">
              De 1 à 10 animaux
            </p>
          </div>
        </PortalPopover>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// InlineLocationPill : input éditable directement dans la pill
// ──────────────────────────────────────────────────────────────────

function InlineLocationPill({
  location,
  onLocationChange,
  onGeolocate,
  isGeoLoading,
  isReverseGeocoding,
  mobile = false,
}: {
  location: { text: string; coordinates?: { lat: number; lng: number } };
  onLocationChange: (loc: { text: string; coordinates?: { lat: number; lng: number } }) => void;
  onGeolocate: () => void;
  isGeoLoading: boolean;
  isReverseGeocoding: boolean;
  mobile?: boolean;
}) {
  const [inputValue, setInputValue] = useState(location.text);
  const [predictions, setPredictions] = useState<
    Array<{ placeId: string; description: string; mainText: string; secondaryText: string }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Ref pour suivre la valeur attendue dans l'input (canonique).
  // Empêche que la sync externe écrase la sélection utilisateur en cours.
  const lockedValueRef = useRef<string | null>(null);

  const searchAddress = useAction(api.api.googleMaps.searchAddress);
  const getPlaceDetails = useAction(api.api.googleMaps.getPlaceDetails);

  // Sync externe → interne, mais en respectant le lock après une sélection
  useEffect(() => {
    if (lockedValueRef.current !== null) {
      // Une sélection est en cours / vient de finir : ignorer ce sync
      // sauf si la valeur externe correspond au lock (alors on peut libérer)
      if (location.text === lockedValueRef.current) {
        lockedValueRef.current = null;
      }
      return;
    }
    if (location.text !== inputValue) {
      setInputValue(location.text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.text]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    // L'utilisateur tape : libère le lock et affiche la frappe brute
    lockedValueRef.current = null;
    setInputValue(v);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (v.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      if (v === "") onLocationChange({ text: "" });
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const result = await searchAddress({
          query: v,
          sessionToken: `search-${Date.now()}`,
        });
        if (result.success && result.predictions) {
          setPredictions(result.predictions);
          setShowDropdown(result.predictions.length > 0);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleSelectPrediction = async (prediction: {
    placeId: string;
    mainText: string;
    secondaryText: string;
  }) => {
    const finalText = prediction.mainText;
    // Lock pour empêcher la sync externe d'écraser pendant l'await
    lockedValueRef.current = finalText;
    setShowDropdown(false);
    setInputValue(finalText);
    // Force impératif sur le DOM (au cas où React ne re-render pas avant l'await)
    if (inputRef.current) inputRef.current.value = finalText;
    // Annuler tout debounce de recherche en cours
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setPredictions([]);
    setIsSearching(true);
    try {
      const result = await getPlaceDetails({
        placeId: prediction.placeId,
        sessionToken: `details-${Date.now()}`,
      });
      if (result.success && result.details) {
        onLocationChange({ text: finalText, coordinates: result.details.coordinates });
      } else {
        onLocationChange({ text: finalText });
      }
    } catch (err) {
      console.error("Details error:", err);
      onLocationChange({ text: finalText });
    } finally {
      // Re-set au cas où un re-render aurait écrasé la valeur
      setInputValue(finalText);
      if (inputRef.current) inputRef.current.value = finalText;
      setIsSearching(false);
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    setInputValue("");
    setPredictions([]);
    setShowDropdown(false);
    onLocationChange({ text: "" });
    inputRef.current?.focus();
  };

  // Calcul de la position du dropdown via portail
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!showDropdown || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  }, [showDropdown, predictions.length]);

  // Fermer au clic extérieur — on utilise "click" (et non "mousedown") pour que
  // le onClick React des prédictions s'exécute AVANT que le handler document
  // ne ferme le dropdown (sinon le portail est démonté avant la sélection).
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setShowDropdown(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showDropdown]);

  if (mobile) {
    return (
      <div ref={containerRef} className="relative">
        <div
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
            isFocused ? "bg-primary/5" : "hover:bg-gray-50"
          )}
        >
          <span className="text-primary flex-shrink-0">
            {isSearching || isReverseGeocoding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MapPin className="w-4 h-4" />
            )}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-foreground">
              Où
            </div>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleChange}
              onFocus={() => {
                setIsFocused(true);
                if (predictions.length > 0) setShowDropdown(true);
              }}
              onBlur={() => setIsFocused(false)}
              placeholder="Ville, code postal..."
              className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-text-light/60 focus:outline-none"
            />
          </div>
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-text-light hover:text-foreground rounded-full hover:bg-foreground/5 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onGeolocate}
            disabled={isGeoLoading || isReverseGeocoding}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg transition-all flex-shrink-0",
              location.coordinates
                ? "bg-primary text-white"
                : "text-gray-400 hover:text-primary hover:bg-primary/5",
              (isGeoLoading || isReverseGeocoding) && "opacity-50 cursor-not-allowed"
            )}
            title="Me localiser"
          >
            {isGeoLoading || isReverseGeocoding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LocateFixed className="w-4 h-4" />
            )}
          </button>
        </div>
        <PredictionsDropdown
          show={showDropdown && predictions.length > 0}
          predictions={predictions}
          onSelect={handleSelectPrediction}
          pos={dropdownPos}
          dropdownRef={dropdownRef}
        />
      </div>
    );
  }

  // Desktop pill
  return (
    <div
      ref={containerRef}
      className={cn(
        "flex items-center gap-2.5 px-5 py-2.5 rounded-full transition-colors flex-1 min-w-[200px]",
        isFocused ? "bg-primary/5 shadow-inner" : "hover:bg-gray-50"
      )}
    >
      <span className="text-primary flex-shrink-0">
        {isSearching || isReverseGeocoding ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <MapPin className="w-4 h-4" />
        )}
      </span>
      <div className="min-w-0 flex-1 text-left">
        <div className="text-[10px] font-bold uppercase tracking-wider text-foreground text-left">Où</div>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onFocus={() => {
            setIsFocused(true);
            if (predictions.length > 0) setShowDropdown(true);
          }}
          onBlur={() => setIsFocused(false)}
          placeholder="Ville, code postal..."
          className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-text-light/60 focus:outline-none mt-0.5 text-left"
        />
      </div>
      {inputValue && (
        <button
          type="button"
          onClick={handleClear}
          className="p-1 text-text-light hover:text-foreground rounded-full hover:bg-foreground/5 flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={onGeolocate}
        disabled={isGeoLoading || isReverseGeocoding}
        className={cn(
          "flex items-center justify-center w-7 h-7 rounded-lg transition-all flex-shrink-0",
          location.coordinates
            ? "bg-primary text-white"
            : "text-gray-400 hover:text-primary hover:bg-primary/5",
          (isGeoLoading || isReverseGeocoding) && "opacity-50 cursor-not-allowed"
        )}
        title="Me localiser"
      >
        {isGeoLoading || isReverseGeocoding ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <LocateFixed className="w-3.5 h-3.5" />
        )}
      </button>
      <PredictionsDropdown
        show={showDropdown && predictions.length > 0}
        predictions={predictions}
        onSelect={handleSelectPrediction}
        pos={dropdownPos}
      />
    </div>
  );
}

// Dropdown des prédictions Google Maps — rendu via portail
function PredictionsDropdown({
  show,
  predictions,
  onSelect,
  pos,
  dropdownRef,
}: {
  show: boolean;
  predictions: Array<{ placeId: string; mainText: string; secondaryText: string }>;
  onSelect: (p: { placeId: string; mainText: string; secondaryText: string }) => void;
  pos: { top: number; left: number; width: number } | null;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (typeof window === "undefined" || !show || !pos) return null;
  return createPortal(
    <div
      ref={dropdownRef}
      className="fixed bg-white rounded-xl border border-gray-200"
      style={{
        top: pos.top,
        left: pos.left,
        width: Math.max(280, pos.width),
        boxShadow: "0 20px 50px -12px rgba(30,20,10,0.18), 0 2px 4px rgba(30,20,10,0.04)",
        zIndex: 100000,
      }}
    >
      <ul className="py-1 max-h-60 overflow-auto">
        {predictions.map((prediction) => (
          <li key={prediction.placeId}>
            <button
              type="button"
              // preventDefault sur mousedown empêche le blur de l'input
              // (sans bloquer le onClick qui suit)
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(prediction)}
              className="w-full px-4 py-3 text-left hover:bg-primary/5 transition-colors flex items-start gap-3"
            >
              <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-foreground text-sm">{prediction.mainText}</div>
                {prediction.secondaryText && (
                  <div className="text-xs text-text-light">{prediction.secondaryText}</div>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>,
    document.body
  );
}

// ──────────────────────────────────────────────────────────────────
// Sous-composants
// ──────────────────────────────────────────────────────────────────

interface PillSectionProps {
  active: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  label: string;
  value: string;
  icon: React.ReactNode;
  highlighted?: boolean;
  grow?: boolean;
}

function PillSection({ active, onClick, label, value, icon, highlighted, grow }: PillSectionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-5 py-2.5 rounded-full text-left transition-colors cursor-pointer",
        active ? "bg-primary/5 shadow-inner" : "hover:bg-gray-50",
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

interface MobilePillButtonProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlighted: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

function MobilePillButton({ icon, label, value, highlighted, onClick }: MobilePillButtonProps) {
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

// PortalPopover : popover rendu via portail vers document.body.
// Position calculée depuis `anchor` (élément réellement visible — capturé via e.currentTarget).
// Si centerOnRef est fourni, centrage horizontal sur cet élément (ex: barre entière).
function PortalPopover({
  anchor,
  centerOnRef,
  onClose,
  width,
  children,
}: {
  anchor: HTMLElement | null;
  centerOnRef?: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  width: number;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!anchor) return;
    const compute = () => {
      const anchorRect = anchor.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const centerRect = centerOnRef?.current?.getBoundingClientRect() ?? anchorRect;
      let left = centerRect.left + centerRect.width / 2 - width / 2;
      if (left < 8) left = 8;
      if (left + width > viewportWidth - 8) left = viewportWidth - width - 8;
      setPos({ top: anchorRect.bottom + 8, left });
    };
    compute();
    // Recalcule sur scroll/resize tant que le popover est ouvert
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [anchor, centerOnRef, width]);

  // Fermer au clic extérieur — on utilise "click" (et non "mousedown") pour
  // laisser les onClick internes (prédictions, jours du calendrier...) se résoudre
  // avant le démontage du portail.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchor?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      onClose();
    };
    const t = setTimeout(() => document.addEventListener("click", handler), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("click", handler);
    };
  }, [anchor, onClose]);

  // Fermer sur Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (typeof window === "undefined" || !pos) return null;

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed bg-white rounded-2xl border border-gray-200"
      style={{
        top: pos.top,
        left: pos.left,
        width,
        boxShadow:
          "0 20px 50px -12px rgba(30,20,10,0.18), 0 2px 4px rgba(30,20,10,0.04)",
        zIndex: 100000,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
}

function RadiusPicker({
  radius,
  onRadiusChange,
}: {
  radius: number;
  onRadiusChange: (r: number) => void;
}) {
  // Clamp la valeur entrante dans [0, 50] avec un step de 5
  const safeRadius = Math.max(0, Math.min(50, Math.round(radius / 5) * 5));
  const percent = (safeRadius / 50) * 100;
  // État local de l'input (string, pour autoriser la frappe libre avant validation)
  const [inputText, setInputText] = useState(String(safeRadius));

  useEffect(() => {
    setInputText(String(safeRadius));
  }, [safeRadius]);

  const commitInput = (raw: string) => {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) {
      setInputText(String(safeRadius));
      return;
    }
    const clamped = Math.max(0, Math.min(50, Math.round(n / 5) * 5));
    onRadiusChange(clamped);
    setInputText(String(clamped));
  };

  return (
    <div className="inline-flex items-center gap-3 min-w-[260px]">
      <style>{`
        .radius-slider {
          -webkit-appearance: none;
          appearance: none;
        }
        .radius-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid var(--primary);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(255, 107, 107, 0.25);
          transition: transform 0.12s ease;
        }
        .radius-slider::-webkit-slider-thumb:hover {
          transform: scale(1.12);
        }
        .radius-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid var(--primary);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(255, 107, 107, 0.25);
          transition: transform 0.12s ease;
        }
        .radius-slider::-moz-range-thumb:hover {
          transform: scale(1.12);
        }
      `}</style>
      <input
        type="range"
        min={0}
        max={50}
        step={5}
        value={safeRadius}
        onChange={(e) => onRadiusChange(Number(e.target.value))}
        className="radius-slider flex-1 h-1.5 rounded-full cursor-pointer focus:outline-none"
        style={{
          background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${percent}%, #e5e7eb ${percent}%, #e5e7eb 100%)`,
        }}
        aria-label={`Rayon de recherche : ${safeRadius} kilomètres`}
      />
      <label className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-gray-200 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
        <input
          type="number"
          min={0}
          max={50}
          step={5}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onBlur={(e) => commitInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          className="w-10 bg-transparent text-[13px] font-semibold text-foreground tabular-nums text-right focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          aria-label="Rayon de recherche en kilomètres"
        />
        <span className="text-[13px] font-semibold text-foreground select-none">km</span>
      </label>
    </div>
  );
}
