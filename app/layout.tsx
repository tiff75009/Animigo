import type { Metadata } from "next";
import { Suspense } from "react";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ConvexClientProvider } from "./providers/ConvexClientProvider";
import { ToastProvider } from "./components/ui/toast";
import { DevPresenceBeacon } from "./components/dev-presence-beacon";
import MaintenanceGuard from "./components/MaintenanceGuard";
import PageLoadingBar from "./components/ui/PageLoadingBar";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.animigo.fr";

export const metadata: Metadata = {
  title: {
    default: "Animigo - Trouvez le garde idéal pour votre animal",
    template: "%s | Animigo",
  },
  description: "Mise en relation entre propriétaires d'animaux et gardes de confiance. Chiens, chats, lapins et plus encore !",
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Animigo",
    title: "Animigo - Trouvez le garde idéal pour votre animal",
    description: "Mise en relation entre propriétaires d'animaux et gardes de confiance. Chiens, chats, lapins et plus encore !",
  },
  twitter: {
    card: "summary_large_image",
    title: "Animigo - Trouvez le garde idéal pour votre animal",
    description: "Mise en relation entre propriétaires d'animaux et gardes de confiance.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${montserrat.variable} antialiased`}
      >
        <NuqsAdapter>
          <ConvexClientProvider>
            <ToastProvider>
              <MaintenanceGuard>
                <Suspense fallback={null}>
                  <PageLoadingBar />
                </Suspense>
                {children}
              </MaintenanceGuard>
              <DevPresenceBeacon />
            </ToastProvider>
          </ConvexClientProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
