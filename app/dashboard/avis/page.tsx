"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Star,
  Filter,
  ChevronDown,
  Send,
  Clock,
  CheckCircle,
  TrendingUp,
  Award,
  X,
  Reply,
  Edit3,
  ThumbsUp,
  Loader2,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// Star Rating Component
function StarRating({ rating, size = "md" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            sizeClasses[size],
            star <= rating ? "fill-accent text-accent" : "text-gray-200"
          )}
        />
      ))}
    </div>
  );
}

// Rating Distribution Bar
function RatingBar({ rating, count, total }: { rating: number; count: number; total: number }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-text-light w-6">{rating}</span>
      <Star className="w-4 h-4 fill-accent text-accent" />
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, delay: 0.1 * (5 - rating) }}
        />
      </div>
      <span className="text-sm text-text-light w-8">{count}</span>
    </div>
  );
}

// Type pour les avis enrichis
type EnrichedReview = {
  _id: string;
  missionId: string;
  qualityRating: number;
  communicationRating: number;
  wouldRecommend: boolean;
  overallRating: number;
  comment?: string;
  reply?: string;
  repliedAt?: number;
  createdAt: number;
  clientName: string;
  clientImage: string | null;
  missionType: string;
  animalName: string;
  animalEmoji: string;
};

// Review Card Component
function ReviewCard({
  review,
  onReply,
  onEditReply,
}: {
  review: EnrichedReview;
  onReply: (reviewId: string) => void;
  onEditReply: (reviewId: string) => void;
}) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-md p-6"
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
          {review.clientImage ? (
            <Image
              src={review.clientImage}
              alt={review.clientName}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">
              {review.animalEmoji}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-foreground">{review.clientName}</h3>
              <p className="text-sm text-text-light flex items-center gap-2">
                <span>{review.animalEmoji}</span>
                {review.animalName} • {review.missionType}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <StarRating rating={Math.round(review.overallRating)} />
              <p className="text-xs text-text-light mt-1">
                {formatDate(review.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Détails notes */}
      <div className="flex items-center gap-4 mb-3 text-xs text-text-light">
        <span>Qualité: {review.qualityRating}/5</span>
        <span>Communication: {review.communicationRating}/5</span>
        <span className="flex items-center gap-1">
          <ThumbsUp className={cn("w-3 h-3", review.wouldRecommend ? "text-green-500" : "text-gray-300")} />
          {review.wouldRecommend ? "Recommande" : "Ne recommande pas"}
        </span>
      </div>

      {/* Comment */}
      {review.comment && (
        <p className="text-foreground mb-4 leading-relaxed">
          &ldquo;{review.comment}&rdquo;
        </p>
      )}

      {/* Reply Section */}
      {review.reply ? (
        <div className="bg-primary/5 rounded-xl p-4 border-l-4 border-primary">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-foreground text-sm">
              Votre réponse
            </span>
            <div className="flex items-center gap-2">
              {review.repliedAt && (
                <span className="text-xs text-text-light">
                  {formatDate(review.repliedAt)}
                </span>
              )}
              <motion.button
                onClick={() => onEditReply(review._id)}
                className="p-1 hover:bg-primary/10 rounded-lg text-primary"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Edit3 className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
          <p className="text-sm text-foreground">{review.reply}</p>
        </div>
      ) : (
        <motion.button
          onClick={() => onReply(review._id)}
          className="flex items-center gap-2 text-primary font-medium hover:bg-primary/10 px-4 py-2 rounded-xl transition-colors"
          whileHover={{ x: 4 }}
        >
          <Reply className="w-4 h-4" />
          Répondre à cet avis
        </motion.button>
      )}
    </motion.div>
  );
}

// Reply Modal
function ReplyModal({
  isOpen,
  onClose,
  review,
  existingReply,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  review: EnrichedReview | null;
  existingReply?: string;
  onSubmit: (reviewId: string, content: string) => void;
}) {
  const [replyContent, setReplyContent] = useState(existingReply || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (review && replyContent.trim()) {
      setIsSubmitting(true);
      await onSubmit(review._id, replyContent);
      setIsSubmitting(false);
      setReplyContent("");
      onClose();
    }
  };

  if (!isOpen || !review) return null;

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
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-foreground">
              {existingReply ? "Modifier votre réponse" : "Répondre à l'avis"}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5 text-text-light" />
            </button>
          </div>

          {/* Original Review */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100">
                {review.clientImage ? (
                  <Image
                    src={review.clientImage}
                    alt={review.clientName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg">
                    {review.animalEmoji}
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold text-foreground">{review.clientName}</p>
                <StarRating rating={Math.round(review.overallRating)} size="sm" />
              </div>
            </div>
            {review.comment && (
              <p className="text-sm text-text-light">&ldquo;{review.comment}&rdquo;</p>
            )}
          </div>

          {/* Reply Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Votre réponse
            </label>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value.slice(0, 500))}
              placeholder="Écrivez votre réponse..."
              className="w-full px-4 py-3 bg-gray-100 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground min-h-[120px]"
            />
            <p className="text-xs text-text-light mt-2">
              {replyContent.length}/500 caractères
            </p>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6">
            <p className="text-sm text-blue-700">
              <strong>Conseil :</strong> Une réponse professionnelle et personnalisée
              montre aux futurs clients que vous êtes attentif et à l&apos;écoute.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <motion.button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-200 text-foreground rounded-xl font-semibold"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              Annuler
            </motion.button>
            <motion.button
              onClick={handleSubmit}
              disabled={!replyContent.trim() || isSubmitting}
              className={cn(
                "flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors",
                isSubmitting
                  ? "bg-gray-300"
                  : "bg-primary text-white hover:bg-primary/90 disabled:bg-gray-300"
              )}
              whileHover={{ scale: isSubmitting ? 1 : 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {existingReply ? "Modifier" : "Publier"}
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function AvisPage() {
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "replied" | "pending">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<EnrichedReview | null>(null);
  const [editingReply, setEditingReply] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  const data = useQuery(
    api.planning.reviews.getAnnouncerReviews,
    token ? { sessionToken: token } : "skip"
  );

  const replyToReview = useMutation(api.planning.reviews.replyToReview);

  const reviews = (data?.reviews || []) as EnrichedReview[];
  const stats = data?.stats || {
    total: 0,
    avgRating: 0,
    distribution: [5, 4, 3, 2, 1].map((r) => ({ rating: r, count: 0 })),
    replied: 0,
    pending: 0,
    recommendRate: 0,
  };

  // Filter reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      if (filterRating && Math.round(review.overallRating) !== filterRating) return false;
      if (filterStatus === "replied" && !review.reply) return false;
      if (filterStatus === "pending" && review.reply) return false;
      return true;
    });
  }, [reviews, filterRating, filterStatus]);

  const handleReply = (reviewId: string) => {
    const review = reviews.find((r) => r._id === reviewId);
    if (review) {
      setSelectedReview(review);
      setEditingReply(false);
      setReplyModalOpen(true);
    }
  };

  const handleEditReply = (reviewId: string) => {
    const review = reviews.find((r) => r._id === reviewId);
    if (review) {
      setSelectedReview(review);
      setEditingReply(true);
      setReplyModalOpen(true);
    }
  };

  const handleSubmitReply = async (reviewId: string, content: string) => {
    if (!token) return;
    try {
      await replyToReview({
        sessionToken: token,
        reviewId: reviewId as Id<"reviews">,
        reply: content,
      });
    } catch (error) {
      console.error("Erreur réponse avis:", error);
    }
  };

  const clearFilters = () => {
    setFilterRating(null);
    setFilterStatus("all");
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-accent/20 rounded-2xl">
            <Star className="w-6 h-6 fill-accent text-accent" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Mes avis
            </h1>
            <p className="text-text-light">
              Consultez et répondez aux avis de vos clients
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {/* Average Rating Card */}
        <div className="bg-white rounded-2xl p-6 shadow-lg md:col-span-1">
          <div className="text-center">
            <div className="text-5xl font-bold text-foreground mb-2">
              {stats.avgRating.toFixed(1)}
            </div>
            <StarRating rating={Math.round(stats.avgRating)} size="lg" />
            <p className="text-text-light mt-2">{stats.total} avis au total</p>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-lg md:col-span-2">
          <h3 className="font-semibold text-foreground mb-4">Répartition des notes</h3>
          <div className="space-y-2">
            {stats.distribution.map(({ rating, count }: { rating: number; count: number }) => (
              <RatingBar
                key={rating}
                rating={rating}
                count={count}
                total={stats.total}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <div className="bg-white rounded-xl p-4 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-sm text-text-light">Note moyenne</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.avgRating.toFixed(1)}/5</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-accent" />
            <span className="text-sm text-text-light">Recommandation</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.recommendRate}%</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-text-light">Répondus</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.replied}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-text-light">En attente</span>
          </div>
          <p className="text-2xl font-bold text-orange-500">{stats.pending}</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl shadow-lg p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Filter by status */}
            <div className="flex items-center gap-2">
              {[
                { value: "all", label: "Tous", count: stats.total },
                { value: "pending", label: "À répondre", count: stats.pending },
                { value: "replied", label: "Répondus", count: stats.replied },
              ].map((option) => (
                <motion.button
                  key={option.value}
                  onClick={() => setFilterStatus(option.value as typeof filterStatus)}
                  className={cn(
                    "px-4 py-2 rounded-xl font-medium text-sm transition-colors",
                    filterStatus === option.value
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-foreground hover:bg-gray-200"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {option.label} ({option.count})
                </motion.button>
              ))}
            </div>
          </div>

          <motion.button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 text-text-light hover:text-foreground"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Filter className="w-4 h-4" />
            Filtres
            <ChevronDown className={cn("w-4 h-4 transition-transform", showFilters && "rotate-180")} />
          </motion.button>
        </div>

        {/* Extended Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-light">Filtrer par note :</span>
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <motion.button
                      key={rating}
                      onClick={() => setFilterRating(filterRating === rating ? null : rating)}
                      className={cn(
                        "flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors",
                        filterRating === rating
                          ? "bg-accent/20 text-foreground"
                          : "bg-gray-100 text-text-light hover:bg-gray-200"
                      )}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {rating}
                      <Star className="w-3 h-3 fill-accent text-accent" />
                    </motion.button>
                  ))}
                </div>
                {(filterRating || filterStatus !== "all") && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-primary hover:underline"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Reviews List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="space-y-4"
      >
        {filteredReviews.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <div className="text-5xl mb-4">{stats.total === 0 ? "⭐" : "🔍"}</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {stats.total === 0 ? "Pas encore d'avis" : "Aucun avis trouvé"}
            </h3>
            <p className="text-text-light mb-4">
              {stats.total === 0
                ? "Vos clients pourront laisser un avis après chaque service."
                : "Modifiez vos filtres pour voir plus d'avis."}
            </p>
            {stats.total > 0 && (
              <motion.button
                onClick={clearFilters}
                className="px-4 py-2 bg-primary text-white rounded-xl font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Voir tous les avis
              </motion.button>
            )}
          </div>
        ) : (
          filteredReviews.map((review, index) => (
            <motion.div
              key={review._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
            >
              <ReviewCard
                review={review}
                onReply={handleReply}
                onEditReply={handleEditReply}
              />
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Reply Modal */}
      <ReplyModal
        isOpen={replyModalOpen}
        onClose={() => {
          setReplyModalOpen(false);
          setSelectedReview(null);
        }}
        review={selectedReview}
        existingReply={editingReply ? selectedReview?.reply : undefined}
        onSubmit={handleSubmitReply}
      />
    </div>
  );
}
