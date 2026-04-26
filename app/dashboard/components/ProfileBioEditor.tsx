"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pencil,
  Check,
  X,
  Loader2,
  Sparkles,
  AlertCircle,
  Wand2,
} from "lucide-react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useContactInfoCheck } from "@/app/hooks/useContactInfoCheck";

interface ProfileBioEditorProps {
  value: string;
  placeholder?: string;
  onSave: (value: string) => Promise<void>;
}

type ToneOption = "familial" | "professionnel" | "chaleureux" | "expert";

const TONE_OPTIONS: { id: ToneOption; label: string; icon: string; description: string }[] = [
  { id: "familial", label: "Familial", icon: "👨‍👩‍👧", description: "Voisin de confiance" },
  { id: "professionnel", label: "Professionnel", icon: "💼", description: "Sérieux et fiable" },
  { id: "chaleureux", label: "Chaleureux", icon: "❤️", description: "Passionné des animaux" },
  { id: "expert", label: "Expert", icon: "🎓", description: "Compétences techniques" },
];

export default function ProfileBioEditor({
  value,
  placeholder,
  onSave,
}: ProfileBioEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filtre live regex + Gemini
  const contactCheck = useContactInfoCheck(draft);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  const handleStart = () => {
    setDraft(value);
    setSaveError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(value);
    setSaveError(null);
    setIsEditing(false);
    setShowGenerator(false);
  };

  const handleSave = async () => {
    if (contactCheck.hasViolation) {
      setSaveError(contactCheck.message);
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(draft.trim());
      setIsEditing(false);
      setShowGenerator(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  const hasDescription = value && value.trim().length > 0;
  const canSave =
    !isSaving &&
    !contactCheck.hasViolation &&
    !contactCheck.isCheckingGemini &&
    draft.trim().length > 0 &&
    draft.trim() !== value.trim();

  // Mode lecture
  if (!isEditing) {
    return (
      <div className="group relative">
        {hasDescription ? (
          <p className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-line m-0">
            {value}
          </p>
        ) : (
          <div
            className="flex items-start gap-3 p-3"
            style={{ background: "#fcfaf4", borderRadius: 10, border: "1px dashed #ece9e1" }}
          >
            <div
              className="p-2 rounded-lg flex-shrink-0"
              style={{ background: "#fef3c7" }}
            >
              <Pencil className="w-4 h-4" style={{ color: "#a16207" }} />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold m-0" style={{ color: "#a16207" }}>
                Description manquante
              </p>
              <p className="text-[12px] mt-0.5 m-0" style={{ color: "#6d6d68" }}>
                Présentez-vous aux propriétaires d&apos;animaux pour valoriser votre profil.
              </p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={handleStart}
          className="absolute top-0 right-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "#1f3a33", color: "#f7f5ef" }}
        >
          <Pencil className="w-3 h-3" />
          {hasDescription ? "Modifier" : "Rédiger"}
        </button>
      </div>
    );
  }

  // Mode édition
  return (
    <div className="space-y-2">
      {/* Toolbar : compteur + bouton générer */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#9c9484" }}>
          {draft.length} / 1000 caractères
        </span>
        <button
          type="button"
          onClick={() => setShowGenerator((v) => !v)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold transition-all"
          style={
            showGenerator
              ? { background: "#1f3a33", color: "#f7f5ef" }
              : { background: "#f5f9f6", color: "#1f3a33", border: "1px solid #cfdbd3" }
          }
        >
          <Sparkles className="w-3 h-3" />
          Générer avec l&apos;IA
        </button>
      </div>

      {/* Mini-générateur IA */}
      <AnimatePresence>
        {showGenerator && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <BioGenerator
              onResult={(text) => {
                setDraft(text);
                setShowGenerator(false);
                if (textareaRef.current) {
                  textareaRef.current.style.height = "auto";
                  textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
                }
              }}
              onCancel={() => setShowGenerator(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          // Auto-grow
          e.target.style.height = "auto";
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
        maxLength={1000}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2.5 text-[13.5px] leading-relaxed text-[#1f1f1d] focus:outline-none focus:ring-2 transition-all resize-none placeholder:text-[#cdc9c0]"
        style={{
          borderRadius: 10,
          border: contactCheck.hasViolation ? "1px solid #f1cdcd" : "1px solid #ece9e1",
          background: contactCheck.hasViolation ? "#fdf0f0" : "#fff",
          minHeight: 100,
        }}
      />

      {/* Warning contact info (regex + Gemini) */}
      {contactCheck.hasViolation && (
        <p
          className="text-[12px] flex items-start gap-1.5 px-2.5 py-1.5 m-0"
          style={{
            background: "#fdf0f0",
            color: "#8a3a3a",
            border: "1px solid #f1cdcd",
            borderRadius: 8,
          }}
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>
            {contactCheck.message}
            {contactCheck.source === "gemini" && (
              <span className="ml-1 text-[10px] font-semibold opacity-70">
                (détecté par l&apos;IA)
              </span>
            )}
          </span>
        </p>
      )}
      {contactCheck.isCheckingGemini && (
        <p
          className="text-[11.5px] flex items-center gap-1.5 px-2.5 py-1 m-0"
          style={{
            background: "#f1f5f9",
            color: "#475569",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
          }}
        >
          <Loader2 className="w-3 h-3 flex-shrink-0 animate-spin" />
          Analyse IA en cours...
        </p>
      )}

      {/* Erreur de save */}
      {saveError && (
        <p
          className="text-[12px] flex items-start gap-1.5 px-2.5 py-1.5 m-0"
          style={{
            background: "#fdf0f0",
            color: "#8a3a3a",
            border: "1px solid #f1cdcd",
            borderRadius: 8,
          }}
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {saveError}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSaving}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors hover:bg-[#f7f5ef]"
          style={{ color: "#6d6d68", border: "1px solid #ece9e1" }}
        >
          <X className="w-3 h-3" />
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          title={
            contactCheck.hasViolation
              ? "Retirez les coordonnées avant d'enregistrer"
              : undefined
          }
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-opacity hover:opacity-90"
          style={
            canSave
              ? { background: "#1f3a33", color: "#f7f5ef" }
              : { background: "#ece9e1", color: "#9c9484", cursor: "not-allowed" }
          }
        >
          {isSaving ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Check className="w-3 h-3" />
          )}
          Enregistrer
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// BioGenerator : questionnaire guidé pour générer une description riche
// ──────────────────────────────────────────────────────────────────

type ActivityStatus = "main" | "side" | "retired" | "student" | "hobby";
type ExperienceLevel = "debutant" | "1-3" | "3-10" | "10plus";

const ACTIVITY_OPTIONS: { id: ActivityStatus; label: string; emoji: string }[] = [
  { id: "main", label: "Activité principale", emoji: "💼" },
  { id: "side", label: "Complément à mon métier", emoji: "🔄" },
  { id: "student", label: "En parallèle de mes études", emoji: "🎓" },
  { id: "retired", label: "À la retraite", emoji: "🧓" },
  { id: "hobby", label: "Une passion / loisir", emoji: "❤️" },
];

const EXPERIENCE_OPTIONS: { id: ExperienceLevel; label: string }[] = [
  { id: "debutant", label: "Débutant·e (< 1 an)" },
  { id: "1-3", label: "1 à 3 ans" },
  { id: "3-10", label: "3 à 10 ans" },
  { id: "10plus", label: "Plus de 10 ans" },
];

const FORMATION_OPTIONS = [
  "ACACED",
  "Premiers secours canins",
  "Vétérinaire / ASV",
  "Éducateur canin",
  "Comportementaliste",
  "Toilettage",
  "Autre",
];

const SKILL_OPTIONS: { id: string; label: string }[] = [
  { id: "medication", label: "Administration de médicaments" },
  { id: "vieux", label: "Animaux âgés / palliatifs" },
  { id: "anxieux", label: "Animaux anxieux ou réactifs" },
  { id: "cat1_2", label: "Chiens cat. 1 / 2" },
  { id: "transport", label: "Transport vétérinaire" },
  { id: "agility", label: "Sport canin / agility" },
  { id: "socialisation", label: "Socialisation chiots" },
  { id: "education", label: "Éducation positive" },
];

interface FormState {
  activityStatus?: ActivityStatus;
  currentJob: string;
  experienceLevel?: ExperienceLevel;
  formations: string[];
  ownsAnimals?: boolean;
  ownAnimalsDescription: string;
  motivation: string;
  specialSkills: string[];
  hasGarden?: boolean;
  hasVehicle?: boolean;
  customNote: string;
  tone: ToneOption;
}

function BioGenerator({
  onResult,
  onCancel,
}: {
  onResult: (text: string) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>({
    currentJob: "",
    formations: [],
    ownAnimalsDescription: "",
    motivation: "",
    specialSkills: [],
    customNote: "",
    tone: "chaleureux",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateBio = useAction(api.api.geminiTextAnalysis.generateProfileDescription);

  const toggleFormation = (f: string) => {
    setForm((prev) => ({
      ...prev,
      formations: prev.formations.includes(f)
        ? prev.formations.filter((x) => x !== f)
        : [...prev.formations, f],
    }));
  };

  const toggleSkill = (s: string) => {
    setForm((prev) => ({
      ...prev,
      specialSkills: prev.specialSkills.includes(s)
        ? prev.specialSkills.filter((x) => x !== s)
        : [...prev.specialSkills, s],
    }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateBio({
        tone: form.tone,
        activityStatus: form.activityStatus,
        currentJob: form.currentJob.trim() || undefined,
        experienceLevel: form.experienceLevel,
        formations: form.formations.length > 0 ? form.formations : undefined,
        ownsAnimals: form.ownsAnimals,
        ownAnimalsDescription: form.ownAnimalsDescription.trim() || undefined,
        motivation: form.motivation.trim() || undefined,
        specialSkills: form.specialSkills.length > 0 ? form.specialSkills : undefined,
        hasGarden: form.hasGarden,
        hasVehicle: form.hasVehicle,
        customNote: form.customNote.trim() || undefined,
      });
      if (result.success && result.description) {
        onResult(result.description);
      } else {
        setError(result.error || "Échec de la génération");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsGenerating(false);
    }
  };

  // Compteur de questions répondues (pour indication visuelle)
  const answered =
    Number(!!form.activityStatus) +
    Number(!!form.experienceLevel) +
    Number(form.formations.length > 0) +
    Number(form.ownsAnimals !== undefined) +
    Number(!!form.motivation.trim()) +
    Number(form.specialSkills.length > 0);

  return (
    <div
      className="p-3.5 space-y-3.5"
      style={{ background: "#fcfaf4", borderRadius: 12, border: "1px solid #ece9e1" }}
    >
      {/* En-tête */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: "#1f3a33" }} />
          <span className="text-[13px] font-semibold" style={{ color: "#1f1f1d" }}>
            Questionnaire — réponses guidées
          </span>
        </div>
        <span
          className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: "#f5f9f6", color: "#1f3a33", border: "1px solid #cfdbd3" }}
        >
          {answered}/6
        </span>
      </div>
      <p className="text-[11.5px] m-0" style={{ color: "#6d6d68" }}>
        Plus vous répondez, plus la description sera personnalisée. Toutes les questions sont optionnelles.
      </p>

      {/* Q1 — Statut */}
      <Question label="1. Pour vous, garder des animaux c'est…" answered={!!form.activityStatus}>
        <div className="grid grid-cols-2 gap-1.5">
          {ACTIVITY_OPTIONS.map((opt) => {
            const selected = form.activityStatus === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  setForm((p) => ({ ...p, activityStatus: selected ? undefined : opt.id }))
                }
                className="flex items-center gap-1.5 px-2 py-1.5 transition-all text-left"
                style={chipStyle(selected)}
              >
                <span className="text-[14px] leading-none">{opt.emoji}</span>
                <span
                  className="text-[11.5px] font-medium flex-1 truncate"
                  style={{ color: selected ? "#1f3a33" : "#1f1f1d" }}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
        {form.activityStatus === "side" && (
          <input
            type="text"
            value={form.currentJob}
            onChange={(e) => setForm((p) => ({ ...p, currentJob: e.target.value }))}
            maxLength={50}
            placeholder="Votre métier principal (ex : infirmière, professeur…)"
            className="mt-1.5 w-full px-2.5 py-1.5 text-[12px] focus:outline-none placeholder:text-[#cdc9c0]"
            style={inputStyle}
          />
        )}
      </Question>

      {/* Q2 — Expérience */}
      <Question label="2. Combien d'années d'expérience avez-vous ?" answered={!!form.experienceLevel}>
        <div className="grid grid-cols-2 gap-1.5">
          {EXPERIENCE_OPTIONS.map((opt) => {
            const selected = form.experienceLevel === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  setForm((p) => ({ ...p, experienceLevel: selected ? undefined : opt.id }))
                }
                className="px-2 py-1.5 text-[11.5px] font-medium transition-all text-left"
                style={chipStyle(selected)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </Question>

      {/* Q3 — Formations */}
      <Question
        label="3. Avez-vous des formations en lien avec les animaux ?"
        answered={form.formations.length > 0}
      >
        <div className="flex flex-wrap gap-1.5">
          {FORMATION_OPTIONS.map((f) => {
            const selected = form.formations.includes(f);
            return (
              <button
                key={f}
                type="button"
                onClick={() => toggleFormation(f)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-medium transition-all"
                style={pillStyle(selected)}
              >
                {selected && <Check className="w-3 h-3" />}
                {f}
              </button>
            );
          })}
        </div>
      </Question>

      {/* Q4 — Animaux personnels */}
      <Question
        label="4. Avez-vous des animaux à la maison ?"
        answered={form.ownsAnimals !== undefined}
      >
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setForm((p) => ({ ...p, ownsAnimals: true }))}
            className="flex-1 px-2.5 py-1.5 text-[11.5px] font-medium transition-all"
            style={chipStyle(form.ownsAnimals === true)}
          >
            Oui
          </button>
          <button
            type="button"
            onClick={() =>
              setForm((p) => ({ ...p, ownsAnimals: false, ownAnimalsDescription: "" }))
            }
            className="flex-1 px-2.5 py-1.5 text-[11.5px] font-medium transition-all"
            style={chipStyle(form.ownsAnimals === false)}
          >
            Non
          </button>
        </div>
        {form.ownsAnimals === true && (
          <input
            type="text"
            value={form.ownAnimalsDescription}
            onChange={(e) => setForm((p) => ({ ...p, ownAnimalsDescription: e.target.value }))}
            maxLength={80}
            placeholder="Ex : 2 chiens et 1 chat, tous bien sociabilisés"
            className="mt-1.5 w-full px-2.5 py-1.5 text-[12px] focus:outline-none placeholder:text-[#cdc9c0]"
            style={inputStyle}
          />
        )}
      </Question>

      {/* Q5 — Compétences spéciales */}
      <Question
        label="5. Avez-vous des compétences particulières ?"
        answered={form.specialSkills.length > 0}
      >
        <div className="flex flex-wrap gap-1.5">
          {SKILL_OPTIONS.map((s) => {
            const selected = form.specialSkills.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSkill(s.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-medium transition-all"
                style={pillStyle(selected)}
              >
                {selected && <Check className="w-3 h-3" />}
                {s.label}
              </button>
            );
          })}
        </div>
      </Question>

      {/* Q6 — Motivation libre */}
      <Question
        label="6. Pourquoi proposez-vous ce service ? (votre histoire)"
        answered={!!form.motivation.trim()}
      >
        <textarea
          value={form.motivation}
          onChange={(e) => setForm((p) => ({ ...p, motivation: e.target.value }))}
          maxLength={250}
          rows={2}
          placeholder="Ex : J'ai toujours grandi avec des chiens, je veux aider les voisins quand ils partent en vacances et financer mes études vétérinaires…"
          className="w-full px-2.5 py-1.5 text-[12px] focus:outline-none resize-none placeholder:text-[#cdc9c0]"
          style={inputStyle}
        />
        <p className="text-[10px] mt-1 m-0 text-right" style={{ color: "#9c9484" }}>
          {form.motivation.length}/250
        </p>
      </Question>

      {/* Choix du ton */}
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.1em] mb-1.5" style={{ color: "#9c9484" }}>
          Ton de la description
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {TONE_OPTIONS.map((opt) => {
            const selected = form.tone === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setForm((p) => ({ ...p, tone: opt.id }))}
                className="flex items-center gap-2 px-2.5 py-1.5 transition-all"
                style={chipStyle(selected)}
              >
                <span className="text-[14px] leading-none">{opt.icon}</span>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[11.5px] font-semibold m-0" style={{ color: selected ? "#1f3a33" : "#1f1f1d" }}>
                    {opt.label}
                  </p>
                  <p className="text-[10px] m-0 truncate" style={{ color: "#6d6d68" }}>
                    {opt.description}
                  </p>
                </div>
                {selected && <Check className="w-3 h-3 flex-shrink-0" style={{ color: "#1f3a33" }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Note libre */}
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.1em] mb-1.5" style={{ color: "#9c9484" }}>
          Quelque chose à ajouter ? <span className="normal-case font-normal" style={{ color: "#cdc9c0" }}>(optionnel)</span>
        </p>
        <input
          type="text"
          value={form.customNote}
          onChange={(e) => setForm((p) => ({ ...p, customNote: e.target.value }))}
          maxLength={150}
          placeholder="Ex : disponible week-ends, jardin clôturé sécurisé…"
          className="w-full px-2.5 py-1.5 text-[12px] focus:outline-none placeholder:text-[#cdc9c0]"
          style={inputStyle}
        />
      </div>

      {/* Erreur */}
      {error && (
        <p
          className="text-[11.5px] flex items-start gap-1.5 px-2 py-1 m-0"
          style={{ background: "#fdf0f0", color: "#8a3a3a", border: "1px solid #f1cdcd", borderRadius: 8 }}
        >
          <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 pt-1" style={{ borderTop: "1px solid #ece9e1" }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={isGenerating}
          className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full transition-colors hover:bg-white"
          style={{ color: "#6d6d68" }}
        >
          Fermer
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "#1f3a33", color: "#f7f5ef" }}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Génération...
            </>
          ) : (
            <>
              <Wand2 className="w-3 h-3" />
              Générer ma description
            </>
          )}
        </button>
      </div>
      <p className="text-[10.5px] m-0 text-center" style={{ color: "#9c9484" }}>
        💡 Vous pourrez modifier le texte généré avant de l&apos;enregistrer
      </p>
    </div>
  );
}

// ─── Helpers de styles ───
const chipStyle = (selected: boolean): React.CSSProperties =>
  selected
    ? { background: "#f5f9f6", border: "1px solid #1f3a33", borderRadius: 10 }
    : { background: "#fff", border: "1px solid #ece9e1", borderRadius: 10 };

const pillStyle = (selected: boolean): React.CSSProperties =>
  selected
    ? { background: "#1f3a33", color: "#f7f5ef", border: "1px solid #1f3a33" }
    : { background: "#fff", color: "#1f1f1d", border: "1px solid #ece9e1" };

const inputStyle: React.CSSProperties = {
  borderRadius: 10,
  border: "1px solid #ece9e1",
  background: "#fff",
  color: "#1f1f1d",
};

// Wrapper question avec label + indicateur "répondu"
function Question({
  label,
  answered,
  children,
}: {
  label: string;
  answered: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11.5px] font-semibold m-0" style={{ color: "#1f1f1d" }}>
          {label}
        </p>
        {answered && (
          <span
            className="inline-flex items-center justify-center w-4 h-4 rounded-full"
            style={{ background: "#1f3a33", color: "#f7f5ef" }}
            title="Répondu"
          >
            <Check className="w-2.5 h-2.5" strokeWidth={3} />
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
