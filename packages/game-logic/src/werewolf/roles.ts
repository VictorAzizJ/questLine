import type { WerewolfRole, WerewolfSettings, WerewolfPlayer } from "@questline/types";

/**
 * Shuffles an array using Fisher-Yates algorithm
 */
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generates a role distribution based on game settings
 */
export function generateRoleDistribution(settings: WerewolfSettings): WerewolfRole[] {
  const { playerCount, werewolfCount, includeRoles } = settings;
  const roles: WerewolfRole[] = [];

  // Add werewolves
  for (let i = 0; i < werewolfCount; i++) {
    roles.push("werewolf");
  }

  // Add special roles from includeRoles (excluding werewolf and villager)
  const specialRoles = includeRoles.filter((role) => role !== "werewolf" && role !== "villager");

  for (const role of specialRoles) {
    if (roles.length < playerCount) {
      roles.push(role);
    }
  }

  // Fill remaining slots with villagers
  while (roles.length < playerCount) {
    roles.push("villager");
  }

  return shuffle(roles);
}

/**
 * Assigns roles to players
 */
export function assignRoles(
  players: WerewolfPlayer[],
  settings: WerewolfSettings
): WerewolfPlayer[] {
  const roles = generateRoleDistribution(settings);

  const initialTokens = getInitialTokensForSettings(settings);

  return players.map((player, index) => ({
    ...player,
    role: roles[index] ?? "villager",
    isAlive: true,
    actionTokens: initialTokens,
    hasActedThisRound: false,
    hasVotedThisRound: false,
  }));
}

/**
 * Gets all players with a specific role
 */
export function getPlayersWithRole(
  players: WerewolfPlayer[],
  role: WerewolfRole
): WerewolfPlayer[] {
  return players.filter((p) => p.role === role && p.isAlive);
}

/**
 * Gets all alive players
 */
export function getAlivePlayers(players: WerewolfPlayer[]): WerewolfPlayer[] {
  return players.filter((p) => p.isAlive);
}

/**
 * Gets all werewolves (for werewolf visibility)
 */
export function getWerewolves(players: WerewolfPlayer[]): WerewolfPlayer[] {
  return players.filter((p) => p.role === "werewolf");
}

/**
 * Calculates recommended werewolf count for player count
 */
export function getRecommendedWerewolfCount(playerCount: number): number {
  if (playerCount <= 6) return 1;
  if (playerCount <= 10) return 2;
  if (playerCount <= 15) return 3;
  return Math.floor(playerCount / 4);
}

/**
 * Gets roles available for a given player count
 */
export function getAvailableRoles(playerCount: number): WerewolfRole[] {
  // MVP roles always available
  const roles: WerewolfRole[] = ["villager", "werewolf"];

  // Seer available with 5+ players
  if (playerCount >= 5) roles.push("seer");

  // Doctor available with 6+ players
  if (playerCount >= 6) roles.push("doctor");

  // Hunter available with 7+ players
  if (playerCount >= 7) roles.push("hunter");

  return roles;
}

/**
 * Gets initial action tokens for players based on session mode
 */
export function getInitialTokensForSettings(settings: WerewolfSettings): number {
  if (settings.mode === "action-reward") {
    return 0; // Earn tokens by completing focus sessions
  }
  return 0;
}

/**
 * Validates role configuration
 */
export function validateRoleConfiguration(settings: WerewolfSettings): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (settings.playerCount < 4) {
    errors.push("Minimum 4 players required");
  }

  if (settings.werewolfCount < 1) {
    errors.push("At least 1 werewolf required");
  }

  if (settings.werewolfCount >= Math.floor(settings.playerCount / 2)) {
    errors.push("Werewolves cannot be majority at start");
  }

  if (settings.includeRoles.length > settings.playerCount) {
    errors.push("Too many special roles for player count");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
