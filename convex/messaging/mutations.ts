// @ts-nocheck
import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

/**
 * Envoyer un message dans une conversation
 */
export const sendMessage = mutation({
  args: {
    token: v.string(),
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Vérifier la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const userId = session.userId;

    // Vérifier que l'utilisateur a accès à cette conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (
      !conversation ||
      (conversation.announcerId !== userId && conversation.clientId !== userId)
    ) {
      throw new ConvexError("Conversation non trouvée");
    }

    // Vérifier que la conversation est active
    if (!conversation.isActive) {
      throw new ConvexError("Cette conversation n'est plus active");
    }

    // Valider le contenu
    const content = args.content.trim();
    if (!content) {
      throw new ConvexError("Le message ne peut pas être vide");
    }

    if (content.length > 2000) {
      throw new ConvexError("Le message est trop long (max 2000 caractères)");
    }

    const now = Date.now();
    const isAnnouncer = conversation.announcerId === userId;

    // Créer le message
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: userId,
      content,
      type: "text",
      isRead: false,
      createdAt: now,
    });

    // Mettre à jour la conversation
    // Incrémenter le compteur non-lu de l'autre partie
    const updateData: Record<string, unknown> = {
      lastMessageContent:
        content.length > 100 ? content.substring(0, 100) + "..." : content,
      lastMessageAt: now,
      lastMessageSenderId: userId,
      updatedAt: now,
    };

    if (isAnnouncer) {
      // L'annonceur envoie, incrémenter le compteur du client
      updateData.clientUnreadCount = conversation.clientUnreadCount + 1;
    } else {
      // Le client envoie, incrémenter le compteur de l'annonceur
      updateData.announcerUnreadCount = conversation.announcerUnreadCount + 1;
    }

    await ctx.db.patch(args.conversationId, updateData);

    return { messageId };
  },
});

/**
 * Marquer tous les messages d'une conversation comme lus
 */
