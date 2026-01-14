import type { LucideIcon } from "lucide-react";
import {
  Home,
  Footprints,
  Eye,
  Building,
  Car,
  Pill,
  Search,
  MessageCircle,
  PawPrint,
} from "lucide-react";

// Navigation links
export const navLinks = [
  { href: "#services", label: "Services", emoji: "🎯" },
  { href: "#how-it-works", label: "Comment ça marche", emoji: "✨" },
  { href: "#testimonials", label: "Témoignages", emoji: "💬" },
  { href: "#faq", label: "FAQ", emoji: "❓" },
] as const;

// Floating animals for hero section
export const floatingAnimals = [
  { emoji: "🐕", delay: 0, x: "10%", y: "20%" },
  { emoji: "🐈", delay: 0.2, x: "85%", y: "15%" },
  { emoji: "🐰", delay: 0.4, x: "75%", y: "70%" },
  { emoji: "🦜", delay: 0.6, x: "15%", y: "75%" },
  { emoji: "🐹", delay: 0.8, x: "90%", y: "45%" },
] as const;

// Services
export interface Service {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  emoji: string;
}

export const services: Service[] = [
  {
    icon: Home,
    title: "Garde à domicile",
    description: "Votre animal reste dans son environnement familier pendant votre absence.",
    color: "bg-primary/10 text-primary",
    emoji: "🏠",
  },
  {
    icon: Footprints,
    title: "Promenades",
    description: "Des balades quotidiennes adaptées aux besoins de votre compagnon.",
    color: "bg-secondary/10 text-secondary",
    emoji: "🚶",
  },
  {
    icon: Eye,
    title: "Visites quotidiennes",
    description: "Passages réguliers pour nourrir, câliner et vérifier que tout va bien.",
    color: "bg-accent/20 text-foreground",
    emoji: "👀",
  },
  {
    icon: Building,
    title: "Pension",
    description: "Hébergement chez un garde de confiance dans un environnement chaleureux.",
    color: "bg-purple/10 text-purple",
    emoji: "🏨",
  },
  {
    icon: Car,
    title: "Transport",
    description: "Accompagnement chez le vétérinaire ou pour tout autre déplacement.",
    color: "bg-primary/10 text-primary",
    emoji: "🚗",
  },
  {
    icon: Pill,
    title: "Soins spéciaux",
    description: "Prise en charge d'animaux nécessitant des soins ou une attention particulière.",
    color: "bg-secondary/10 text-secondary",
    emoji: "💊",
  },
];

// How it works steps
export interface Step {
  icon: LucideIcon;
  number: string;
  title: string;
  description: string;
  color: string;
  emoji: string;
}

export const steps: Step[] = [
  {
    icon: Search,
    number: "01",
    title: "Recherchez",
    description: "Trouvez un garde près de chez vous selon vos critères : disponibilité, expérience, avis.",
    color: "bg-primary",
    emoji: "🔍",
  },
  {
    icon: MessageCircle,
    number: "02",
    title: "Échangez",
    description: "Discutez avec le garde, posez vos questions et organisez une première rencontre.",
    color: "bg-secondary",
    emoji: "💬",
  },
  {
    icon: PawPrint,
    number: "03",
    title: "Confiez",
    description: "Partez l'esprit tranquille ! Recevez des nouvelles et photos de votre compagnon.",
    color: "bg-purple",
    emoji: "🐾",
  },
];

// Testimonials
export interface Testimonial {
  id: number;
  name: string;
  animal: string;
  avatar: string;
  animalEmoji: string;
  rating: number;
  text: string;
}

export const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Marie Dupont",
    animal: "Luna (Labrador)",
    avatar: "👩‍🦰",
    animalEmoji: "🐕",
    rating: 5,
    text: "Sophie a gardé Luna pendant 2 semaines. Elle m'envoyait des photos tous les jours et Luna était tellement heureuse ! Je recommande à 100%.",
  },
  {
    id: 2,
    name: "Thomas Martin",
    animal: "Mochi (Chat Persan)",
    avatar: "👨",
    animalEmoji: "🐈",
    rating: 5,
    text: "Première fois que je confie Mochi et j'étais stressé. Paul a été super patient et professionnel. Mon chat s'est senti comme à la maison.",
  },
  {
    id: 3,
    name: "Léa Bernard",
    animal: "Caramel (Lapin)",
    avatar: "👩",
    animalEmoji: "🐰",
    rating: 5,
    text: "Pas facile de trouver quelqu'un pour un lapin ! Claire connaît bien les NAC et Caramel a adoré son séjour. Merci Animigo !",
  },
  {
    id: 4,
    name: "Lucas Petit",
    animal: "Rocky & Max (Bergers)",
    avatar: "👨‍🦱",
    animalEmoji: "🐕",
    rating: 5,
    text: "Avoir 2 gros chiens à faire garder, ce n'est pas simple. Julie les a emmenés en randonnée tous les jours, ils étaient ravis !",
  },
  {
    id: 5,
    name: "Emma Rousseau",
    animal: "Kiwi (Perruche)",
    avatar: "👩‍🦳",
    animalEmoji: "🦜",
    rating: 5,
    text: "Marc a l'habitude des oiseaux et ça se voit. Kiwi chantait quand je suis revenue le chercher. Service impeccable !",
  },
];

// Stats
export interface Stat {
  value: number;
  suffix: string;
  label: string;
  emoji: string;
  color: string;
  isDecimal?: boolean;
}

export const stats: Stat[] = [
  {
    value: 10000,
    suffix: "+",
    label: "Animaux heureux",
    emoji: "🐾",
    color: "text-primary",
  },
  {
    value: 2500,
    suffix: "+",
    label: "Gardes vérifiés",
    emoji: "✅",
    color: "text-secondary",
  },
  {
    value: 50,
    suffix: "+",
    label: "Villes couvertes",
    emoji: "📍",
    color: "text-purple",
  },
  {
    value: 4.9,
    suffix: "/5",
    label: "Note moyenne",
    emoji: "⭐",
    color: "text-accent",
    isDecimal: true,
  },
];

// FAQs
export interface FAQ {
  question: string;
  answer: string;
  emoji: string;
}

export const faqs: FAQ[] = [
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
