// Types for dashboard
export type MissionStatus =
  | "completed"
  | "in_progress"
  | "upcoming"
  | "pending_acceptance"
  | "pending_confirmation"
  | "refused"
  | "cancelled";

export type PaymentStatus = "paid" | "pending" | "not_due";

export interface Animal {
  name: string;
  type: string;
  emoji: string;
}

export interface Mission {
  id: string;
  clientName: string;
  clientAvatar: string;
  animal: Animal;
  service: string;
  startDate: string;
  endDate: string;
  status: MissionStatus;
  amount: number;
  paymentStatus: PaymentStatus;
  location: string;
}

export interface ReviewReply {
  content: string;
  date: string;
}

export interface Review {
  id: string;
  clientName: string;
  clientAvatar: string;
  clientImage: string;
  animal: Animal;
  rating: number;
  comment: string;
  date: string;
  missionId: string;
  missionType: string;
  reply?: ReviewReply;
}

export interface Message {
  id: string;
  senderName: string;
  senderAvatar: string;
  preview: string;
  date: string;
  unread: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  isMe: boolean;
  type: "text" | "image" | "system";
  imageUrl?: string;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  participantImage: string;
  animal: Animal;
  missionId?: string;
  missionStatus?: MissionStatus;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  messages: ChatMessage[];
}

export interface DashboardStats {
  completedMissions: {
    count: number;
    totalAmount: number;
    collectedAmount: number;
    pendingAmount: number;
  };
  inProgressMissions: {
    count: number;
    totalAmount: number;
  };
  upcomingMissions: {
    count: number;
    totalAmount: number;
  };
  pendingAcceptance: number;
  pendingConfirmation: number;
  refused: number;
  cancelled: number;
  totalReviews: number;
  averageRating: number;
}

