"use node";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import {
  buildNarrationSystemPrompt,
  buildNarrationUserPrompt,
  buildDecisionSystemPrompt,
  buildNightActionPrompt,
  buildVotingPrompt,
  buildHintSystemPrompt,
  buildHintUserPrompt,
  getFallbackNarration,
  FALLBACK_HINTS,
} from "./lib/aiPrompts";
import type { AIPlayerPromptContext } from "./lib/aiPrompts";
import { parseAIDecision, validateTargetId, fallbackDecision } from "./lib/aiDecisions";
import type { GenericActionCtx } from "convex/server";
import type { DataModel } from "./_generated/dataModel";

// ─── Constants ───────────────────────────────────────────────────────

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const MODEL_DEFAULTS: Record<string, { maxTokens: number; temperature: number }> = {
  narration: { maxTokens: 200, temperature: 0.8 },
  player_decision: { maxTokens: 150, temperature: 0.4 },
  hint: { maxTokens: 100, temperature: 0.6 },
};

type ActionCtx = GenericActionCtx<DataModel>;

// ─── OpenRouter HTTP Client ──────────────────────────────────────────

interface OpenRouterResponse {
  content: string;
  model: string;
  tokensUsed: number;
  finishReason: string;
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options: { maxTokens?: number; temperature?: number }
): Promise<OpenRouterResponse> {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://questline.app",
      "X-Title": "questLine - Werewolf Pomodoro",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.maxTokens ?? 200,
      temperature: options.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
    model?: string;
    usage?: { total_tokens?: number };
  };
  const choice = data.choices?.[0];

  return {
    content: choice?.message?.content ?? "",
    model: data.model ?? model,
    tokensUsed: data.usage?.total_tokens ?? 0,
    finishReason: choice?.finish_reason ?? "unknown",
  };
}

// ═══════════════════════════════════════════════════════════════════════
// PROCESS A SINGLE AI TASK
// ═══════════════════════════════════════════════════════════════════════

/**
 * Internal action that processes one queued AI task:
 *   1. Marks the task as "running"
 *   2. Calls OpenRouter (or uses fallback if no API key)
 *   3. Marks the task as "completed" / "failed"
 */
