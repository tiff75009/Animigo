"use client";

import { useParams, notFound } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Navbar } from "@/app/components/navbar";
import { Footer } from "@/app/components/footer";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, Loader2, FileX } from "lucide-react";

// Mapping des slugs vers les URLs françaises
const SLUG_TO_URL: Record<string, string> = {
  cgv: "cgv",
  cgu: "cgu",
  privacy: "confidentialite",
  cancellation: "annulation",
};

const URL_TO_SLUG: Record<string, string> = {
  cgv: "cgv",
  cgu: "cgu",
  confidentialite: "privacy",
  annulation: "cancellation",
};

export default function LegalPage() {
  const params = useParams();
  const urlSlug = params.slug as string;

  // Convertir l'URL slug en slug de base de données
  const dbSlug = URL_TO_SLUG[urlSlug] || urlSlug;

  const page = useQuery(api.public.legal.getPublishedLegalPage, {
    slug: dbSlug,
  });

  const allPages = useQuery(api.public.legal.listPublishedLegalPages, {});

  // Loading state
  if (page === undefined) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24">
          <div className="max-w-4xl mx-auto px-4 py-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Page not found
  if (page === null) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24">
          <div className="max-w-4xl mx-auto px-4 py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <FileX className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Page non disponible
              </h1>
              <p className="text-muted-foreground mb-6">
                Cette page légale n&apos;est pas encore publiée.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Retour à l&apos;accueil
              </Link>
            </motion.div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24">
        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              Retour à l&apos;accueil
            </Link>
          </motion.div>

          {/* Content */}
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-12"
          >
            {/* Header */}
            <header className="mb-8 pb-8 border-b border-slate-100">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 font-nunito">
                {page.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Version {page.version}</span>
                {page.publishedAt && (
                  <>
                    <span>•</span>
                    <span>Mise à jour le {formatDate(page.publishedAt)}</span>
                  </>
                )}
              </div>
            </header>

            {/* Body */}
            <div
              className="prose prose-slate max-w-none prose-headings:font-nunito prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          </motion.article>

          {/* Navigation vers autres pages légales */}
          {allPages && allPages.length > 1 && (
            <motion.nav
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8"
            >
              <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
                Autres documents légaux
              </h2>
              <div className="flex flex-wrap gap-3">
                {allPages
                  .filter((p: { slug: string; title: string }) => p.slug !== dbSlug)
                  .map((p: { slug: string; title: string }) => (
                    <Link
                      key={p.slug}
                      href={`/legal/${SLUG_TO_URL[p.slug] || p.slug}`}
                      className="px-4 py-2 bg-white rounded-full border border-slate-200 text-sm text-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      {p.title}
                    </Link>
                  ))}
              </div>
            </motion.nav>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
