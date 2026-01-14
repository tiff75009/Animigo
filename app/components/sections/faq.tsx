"use client";

import { motion } from "framer-motion";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/app/lib/utils";

const faqs = [
  {
    question: "Comment devenir garde sur Animigo ?",
    answer: "C'est simple ! Créez votre profil en quelques minutes, ajoutez vos disponibilités et les types d'animaux que vous pouvez garder. Une fois votre profil vérifié, vous pourrez recevoir des demandes de propriétaires près de chez vous.",
    emoji: "🙋",
  },
  {
    question: "Comment sont vérifiés les gardes ?",
    answer: "Tous nos gardes passent par un processus de vérification : pièce d'identité, avis des autres utilisateurs, et pour certains, un entretien vidéo. Nous prenons la sécurité de vos animaux très au sérieux !",
    emoji: "🔐",
  },
  {
    question: "Que se passe-t-il en cas de problème ?",
    answer: "Chaque garde est couverte par notre assurance. En cas de problème de santé, le garde contacte immédiatement le propriétaire et peut emmener l'animal chez le vétérinaire. Notre équipe support est disponible 7j/7.",
    emoji: "🏥",
  },
  {
    question: "Quels animaux sont acceptés ?",
    answer: "Tous ! Chiens, chats, lapins, oiseaux, reptiles, rongeurs... Chaque garde indique sur son profil les animaux qu'il peut accueillir. Vous trouverez forcément quelqu'un pour votre compagnon.",
    emoji: "🐾",
  },
  {
    question: "Comment fonctionne le paiement ?",
    answer: "Le paiement est sécurisé via notre plateforme. Vous payez lors de la réservation, mais le garde ne reçoit l'argent qu'une fois la garde terminée et validée par vous. Pas de surprise !",
    emoji: "💳",
  },
  {
    question: "Puis-je rencontrer le garde avant ?",
    answer: "Absolument, et on le recommande ! La plupart des gardes proposent une première rencontre gratuite pour faire connaissance avec vous et votre animal. C'est le meilleur moyen de partir serein.",
    emoji: "🤝",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="py-24 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-4xl mb-4 block">❓</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Questions <span className="text-primary">fréquentes</span>
          </h2>
          <p className="text-text-light text-lg max-w-2xl mx-auto">
            Tout ce que vous devez savoir avant de vous lancer.
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
        >
          <Accordion.Root type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <Accordion.Item
                key={index}
                value={`item-${index}`}
                className="bg-card rounded-2xl shadow-lg overflow-hidden"
              >
                <Accordion.Header>
                  <Accordion.Trigger className="w-full px-6 py-5 flex items-center justify-between text-left group hover:bg-primary/5 transition-colors">
                    <span className="flex items-center gap-3">
                      <span className="text-2xl">{faq.emoji}</span>
                      <span className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                        {faq.question}
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 text-text-light transition-transform duration-300",
                        "group-data-[state=open]:rotate-180"
                      )}
                    />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                  <div className="px-6 pb-5 pt-0 text-text-light leading-relaxed pl-14">
                    {faq.answer}
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </motion.div>
      </div>
    </section>
  );
}
