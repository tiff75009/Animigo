"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, ThumbsUp, ThumbsDown, Send, Loader2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/app/lib/utils";

function StarRatingInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">
        {label}
      </label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                "w-8 h-8 transition-colors",
                star <= (hover || value)
                  ? "fill-accent text-accent"
                  : "text-gray-200"
              )}
            />
          </button>
        ))}
        {value > 0 && (
          <span className="ml-2 text-sm text-gray-500">{value}/5</span>
        )}
      </div>
    </div>
  );
}

export function ReviewModal({
  isOpen,
  onClose,
  missionId,
  serviceName,
  announcerName,
}: {
  isOpen: boolean;
  onClose: () => void;
  missionId: string;
  serviceName: string;
  announcerName: string;
}) {
  const [qualityRating, setQualityRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submitReview = useMutation(api.planning.reviews.submitReview);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  const canSubmit =
    qualityRating > 0 &&
    communicationRating > 0 &&
    wouldRecommend !== null &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit || !token) return;

    setIsSubmitting(true);
    try {
      await submitReview({
        sessionToken: token,
        missionId: missionId as Id<"missions">,
        qualityRating,
        communicationRating,
        wouldRecommend,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setQualityRating(0);
        setCommunicationRating(0);
        setWouldRecommend(null);
        setComment("");
      }, 2000);
    } catch (error) {
      console.error("Erreur soumission avis:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

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
          className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {submitted ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                Merci pour votre avis !
              </h3>
              <p className="text-gray-500">
                Votre retour aide les autres propriétaires à faire leur choix.
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Donner mon avis
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {serviceName} avec {announcerName}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Qualité du service */}
                <StarRatingInput
                  value={qualityRating}
                  onChange={setQualityRating}
                  label="Qualité du service"
                />

                {/* Communication */}
                <StarRatingInput
                  value={communicationRating}
                  onChange={setCommunicationRating}
                  label="Communication"
                />

                {/* Recommandation */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Recommanderiez-vous ce prestataire ?
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setWouldRecommend(true)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors border-2",
                        wouldRecommend === true
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-200 text-gray-500 hover:border-green-300"
                      )}
                    >
                      <ThumbsUp className="w-5 h-5" />
                      Oui
                    </button>
                    <button
                      type="button"
                      onClick={() => setWouldRecommend(false)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors border-2",
                        wouldRecommend === false
                          ? "border-red-500 bg-red-50 text-red-700"
                          : "border-gray-200 text-gray-500 hover:border-red-300"
                      )}
                    >
                      <ThumbsDown className="w-5 h-5" />
                      Non
                    </button>
                  </div>
                </div>

                {/* Commentaire */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Commentaire{" "}
                    <span className="text-gray-400 font-normal">
                      (optionnel)
                    </span>
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) =>
                      setComment(e.target.value.slice(0, 500))
                    }
                    placeholder="Partagez votre expérience..."
                    className="w-full px-4 py-3 bg-gray-100 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground min-h-[100px]"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {comment.length}/500
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-gray-200 text-foreground rounded-xl font-semibold"
                >
                  Plus tard
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Publier
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
