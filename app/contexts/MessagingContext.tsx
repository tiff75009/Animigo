"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Id } from "@/convex/_generated/dataModel";

interface MessagingContextValue {
  activeConversationId: Id<"conversations"> | null;
  setActiveConversationId: (id: Id<"conversations"> | null) => void;
}

const MessagingContext = createContext<MessagingContextValue | null>(null);

export function MessagingProvider({ children }: { children: ReactNode }) {
  const [activeConversationId, setActiveConversationId] = useState<Id<"conversations"> | null>(null);

  return (
    <MessagingContext.Provider value={{ activeConversationId, setActiveConversationId }}>
      {children}
    </MessagingContext.Provider>
  );
}

export function useActiveConversation() {
  const context = useContext(MessagingContext);
  if (!context) {
    // Retourner des valeurs par défaut si pas de provider (pour les composants hors messagerie)
    return { activeConversationId: null, setActiveConversationId: () => {} };
  }
  return context;
}
