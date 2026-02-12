import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const gameState = query({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      return null;
    }

    const [players, messages, actions, votes] = await Promise.all([
      ctx.db
        .query("players")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
        .collect(),
      ctx.db
        .query("messages")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
        .order("desc")
        .take(100),
      ctx.db
        .query("actions")
        .withIndex("by_game_and_round", (q) => q.eq("gameId", args.gameId).eq("round", game.round))
        .collect(),
      ctx.db
        .query("votes")
        .withIndex("by_game_and_round", (q) => q.eq("gameId", args.gameId).eq("round", game.round))
        .collect(),
    ]);

    return {
      game,
      players,
      messages: messages.reverse(),
      roundActions: actions,
      roundVotes: votes,
      serverTimestamp: Date.now(),
    };
  },
});

export const gameEvents = query({
  args: {
    gameId: v.id("games"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
    const events = await ctx.db
      .query("gameEvents")
      .withIndex("by_game_and_time", (q) => q.eq("gameId", args.gameId))
      .order("desc")
      .take(limit);
    return events.reverse();
  },
});

export const lobbySnapshot = query({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      return null;
    }
    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();
    return {
      gameId: args.gameId,
      name: game.name,
      inviteCode: game.inviteCode,
      hostId: game.hostId,
      status: game.status,
      phase: game.phase,
      playerCount: players.length,
      capacity: game.settings.playerCount,
      players,
    };
  },
});

export const publishEvent = mutation({
  args: {
    gameId: v.id("games"),
    type: v.string(),
    round: v.optional(v.number()),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    return await ctx.db.insert("gameEvents", {
      gameId: args.gameId,
      type: args.type,
      round: args.round ?? game.round,
      payload: args.payload,
      createdAt: Date.now(),
    });
  },
});

export const sendChatMessage = mutation({
  args: {
    gameId: v.id("games"),
    senderId: v.id("players"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }
    if (!game.settings.allowChat) {
      throw new Error("Chat is disabled for this game");
    }

    const sender = await ctx.db.get(args.senderId);
    if (!sender || sender.gameId !== args.gameId) {
      throw new Error("Sender is not part of this game");
    }

    const trimmed = args.content.trim();
    if (!trimmed) {
      throw new Error("Message cannot be empty");
    }

    return await ctx.db.insert("messages", {
      gameId: args.gameId,
      senderId: args.senderId,
      content: trimmed.slice(0, 500),
      type: "chat",
      visibility: "all",
      recipientId: undefined,
      timestamp: Date.now(),
    });
  },
});
