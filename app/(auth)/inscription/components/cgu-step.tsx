"use client";

import { motion } from "framer-motion";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { ArrowLeft, Shield, FileText, Lock } from "lucide-react";

interface CguStepProps {
  accepted: boolean;
  onChange: (accepted: boolean) => void;
  onSubmit: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export function CguStep({
  accepted,
  onChange,
  onSubmit,
  onBack,
  isLoading,
}: CguStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-foreground font-medium">
          Dernière étape avant de rejoindre Animigo !
        </p>
      </div>

      {/* Résumé des engagements */}
      <div className="space-y-3">
        {[
          {
            icon: Shield,
            title: "Données protégées",
            description:
              "Vos informations personnelles sont sécurisées et ne seront jamais vendues",
          },
          {
            icon: FileText,
            title: "Transparence",
            description:
              "Vous pouvez consulter et supprimer vos données à tout moment",
          },
          {
            icon: Lock,
            title: "Paiements sécurisés",
            description:
              "Toutes les transactions sont protégées par notre système de paiement",
          },
        ].map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-3 p-3 rounded-xl bg-foreground/5"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <item.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">
                {item.title}
              </p>
              <p className="text-xs text-text-light">{item.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Checkbox CGU */}
      <div className="pt-4">
        <Checkbox
          checked={accepted}
          onChange={onChange}
          label={
            <span>
              J&apos;accepte les{" "}
              <a
                href="/cgu"
                target="_blank"
                className="text-primary hover:underline"
              >
                Conditions Générales d&apos;Utilisation
              </a>{" "}
              et la{" "}
              <a
                href="/confidentialite"
                target="_blank"
                className="text-primary hover:underline"
              >
                Politique de Confidentialité
              </a>
            </span>
          }
        />
      </div>

      {/* Boutons */}
      <div className="flex gap-3 pt-4">
        <Button
          onClick={onBack}
          variant="outline"
          className="flex-1"
          disabled={isLoading}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
        <Button
          onClick={onSubmit}
          disabled={!accepted || isLoading}
          className="flex-1"
        >
          {isLoading ? (
            <motion.div
              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          ) : (
            "Créer mon compte"
          )}
        </Button>
      </div>
    </div>
  );
}
