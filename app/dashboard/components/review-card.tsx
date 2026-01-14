"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import type { Review } from "@/app/lib/dashboard-data";

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <motion.div
      className="bg-white rounded-2xl p-5 shadow-md"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-xl">
            {review.clientAvatar}
          </div>
          <div>
            <p className="font-semibold text-foreground">{review.clientName}</p>
            <p className="text-xs text-text-light flex items-center gap-1">
              <span>{review.animal.emoji}</span>
              {review.animal.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < review.rating ? "fill-accent text-accent" : "text-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Comment */}
      <p className="text-foreground text-sm leading-relaxed mb-3">
        &ldquo;{review.comment}&rdquo;
      </p>

      {/* Date */}
      <p className="text-xs text-text-light">{formatDate(review.date)}</p>
    </motion.div>
  );
}

interface ReviewListProps {
  reviews: Review[];
  maxItems?: number;
  viewAllHref?: string;
}

export function ReviewList({ reviews, maxItems = 3, viewAllHref }: ReviewListProps) {
  const displayedReviews = reviews.slice(0, maxItems);
  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : "0";

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <span>⭐</span>
          Derniers avis
          <span className="ml-2 px-2 py-0.5 bg-accent/20 text-foreground text-sm rounded-full flex items-center gap-1">
            {averageRating}
            <Star className="w-3 h-3 fill-accent text-accent" />
          </span>
        </h3>
        {viewAllHref && reviews.length > maxItems && (
          <a
            href={viewAllHref}
            className="text-sm text-primary font-medium hover:underline"
          >
            Voir tout
          </a>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="text-text-light text-center py-8">Aucun avis pour le moment</p>
      ) : (
        <div className="space-y-4">
          {displayedReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}
