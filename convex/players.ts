import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { aiDifficultyValidator, roleValidator } from "./lib/game";

// Join a game
export const join = mutation({
  args: {
    gameId: v.id("games"),
    userId: v.optional(v.id("users")),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    isAI: v.boolean(),
    aiDifficulty: v.optional(aiDifficultyValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }
    if (game.status !== "waiting") {
      throw new Error("Cannot join a game that has already started");
    }

    // Check if user already in game
    if (args.userId) {
      const existing = await ctx.db
        .query("players")
        .withIndex("by_game_and_user", (q) => q.eq("gameId", args.gameId).eq("userId", args.userId))
        .first();
      if (existing) {
        return existing._id;
      }
    }

    const existingPlayers = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();
    if (existingPlayers.length >= game.settings.playerCount) {
      throw new Error("Lobby is full");
    }

    const playerId = await ctx.db.insert("players", {
      gameId: args.gameId,
      userId: args.userId,
      name: args.name,
      avatarUrl: args.avatarUrl,
      role: undefined,
      isAlive: true,
      isAI: args.isAI,
      aiDifficulty: args.aiDifficulty,
      actionTokens: 0,
      hasActedThisRound: false,
      hasVotedThisRound: false,
      isConnected: true,
      joinedAt: now,
      lastActiveAt: now,
    });

    await ctx.db.insert("gameEvents", {
      gameId: args.gameId,
      type: "player_joined",
      payload: {
        playerId,
        name: args.name,
        isAI: args.isAI,
      },
      round: game.round,
      createdAt: now,
    });

    return playerId;
  },
});

// Get players for a game
export const getByGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();
  },
});

// Get a specific player
export const get = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.playerId);
  },
});

// Assign role to player
export const assignRole = mutation({
  args: {
    playerId: v.id("players"),
    role: roleValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.playerId, {
      role: args.role,
    });
  },
});

// Eliminate a player
export const eliminate = mutation({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    await ctx.db.patch(args.playerId, {
      isAlive: false,
    });

    await ctx.db.insert("gameEvents", {
      gameId: player.gameId,
      type: "player_eliminated",
      payload: {
        playerId: args.playerId,
      },
      createdAt: Date.now(),
    });
  },
});

// Reset round flags for all players in a game
export const resetRoundFlags = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    for (const player of players) {
      await ctx.db.patch(player._id, {
        hasActedThisRound: false,
        hasVotedThisRound: false,
      });
    }
  },
});

// Update player connection status
export const updateConnection = mutation({
  args: {
    playerId: v.id("players"),
    isConnected: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.playerId, {
      isConnected: args.isConnected,
      lastActiveAt: Date.now(),
    });
  },
});

// Award tokens to a player
export const awardTokens = mutation({
  args: {
    playerId: v.id("players"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) throw new Error("Player not found");

    await ctx.db.patch(args.playerId, {
      actionTokens: player.actionTokens + args.amount,
    });
  },
});

// Leave a game
export const leave = mutation({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    await ctx.db.delete(args.playerId);

    await ctx.db.insert("gameEvents", {
      gameId: player.gameId,
      type: "player_left",
      payload: {
        playerId: args.playerId,
      },
      createdAt: Date.now(),
    });
  },
});
