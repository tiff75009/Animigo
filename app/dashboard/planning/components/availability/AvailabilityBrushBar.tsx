"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  X,
  Sun,
  Sunset,
  Moon,
  Settings2,
  Brush,
  MousePointer2,
  HelpCircle,
  Layers,
  ChevronDown,
  Sliders,
  Clock,
  Loader2,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

export type BrushKind =
  | "available"
  | "unavailable"
  | "morning"
  | "afternoon"
  | "evening"
  | "periods" // combinaison multi-périodes (Matin + Soir, etc.)
  | "custom";

export type BrushMode = "paint" | "select";

export type PeriodKey = "morning" | "afternoon" | "evening";

export interface BrushTimeSlot {
  startTime: string;
  endTime: string;
}

export interface BrushDef {
  kind: BrushKind;
  status: "available" | "partial" | "unavailable";
  timeSlots?: BrushTimeSlot[];
  label: string;
}

export const BRUSH_PRESETS: Record<Exclude<BrushKind, "custom">, BrushDef> = {
  available: {
    kind: "available",
    status: "available",
    label: "Dispo journée",
  },
  unavailable: {
    kind: "unavailable",
    status: "unavailable",
    label: "Indispo",
  },
  morning: {
    kind: "morning",
    status: "partial",
    timeSlots: [{ startTime: "08:00", endTime: "12:00" }],
    label: "Matin · 8h–12h",
  },
  afternoon: {
    kind: "afternoon",
    status: "partial",
    timeSlots: [{ startTime: "14:00", endTime: "18:00" }],
    label: "Après-midi · 14h–18h",
  },
  evening: {
    kind: "evening",
    status: "partial",
    timeSlots: [{ startTime: "18:00", endTime: "22:00" }],
    label: "Soir · 18h–22h",
  },
};

interface CategoryType {
  _id: string;
  name: string;
  icon?: string;
  color?: string;
}

interface AvailabilityBrushBarProps {
  selectedBrush: BrushKind;
  onBrushChange: (kind: BrushKind) => void;
  mode: BrushMode;
  onModeChange: (mode: BrushMode) => void;
  onOpenAdvanced: () => void;
  hasSelection: boolean;
  // Multi-type selector
  categoryTypes: CategoryType[];
  selectedTypeIds: string[];
  onSelectedTypeIdsChange: (ids: string[]) => void;
  // Plages horaires dynamiques (issues des paramètres planning utilisateur)
  dynamicSlots: {
    morning: { start: string; end: string } | null;
    afternoon: { start: string; end: string } | null;
    evening: { start: string; end: string } | null;
  };
  // Périodes activées pour le pinceau "périodes" (multi-sélection)
  activePeriods: Set<PeriodKey>;
  onTogglePeriod: (period: PeriodKey) => void;
  // Paramètres + handlers
  acceptFrom: string;
  acceptTo: string;
  bufferBefore: number;
  bufferAfter: number;
  onSavePreferences: (data: {
    acceptFrom: string;
    acceptTo: string;
    bufferBefore: number;
    bufferAfter: number;
  }) => Promise<void>;
}

const BRUSH_BUTTONS: Array<{
  kind: BrushKind;
  icon: React.ElementType;
  label: string;
  shortcut?: string;
}> = [
  { kind: "available", icon: Check, label: "Dispo", shortcut: "D" },
  { kind: "unavailable", icon: X, label: "Indispo", shortcut: "I" },
  { kind: "morning", icon: Sun, label: "Matin", shortcut: "M" },
  { kind: "afternoon", icon: Sunset, label: "Aprem", shortcut: "A" },
  { kind: "evening", icon: Moon, label: "Soir", shortcut: "S" },
];

