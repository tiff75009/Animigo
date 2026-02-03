"use client";

import { cn } from "@/app/lib/utils";
import { ChevronRight, Eye } from "lucide-react";
import Link from "next/link";

interface FaqArticleCardProps {
  article: {
    _id: string;
    title: string;
    slug: string;
    viewCount?: number;
    categorySlug?: string;
  };
  href: string;
  showViews?: boolean;
  className?: string;
}

export function FaqArticleCard({
  article,
  href,
  showViews = false,
  className
}: FaqArticleCardProps) {
  return (
    <Link href={href}>
      <div
        className={cn(
          "bg-white rounded-xl p-4 border border-gray-100",
          "hover:border-primary/20 hover:bg-primary/5 transition-all duration-200",
          "cursor-pointer group",
          className
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {article.title}
            </h4>
            {showViews && article.viewCount !== undefined && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {article.viewCount} vue{article.viewCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors flex-shrink-0" />
        </div>
      </div>
    </Link>
  );
}
