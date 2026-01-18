"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { AuthRedirect } from "@/app/components/auth-redirect";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthRedirect>
    <div className="min-h-screen bg-background flex">
      {/* Panneau gauche - Décoratif */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-secondary to-purple relative overflow-hidden">
        {/* Blobs décoratifs */}
        <motion.div
          className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.2, 0.4] }}
          transition={{ duration: 7, repeat: Infinity }}
        />

        {/* Contenu */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <Link href="/" className="inline-block mb-8">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">🐾</span>
                </div>
                <span className="text-3xl font-extrabold">Animigo</span>
              </div>
            </Link>

            <h1 className="text-4xl font-bold mb-4">
              Bienvenue dans la famille !
            </h1>
            <p className="text-xl text-white/80 max-w-md">
              Rejoignez des milliers de passionnés d&apos;animaux sur la
              première plateforme de garde en France
            </p>

            {/* Stats */}
            <div className="mt-12 flex justify-center gap-8">
              {[
                { value: "15K+", label: "Gardes" },
                { value: "50K+", label: "Missions" },
                { value: "4.9", label: "Note moyenne" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="text-center"
                >
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <div className="text-sm text-white/70">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Animaux flottants */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-around pb-8">
            {["🐕", "🐈", "🐰", "🦜"].map((emoji, i) => (
              <motion.span
                key={i}
                className="text-4xl"
                animate={{ y: [0, -15, 0] }}
                transition={{
                  duration: 2 + i * 0.5,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              >
                {emoji}
              </motion.span>
            ))}
          </div>
        </div>
      </div>

      {/* Panneau droit - Formulaire */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
    </AuthRedirect>
  );
}
