"use client";

import Link from "next/link";
import { Star, MessageSquareText, ThumbsUp, ArrowRight } from "lucide-react";

interface ReviewSummaryProps {
  data: {
    avgRating: number;
    totalReviews: number;
    pendingReplies: number;
    recommendRate: number;
  } | null;
  isLoading: boolean;
}

export function ReviewSummary({ data, isLoading }: ReviewSummaryProps) {
  if (isLoading) {
    return (
      <div
        className="bg-white p-5 animate-pulse"
        style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
      >
        <div className="h-4 w-24 rounded bg-[#f1ede3] mb-3" />
        <div className="flex items-center gap-4">
          <div className="h-9 w-16 rounded bg-[#f1ede3]" />
          <div className="h-3 w-20 rounded bg-[#f1ede3]" />
        </div>
      </div>
    );
  }

  if (!data || data.totalReviews === 0) {
    return (
      <div
        className="bg-white p-5"
        style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
      >
        <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-1">
          Avis
        </div>
        <h3 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0 mb-3">
          Avis clients
        </h3>
        <div
          className="text-center py-4"
          style={{ borderRadius: 12, background: "#fcfaf4", border: "1px solid #f1ede3" }}
        >
          <Star className="w-7 h-7 mx-auto mb-1.5" style={{ color: "#cdc9c0" }} />
          <p className="text-[12px] text-[#6d6d68]">Aucun avis pour le moment</p>
        </div>
      </div>
    );
  }

  return (
    <Link href="/dashboard/avis">
      <div
        className="bg-white p-5 transition-all cursor-pointer group hover:shadow-[0_10px_30px_rgba(30,30,28,0.06)]"
        style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-0.5">
              Avis
            </div>
            <h3 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
              Avis clients
            </h3>
          </div>
          <ArrowRight
            className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform"
            style={{ color: "#9c9484" }}
          />
        </div>

        <div className="flex items-baseline gap-3 mb-3">
          {/* Note principale */}
          <div className="flex items-baseline gap-1">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400 self-center" />
            <span className="text-[22px] font-semibold text-[#1f1f1d] tracking-[-0.02em]">
              {data.avgRating}
            </span>
            <span className="text-[12px] text-[#6d6d68]">/5</span>
          </div>
          <span className="text-[12px] text-[#9c9484]">
            · {data.totalReviews} avis
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
            style={{ border: "1px solid #cfdbd3", color: "#2f4a3f" }}
          >
            <ThumbsUp className="w-2.5 h-2.5" />
            {data.recommendRate}% recommandent
          </span>
          {data.pendingReplies > 0 && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
              style={{ border: "1px solid #f4e6c1", color: "#7a5b1a" }}
            >
              <MessageSquareText className="w-2.5 h-2.5" />
              {data.pendingReplies} sans réponse
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
