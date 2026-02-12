import type { Vote, WerewolfGameState, WerewolfPlayer, PlayerId } from "@questline/types";

/**
 * Validates if a player can vote
 */
export function canVote(
  voter: WerewolfPlayer,
  target: WerewolfPlayer | null,
  state: WerewolfGameState
): { valid: boolean; reason?: string } {
  if (!voter.isAlive) {
    return { valid: false, reason: "Dead players cannot vote" };
  }

  if (state.phase !== "voting") {
    return { valid: false, reason: "Voting only during voting phase" };
  }

  if (voter.hasVotedThisRound) {
    return { valid: false, reason: "Already voted this round" };
  }

  if (target && !target.isAlive) {
    return { valid: false, reason: "Cannot vote for dead players" };
  }

  return { valid: true };
}

/**
 * Submits a vote
 */
export function submitVote(
  state: WerewolfGameState,
  voterId: PlayerId,
  targetId: PlayerId | null
): WerewolfGameState {
  const vote: Vote = {
    voterId,
    targetId,
    round: state.round,
    timestamp: Date.now(),
  };

  return {
    ...state,
    votes: [...state.votes, vote],
    players: state.players.map((p) => (p.id === voterId ? { ...p, hasVotedThisRound: true } : p)),
    updatedAt: Date.now(),
  };
}

/**
 * Tallies votes for the current round
 */
export function tallyVotes(state: WerewolfGameState): {
  results: Record<PlayerId, number>;
  abstentions: number;
  leader: PlayerId | null;
  isTie: boolean;
} {
  const currentRoundVotes = state.votes.filter((v) => v.round === state.round);

  const results: Record<PlayerId, number> = {};
  let abstentions = 0;

  for (const vote of currentRoundVotes) {
    if (vote.targetId === null) {
      abstentions++;
    } else {
      results[vote.targetId] = (results[vote.targetId] ?? 0) + 1;
    }
  }

  // Find leader and check for ties
  let maxVotes = 0;
  let leader: PlayerId | null = null;
  let isTie = false;

  for (const [playerId, count] of Object.entries(results)) {
    if (count > maxVotes) {
      maxVotes = count;
      leader = playerId;
      isTie = false;
    } else if (count === maxVotes) {
      isTie = true;
    }
  }

  return { results, abstentions, leader, isTie };
}

/**
 * Resolves the voting phase - eliminates the player with most votes.
 * If the eliminated player is the Hunter, optionally apply Hunter's revenge (kill one target).
 * @param state - Current game state
 * @param hunterRevengeTargetId - When eliminated player is Hunter, the player they take with them (caller must obtain this choice)
 */
export function resolveVoting(
  state: WerewolfGameState,
  hunterRevengeTargetId?: PlayerId | null
): WerewolfGameState {
  const { leader, isTie } = tallyVotes(state);

  // No elimination if tie or no votes
  if (isTie || !leader) {
    return {
      ...state,
      eliminatedToday: null,
      updatedAt: Date.now(),
    };
  }

  // Eliminate the player with most votes
  const eliminatedPlayer = state.players.find((p) => p.id === leader);

  if (!eliminatedPlayer) {
    return {
      ...state,
      eliminatedToday: null,
      updatedAt: Date.now(),
    };
  }

  let updatedPlayers = state.players.map((p) => (p.id === leader ? { ...p, isAlive: false } : p));

  // Hunter's revenge: when Hunter is eliminated, they kill one other player
  if (
    eliminatedPlayer.role === "hunter" &&
    hunterRevengeTargetId &&
    hunterRevengeTargetId !== leader
  ) {
    const revengeTarget = updatedPlayers.find((p) => p.id === hunterRevengeTargetId && p.isAlive);
    if (revengeTarget) {
      updatedPlayers = updatedPlayers.map((p) =>
        p.id === hunterRevengeTargetId ? { ...p, isAlive: false } : p
      );
    }
  }

  return {
    ...state,
    players: updatedPlayers,
    eliminatedToday: leader,
    updatedAt: Date.now(),
  };
}

/**
 * Gets the vote distribution for display
 */
export function getVoteDistribution(state: WerewolfGameState): Array<{
  player: WerewolfPlayer;
  voteCount: number;
  voters: WerewolfPlayer[];
}> {
  const { results } = tallyVotes(state);
  const currentRoundVotes = state.votes.filter((v) => v.round === state.round);

  return state.players
    .filter((p) => p.isAlive)
    .map((player) => {
      const voteCount = results[player.id] ?? 0;
      const voters = currentRoundVotes
        .filter((v) => v.targetId === player.id)
        .map((v) => state.players.find((p) => p.id === v.voterId))
        .filter((p): p is WerewolfPlayer => p !== undefined);

      return { player, voteCount, voters };
    })
    .sort((a, b) => b.voteCount - a.voteCount);
}
