"use client";

import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { HelpCircle, ArrowRight, Loader2, Mail, Star } from "lucide-react";
import { Navbar } from "@/app/components/navbar";
import { Footer } from "@/app/components/footer";
import { FaqCategoryCard, FaqSearch, FaqArticleCard } from "@/app/components/support";

export default function FaqPublicPage() {
  const categories = useQuery(api.support.faq.getFaqCategories, {});
  const popularArticles = useQuery(api.support.faq.getPopularArticles, {
    limit: 5,
  });

  const isLoading = categories === undefined;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative bg-gradient-to-br from-primary via-primary/90 to-secondary pt-32 pb-20 overflow-hidden">
          {/* Décor */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <HelpCircle className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                Centre d&apos;aide
              </h1>
              <p className="text-white/80 text-lg max-w-2xl mx-auto mb-8">
                Trouvez rapidement des réponses à toutes vos questions sur Animigo.
              </p>

              {/* Barre de recherche */}
              <FaqSearch
                basePath="/faq"
                placeholder="Rechercher un article, un sujet..."
                className="max-w-xl mx-auto"
              />
            </motion.div>
          </div>
        </section>

        {/* Catégories */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : categories && categories.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category: (typeof categories)[number], index: number) => (
                  <motion.div
                    key={category._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <FaqCategoryCard
                      category={category}
                      href={`/faq/${category.slug}`}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
                <p className="text-gray-500">Aucune catégorie disponible pour le moment.</p>
              </div>
            )}
          </motion.div>
        </section>

        {/* Articles populaires */}
        {popularArticles && popularArticles.length > 0 && (
          <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-2 mb-6">
                <Star className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">
                  Articles populaires
                </h2>
              </div>
              <div className="space-y-2">
                {popularArticles.map((article: (typeof popularArticles)[number], index: number) => (
                  <motion.div
                    key={article._id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.05 * index }}
                  >
                    <FaqArticleCard
                      article={article}
                      href={`/faq/article/${article.slug}`}
                      showViews
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </section>
        )}

        {/* CTA Contactez-nous */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-8 lg:p-12 text-center border border-primary/20"
          >
            <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Vous ne trouvez pas votre réponse ?
            </h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Notre équipe est disponible pour répondre à toutes vos questions.
            </p>
            <a
              href="mailto:contact@animigo.fr"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-semibold hover:bg-primary/90 transition-colors"
            >
              Contactez-nous
              <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>
        </section>
      </main>
      <Footer />
    </>
  );
}
