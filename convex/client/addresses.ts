import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

// Helper: Valider la session et récupérer l'utilisateur
async function validateSession(ctx: any, token: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    return null;
  }

  const user = await ctx.db.get(session.userId);
  if (!user) {
    return null;
  }

  return { session, user, userId: user._id };
}

/**
 * Get all addresses for the current user
 * Includes the profile address as a fallback if no addresses are saved
 */
export const getAddresses = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const authResult = await validateSession(ctx, args.sessionToken);
    if (!authResult) {
      return [];
    }

    const addresses = await ctx.db
      .query("clientAddresses")
      .withIndex("by_user", (q) => q.eq("userId", authResult.userId))
      .collect();

    // If no addresses in clientAddresses, check clientProfiles for a fallback
    if (addresses.length === 0) {
      const clientProfile = await ctx.db
        .query("clientProfiles")
        .withIndex("by_user", (q) => q.eq("userId", authResult.userId))
        .first();

      if (clientProfile && clientProfile.location) {
        // Return a virtual address from profile data
        return [{
          _id: `profile-${authResult.userId}` as any,
          _creationTime: clientProfile.updatedAt,
          userId: authResult.userId,
          label: "Mon adresse",
          address: clientProfile.location,
          city: clientProfile.city,
          postalCode: clientProfile.postalCode,
          coordinates: clientProfile.coordinates,
          googlePlaceId: clientProfile.googlePlaceId,
          isDefault: true,
          createdAt: clientProfile.updatedAt,
          updatedAt: clientProfile.updatedAt,
        }];
      }
    }

    // Sort by default first, then by creation date
    return addresses.sort((a, b) => {
      if (a.isDefault !== b.isDefault) {
        return a.isDefault ? -1 : 1;
      }
      return b.createdAt - a.createdAt;
    });
  },
});

/**
 * Get the default address for the current user
 */
export const getDefaultAddress = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const authResult = await validateSession(ctx, args.sessionToken);
    if (!authResult) {
      return null;
    }

    // First try to get the default address
    const defaultAddress = await ctx.db
      .query("clientAddresses")
      .withIndex("by_user_default", (q) =>
        q.eq("userId", authResult.userId).eq("isDefault", true)
      )
      .first();

    if (defaultAddress) {
      return defaultAddress;
    }

    // Fallback to the first address
    return await ctx.db
      .query("clientAddresses")
      .withIndex("by_user", (q) => q.eq("userId", authResult.userId))
      .first();
  },
});

/**
 * Add a new address
 */
export const addAddress = mutation({
  args: {
    sessionToken: v.string(),
    label: v.string(),
    address: v.string(),
    city: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
    coordinates: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
    googlePlaceId: v.optional(v.string()),
    additionalInfo: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const authResult = await validateSession(ctx, args.sessionToken);
    if (!authResult) {
      throw new Error("Non authentifié");
    }

    const now = Date.now();
    const isDefault = args.isDefault ?? false;

    // If this is the default address, unset other defaults
    if (isDefault) {
      const existingAddresses = await ctx.db
        .query("clientAddresses")
        .withIndex("by_user", (q) => q.eq("userId", authResult.userId))
        .collect();

      for (const addr of existingAddresses) {
        if (addr.isDefault) {
          await ctx.db.patch(addr._id, { isDefault: false, updatedAt: now });
        }
      }
    }

    // Check if this is the first address (auto-set as default)
    const existingCount = await ctx.db
      .query("clientAddresses")
      .withIndex("by_user", (q) => q.eq("userId", authResult.userId))
      .collect();

    const addressId = await ctx.db.insert("clientAddresses", {
      userId: authResult.userId,
      label: args.label,
      address: args.address,
      city: args.city,
      postalCode: args.postalCode,
      country: args.country,
      coordinates: args.coordinates,
      googlePlaceId: args.googlePlaceId,
      additionalInfo: args.additionalInfo,
      isDefault: isDefault || existingCount.length === 0,
      createdAt: now,
      updatedAt: now,
    });

    return addressId;
  },
});

