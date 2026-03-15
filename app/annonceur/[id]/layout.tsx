import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.animigo.fr";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: slug } = await params;

  try {
    const announcer = await fetchQuery(
      api.public.announcer.getAnnouncerBySlug,
      { slug }
    );

    if (!announcer) {
      return { title: "Annonceur introuvable | Animigo" };
    }

    const name = `${announcer.firstName} ${announcer.lastName || ""}`.trim();
    const title = `${name} - Services animaliers | Animigo`;
    const description = announcer.bio
      ? announcer.bio.substring(0, 160)
      : `${name} propose ses services animaliers${announcer.location ? ` à ${announcer.location}` : ""}. Consultez son profil et réservez en ligne sur Animigo.`;

    const images = [];
    if (announcer.profileImage) {
      images.push({
        url: announcer.profileImage,
        width: 400,
        height: 400,
        alt: name,
      });
    }

    return {
      title,
      description,
      openGraph: {
        type: "profile",
        title,
        description,
        url: `${siteUrl}/annonceur/${slug}`,
        images,
        siteName: "Animigo",
        locale: "fr_FR",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: announcer.profileImage
          ? [announcer.profileImage]
          : undefined,
      },
      alternates: {
        canonical: `${siteUrl}/annonceur/${slug}`,
      },
    };
  } catch {
    return { title: "Animigo - Services animaliers" };
  }
}

export default function AnnouncerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