export const processTask = internalAction({
  args: { taskId: v.id("aiTasks") },
  handler: async (ctx, args) => {
    const task = await ctx.runQuery(internal.ai.getTaskInternal, {
      taskId: args.taskId,
    });

    if (!task || task.status !== "queued") {
      return;
    }

    // Mark as running
    await ctx.runMutation(internal.ai.updateTaskStatus, {
      taskId: args.taskId,
      status: "running",
    });

    const apiKey = process.env.OPENROUTER_API_KEY;

    try {
      let result: Record<string, unknown>;

      if (apiKey) {
        result = await processWithOpenRouter(ctx, apiKey, task);
      } else {
        result = await processWithFallback(ctx, task);
      }

      await ctx.runMutation(internal.ai.completeTask, {
        taskId: args.taskId,
        gameId: task.gameId,
        taskType: task.taskType,
        result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI processing failed";

      // On API error, attempt fallback before marking as failed
      try {
        const fallbackResult = await processWithFallback(ctx, task);
        await ctx.runMutation(internal.ai.completeTask, {
          taskId: args.taskId,
          gameId: task.gameId,
          taskType: task.taskType,
          result: { ...fallbackResult, fallbackReason: message },
        });
      } catch (fbError) {
        const fbMsg = fbError instanceof Error ? fbError.message : "Fallback also failed";
        await ctx.runMutation(internal.ai.failTask, {
          taskId: args.taskId,
          gameId: task.gameId,
          taskType: task.taskType,
          error: `${message} | fallback: ${fbMsg}`,
        });
      }
    }
  },
});

// ─── OpenRouter Processing ───────────────────────────────────────────

async function processWithOpenRouter(
  ctx: ActionCtx,
  apiKey: string,
  task: { taskType: string; model: string; payload: unknown; gameId: string; playerId?: string }
): Promise<Record<string, unknown>> {
  const defaults = MODEL_DEFAULTS[task.taskType] ?? MODEL_DEFAULTS.narration;

  switch (task.taskType) {
    case "narration":
      return processNarration(apiKey, task, defaults);
    case "player_decision":
      return processPlayerDecision(ctx, apiKey, task, defaults);
    case "hint":
      return processHint(apiKey, task, defaults);
    default:
      throw new Error(`Unknown task type: ${task.taskType}`);
  }
}

async function processNarration(
  apiKey: string,
  task: { model: string; payload: unknown },
  defaults: { maxTokens: number; temperature: number }
): Promise<Record<string, unknown>> {
  const payload = (task.payload ?? {}) as Record<string, unknown>;

  const response = await callOpenRouter(
    apiKey,
    task.model,
    [
      { role: "system", content: buildNarrationSystemPrompt() },
      {
        role: "user",
        content: buildNarrationUserPrompt({
          phase: String(payload.phase ?? "night"),
          round: Number(payload.round ?? 1),
          event: String(payload.event ?? "night_start"),
          playerNames: (payload.playerNames as string[]) ?? [],
          aliveCount: Number(payload.aliveCount ?? 0),
          werewolfCount: Number(payload.werewolfCount ?? 0),
          eliminatedName: payload.eliminatedName as string | undefined,
          winningTeam: payload.winningTeam as string | undefined,
        }),
      },
    ],
    defaults
  );

  return {
    content: response.content,
    model: response.model,
    tokensUsed: response.tokensUsed,
    source: "openrouter",
  };
}

async function processPlayerDecision(
  ctx: ActionCtx,
  apiKey: string,
  task: { model: string; payload: unknown; gameId: string; playerId?: string },
  defaults: { maxTokens: number; temperature: number }
): Promise<Record<string, unknown>> {
  const gameContext = (await ctx.runQuery(internal.ai.getGameContext, {
    gameId: task.gameId as any,
    playerId: task.playerId as any,
  })) as any;

  if (!gameContext) {
    throw new Error("Could not build game context for AI decision");
  }

  const { player, game, alivePlayers, knownWerewolves, investigationResults, recentMessages } =
    gameContext;

  const role: string = player?.role ?? "villager";
  const difficulty: "easy" | "medium" | "hard" =
    player?.aiDifficulty ?? game.settings.aiDifficulty ?? "medium";
  const phase: string = game.phase;

  const promptCtx: AIPlayerPromptContext = {
    playerName: player.name,
    role,
    difficulty,
    phase,
    round: game.round,
    alivePlayers: alivePlayers.map((p: { name: string; _id: string }) => ({
      name: p.name,
      id: p._id,
    })),
    knownWerewolves: knownWerewolves?.map((w: { name: string }) => w.name),
    investigationResults: investigationResults?.map(
      (r: { playerName: string; isWerewolf: boolean }) => ({
        playerName: r.playerName,
        isWerewolf: r.isWerewolf,
      })
    ),
    recentMessages: recentMessages?.map((m: { content: string }) => m.content),
    previousEliminations: gameContext.deadPlayers,
  };

  const systemPrompt = buildDecisionSystemPrompt(role, difficulty);
  const userPrompt =
    phase === "night" ? buildNightActionPrompt(promptCtx) : buildVotingPrompt(promptCtx);

  const response = await callOpenRouter(
    apiKey,
    task.model,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    defaults
  );

  // Parse the AI response into a structured decision
  const parsed = parseAIDecision(response.content);
  const validTargetIds: string[] = alivePlayers
    .filter((p: { _id: string }) => p._id !== task.playerId)
    .map((p: { _id: string }) => p._id);

  let targetId: string | null = null;
  let reasoning = "AI decision";

  if (parsed) {
    targetId = validateTargetId(parsed.targetId, validTargetIds);
    reasoning = parsed.reasoning;

    // Parsed but target was invalid → use fallback for target only
    if (parsed.targetId && !targetId) {
      const fb = makeFallback(role, phase, alivePlayers, task, {
        difficulty,
        knownWerewolves,
        investigationResults,
      });
      targetId = fb.targetId;
      reasoning = `${reasoning} (target corrected: ${fb.reasoning})`;
    }
  } else {
    // Complete parse failure → full fallback
    const fb = makeFallback(role, phase, alivePlayers, task, {
      difficulty,
      knownWerewolves,
      investigationResults,
    });
    targetId = fb.targetId;
    reasoning = `Fallback: ${fb.reasoning}`;
  }

  return {
    decision: { targetId },
    reasoning,
    model: response.model,
    tokensUsed: response.tokensUsed,
    source: "openrouter",
    rawResponse: response.content,
  };
}

async function processHint(
  apiKey: string,
  task: { model: string; payload: unknown },
  defaults: { maxTokens: number; temperature: number }
): Promise<Record<string, unknown>> {
  const payload = (task.payload ?? {}) as Record<string, unknown>;

  const response = await callOpenRouter(
    apiKey,
    task.model,
    [
      { role: "system", content: buildHintSystemPrompt() },
      {
        role: "user",
        content: buildHintUserPrompt({
          role: String(payload.role ?? "villager"),
          phase: String(payload.phase ?? "night"),
          round: Number(payload.round ?? 1),
          aliveCount: Number(payload.aliveCount ?? 0),
        }),
      },
    ],
    defaults
  );

  return {
    content: response.content,
    model: response.model,
    tokensUsed: response.tokensUsed,
    source: "openrouter",
  };
}

// ─── Fallback Processing ─────────────────────────────────────────────

async function processWithFallback(
  ctx: ActionCtx,
  task: { taskType: string; model: string; payload: unknown; gameId: string; playerId?: string }
): Promise<Record<string, unknown>> {
  if (task.taskType === "narration") {
    const payload = (task.payload ?? {}) as Record<string, unknown>;
    return {
      content: getFallbackNarration(String(payload.event ?? "night_start"), {
        round: payload.round as number | undefined,
        eliminatedName: payload.eliminatedName as string | undefined,
        winningTeam: payload.winningTeam as string | undefined,
      }),
      model: task.model,
      source: "fallback",
    };
  }

  if (task.taskType === "hint") {
    return {
      content: FALLBACK_HINTS[Math.floor(Math.random() * FALLBACK_HINTS.length)],
      model: task.model,
      source: "fallback",
    };
  }

  // player_decision fallback
  const gameContext = (await ctx.runQuery(internal.ai.getGameContext, {
    gameId: task.gameId as any,
    playerId: task.playerId as any,
  })) as any;

  if (!gameContext) {
    return {
      decision: { targetId: null },
      reasoning: "No game context available",
      model: task.model,
      source: "fallback",
    };
  }

  const { player, game, alivePlayers, knownWerewolves, investigationResults } = gameContext;
  const role: string = player?.role ?? "villager";
  const difficulty: "easy" | "medium" | "hard" = player?.aiDifficulty ?? "medium";

  const fb = makeFallback(role, game.phase, alivePlayers, task, {
    difficulty,
    knownWerewolves,
    investigationResults,
  });

  return {
    decision: { targetId: fb.targetId },
    reasoning: fb.reasoning,
    model: task.model,
    source: "fallback",
  };
}

// ─── Helper: build fallback from alive players ───────────────────────

function makeFallback(
  role: string,
  phase: string,
  alivePlayers: any[],
  task: { playerId?: string },
  opts: {
    difficulty: "easy" | "medium" | "hard";
    knownWerewolves?: any[];
    investigationResults?: Array<{ playerId: string; isWerewolf: boolean }>;
  }
) {
  const candidates = alivePlayers
    .filter((p: { _id: string }) => p._id !== task.playerId)
    .map((p: { _id: string; name: string }) => ({ id: p._id, name: p.name }));

  return fallbackDecision(role, phase, candidates, {
    difficulty: opts.difficulty,
    knownWerewolves: opts.knownWerewolves?.map((w: { _id: string }) => w._id),
    investigationResults: opts.investigationResults?.map((r) => ({
      playerId: r.playerId,
      isWerewolf: r.isWerewolf,
    })),
    selfId: task.playerId,
  });
}

// ═══════════════════════════════════════════════════════════════════════
// AI ORCHESTRATOR  (triggered on phase transitions)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Called after a phase advance. Generates narration for the new phase
 * and triggers AI player actions (night actions or votes).
 */
export const onPhaseAdvance = internalAction({
  args: {
    gameId: v.id("games"),
    phase: v.string(),
    round: v.number(),
  },
  handler: async (ctx, args) => {
    const { gameId, phase, round } = args;

    // Fetch lightweight game info for narration
    const gameInfo = (await ctx.runQuery(internal.ai.getGameInfo, {
      gameId: gameId as any,
    })) as any;
    if (!gameInfo) return;

    // 1. Generate narration for the new phase
    const narrationEvent = mapPhaseToNarrationEvent(phase, round, gameInfo);
    if (narrationEvent) {
      try {
        const narrationTaskId = await ctx.runMutation(internal.ai.queueTaskInternal, {
          gameId: gameId as any,
          taskType: "narration" as const,
          payload: {
            phase,
            round,
            event: narrationEvent,
            playerNames: gameInfo.playerNames,
            aliveCount: gameInfo.aliveCount,
            werewolfCount: gameInfo.werewolfCount,
            eliminatedName: gameInfo.lastEliminatedName,
            winningTeam: gameInfo.winner,
          },
        });
        await ctx.runAction(internal.aiEngine.processTask, { taskId: narrationTaskId });
      } catch (err) {
        console.error("Failed to generate narration:", err);
      }
    }

    // 2. Trigger AI player actions
    if (phase === "night") {
      await triggerAINightActions(ctx, gameId, round);
    } else if (phase === "day" || phase === "voting") {
      await triggerAIVotes(ctx, gameId);
    }
  },
});

// ─── Night Actions for AI Players ────────────────────────────────────

async function triggerAINightActions(ctx: ActionCtx, gameId: string, round: number) {
  const aiPlayers = (await ctx.runQuery(internal.ai.getAIPlayersForPhase, {
    gameId: gameId as any,
    phase: "night",
  })) as any[];

  for (const player of aiPlayers) {
    try {
      // Queue and process the decision
      const taskId = await ctx.runMutation(internal.ai.queueTaskInternal, {
        gameId: gameId as any,
        playerId: player._id,
        taskType: "player_decision" as const,
        payload: { phase: "night", round, role: player.role },
      });

      await ctx.runAction(internal.aiEngine.processTask, { taskId });

      // Read the completed result
      const completedTask = (await ctx.runQuery(internal.ai.getTaskInternal, {
        taskId,
      })) as any;

      if (completedTask?.status !== "completed") continue;

      const targetId = completedTask.result?.decision?.targetId;
      const actionType = getActionTypeForRole(player.role);

      if (actionType === "none" || !targetId) continue;

      // Submit the night action via the existing public mutation
      await ctx.runMutation(api.werewolf.actions.submitNightAction, {
        gameId: gameId as any,
        playerId: player._id,
        targetId,
        actionType: actionType as any,
      });
    } catch (err) {
      console.error(`AI night action failed for ${player.name}:`, err);
    }
  }
}

// ─── Voting for AI Players ───────────────────────────────────────────

async function triggerAIVotes(ctx: ActionCtx, gameId: string) {
  const aiPlayers = (await ctx.runQuery(internal.ai.getAIPlayersForPhase, {
    gameId: gameId as any,
    phase: "voting",
  })) as any[];

  for (const player of aiPlayers) {
    try {
      const game = (await ctx.runQuery(internal.ai.getGameInfo, {
        gameId: gameId as any,
      })) as any;
      const round = game?.round ?? 1;

      const taskId = await ctx.runMutation(internal.ai.queueTaskInternal, {
        gameId: gameId as any,
        playerId: player._id,
        taskType: "player_decision" as const,
        payload: { phase: "voting", round, role: player.role },
      });

      await ctx.runAction(internal.aiEngine.processTask, { taskId });

      const completedTask = (await ctx.runQuery(internal.ai.getTaskInternal, {
        taskId,
      })) as any;

      if (completedTask?.status !== "completed") continue;

      const targetId = completedTask.result?.decision?.targetId ?? undefined;

      await ctx.runMutation(api.werewolf.voting.castVote, {
        gameId: gameId as any,
        voterId: player._id,
        targetId,
      });
    } catch (err) {
      console.error(`AI vote failed for ${player.name}:`, err);
    }
  }
}

// ─── Mapping Helpers ─────────────────────────────────────────────────

function mapPhaseToNarrationEvent(phase: string, round: number, gameInfo: any): string | null {
  switch (phase) {
    case "night":
      return round <= 1 ? "game_start" : "night_start";
    case "day":
      return gameInfo.lastEliminatedName ? "night_end" : "night_end";
    case "voting":
      return "voting_start";
    case "resolution":
      return gameInfo.lastEliminatedName ? "elimination" : "no_elimination";
    case "ended":
      return "game_end";
    default:
      return null;
  }
}

function getActionTypeForRole(role: string | undefined): string {
  switch (role) {
    case "werewolf":
      return "kill";
    case "seer":
      return "investigate";
    case "doctor":
      return "protect";
    default:
      return "none";
  }
}