/**
 * Update an existing address
 */
export const updateAddress = mutation({
  args: {
    sessionToken: v.string(),
    addressId: v.id("clientAddresses"),
    label: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
    coordinates: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
    googlePlaceId: v.optional(v.string()),
    additionalInfo: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const authResult = await validateSession(ctx, args.sessionToken);
    if (!authResult) {
      throw new Error("Non authentifié");
    }

    const existingAddress = await ctx.db.get(args.addressId);
    if (!existingAddress || existingAddress.userId !== authResult.userId) {
      throw new Error("Adresse introuvable");
    }

    const now = Date.now();

    // If setting as default, unset other defaults
    if (args.isDefault === true) {
      const existingAddresses = await ctx.db
        .query("clientAddresses")
        .withIndex("by_user", (q) => q.eq("userId", authResult.userId))
        .collect();

      for (const addr of existingAddresses) {
        if (addr.isDefault && addr._id !== args.addressId) {
          await ctx.db.patch(addr._id, { isDefault: false, updatedAt: now });
        }
      }
    }

    const updateData: Record<string, unknown> = { updatedAt: now };
    if (args.label !== undefined) updateData.label = args.label;
    if (args.address !== undefined) updateData.address = args.address;
    if (args.city !== undefined) updateData.city = args.city;
    if (args.postalCode !== undefined) updateData.postalCode = args.postalCode;
    if (args.country !== undefined) updateData.country = args.country;
    if (args.coordinates !== undefined) updateData.coordinates = args.coordinates;
    if (args.googlePlaceId !== undefined) updateData.googlePlaceId = args.googlePlaceId;
    if (args.additionalInfo !== undefined) updateData.additionalInfo = args.additionalInfo;
    if (args.isDefault !== undefined) updateData.isDefault = args.isDefault;

    await ctx.db.patch(args.addressId, updateData);

    return args.addressId;
  },
});

/**
 * Delete an address
 */
export const deleteAddress = mutation({
  args: {
    sessionToken: v.string(),
    addressId: v.id("clientAddresses"),
  },
  handler: async (ctx, args) => {
    const authResult = await validateSession(ctx, args.sessionToken);
    if (!authResult) {
      throw new Error("Non authentifié");
    }

    const existingAddress = await ctx.db.get(args.addressId);
    if (!existingAddress || existingAddress.userId !== authResult.userId) {
      throw new Error("Adresse introuvable");
    }

    const wasDefault = existingAddress.isDefault;
    await ctx.db.delete(args.addressId);

    // If deleted address was default, set another as default
    if (wasDefault) {
      const remainingAddresses = await ctx.db
        .query("clientAddresses")
        .withIndex("by_user", (q) => q.eq("userId", authResult.userId))
        .first();

      if (remainingAddresses) {
        await ctx.db.patch(remainingAddresses._id, {
          isDefault: true,
          updatedAt: Date.now()
        });
      }
    }

    return { success: true };
  },
});

/**
 * Set an address as default
 */
export const setDefaultAddress = mutation({
  args: {
    sessionToken: v.string(),
    addressId: v.id("clientAddresses"),
  },
  handler: async (ctx, args) => {
    const authResult = await validateSession(ctx, args.sessionToken);
    if (!authResult) {
      throw new Error("Non authentifié");
    }

    const targetAddress = await ctx.db.get(args.addressId);
    if (!targetAddress || targetAddress.userId !== authResult.userId) {
      throw new Error("Adresse introuvable");
    }

    const now = Date.now();

    // Unset all other defaults
    const existingAddresses = await ctx.db
      .query("clientAddresses")
      .withIndex("by_user", (q) => q.eq("userId", authResult.userId))
      .collect();

    for (const addr of existingAddresses) {
      if (addr._id === args.addressId) {
        await ctx.db.patch(addr._id, { isDefault: true, updatedAt: now });
      } else if (addr.isDefault) {
        await ctx.db.patch(addr._id, { isDefault: false, updatedAt: now });
      }
    }

    return { success: true };
  },
});
