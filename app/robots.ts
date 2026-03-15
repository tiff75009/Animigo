import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.animigo.fr";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/client/", "/dashboard/", "/reservation/", "/paiement/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