// Mock Data
export const mockMissions: Mission[] = [
  // Completed missions
  {
    id: "m1",
    clientName: "Marie Dupont",
    clientAvatar: "👩‍🦰",
    animal: { name: "Luna", type: "Chien", emoji: "🐕" },
    service: "Garde à domicile",
    startDate: "2024-01-05",
    endDate: "2024-01-12",
    status: "completed",
    amount: 280,
    paymentStatus: "paid",
    location: "Paris 11e",
  },
  {
    id: "m2",
    clientName: "Thomas Martin",
    clientAvatar: "👨",
    animal: { name: "Mochi", type: "Chat", emoji: "🐈" },
    service: "Visites quotidiennes",
    startDate: "2024-01-08",
    endDate: "2024-01-15",
    status: "completed",
    amount: 120,
    paymentStatus: "paid",
    location: "Paris 15e",
  },
  {
    id: "m3",
    clientName: "Sophie Laurent",
    clientAvatar: "👩",
    animal: { name: "Rex", type: "Chien", emoji: "🐕" },
    service: "Promenades",
    startDate: "2024-01-10",
    endDate: "2024-01-17",
    status: "completed",
    amount: 140,
    paymentStatus: "pending",
    location: "Paris 12e",
  },
  // In progress missions
  {
    id: "m4",
    clientName: "Lucas Petit",
    clientAvatar: "👨‍🦱",
    animal: { name: "Rocky", type: "Chien", emoji: "🐕" },
    service: "Garde à domicile",
    startDate: "2024-01-14",
    endDate: "2024-01-21",
    status: "in_progress",
    amount: 320,
    paymentStatus: "not_due",
    location: "Paris 20e",
  },
  {
    id: "m5",
    clientName: "Emma Rousseau",
    clientAvatar: "👩‍🦳",
    animal: { name: "Kiwi", type: "Perruche", emoji: "🦜" },
    service: "Visites quotidiennes",
    startDate: "2024-01-13",
    endDate: "2024-01-18",
    status: "in_progress",
    amount: 75,
    paymentStatus: "not_due",
    location: "Paris 9e",
  },
  // Upcoming missions
  {
    id: "m6",
    clientName: "Léa Bernard",
    clientAvatar: "👩",
    animal: { name: "Caramel", type: "Lapin", emoji: "🐰" },
    service: "Pension",
    startDate: "2024-01-25",
    endDate: "2024-02-01",
    status: "upcoming",
    amount: 210,
    paymentStatus: "not_due",
    location: "Paris 18e",
  },
  {
    id: "m7",
    clientName: "Pierre Durand",
    clientAvatar: "👨",
    animal: { name: "Max", type: "Chien", emoji: "🐕" },
    service: "Garde à domicile",
    startDate: "2024-02-05",
    endDate: "2024-02-12",
    status: "upcoming",
    amount: 350,
    paymentStatus: "not_due",
    location: "Paris 16e",
  },
  {
    id: "m8",
    clientName: "Claire Moreau",
    clientAvatar: "👩‍🦰",
    animal: { name: "Nala", type: "Chat", emoji: "🐈" },
    service: "Visites quotidiennes",
    startDate: "2024-02-10",
    endDate: "2024-02-15",
    status: "upcoming",
    amount: 100,
    paymentStatus: "not_due",
    location: "Paris 5e",
  },
  // Pending acceptance
  {
    id: "m9",
    clientName: "Antoine Leroy",
    clientAvatar: "👨‍🦱",
    animal: { name: "Simba", type: "Chat", emoji: "🐈" },
    service: "Garde à domicile",
    startDate: "2024-02-20",
    endDate: "2024-02-27",
    status: "pending_acceptance",
    amount: 280,
    paymentStatus: "not_due",
    location: "Paris 14e",
  },
  {
    id: "m10",
    clientName: "Julie Blanc",
    clientAvatar: "👩",
    animal: { name: "Coco", type: "Perroquet", emoji: "🦜" },
    service: "Visites quotidiennes",
    startDate: "2024-01-22",
    endDate: "2024-01-24",
    status: "pending_acceptance",
    amount: 140,
    paymentStatus: "not_due",
    location: "Paris 10e",
  },
  // Pending confirmation
  {
    id: "m11",
    clientName: "Marc Girard",
    clientAvatar: "👨",
    animal: { name: "Buddy", type: "Chien", emoji: "🐕" },
    service: "Promenades",
    startDate: "2024-02-15",
    endDate: "2024-02-22",
    status: "pending_confirmation",
    amount: 160,
    paymentStatus: "not_due",
    location: "Paris 17e",
  },
  // Refused
  {
    id: "m12",
    clientName: "Nathalie Roux",
    clientAvatar: "👩‍🦳",
    animal: { name: "Thor", type: "Chien", emoji: "🐕" },
    service: "Transport",
    startDate: "2024-01-20",
    endDate: "2024-01-20",
    status: "refused",
    amount: 45,
    paymentStatus: "not_due",
    location: "Paris 13e",
  },
  // Cancelled
  {
    id: "m13",
    clientName: "François Mercier",
    clientAvatar: "👨",
    animal: { name: "Milo", type: "Chat", emoji: "🐈" },
    service: "Garde à domicile",
    startDate: "2024-01-18",
    endDate: "2024-01-25",
    status: "cancelled",
    amount: 280,
    paymentStatus: "not_due",
    location: "Paris 6e",
  },
  {
    id: "m14",
    clientName: "Isabelle Faure",
    clientAvatar: "👩",
    animal: { name: "Bella", type: "Chien", emoji: "🐕" },
    service: "Pension",
    startDate: "2024-01-22",
    endDate: "2024-01-29",
    status: "cancelled",
    amount: 350,
    paymentStatus: "not_due",
    location: "Paris 8e",
  },
];

