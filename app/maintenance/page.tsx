import type { Metadata } from "next";
import MaintenanceClient from "./maintenance-client";

export const metadata: Metadata = {
  title: "Gopattes - Trouvez le gardien idéal pour votre animal | Bientôt disponible",
  description:
    "Gopattes arrive bientôt ! La plateforme qui connecte les propriétaires d'animaux avec des gardes de confiance. Inscrivez-vous pour être notifié du lancement.",
  keywords: [
    "garde animaux",
    "pet sitting",
    "garde chien",
    "garde chat",
    "gardien animaux",
    "pension animaux",
    "France",
  ],
  openGraph: {
    title: "Gopattes - Bientôt disponible",
    description:
      "La plateforme qui connecte les propriétaires d'animaux avec des gardes de confiance. Bientôt disponible !",
    type: "website",
    locale: "fr_FR",
    siteName: "Gopattes",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gopattes - Bientôt disponible",
    description:
      "La plateforme qui connecte les propriétaires d'animaux avec des gardes de confiance.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function MaintenancePage() {
  return <MaintenanceClient />;
}
