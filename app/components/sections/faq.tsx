"use client";

import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/app/lib/utils";
import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";

type FaqArticle = {
  _id: Id<"faqArticles">;
  title: string;
  slug: string;
  content: string;
  viewCount: number;
  categoryName: string;
  categorySlug: string;
};

export function FAQ() {
  const popularArticles = useQuery(api.support.faq.getPopularArticles, {
    limit: 6,
  });

  const isLoading = popularArticles === undefined;
  const hasArticles = popularArticles && popularArticles.length > 0;

  return (
    <section id="faq" className="py-24 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-4xl mb-4 block">❓</span>
          <h2 className="font-love-taking text-4xl sm:text-5xl md:text-6xl text-foreground mb-4">
            Questions <span className="text-primary">frequentes</span>
          </h2>
          <p className="text-text-light text-lg max-w-2xl mx-auto">
            Tout ce que vous devez savoir avant de vous lancer.
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : hasArticles ? (
            <Accordion.Root type="single" collapsible className="space-y-4">
              {popularArticles.map((article: FaqArticle, index: number) => (
                <Accordion.Item
                  key={article._id}
                  value={`item-${index}`}
                  className="bg-card rounded-2xl shadow-lg overflow-hidden"
                >
                  <Accordion.Header>
                    <Accordion.Trigger className="w-full px-6 py-5 flex items-center justify-between text-left group hover:bg-primary/5 transition-colors">
                      <span className="flex items-center gap-3">
                        <span className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                          {article.title}
                        </span>
                      </span>
                      <ChevronDown
                        className={cn(
                          "w-5 h-5 text-text-light transition-transform duration-300 flex-shrink-0",
                          "group-data-[state=open]:rotate-180"
                        )}
                      />
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    <div className="px-6 pb-5 pt-0 text-text-light leading-relaxed">
                      <FaqPreview content={article.content} slug={article.slug} />
                    </div>
                  </Accordion.Content>
                </Accordion.Item>
              ))}
            </Accordion.Root>
          ) : null}
        </motion.div>

        {/* CTA vers la FAQ complète */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mt-12"
        >
          <Link
            href="/faq"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-white rounded-full font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
          >
            Voir toutes les questions
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function FaqPreview({ content, slug }: { content: string; slug: string }) {
  // Extraire le texte brut (retirer le markdown) et tronquer
  const plainText = content
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[|\\`>-]/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const preview = plainText.length > 200 ? plainText.slice(0, 200) + "…" : plainText;

  return (
    <div>
      <p>{preview}</p>
      <Link
        href={`/faq/article/${slug}`}
        className="inline-flex items-center gap-1 text-primary font-medium text-sm mt-3 hover:underline"
      >
        Lire la suite
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