export const mockReviews: Review[] = [
  {
    id: "r1",
    clientName: "Marie Dupont",
    clientAvatar: "👩‍🦰",
    clientImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face",
    animal: { name: "Luna", type: "Chien", emoji: "🐕" },
    rating: 5,
    comment: "Excellent garde ! Luna était très heureuse et en pleine forme à mon retour. Jean a envoyé des photos tous les jours et a été très attentionné. Je recommande vivement !",
    date: "2024-01-13",
    missionId: "m1",
    missionType: "Garde à domicile",
    reply: {
      content: "Merci beaucoup Marie ! Luna est adorable, c'était un plaisir de m'occuper d'elle. À très bientôt ! 🐕",
      date: "2024-01-14",
    },
  },
  {
    id: "r2",
    clientName: "Thomas Martin",
    clientAvatar: "👨",
    clientImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    animal: { name: "Mochi", type: "Chat", emoji: "🐈" },
    rating: 5,
    comment: "Très professionnel, Mochi s'est senti comme chez lui. Photos envoyées tous les jours ! Jean connaît vraiment bien les chats.",
    date: "2024-01-16",
    missionId: "m2",
    missionType: "Visites quotidiennes",
    reply: {
      content: "Merci Thomas ! Mochi est un chat exceptionnel, très câlin et joueur. N'hésitez pas à refaire appel à moi !",
      date: "2024-01-17",
    },
  },
  {
    id: "r3",
    clientName: "Sophie Laurent",
    clientAvatar: "👩",
    clientImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    animal: { name: "Rex", type: "Chien", emoji: "🐕" },
    rating: 4,
    comment: "Très bon service, Rex a adoré ses promenades. Petit bémol sur la communication, j'aurais aimé recevoir plus de nouvelles.",
    date: "2024-01-18",
    missionId: "m3",
    missionType: "Promenades",
  },
  {
    id: "r4",
    clientName: "Lucas Bernard",
    clientAvatar: "👨‍🦱",
    clientImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    animal: { name: "Cannelle", type: "Chat", emoji: "🐈" },
    rating: 5,
    comment: "Service impeccable ! Cannelle est habituellement très craintive avec les inconnus mais elle a tout de suite adopté Jean. Merci pour votre patience et votre douceur.",
    date: "2024-01-10",
    missionId: "m4",
    missionType: "Garde à domicile",
    reply: {
      content: "Merci Lucas ! Cannelle est une petite princesse, il fallait juste lui laisser le temps de s'habituer. Elle ronronnait à la fin ! 😊",
      date: "2024-01-11",
    },
  },
  {
    id: "r5",
    clientName: "Emma Petit",
    clientAvatar: "👩‍🦳",
    clientImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    animal: { name: "Oscar", type: "Lapin", emoji: "🐰" },
    rating: 5,
    comment: "Première fois que je confie Oscar et j'étais stressée. Jean m'a rassurée dès le premier contact. Oscar était en pleine forme à mon retour !",
    date: "2024-01-05",
    missionId: "m5",
    missionType: "Pension",
  },
  {
    id: "r6",
    clientName: "Pierre Moreau",
    clientAvatar: "👨",
    clientImage: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face",
    animal: { name: "Max", type: "Chien", emoji: "🐕" },
    rating: 3,
    comment: "Service correct mais Max est revenu un peu fatigué. Les promenades étaient peut-être un peu longues pour lui.",
    date: "2023-12-28",
    missionId: "m6",
    missionType: "Promenades",
    reply: {
      content: "Merci pour votre retour Pierre. Je prends note, j'aurais dû adapter la durée des promenades à l'âge de Max. Je ferai plus attention la prochaine fois.",
      date: "2023-12-29",
    },
  },
  {
    id: "r7",
    clientName: "Claire Dubois",
    clientAvatar: "👩",
    clientImage: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face",
    animal: { name: "Plume", type: "Perruche", emoji: "🦜" },
    rating: 5,
    comment: "Jean s'est très bien occupé de Plume malgré qu'il soit moins habitué aux oiseaux. Il a posé beaucoup de questions pour bien faire. Top !",
    date: "2023-12-20",
    missionId: "m7",
    missionType: "Visites quotidiennes",
  },
  {
    id: "r8",
    clientName: "Antoine Roux",
    clientAvatar: "👨‍🦱",
    clientImage: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&crop=face",
    animal: { name: "Diesel", type: "Chien", emoji: "🐕" },
    rating: 4,
    comment: "Bon séjour pour Diesel. Appartement propre et bien adapté. Seul petit point : j'aurais aimé plus de photos.",
    date: "2023-12-15",
    missionId: "m8",
    missionType: "Garde à domicile",
  },
];

