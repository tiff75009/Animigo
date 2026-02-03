"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { ChevronLeft, Eye, Loader2 } from "lucide-react";
import { FaqArticleContent, FaqArticleCard, HelpfulVote } from "@/app/components/support";

export default function ClientFaqArticlePage() {
  const params = useParams();
  const articleSlug = params.articleSlug as string;

  const data = useQuery(api.support.faq.getFaqArticle, {
    articleSlug,
    audience: "client",
  });

  const incrementViewCount = useMutation(api.support.faq.incrementViewCount);

  const isLoading = data === undefined;
  const article = data?.article;
  const category = data?.category;
  const relatedArticles = data?.relatedArticles || [];

  // Incrémenter le compteur de vues
  useEffect(() => {
    if (article) {
      incrementViewCount({ articleId: article._id }).catch(console.error);
    }
  }, [article?._id]);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2 text-sm text-gray-500"
      >
        <Link href="/client/aide" className="hover:text-primary transition-colors">
          Centre d'aide
        </Link>
        <span>/</span>
        {category && (
          <>
            <Link
              href={`/client/aide/${category.slug}`}
              className="hover:text-primary transition-colors"
            >
              {category.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-foreground truncate max-w-[200px]">
          {article?.title || "Article"}
        </span>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : !article ? (
        <div className="text-center py-12 bg-white rounded-2xl">
          <p className="text-gray-500 mb-4">Article non trouvé</p>
          <Link href="/client/aide" className="text-primary hover:underline">
            Retour au centre d'aide
          </Link>
        </div>
      ) : (
        <>
          {/* Article */}
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm"
          >
            {/* Catégorie badge */}
            {category && (
              <Link
                href={`/client/aide/${category.slug}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full mb-4 hover:bg-primary/20 transition-colors"
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </Link>
            )}

            {/* Titre */}
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
              {article.title}
            </h1>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-400 mb-6 pb-6 border-b border-gray-100">
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {article.viewCount} vue{article.viewCount !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Contenu */}
            <FaqArticleContent content={article.content} />
          </motion.article>

          {/* Vote utile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <HelpfulVote
              articleId={article._id}
              helpfulCount={article.helpfulCount}
              notHelpfulCount={article.notHelpfulCount}
            />
          </motion.div>

          {/* Articles connexes */}
          {relatedArticles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-lg font-bold text-foreground mb-3">
                Articles connexes
              </h2>
              <div className="space-y-2">
                {relatedArticles.map((related) => (
                  <FaqArticleCard
                    key={related._id}
                    article={related}
                    href={`/client/aide/article/${related.slug}`}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Lien support */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-50 rounded-2xl p-5 text-center"
          >
            <p className="text-gray-600 mb-3">
              Vous n'avez pas trouvé la réponse à votre question ?
            </p>
            <Link
              href="/client/tickets/nouveau"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-full font-semibold hover:bg-primary/90 transition-colors"
            >
              Contacter le support
            </Link>
          </motion.div>

          {/* Retour */}
          <Link
            href={category ? `/client/aide/${category.slug}` : "/client/aide"}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {category ? `Retour à ${category.name}` : "Retour au centre d'aide"}
          </Link>
        </>
      )}
    </div>
  );
}
