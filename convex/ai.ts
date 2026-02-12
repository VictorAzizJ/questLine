import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// ─── Validators ──────────────────────────────────────────────────────

const aiTaskTypeValidator = v.union(
  v.literal("narration"),
  v.literal("player_decision"),
  v.literal("hint")
);

const aiTaskStatusValidator = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed")
);

const defaultModelByTask: Record<"narration" | "player_decision" | "hint", string> = {
  narration: "llama-3.1-8b-instant",
  player_decision: "mixtral-8x7b-32768",
  hint: "llama-3.1-8b-instant",
};

// ═══════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════

/**
 * Queue an AI task. When `autoProcess` is true (default) the task is
 * automatically scheduled for processing via the AI engine action.
 */
export const queueTask = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.optional(v.id("players")),
    taskType: aiTaskTypeValidator,
    model: v.optional(v.string()),
    payload: v.any(),
    autoProcess: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    const now = Date.now();
    const taskId = await ctx.db.insert("aiTasks", {
      gameId: args.gameId,
      playerId: args.playerId,
      taskType: args.taskType,
      status: "queued",
      model: args.model ?? defaultModelByTask[args.taskType],
      payload: args.payload,
      createdAt: now,
    });

    await ctx.db.insert("gameEvents", {
      gameId: args.gameId,
      type: "ai_task_queued",
      payload: {
        taskId,
        taskType: args.taskType,
      },
      round: game.round,
      createdAt: now,
    });

    // Schedule automatic processing (opt-out with autoProcess: false)
    if (args.autoProcess !== false) {
      await ctx.scheduler.runAfter(0, internal.aiEngine.processTask, {
        taskId,
      });
    }

    return taskId;
  },
});

export const listTasksForGame = query({
  args: {
    gameId: v.id("games"),
    status: v.optional(aiTaskStatusValidator),
  },
  handler: async (ctx, args) => {
    const status = args.status;
    if (status !== undefined) {
      return await ctx.db
        .query("aiTasks")
        .withIndex("by_game_and_status", (q) => q.eq("gameId", args.gameId).eq("status", status))
        .order("desc")
        .collect();
    }

    return await ctx.db
      .query("aiTasks")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .order("desc")
      .collect();
  },
});

export const getTask = query({
  args: {
    taskId: v.id("aiTasks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.taskId);
  },
});

/**
 * Synchronous stub processor — kept for backward compatibility.
 * Prefer the async AI engine (`aiEngine.processTask`) for real processing.
 */
export const processTask = mutation({
  args: {
    taskId: v.id("aiTasks"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("AI task not found");
    }
    if (task.status !== "queued") {
      return task;
    }

    // Delegate to the async AI engine action
    await ctx.scheduler.runAfter(0, internal.aiEngine.processTask, {
      taskId: args.taskId,
    });

    return await ctx.db.get(args.taskId);
  },
});

export const listAlivePlayers = query({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();
    return players.filter((player) => player.isAlive);
  },
});

// ═══════════════════════════════════════════════════════════════════════
// INTERNAL QUERIES  (used by aiEngine actions)
// ═══════════════════════════════════════════════════════════════════════

/** Read a single AI task by ID (internal). */
export const getTaskInternal = internalQuery({
  args: { taskId: v.id("aiTasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.taskId);
  },
});

/**
 * Build the full game context needed for an AI player decision.
 * Includes: game state, the player, alive players, known allies,
 * seer investigation history, and recent messages.
 */
export const getGameContext = internalQuery({
  args: {
    gameId: v.id("games"),
    playerId: v.optional(v.id("players")),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) return null;

    const allPlayers = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    const alivePlayers = allPlayers.filter((p) => p.isAlive);
    const player = args.playerId ? (allPlayers.find((p) => p._id === args.playerId) ?? null) : null;

    // ── Werewolf: list of allied werewolves ──
    let knownWerewolves: typeof allPlayers | undefined;
    if (player?.role === "werewolf") {
      knownWerewolves = allPlayers.filter(
        (p) => p.role === "werewolf" && p._id !== player._id && p.isAlive
      );
    }

    // ── Seer: investigation results from past rounds ──
    let investigationResults:
      | Array<{ playerId: string; playerName: string; isWerewolf: boolean }>
      | undefined;

    if (player?.role === "seer") {
      const allActions = await ctx.db
        .query("actions")
        .withIndex("by_player", (q) => q.eq("playerId", player._id))
        .collect();

      const investigations = allActions.filter((a) => a.actionType === "investigate" && a.targetId);

      investigationResults = [];
      for (const inv of investigations) {
        if (!inv.targetId) continue;
        const target = allPlayers.find((p) => p._id === inv.targetId);
        if (target) {
          investigationResults.push({
            playerId: target._id,
            playerName: target.name,
            isWerewolf: target.role === "werewolf",
          });
        }
      }
    }

    // ── Recent chat messages (last 10) ──
    const recentMessages = await ctx.db
      .query("messages")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .order("desc")
      .take(10);

    // ── Previously eliminated players ──
    const deadPlayers = allPlayers.filter((p) => !p.isAlive).map((p) => p.name);

    return {
      game,
      player,
      alivePlayers,
      allPlayers,
      knownWerewolves,
      investigationResults,
      recentMessages: recentMessages.reverse(),
      deadPlayers,
    };
  },
});