export const markAsRead = mutation({
  args: {
    token: v.string(),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    // Vérifier la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const userId = session.userId;

    // Vérifier que l'utilisateur a accès à cette conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (
      !conversation ||
      (conversation.announcerId !== userId && conversation.clientId !== userId)
    ) {
      throw new ConvexError("Conversation non trouvée");
    }

    const isAnnouncer = conversation.announcerId === userId;
    const now = Date.now();

    // Récupérer les messages non lus envoyés par l'autre partie
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    // Marquer comme lus les messages de l'autre partie
    for (const msg of messages) {
      if (msg.senderId !== userId && !msg.isRead) {
        await ctx.db.patch(msg._id, {
          isRead: true,
          readAt: now,
        });
      }
    }

    // Remettre le compteur non-lu à zéro
    if (isAnnouncer) {
      await ctx.db.patch(args.conversationId, {
        announcerUnreadCount: 0,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(args.conversationId, {
        clientUnreadCount: 0,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Créer une conversation (fonction interne appelée après paiement)
 */
export const createConversation = internalMutation({
  args: {
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    // Récupérer la mission
    const mission = await ctx.db.get(args.missionId);
    if (!mission) {
      console.error(
        `createConversation: Mission ${args.missionId} non trouvée`
      );
      return null;
    }

    // Vérifier qu'une conversation n'existe pas déjà pour cette mission
    const existingConversation = await ctx.db
      .query("conversations")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .first();

    if (existingConversation) {
      console.log(
        `createConversation: Conversation existante pour mission ${args.missionId}`
      );
      return existingConversation._id;
    }

    // Récupérer les utilisateurs
    const announcer = await ctx.db.get(mission.announcerId);
    const client = await ctx.db.get(mission.clientId);

    if (!announcer || !client) {
      console.error(
        `createConversation: Annonceur ou client non trouvé pour mission ${args.missionId}`
      );
      return null;
    }

    const now = Date.now();

    // Créer la conversation
    const conversationId = await ctx.db.insert("conversations", {
      announcerId: mission.announcerId,
      clientId: mission.clientId,
      missionId: args.missionId,
      announcerName: `${announcer.firstName} ${announcer.lastName}`,
      clientName: mission.clientName || `${client.firstName} ${client.lastName}`,
      animalName: mission.animal?.name || "Animal",
      animalEmoji: mission.animal?.emoji || "🐾",
      serviceName: mission.serviceName || "Service",
      announcerUnreadCount: 0,
      clientUnreadCount: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Créer un message système initial
    const systemMessage = `La réservation a été confirmée ! Vous pouvez maintenant échanger avec ${announcer.firstName} concernant la prestation "${mission.serviceName}".`;

    await ctx.db.insert("messages", {
      conversationId,
      senderId: mission.clientId, // Le message système est attribué au client
      content: systemMessage,
      type: "system",
      isRead: false,
      createdAt: now,
    });

    // Mettre à jour la conversation avec le dernier message
    await ctx.db.patch(conversationId, {
      lastMessageContent: systemMessage.substring(0, 100) + "...",
      lastMessageAt: now,
      lastMessageSenderId: mission.clientId,
      announcerUnreadCount: 1, // L'annonceur a un message non lu
    });

    console.log(
      `createConversation: Conversation créée pour mission ${args.missionId}`
    );
    return conversationId;
  },
});

/**
 * Obtenir ou créer une conversation pour une mission
 * Utilisé quand l'utilisateur clique sur "Contacter"
 */
export const getOrCreateConversation = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    // Vérifier la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const userId = session.userId;

    // Récupérer la mission
    const mission = await ctx.db.get(args.missionId);
    if (!mission) {
      throw new ConvexError("Mission non trouvée");
    }

    // Vérifier que l'utilisateur est bien l'annonceur ou le client de cette mission
    if (mission.announcerId !== userId && mission.clientId !== userId) {
      throw new ConvexError("Vous n'avez pas accès à cette mission");
    }

    // Vérifier que le paiement est confirmé (statut upcoming, in_progress ou completed)
    const allowedStatuses = ["upcoming", "in_progress", "completed"];
    if (!allowedStatuses.includes(mission.status)) {
      throw new ConvexError(
        "La conversation n'est disponible qu'après confirmation du paiement"
      );
    }

    // Vérifier si une conversation existe déjà
    const existingConversation = await ctx.db
      .query("conversations")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .first();

    if (existingConversation) {
      return { conversationId: existingConversation._id };
    }

    // Créer la conversation si elle n'existe pas
    const announcer = await ctx.db.get(mission.announcerId);
    const client = await ctx.db.get(mission.clientId);

    if (!announcer || !client) {
      throw new ConvexError("Utilisateurs non trouvés");
    }

    const now = Date.now();

    const conversationId = await ctx.db.insert("conversations", {
      announcerId: mission.announcerId,
      clientId: mission.clientId,
      missionId: args.missionId,
      announcerName: `${announcer.firstName} ${announcer.lastName}`,
      clientName:
        mission.clientName || `${client.firstName} ${client.lastName}`,
      animalName: mission.animal?.name || "Animal",
      animalEmoji: mission.animal?.emoji || "🐾",
      serviceName: mission.serviceName || "Service",
      announcerUnreadCount: 0,
      clientUnreadCount: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Créer un message système initial
    const isAnnouncer = mission.announcerId === userId;
    const otherName = isAnnouncer ? client.firstName : announcer.firstName;
    const systemMessage = `Bienvenue ! Vous pouvez maintenant échanger avec ${otherName} concernant la prestation "${mission.serviceName}".`;

    await ctx.db.insert("messages", {
      conversationId,
      senderId: userId,
      content: systemMessage,
      type: "system",
      isRead: false,
      createdAt: now,
    });

    // Mettre à jour la conversation avec le dernier message
    await ctx.db.patch(conversationId, {
      lastMessageContent:
        systemMessage.length > 100
          ? systemMessage.substring(0, 100) + "..."
          : systemMessage,
      lastMessageAt: now,
      lastMessageSenderId: userId,
    });

    return { conversationId };
  },
});
