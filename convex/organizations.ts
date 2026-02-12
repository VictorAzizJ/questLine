import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

const organizationSettingsValidator = v.object({
  allowPublicGames: v.boolean(),
  defaultGameMode: v.string(),
  maxPlayersPerGame: v.number(),
  aiPlayersAllowed: v.boolean(),
});

const defaultOrganizationSettings = {
  allowPublicGames: true,
  defaultGameMode: "focus-as-night",
  maxPlayersPerGame: 12,
  aiPlayersAllowed: true,
};

async function getMembership(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">,
  userId: Id<"users">
) {
  return await ctx.db
    .query("organizationMembers")
    .withIndex("by_org_and_user", (q) =>
      q.eq("organizationId", organizationId).eq("userId", userId)
    )
    .first();
}

async function requireOrganizationMember(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">,
  userId: Id<"users">
) {
  const membership = await getMembership(ctx, organizationId, userId);
  if (!membership) {
    throw new Error("You are not a member of this organization");
  }
  return membership;
}

async function requireOrganizationAdminOrOwner(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  userId: Id<"users">
) {
  const membership = await requireOrganizationMember(ctx, organizationId, userId);
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Only organization owners and admins can perform this action");
  }
  return membership;
}

export const create = mutation({
  args: {
    ownerId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    settings: v.optional(organizationSettingsValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const organizationId = await ctx.db.insert("organizations", {
      ownerId: args.ownerId,
      name: args.name,
      description: args.description,
      logoUrl: args.logoUrl,
      settings: args.settings ?? defaultOrganizationSettings,
      memberCount: 1,
      createdAt: now,
    });

    await ctx.db.insert("organizationMembers", {
      organizationId,
      userId: args.ownerId,
      role: "owner",
      joinedAt: now,
    });

    return organizationId;
  },
});

export const get = query({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireOrganizationMember(ctx, args.organizationId, args.userId);
    return await ctx.db.get(args.organizationId);
  },
});

export const listForUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const organization = await ctx.db.get(membership.organizationId);
        return organization
          ? { organization, role: membership.role, joinedAt: membership.joinedAt }
          : null;
      })
    );

    return organizations.filter((result): result is NonNullable<typeof result> => result !== null);
  },
});

export const update = mutation({
  args: {
    organizationId: v.id("organizations"),
    actorUserId: v.id("users"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    settings: v.optional(organizationSettingsValidator),
  },
  handler: async (ctx, args) => {
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    await requireOrganizationAdminOrOwner(ctx, args.organizationId, args.actorUserId);

    const patch: {
      name?: string;
      description?: string;
      logoUrl?: string;
      settings?: {
        allowPublicGames: boolean;
        defaultGameMode: string;
        maxPlayersPerGame: number;
        aiPlayersAllowed: boolean;
      };
    } = {};

    if (args.name !== undefined) {
      patch.name = args.name;
    }
    if (args.description !== undefined) {
      patch.description = args.description;
    }
    if (args.logoUrl !== undefined) {
      patch.logoUrl = args.logoUrl;
    }
    if (args.settings !== undefined) {
      patch.settings = args.settings;
    }

    if (Object.keys(patch).length === 0) {
      return;
    }

    await ctx.db.patch(args.organizationId, patch);
  },
});
