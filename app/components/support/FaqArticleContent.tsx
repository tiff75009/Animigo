"use client";

import { cn } from "@/app/lib/utils";
import ReactMarkdown from "react-markdown";

interface FaqArticleContentProps {
  content: string;
  className?: string;
}

export function FaqArticleContent({ content, className }: FaqArticleContentProps) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none",
        // Personnalisation du thème
        "prose-headings:text-foreground prose-headings:font-semibold",
        "prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3",
        "prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2",
        "prose-p:text-gray-700 prose-p:leading-relaxed",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-strong:text-foreground",
        "prose-ul:my-3 prose-li:my-1",
        "prose-ol:my-3",
        "prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm",
        "prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-xl",
        "prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg",
        className
      )}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
