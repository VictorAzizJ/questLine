import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { generateInviteCode } from "./lib/game";

export const getLobby = query({
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
      game,
      players,
      capacity: game.settings.playerCount,
      availableSpots: Math.max(0, game.settings.playerCount - players.length),
    };
  },
});

export const getLobbyByInviteCode = query({
  args: {
    inviteCode: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", args.inviteCode.toUpperCase()))
      .first();

    if (!game) {
      return null;
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", game._id))
      .collect();

    return {
      game,
      players,
      capacity: game.settings.playerCount,
      availableSpots: Math.max(0, game.settings.playerCount - players.length),
    };
  },
});

export const listPublicLobbies = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 50);
    const waitingGames = await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .order("desc")
      .take(limit);

    return await Promise.all(
      waitingGames.map(async (game) => {
        const players = await ctx.db
          .query("players")
          .withIndex("by_game", (q) => q.eq("gameId", game._id))
          .collect();

        return {
          ...game,
          currentPlayers: players.length,
          availableSpots: Math.max(0, game.settings.playerCount - players.length),
        };
      })
    );
  },
});

export const regenerateInviteCode = mutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    let inviteCode = generateInviteCode();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const existing = await ctx.db
        .query("games")
        .withIndex("by_invite_code", (q) => q.eq("inviteCode", inviteCode))
        .first();
      if (!existing || existing._id === args.gameId) {
        break;
      }
      inviteCode = generateInviteCode();
    }

    await ctx.db.patch(args.gameId, {
      inviteCode,
      updatedAt: Date.now(),
    });

    return inviteCode;
  },
});
