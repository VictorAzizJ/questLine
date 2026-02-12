import type { WerewolfPlayer } from "@questline/types";

// Token costs for different actions
export const TOKEN_COSTS = {
  vote: 1,
  nightAction: 2,
  specialAbility: 3,
  hint: 1,
} as const;

// Token rewards
export const TOKEN_REWARDS = {
  focusSessionComplete: 3,
  breakComplete: 1,
  surviveRound: 1,
  correctVote: 2, // Voted for a werewolf who was eliminated
} as const;

/**
 * Checks if a player can afford an action
 */
export function canAffordAction(player: WerewolfPlayer, action: keyof typeof TOKEN_COSTS): boolean {
  return player.actionTokens >= TOKEN_COSTS[action];
}

/**
 * Spends tokens for an action
 */
export function spendTokens(
  player: WerewolfPlayer,
  action: keyof typeof TOKEN_COSTS
): WerewolfPlayer {
  const cost = TOKEN_COSTS[action];
  if (player.actionTokens < cost) {
    throw new Error(`Not enough tokens. Need ${cost}, have ${player.actionTokens}`);
  }

  return {
    ...player,
    actionTokens: player.actionTokens - cost,
  };
}

/**
 * Awards tokens to a player
 */
export function awardTokens(
  player: WerewolfPlayer,
  reward: keyof typeof TOKEN_REWARDS
): WerewolfPlayer {
  return {
    ...player,
    actionTokens: player.actionTokens + TOKEN_REWARDS[reward],
  };
}

/**
 * Gets the token balance display
 */
export function getTokenDisplay(tokens: number): string {
  return `🪙 ${tokens}`;
}

/**
 * Calculates tokens earned from a focus session
 * Based on duration and completion status
 */
export function calculateSessionTokens(durationMinutes: number, completed: boolean): number {
  if (!completed) return 0;

  // Base: 1 token per 10 minutes
  const baseTokens = Math.floor(durationMinutes / 10);

  // Bonus for completing full 25-minute pomodoro
  const completionBonus = durationMinutes >= 25 ? 1 : 0;

  return baseTokens + completionBonus + TOKEN_REWARDS.focusSessionComplete;
}
