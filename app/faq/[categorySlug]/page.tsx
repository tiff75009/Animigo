"use client";

import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { ChevronRight, Loader2 } from "lucide-react";
import { LucideIcon } from "@/app/components/ui/lucide-icon";
import { Navbar } from "@/app/components/navbar";
import { Footer } from "@/app/components/footer";
import { FaqArticleCard } from "@/app/components/support";

export default function FaqCategoryPage() {
  const params = useParams();
  const categorySlug = params.categorySlug as string;

  const data = useQuery(api.support.faq.getFaqArticles, {
    categorySlug,
  });

  const isLoading = data === undefined;
  const category = data?.category;
  const articles = data?.articles || [];

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-28 pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <motion.nav
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-sm text-gray-500 mb-8"
            aria-label="Fil d'Ariane"
          >
            <Link href="/faq" className="hover:text-primary transition-colors">
              Centre d&apos;aide
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">
              {category?.name || "Catégorie"}
            </span>
          </motion.nav>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : !category ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
              <p className="text-gray-500 mb-4">Catégorie non trouvée</p>
              <Link
                href="/faq"
                className="text-primary hover:underline font-medium"
              >
                Retour au centre d&apos;aide
              </Link>
            </div>
          ) : (
            <>
              {/* Header catégorie */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm mb-8"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <LucideIcon name={category.icon} className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
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
                    {articles.map((article: (typeof articles)[number], index: number) => (
                      <motion.div
                        key={article._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * index }}
                      >
                        <FaqArticleCard
                          article={article}
                          href={`/faq/article/${article.slug}`}
                        />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl">
                    <p className="text-gray-500">
                      Aucun article dans cette catégorie pour le moment.
                    </p>
                  </div>
                )}
              </motion.div>

              {/* Lien retour */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-8"
              >
                <Link
                  href="/faq"
                  className="inline-flex items-center gap-2 text-gray-500 hover:text-primary transition-colors"
                >
                  ← Toutes les catégories
                </Link>
              </motion.div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
