import type { Player, PlayerId } from "./player";

// Game phases
export type GamePhase = "setup" | "night" | "day" | "voting" | "resolution" | "ended";

// Win conditions
export type WinCondition = "villagers" | "werewolves" | "none";

// MVP Roles
export type WerewolfRole = "villager" | "werewolf" | "seer" | "doctor" | "hunter";

// Post-MVP roles (for future expansion)
export type ExtendedRole = WerewolfRole | "witch" | "cupid" | "littleGirl" | "mayor" | "bodyguard";

// Session integration modes
export type SessionMode = "focus-as-night" | "action-reward" | "timed-round";

// Role metadata
export interface RoleInfo {
  id: WerewolfRole;
  name: string;
  team: "village" | "werewolf" | "neutral";
  description: string;
  hasNightAction: boolean;
  actionDescription?: string;
}

// Game settings
export interface WerewolfSettings {
  mode: SessionMode;
  playerCount: number;
  werewolfCount: number;
  includeRoles: WerewolfRole[];
  aiPlayerCount: number;
  aiDifficulty: "easy" | "medium" | "hard";
  focusDuration: number; // minutes
  breakDuration: number; // minutes
  allowChat: boolean;
  revealRolesOnDeath: boolean;
}

// Night action types
export type NightActionType = "kill" | "investigate" | "protect" | "none";

export interface NightAction {
  playerId: PlayerId;
  targetId: PlayerId | null;
  actionType: NightActionType;
  round: number;
  timestamp: number;
}

// Vote
export interface Vote {
  voterId: PlayerId;
  targetId: PlayerId | null; // null = skip/abstain
  round: number;
  timestamp: number;
}

// Game state
export interface WerewolfGameState {
  id: string;
  name: string;
  hostId: string;
  phase: GamePhase;
  round: number;
  mode: SessionMode;
  settings: WerewolfSettings;
  players: WerewolfPlayer[];
  nightActions: NightAction[];
  votes: Vote[];
  eliminatedToday: PlayerId | null;
  killedTonight: PlayerId | null;
  savedTonight: PlayerId | null;
  winner: WinCondition;
  createdAt: number;
  updatedAt: number;
}

// Werewolf-specific player
export interface WerewolfPlayer extends Player {
  role: WerewolfRole | null;
  isAlive: boolean;
  actionTokens: number;
  hasActedThisRound: boolean;
  hasVotedThisRound: boolean;
}

// Game lobby
export interface WerewolfLobby {
  id: string;
  name: string;
  hostId: string;
  inviteCode: string;
  settings: WerewolfSettings;
  players: WerewolfPlayer[];
  status: "waiting" | "starting" | "in_progress";
  createdAt: number;
}

// Role definitions for MVP
export const WEREWOLF_ROLES: Record<WerewolfRole, RoleInfo> = {
  villager: {
    id: "villager",
    name: "Villager",
    team: "village",
    description: "A regular villager with no special abilities. Vote wisely during the day.",
    hasNightAction: false,
  },
  werewolf: {
    id: "werewolf",
    name: "Werewolf",
    team: "werewolf",
    description: "Hunt villagers at night. You know who your fellow werewolves are.",
    hasNightAction: true,
    actionDescription: "Choose a player to eliminate tonight.",
  },
  seer: {
    id: "seer",
    name: "Seer",
    team: "village",
    description: "Each night, you may investigate one player to learn their alignment.",
    hasNightAction: true,
    actionDescription: "Choose a player to investigate.",
  },
  doctor: {
    id: "doctor",
    name: "Doctor",
    team: "village",
    description: "Each night, you may protect one player from being killed.",
    hasNightAction: true,
    actionDescription: "Choose a player to protect tonight.",
  },
  hunter: {
    id: "hunter",
    name: "Hunter",
    team: "village",
    description: "When you die, you may take one other player with you.",
    hasNightAction: false,
    actionDescription: "Choose a player to take with you.",
  },
};
