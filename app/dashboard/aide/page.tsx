"use client";

import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { HelpCircle, MessageSquare, ArrowRight, Loader2 } from "lucide-react";
import { FaqCategoryCard, FaqSearch, FaqArticleCard } from "@/app/components/support";

export default function DashboardAidePage() {
  const categories = useQuery(api.support.faq.getFaqCategories, {
    audience: "annonceur",
  });

  const popularArticles = useQuery(api.support.faq.getPopularArticles, {
    audience: "annonceur",
    limit: 5,
  });

  const isLoading = categories === undefined;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 lg:p-8 text-white"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Centre d'aide</h1>
            <p className="text-white/80">Trouvez des réponses à vos questions</p>
          </div>
        </div>

        {/* Barre de recherche */}
        <FaqSearch
          audience="annonceur"
          basePath="/dashboard/aide"
          placeholder="Rechercher dans l'aide..."
          className="mt-4"
        />
      </motion.div>

      {/* Bouton contacter le support */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Link href="/dashboard/tickets/nouveau">
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-5 border border-primary/20 hover:border-primary/40 transition-colors cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    Vous ne trouvez pas de réponse ?
                  </h3>
                  <p className="text-sm text-gray-500">
                    Contactez notre équipe support
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Catégories FAQ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-bold text-foreground mb-4">
          Parcourir par catégorie
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : categories && categories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category: (typeof categories)[number]) => (
              <FaqCategoryCard
                key={category._id}
                category={category}
                href={`/dashboard/aide/${category.slug}`}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-2xl">
            <p className="text-gray-500">Aucune catégorie disponible</p>
          </div>
        )}
      </motion.div>

      {/* Articles populaires */}
      {popularArticles && popularArticles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-xl font-bold text-foreground mb-4">
            Articles populaires
          </h2>
          <div className="space-y-2">
            {popularArticles.map((article: (typeof popularArticles)[number]) => (
              <FaqArticleCard
                key={article._id}
                article={article}
                href={`/dashboard/aide/article/${article.slug}`}
                showViews
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Lien vers mes tickets */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
      >
        <Link href="/dashboard/tickets" className="flex items-center justify-between group">
          <div>
            <h3 className="font-semibold text-foreground">Mes demandes d'aide</h3>
            <p className="text-sm text-gray-500">
              Consultez l'historique de vos tickets
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
        </Link>
      </motion.div>
    </div>
  );
}
