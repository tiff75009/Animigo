import type { Metadata } from "next";
import { Nunito, Inter } from "next/font/google";
import "./globals.css";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ConvexClientProvider } from "./providers/ConvexClientProvider";
import { ToastProvider } from "./components/ui/toast";
import { DevPresenceBeacon } from "./components/dev-presence-beacon";
import MaintenanceGuard from "./components/MaintenanceGuard";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Animigo - Trouvez le garde idéal pour votre animal",
  description: "Mise en relation entre propriétaires d'animaux et gardes de confiance. Chiens, chats, lapins et plus encore !",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${nunito.variable} ${inter.variable} antialiased`}
      >
        <NuqsAdapter>
          <ConvexClientProvider>
            <ToastProvider>
              <MaintenanceGuard>
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
