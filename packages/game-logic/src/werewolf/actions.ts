import type {
  NightAction,
  NightActionType,
  WerewolfGameState,
  WerewolfPlayer,
  PlayerId,
} from "@questline/types";

/**
 * Gets the night action type for a role
 */
export function getNightActionType(role: string | null): NightActionType {
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

/**
 * Validates if a player can perform a night action
 */
export function canPerformNightAction(
  player: WerewolfPlayer,
  target: WerewolfPlayer,
  state: WerewolfGameState
): { valid: boolean; reason?: string } {
  if (!player.isAlive) {
    return { valid: false, reason: "Dead players cannot act" };
  }

  if (!target.isAlive) {
    return { valid: false, reason: "Cannot target dead players" };
  }

  if (state.phase !== "night") {
    return { valid: false, reason: "Night actions only during night phase" };
  }

  if (player.hasActedThisRound) {
    return { valid: false, reason: "Already acted this round" };
  }

  const actionType = getNightActionType(player.role);
  if (actionType === "none") {
    return { valid: false, reason: "This role has no night action" };
  }

  // Role-specific validation
  if (player.role === "werewolf" && target.role === "werewolf") {
    return { valid: false, reason: "Werewolves cannot kill other werewolves" };
  }

  return { valid: true };
}

/**
 * Submits a night action
 */
export function submitNightAction(
  state: WerewolfGameState,
  playerId: PlayerId,
  targetId: PlayerId
): WerewolfGameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error("Player not found");
  }

  const action: NightAction = {
    playerId,
    targetId,
    actionType: getNightActionType(player.role),
    round: state.round,
    timestamp: Date.now(),
  };

  return {
    ...state,
    nightActions: [...state.nightActions, action],
    players: state.players.map((p) => (p.id === playerId ? { ...p, hasActedThisRound: true } : p)),
    updatedAt: Date.now(),
  };
}

/**
 * Resolves all night actions for the current round
 */
export function resolveNightActions(state: WerewolfGameState): WerewolfGameState {
  const currentRoundActions = state.nightActions.filter((a) => a.round === state.round);

  // Find werewolf kill target (majority vote among werewolves)
  const killVotes = currentRoundActions.filter((a) => a.actionType === "kill");
  const killTarget = getMajorityTarget(killVotes);

  // Find doctor protection target
  const protectAction = currentRoundActions.find((a) => a.actionType === "protect");
  const protectedTarget = protectAction?.targetId ?? null;

  // Determine if kill succeeds
  const killSucceeds = killTarget && killTarget !== protectedTarget;

  // Update player states
  let updatedPlayers = state.players;
  let killedPlayerId: PlayerId | null = null;
  let savedPlayerId: PlayerId | null = null;

  if (killTarget) {
    if (killSucceeds) {
      killedPlayerId = killTarget;
      updatedPlayers = updatedPlayers.map((p) =>
        p.id === killTarget ? { ...p, isAlive: false } : p
      );
    } else if (protectedTarget === killTarget) {
      savedPlayerId = killTarget;
    }
  }

  return {
    ...state,
    players: updatedPlayers,
    killedTonight: killedPlayerId,
    savedTonight: savedPlayerId,
    updatedAt: Date.now(),
  };
}

/**
 * Gets the majority target from a list of actions
 */
function getMajorityTarget(actions: NightAction[]): PlayerId | null {
  if (actions.length === 0) return null;

  const votes: Record<PlayerId, number> = {};
  for (const action of actions) {
    if (action.targetId) {
      votes[action.targetId] = (votes[action.targetId] ?? 0) + 1;
    }
  }

  let maxVotes = 0;
  let target: PlayerId | null = null;

  for (const [playerId, count] of Object.entries(votes)) {
    if (count > maxVotes) {
      maxVotes = count;
      target = playerId;
    }
  }

  return target;
}

/**
 * Gets investigation result for seer
 */
export function getInvestigationResult(
  state: WerewolfGameState,
  seerId: PlayerId
): { targetId: PlayerId; isWerewolf: boolean } | null {
  const action = state.nightActions.find(
    (a) => a.playerId === seerId && a.actionType === "investigate" && a.round === state.round
  );

  if (!action || !action.targetId) return null;

  const target = state.players.find((p) => p.id === action.targetId);
  if (!target) return null;

  return {
    targetId: action.targetId,
    isWerewolf: target.role === "werewolf",
  };
}