/**
 * Lightweight game info for narration context.
 * Includes player counts and the most-recently eliminated player name.
 */
export const getGameInfo = internalQuery({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) return null;

    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    const alivePlayers = players.filter((p) => p.isAlive);
    const werewolves = alivePlayers.filter((p) => p.role === "werewolf");

    // Find the most recently eliminated player via game events
    const recentEvents = await ctx.db
      .query("gameEvents")
      .withIndex("by_game_and_time", (q) => q.eq("gameId", args.gameId))
      .order("desc")
      .take(10);

    let lastEliminatedName: string | undefined;
    for (const event of recentEvents) {
      const payload = event.payload as Record<string, unknown> | null;
      if (
        (event.type === "night_resolved" || event.type === "votes_tallied") &&
        payload?.eliminatedPlayerId
      ) {
        const eliminated = players.find((p) => p._id === payload.eliminatedPlayerId);
        lastEliminatedName = eliminated?.name;
        break;
      }
    }

    return {
      game,
      playerNames: players.map((p) => p.name),
      aliveCount: alivePlayers.length,
      werewolfCount: werewolves.length,
      deadPlayers: players.filter((p) => !p.isAlive).map((p) => p.name),
      lastEliminatedName,
      winner: game.winner,
      round: game.round,
    };
  },
});

/**
 * Return AI players that should act in the given phase.
 * - Night: only roles with night actions (werewolf, seer, doctor).
 * - Day / Voting: all alive AI players.
 */
export const getAIPlayersForPhase = internalQuery({
  args: {
    gameId: v.id("games"),
    phase: v.string(),
  },
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    const aiAlive = players.filter((p) => p.isAI && p.isAlive);

    if (args.phase === "night") {
      return aiAlive.filter(
        (p) => p.role === "werewolf" || p.role === "seer" || p.role === "doctor"
      );
    }

    return aiAlive;
  },
});

// ═══════════════════════════════════════════════════════════════════════
// INTERNAL MUTATIONS  (used by aiEngine actions)
// ═══════════════════════════════════════════════════════════════════════

/** Mark a task as "running". */
export const updateTaskStatus = internalMutation({
  args: {
    taskId: v.id("aiTasks"),
    status: v.union(v.literal("running"), v.literal("queued")),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { status: args.status };
    if (args.status === "running") {
      patch.startedAt = Date.now();
    }
    await ctx.db.patch(args.taskId, patch);
  },
});

/** Mark a task as "completed", save result, and publish events. */
export const completeTask = internalMutation({
  args: {
    taskId: v.id("aiTasks"),
    gameId: v.id("games"),
    taskType: v.string(),
    result: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.taskId, {
      status: "completed" as const,
      result: args.result,
      completedAt: now,
      error: undefined,
    });

    await ctx.db.insert("gameEvents", {
      gameId: args.gameId,
      type: "ai_task_completed",
      payload: { taskId: args.taskId, taskType: args.taskType },
      createdAt: now,
    });

    // Narration results become game messages visible to all players
    if (args.taskType === "narration" && args.result?.content) {
      await ctx.db.insert("messages", {
        gameId: args.gameId,
        senderId: undefined,
        content: String(args.result.content),
        type: "narration",
        visibility: "all",
        recipientId: undefined,
        timestamp: now,
      });
    }
  },
});

/** Mark a task as "failed" and publish an error event. */
export const failTask = internalMutation({
  args: {
    taskId: v.id("aiTasks"),
    gameId: v.id("games"),
    taskType: v.string(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.taskId, {
      status: "failed" as const,
      error: args.error,
      completedAt: now,
    });

    await ctx.db.insert("gameEvents", {
      gameId: args.gameId,
      type: "ai_task_failed",
      payload: {
        taskId: args.taskId,
        taskType: args.taskType,
        error: args.error,
      },
      createdAt: now,
    });
  },
});

/** Queue a task without publishing to the public API (internal use). */
export const queueTaskInternal = internalMutation({
  args: {
    gameId: v.id("games"),
    playerId: v.optional(v.id("players")),
    taskType: aiTaskTypeValidator,
    model: v.optional(v.string()),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const taskId = await ctx.db.insert("aiTasks", {
      gameId: args.gameId,
      playerId: args.playerId,
      taskType: args.taskType,
      status: "queued",
      model: args.model ?? defaultModelByTask[args.taskType],
      payload: args.payload,
      createdAt: Date.now(),
    });
    return taskId;
  },
});
