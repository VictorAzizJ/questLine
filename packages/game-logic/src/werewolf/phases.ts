import type { GamePhase, WerewolfGameState, PlayerId } from "@questline/types";
import { checkWinCondition } from "./win-conditions";
import { resolveNightActions } from "./actions";
import { resolveVoting } from "./voting";

/**
 * Gets the next phase in the game
 */
export function getNextPhase(currentPhase: GamePhase): GamePhase {
  switch (currentPhase) {
    case "setup":
      return "night";
    case "night":
      return "day";
    case "day":
      return "voting";
    case "voting":
      return "resolution";
    case "resolution":
      return "night"; // Start new round
    case "ended":
      return "ended";
    default:
      return "setup";
  }
}

/**
 * Checks if the game can transition to the next phase
 */
export function canTransitionPhase(state: WerewolfGameState): {
  canTransition: boolean;
  reason?: string;
} {
  const alivePlayers = state.players.filter((p) => p.isAlive);

  switch (state.phase) {
    case "setup": {
      // Need at least 4 players with roles assigned
      const hasRoles = state.players.every((p) => p.role !== null);
      if (!hasRoles) {
        return { canTransition: false, reason: "Roles not assigned" };
      }
      if (state.players.length < 4) {
        return { canTransition: false, reason: "Need at least 4 players" };
      }
      return { canTransition: true };
    }
    case "night": {
      // All players with night actions must have acted
      const playersWithActions = alivePlayers.filter(
        (p) => p.role === "werewolf" || p.role === "seer" || p.role === "doctor"
      );
      const allActed = playersWithActions.every((p) => p.hasActedThisRound);
      if (!allActed) {
        return { canTransition: false, reason: "Waiting for night actions" };
      }
      return { canTransition: true };
    }
    case "day":
      // Day phase ends when discussion time is over (handled externally)
      return { canTransition: true };

    case "voting": {
      // All alive players must have voted
      const allVoted = alivePlayers.every((p) => p.hasVotedThisRound);
      if (!allVoted) {
        return { canTransition: false, reason: "Waiting for all votes" };
      }
      return { canTransition: true };
    }

    case "resolution":
      // Resolution handles eliminations and checks win conditions
      return { canTransition: true };

    case "ended":
      return { canTransition: false, reason: "Game has ended" };

    default:
      return { canTransition: false, reason: "Unknown phase" };
  }
}

/**
 * Transitions the game to the next phase
 */
export function transitionPhase(state: WerewolfGameState): WerewolfGameState {
  const nextPhase = getNextPhase(state.phase);

  // Check for win condition before transitioning
  const winCondition = checkWinCondition(state.players);
  if (winCondition !== "none") {
    return {
      ...state,
      phase: "ended",
      winner: winCondition,
      updatedAt: Date.now(),
    };
  }

  // Reset round-specific flags when starting new round
  let updatedPlayers = state.players;
  let newRound = state.round;

  if (nextPhase === "night" && state.phase === "resolution") {
    // Starting new round
    newRound = state.round + 1;
    updatedPlayers = state.players.map((p) => ({
      ...p,
      hasActedThisRound: false,
      hasVotedThisRound: false,
    }));
  }

  return {
    ...state,
    phase: nextPhase,
    round: newRound,
    players: updatedPlayers,
    eliminatedToday: null,
    killedTonight: null,
    savedTonight: null,
    updatedAt: Date.now(),
  };
}

/**
 * Advances the game to the next phase, resolving night actions or voting as needed.
 * Use this as the single entry point for phase progression.
 * @param state - Current game state
 * @param hunterRevengeTargetId - When moving from voting to resolution and the eliminated player is Hunter, the target they kill (if any)
 */
export function advanceGameToNextPhase(
  state: WerewolfGameState,
  hunterRevengeTargetId?: PlayerId | null
): WerewolfGameState {
  const { canTransition } = canTransitionPhase(state);
  if (!canTransition) {
    return state;
  }

  if (state.phase === "night") {
    const afterNight = resolveNightActions(state);
    return transitionPhase(afterNight);
  }

  if (state.phase === "voting") {
    const afterVoting = resolveVoting(state, hunterRevengeTargetId);
    return transitionPhase(afterVoting);
  }

  return transitionPhase(state);
}

/**
 * Gets phase display information
 */
export function getPhaseInfo(phase: GamePhase): {
  name: string;
  description: string;
  icon: string;
} {
  switch (phase) {
    case "setup":
      return {
        name: "Setup",
        description: "Waiting for players to join and game to start",
        icon: "⚙️",
      };
    case "night":
      return {
        name: "Night",
        description: "The village sleeps while dark forces act",
        icon: "🌙",
      };
    case "day":
      return {
        name: "Day",
        description: "Discuss and find the werewolves among you",
        icon: "☀️",
      };
    case "voting":
      return {
        name: "Voting",
        description: "Vote to eliminate a suspected werewolf",
        icon: "🗳️",
      };
    case "resolution":
      return {
        name: "Resolution",
        description: "The village decides the fate of the accused",
        icon: "⚖️",
      };
    case "ended":
      return {
        name: "Game Over",
        description: "The game has concluded",
        icon: "🏁",
      };
    default:
      return {
        name: "Unknown",
        description: "Unknown phase",
        icon: "❓",
      };
  }
}
