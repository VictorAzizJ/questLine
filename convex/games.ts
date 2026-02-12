import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  gamePhaseValidator,
  gameSettingsValidator,
  gameStatusValidator,
  generateInviteCode,
  sessionModeValidator,
  winnerValidator,
} from "./lib/game";

// Create a new game
export const create = mutation({
  args: {
    name: v.string(),
    hostId: v.id("users"),
    mode: sessionModeValidator,
    settings: gameSettingsValidator,
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let inviteCode = generateInviteCode();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const existing = await ctx.db
        .query("games")
        .withIndex("by_invite_code", (q) => q.eq("inviteCode", inviteCode))
        .first();
      if (!existing) {
        break;
      }
      inviteCode = generateInviteCode();
    }

    const gameId = await ctx.db.insert("games", {
      name: args.name,
      hostId: args.hostId,
      inviteCode,
      mode: args.mode,
      status: "waiting",
      phase: "setup",
      round: 0,
      settings: args.settings,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("gameEvents", {
      gameId,
      type: "game_created",
      payload: {
        name: args.name,
        hostId: args.hostId,
      },
      round: 0,
      createdAt: now,
    });

    return { gameId, inviteCode };
  },
});

// Get a game by ID
export const get = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.gameId);
  },
});

// Get a game by invite code
export const getByInviteCode = query({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("games")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", args.inviteCode.toUpperCase()))
      .first();
  },
});

// List waiting games shown as lobbies
export const listLobbies = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 50);
    const lobbies = await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .order("desc")
      .take(limit);

    const results = await Promise.all(
      lobbies.map(async (lobby) => {
        const players = await ctx.db
          .query("players")
          .withIndex("by_game", (q) => q.eq("gameId", lobby._id))
          .collect();
        return {
          ...lobby,
          currentPlayers: players.length,
        };
      })
    );

    return results;
  },
});

export const listByHost = query({
  args: {
    hostId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("games")
      .withIndex("by_host", (q) => q.eq("hostId", args.hostId))
      .order("desc")
      .collect();
  },
});

export const update = mutation({
  args: {
    gameId: v.id("games"),
    name: v.optional(v.string()),
    settings: v.optional(gameSettingsValidator),
    mode: v.optional(sessionModeValidator),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    const patch: {
      name?: string;
      settings?: typeof game.settings;
      mode?: typeof game.mode;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      patch.name = args.name;
    }

    if (args.settings !== undefined) {
      patch.settings = args.settings;
    }

    if (args.mode !== undefined) {
      patch.mode = args.mode;
    }

    await ctx.db.patch(args.gameId, patch);
  },
});

export const remove = mutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    const [players, sessions, actions, votes, messages, events, aiTasks] = await Promise.all([
      ctx.db
        .query("players")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
        .collect(),
      ctx.db
        .query("sessions")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
        .collect(),
      ctx.db
        .query("actions")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
        .collect(),
      ctx.db
        .query("votes")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
        .collect(),
      ctx.db
        .query("messages")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
        .collect(),
      ctx.db
        .query("gameEvents")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
        .collect(),
      ctx.db
        .query("aiTasks")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
        .collect(),
    ]);

    for (const doc of [
      ...players,
      ...sessions,
      ...actions,
      ...votes,
      ...messages,
      ...events,
      ...aiTasks,
    ]) {
      await ctx.db.delete(doc._id);
    }
    await ctx.db.delete(args.gameId);
  },
});

// Update game phase
export const updatePhase = mutation({
  args: {
    gameId: v.id("games"),
    phase: gamePhaseValidator,
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.gameId, {
      phase: args.phase,
      updatedAt: now,
    });

    await ctx.db.insert("gameEvents", {
      gameId: args.gameId,
      type: "phase_updated",
      payload: { from: game.phase, to: args.phase },
      round: game.round,
      createdAt: now,
    });
  },
});

// Start the game
export const start = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    if (game.status !== "waiting") throw new Error("Game already started");

    const now = Date.now();
    await ctx.db.patch(args.gameId, {
      status: "in_progress",
      phase: "night",
      round: 1,
      updatedAt: now,
    });

    await ctx.db.insert("gameEvents", {
      gameId: args.gameId,
      type: "game_started",
      payload: {},
      round: 1,
      createdAt: now,
    });
  },
});

// End the game
export const end = mutation({
  args: {
    gameId: v.id("games"),
    winner: winnerValidator,
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.gameId, {
      status: "ended",
      phase: "ended",
      winner: args.winner,
      updatedAt: now,
    });

    await ctx.db.insert("gameEvents", {
      gameId: args.gameId,
      type: "game_ended",
      payload: { winner: args.winner },
      round: game.round,
      createdAt: now,
    });
  },
});

export const setStatus = mutation({
  args: {
    gameId: v.id("games"),
    status: gameStatusValidator,
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }
    await ctx.db.patch(args.gameId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});
