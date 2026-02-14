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
      <div className="bg-white rounded-2xl p-5 shadow-sm animate-pulse">
        <div className="h-5 w-28 rounded bg-gray-200 mb-3" />
        <div className="flex items-center gap-4">
          <div className="h-10 w-16 rounded bg-gray-200" />
          <div className="h-4 w-20 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!data || data.totalReviews === 0) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-2">Avis clients</h3>
        <div className="text-center py-3">
          <Star className="w-8 h-8 mx-auto mb-1 text-gray-200" />
          <p className="text-sm text-text-light">Aucun avis pour le moment</p>
        </div>
      </div>
    );
  }

  return (
    <Link href="/dashboard/avis">
      <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Avis clients</h3>
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
        </div>

        <div className="flex items-center gap-4 mb-3">
          {/* Note principale */}
          <div className="flex items-center gap-1.5">
            <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            <span className="text-2xl font-bold text-foreground">{data.avgRating}</span>
            <span className="text-sm text-text-light">/5</span>
          </div>
          <span className="text-sm text-text-light">
            {data.totalReviews} avis
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {/* Taux recommandation */}
          <div className="flex items-center gap-1 text-green-600">
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>{data.recommendRate}% recommandent</span>
          </div>

          {/* Avis en attente */}
          {data.pendingReplies > 0 && (
            <div className="flex items-center gap-1 text-amber-600">
              <MessageSquareText className="w-3.5 h-3.5" />
              <span>{data.pendingReplies} sans réponse</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