export function AvailabilityBrushBar({
  selectedBrush,
  onBrushChange,
  mode,
  onModeChange,
  onOpenAdvanced,
  hasSelection,
  categoryTypes,
  selectedTypeIds,
  onSelectedTypeIdsChange,
  dynamicSlots,
  activePeriods,
  onTogglePeriod,
  acceptFrom,
  acceptTo,
  bufferBefore,
  bufferAfter,
  onSavePreferences,
}: AvailabilityBrushBarProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [draftAcceptFrom, setDraftAcceptFrom] = useState(acceptFrom);
  const [draftAcceptTo, setDraftAcceptTo] = useState(acceptTo);
  const [draftBufferBefore, setDraftBufferBefore] = useState(bufferBefore);
  const [draftBufferAfter, setDraftBufferAfter] = useState(bufferAfter);
  const typePickerRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Sync drafts with parent props when settings popover opens
  useEffect(() => {
    if (showSettings) {
      setDraftAcceptFrom(acceptFrom);
      setDraftAcceptTo(acceptTo);
      setDraftBufferBefore(bufferBefore);
      setDraftBufferAfter(bufferAfter);
    }
  }, [showSettings, acceptFrom, acceptTo, bufferBefore, bufferAfter]);

  // Format dynamic time labels (e.g. "8h-12h")
  const formatRange = (range: { start: string; end: string } | null) => {
    if (!range) return "";
    const fmt = (t: string) => {
      const [h, m] = t.split(":");
      return m === "00" ? `${parseInt(h)}h` : `${parseInt(h)}h${m}`;
    };
    return `${fmt(range.start)}-${fmt(range.end)}`;
  };

  // Fermeture click extérieur du popover types
  useEffect(() => {
    if (!showTypePicker) return;
    const handler = (e: MouseEvent) => {
      if (typePickerRef.current && !typePickerRef.current.contains(e.target as Node)) {
        setShowTypePicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTypePicker]);

  const allSelected = selectedTypeIds.length === 0 || selectedTypeIds.length === categoryTypes.length;
  const typesLabel = allSelected
    ? "Tous les services"
    : selectedTypeIds.length === 1
      ? categoryTypes.find((t) => t._id === selectedTypeIds[0])?.name ?? "1 type"
      : `${selectedTypeIds.length} types`;

  const toggleType = (typeId: string) => {
    if (selectedTypeIds.includes(typeId)) {
      onSelectedTypeIdsChange(selectedTypeIds.filter((id) => id !== typeId));
    } else {
      onSelectedTypeIdsChange([...selectedTypeIds, typeId]);
    }
  };

  const selectAll = () => onSelectedTypeIdsChange([]);
  const selectNone = () => onSelectedTypeIdsChange(categoryTypes.map((t) => t._id).filter((_, i) => i === 0));

  return (
    <div
      className="bg-white p-2 mb-3"
      style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
    >
      {/* Mobile : 2 rows (controls + brushes) ; Desktop : flex single row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        {/* Row 1 mobile : type + mode (compact) */}
        <div className="flex items-center gap-2 flex-wrap sm:contents">
        {/* Sélecteur de types de services (multi-select) */}
        {categoryTypes.length > 0 && (
          <div className="relative flex-shrink-0" ref={typePickerRef}>
            <button
              type="button"
              onClick={() => setShowTypePicker((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors hover:bg-[#f7f5ef]"
              style={
                allSelected
                  ? { background: "#fff", color: "#1f1f1d", border: "1px solid #ece9e1" }
                  : { background: "#1f3a33", color: "#f7f5ef", border: "1px solid #1f3a33" }
              }
              title="Choisir les types de services concernés par le pinceau"
            >
              <Layers className="w-3 h-3" />
              <span className="truncate max-w-[120px]">{typesLabel}</span>
              <ChevronDown className={cn("w-3 h-3 transition-transform", showTypePicker && "rotate-180")} />
            </button>
            <AnimatePresence>
              {showTypePicker && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  className="absolute left-0 top-full mt-1.5 z-50 bg-white p-2 min-w-[240px]"
                  style={{
                    borderRadius: 12,
                    border: "1px solid #ece9e1",
                    boxShadow: "0 10px 30px rgba(30,30,28,0.10)",
                  }}
                >
                  <div className="text-[10px] font-medium uppercase tracking-[0.1em] mb-1.5 px-2" style={{ color: "#9c9484" }}>
                    Types concernés
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      selectAll();
                      setShowTypePicker(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] transition-colors hover:bg-[#f7f5ef]"
                    style={{ color: allSelected ? "#1f3a33" : "#1f1f1d", fontWeight: allSelected ? 600 : 500 }}
                  >
                    <div
                      className="w-4 h-4 rounded inline-flex items-center justify-center flex-shrink-0"
                      style={{
                        background: allSelected ? "#1f3a33" : "#fff",
                        border: `1px solid ${allSelected ? "#1f3a33" : "#dfdcd4"}`,
                      }}
                    >
                      {allSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    Tous les services
                  </button>
                  <div className="h-px my-1.5 mx-1" style={{ background: "#f1ede3" }} />
                  {categoryTypes.map((type) => {
                    const isChecked = !allSelected && selectedTypeIds.includes(type._id);
                    return (
                      <button
                        key={type._id}
                        type="button"
                        onClick={() => toggleType(type._id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] transition-colors hover:bg-[#f7f5ef]"
                        style={{ color: isChecked ? "#1f3a33" : "#1f1f1d", fontWeight: isChecked ? 600 : 500 }}
                      >
                        <div
                          className="w-4 h-4 rounded inline-flex items-center justify-center flex-shrink-0"
                          style={{
                            background: isChecked ? "#1f3a33" : "#fff",
                            border: `1px solid ${isChecked ? "#1f3a33" : "#dfdcd4"}`,
                          }}
                        >
                          {isChecked && <Check className="w-3 h-3 text-white" />}
                        </div>
                        {type.icon && <span>{type.icon}</span>}
                        <span className="flex-1 text-left truncate">{type.name}</span>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Mode toggle (Paint / Select) */}
        <div
          className="flex items-center p-0.5 flex-shrink-0"
          style={{ borderRadius: 999, background: "#f7f5ef", border: "1px solid #ece9e1" }}
        >
          <button
            type="button"
            onClick={() => onModeChange("paint")}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors"
            style={mode === "paint" ? { background: "#1f3a33", color: "#f7f5ef" } : { color: "#6d6d68" }}
            title="Peindre : 1 click = applique le pinceau"
          >
            <Brush className="w-3 h-3" />
            <span className="hidden sm:inline">Peindre</span>
          </button>
          <button
            type="button"
            onClick={() => onModeChange("select")}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors"
            style={mode === "select" ? { background: "#1f3a33", color: "#f7f5ef" } : { color: "#6d6d68" }}
            title="Sélection : drag = sélectionner une plage et choisir"
          >
            <MousePointer2 className="w-3 h-3" />
            <span className="hidden sm:inline">Sélection</span>
          </button>
        </div>
        </div>

        {/* Pinceau de statut + Personnalisé + Aide */}
        <div className="flex items-center gap-1 flex-wrap flex-1 sm:justify-end overflow-x-auto">
          {mode === "paint" && (
            <>
              {/* Choix principaux : Dispo journée / Indispo (mutuellement exclusifs) */}
              <button
                type="button"
                onClick={() => onBrushChange("available")}
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-full text-[11.5px] font-medium transition-all hover:bg-[#f7f5ef]"
                style={
                  selectedBrush === "available"
                    ? { background: "#1f3a33", color: "#f7f5ef", border: "1px solid #1f3a33" }
                    : { background: "#fff", color: "#3a3a38", border: "1px solid #dfdcd4" }
                }
                title="Disponible toute la journée (D)"
                aria-label="Dispo journée"
              >
                <Check className="w-3 h-3" />
                <span className="hidden xs:inline sm:inline">Dispo</span>
              </button>
              <button
                type="button"
                onClick={() => onBrushChange("unavailable")}
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-full text-[11.5px] font-medium transition-all hover:bg-[#f7f5ef]"
                style={
                  selectedBrush === "unavailable"
                    ? { background: "#1f3a33", color: "#f7f5ef", border: "1px solid #1f3a33" }
                    : { background: "#fff", color: "#3a3a38", border: "1px solid #dfdcd4" }
                }
                title="Indisponible (I)"
                aria-label="Indispo"
              >
                <X className="w-3 h-3" />
                <span className="hidden xs:inline sm:inline">Indispo</span>
              </button>

              {/* Séparateur visuel - hidden mobile */}
              <span className="text-[10px] mx-0.5 hidden sm:inline" style={{ color: "#cdc9c0" }}>OU</span>

              {/* Sélecteur multi-périodes : check chaque période voulue */}
              {(["morning", "afternoon", "evening"] as PeriodKey[]).map((period) => {
                const range = dynamicSlots[period];
                if (!range) return null;
                const isOn = activePeriods.has(period);
                const label = period === "morning" ? "Matin" : period === "afternoon" ? "Aprem" : "Soir";
                const Icon = period === "morning" ? Sun : period === "afternoon" ? Sunset : Moon;
                return (
                  <button
                    key={period}
                    type="button"
                    onClick={() => onTogglePeriod(period)}
                    className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-full text-[11.5px] font-medium transition-all hover:bg-[#f7f5ef]"
                    style={
                      isOn
                        ? { background: "#1f3a33", color: "#f7f5ef", border: "1px solid #1f3a33" }
                        : { background: "#fff", color: "#3a3a38", border: "1px solid #dfdcd4" }
                    }
                    title={`${label} · ${formatRange(range)} — cochez plusieurs périodes pour les combiner`}
                    aria-label={label}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="hidden xs:inline sm:inline">{label}</span>
                    <span
                      className="text-[10px] opacity-70 hidden lg:inline"
                      style={{ color: isOn ? "rgba(247,245,239,0.8)" : "#9c9484" }}
                    >
                      · {formatRange(range)}
                    </span>
                  </button>
                );
              })}

              {/* Personnalisé */}
              <button
                type="button"
                onClick={onOpenAdvanced}
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-full text-[11.5px] font-medium transition-colors hover:bg-[#f7f5ef]"
                style={
                  selectedBrush === "custom"
                    ? { background: "#1f3a33", color: "#f7f5ef", border: "1px solid #1f3a33" }
                    : { background: "#fff", color: "#3a3a38", border: "1px dashed #dfdcd4" }
                }
                title="Personnalisé : créneaux horaires sur mesure (puis cliquer sur un jour)"
                aria-label="Personnalisé"
              >
                <Settings2 className="w-3 h-3" />
                <span className="hidden md:inline">Personnalisé</span>
              </button>
            </>
          )}
          {mode === "select" && (
            <span className="text-[12px] text-[#6d6d68] px-2">
              {hasSelection
                ? "Cliquez pour appliquer un statut à la sélection"
                : "Glissez sur le calendrier pour sélectionner une plage"}
            </span>
          )}

          {/* Bouton Paramètres planning (intégré) */}
          <div className="relative" ref={settingsRef}>
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              className="w-7 h-7 inline-flex items-center justify-center rounded-full transition-colors hover:bg-[#f7f5ef]"
              style={{
                background: showSettings ? "#1f3a33" : "#fff",
                color: showSettings ? "#f7f5ef" : "#6d6d68",
                border: "1px solid #ece9e1",
              }}
              title="Paramètres planning (horaires & temps de préparation)"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
            <AnimatePresence>
              {showSettings && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-auto bottom-2 sm:bottom-auto sm:top-full sm:mt-1.5 z-50 bg-white p-4 sm:w-[380px]"
                    style={{
                      borderRadius: 12,
                      border: "1px solid #ece9e1",
                      boxShadow: "0 10px 30px rgba(30,30,28,0.10)",
                    }}
                  >
                    <div className="text-[10px] font-medium uppercase tracking-[0.1em] mb-1" style={{ color: "#9c9484" }}>
                      Paramètres planning
                    </div>
                    <h4 className="text-[14px] font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0 mb-3">
                      Horaires &amp; temps de préparation
                    </h4>

                    {/* Plage horaire d'acceptation des réservations */}
                    <div className="mb-4">
                      <label className="block text-[11px] font-medium uppercase tracking-[0.1em] mb-1.5" style={{ color: "#9c9484" }}>
                        Heures d&apos;acceptation
                      </label>
                      <p className="text-[11px] text-[#6d6d68] mb-2 leading-[1.5]">
                        Plage horaire pendant laquelle les clients peuvent réserver. Détermine aussi les pinceaux Matin / Aprem / Soir.
                      </p>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" style={{ color: "#9c9484" }} />
                        <input
                          type="time"
                          value={draftAcceptFrom}
                          onChange={(e) => setDraftAcceptFrom(e.target.value)}
                          className="px-2 py-1.5 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-[#1f3a33]/20"
                          style={{ border: "1px solid #ece9e1", background: "#fff", color: "#1f1f1d" }}
                        />
                        <span className="text-[11px]" style={{ color: "#6d6d68" }}>à</span>
                        <input
                          type="time"
                          value={draftAcceptTo}
                          onChange={(e) => setDraftAcceptTo(e.target.value)}
                          className="px-2 py-1.5 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-[#1f3a33]/20"
                          style={{ border: "1px solid #ece9e1", background: "#fff", color: "#1f1f1d" }}
                        />
                      </div>
                    </div>

                    {/* Buffer Before */}
                    <div className="mb-3">
                      <label className="block text-[11px] font-medium uppercase tracking-[0.1em] mb-1.5" style={{ color: "#9c9484" }}>
                        Temps avant chaque service
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {[0, 30, 60, 90].map((minutes) => (
                          <button
                            key={`before-${minutes}`}
                            type="button"
                            onClick={() => setDraftBufferBefore(minutes)}
                            className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors"
                            style={
                              draftBufferBefore === minutes
                                ? { background: "#1f3a33", color: "#f7f5ef", border: "1px solid #1f3a33" }
                                : { background: "#fff", color: "#3a3a38", border: "1px solid #dfdcd4" }
                            }
                          >
                            {minutes === 0 ? "Aucun" : minutes < 60 ? `${minutes} min` : `${minutes / 60}h`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Buffer After */}
                    <div className="mb-4">
                      <label className="block text-[11px] font-medium uppercase tracking-[0.1em] mb-1.5" style={{ color: "#9c9484" }}>
                        Temps après chaque service
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {[0, 30, 60, 90].map((minutes) => (
                          <button
                            key={`after-${minutes}`}
                            type="button"
                            onClick={() => setDraftBufferAfter(minutes)}
                            className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors"
                            style={
                              draftBufferAfter === minutes
                                ? { background: "#1f3a33", color: "#f7f5ef", border: "1px solid #1f3a33" }
                                : { background: "#fff", color: "#3a3a38", border: "1px solid #dfdcd4" }
                            }
                          >
                            {minutes === 0 ? "Aucun" : minutes < 60 ? `${minutes} min` : `${minutes / 60}h`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Footer actions */}
                    <div className="flex items-center justify-end gap-2 pt-3" style={{ borderTop: "1px solid #f1ede3" }}>
                      <button
                        type="button"
                        onClick={() => setShowSettings(false)}
                        className="px-3 py-1.5 rounded-full text-[12px] font-medium text-[#6d6d68] hover:bg-[#f7f5ef] transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          setSavingSettings(true);
                          try {
                            await onSavePreferences({
                              acceptFrom: draftAcceptFrom,
                              acceptTo: draftAcceptTo,
                              bufferBefore: draftBufferBefore,
                              bufferAfter: draftBufferAfter,
                            });
                            setShowSettings(false);
                          } finally {
                            setSavingSettings(false);
                          }
                        }}
                        disabled={savingSettings}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
                        style={{ background: "#1f3a33", color: "#f7f5ef" }}
                      >
                        {savingSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Enregistrer
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Bouton d'aide */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              className="w-7 h-7 inline-flex items-center justify-center rounded-full transition-colors hover:bg-[#f7f5ef]"
              style={{
                background: showHelp ? "#1f3a33" : "#fff",
                color: showHelp ? "#f7f5ef" : "#6d6d68",
                border: "1px solid #ece9e1",
              }}
              title="Comment ça marche ?"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
            <AnimatePresence>
              {showHelp && (
                <>
                  {/* Backdrop click pour fermer */}
                  <div className="fixed inset-0 z-40" onClick={() => setShowHelp(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-auto bottom-2 sm:bottom-auto sm:top-full sm:mt-1.5 z-50 bg-white p-4 sm:w-[360px] max-h-[80vh] overflow-y-auto"
                    style={{
                      borderRadius: 12,
                      border: "1px solid #ece9e1",
                      boxShadow: "0 10px 30px rgba(30,30,28,0.10)",
                    }}
                  >
                    <div className="text-[10px] font-medium uppercase tracking-[0.1em] mb-1" style={{ color: "#9c9484" }}>
                      Aide
                    </div>
                    <h4 className="text-[14px] font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0 mb-2">
                      Comment ça marche ?
                    </h4>
                    <div className="space-y-3 text-[12px] text-[#3a3a38] leading-[1.55]">
                      <div className="flex items-start gap-2">
                        <span
                          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold flex-shrink-0 mt-0.5"
                          style={{ background: "#1f3a33", color: "#f7f5ef" }}
                        >
                          1
                        </span>
                        <p>
                          <strong className="text-[#1f1f1d]">Choisissez les types de services</strong> concernés
                          (Garde, Services… ou tous).
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span
                          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold flex-shrink-0 mt-0.5"
                          style={{ background: "#1f3a33", color: "#f7f5ef" }}
                        >
                          2
                        </span>
                        <p>
                          <strong className="text-[#1f1f1d]">Sélectionnez un pinceau</strong> :
                          Dispo, Indispo, Matin, Aprem, Soir ou Personnalisé.
                          Raccourcis clavier : <kbd className="px-1 rounded bg-[#f7f5ef] border border-[#ece9e1] text-[10px]">D</kbd>{" "}
                          <kbd className="px-1 rounded bg-[#f7f5ef] border border-[#ece9e1] text-[10px]">I</kbd>{" "}
                          <kbd className="px-1 rounded bg-[#f7f5ef] border border-[#ece9e1] text-[10px]">M</kbd>{" "}
                          <kbd className="px-1 rounded bg-[#f7f5ef] border border-[#ece9e1] text-[10px]">A</kbd>{" "}
                          <kbd className="px-1 rounded bg-[#f7f5ef] border border-[#ece9e1] text-[10px]">S</kbd>
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span
                          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold flex-shrink-0 mt-0.5"
                          style={{ background: "#1f3a33", color: "#f7f5ef" }}
                        >
                          3
                        </span>
                        <p>
                          <strong className="text-[#1f1f1d]">Cliquez sur un jour</strong> pour appliquer instantanément,
                          ou <strong>glissez</strong> pour peindre plusieurs jours d&apos;un coup.
                        </p>
                      </div>
                      <div
                        className="p-2.5 mt-2"
                        style={{ borderRadius: 10, background: "#f5f9f6", border: "1px solid #cfdbd3" }}
                      >
                        <div className="text-[10px] font-medium uppercase tracking-[0.1em] mb-1" style={{ color: "#2f4a3f" }}>
                          Combiner les créneaux
                        </div>
                        <ul className="space-y-1 text-[11.5px]" style={{ color: "#3a3a38" }}>
                          <li>• <strong>Matin / Aprem / Soir</strong> sont <strong>cumulables</strong> sur le même jour. Cliquez plusieurs fois pour ajouter ou retirer un créneau.</li>
                          <li>• Exemple : Matin + Soir sur le même jour = dispo 8h-12h et 18h-22h, indispo l&apos;après-midi.</li>
                          <li>• <strong>Dispo</strong> et <strong>Indispo</strong> remplacent toujours l&apos;état du jour.</li>
                        </ul>
                      </div>
                      <div
                        className="p-2.5 mt-2"
                        style={{ borderRadius: 10, background: "#fcfaf4", border: "1px solid #f1ede3" }}
                      >
                        <div className="text-[10px] font-medium uppercase tracking-[0.1em] mb-1" style={{ color: "#9c9484" }}>
                          Plus
                        </div>
                        <ul className="space-y-1 text-[11.5px]" style={{ color: "#3a3a38" }}>
                          <li>• <strong>Mode Sélection</strong> : ouvre la modal détaillée pour ajouter une raison ou plusieurs créneaux.</li>
                          <li>• <strong>Personnalisé</strong> : créneaux horaires sur mesure (puis cliquez sur un jour).</li>
                          <li>• Une <strong>action de peinture</strong> peut être annulée via le toast en bas pendant 5 secondes.</li>
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Résumé visuel du pinceau actif (toujours visible en mode paint) */}
      {mode === "paint" && (() => {
        let summary: React.ReactNode = null;
        let bg = "#fcfaf4";
        let border = "#f1ede3";
        let color = "#3a3a38";

        if (selectedBrush === "custom") {
          bg = "#fdf8ec"; border = "#f4e6c1"; color = "#7a5b1a";
          summary = (
            <>
              <Settings2 className="w-3 h-3 flex-shrink-0" />
              Pinceau <strong>Personnalisé</strong> activé — cliquez sur un jour pour configurer ses créneaux sur mesure.
            </>
          );
        } else if (selectedBrush === "available") {
          bg = "#f5f9f6"; border = "#cfdbd3"; color = "#2f4a3f";
          summary = (
            <>
              <Check className="w-3 h-3 flex-shrink-0" />
              Pinceau actif : <strong>Dispo journée entière</strong> — cliquez sur un jour pour l&apos;appliquer.
            </>
          );
        } else if (selectedBrush === "unavailable") {
          summary = (
            <>
              <X className="w-3 h-3 flex-shrink-0" />
              Pinceau actif : <strong>Indisponible</strong> — cliquez sur un jour pour l&apos;appliquer.
            </>
          );
        } else if (activePeriods.size > 0) {
          bg = "#f5f9f6"; border = "#cfdbd3"; color = "#2f4a3f";
          const labels = (["morning", "afternoon", "evening"] as PeriodKey[])
            .filter((p) => activePeriods.has(p))
            .map((p) => {
              const range = dynamicSlots[p];
              const labelMap = { morning: "Matin", afternoon: "Aprem", evening: "Soir" };
              return `${labelMap[p]} (${range ? formatRange(range) : ""})`;
            })
            .join(" + ");
          summary = (
            <>
              <Brush className="w-3 h-3 flex-shrink-0" />
              Pinceau actif : <strong>{labels}</strong> — cliquez sur un jour pour appliquer cette combinaison en une fois.
            </>
          );
        } else {
          // Aucune sélection
          bg = "#f7f5ef"; border = "#ece9e1"; color = "#9c9484";
          summary = (
            <>
              <Brush className="w-3 h-3 flex-shrink-0" />
              <strong>Choisissez un pinceau ci-dessus</strong> (Dispo journée, Indispo, ou cochez Matin/Aprem/Soir).
            </>
          );
        }

        return (
          <div
            className="mt-2 p-2 text-[11.5px] inline-flex items-center gap-2 leading-[1.4]"
            style={{ borderRadius: 10, background: bg, border: `1px solid ${border}`, color }}
          >
            {summary}
          </div>
        );
      })()}
    </div>
  );
}
