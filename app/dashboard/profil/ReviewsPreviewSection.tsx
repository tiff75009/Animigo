"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { mockReviews, calculateStats } from "@/app/lib/dashboard-data";

export default function ReviewsPreviewSection() {
  const stats = calculateStats();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-white rounded-3xl shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Star className="w-5 h-5 fill-accent text-accent" />
          Derniers avis
          <span className="ml-2 px-2 py-0.5 bg-accent/20 text-foreground text-sm rounded-full">
            {stats.averageRating.toFixed(1)}/5
          </span>
        </h3>
        <a href="/dashboard/avis" className="text-sm text-primary font-medium hover:underline">
          Voir tous les avis
        </a>
      </div>

      <div className="space-y-4">
        {mockReviews.slice(0, 2).map(review => (
          <div key={review.id} className="p-4 bg-background rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-xl">
                {review.clientAvatar}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{review.clientName}</p>
                <p className="text-xs text-text-light flex items-center gap-1">
                  <span>{review.animal.emoji}</span>
                  {review.animal.name}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-4 h-4",
                      i < review.rating ? "fill-accent text-accent" : "text-gray-200"
                    )}
                  />
                ))}
              </div>
            </div>
            <p className="text-text-light text-sm">&ldquo;{review.comment}&rdquo;</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
