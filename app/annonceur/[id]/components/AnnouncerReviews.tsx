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
        <div className="mb-4">
          <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-1">
            Avis
          </div>
          <h2 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
            Avis clients
          </h2>
        </div>
        <div
          className="p-8 text-center"
          style={{ background: "#f7f5ef", borderRadius: 14, border: "1px solid #ece9e1" }}
        >
          <Star className="w-9 h-9 mx-auto mb-3" style={{ color: "#cdc9c0" }} />
          <p className="text-[13px] text-[#6d6d68]">Aucun avis pour le moment</p>
          <p className="text-[11px] text-[#9c9484] mt-1">
            Soyez le premier à laisser un avis !
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-1">
            Avis ({reviewCount})
          </div>
          <h2 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
            Avis clients
          </h2>
        </div>
        <div
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full"
          style={{ border: "1px solid #dfdcd4", background: "#fff" }}
        >
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="text-[13px] font-semibold text-[#1f1f1d]">{rating.toFixed(1)}</span>
        </div>
      </div>

      <div className="space-y-3">
        {reviews.map((review) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-5"
            style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
          >
            <div className="flex items-start gap-3">
              <div
                className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
                style={{ border: "1px solid rgba(0,0,0,0.05)" }}
              >
                {review.avatar ? (
                  <Image src={review.avatar} alt={review.author} fill className="object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-white font-semibold"
                    style={{ background: "linear-gradient(135deg, #e8efe9, #d4e0d2)", color: "#3a5a40" }}
                  >
                    {review.author.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#1f1f1d] tracking-[-0.01em] truncate">
                      {review.author}
                    </p>
                    <p className="text-[11px] text-[#9c9484] truncate">
                      {review.animal} · {review.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "w-3.5 h-3.5",
                          i < review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-[#ece9e1] text-[#ece9e1]"
                        )}
                      />
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-[13px] leading-[1.55] text-[#4a4a46]">
                  {review.content}
                </p>
              </div>
            </div>
          </motion.div>
        ))}

        {reviews.length < reviewCount && (
          <button
            className="w-full py-2.5 rounded-full text-[13px] font-medium transition-opacity hover:opacity-90"
            style={{ background: "#1f3a33", color: "#f7f5ef" }}
          >
            Voir tous les avis
          </button>
        )}
      </div>
    </section>
  );
}
