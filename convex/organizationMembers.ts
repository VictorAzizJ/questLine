import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

const memberRoleValidator = v.union(v.literal("admin"), v.literal("member"));

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

async function requireMember(
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

async function requireAdminOrOwner(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  userId: Id<"users">
) {
  const membership = await requireMember(ctx, organizationId, userId);
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Only organization owners and admins can perform this action");
  }
  return membership;
}

export const listByOrganization = query({
  args: {
    organizationId: v.id("organizations"),
    requesterUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.organizationId, args.requesterUserId);
    return await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();
  },
});

export const invite = mutation({
  args: {
    organizationId: v.id("organizations"),
    actorUserId: v.id("users"),
    invitedUserId: v.id("users"),
    role: v.optional(memberRoleValidator),
  },
  handler: async (ctx, args) => {
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const actorMembership = await requireAdminOrOwner(ctx, args.organizationId, args.actorUserId);
    const targetRole = args.role ?? "member";
    if (actorMembership.role === "admin" && targetRole === "admin") {
      throw new Error("Only organization owners can invite other admins");
    }

    const existingMembership = await getMembership(ctx, args.organizationId, args.invitedUserId);
    if (existingMembership) {
      if (existingMembership.role === "owner") {
        throw new Error("Cannot change owner membership through invite");
      }
      await ctx.db.patch(existingMembership._id, { role: targetRole });
      return existingMembership._id;
    }

    const memberId = await ctx.db.insert("organizationMembers", {
      organizationId: args.organizationId,
      userId: args.invitedUserId,
      role: targetRole,
      joinedAt: Date.now(),
    });

    await ctx.db.patch(args.organizationId, {
      memberCount: organization.memberCount + 1,
    });

    return memberId;
  },
});

export const join = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }
    if (!organization.settings.allowPublicGames) {
      throw new Error("This organization does not allow open membership");
    }

    const existingMembership = await getMembership(ctx, args.organizationId, args.userId);
    if (existingMembership) {
      return existingMembership._id;
    }

    const memberId = await ctx.db.insert("organizationMembers", {
      organizationId: args.organizationId,
      userId: args.userId,
      role: "member",
      joinedAt: Date.now(),
    });

    await ctx.db.patch(args.organizationId, {
      memberCount: organization.memberCount + 1,
    });

    return memberId;
  },
});

export const remove = mutation({
  args: {
    organizationId: v.id("organizations"),
    actorUserId: v.id("users"),
    memberUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const targetMembership = await getMembership(ctx, args.organizationId, args.memberUserId);
    if (!targetMembership) {
      throw new Error("Organization member not found");
    }
    if (targetMembership.role === "owner") {
      throw new Error("Organization owner cannot be removed");
    }

    if (args.actorUserId !== args.memberUserId) {
      const actorMembership = await requireAdminOrOwner(ctx, args.organizationId, args.actorUserId);
      if (actorMembership.role === "admin" && targetMembership.role === "admin") {
        throw new Error("Admins cannot remove other admins");
      }
    }

    await ctx.db.delete(targetMembership._id);
    await ctx.db.patch(args.organizationId, {
      memberCount: Math.max(1, organization.memberCount - 1),
    });
  },
});

export const updateRole = mutation({
  args: {
    organizationId: v.id("organizations"),
    actorUserId: v.id("users"),
    memberUserId: v.id("users"),
    role: memberRoleValidator,
  },
  handler: async (ctx, args) => {
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const actorMembership = await requireAdminOrOwner(ctx, args.organizationId, args.actorUserId);
    const targetMembership = await getMembership(ctx, args.organizationId, args.memberUserId);
    if (!targetMembership) {
      throw new Error("Organization member not found");
    }
    if (targetMembership.role === "owner") {
      throw new Error("Organization owner role cannot be changed");
    }
    if (actorMembership.role === "admin" && args.role === "admin") {
      throw new Error("Only organization owners can promote members to admin");
    }

    await ctx.db.patch(targetMembership._id, {
      role: args.role,
    });
  },
});
