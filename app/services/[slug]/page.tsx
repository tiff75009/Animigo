import { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import ServicePageClient from "./ServicePageClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const [service, siteName] = await Promise.all([
      fetchQuery(api.seo.servicePages.getBySlug, { slug }),
      fetchQuery(api.admin.config.getSiteName, {}),
    ]);

    if (!service) {
      return {
        title: `Service non trouve | ${siteName}`,
        description: "Ce service n'existe pas ou n'est plus disponible.",
      };
    }

    // Ne pas dupliquer le nom du site s'il est déjà dans le metaTitle
    const titleHasSiteName = service.metaTitle.toLowerCase().includes(siteName.toLowerCase());
    const fullTitle = titleHasSiteName ? service.metaTitle : `${service.metaTitle} | ${siteName}`;

    return {
      title: fullTitle,
      description: service.metaDescription,
      openGraph: {
        title: fullTitle,
        description: service.metaDescription,
        images: service.heroImageUrl ? [service.heroImageUrl] : undefined,
      },
    };
  } catch {
    return {
      title: "Services | Animigo",
      description: "Decouvrez nos services pour animaux de compagnie.",
    };
  }
}

export default async function ServicePage({ params }: PageProps) {
  const { slug } = await params;
  return <ServicePageClient slug={slug} />;
}
