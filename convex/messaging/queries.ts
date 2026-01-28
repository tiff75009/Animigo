// @ts-nocheck
import { query } from "../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

/**
 * Liste les conversations de l'utilisateur connecté
 * Triées par lastMessageAt (plus récent en premier)
 */
export const listConversations = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Vérifier la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return [];
    }

    const userId = session.userId;

    // Récupérer les conversations où l'utilisateur est annonceur ou client
    const asAnnouncer = await ctx.db
      .query("conversations")
      .withIndex("by_announcer_active", (q) =>
        q.eq("announcerId", userId).eq("isActive", true)
      )
      .collect();

    const asClient = await ctx.db
      .query("conversations")
      .withIndex("by_client_active", (q) =>
        q.eq("clientId", userId).eq("isActive", true)
      )
      .collect();

    // Fusionner et dédupliquer
    const conversationsMap = new Map();
    [...asAnnouncer, ...asClient].forEach((conv) => {
      conversationsMap.set(conv._id, conv);
    });

    const conversations = Array.from(conversationsMap.values());

    // Trier par lastMessageAt (plus récent en premier)
    conversations.sort((a, b) => {
      const aTime = a.lastMessageAt || a.createdAt;
      const bTime = b.lastMessageAt || b.createdAt;
      return bTime - aTime;
    });

    // Enrichir avec les infos nécessaires pour l'affichage
    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        // Déterminer si l'utilisateur est annonceur ou client
        const isAnnouncer = conv.announcerId === userId;
        const otherUserId = isAnnouncer ? conv.clientId : conv.announcerId;

        // Récupérer le profil de l'autre utilisateur pour la photo
        const otherUser = await ctx.db.get(otherUserId);
        let profileImageUrl = null;

        if (otherUser) {
          if (isAnnouncer) {
            // L'autre est un client, chercher dans clientProfiles
            const clientProfile = await ctx.db
              .query("clientProfiles")
              .withIndex("by_user", (q) => q.eq("userId", otherUserId))
              .first();
            profileImageUrl = clientProfile?.profileImageUrl;
          } else {
            // L'autre est un annonceur, chercher dans profiles
            const announcerProfile = await ctx.db
              .query("profiles")
              .withIndex("by_user", (q) => q.eq("userId", otherUserId))
              .first();
            profileImageUrl = announcerProfile?.profileImageUrl;
          }
        }

        // Récupérer le statut de la mission
        const mission = await ctx.db.get(conv.missionId);

        return {
          id: conv._id,
          missionId: conv.missionId,
          participantName: isAnnouncer ? conv.clientName : conv.announcerName,
          participantImage: profileImageUrl || "/images/default-avatar.png",
          animalName: conv.animalName,
          animalEmoji: conv.animalEmoji,
          serviceName: conv.serviceName,
          lastMessage: conv.lastMessageContent || "",
          lastMessageAt: conv.lastMessageAt,
          lastMessageSenderId: conv.lastMessageSenderId,
          unreadCount: isAnnouncer
            ? conv.announcerUnreadCount
            : conv.clientUnreadCount,
          missionStatus: mission?.status,
          isAnnouncer,
        };
      })
    );

    return enrichedConversations;
  },
});

/**
 * Liste les messages d'une conversation avec pagination
 * Ordre descendant (plus récent en premier) pour infinite scroll vers le haut
 */
export const listMessages = query({
  args: {
    token: v.string(),
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    // Vérifier la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return {
        page: [],
        isDone: true,
        continueCursor: null,
      };
    }

    const userId = session.userId;

    // Vérifier que l'utilisateur a accès à cette conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (
      !conversation ||
      (conversation.announcerId !== userId && conversation.clientId !== userId)
    ) {
      return {
        page: [],
        isDone: true,
        continueCursor: null,
      };
    }

    // Récupérer les messages paginés (ordre descendant)
    const result = await ctx.db
      .query("messages")
      .withIndex("by_conversation_created", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("desc")
      .paginate(args.paginationOpts);

    // Enrichir les messages
    const enrichedMessages = result.page.map((msg) => ({
      id: msg._id,
      content: msg.content,
      type: msg.type,
      isMe: msg.senderId === userId,
      senderId: msg.senderId,
      isRead: msg.isRead,
      createdAt: msg.createdAt,
    }));

    return {
      ...result,
      page: enrichedMessages,
    };
  },
});

/**
 * Compte total des messages non lus pour l'utilisateur
 * Pour afficher dans le header/sidebar
 */
export const totalUnreadCount = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Vérifier la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return 0;
    }

    const userId = session.userId;

    // Récupérer les conversations où l'utilisateur est annonceur ou client
    const asAnnouncer = await ctx.db
      .query("conversations")
      .withIndex("by_announcer_active", (q) =>
        q.eq("announcerId", userId).eq("isActive", true)
      )
      .collect();

    const asClient = await ctx.db
      .query("conversations")
      .withIndex("by_client_active", (q) =>
        q.eq("clientId", userId).eq("isActive", true)
      )
      .collect();

    // Calculer le total
    let total = 0;

    for (const conv of asAnnouncer) {
      total += conv.announcerUnreadCount;
    }

    for (const conv of asClient) {
      // Éviter de compter deux fois si l'utilisateur est dans les deux listes
      if (conv.announcerId !== userId) {
        total += conv.clientUnreadCount;
      }
    }

    return total;
  },
});

/**
 * Récupérer une conversation par son ID
 */
export const getConversation = query({
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
      return null;
    }

    const userId = session.userId;

    // Récupérer la conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (
      !conversation ||
      (conversation.announcerId !== userId && conversation.clientId !== userId)
    ) {
      return null;
    }

    const isAnnouncer = conversation.announcerId === userId;
    const otherUserId = isAnnouncer
      ? conversation.clientId
      : conversation.announcerId;

    // Récupérer le profil de l'autre utilisateur
    const otherUser = await ctx.db.get(otherUserId);
    let profileImageUrl = null;

    if (otherUser) {
      if (isAnnouncer) {
        const clientProfile = await ctx.db
          .query("clientProfiles")
          .withIndex("by_user", (q) => q.eq("userId", otherUserId))
          .first();
        profileImageUrl = clientProfile?.profileImageUrl;
      } else {
        const announcerProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", otherUserId))
          .first();
        profileImageUrl = announcerProfile?.profileImageUrl;
      }
    }

    // Récupérer le statut de la mission
    const mission = await ctx.db.get(conversation.missionId);

    return {
      id: conversation._id,
      missionId: conversation.missionId,
      participantName: isAnnouncer
        ? conversation.clientName
        : conversation.announcerName,
      participantImage: profileImageUrl || "/images/default-avatar.png",
      animalName: conversation.animalName,
      animalEmoji: conversation.animalEmoji,
      serviceName: conversation.serviceName,
      unreadCount: isAnnouncer
        ? conversation.announcerUnreadCount
        : conversation.clientUnreadCount,
      missionStatus: mission?.status,
      isAnnouncer,
    };
  },
});
