import type { WinCondition, WerewolfPlayer } from "@questline/types";

/**
 * Checks if the game has a winner
 */
export function checkWinCondition(players: WerewolfPlayer[]): WinCondition {
  const alivePlayers = players.filter((p) => p.isAlive);
  const aliveWerewolves = alivePlayers.filter((p) => p.role === "werewolf");
  const aliveVillagers = alivePlayers.filter((p) => p.role !== "werewolf");

  // Werewolves win if they equal or outnumber villagers
  if (aliveWerewolves.length >= aliveVillagers.length) {
    return "werewolves";
  }

  // Villagers win if all werewolves are dead
  if (aliveWerewolves.length === 0) {
    return "villagers";
  }

  // Game continues
  return "none";
}

/**
 * Gets a description of why the game ended
 */
export function getWinDescription(winner: WinCondition, players: WerewolfPlayer[]): string {
  const alivePlayers = players.filter((p) => p.isAlive);
  const aliveWerewolves = alivePlayers.filter((p) => p.role === "werewolf");

  switch (winner) {
    case "villagers":
      return "All werewolves have been eliminated! The village is safe once more.";
    case "werewolves":
      if (aliveWerewolves.length === alivePlayers.length) {
        return "The werewolves have killed all the villagers. Darkness consumes the village.";
      }
      return "The werewolves now outnumber the remaining villagers. The village falls into darkness.";
    case "none":
      return "The game continues...";
    default:
      return "Unknown outcome";
  }
}

/**
 * Gets the winning team members
 */
export function getWinners(winner: WinCondition, players: WerewolfPlayer[]): WerewolfPlayer[] {
  switch (winner) {
    case "villagers":
      return players.filter((p) => p.role !== "werewolf");
    case "werewolves":
      return players.filter((p) => p.role === "werewolf");
    default:
      return [];
  }
}

/**
 * Gets game statistics at the end
 */
export function getGameStats(players: WerewolfPlayer[]): {
  totalPlayers: number;
  survivors: number;
  werewolvesEliminated: number;
  villagersEliminated: number;
  roundsSurvived: Record<string, number>;
} {
  const survivors = players.filter((p) => p.isAlive).length;
  const werewolvesEliminated = players.filter((p) => p.role === "werewolf" && !p.isAlive).length;
  const villagersEliminated = players.filter((p) => p.role !== "werewolf" && !p.isAlive).length;

  return {
    totalPlayers: players.length,
    survivors,
    werewolvesEliminated,
    villagersEliminated,
    roundsSurvived: {}, // Would need to track this during game
  };
}
