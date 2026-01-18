import type { Metadata } from "next";
import { Nunito, Inter } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./providers/ConvexClientProvider";
import { DevPresenceBeacon } from "./components/dev-presence-beacon";

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
        <ConvexClientProvider>
          {children}
          <DevPresenceBeacon />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
