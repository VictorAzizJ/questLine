import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";

const orderedPhases = ["setup", "night", "day", "voting", "resolution", "ended"] as const;

function getNextPhase(currentPhase: (typeof orderedPhases)[number]) {
  const index = orderedPhases.indexOf(currentPhase);
  if (index === -1 || index === orderedPhases.length - 1) {
    return currentPhase;
  }
  return orderedPhases[index + 1];
}

export const advancePhase = mutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }
    if (game.phase === "ended") {
      return { phase: game.phase, round: game.round };
    }

    const nextPhase = getNextPhase(game.phase);
    const round = nextPhase === "night" ? game.round + 1 : game.round;
    const now = Date.now();

    await ctx.db.patch(args.gameId, {
      phase: nextPhase,
      round,
      updatedAt: now,
    });

    if (nextPhase === "night" || nextPhase === "day") {
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
    }

    await ctx.db.insert("gameEvents", {
      gameId: args.gameId,
      type: "phase_advanced",
      payload: {
        from: game.phase,
        to: nextPhase,
      },
      round,
      createdAt: now,
    });

    // Schedule AI orchestration (narration + AI player actions)
    await ctx.scheduler.runAfter(0, internal.aiEngine.onPhaseAdvance, {
      gameId: args.gameId,
      phase: nextPhase,
      round,
    });

    return { phase: nextPhase, round };
  },
});