export const mockMessages: Message[] = [
  {
    id: "msg1",
    senderName: "Lucas Petit",
    senderAvatar: "👨‍🦱",
    preview: "Bonjour ! Rocky se porte bien ? J'espère qu'il n'est pas...",
    date: "2024-01-14",
    unread: true,
  },
  {
    id: "msg2",
    senderName: "Emma Rousseau",
    senderAvatar: "👩‍🦳",
    preview: "Merci pour les photos de Kiwi ! Il a l'air en pleine forme.",
    date: "2024-01-14",
    unread: true,
  },
  {
    id: "msg3",
    senderName: "Léa Bernard",
    senderAvatar: "👩",
    preview: "J'ai hâte de vous confier Caramel, avez-vous des questions ?",
    date: "2024-01-13",
    unread: false,
  },
  {
    id: "msg4",
    senderName: "Antoine Leroy",
    senderAvatar: "👨‍🦱",
    preview: "Bonjour, je vous ai envoyé une demande pour Simba...",
    date: "2024-01-12",
    unread: false,
  },
];

export const mockConversations: Conversation[] = [
  {
    id: "conv1",
    participantId: "u2",
    participantName: "Lucas Petit",
    participantAvatar: "👨‍🦱",
    participantImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    animal: { name: "Rocky", type: "Chien", emoji: "🐕" },
    missionId: "m4",
    missionStatus: "in_progress",
    lastMessage: "Bonjour ! Rocky se porte bien ? J'espère qu'il n'est pas trop turbulent 😅",
    lastMessageTime: "10:32",
    unreadCount: 2,
    isOnline: true,
    messages: [
      {
        id: "cm1",
        senderId: "u2",
        content: "Bonjour Jean ! Je voulais juste prendre des nouvelles de Rocky.",
        timestamp: "2024-01-14T09:15:00",
        isMe: false,
        type: "text",
      },
      {
        id: "cm2",
        senderId: "u1",
        content: "Bonjour Lucas ! Rocky va très bien, il s'est très bien adapté. On a fait une grande balade ce matin au parc 🌳",
        timestamp: "2024-01-14T09:18:00",
        isMe: true,
        type: "text",
      },
      {
        id: "cm3",
        senderId: "u1",
        content: "Voici une petite photo de lui !",
        timestamp: "2024-01-14T09:19:00",
        isMe: true,
        type: "text",
      },
      {
        id: "cm4",
        senderId: "u1",
        content: "",
        timestamp: "2024-01-14T09:19:30",
        isMe: true,
        type: "image",
        imageUrl: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=300&fit=crop",
      },
      {
        id: "cm5",
        senderId: "u2",
        content: "Oh c'est super ! Il a l'air heureux 😊",
        timestamp: "2024-01-14T10:30:00",
        isMe: false,
        type: "text",
      },
      {
        id: "cm6",
        senderId: "u2",
        content: "Bonjour ! Rocky se porte bien ? J'espère qu'il n'est pas trop turbulent 😅",
        timestamp: "2024-01-14T10:32:00",
        isMe: false,
        type: "text",
      },
    ],
  },
  {
    id: "conv2",
    participantId: "u3",
    participantName: "Emma Rousseau",
    participantAvatar: "👩‍🦳",
    participantImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    animal: { name: "Kiwi", type: "Perruche", emoji: "🦜" },
    missionId: "m5",
    missionStatus: "in_progress",
    lastMessage: "Merci pour les photos de Kiwi ! Il a l'air en pleine forme.",
    lastMessageTime: "09:45",
    unreadCount: 1,
    isOnline: false,
    messages: [
      {
        id: "cm7",
        senderId: "u1",
        content: "Bonjour Emma ! Kiwi chante beaucoup ce matin, il est en pleine forme !",
        timestamp: "2024-01-14T08:30:00",
        isMe: true,
        type: "text",
      },
      {
        id: "cm8",
        senderId: "u1",
        content: "",
        timestamp: "2024-01-14T08:31:00",
        isMe: true,
        type: "image",
        imageUrl: "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=400&h=300&fit=crop",
      },
      {
        id: "cm9",
        senderId: "u3",
        content: "Merci pour les photos de Kiwi ! Il a l'air en pleine forme.",
        timestamp: "2024-01-14T09:45:00",
        isMe: false,
        type: "text",
      },
    ],
  },
  {
    id: "conv3",
    participantId: "u4",
    participantName: "Léa Bernard",
    participantAvatar: "👩",
    participantImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    animal: { name: "Caramel", type: "Lapin", emoji: "🐰" },
    missionId: "m6",
    missionStatus: "upcoming",
    lastMessage: "J'ai hâte de vous confier Caramel, avez-vous des questions ?",
    lastMessageTime: "Hier",
    unreadCount: 0,
    isOnline: true,
    messages: [
      {
        id: "cm10",
        senderId: "u4",
        content: "Bonjour ! J'ai vu votre profil et j'aimerais vous confier Caramel du 25 janvier au 1er février.",
        timestamp: "2024-01-12T14:00:00",
        isMe: false,
        type: "text",
      },
      {
        id: "cm11",
        senderId: "u1",
        content: "Bonjour Léa ! Avec plaisir, j'adore les lapins. Pouvez-vous me donner plus de détails sur ses habitudes ?",
        timestamp: "2024-01-12T14:15:00",
        isMe: true,
        type: "text",
      },
      {
        id: "cm12",
        senderId: "u4",
        content: "Bien sûr ! Caramel mange principalement du foin et des légumes frais. Il aime sortir de sa cage quelques heures par jour pour explorer.",
        timestamp: "2024-01-12T14:30:00",
        isMe: false,
        type: "text",
      },
      {
        id: "cm13",
        senderId: "u1",
        content: "Parfait ! J'ai tout ce qu'il faut pour l'accueillir. J'ai accepté votre demande de mission.",
        timestamp: "2024-01-12T14:45:00",
        isMe: true,
        type: "text",
      },
      {
        id: "cm14",
        senderId: "system",
        content: "Mission confirmée pour Caramel du 25 janv. au 1er fév.",
        timestamp: "2024-01-12T14:46:00",
        isMe: false,
        type: "system",
      },
      {
        id: "cm15",
        senderId: "u4",
        content: "J'ai hâte de vous confier Caramel, avez-vous des questions ?",
        timestamp: "2024-01-13T10:00:00",
        isMe: false,
        type: "text",
      },
    ],
  },
  {
    id: "conv4",
    participantId: "u5",
    participantName: "Antoine Leroy",
    participantAvatar: "👨‍🦱",
    participantImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    animal: { name: "Simba", type: "Chat", emoji: "🐈" },
    missionId: "m9",
    missionStatus: "pending_acceptance",
    lastMessage: "Bonjour, je vous ai envoyé une demande pour Simba...",
    lastMessageTime: "12 janv.",
    unreadCount: 0,
    isOnline: false,
    messages: [
      {
        id: "cm16",
        senderId: "u5",
        content: "Bonjour, je vous ai envoyé une demande pour Simba. C'est un chat très calme et affectueux.",
        timestamp: "2024-01-12T11:00:00",
        isMe: false,
        type: "text",
      },
      {
        id: "cm17",
        senderId: "u5",
        content: "Il est vacciné et stérilisé. Voici une photo !",
        timestamp: "2024-01-12T11:01:00",
        isMe: false,
        type: "text",
      },
      {
        id: "cm18",
        senderId: "u5",
        content: "",
        timestamp: "2024-01-12T11:02:00",
        isMe: false,
        type: "image",
        imageUrl: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=300&fit=crop",
      },
    ],
  },
  {
    id: "conv5",
    participantId: "u6",
    participantName: "Marie Dupont",
    participantAvatar: "👩‍🦰",
    participantImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face",
    animal: { name: "Luna", type: "Chien", emoji: "🐕" },
    missionId: "m1",
    missionStatus: "completed",
    lastMessage: "Merci encore pour tout, Luna était ravie ! ⭐⭐⭐⭐⭐",
    lastMessageTime: "13 janv.",
    unreadCount: 0,
    isOnline: false,
    messages: [
      {
        id: "cm19",
        senderId: "u6",
        content: "Bonjour ! Je viens de récupérer Luna, elle est en pleine forme !",
        timestamp: "2024-01-12T16:00:00",
        isMe: false,
        type: "text",
      },
      {
        id: "cm20",
        senderId: "u1",
        content: "Je suis content que tout se soit bien passé ! Luna est vraiment adorable 🐕",
        timestamp: "2024-01-12T16:05:00",
        isMe: true,
        type: "text",
      },
      {
        id: "cm21",
        senderId: "u6",
        content: "Merci encore pour tout, Luna était ravie ! ⭐⭐⭐⭐⭐",
        timestamp: "2024-01-13T09:00:00",
        isMe: false,
        type: "text",
      },
    ],
  },
];

