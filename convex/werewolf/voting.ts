import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

export const castVote = mutation({
  args: {
    gameId: v.id("games"),
    voterId: v.id("players"),
    targetId: v.optional(v.id("players")),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }
    if (game.phase !== "day" && game.phase !== "voting") {
      throw new Error("Votes are only allowed in day or voting phase");
    }

    const voter = await ctx.db.get(args.voterId);
    if (!voter || voter.gameId !== args.gameId) {
      throw new Error("Voter not in game");
    }
    if (!voter.isAlive) {
      throw new Error("Eliminated players cannot vote");
    }

    const roundVotes = await ctx.db
      .query("votes")
      .withIndex("by_game_and_round", (q) => q.eq("gameId", args.gameId).eq("round", game.round))
      .collect();
    const existing = roundVotes.find((vote) => vote.voterId === args.voterId);

    if (existing) {
      await ctx.db.patch(existing._id, {
        targetId: args.targetId,
        timestamp: Date.now(),
      });
      return existing._id;
    }

    const voteId = await ctx.db.insert("votes", {
      gameId: args.gameId,
      voterId: args.voterId,
      targetId: args.targetId,
      round: game.round,
      timestamp: Date.now(),
    });

    await ctx.db.patch(args.voterId, {
      hasVotedThisRound: true,
    });

    return voteId;
  },
});

export const getRoundVotes = query({
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
      .query("votes")
      .withIndex("by_game_and_round", (q) => q.eq("gameId", args.gameId).eq("round", round))
      .collect();
  },
});

export const tallyVotes = mutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_game_and_round", (q) => q.eq("gameId", args.gameId).eq("round", game.round))
      .collect();

    const counts = new Map<NonNullable<(typeof votes)[number]["targetId"]>, number>();
    for (const vote of votes) {
      if (!vote.targetId) continue;
      counts.set(vote.targetId, (counts.get(vote.targetId) ?? 0) + 1);
    }

    let topTarget: NonNullable<(typeof votes)[number]["targetId"]> | null = null;
    let topCount = 0;
    let tie = false;

    for (const [targetId, count] of counts.entries()) {
      if (count > topCount) {
        topTarget = targetId;
        topCount = count;
        tie = false;
      } else if (count === topCount && topCount > 0) {
        tie = true;
      }
    }

    const eliminatedPlayerId = tie ? null : topTarget;
    if (eliminatedPlayerId) {
      await ctx.db.patch(eliminatedPlayerId, { isAlive: false });
    }

    await ctx.db.insert("gameEvents", {
      gameId: args.gameId,
      type: "votes_tallied",
      payload: {
        round: game.round,
        counts: Object.fromEntries(counts.entries()),
        eliminatedPlayerId,
        tie,
      },
      round: game.round,
      createdAt: Date.now(),
    });

    return {
      round: game.round,
      counts: Object.fromEntries(counts.entries()),
      eliminatedPlayerId,
      tie,
    };
  },
});
