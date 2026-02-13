"use client";

import { motion } from "framer-motion";
import { Star, CheckCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface ReviewBannerProps {
  canReview: boolean;
  review: any;
  canDispute: boolean;
  onOpenReview: () => void;
  onOpenDispute: () => void;
}

export function ReviewBanner({
  canReview,
  review,
  canDispute,
  onOpenReview,
  onOpenDispute,
}: ReviewBannerProps) {
  return (
    <>
      {/* Bandeau laisser un avis */}
      {canReview && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 border border-amber-200 bg-amber-50"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-amber-100 rounded-xl">
              <Star className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-800">
                Comment s&apos;est passé le service ?
              </h3>
              <p className="text-sm text-amber-600 mt-0.5">
                Votre avis aide les autres propriétaires et le prestataire.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onOpenReview}
              className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
            >
              <Star className="w-5 h-5" />
              Laisser un avis
            </button>
            {canDispute && (
              <button
                onClick={onOpenDispute}
                className="py-3 px-4 border-2 border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-5 h-5" />
                Signaler
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Avis déjà laissé */}
      {review && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 border border-green-200 bg-green-50"
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-semibold text-green-800">Avis publié</p>
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "w-4 h-4",
                      star <= Math.round(review.overallRating)
                        ? "fill-accent text-accent"
                        : "text-gray-300"
                    )}
                  />
                ))}
                <span className="text-sm text-green-700 ml-1">
                  {review.overallRating}/5
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}