// Helper functions
export function getMissionsByStatus(status: MissionStatus): Mission[] {
  return mockMissions.filter((m) => m.status === status);
}

export function calculateStats(): DashboardStats {
  const completed = getMissionsByStatus("completed");
  const inProgress = getMissionsByStatus("in_progress");
  const upcoming = getMissionsByStatus("upcoming");

  const completedTotal = completed.reduce((sum, m) => sum + m.amount, 0);
  const completedCollected = completed
    .filter((m) => m.paymentStatus === "paid")
    .reduce((sum, m) => sum + m.amount, 0);

  return {
    completedMissions: {
      count: completed.length,
      totalAmount: completedTotal,
      collectedAmount: completedCollected,
      pendingAmount: completedTotal - completedCollected,
    },
    inProgressMissions: {
      count: inProgress.length,
      totalAmount: inProgress.reduce((sum, m) => sum + m.amount, 0),
    },
    upcomingMissions: {
      count: upcoming.length,
      totalAmount: upcoming.reduce((sum, m) => sum + m.amount, 0),
    },
    pendingAcceptance: getMissionsByStatus("pending_acceptance").length,
    pendingConfirmation: getMissionsByStatus("pending_confirmation").length,
    refused: getMissionsByStatus("refused").length,
    cancelled: getMissionsByStatus("cancelled").length,
    totalReviews: mockReviews.length,
    averageRating:
      mockReviews.reduce((sum, r) => sum + r.rating, 0) / mockReviews.length,
  };
}

