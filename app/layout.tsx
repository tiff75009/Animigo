import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ConvexClientProvider } from "./providers/ConvexClientProvider";
import { ToastProvider } from "./components/ui/toast";
import { DevPresenceBeacon } from "./components/dev-presence-beacon";
import MaintenanceGuard from "./components/MaintenanceGuard";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
        className={`${montserrat.variable} antialiased`}
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
