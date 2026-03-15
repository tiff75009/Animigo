import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.animigo.fr";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const profile = await fetchQuery(
      api.public.profile.getPublicProfileBySlug,
      { slug }
    );

    if (!profile) {
      return { title: "Profil introuvable | Animigo" };
    }

    const lastInitial = profile.lastName
      ? `${profile.lastName.charAt(0)}.`
      : "";
    const displayName = `${profile.firstName} ${lastInitial}`.trim();
    const title = `${displayName} - Profil | Animigo`;
    const description = profile.bio
      ? profile.bio.substring(0, 160)
      : `Découvrez le profil de ${displayName}${profile.city ? ` à ${profile.city}` : profile.location ? ` à ${profile.location}` : ""}. Consultez ses services et avis sur Animigo.`;

    const images = [];
    if (profile.profileImage) {
      images.push({
        url: profile.profileImage,
        width: 400,
        height: 400,
        alt: displayName,
      });
    }

    return {
      title,
      description,
      openGraph: {
        type: "profile",
        title,
        description,
        url: `${siteUrl}/profil/${slug}`,
        images,
        siteName: "Animigo",
        locale: "fr_FR",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: profile.profileImage
          ? [profile.profileImage]
          : undefined,
      },
      alternates: {
        canonical: `${siteUrl}/profil/${slug}`,
      },
    };
  } catch {
    return { title: "Animigo - Services animaliers" };
  }
}

export default function ProfilLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