export function getUnreadMessagesCount(): number {
  return mockMessages.filter((m) => m.unread).length;
}

export type AvailabilityStatus = "available" | "partial" | "unavailable" | "conflict";

export interface AvailabilityCheck {
  status: AvailabilityStatus;
  availableDays: number;
  partialDays: number;
  unavailableDays: number;
  totalDays: number;
  conflictingMissions: Mission[];
}

export function checkAvailabilityForDateRange(
  startDate: string,
  endDate: string,
  excludeMissionId?: string
): AvailabilityCheck {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const availability = mockUserProfile.availability;

  let availableDays = 0;
  let partialDays = 0;
  let unavailableDays = 0;
  let totalDays = 0;

  // Check for conflicting missions (in_progress, upcoming, pending_confirmation)
  const conflictingMissions = mockMissions.filter((mission) => {
    if (excludeMissionId && mission.id === excludeMissionId) return false;
    if (!["in_progress", "upcoming", "pending_confirmation"].includes(mission.status)) return false;

    const missionStart = new Date(mission.startDate);
    const missionEnd = new Date(mission.endDate);

    // Check if date ranges overlap
    return start <= missionEnd && end >= missionStart;
  });

  // Iterate through each day of the range
  const current = new Date(start);
  while (current <= end) {
    totalDays++;
    const dateKey = current.toISOString().split("T")[0];
    const dayStatus = availability[dateKey];

    if (dayStatus === "available") {
      availableDays++;
    } else if (dayStatus === "partial") {
      partialDays++;
    } else {
      unavailableDays++;
    }

    current.setDate(current.getDate() + 1);
  }

  // Determine overall status
  let status: AvailabilityStatus;
  if (conflictingMissions.length > 0) {
    status = "conflict";
  } else if (unavailableDays === totalDays) {
    status = "unavailable";
  } else if (availableDays === totalDays) {
    status = "available";
  } else {
    status = "partial";
  }

  return {
    status,
    availableDays,
    partialDays,
    unavailableDays,
    totalDays,
    conflictingMissions,
  };
}

