"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Star } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { ReviewData } from "./types";

interface AnnouncerReviewsProps {
  reviews: ReviewData[];
  rating: number;
  reviewCount: number;
  className?: string;
}

export default function AnnouncerReviews({
  reviews,
  rating,
  reviewCount,
  className,
}: AnnouncerReviewsProps) {
  if (reviewCount === 0) {
    return (
      <section className={className}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="p-2 bg-amber-50 rounded-lg">
              <Star className="w-5 h-5 text-amber-500" />
            </span>
            Avis
          </h2>
        </div>
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucun avis pour le moment</p>
          <p className="text-sm text-gray-400 mt-1">
            Soyez le premier à laisser un avis !
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={className}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span className="p-2 bg-amber-50 rounded-lg">
            <Star className="w-5 h-5 text-amber-500" />
          </span>
          Avis ({reviewCount})
        </h2>
        <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 rounded-full">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <span className="font-bold text-gray-900">{rating.toFixed(1)}</span>
        </div>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-5 border border-gray-100"
          >
            <div className="flex items-start gap-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                {review.avatar ? (
                  <Image src={review.avatar} alt={review.author} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <span className="text-white font-bold">{review.author.charAt(0)}</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{review.author}</p>
                    <p className="text-xs text-gray-500">{review.animal} • {review.date}</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "w-4 h-4",
                          i < review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-gray-200 text-gray-200"
                        )}
                      />
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-gray-600 leading-relaxed">{review.content}</p>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Show more reviews button */}
        {reviews.length < reviewCount && (
          <button className="w-full py-3 text-primary font-medium hover:bg-primary/5 rounded-xl transition-colors">
            Voir tous les avis
          </button>
        )}
      </div>
    </section>
  );
}
