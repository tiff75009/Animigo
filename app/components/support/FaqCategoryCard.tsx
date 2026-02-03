"use client";

import { cn } from "@/app/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface FaqCategoryCardProps {
  category: {
    _id: string;
    name: string;
    slug: string;
    icon: string;
    articleCount?: number;
  };
  href: string;
  className?: string;
}

export function FaqCategoryCard({ category, href, className }: FaqCategoryCardProps) {
  return (
    <Link href={href}>
      <motion.div
        className={cn(
          "bg-white rounded-2xl p-5 shadow-sm border border-gray-100",
          "hover:shadow-md hover:border-primary/20 transition-all duration-200",
          "cursor-pointer group",
          className
        )}
        whileHover={{ y: -2 }}
      >
        <div className="flex items-center gap-4">
          {/* Icône */}
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
            {category.icon}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {category.name}
            </h3>
            {category.articleCount !== undefined && (
              <p className="text-sm text-gray-500">
                {category.articleCount} article{category.articleCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
        </div>
      </motion.div>
    </Link>
  );
}