// User profile mock data
export type HousingType = "house" | "apartment";

export interface OwnedAnimal {
  type: string;
  name: string;
  emoji: string;
  age: string;
  description: string;
}

export interface EnvironmentPhoto {
  id: string;
  url: string;
  caption: string;
}

export interface PricingTier {
  price: number;
  average: number;
  min: number;
  max: number;
}

export interface Pricing {
  hourly: PricingTier;
  daily: PricingTier;
  weekly: PricingTier;
  monthly: PricingTier;
}

export interface AcceptedAnimalType {
  type: string;
  emoji: string;
  accepted: boolean;
}

export interface Activity {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string;
  profileImage: string;
  email: string;
  phone: string;
  location: string;
  address: string;
  bio: string;
  description: string;
  memberSince: string;
  verified: boolean;
  responseRate: number;
  responseTime: string; // e.g., "< 1h", "< 2h", "< 24h"
  acceptanceRate: number;
  // Availability
  availability: {
    [key: string]: "available" | "partial" | "unavailable";
  };
  // Housing conditions
  housing: {
    type: HousingType;
    hasGarden: boolean;
    gardenSize?: string;
    isSmokeFree: boolean;
    floorArea: number;
  };
  // Presence
  hasChildren: boolean;
  childrenDetails?: string;
  hasOwnAnimals: boolean;
  ownAnimals: OwnedAnimal[];
  // Capacity
  maxAnimals: number;
  acceptedAnimalTypes: AcceptedAnimalType[];
  // Activities
  activities: Activity[];
  // Pricing
  pricing: Pricing;
  // Food
  providesFood: boolean;
  foodDetails?: string;
  // Environment photos
  environmentPhotos: EnvironmentPhoto[];
}

