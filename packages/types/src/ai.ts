import type { PlayerId } from "./player";
import type { WerewolfRole, GamePhase } from "./werewolf";

// AI model types
export type AIModel =
  | "llama-3.1-8b-instant"
  | "llama-3.1-70b-versatile"
  | "mixtral-8x7b-32768"
  | "gemma-7b-it";

// AI task types
export type AITaskType = "narration" | "player_decision" | "hint";

// AI request for OpenRouter
export interface AIRequest {
  model: AIModel;
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  taskType: AITaskType;
}

// AI message format
export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// AI response
export interface AIResponse {
  content: string;
  model: string;
  tokensUsed: number;
  finishReason: "stop" | "length" | "error";
}

// Narration context
export interface NarrationContext {
  phase: GamePhase;
  round: number;
  event:
    | "game_start"
    | "night_start"
    | "night_end"
    | "day_start"
    | "voting_start"
    | "elimination"
    | "no_elimination"
    | "game_end";
  targetName?: string;
  eliminatedName?: string;
  winningTeam?: "villagers" | "werewolves";
  aliveCount?: number;
  werewolfCount?: number;
}

// AI player decision context
export interface AIPlayerContext {
  playerId: PlayerId;
  role: WerewolfRole;
  difficulty: "easy" | "medium" | "hard";
  phase: GamePhase;
  round: number;
  alivePlayers: Array<{
    id: PlayerId;
    name: string;
    isAlive: boolean;
  }>;
  knownWerewolves?: PlayerId[]; // For werewolf role
  investigationResults?: Array<{
    playerId: PlayerId;
    isWerewolf: boolean;
  }>; // For seer role
  suspicionLevels?: Record<PlayerId, number>; // 0-100 suspicion score
  previousVotes?: Array<{
    round: number;
    votes: Record<PlayerId, PlayerId>;
  }>;
}

// AI decision types
export interface AIKillDecision {
  type: "kill";
  targetId: PlayerId;
  reasoning: string;
}

export interface AIInvestigateDecision {
  type: "investigate";
  targetId: PlayerId;
  reasoning: string;
}

export interface AIProtectDecision {
  type: "protect";
  targetId: PlayerId;
  reasoning: string;
}

export interface AIVoteDecision {
  type: "vote";
  targetId: PlayerId | null; // null for abstain
  reasoning: string;
}

export type AIDecision =
  | AIKillDecision
  | AIInvestigateDecision
  | AIProtectDecision
  | AIVoteDecision;

// Model routing configuration
export const AI_MODEL_CONFIG: Record<AITaskType, AIModel> = {
  narration: "llama-3.1-8b-instant",
  player_decision: "mixtral-8x7b-32768",
  hint: "llama-3.1-8b-instant",
};

// Default AI parameters
export const AI_DEFAULTS = {
  narration: {
    maxTokens: 200,
    temperature: 0.8,
  },
  player_decision: {
    maxTokens: 150,
    temperature: 0.4,
  },
  hint: {
    maxTokens: 100,
    temperature: 0.6,
  },
} as const;
