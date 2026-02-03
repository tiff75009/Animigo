"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/app/lib/utils";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";

interface HelpfulVoteProps {
  articleId: Id<"faqArticles">;
  helpfulCount?: number;
  notHelpfulCount?: number;
  className?: string;
}

export function HelpfulVote({
  articleId,
  helpfulCount = 0,
  notHelpfulCount = 0,
  className,
}: HelpfulVoteProps) {
  const [hasVoted, setHasVoted] = useState(false);
  const [votedHelpful, setVotedHelpful] = useState<boolean | null>(null);
  const markHelpful = useMutation(api.support.faq.markArticleHelpful);

  const handleVote = async (helpful: boolean) => {
    if (hasVoted) return;

    try {
      await markHelpful({ articleId, helpful });
      setHasVoted(true);
      setVotedHelpful(helpful);
    } catch (error) {
      console.error("Erreur lors du vote:", error);
    }
  };

  if (hasVoted) {
    return (
      <div
        className={cn(
          "bg-green-50 border border-green-200 rounded-xl p-4 text-center",
          className
        )}
      >
        <div className="flex items-center justify-center gap-2 text-green-700">
          <Check className="w-5 h-5" />
          <span className="font-medium">Merci pour votre retour !</span>
        </div>
        <p className="text-sm text-green-600 mt-1">
          {votedHelpful
            ? "Nous sommes ravis que cet article vous ait aidé."
            : "Nous allons améliorer cet article."}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-gray-50 border border-gray-200 rounded-xl p-4",
        className
      )}
    >
      <p className="text-center text-foreground font-medium mb-3">
        Cet article vous a-t-il aidé ?
      </p>
      <div className="flex justify-center gap-3">
        <button
          onClick={() => handleVote(true)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full",
            "bg-white border border-gray-200",
            "hover:bg-green-50 hover:border-green-300 hover:text-green-700",
            "transition-all duration-200"
          )}
        >
          <ThumbsUp className="w-4 h-4" />
          <span>Oui</span>
          {helpfulCount > 0 && (
            <span className="text-xs text-gray-400">({helpfulCount})</span>
          )}
        </button>
        <button
          onClick={() => handleVote(false)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full",
            "bg-white border border-gray-200",
            "hover:bg-red-50 hover:border-red-300 hover:text-red-700",
            "transition-all duration-200"
          )}
        >
          <ThumbsDown className="w-4 h-4" />
          <span>Non</span>
          {notHelpfulCount > 0 && (
            <span className="text-xs text-gray-400">({notHelpfulCount})</span>
          )}
        </button>
      </div>
    </div>
  );
}