export const mockUserProfile: UserProfile = {
  id: "u1",
  firstName: "Jean",
  lastName: "Dupont",
  avatar: "👨‍🦱",
  profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
  email: "jean.dupont@email.com",
  phone: "06 12 34 56 78",
  location: "Paris 11e, France",
  address: "15 Rue de la Roquette, 75011 Paris",
  bio: "Passionné par les animaux depuis toujours.",
  description: "Passionné par les animaux depuis toujours, j'ai grandi entouré de chiens et chats dans la campagne normande. Aujourd'hui installé à Paris, je dispose d'un grand appartement lumineux avec un balcon où vos compagnons pourront profiter du soleil. Je travaille depuis chez moi en tant que graphiste freelance, ce qui me permet d'être présent toute la journée pour m'occuper de vos animaux. Je traite chaque animal comme s'il était le mien, avec beaucoup d'amour et d'attention !",
  memberSince: "2023-06-15",
  verified: true,
  responseRate: 98,
  responseTime: "< 1h",
  acceptanceRate: 85,
  // Availability - dates as YYYY-MM-DD keys
  availability: {
    // January 2024
    "2024-01-15": "available",
    "2024-01-16": "available",
    "2024-01-17": "partial",
    "2024-01-18": "available",
    "2024-01-19": "unavailable",
    "2024-01-20": "unavailable",
    "2024-01-21": "available",
    "2024-01-22": "available",
    "2024-01-23": "available",
    "2024-01-24": "partial",
    "2024-01-25": "available",
    "2024-01-26": "available",
    "2024-01-27": "available",
    "2024-01-28": "available",
    "2024-01-29": "partial",
    "2024-01-30": "available",
    "2024-01-31": "available",
    // February 2024
    "2024-02-01": "available",
    "2024-02-02": "available",
    "2024-02-03": "unavailable",
    "2024-02-04": "unavailable",
    "2024-02-05": "available",
    "2024-02-06": "available",
    "2024-02-07": "available",
    "2024-02-08": "partial",
    "2024-02-09": "available",
    "2024-02-10": "available",
    "2024-02-11": "available",
    "2024-02-12": "available",
    "2024-02-13": "available",
    "2024-02-14": "partial",
    "2024-02-15": "available",
  },
  // Housing
  housing: {
    type: "apartment",
    hasGarden: false,
    isSmokeFree: true,
    floorArea: 85,
  },
  // Children
  hasChildren: false,
  childrenDetails: undefined,
  // Own animals
  hasOwnAnimals: true,
  ownAnimals: [
    {
      type: "Chat",
      name: "Moustache",
      emoji: "🐈",
      age: "4 ans",
      description: "Chat très sociable, adore la compagnie des autres animaux",
    },
  ],
  // Capacity
  maxAnimals: 2,
  acceptedAnimalTypes: [
    { type: "Chien", emoji: "🐕", accepted: true },
    { type: "Chat", emoji: "🐈", accepted: true },
    { type: "Lapin", emoji: "🐰", accepted: true },
    { type: "Rongeur", emoji: "🐹", accepted: true },
    { type: "Oiseau", emoji: "🦜", accepted: false },
    { type: "Reptile", emoji: "🦎", accepted: false },
  ],
  // Activities
  activities: [
    {
      id: "a1",
      name: "Promenades quotidiennes",
      emoji: "🚶",
      description: "2 à 3 promenades par jour dans les parcs du quartier",
    },
    {
      id: "a2",
      name: "Jeux et stimulation",
      emoji: "🎾",
      description: "Sessions de jeu régulières pour garder votre animal actif",
    },
    {
      id: "a3",
      name: "Câlins et attention",
      emoji: "🤗",
      description: "Beaucoup d'amour et de moments de complicité",
    },
    {
      id: "a4",
      name: "Photos et nouvelles",
      emoji: "📸",
      description: "Envoi quotidien de photos et mises à jour",
    },
    {
      id: "a5",
      name: "Soins et toilettage",
      emoji: "🧴",
      description: "Brossage régulier et soins de base",
    },
  ],
  // Pricing
  pricing: {
    hourly: { price: 15, average: 14, min: 10, max: 20 },
    daily: { price: 35, average: 32, min: 25, max: 45 },
    weekly: { price: 200, average: 190, min: 150, max: 280 },
    monthly: { price: 700, average: 650, min: 500, max: 900 },
  },
  // Food
  providesFood: false,
  foodDetails: "L'alimentation habituelle de votre animal doit être fournie pour respecter son régime alimentaire. Je peux cependant fournir des friandises !",
  // Environment photos
  environmentPhotos: [
    {
      id: "p1",
      url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&h=400&fit=crop",
      caption: "Salon lumineux",
    },
    {
      id: "p2",
      url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop",
      caption: "Espace détente",
    },
    {
      id: "p3",
      url: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=600&h=400&fit=crop",
      caption: "Coin repos pour animaux",
    },
    {
      id: "p4",
      url: "https://images.unsplash.com/photo-1523575708161-ad0fc2a9b951?w=600&h=400&fit=crop",
      caption: "Balcon ensoleillé",
    },
  ],
};
