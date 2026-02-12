import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create or get a user by email
export const getOrCreateUser = mutation({
  args: {
    email: v.string(),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      return existingUser._id;
    }

    // Create new user with default stats and preferences
    const userId = await ctx.db.insert("users", {
      email: args.email,
      displayName: args.displayName,
      avatarUrl: args.avatarUrl,
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        totalFocusMinutes: 0,
        focusSessionsCompleted: 0,
        tokensEarned: 0,
        tokensSpent: 0,
      },
      preferences: {
        theme: "dark",
        soundEnabled: true,
        notificationsEnabled: true,
        defaultFocusDuration: 25,
        defaultBreakDuration: 5,
      },
      createdAt: Date.now(),
    });

    return userId;
  },
});

// Get user by ID
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Get user by email
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Update user preferences
export const updatePreferences = mutation({
  args: {
    userId: v.id("users"),
    preferences: v.object({
      theme: v.union(v.literal("light"), v.literal("dark"), v.literal("system")),
      soundEnabled: v.boolean(),
      notificationsEnabled: v.boolean(),
      defaultFocusDuration: v.number(),
      defaultBreakDuration: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      preferences: args.preferences,
    });
  },
});

// Update user stats after a game
export const updateStats = mutation({
  args: {
    userId: v.id("users"),
    gamesPlayedIncrement: v.number(),
    gamesWonIncrement: v.number(),
    focusMinutesIncrement: v.number(),
    focusSessionsIncrement: v.number(),
    tokensEarnedIncrement: v.number(),
    tokensSpentIncrement: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(args.userId, {
      stats: {
        gamesPlayed: user.stats.gamesPlayed + args.gamesPlayedIncrement,
        gamesWon: user.stats.gamesWon + args.gamesWonIncrement,
        totalFocusMinutes: user.stats.totalFocusMinutes + args.focusMinutesIncrement,
        focusSessionsCompleted: user.stats.focusSessionsCompleted + args.focusSessionsIncrement,
        tokensEarned: user.stats.tokensEarned + args.tokensEarnedIncrement,
        tokensSpent: user.stats.tokensSpent + args.tokensSpentIncrement,
      },
    });
  },
});
