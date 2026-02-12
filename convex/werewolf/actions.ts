import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { actionTypeValidator } from "../lib/game";

export const submitNightAction = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
    targetId: v.optional(v.id("players")),
    actionType: actionTypeValidator,
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }
    if (game.phase !== "night") {
      throw new Error("Night actions are only allowed during the night phase");
    }

    const player = await ctx.db.get(args.playerId);
    if (!player || player.gameId !== args.gameId) {
      throw new Error("Player not found in game");
    }
    if (!player.isAlive) {
      throw new Error("Eliminated players cannot act");
    }

    const existingActions = await ctx.db
      .query("actions")
      .withIndex("by_game_and_round", (q) => q.eq("gameId", args.gameId).eq("round", game.round))
      .collect();
    const previousAction = existingActions.find((action) => action.playerId === args.playerId);

    if (previousAction) {
      await ctx.db.patch(previousAction._id, {
        targetId: args.targetId,
        actionType: args.actionType,
        timestamp: Date.now(),
      });
      return previousAction._id;
    }

    const actionId = await ctx.db.insert("actions", {
      gameId: args.gameId,
      playerId: args.playerId,
      targetId: args.targetId,
      actionType: args.actionType,
      round: game.round,
      timestamp: Date.now(),
    });

    await ctx.db.patch(args.playerId, {
      hasActedThisRound: true,
    });

    return actionId;
  },
});

export const getRoundActions = query({
  args: {
    gameId: v.id("games"),
    round: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      return [];
    }
    const round = args.round ?? game.round;
    return await ctx.db
      .query("actions")
      .withIndex("by_game_and_round", (q) => q.eq("gameId", args.gameId).eq("round", round))
      .collect();
  },
});

export const resolveNightActions = mutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    const actions = await ctx.db
      .query("actions")
      .withIndex("by_game_and_round", (q) => q.eq("gameId", args.gameId).eq("round", game.round))
      .collect();

    const killTargets = actions.filter((action) => action.actionType === "kill" && action.targetId);
    const protectTargets = new Set(
      actions
        .filter((action) => action.actionType === "protect" && action.targetId)
        .map((action) => action.targetId)
    );

    const killCounts = new Map<NonNullable<(typeof actions)[number]["targetId"]>, number>();
    for (const action of killTargets) {
      if (!action.targetId) continue;
      const current = killCounts.get(action.targetId) ?? 0;
      killCounts.set(action.targetId, current + 1);
    }

    let eliminatedPlayerId: NonNullable<(typeof actions)[number]["targetId"]> | null = null;
    let maxVotes = 0;
    for (const [targetId, count] of killCounts.entries()) {
      if (count > maxVotes) {
        maxVotes = count;
        eliminatedPlayerId = targetId;
      }
    }

    if (eliminatedPlayerId && protectTargets.has(eliminatedPlayerId)) {
      eliminatedPlayerId = null;
    }

    if (eliminatedPlayerId) {
      await ctx.db.patch(eliminatedPlayerId, { isAlive: false });
    }

    const now = Date.now();
    await ctx.db.insert("gameEvents", {
      gameId: args.gameId,
      type: "night_resolved",
      payload: {
        round: game.round,
        eliminatedPlayerId,
      },
      round: game.round,
      createdAt: now,
    });

    return {
      round: game.round,
      eliminatedPlayerId,
      protectedTargets: [...protectTargets],
      actionsProcessed: actions.length,
    };
  },
});
