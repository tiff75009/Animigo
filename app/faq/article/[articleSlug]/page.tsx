"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { ChevronRight, Eye, Loader2, Mail } from "lucide-react";
import { FaqArticleContent, FaqArticleCard, HelpfulVote } from "@/app/components/support";
import { LucideIcon } from "@/app/components/ui/lucide-icon";
import { Navbar } from "@/app/components/navbar";
import { Footer } from "@/app/components/footer";

export default function FaqArticlePage() {
  const params = useParams();
  const articleSlug = params.articleSlug as string;

  const data = useQuery(api.support.faq.getFaqArticle, {
    articleSlug,
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
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-28 pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <motion.nav
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-sm text-gray-500 mb-8 flex-wrap"
            aria-label="Fil d'Ariane"
          >
            <Link href="/faq" className="hover:text-primary transition-colors">
              Centre d&apos;aide
            </Link>
            <ChevronRight className="w-3 h-3" />
            {category && (
              <>
                <Link
                  href={`/faq/${category.slug}`}
                  className="hover:text-primary transition-colors"
                >
                  {category.name}
                </Link>
                <ChevronRight className="w-3 h-3" />
              </>
            )}
            <span className="text-foreground truncate max-w-[250px]">
              {article?.title || "Article"}
            </span>
          </motion.nav>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : !article ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
              <p className="text-gray-500 mb-4">Article non trouvé</p>
              <Link href="/faq" className="text-primary hover:underline font-medium">
                Retour au centre d&apos;aide
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Article */}
              <motion.article
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm"
              >
                {/* Catégorie badge */}
                {category && (
                  <Link
                    href={`/faq/${category.slug}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full mb-4 hover:bg-primary/20 transition-colors"
                  >
                    <LucideIcon name={category.icon} className="w-4 h-4" />
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
                    {relatedArticles.map((related: (typeof relatedArticles)[number]) => (
                      <FaqArticleCard
                        key={related._id}
                        article={related}
                        href={`/faq/article/${related.slug}`}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* CTA contact */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gray-50 rounded-2xl p-6 text-center"
              >
                <p className="text-gray-600 mb-3">
                  Vous n&apos;avez pas trouvé la réponse à votre question ?
                </p>
                <a
                  href="mailto:contact@animigo.fr"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-full font-semibold hover:bg-primary/90 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Contactez-nous
                </a>
              </motion.div>

              {/* Retour */}
              <Link
                href={category ? `/faq/${category.slug}` : "/faq"}
                className="inline-flex items-center gap-2 text-gray-500 hover:text-primary transition-colors"
              >
                ← {category ? `Retour à ${category.name}` : "Retour au centre d'aide"}
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
