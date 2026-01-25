import { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import ServiceCityPageClient from "./ServiceCityPageClient";

interface PageProps {
  params: Promise<{ slug: string; citySlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, citySlug } = await params;

  try {
    const [page, siteName] = await Promise.all([
      fetchQuery(api.seo.serviceCityPages.getByServiceAndCity, {
        serviceSlug: slug,
        citySlug,
      }),
      fetchQuery(api.admin.config.getSiteName, {}),
    ]);

    if (!page) {
      return {
        title: `Page non trouvee | ${siteName}`,
        description: "Ce service n'est pas disponible dans cette ville.",
      };
    }

    // Ne pas dupliquer le nom du site s'il est déjà dans le metaTitle
    const titleHasSiteName = page.metaTitle.toLowerCase().includes(siteName.toLowerCase());
    const fullTitle = titleHasSiteName ? page.metaTitle : `${page.metaTitle} | ${siteName}`;

    return {
      title: fullTitle,
      description: page.metaDescription,
      openGraph: {
        title: fullTitle,
        description: page.metaDescription,
        images: page.servicePage.heroImageUrl ? [page.servicePage.heroImageUrl] : undefined,
      },
    };
  } catch {
    return {
      title: "Services | Animigo",
      description: "Decouvrez nos services pour animaux de compagnie.",
    };
  }
}

export default async function ServiceCityPage({ params }: PageProps) {
  const { slug, citySlug } = await params;
  return <ServiceCityPageClient serviceSlug={slug} citySlug={citySlug} />;
}
