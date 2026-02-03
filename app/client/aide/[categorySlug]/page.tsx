"use client";

import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";
import { FaqArticleCard } from "@/app/components/support";

export default function ClientFaqCategoryPage() {
  const params = useParams();
  const categorySlug = params.categorySlug as string;

  const data = useQuery(api.support.faq.getFaqArticles, {
    categorySlug,
    audience: "client",
  });

  const isLoading = data === undefined;
  const category = data?.category;
  const articles = data?.articles || [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <Link
          href="/client/aide"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-primary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour au centre d'aide
        </Link>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : !category ? (
        <div className="text-center py-12 bg-white rounded-2xl">
          <p className="text-gray-500 mb-4">Catégorie non trouvée</p>
          <Link
            href="/client/aide"
            className="text-primary hover:underline"
          >
            Retour au centre d'aide
          </Link>
        </div>
      ) : (
        <>
          {/* Header catégorie */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-3xl">
                {category.icon}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {category.name}
                </h1>
                <p className="text-gray-500">
                  {articles.length} article{articles.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Liste des articles */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {articles.length > 0 ? (
              <div className="space-y-2">
                {articles.map((article, index) => (
                  <motion.div
                    key={article._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                  >
                    <FaqArticleCard
                      article={article}
                      href={`/client/aide/article/${article.slug}`}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-2xl">
                <p className="text-gray-500">
                  Aucun article dans cette catégorie
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}
